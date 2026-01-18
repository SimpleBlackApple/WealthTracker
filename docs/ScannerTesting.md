# Scanner Screener Test Instructions

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

## 4) Use Swagger to Call the Screener
Open:
- `http://localhost:5141/swagger` (default HTTP profile)

Try `POST /api/scanner/screener` with:
```json
{
  "type": "gappers",
  "limit": 25,
  "minPrice": 1,
  "minAvgVol": 1000000,
  "session": "regular"
}
```

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
- `md:screener:gappers:regular:limit=25:minPrice=1:minAvgVol=1000000`
