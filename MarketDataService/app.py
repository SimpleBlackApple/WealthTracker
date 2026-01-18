import json
import os
from datetime import datetime, timezone
from typing import List, Optional

import redis
import yfinance as yf
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel

app = FastAPI(title="Market Data Service")

REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379/0")
CACHE_TTL_SECONDS = int(os.getenv("CACHE_TTL_SECONDS", "300"))

redis_client = redis.Redis.from_url(REDIS_URL, decode_responses=True)


class ScreenerRequest(BaseModel):
    type: str = "gappers"
    limit: int = 100
    minPrice: float = 1.0
    minAvgVol: int = 1000000
    session: str = "regular"
    asOf: Optional[str] = None


class ScreenerCandidate(BaseModel):
    ticker: str
    last: Optional[float] = None
    open: Optional[float] = None
    prevClose: Optional[float] = None
    gapPct: Optional[float] = None
    volume: Optional[int] = None


class ScreenerResponse(BaseModel):
    asOf: str
    candidates: List[ScreenerCandidate]


def utc_now_iso() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")


def screener_cache_key(request: ScreenerRequest) -> str:
    return (
        f"md:screener:{request.type}:{request.session}:"
        f"limit={request.limit}:minPrice={request.minPrice}:minAvgVol={request.minAvgVol}"
    )


def read_cache(key: str) -> Optional[dict]:
    try:
        cached = redis_client.get(key)
    except redis.RedisError:
        return None
    if not cached:
        return None
    try:
        return json.loads(cached)
    except json.JSONDecodeError:
        return None


def write_cache(key: str, payload: dict) -> None:
    try:
        redis_client.setex(key, CACHE_TTL_SECONDS, json.dumps(payload))
    except redis.RedisError:
        return


def map_quote(quote: dict) -> Optional[dict]:
    symbol = quote.get("symbol") or quote.get("ticker")
    if not symbol:
        return None
    last = quote.get("regularMarketPrice") or quote.get("last") or quote.get("price")
    open_price = quote.get("regularMarketOpen") or quote.get("open")
    prev_close = quote.get("regularMarketPreviousClose") or quote.get("prevClose")
    gap_pct = quote.get("regularMarketChangePercent") or quote.get("gapPct")
    if gap_pct is None and open_price is not None and prev_close not in (None, 0):
        gap_pct = (open_price - prev_close) / prev_close
    volume = quote.get("regularMarketVolume") or quote.get("volume")
    return {
        "ticker": symbol,
        "last": last,
        "open": open_price,
        "prevClose": prev_close,
        "gapPct": gap_pct,
        "volume": volume,
    }


def fetch_screener(request: ScreenerRequest) -> dict:
    screener_type = request.type.lower()
    try:
        if screener_type == "gappers":
            data = yf.screen("day_gainers", size=request.limit)
        elif screener_type == "momentum":
            data = yf.screen("most_actives", size=request.limit)
        elif screener_type == "custom":
            from yfinance import EquityQuery

            query = EquityQuery(
                "and",
                [
                    EquityQuery("gte", ["intradayprice", request.minPrice]),
                    EquityQuery("gte", ["dayvolume", request.minAvgVol]),
                    EquityQuery("eq", ["region", "us"]),
                ],
            )
            data = yf.screen(query, sortField="percentchange", sortAsc=False, size=request.limit)
        else:
            raise HTTPException(status_code=400, detail="Unsupported screener type")
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"yfinance error: {exc}") from exc

    quotes = data.get("quotes", [])
    candidates = []
    for quote in quotes:
        mapped = map_quote(quote)
        if mapped:
            candidates.append(mapped)
        if len(candidates) >= request.limit:
            break

    as_of = request.asOf or utc_now_iso()
    return {"asOf": as_of, "candidates": candidates}


@app.get("/health")
def health() -> dict:
    return {"status": "ok"}


@app.post("/screener", response_model=ScreenerResponse)
def screener(request: ScreenerRequest) -> dict:
    if not request.type:
        request.type = "gappers"
    if request.limit <= 0:
        request.limit = 100
    cache_key = screener_cache_key(request)
    cached = read_cache(cache_key)
    if cached:
        return cached

    payload = fetch_screener(request)
    write_cache(cache_key, payload)
    return payload
