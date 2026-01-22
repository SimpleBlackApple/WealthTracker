# Scanner Test Instructions

## Prereqs
- Docker Desktop (for Redis and RedisInsight)
- Python 3.10+ (for the market data service)
- .NET SDK 9.0 (for WealthTrackerServer)

## 1) Start Redis + RedisInsight
```bash
docker compose up -d
```

Redis runs on `localhost:6379` and RedisInsight runs on `http://localhost:5540`.

## 2) Start the Python Market Data Service
```bash
cd MarketDataService
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
uvicorn app:app --reload --port 8001
```

Optional overrides:
- `REDIS_URL` (default `redis://localhost:6379/0`)
- `CACHE_TTL_SECONDS` (default `300`)

## 3) Start the .NET Backend
```bash
$env:ASPNETCORE_ENVIRONMENT="Development"
dotnet run --project WealthTrackerServer
```

Note: the backend requires JWT settings. Provide these via
`appsettings.Development.json` or environment variables:
- `Authentication:Jwt:RsaPublicKeyPath`
- `Authentication:Jwt:RsaPrivateKeyPath`
- `Authentication:Jwt:Issuer`
- `Authentication:Jwt:Audience`
- `Authentication:Jwt:AccessTokenExpirationMinutes`
- `Authentication:Jwt:RefreshTokenExpirationDays`

## 4) Use Swagger to Run Scanner Endpoints
Open:
- `http://localhost:5141/swagger` (default HTTP profile)

Note: percent-like request/response fields use **percent points** (e.g. `3.5` means `3.5%`).

Try `POST /api/scanner/day-gainers` with:
```json
{
  "universeLimit": 200,
  "limit": 25,
  "minPrice": 1.5,
  "maxPrice": 30,
  "minAvgVol": 1000000,
  "minChangePct": 3.0,
  "interval": "5m",
  "period": "1d",
  "prepost": false,
  "closeSlopeN": 6,
  "minTodayVolume": 0
}
```

Other scanner endpoints:
- `POST /api/scanner/hod-breakouts`
- `POST /api/scanner/vwap-breakouts`
- `POST /api/scanner/hod-approach`
- `POST /api/scanner/vwap-approach`

If a scanner returns an empty list (common outside market hours), try:
- Increase `universeLimit` (e.g. `400`)
- Set `period` to `5d` (weekends/holidays often have sparse `1d` intraday bars)
- Loosen `minRelVol`, `minTodayVolume`, or the distance thresholds slightly

## 5) Verify Redis Cache
Open RedisInsight at `http://localhost:5540`, then add a database with:
- Host: `redis` (Docker service name)
- Port: `6379`
- Username: (leave blank)
- Password: (leave blank)

If RedisInsight asks for a URL, use `redis://redis:6379`.

Note: `127.0.0.1` works from your host machine (e.g., redis-cli), but
RedisInsight runs in a container, so it must connect via the Docker network.

Then look for keys like:
- `md:scanner:day_gainers:u=200:minP=1.5:maxP=30:minV=1000000:minChg=3:minTodayV=0:limit=25`
- `md:scanner:features:u=200:minP=1.5:maxP=30:minV=1000000:minChg=3:int=5m:per=1d:prepost=0:slopeN=6`
- `md:scanner:hod_breakouts:...`
- `md:scanner:vwap_breakouts:...`
- `md:scanner:hod_approach:...`
- `md:scanner:vwap_approach:...`
