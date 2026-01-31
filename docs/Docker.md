# Docker (Local) Development

This project can still be run locally **without** containers (the existing `dotnet run`, `pnpm dev`, etc). Docker support is additive.

## Run without Docker (no containers)

You’ll need these dependencies installed and running on your machine:

- PostgreSQL (default `localhost:5432`)
- Redis (default `localhost:6379`)

Then run each service in a separate terminal:

Frontend (React/Vite):

```powershell
cd WealthTrackerClient
pnpm dev
```

Backend API (.NET):

```powershell
dotnet run --project WealthTrackerServer
```

Market data service (FastAPI):

```powershell
cd MarketDataService
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
uvicorn app:app --reload --port 8001
```

Notes:

- Backend DB connection string is in `WealthTrackerServer/appsettings.Development.json` (update user/password/database if your local Postgres differs).
- Frontend env vars are in `WealthTrackerClient/.env` (API URL + Google OAuth redirect).
- First-time DB setup uses EF migrations (see `docs/Initialization.md` for `dotnet-ef` install + `dotnet ef database update`).

## Run “apps local”, infra via Docker (common dev setup)

If you don’t want to install Postgres/Redis locally, you can run just the dependencies via Docker and still run the app processes natively:

```powershell
# Starts Redis only (RedisInsight is optional)
docker compose up -d redis

# Optional: Postgres (from docker-compose.override.yml)
docker compose up -d postgres
```

## Files

- `docker-compose.yml`: Base services (Redis). RedisInsight is optional (profile `tools`).
- `docker-compose.override.yml`: Full local stack (web + api + market-data + postgres).
- `.env.docker.example`: Example env vars for local `docker compose`.
- `docker-compose.local.yml`: Legacy full-stack compose (no longer needed if you use the default `docker compose up -d` flow).

## Full stack (recommended for local container testing)

With `docker-compose.override.yml` present, the default command starts the full stack.

1. (Optional) Create a local env file:

```powershell
Copy-Item .env.docker.example .env
```

2. Start containers:

```powershell
docker compose up -d --build
```

3. Open:

- Web: `http://localhost:5173`
- API: `http://localhost:5141` (OpenAPI available in `Development`)

RedisInsight is optional (profile `tools`):

```powershell
docker compose --profile tools up -d redisinsight
```

Then open: `http://localhost:5540`

4. Stop:

```powershell
docker compose down
```

To also delete volumes (Postgres/Redis data):

```powershell
docker compose down -v
```

## Redis only (existing compose)

If you only want Redis:

```powershell
docker compose up -d redis
```

## Config notes

### Ports

No ports are hardcoded in Dockerfiles. The services read container ports from `PORT`, and `docker compose` maps host ports using env variables (see `.env.docker.example`).

### Frontend runtime config (important for Azure)

The frontend reads runtime config from `/env.js` (generated at container startup).

- `API_BASE_URL` → `window.__WEALTHTRACKER_CONFIG__.apiBaseUrl`
- `GOOGLE_CLIENT_ID` → `window.__WEALTHTRACKER_CONFIG__.googleClientId`
- `GOOGLE_REDIRECT_URI` → `window.__WEALTHTRACKER_CONFIG__.googleRedirectUri`

This avoids rebuilding the image when URLs change across environments.

### Backend JWT keys in containers

For local Docker compose we mount `WealthTrackerServer/keys` into the API container and set:

- `Authentication__Jwt__RsaPrivateKeyPath=/app/keys/private.pem`
- `Authentication__Jwt__RsaPublicKeyPath=/app/keys/public.pem`

For Azure, prefer secrets and use PEM via:

- `Authentication__Jwt__RsaPrivateKeyPem`
- `Authentication__Jwt__RsaPublicKeyPem`

### Database migrations

`docker compose` sets `MIGRATE_ON_STARTUP=1` for the API container to apply EF Core migrations on boot.
