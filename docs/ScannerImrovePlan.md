# Scanner Improve Plan (Aligned With Current Implementation)

This document is kept as a high-level design/intent reference for the current scanner implementation.
For exact per-scanner filters/fields, see `docs/ScannerLogic.md`. For how to run scanners, see `docs/ScannerTesting.md`.

## Current Scanner Endpoints

Exposed by `WealthTrackerServer`:
- `POST /api/scanner/day-gainers`
- `POST /api/scanner/hod-breakouts`
- `POST /api/scanner/vwap-breakouts`
- `POST /api/scanner/hod-approach`
- `POST /api/scanner/vwap-approach`

Backed by `MarketDataService` (Python):
- `POST /scan/day-gainers`
- `POST /scan/hod-breakouts`
- `POST /scan/vwap-breakouts`
- `POST /scan/hod-approach`
- `POST /scan/vwap-approach`

## Percent Units

Percent-like request/response fields use **percent points** (e.g. `3.5` means `3.5%`).

## Architecture (Current)

- `.NET` is the public API surface and normalizes default request values (e.g. clamps `minPrice >= 1.5`).
- Python (`MarketDataService`) is the Yahoo/yfinance adapter and scanner computation engine.
- Redis is used as a cache (`md:scanner:*`) to reduce repeated Yahoo calls (TTL ~ 5 minutes by default).

## Candidate Universe (Stage 1)

The candidate universe is built by combining Yahoo Finance screeners and de-duplicating by symbol:
- `day_gainers`
- `most_actives`
- `aggressive_small_caps`
- `small_cap_gainers`

Global guardrails (best-effort, applied across scanners):
- Exchange filter: NYSE / NASDAQ / AMEX
- Security type: common stock / equity (best-effort heuristics)
- Price bounds: `price > 1.5` and `price <= maxPrice` (default `30`)
- Liquidity: average daily volume (10d preferred, else 3m) `>= minAvgVol` (default `1,000,000`)

## Scanner Set

1) Day Gainers (market-hours momentum)
- Intent: table-ready list of regular-session gainers with liquidity filters.
- Inputs: `minChangePct`, `minTodayVolume`, `minAvgVol`, `minPrice/maxPrice`, `universeLimit`.

2) HOD Breakouts (break now)
- Intent: last regular-session bar sets the HOD and price is still close to HOD.
- Uses regular-session intraday bars only (filters to `09:30-16:00 ET`).

3) VWAP Breakouts (break now)
- Intent: price is at/above VWAP (VWAP computed from same-session regular-session bars).
- Uses regular-session intraday bars only (filters to `09:30-16:00 ET`).

4) HOD Approach (near-break setup)
- Intent: price is below HOD but within a configurable distance threshold, plus trend/structure filters.

5) VWAP Approach (near-break setup)
- Intent: price is within a configurable distance threshold of VWAP, plus trend/structure filters.

## Removed / Not Implemented

- Pre-market and post-market gap scanners are not implemented due to unreliable extended-hours data in yfinance.
- "Halt-resume" is not implemented (not supported by yfinance in a reliable way).

