import json
import os
from datetime import datetime, timezone
from typing import List, Optional

import redis
import yfinance as yf
from fastapi import FastAPI, HTTPException, Query
from pydantic import BaseModel
from zoneinfo import ZoneInfo

import pandas as pd

try:
    from dotenv import load_dotenv

    load_dotenv()
except ImportError:
    pass

app = FastAPI(title="Market Data Service")

REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379/0")
CACHE_TTL_SECONDS = int(os.getenv("CACHE_TTL_SECONDS", "300"))
MIN_PRICE_FLOOR = float(os.getenv("MIN_PRICE_FLOOR", "1.5"))
HOD_APPROACH_DEFAULT_MAX_DIST_PCT = 2.0
HOD_APPROACH_ADAPTIVE_CAP_PCT = 2.5
VWAP_APPROACH_DEFAULT_MAX_DIST_PCT = 1.7
VWAP_APPROACH_ADAPTIVE_CAP_PCT = 1.75

REL_VOL_METHOD = (os.getenv("REL_VOL_METHOD", "recent_k_1m") or "recent_k_1m").strip().lower()

REL_VOL_INTERVAL = (os.getenv("REL_VOL_INTERVAL", "1m") or "1m").strip()
if REL_VOL_INTERVAL not in {"1m", "2m", "5m", "15m", "30m", "60m", "90m", "1h"}:
    REL_VOL_INTERVAL = "1m"

try:
    REL_VOL_HISTORY_DAYS = int(os.getenv("REL_VOL_HISTORY_DAYS", "2"))
except ValueError:
    REL_VOL_HISTORY_DAYS = 2
REL_VOL_HISTORY_DAYS = max(0, REL_VOL_HISTORY_DAYS)

try:
    REL_VOL_BASELINE_DAYS = int(os.getenv("REL_VOL_BASELINE_DAYS", "1"))
except ValueError:
    REL_VOL_BASELINE_DAYS = 1
REL_VOL_BASELINE_DAYS = max(0, REL_VOL_BASELINE_DAYS)

try:
    REL_VOL_K_BARS = int(os.getenv("REL_VOL_K_BARS", "5"))
except ValueError:
    REL_VOL_K_BARS = 5
REL_VOL_K_BARS = max(1, REL_VOL_K_BARS)

REL_VOL_BASELINE_INCLUDE_TODAY = (os.getenv("REL_VOL_BASELINE_INCLUDE_TODAY", "1") or "1").strip() not in {
    "0",
    "false",
    "False",
}
REL_VOL_BASELINE_EXCLUDE_LAST_K = (os.getenv("REL_VOL_BASELINE_EXCLUDE_LAST_K", "1") or "1").strip() not in {
    "0",
    "false",
    "False",
}
REL_VOL_REUSE_PRIMARY_1M_DOWNLOAD = (os.getenv("REL_VOL_REUSE_PRIMARY_1M_DOWNLOAD", "1") or "1").strip() not in {
    "0",
    "false",
    "False",
}

INTRADAY_MAX_DAYS_BY_INTERVAL = {"1m": 7}

redis_client = redis.Redis.from_url(REDIS_URL, decode_responses=True)


def utc_now_iso() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")


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


ET_TZ = ZoneInfo("America/New_York")
ALLOWED_EXCHANGES = {"NYQ", "NMS", "NCM", "NGM", "ASE"}  # NYSE, NASDAQ, AMEX


class HistoryBar(BaseModel):
    t: str
    o: float
    h: float
    l: float
    c: float
    v: int


class HistoryResponse(BaseModel):
    ticker: str
    interval: str
    period: str
    prepost: bool
    timezone: str = "America/New_York"
    bars: List[HistoryBar]


def _safe_float(value: object) -> Optional[float]:
    try:
        if value is None:
            return None
        return float(value)
    except (TypeError, ValueError):
        return None


def _safe_int(value: object) -> Optional[int]:
    try:
        if value is None:
            return None
        return int(value)
    except (TypeError, ValueError):
        return None


def _chunk(items: List[str], size: int) -> List[List[str]]:
    if size <= 0:
        return [items]
    return [items[i : i + size] for i in range(0, len(items), size)]


def _map_quote_extended(quote: dict) -> Optional[dict]:
    symbol = quote.get("symbol") or quote.get("ticker")
    if not symbol:
        return None

    last_price = (
        quote.get("regularMarketPrice")
        or quote.get("postMarketPrice")
        or quote.get("preMarketPrice")
        or quote.get("price")
    )
    open_price = quote.get("regularMarketOpen") or quote.get("open")
    prev_close = quote.get("regularMarketPreviousClose") or quote.get("prevClose")
    volume = quote.get("regularMarketVolume") or quote.get("dayVolume") or quote.get("volume")

    lp = _safe_float(last_price)
    pc = _safe_float(prev_close)

    # Prefer computing change % ourselves when possible (ratio, e.g. 0.12 == +12%),
    # because Yahoo's "regularMarketChangePercent" is provided in percentage points
    # (e.g. 12.0 == +12%) and may appear in multiple formats across endpoints.
    change_pct: Optional[float] = None
    if lp is not None and pc not in (None, 0):
        change_pct = (lp - pc) / pc
    else:
        raw_pct_points = quote.get("regularMarketChangePercent") or quote.get("percentchange")
        raw_pct_points_f = _safe_float(raw_pct_points)
        if raw_pct_points_f is not None:
            change_pct = raw_pct_points_f / 100.0

    exchange = quote.get("exchange") or quote.get("fullExchangeName")
    quote_type = quote.get("quoteType")
    avg_vol_3m = quote.get("averageDailyVolume3Month") or quote.get("avgdailyvol3m")
    avg_vol_10d = quote.get("averageDailyVolume10Day") or quote.get("avgdailyvol10d")
    market_cap = quote.get("marketCap") or quote.get("intradayMarketCap") or quote.get("intradaymarketcap")
    float_shares = quote.get("floatShares") or quote.get("floatshares")

    return {
        "ticker": symbol,
        "last": _safe_float(last_price),
        "open": _safe_float(open_price),
        "prevClose": _safe_float(prev_close),
        "volume": _safe_int(volume),
        "changePct": _safe_float(change_pct),
        "exchange": exchange,
        "quoteType": quote_type,
        "avgDailyVol3m": _safe_int(avg_vol_3m),
        "avgDailyVol10d": _safe_int(avg_vol_10d),
        "marketCap": _safe_int(market_cap),
        "floatShares": _safe_int(float_shares),
        "shortName": quote.get("shortName") or quote.get("longName"),
    }


def _to_pct_points(ratio: Optional[float]) -> Optional[float]:
    if ratio is None:
        return None
    return ratio * 100.0


def _universe_cache_key(
    universe_limit: int,
    min_price: float,
    max_price: float,
    min_avg_vol: int,
    min_change_pct: float,
) -> str:
    return (
        "md:universe:scanner:"
        f"limit={universe_limit}:minPrice={min_price}:maxPrice={max_price}:"
        f"minAvgVol={min_avg_vol}:minChangePct={min_change_pct}"
    )


def _fetch_scanner_universe(
    *,
    universe_limit: int,
    min_price: float,
    max_price: float,
    min_avg_vol: int,
    min_change_pct: float,
) -> List[dict]:
    screeners = [
        "day_gainers",
        "most_actives",
        "aggressive_small_caps",
        "small_cap_gainers",
    ]

    screen_count = max(int(universe_limit or 0), 1)
    payloads: List[dict] = []
    errors: List[str] = []
    for screener in screeners:
        try:
            payload = yf.screen(
                screener,
                count=screen_count,
                sortField="percentchange",
                sortAsc=False,
            )
            if isinstance(payload, dict):
                payloads.append(payload)
            else:
                errors.append(f"{screener}: unexpected payload type {type(payload)}")
        except Exception as exc:
            errors.append(f"{screener}: {exc}")

    if not payloads:
        raise HTTPException(
            status_code=502,
            detail=f"yfinance error: no screener payloads returned ({'; '.join(errors)})",
        )

    combined: dict[str, dict] = {}
    for payload in payloads:
        for quote in payload.get("quotes", []) or []:
            mapped = _map_quote_extended(quote)
            if not mapped:
                continue
            combined[mapped["ticker"]] = mapped

    if not combined:
        raise HTTPException(
            status_code=502,
            detail="yfinance error: screener payloads returned no quotes",
        )

    min_change_ratio = min_change_pct / 100.0
    filtered: List[dict] = []
    for item in combined.values():
        ticker = item["ticker"]
        if not ticker:
            continue

        quote_type = (item.get("quoteType") or "").upper()
        if quote_type and quote_type != "EQUITY":
            continue

        exchange = item.get("exchange")
        if exchange in ALLOWED_EXCHANGES:
            pass
        else:
            exchange_str = (exchange or "").upper()
            if exchange_str and not any(x in exchange_str for x in ("NYSE", "NASDAQ", "AMEX")):
                continue

        price = item.get("last")
        if price is None:
            continue
        if price <= MIN_PRICE_FLOOR:
            continue
        if price < min_price or price > max_price:
            continue

        avg_vol = item.get("avgDailyVol10d") or item.get("avgDailyVol3m")
        avg_vol_i = _safe_int(avg_vol)
        today_vol_i = _safe_int(item.get("volume"))
        liquidity_ref = avg_vol_i if avg_vol_i is not None else today_vol_i
        if liquidity_ref is not None and liquidity_ref < min_avg_vol:
            continue

        change_pct = item.get("changePct")
        if change_pct is not None and change_pct < min_change_ratio:
            continue

        name = (item.get("shortName") or "").upper()
        if any(token in name for token in (" ETF", "TRUST", "FUND", "INDEX")):
            continue

        filtered.append(item)

    filtered.sort(
        key=lambda x: (
            x.get("changePct") or 0.0,
            x.get("volume") or 0,
            x.get("avgDailyVol10d") or x.get("avgDailyVol3m") or 0,
        ),
        reverse=True,
    )
    return filtered[:universe_limit]


def _download_intraday(
    tickers: List[str],
    *,
    interval: str,
    period: str,
    prepost: bool,
) -> dict[str, pd.DataFrame]:
    if not tickers:
        return {}

    frames: dict[str, pd.DataFrame] = {}
    for batch in _chunk(tickers, 50):
        try:
            data = yf.download(
                tickers=" ".join(batch),
                period=period,
                interval=interval,
                prepost=prepost,
                group_by="ticker",
                auto_adjust=False,
                threads=True,
                progress=False,
            )
        except Exception as exc:
            raise HTTPException(status_code=502, detail=f"yfinance error: {exc}") from exc

        if data is None or getattr(data, "empty", False):
            continue

        if isinstance(data.columns, pd.MultiIndex):
            for ticker in batch:
                if ticker in data.columns.levels[0]:
                    df = data[ticker].dropna(how="all")
                    if not df.empty:
                        frames[ticker] = df
        else:
            ticker = batch[0]
            df = data.dropna(how="all")
            if not df.empty:
                frames[ticker] = df

    return frames


def _df_to_et(df: pd.DataFrame) -> pd.DataFrame:
    if df is None or df.empty:
        return df
    if not isinstance(df.index, pd.DatetimeIndex):
        return df
    if df.index.tz is None:
        df = df.tz_localize("UTC")
    return df.tz_convert(ET_TZ)


def _intraday_max_days(interval: str) -> int:
    return INTRADAY_MAX_DAYS_BY_INTERVAL.get(interval, 60)


def _period_days(period: str) -> Optional[int]:
    p = (period or "").strip().lower()
    if not p.endswith("d"):
        return None
    try:
        return int(p.removesuffix("d"))
    except ValueError:
        return None


def _rel_vol_tod_period_days(lookback_days: int, interval: str) -> int:
    if lookback_days <= 0:
        return 0
    buffer_days = max(5, int(lookback_days * 0.5))
    period_days = lookback_days + buffer_days
    return max(1, min(period_days, _intraday_max_days(interval)))


def _df_to_et_latest_session(df: pd.DataFrame) -> pd.DataFrame:
    df = _df_to_et(df)
    if df is None or df.empty:
        return df
    if not isinstance(df.index, pd.DatetimeIndex):
        return df
    # yfinance "1d" can still return the previous trading day (e.g., early morning ET,
    # weekends/holidays). Use the most recent session date present in the data.
    session_date = df.index[-1].date()
    mask = df.index.date == session_date
    return df.loc[mask]


def _between_time(df: pd.DataFrame, start: str, end: str) -> pd.DataFrame:
    if df is None or df.empty:
        return df
    try:
        return df.between_time(start, end, inclusive="both")
    except TypeError:
        return df.between_time(start, end)


def _compute_rel_vol_tod(df: pd.DataFrame, lookback_days: int) -> dict:
    result = {
        "relVolTod": None,
        "todayCumVol": None,
        "baselineCumVol": None,
        "barIndex": None,
        "barTime": None,
    }
    if df is None or df.empty or lookback_days <= 0:
        return result
    if not isinstance(df.index, pd.DatetimeIndex):
        return result

    df = _df_to_et(df)
    if df is None or df.empty:
        return result

    df_reg = _between_time(df, "09:30", "16:00")
    if df_reg is None or df_reg.empty:
        return result

    df_reg = df_reg.sort_index()
    grouped = {date: day_df for date, day_df in df_reg.groupby(df_reg.index.date) if not day_df.empty}
    if not grouped:
        return result

    dates = sorted(grouped.keys())
    today_date = dates[-1]
    today_df = grouped.get(today_date)
    if today_df is None or today_df.empty:
        return result

    last_ts = today_df.index[-1]
    bar_time = last_ts.time()
    today_cum_vol = float(today_df["Volume"].fillna(0).cumsum().iloc[-1])

    baseline_vals: List[float] = []
    for date in reversed(dates[:-1]):
        if len(baseline_vals) >= lookback_days:
            break
        day_df = grouped.get(date)
        if day_df is None or day_df.empty:
            continue
        day_slice = day_df.loc[day_df.index.time <= bar_time]
        if day_slice.empty:
            continue
        day_cum_vol = float(day_slice["Volume"].fillna(0).cumsum().iloc[-1])
        baseline_vals.append(day_cum_vol)

    baseline_cum_vol = None
    rel_vol_tod = None
    if baseline_vals:
        baseline_cum_vol = sum(baseline_vals) / len(baseline_vals)
        if baseline_cum_vol > 0:
            rel_vol_tod = today_cum_vol / baseline_cum_vol

    result.update(
        {
            "relVolTod": rel_vol_tod,
            "todayCumVol": int(today_cum_vol),
            "baselineCumVol": baseline_cum_vol,
            "barIndex": int(len(today_df) - 1),
            "barTime": last_ts.strftime("%H:%M"),
        }
    )
    return result


def _compute_rvol_recent_k_1m(
    df: pd.DataFrame,
    baseline_days: int,
    k_bars: int,
    include_today: bool,
    exclude_last_k_from_today: bool,
) -> dict:
    result = {
        "relVol": None,
        "relVolTod": None,
        "todayBarVol": None,  # sum of last K 1m bars
        "baselineBarVol": None,  # expected sum of last K 1m bars
        "todayCumVol": None,
        "baselineCumVol": None,
        "barIndex": None,
        "barTime": None,
    }
    if df is None or df.empty or baseline_days <= 0 or k_bars <= 0:
        return result
    if not isinstance(df.index, pd.DatetimeIndex):
        return result

    df = _df_to_et(df)
    if df is None or df.empty:
        return result

    df_reg = _between_time(df, "09:30", "16:00")
    if df_reg is None or df_reg.empty:
        return result

    df_reg = df_reg.sort_index()
    grouped = {date: day_df for date, day_df in df_reg.groupby(df_reg.index.date) if not day_df.empty}
    if not grouped:
        return result

    dates = sorted(grouped.keys())
    today_date = dates[-1]
    today_df = grouped.get(today_date)
    if today_df is None or today_df.empty:
        return result

    today_df = today_df.sort_index()
    last_ts = today_df.index[-1]

    today_vol_series = today_df["Volume"].fillna(0)
    if today_vol_series.empty:
        return result

    k = min(int(k_bars), int(len(today_vol_series)))
    if k <= 0:
        return result

    bar_index = int(len(today_df) - 1)
    today_k_vol = float(today_vol_series.tail(k).sum())
    today_cum_vol = float(today_vol_series.sum())

    baseline_frames: List[pd.DataFrame] = []
    prior_dates = dates[:-1]
    if baseline_days > 0 and prior_dates:
        for date in prior_dates[-baseline_days:]:
            day_df = grouped.get(date)
            if day_df is not None and not day_df.empty:
                baseline_frames.append(day_df.sort_index())

    if include_today:
        if exclude_last_k_from_today and len(today_df) > k:
            baseline_frames.append(today_df.iloc[:-k].sort_index())
        else:
            baseline_frames.append(today_df)

    baseline_1m_avg = None
    if baseline_frames:
        baseline_df = pd.concat(baseline_frames, axis=0)
        if baseline_df is not None and not baseline_df.empty:
            baseline_vols = baseline_df["Volume"].fillna(0)
            if not baseline_vols.empty:
                baseline_1m_avg = float(baseline_vols.mean())

    baseline_k_vol = None
    baseline_cum_vol = None
    rel_vol = None
    rel_vol_tod = None
    if baseline_1m_avg is not None and baseline_1m_avg > 0:
        baseline_k_vol = baseline_1m_avg * k
        if baseline_k_vol > 0:
            rel_vol = today_k_vol / baseline_k_vol

        minutes_elapsed = float(len(today_vol_series))
        baseline_cum_vol = baseline_1m_avg * minutes_elapsed
        if baseline_cum_vol > 0:
            rel_vol_tod = today_cum_vol / baseline_cum_vol

    result.update(
        {
            "relVol": rel_vol,
            "relVolTod": rel_vol_tod,
            "todayBarVol": int(today_k_vol),
            "baselineBarVol": baseline_k_vol,
            "todayCumVol": int(today_cum_vol),
            "baselineCumVol": baseline_cum_vol,
            "barIndex": bar_index,
            "barTime": last_ts.strftime("%H:%M"),
        }
    )
    return result


def _last_close(df: pd.DataFrame) -> Optional[float]:
    if df is None or df.empty:
        return None
    val = df["Close"].iloc[-1]
    return _safe_float(val)


def _sum_volume(df: pd.DataFrame) -> int:
    if df is None or df.empty:
        return 0
    vol = df["Volume"].fillna(0).sum()
    return int(vol)


def _vwap(df: pd.DataFrame) -> Optional[float]:
    if df is None or df.empty:
        return None
    vol = df["Volume"].fillna(0)
    total_vol = float(vol.sum())
    if total_vol <= 0:
        return None
    typical = (df["High"] + df["Low"] + df["Close"]) / 3.0
    return float((typical * vol).sum() / total_vol)


def _atr(df: pd.DataFrame, length: int = 14) -> Optional[float]:
    if df is None or df.empty:
        return None
    bars = df.tail(max(length + 1, 2))
    if bars.shape[0] < 2:
        return None
    high = bars["High"]
    low = bars["Low"]
    close = bars["Close"].shift(1)
    tr = pd.concat([(high - low).abs(), (high - close).abs(), (low - close).abs()], axis=1).max(axis=1)
    tr = tr.dropna()
    if tr.empty:
        return None
    return float(tr.tail(length).mean())


def _close_slope(df: pd.DataFrame, n: int) -> Optional[float]:
    if df is None or df.empty:
        return None
    if df.shape[0] < max(n, 2):
        return None
    closes = df["Close"].tail(n)
    return float(closes.iloc[-1] - closes.iloc[0]) / float(n - 1)


class ScannerUniverseRequest(BaseModel):
    universeLimit: int = 50
    limit: int = 25

    minPrice: float = 1.5
    maxPrice: float = 30.0
    minAvgVol: int = 1_000_000
    # Percent points (e.g. 3.0 == +3%).
    minChangePct: float = 3.0

    interval: str = "5m"
    period: str = "1d"
    prepost: bool = False
    closeSlopeN: int = 6

    asOf: Optional[str] = None


class DayGainersRequest(ScannerUniverseRequest):
    minTodayVolume: int = 0


class HodVwapMomentumRequest(ScannerUniverseRequest):
    minTodayVolume: int = 200_000
    minRelVol: float = 1.7
    # Percent points (e.g. 1.0 == 1%).
    maxDistToHod: float = 1.0
    requireHodBreak: bool = False
    requireVwapBreak: bool = False


class HodBreakoutsRequest(ScannerUniverseRequest):
    minTodayVolume: int = 150_000
    minRelVol: float = 1.4
    # Percent points (e.g. 1.0 == 1%).
    maxDistToHod: float = 1.0


class VwapBreakoutsRequest(ScannerUniverseRequest):
    minTodayVolume: int = 200_000
    minRelVol: float = 1.7


class VolumeSpikesRequest(ScannerUniverseRequest):
    minTodayVolume: int = 200_000
    minRelVol: float = 2.0


class HodVwapApproachRequest(ScannerUniverseRequest):
    minSetupPrice: float = 2.0
    maxSetupPrice: float = 60.0
    minTodayVolume: int = 200_000
    # Percent points (e.g. 12.0 == 12%).
    minRangePct: float = 7.0
    minPosInRange: float = 0.50
    maxPosInRange: float = 0.995
    # Percent points (e.g. 1.0 == 1%).
    maxAbsVwapDistance: float = VWAP_APPROACH_DEFAULT_MAX_DIST_PCT
    maxDistToHod: float = HOD_APPROACH_DEFAULT_MAX_DIST_PCT
    minRelVol: float = 1.2
    adaptiveThresholds: bool = True


class HodApproachRequest(ScannerUniverseRequest):
    minSetupPrice: float = 2.0
    maxSetupPrice: float = 60.0
    minTodayVolume: int = 200_000
    # Percent points (e.g. 7.0 == 7%).
    minRangePct: float = 7.0
    minPosInRange: float = 0.50
    maxPosInRange: float = 0.995
    # Percent points (e.g. 2.0 == 2%).
    maxDistToHod: float = HOD_APPROACH_DEFAULT_MAX_DIST_PCT
    minRelVol: float = 1.2
    adaptiveThresholds: bool = True


class VwapApproachRequest(ScannerUniverseRequest):
    minSetupPrice: float = 2.0
    maxSetupPrice: float = 60.0
    minTodayVolume: int = 200_000
    # Percent points (e.g. 7.0 == 7%).
    minRangePct: float = 7.0
    minPosInRange: float = 0.50
    maxPosInRange: float = 0.995
    # Percent points (e.g. 1.7 == 1.7%).
    maxAbsVwapDistance: float = VWAP_APPROACH_DEFAULT_MAX_DIST_PCT
    minRelVol: float = 1.2
    adaptiveThresholds: bool = True


class DayGainerRow(BaseModel):
    symbol: str
    exchange: Optional[str] = None
    price: Optional[float] = None
    prev_close: Optional[float] = None
    change_pct: Optional[float] = None
    volume: int = 0
    relative_volume: Optional[float] = None
    relative_volume_tod: Optional[float] = None
    today_cum_volume: Optional[int] = None
    baseline_cum_volume: Optional[float] = None
    bar_index: Optional[int] = None
    bar_time: Optional[str] = None
    float_shares: Optional[float] = None
    market_cap: Optional[float] = None


class IntradayMomentumRow(BaseModel):
    symbol: str
    exchange: Optional[str] = None
    price: Optional[float] = None
    day_high: Optional[float] = None
    day_low: Optional[float] = None
    last_bar_high: Optional[float] = None
    range_pct: Optional[float] = None
    relative_volume: Optional[float] = None
    relative_volume_tod: Optional[float] = None
    today_cum_volume: Optional[int] = None
    baseline_cum_volume: Optional[float] = None
    bar_index: Optional[int] = None
    bar_time: Optional[str] = None
    price_change_pct: Optional[float] = None
    avg_volume_20d: Optional[float] = None
    vwap: Optional[float] = None
    vwap_distance: Optional[float] = None
    distance_to_hod: Optional[float] = None
    break_type: Optional[str] = None


class HodVwapApproachRow(BaseModel):
    symbol: str
    exchange: Optional[str] = None
    price: Optional[float] = None
    hod: Optional[float] = None
    distance_to_hod: Optional[float] = None
    vwap: Optional[float] = None
    vwap_distance: Optional[float] = None
    range_pct: Optional[float] = None
    relative_volume: Optional[float] = None
    relative_volume_tod: Optional[float] = None
    today_cum_volume: Optional[int] = None
    baseline_cum_volume: Optional[float] = None
    bar_index: Optional[int] = None
    bar_time: Optional[str] = None


class DayGainersResponse(BaseModel):
    scanner: str
    sorted_by: str
    results: List[DayGainerRow]


class HodVwapMomentumResponse(BaseModel):
    scanner: str
    sorted_by: str
    results: List[IntradayMomentumRow]


class HodVwapApproachResponse(BaseModel):
    scanner: str
    sorted_by: str
    results: List[HodVwapApproachRow]


def _validate_intraday_request(request: ScannerUniverseRequest) -> tuple[str, str]:
    interval = (request.interval or "5m").strip()
    period = (request.period or "1d").strip()
    if interval not in {"1m", "2m", "5m", "15m", "30m", "60m", "90m", "1h"}:
        raise HTTPException(status_code=400, detail="Unsupported interval")
    if period not in {"1d", "5d"}:
        raise HTTPException(status_code=400, detail="Unsupported period")
    return interval, period


def _effective_price_bounds(request: ScannerUniverseRequest) -> tuple[float, float]:
    min_price = max(float(request.minPrice or 0.0), MIN_PRICE_FLOOR)
    max_price = float(request.maxPrice or 0.0)
    if max_price < min_price:
        max_price = min_price
    return min_price, max_price


def _features_cache_key(request: ScannerUniverseRequest) -> str:
    interval, period = _validate_intraday_request(request)
    min_price, max_price = _effective_price_bounds(request)
    return (
        "md:scanner:features:"
        f"u={request.universeLimit}:minP={min_price}:maxP={max_price}:"
        f"minV={request.minAvgVol}:minChg={request.minChangePct}:"
        f"int={interval}:per={period}:prepost={int(request.prepost)}:slopeN={request.closeSlopeN}:"
        f"relM={REL_VOL_METHOD}:relInt={REL_VOL_INTERVAL}:relHistD={REL_VOL_HISTORY_DAYS}:"
        f"relBaseD={REL_VOL_BASELINE_DAYS}:relK={REL_VOL_K_BARS}:"
        f"relInclT={int(REL_VOL_BASELINE_INCLUDE_TODAY)}:relExclK={int(REL_VOL_BASELINE_EXCLUDE_LAST_K)}"
    )


def _load_universe_items(request: ScannerUniverseRequest) -> List[dict]:
    min_price, max_price = _effective_price_bounds(request)
    universe_key = _universe_cache_key(
        request.universeLimit, min_price, max_price, request.minAvgVol, request.minChangePct
    )
    cached_universe = read_cache(universe_key)
    if cached_universe and isinstance(cached_universe, list):
        return cached_universe

    universe_items = _fetch_scanner_universe(
        universe_limit=request.universeLimit,
        min_price=min_price,
        max_price=max_price,
        min_avg_vol=request.minAvgVol,
        min_change_pct=float(request.minChangePct or 0.0) / 100.0,
    )
    write_cache(universe_key, universe_items)
    return universe_items


def _compute_features(request: ScannerUniverseRequest) -> dict:
    interval, period = _validate_intraday_request(request)
    universe_items = _load_universe_items(request)
    tickers = [x["ticker"] for x in universe_items if x.get("ticker")]
    meta = {x["ticker"]: x for x in universe_items if x.get("ticker")}

    period_for_frames = period
    if (
        REL_VOL_METHOD == "recent_k_1m"
        and REL_VOL_REUSE_PRIMARY_1M_DOWNLOAD
        and interval == "1m"
        and REL_VOL_HISTORY_DAYS > 1
    ):
        primary_days = _period_days(period_for_frames) or 0
        if primary_days < REL_VOL_HISTORY_DAYS:
            period_for_frames = f"{REL_VOL_HISTORY_DAYS}d"

    frames = _download_intraday(tickers, interval=interval, period=period_for_frames, prepost=bool(request.prepost))

    rel_vol_frames: dict[str, pd.DataFrame] = {}
    if REL_VOL_METHOD == "recent_k_1m" and tickers and REL_VOL_HISTORY_DAYS > 0 and REL_VOL_BASELINE_DAYS > 0:
        if (
            REL_VOL_REUSE_PRIMARY_1M_DOWNLOAD
            and interval == "1m"
            and ((_period_days(period_for_frames) or 0) >= REL_VOL_HISTORY_DAYS)
        ):
            rel_vol_frames = frames
        else:
            try:
                rel_vol_frames = _download_intraday(
                    tickers,
                    interval=REL_VOL_INTERVAL,
                    period=f"{REL_VOL_HISTORY_DAYS}d",
                    prepost=False,
                )
            except HTTPException:
                rel_vol_frames = {}
    features: List[dict] = []

    for ticker in tickers:
        df = frames.get(ticker)
        if df is None or df.empty:
            continue

        df_today = _df_to_et_latest_session(df)
        if df_today is None or df_today.empty:
            continue

        df_pre = _between_time(df_today, "04:00", "09:29")
        df_reg = _between_time(df_today, "09:30", "16:00")
        df_post = _between_time(df_today, "16:00", "20:00")

        m = meta.get(ticker, {})
        avg_daily_vol = m.get("avgDailyVol10d") or m.get("avgDailyVol3m")
        avg_daily_vol_f = _safe_float(avg_daily_vol) or None
        avg_volume_20d = avg_daily_vol_f
        market_cap = _safe_float(m.get("marketCap"))
        float_shares = _safe_float(m.get("floatShares"))
        exchange = m.get("exchange")  # Get exchange from metadata

        prev_close = _safe_float(m.get("prevClose"))
        prev_bar_close = None
        if df_reg is not None and df_reg.shape[0] >= 2:
            prev_bar_close = _safe_float(df_reg["Close"].iloc[-2])

        pre_price = _last_close(df_pre)
        pre_vol = _sum_volume(df_pre)

        regular_close = _last_close(df_reg)
        reg_vol = _sum_volume(df_reg)

        post_price = _last_close(df_post)
        post_vol = _sum_volume(df_post)

        last_price = regular_close or _last_close(df_today) or _safe_float(m.get("last"))

        rel_vol_fields = _compute_rvol_recent_k_1m(
            rel_vol_frames.get(ticker),
            baseline_days=REL_VOL_BASELINE_DAYS,
            k_bars=REL_VOL_K_BARS,
            include_today=REL_VOL_BASELINE_INCLUDE_TODAY,
            exclude_last_k_from_today=REL_VOL_BASELINE_EXCLUDE_LAST_K,
        )
        rel_vol = _safe_float(rel_vol_fields.get("relVol"))

        hod = _safe_float(df_reg["High"].max()) if df_reg is not None and not df_reg.empty else None
        lod = _safe_float(df_reg["Low"].min()) if df_reg is not None and not df_reg.empty else None
        distance_to_hod = None
        hod_test_count = 0
        if hod not in (None, 0) and last_price is not None:
            distance_to_hod = (hod - last_price) / hod
            if df_reg is not None and not df_reg.empty:
                hod_test_count = int((((hod - df_reg["Close"]).abs() / hod) <= 0.003).fillna(False).sum())

        vwap_val = _vwap(df_reg) if df_reg is not None and not df_reg.empty else None
        abs_vwap_distance = None
        if last_price is not None and vwap_val not in (None, 0):
            abs_vwap_distance = abs((last_price - vwap_val) / vwap_val)

        range_pct = None
        pos_in_range = None
        dist_to_hod = None
        if hod is not None and lod not in (None, 0) and hod > lod and last_price is not None:
            range_pct = (hod - lod) / lod
            pos_in_range = (last_price - lod) / (hod - lod)
            dist_to_hod = (hod - last_price) / hod if hod else None

        close_slope_n = _close_slope(df_reg, request.closeSlopeN) if df_reg is not None and not df_reg.empty else None
        atr_val = _atr(df_reg, 14) if df_reg is not None and not df_reg.empty else None

        intraday_vol = None
        last_reg_high = None
        if df_reg is not None and not df_reg.empty:
            last_bar = df_reg.tail(1)
            if not last_bar.empty:
                low = _safe_float(last_bar["Low"].iloc[0])
                high = _safe_float(last_bar["High"].iloc[0])
                if low not in (None, 0) and high is not None:
                    intraday_vol = (high - low) / low
                last_reg_high = high

        features.append(
            {
                "ticker": ticker,
                "exchange": exchange,
                "prevClose": prev_close,
                "prevBarClose": prev_bar_close,
                "avgDailyVol": avg_daily_vol_f,
                "avgVolume20d": avg_volume_20d,
                "marketCap": market_cap,
                "floatShares": float_shares,
                "preMarketPrice": pre_price,
                "preMarketVolume": pre_vol,
                "regularClose": regular_close,
                "todayVolume": reg_vol,
                "postMarketPrice": post_price,
                "postMarketVolume": post_vol,
                "price": last_price,
                "hod": hod,
                "lod": lod,
                "distanceToHod": distance_to_hod,
                "hodTestCount": hod_test_count,
                "vwap": vwap_val,
                "absVwapDistance": abs_vwap_distance,
                "rangePct": range_pct,
                "posInRange": pos_in_range,
                "distToHod": dist_to_hod,
                "relVol": rel_vol,
                "relVolTod": rel_vol_fields.get("relVolTod"),
                "todayCumVol": rel_vol_fields.get("todayCumVol"),
                "baselineCumVol": rel_vol_fields.get("baselineCumVol"),
                "todayBarVol": rel_vol_fields.get("todayBarVol"),
                "baselineBarVol": rel_vol_fields.get("baselineBarVol"),
                "barIndex": rel_vol_fields.get("barIndex"),
                "barTime": rel_vol_fields.get("barTime"),
                "closeSlopeN": close_slope_n,
                "atr": atr_val,
                "intradayVol": intraday_vol,
                "lastRegHigh": last_reg_high,
            }
        )

    return {
        "asOf": request.asOf or utc_now_iso(),
        "universe": tickers,
        "features": features,
    }


@app.get("/health")
def health() -> dict:
    return {"status": "ok"}


@app.get("/history", response_model=HistoryResponse)
def history(
    ticker: str = Query(..., min_length=1),
    interval: str = Query("5m"),
    period: str = Query("1d"),
    prepost: bool = Query(False),
) -> dict:
    interval = interval.strip()
    period = period.strip()
    if interval not in {"1m", "2m", "5m", "15m", "30m", "60m", "90m", "1h"}:
        raise HTTPException(status_code=400, detail="Unsupported interval")
    if period not in {"1d", "5d"}:
        raise HTTPException(status_code=400, detail="Unsupported period")

    cache_key = f"md:bars:{ticker}:{interval}:{period}:prepost={1 if prepost else 0}"
    cached = read_cache(cache_key)
    if cached:
        return cached

    try:
        df = yf.Ticker(ticker).history(period=period, interval=interval, prepost=prepost)
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"yfinance error: {exc}") from exc

    if df is None or df.empty:
        payload = {
            "ticker": ticker,
            "interval": interval,
            "period": period,
            "prepost": bool(prepost),
            "timezone": "America/New_York",
            "bars": [],
        }
        write_cache(cache_key, payload)
        return payload

    if isinstance(df.index, pd.DatetimeIndex):
        if df.index.tz is None:
            df = df.tz_localize("UTC")
        df = df.tz_convert(ET_TZ)

    bars: List[dict] = []
    for idx, row in df.iterrows():
        if pd.isna(row.get("Close")):
            continue
        dt = idx.to_pydatetime()
        dt_utc = dt.astimezone(timezone.utc)
        bars.append(
            {
                "t": dt_utc.replace(microsecond=0).isoformat().replace("+00:00", "Z"),
                "o": float(row["Open"]),
                "h": float(row["High"]),
                "l": float(row["Low"]),
                "c": float(row["Close"]),
                "v": int(row["Volume"]) if not pd.isna(row.get("Volume")) else 0,
            }
        )

    payload = {
        "ticker": ticker,
        "interval": interval,
        "period": period,
        "prepost": bool(prepost),
        "timezone": "America/New_York",
        "bars": bars,
    }
    write_cache(cache_key, payload)
    return payload


def _get_features_cached(request: ScannerUniverseRequest) -> dict:
    key = _features_cache_key(request)
    cached = read_cache(key)
    if cached and isinstance(cached, dict):
        return cached

    payload = _compute_features(request)
    write_cache(key, payload)
    return payload


def _scan_cache_key(name: str, base_request: ScannerUniverseRequest, extra: str) -> str:
    base = _features_cache_key(base_request).removeprefix("md:scanner:features:")
    return f"md:scanner:{name}:{base}:{extra}"


def _day_gainers_cache_key(request: DayGainersRequest) -> str:
    min_price, max_price = _effective_price_bounds(request)
    interval, period = _validate_intraday_request(request)
    return (
        "md:scanner:day_gainers:"
        f"u={request.universeLimit}:minP={min_price}:maxP={max_price}:"
        f"minV={request.minAvgVol}:minChg={request.minChangePct}:"
        f"int={interval}:per={period}:prepost={int(request.prepost)}:"
        f"minTodayV={request.minTodayVolume}:limit={request.limit}:"
        f"relM={REL_VOL_METHOD}:relInt={REL_VOL_INTERVAL}:relHistD={REL_VOL_HISTORY_DAYS}:"
        f"relBaseD={REL_VOL_BASELINE_DAYS}:relK={REL_VOL_K_BARS}:"
        f"relInclT={int(REL_VOL_BASELINE_INCLUDE_TODAY)}:relExclK={int(REL_VOL_BASELINE_EXCLUDE_LAST_K)}"
    )


@app.post("/scan/day-gainers", response_model=DayGainersResponse)
def scan_day_gainers(request: DayGainersRequest) -> dict:
    cache_key = _day_gainers_cache_key(request)
    cached = read_cache(cache_key)
    if cached:
        return cached

    min_price, max_price = _effective_price_bounds(request)
    min_change_ratio = float(request.minChangePct or 0.0) / 100.0
    feature_payload = _get_features_cached(request)
    results: List[dict] = []
    for f in feature_payload.get("features", []):
        symbol = f.get("ticker")
        if not symbol:
            continue

        price = _safe_float(f.get("price"))
        if price is None or not (min_price <= price <= max_price):
            continue

        prev_close = _safe_float(f.get("prevClose"))
        if prev_close in (None, 0):
            continue

        today_vol = _safe_int(f.get("todayVolume")) or 0
        if today_vol < max(int(request.minTodayVolume or 0), 0):
            continue

        change_ratio = (price - prev_close) / prev_close
        if change_ratio < min_change_ratio:
            continue

        results.append(
            {
                "symbol": symbol,
                "exchange": f.get("exchange"),
                "price": price,
                "prev_close": prev_close,
                "change_pct": _to_pct_points(change_ratio),
                "volume": today_vol,
                "relative_volume": _safe_float(f.get("relVol")),
                "relative_volume_tod": _safe_float(f.get("relVolTod")),
                "today_cum_volume": _safe_int(f.get("todayCumVol")),
                "baseline_cum_volume": _safe_float(f.get("baselineCumVol")),
                "bar_index": _safe_int(f.get("barIndex")),
                "bar_time": f.get("barTime"),
                "float_shares": _safe_float(f.get("floatShares")),
                "market_cap": _safe_float(f.get("marketCap")),
            }
        )

    results.sort(
        key=lambda x: (
            x.get("change_pct") or 0.0,
            x.get("relative_volume") or 0.0,
            x.get("volume") or 0,
        ),
        reverse=True,
    )
    payload = {
        "scanner": "day_gainers",
        "sorted_by": "change_pct desc, relative_volume desc, volume desc",
        "results": results[: max(request.limit, 0)],
    }
    write_cache(cache_key, payload)
    return payload


@app.post("/scan/hod-vwap-momentum", response_model=HodVwapMomentumResponse, include_in_schema=False)
def scan_hod_vwap_momentum(request: HodVwapMomentumRequest) -> dict:
    cache_key = _scan_cache_key(
        "hod_vwap_momentum",
        request,
        f"minVol={request.minTodayVolume}:minRelVol={request.minRelVol}:"
        f"maxDistToHod={request.maxDistToHod}:reqHod={int(request.requireHodBreak)}:"
        f"reqVwap={int(request.requireVwapBreak)}:limit={request.limit}",
    )
    cached = read_cache(cache_key)
    if cached:
        return cached

    feature_payload = _get_features_cached(request)
    min_price, max_price = _effective_price_bounds(request)
    results: List[dict] = []
    for f in feature_payload.get("features", []):
        symbol = f.get("ticker")
        if not symbol:
            continue
        price = _safe_float(f.get("price"))
        day_high = _safe_float(f.get("hod"))
        day_low = _safe_float(f.get("lod"))
        range_pct = _safe_float(f.get("rangePct"))
        rel_vol = _safe_float(f.get("relVol"))
        avg_volume_20d = _safe_float(f.get("avgVolume20d"))
        prev_close = _safe_float(f.get("prevClose"))
        today_vol = _safe_int(f.get("todayVolume")) or 0

        if price is None or day_high is None or day_low is None or range_pct is None:
            continue
        if price < min_price or price > max_price:
            continue
        if today_vol < request.minTodayVolume:
            continue
        if rel_vol is not None and rel_vol < request.minRelVol:
            continue
        if prev_close in (None, 0):
            continue

        price_change_ratio = (price - prev_close) / prev_close

        vwap_val = _safe_float(f.get("vwap"))
        prev_bar_close = _safe_float(f.get("prevBarClose"))
        last_reg_high = _safe_float(f.get("lastRegHigh"))

        dist_to_hod_ratio = None
        if day_high not in (None, 0) and price is not None:
            dist_to_hod_ratio = (day_high - price) / day_high

        max_dist_to_hod_ratio = float(request.maxDistToHod or 0.0) / 100.0
        hod_break_now = False
        if dist_to_hod_ratio is not None and last_reg_high is not None:
            hod_break_now = (
                last_reg_high >= (day_high * 0.999999)
                and dist_to_hod_ratio <= max_dist_to_hod_ratio
            )

        vwap_break_now = False
        vwap_distance_ratio = None
        if vwap_val not in (None, 0) and price is not None:
            vwap_distance_ratio = (price - vwap_val) / vwap_val
            vwap_break_now = price >= vwap_val

        close_slope_n = _safe_float(f.get("closeSlopeN"))
        if close_slope_n is None or close_slope_n <= 0:
            continue

        if request.requireHodBreak and not hod_break_now:
            continue
        if request.requireVwapBreak and not vwap_break_now:
            continue
        if not request.requireHodBreak and not request.requireVwapBreak:
            if not (hod_break_now or vwap_break_now):
                continue

        break_type = None
        if request.requireHodBreak and not request.requireVwapBreak:
            break_type = "hod"
        elif request.requireVwapBreak and not request.requireHodBreak:
            break_type = "vwap"
        else:
            if hod_break_now and vwap_break_now:
                break_type = "hod+vwap"
            elif hod_break_now:
                break_type = "hod"
            elif vwap_break_now:
                break_type = "vwap"

        results.append(
            {
                "symbol": symbol,
                "exchange": f.get("exchange"),
                "price": price,
                "day_high": day_high,
                "day_low": day_low,
                "last_bar_high": last_reg_high,
                "range_pct": _to_pct_points(range_pct),
                "relative_volume": rel_vol,
                "relative_volume_tod": _safe_float(f.get("relVolTod")),
                "today_cum_volume": _safe_int(f.get("todayCumVol")),
                "baseline_cum_volume": _safe_float(f.get("baselineCumVol")),
                "bar_index": _safe_int(f.get("barIndex")),
                "bar_time": f.get("barTime"),
                "price_change_pct": _to_pct_points(price_change_ratio),
                "avg_volume_20d": avg_volume_20d,
                "vwap": vwap_val,
                "vwap_distance": _to_pct_points(vwap_distance_ratio),
                "distance_to_hod": _to_pct_points(dist_to_hod_ratio),
                "break_type": break_type,
            }
        )

    break_priority = {"hod+vwap": 3, "hod": 2, "vwap": 1, None: 0}
    results.sort(
        key=lambda x: (
            break_priority.get(x.get("break_type"), 0),
            x.get("price_change_pct") or 0.0,
            x.get("relative_volume") or 0.0,
        ),
        reverse=True,
    )
    payload = {
        "scanner": "hod_vwap_momentum",
        "sorted_by": "break_type desc, price_change_pct desc, relative_volume desc",
        "results": results[: request.limit],
    }
    write_cache(cache_key, payload)
    return payload


@app.post("/scan/hod-breakouts", response_model=HodVwapMomentumResponse, response_model_exclude_none=True)
def scan_hod_breakouts(request: HodBreakoutsRequest) -> dict:
    cache_key = _scan_cache_key(
        "hod_breakouts",
        request,
        f"minVol={request.minTodayVolume}:minRelVol={request.minRelVol}:"
        f"maxDistToHod={request.maxDistToHod}:limit={request.limit}",
    )
    cached = read_cache(cache_key)
    if cached:
        return cached

    momentum_request = HodVwapMomentumRequest(**request.model_dump(), requireHodBreak=True, requireVwapBreak=False)
    payload = scan_hod_vwap_momentum(momentum_request)
    payload["scanner"] = "hod_breakouts"
    for row in payload.get("results", []) or []:
        if isinstance(row, dict):
            row["vwap"] = None
            row["vwap_distance"] = None

    results = payload.get("results", []) or []
    if isinstance(results, list):
        results.sort(
            key=lambda x: (
                x.get("price_change_pct") or 0.0,
                x.get("relative_volume") or 0.0,
            ),
            reverse=True,
        )
        payload["results"] = results

    payload["sorted_by"] = "price_change_pct desc, relative_volume desc"
    write_cache(cache_key, payload)
    return payload


@app.post("/scan/vwap-breakouts", response_model=HodVwapMomentumResponse, response_model_exclude_none=True)
def scan_vwap_breakouts(request: VwapBreakoutsRequest) -> dict:
    cache_key = _scan_cache_key(
        "vwap_breakouts",
        request,
        f"minVol={request.minTodayVolume}:minRelVol={request.minRelVol}:limit={request.limit}",
    )
    cached = read_cache(cache_key)
    if cached:
        return cached

    momentum_request = HodVwapMomentumRequest(
        **request.model_dump(),
        maxDistToHod=0.0,
        requireHodBreak=False,
        requireVwapBreak=True,
    )
    payload = scan_hod_vwap_momentum(momentum_request)
    payload["scanner"] = "vwap_breakouts"
    for row in payload.get("results", []) or []:
        if isinstance(row, dict):
            row["day_high"] = None
            row["day_low"] = None
            row["last_bar_high"] = None
            row["distance_to_hod"] = None

    results = payload.get("results", []) or []
    if isinstance(results, list):
        results.sort(
            key=lambda x: (
                x.get("price_change_pct") or 0.0,
                x.get("relative_volume") or 0.0,
            ),
            reverse=True,
        )
        payload["results"] = results

    payload["sorted_by"] = "price_change_pct desc, relative_volume desc"
    write_cache(cache_key, payload)
    return payload


@app.post("/scan/volume-spikes", response_model=HodVwapMomentumResponse, response_model_exclude_none=True)
def scan_volume_spikes(request: VolumeSpikesRequest) -> dict:
    cache_key = _scan_cache_key(
        "volume_spikes",
        request,
        f"minVol={request.minTodayVolume}:minRelVol={request.minRelVol}:limit={request.limit}",
    )
    cached = read_cache(cache_key)
    if cached:
        return cached

    feature_payload = _get_features_cached(request)
    min_price, max_price = _effective_price_bounds(request)
    min_change_ratio = float(request.minChangePct or 0.0) / 100.0
    results: List[dict] = []

    for f in feature_payload.get("features", []):
        symbol = f.get("ticker")
        if not symbol:
            continue

        price = _safe_float(f.get("price"))
        prev_close = _safe_float(f.get("prevClose"))
        rel_vol = _safe_float(f.get("relVol"))
        avg_volume_20d = _safe_float(f.get("avgVolume20d"))
        range_pct = _safe_float(f.get("rangePct"))
        today_vol = _safe_int(f.get("todayVolume")) or 0

        if price is None or prev_close in (None, 0):
            continue
        if price < min_price or price > max_price:
            continue
        if today_vol < request.minTodayVolume:
            continue
        if rel_vol is None or rel_vol < request.minRelVol:
            continue

        price_change_ratio = (price - prev_close) / prev_close
        if price_change_ratio < min_change_ratio:
            continue

        results.append(
            {
                "symbol": symbol,
                "exchange": f.get("exchange"),
                "price": price,
                "range_pct": _to_pct_points(range_pct),
                "relative_volume": rel_vol,
                "relative_volume_tod": _safe_float(f.get("relVolTod")),
                "today_cum_volume": _safe_int(f.get("todayCumVol")),
                "baseline_cum_volume": _safe_float(f.get("baselineCumVol")),
                "bar_index": _safe_int(f.get("barIndex")),
                "bar_time": f.get("barTime"),
                "price_change_pct": _to_pct_points(price_change_ratio),
                "avg_volume_20d": avg_volume_20d,
            }
        )

    results.sort(
        key=lambda x: (
            x.get("relative_volume") or 0.0,
            x.get("price_change_pct") or 0.0,
        ),
        reverse=True,
    )
    payload = {
        "scanner": "volume_spikes",
        "sorted_by": "relative_volume desc, price_change_pct desc",
        "results": results[: request.limit],
    }
    write_cache(cache_key, payload)
    return payload


@app.post("/scan/hod-vwap-approach", response_model=HodVwapApproachResponse, include_in_schema=False)
def scan_hod_vwap_approach(request: HodVwapApproachRequest) -> dict:
    cache_key = _scan_cache_key(
        "hod_vwap_approach",
        request,
        f"minP={request.minSetupPrice}:maxP={request.maxSetupPrice}:minVol={request.minTodayVolume}:"
        f"minRange={request.minRangePct}:pos={request.minPosInRange}-{request.maxPosInRange}:"
        f"maxVwap={request.maxAbsVwapDistance}:maxHod={request.maxDistToHod}:minRelVol={request.minRelVol}:"
        f"adaptive={int(request.adaptiveThresholds)}:limit={request.limit}",
    )
    cached = read_cache(cache_key)
    if cached:
        return cached

    feature_payload = _get_features_cached(request)
    results: List[dict] = []
    for f in feature_payload.get("features", []):
        symbol = f.get("ticker")
        if not symbol:
            continue
        price = _safe_float(f.get("price"))
        hod = _safe_float(f.get("hod"))
        lod = _safe_float(f.get("lod"))
        range_pct = _safe_float(f.get("rangePct"))
        pos_in_range = _safe_float(f.get("posInRange"))
        dist_to_hod = _safe_float(f.get("distToHod"))
        vwap_val = _safe_float(f.get("vwap"))
        abs_vwap_distance = _safe_float(f.get("absVwapDistance"))
        today_vol = _safe_int(f.get("todayVolume")) or 0
        rel_vol = _safe_float(f.get("relVol"))
        close_slope_n = _safe_float(f.get("closeSlopeN"))
        atr_val = _safe_float(f.get("atr"))

        if price is None or hod is None or lod is None or range_pct is None or pos_in_range is None:
            continue
        if not (request.minSetupPrice <= price <= request.maxSetupPrice):
            continue
        if today_vol < request.minTodayVolume:
            continue
        if (range_pct * 100.0) < request.minRangePct:
            continue
        if not (request.minPosInRange <= pos_in_range <= request.maxPosInRange):
            continue
        if rel_vol is not None and rel_vol < request.minRelVol:
            continue
        if close_slope_n is None or close_slope_n < 0:
            continue

        hod_enabled = float(request.maxDistToHod or 0.0) > 0.0
        vwap_enabled = float(request.maxAbsVwapDistance or 0.0) > 0.0

        hod_thresh = float(request.maxDistToHod or 0.0) / 100.0
        vwap_thresh = float(request.maxAbsVwapDistance or 0.0) / 100.0
        hod_cap = None
        vwap_cap = None
        if hod_enabled:
            hod_cap = max(float(request.maxDistToHod or 0.0), HOD_APPROACH_ADAPTIVE_CAP_PCT) / 100.0
        if vwap_enabled:
            vwap_cap = max(float(request.maxAbsVwapDistance or 0.0), VWAP_APPROACH_ADAPTIVE_CAP_PCT) / 100.0

        if request.adaptiveThresholds and atr_val not in (None, 0) and price > 0:
            atr_ratio = atr_val / price
            if hod_enabled and hod_cap is not None:
                hod_thresh = max(hod_thresh, min(atr_ratio, hod_cap))
            if vwap_enabled and vwap_cap is not None:
                vwap_thresh = max(vwap_thresh, min(atr_ratio, vwap_cap))

        near_hod = (
            hod_enabled
            and dist_to_hod is not None
            and dist_to_hod <= hod_thresh
            and price < hod
        )
        near_vwap = vwap_enabled and abs_vwap_distance is not None and abs_vwap_distance <= vwap_thresh
        if not (near_hod or near_vwap):
            continue

        vwap_distance = None
        if price is not None and vwap_val not in (None, 0):
            vwap_distance = (price - vwap_val) / vwap_val

        results.append(
            {
                "symbol": symbol,
                "exchange": f.get("exchange"),
                "price": price,
                "hod": hod,
                "distance_to_hod": _to_pct_points(dist_to_hod),
                "vwap": vwap_val,
                "vwap_distance": _to_pct_points(vwap_distance),
                "range_pct": _to_pct_points(range_pct),
                "relative_volume": rel_vol,
                "relative_volume_tod": _safe_float(f.get("relVolTod")),
                "today_cum_volume": _safe_int(f.get("todayCumVol")),
                "baseline_cum_volume": _safe_float(f.get("baselineCumVol")),
                "bar_index": _safe_int(f.get("barIndex")),
                "bar_time": f.get("barTime"),
            }
        )

    results.sort(
        key=lambda x: (
            x.get("distance_to_hod") or 1.0,
            abs(x.get("vwap_distance") or 0.0),
            -(x.get("relative_volume") or 0.0),
        )
    )
    payload = {
        "scanner": "hod_vwap_approach",
        "sorted_by": "distance_to_hod asc, abs(vwap_distance) asc, relative_volume desc",
        "results": results[: request.limit],
    }
    write_cache(cache_key, payload)
    return payload


@app.post("/scan/hod-approach", response_model=HodVwapApproachResponse, response_model_exclude_none=True)
def scan_hod_approach(request: HodApproachRequest) -> dict:
    cache_key = _scan_cache_key(
        "hod_approach",
        request,
        f"minP={request.minSetupPrice}:maxP={request.maxSetupPrice}:minVol={request.minTodayVolume}:"
        f"minRange={request.minRangePct}:pos={request.minPosInRange}-{request.maxPosInRange}:"
        f"maxHod={request.maxDistToHod}:minRelVol={request.minRelVol}:adaptive={int(request.adaptiveThresholds)}:"
        f"limit={request.limit}",
    )
    cached = read_cache(cache_key)
    if cached:
        return cached

    combined_request = HodVwapApproachRequest(**request.model_dump(), maxAbsVwapDistance=0.0)
    payload = scan_hod_vwap_approach(combined_request)
    payload["scanner"] = "hod_approach"
    for row in payload.get("results", []) or []:
        if isinstance(row, dict):
            row["vwap"] = None
            row["vwap_distance"] = None

    results = payload.get("results", []) or []
    if isinstance(results, list):
        results.sort(
            key=lambda x: (
                x.get("distance_to_hod") if x.get("distance_to_hod") is not None else float("inf"),
                -(x.get("relative_volume") or 0.0),
                -(x.get("range_pct") or 0.0),
            )
        )
        payload["results"] = results

    payload["sorted_by"] = "distance_to_hod asc, relative_volume desc, range_pct desc"
    write_cache(cache_key, payload)
    return payload


@app.post("/scan/vwap-approach", response_model=HodVwapApproachResponse, response_model_exclude_none=True)
def scan_vwap_approach(request: VwapApproachRequest) -> dict:
    cache_key = _scan_cache_key(
        "vwap_approach",
        request,
        f"minP={request.minSetupPrice}:maxP={request.maxSetupPrice}:minVol={request.minTodayVolume}:"
        f"minRange={request.minRangePct}:pos={request.minPosInRange}-{request.maxPosInRange}:"
        f"maxVwap={request.maxAbsVwapDistance}:minRelVol={request.minRelVol}:adaptive={int(request.adaptiveThresholds)}:"
        f"limit={request.limit}",
    )
    cached = read_cache(cache_key)
    if cached:
        return cached

    combined_request = HodVwapApproachRequest(
        **request.model_dump(),
        maxDistToHod=0.0,
    )
    payload = scan_hod_vwap_approach(combined_request)
    payload["scanner"] = "vwap_approach"
    for row in payload.get("results", []) or []:
        if isinstance(row, dict):
            row["hod"] = None
            row["distance_to_hod"] = None

    results = payload.get("results", []) or []
    if isinstance(results, list):
        results.sort(
            key=lambda x: (
                abs(x.get("vwap_distance")) if x.get("vwap_distance") is not None else float("inf"),
                -(x.get("relative_volume") or 0.0),
                -(x.get("range_pct") or 0.0),
            )
        )
        payload["results"] = results

    payload["sorted_by"] = "abs(vwap_distance) asc, relative_volume desc, range_pct desc"
    write_cache(cache_key, payload)
    return payload
