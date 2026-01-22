# Scanner Logic (Current Implementation)

This document describes the behavior of each scanner endpoint exposed by `WealthTrackerServer`, backed by the Python `MarketDataService`.

## External References (Implementation Sources)

The current implementation heavily relies on the `yfinance` library to fetch market data and screener results.
Relevant documentation for the APIs used:

- **Library Home**: [yfinance Documentation](https://ranaroussi.github.io/yfinance/index.html)
- **Screener API** (used for universe selection): [yfinance.screen](https://ranaroussi.github.io/yfinance/reference/api/yfinance.screen.html)
- **Download API** (used for batch intraday bars): [yfinance.download](https://ranaroussi.github.io/yfinance/reference/api/yfinance.download.html)
- **Ticker History API** (used for individual history): [yfinance.Ticker.history](https://ranaroussi.github.io/yfinance/reference/api/yfinance.Ticker.history.html)

## Shared Constraints (All Scanners)

- Universe source (Yahoo screeners): `day_gainers`, `most_actives`, `aggressive_small_caps`, `small_cap_gainers`
- Exchange filter: NYSE / NASDAQ / AMEX (best-effort using Yahoo exchange codes)
- Security type: common stock / equity (best-effort using Yahoo quote type + name heuristics)
- Hard price floor: `price > 1.5` (penny-stock avoidance)
- Liquidity floor: average daily volume (10d preferred, else 3m) `>= minAvgVol`
- De-duplication: by ticker symbol

## Percent Units (Important)

Yahoo's website and screener pages display change as **percentage points** (e.g. `20.73` means `+20.73%`). This project now matches that convention.

Percent-like fields are **percentage points**:
- Request: `minChangePct`, `minRangePct`, `maxAbsVwapDistance`, `maxDistToHod`
- Response: `change_pct`, `price_change_pct`, `range_pct`, `vwap_distance`, `distance_to_hod`

## Scanner: Day Gainers (Market-Hours Momentum)

Endpoint
- `POST /api/scanner/day-gainers`

Intent
- Return a table-ready list of the highest-momentum names (regular-session gainers), without relying on extended-hours data.

Inputs (selected)
- `minChangePct`: minimum gain vs previous close (default `3.0`)
- `minTodayVolume`: optional minimum current volume (default `0`)
- `minPrice`/`maxPrice`: price bounds (min is clamped to `>= 1.5`, with an additional hard filter for `price > 1.5`)

Computation
- `price`: from Yahoo screener quote fields (`regularMarketPrice` best-effort)
- `change_pct`: computed as `(price - prev_close) / prev_close * 100` when possible (percentage points)
- `volume`: from Yahoo screener quote fields (`regularMarketVolume` best-effort)
- `relative_volume`: `volume / avg_daily_volume` (best-effort; `avg_daily_volume` comes from 10d or 3m averages)

Output fields
- Always: `symbol`, `price`, `prev_close`, `change_pct`, `volume`, `relative_volume`
- Best-effort extras (may be omitted): `float_shares`, `market_cap`

Sorting
- `change_pct desc`, then `relative_volume desc`, then `volume desc`

## Scanner: HOD Breakouts (Intraday Breakouts)

Endpoint
- `POST /api/scanner/hod-breakouts`

Intent
- Find symbols actively breaking **HOD** right now (based on the most recent regular-session bar), while maintaining momentum + liquidity filters.

Inputs (selected)
- `minTodayVolume` (default `200,000`)
- `minRelVol` (default `1.7`)
- `maxDistToHod` (default `1.0`): max distance from current price to HOD, in percent points
- `interval`/`period` (defaults `5m`/`1d`; use `5d` during weekends/holidays to reduce empty data)

Computation (regular session only)
- Downloads intraday bars and restricts to `09:30-16:00 ET`
- `hod`, `lod`, `range_pct` (percentage points), and `price_change_pct` (percentage points) computed from those bars (vs `prev_close` from Yahoo quote)
- `relative_volume` computed as `today_volume / avg_daily_volume` (best-effort)
- **HOD break now:** last regular-session bar made HOD (`last_bar_high == day_high`) and current price is within `maxDistToHod` of HOD
- `break_type` is always `hod` for this endpoint (even if the name is also above VWAP)

Output fields
- Always: `symbol`, `price`, `range_pct`, `relative_volume`, `price_change_pct`, `avg_volume_20d`, `break_type`
- HOD-only fields: `day_high`, `day_low`, `last_bar_high`, `distance_to_hod`

Sorting
- `price_change_pct desc`, then `relative_volume desc`

## Scanner: VWAP Breakouts (Intraday Breakouts)

Endpoint
- `POST /api/scanner/vwap-breakouts`

Intent
- Find symbols actively reclaiming/holding **VWAP** right now (price at/above VWAP), while maintaining momentum + liquidity filters.

Inputs (selected)
- `minTodayVolume` (default `200,000`)
- `minRelVol` (default `1.7`)
- `interval`/`period` (defaults `5m`/`1d`; use `5d` during weekends/holidays to reduce empty data)

Computation (regular session only)
- Restricts to `09:30-16:00 ET`
- **VWAP break now:** current price is at/above VWAP (same-session VWAP computed from regular-session bars)
- `break_type` is always `vwap` for this endpoint (even if the name also set a new HOD)

Output fields
- Always: `symbol`, `price`, `range_pct`, `relative_volume`, `price_change_pct`, `avg_volume_20d`, `break_type`
- VWAP-only fields: `vwap`, `vwap_distance`

Sorting
- `price_change_pct desc`, then `relative_volume desc`

## Scanner: HOD Approach (Near-Breakout Setups)

Endpoint
- `POST /api/scanner/hod-approach`

Intent
- Find near-breakout setups approaching HOD (price below HOD but close), with trend + structure filters.

Inputs (selected)
- `minRangePct`, `minPosInRange`/`maxPosInRange`
- `maxDistToHod` (default `2.0`)
- `adaptiveThresholds` (default `true`): allows thresholds to expand using ATR/price (best-effort, capped)

Computation (regular session only)
- Restricts to `09:30-16:00 ET`
- Requires trend confirmation via non-negative close slope
- Passes if near HOD (below it) within `maxDistToHod`
- Adaptive thresholds are capped (HOD `2.5%`) and do not apply when `maxDistToHod` is `0`

Output fields
- Always: `symbol`, `price`, `range_pct`, `relative_volume`
- HOD-only fields: `hod`, `distance_to_hod`

Sorting
- `distance_to_hod asc`, then `relative_volume desc`, then `range_pct desc`

## Scanner: VWAP Approach (Near-Breakout Setups)

Endpoint
- `POST /api/scanner/vwap-approach`

Intent
- Find near-breakout setups approaching VWAP (within threshold), with trend + structure filters.

Inputs (selected)
- `minRangePct`, `minPosInRange`/`maxPosInRange`
- `maxAbsVwapDistance` (default `1.7`)
- `adaptiveThresholds` (default `true`): allows thresholds to expand using ATR/price (best-effort, capped)

Computation (regular session only)
- Restricts to `09:30-16:00 ET`
- Requires trend confirmation via non-negative close slope
- Passes if within `maxAbsVwapDistance` of VWAP
- Adaptive thresholds are capped (VWAP `1.75%`) and do not apply when `maxAbsVwapDistance` is `0`

Output fields
- Always: `symbol`, `price`, `range_pct`, `relative_volume`
- VWAP-only fields: `vwap`, `vwap_distance`

Sorting
- `abs(vwap_distance) asc`, then `relative_volume desc`, then `range_pct desc`
