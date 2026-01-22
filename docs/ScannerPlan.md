# Scanner Plan (Current Implementation)

This document describes the scanner architecture as it exists today. For per-scanner filter logic and output fields, see `docs/ScannerLogic.md`. For how to run scanners locally, see `docs/ScannerTesting.md`.

## Current Scanner Endpoints (.NET)

`WealthTrackerServer` exposes:
- `POST /api/scanner/day-gainers`
- `POST /api/scanner/hod-breakouts`
- `POST /api/scanner/vwap-breakouts`
- `POST /api/scanner/hod-approach`
- `POST /api/scanner/vwap-approach`

`.NET` normalizes defaults (e.g. clamps `minPrice >= 1.5`) and proxies the request to the Python service.

## Python MarketDataService Responsibilities

The Python service (`MarketDataService/app.py`) is the Yahoo/yfinance adapter and scanner computation engine:
- Builds a candidate universe from Yahoo screeners: `day_gainers`, `most_actives`, `aggressive_small_caps`, `small_cap_gainers`
- Applies global filters (exchange / quote type best-effort, `price > 1.5`, `maxPrice` bounds, `minAvgVol`, etc.)
- Computes scanner-specific fields (HOD/LOD/range, VWAP, relative volume, approach distances)
- Caches results in Redis to reduce repeated Yahoo calls

Python endpoints (called by `.NET`):
- `POST /scan/day-gainers`
- `POST /scan/hod-breakouts`
- `POST /scan/vwap-breakouts`
- `POST /scan/hod-approach`
- `POST /scan/vwap-approach`

## Redis Caching

Redis is used as a cache for scanner payloads (TTL defaults to ~5 minutes). Keys are under:
- `md:scanner:*`

See `docs/ScannerTesting.md` for example keys to look for in RedisInsight.

## Percent Units

Percent-like request/response fields use **percent points**:
- Example: `minChangePct = 3.5` means "at least `+3.5%`"
- Example: `vwap_distance = -0.8` means "`0.8%` below VWAP"

## Removed / Not Implemented

- Pre-market and post-market gap scanners were removed from the implementation due to unreliable extended-hours volume/quotes in yfinance.
- "Halt-resume" is not implemented (not supported by yfinance in a reliable way).

