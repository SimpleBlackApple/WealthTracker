# WealthTracker

A market scanner + paper trading desk I built for tracking intraday momentum.

**Live demo:** https://wealthtracker-web.happyriver-14605681.australiaeast.azurecontainerapps.io/  
**My LinkedIn:** https://www.linkedin.com/in/shawn-lee2025/

## What It Does

- **Scanners**: Day gainers, HOD/VWAP breakouts, volume spikes, and approach setups
- **Holdings watchlist**: Shows symbols you actually hold in your portfolio (separate from scanners)
- **Paper trading**: Simulate trades with market/limit/stop orders + fee estimates
- **Portfolio tracking**: P&L on positions, open orders, transaction history

Built this because I wanted a faster way to find momentum setups without paying for expensive scanners.

## Architecture

Three services talking to each other:

- **Frontend**: React + Vite (TypeScript, Tailwind)
- **API**: ASP.NET Core (.NET 9) - handles auth, portfolios, proxies scanner requests
- **Market data**: Python FastAPI using `yfinance` to pull from Yahoo Finance, cached in Redis
- **Database**: PostgreSQL for users, portfolios, transactions

## Running Locally

### Quick start (Docker)

```powershell
Copy-Item .env.docker.example .env
docker compose up -d --build
```

Then open:
- Web: http://localhost:5173
- API: http://localhost:5141 (OpenAPI docs available)

### Without Docker

You'll need Postgres and Redis running locally.

Frontend:
```powershell
cd WealthTrackerClient
pnpm dev
```

Backend:
```powershell
dotnet run --project WealthTrackerServer
```

Market data service:
```powershell
cd MarketDataService
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
uvicorn app:app --reload --port 8001
```

See `docs/Docker.md` for more details on switching between local and remote databases (Neon, etc).

## Testing

```powershell
# Frontend
cd WealthTrackerClient
pnpm test:run

# Backend
cd WealthTrackerServer.Tests
dotnet test

# Market data
cd MarketDataService
python -m unittest discover -s tests
```

## Deployment

Using Azure Container Apps with GitHub Actions:
- CI runs on PRs: `.github/workflows/ci.yml`
- CD deploys on merge to main: `.github/workflows/cd.yml`

See `docs/AzureContainerAppsDeployment-GitHubActions.md` for the full setup.

## Notes

- JWT keys: local dev uses file paths in `appsettings.Development.json`, Azure uses PEM contents via secrets
- Rate limiting is tuned conservatively to avoid Yahoo Finance bans (5 min TTL)
- Stale-while-revalidate caching keeps old data visible while fetching fresh data

## Disclaimer

This is for education and simulation only. No real trades are executed.
