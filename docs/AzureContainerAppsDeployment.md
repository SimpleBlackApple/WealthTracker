# Deploy to Azure Container Apps - Cost-Optimized Guide (v2)

This guide shows you how to deploy WealthTracker to **Azure Container Apps** using a **cost-optimized architecture** with managed database services.

If you want **automatic redeploys after each Git commit**, follow `docs/AzureContainerAppsDeployment-GitHubActions.md` instead.

## Why This Architecture?

The original approach used Azure's managed services (Redis and PostgreSQL), which cost **$30-50+/month** minimum. This new design uses **free tiers** from third-party providers while keeping your applications on Azure Container Apps.

**Total monthly cost: $0-5** (compared to $50-100 with full Azure managed services)

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    Azure Container Apps                      │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐  │
│  │     web     │  │     api     │  │    market-data      │  │
│  │  (public)   │  │  (public)   │  │    (internal)       │  │
│  │   Port 8080 │  │   Port 5141 │  │     Port 8001       │  │
│  └─────────────┘  └─────────────┘  └─────────────────────┘  │
│         ↑                ↑                    ↑             │
│         └────────────────┴────────────────────┘             │
│              All services can scale to zero                  │
└─────────────────────────────────────────────────────────────┘
         ↓                           ↓
┌─────────────────┐        ┌─────────────────┐
│   Upstash Redis │        │ Neon Postgres│
│    (Free Tier)  │        │    (Free Tier)   │
│   256MB / 500K  │        │   500MB storage  │
│   commands/month│        │   200MB egress   │
└─────────────────┘        └─────────────────┘
```

### Components

| Service | Provider | Cost | Why |
|---------|----------|------|-----|
| **web** (React frontend) | Azure Container Apps | $0-2/month | Scales to zero, uses free tier |
| **api** (.NET backend) | Azure Container Apps | $0-2/month | Scales to zero, uses free tier |
| **market-data** (Python) | Azure Container Apps | $0-1/month | Internal only, minimal resources |
| **PostgreSQL** | Neon | **$0** | 500MB storage, IPv4 compatible, suitable for development and testing |
| **Redis** | Upstash | **$0** | 256MB, 500K commands/month, 5min TTL |

## Prerequisites

- **Azure CLI** (`az`) installed - [Install guide](https://docs.microsoft.com/en-us/cli/azure/install-azure-cli)
- **Azure subscription** with valid payment method (though you'll stay in free tiers)
- **Neon account** (free) - [Sign up](https://neon.tech)
- **Upstash account** (free) - [Sign up](https://upstash.com)
- **Google OAuth credentials** (for authentication)

## Step 1: Set Up Free Database Services

### 1.1 Create Neon Project (PostgreSQL)

1. Go to [neon.tech](https://neon.tech) and create a free account
2. Click "New Project"
3. Choose project name (e.g., "wealthtracker")
4. Select PostgreSQL version (15 or 16)
5. Choose region (pick same region as Azure for lower latency)
6. Click "Create Project"

**Get your connection string:**

1. In Neon dashboard, click **Connect**
2. Select **Pooled connection** (recommended for serverless environments)
3. Copy the connection string, it should look like:
   ```
   Host=ep-xxxx-pooler.xxx.neon.tech;Port=5432;Database=neondb;Username=neondb_owner;Password=[PASSWORD];SSL Mode=Require
   ```

   **Important**: Use `SSL Mode=Require` (not `VerifyFull`) to avoid certificate validation issues in Docker/Azure Container Apps.
4. **Important**: Keep this secure! You'll need it in Step 4.

**Notes:**
- Neon provides **IPv4 compatible** connections (works seamlessly with Docker and Azure Container Apps)
- The pooled connection handles connection pooling automatically

### 1.2 Create Upstash Redis Database

1. Go to [upstash.com](https://upstash.com) and create free account
2. Click "Create Database"
3. Name: `wealthtracker-redis`
4. Region: Select same as Azure (e.g., `us-east-1` for Virginia)
5. Type: **Redis**
6. Click "Create"

**Get your Redis URL:**

1. In Upstash console, click your database
2. Find "redis-cli" section
3. Copy the Redis protocol URL (`rediss://...`) or the REST credentials (**UPSTASH_REDIS_REST_URL** + **UPSTASH_REDIS_REST_TOKEN**)
4. The format should be:
   ```
   rediss://default:xxxxxxxx@xxxxxxxx.upstash.io:6379
   ```
   - Note: It's `rediss://` (with 's' for SSL/TLS)
   - Upstash uses port 6379 and requires SSL

**Test the connection locally:**

```bash
# Install redis-cli if needed
# Test connection (replace with your actual URL)
redis-cli -u "rediss://default:YOUR_PASSWORD@YOUR_HOST.upstash.io:6379" ping
# Should return: PONG
```

## Step 2: Create Azure Resources

Open PowerShell or Azure Cloud Shell and run:

```powershell
# Set variables
$RG="wealthtracker-rg"
$LOC="australiaeast"
$ACR_NAME="wealthtrackeracr$((Get-Random -Maximum 9999))"
$ENV_NAME="wealthtracker-env"

# Login to Azure
az login

# Create resource group
az group create -n $RG -l $LOC

# Create Container Registry (for storing Docker images)
az acr create -g $RG -n $ACR_NAME --sku Basic

# Create Container Apps Environment
az containerapp env create `
  -g $RG `
  -n $ENV_NAME `
  -l $LOC
```

**What this creates:**
- Resource group: Logical container for all resources
- Azure Container Registry (ACR): Stores your Docker images privately
- Container Apps Environment: The Kubernetes-like platform that runs your containers

## Step 3: Build and Push Container Images

Build all three application containers in Azure (no local Docker needed):

```powershell
# Build API (.NET backend)
az acr build `
  -g $RG `
  -r $ACR_NAME `
  -t wealthtracker-api:1 `
  -f WealthTrackerServer/Dockerfile .

# Build Web (React frontend)
az acr build `
  -g $RG `
  -r $ACR_NAME `
  -t wealthtracker-web:1 `
  -f WealthTrackerClient/Dockerfile `
  WealthTrackerClient

# Build Market Data (Python service)
az acr build `
  -g $RG `
  -r $ACR_NAME `
  -t wealthtracker-market-data:1 `
  -f MarketDataService/Dockerfile `
  MarketDataService
```

**What this does:**
- Uploads your source code to Azure
- Azure builds Docker images in the cloud
- Stores images in your private registry
- Takes ~3-5 minutes per image

**Verify builds:**

```powershell
az acr repository list -n $ACR_NAME -o table
# Should show: wealthtracker-api, wealthtracker-market-data, wealthtracker-web
```

## Deployment Strategy

All services use **single tag deployment** (`:1`) with `--replace` flag:
- **First deploy**: Creates new Container App
- **Subsequent deploys**: Updates image and replaces current revision (old revisions are removed)
- **Benefits**: No accumulation of old revisions or image tags, keeping costs minimal

## Step 4: Deploy Market Data Service (Internal)

This service runs internally (no public access) and connects to Upstash Redis.

```powershell
$MARKETDATA_APP="wealthtracker-market-data"
$UPSTASH_REDIS_URL="rediss://default:YOUR_PASSWORD@YOUR_HOST.upstash.io:6379"

# Check if app exists
$appExists = az containerapp show -g $RG -n $MARKETDATA_APP 2>&1

if ($appExists -match "ResourceNotFound") {
    # Create new app
    Write-Host "Creating new market-data app..."
    az containerapp create `
      -g $RG `
      -n $MARKETDATA_APP `
      --environment $ENV_NAME `
      --image "$ACR_NAME.azurecr.io/wealthtracker-market-data:1" `
      --ingress internal `
      --target-port 8001 `
      --registry-server "$ACR_NAME.azurecr.io" `
      --env-vars `
        "PORT=8001" `
        "REDIS_URL=$UPSTASH_REDIS_URL" `
        "CACHE_TTL_SECONDS=300" `
        "SCANNER_UNIVERSE_LIMIT=25" `
        "SCANNER_RESULTS_LIMIT=25"
} else {
    # Update existing app with --replace (no old revisions kept)
    Write-Host "Updating existing market-data app..."
    az containerapp update `
      -g $RG `
      -n $MARKETDATA_APP `
      --image "$ACR_NAME.azurecr.io/wealthtracker-market-data:1" `
      --replace  # Replace current revision, don't keep old ones
}
```

**Important notes:**
- Replace `YOUR_PASSWORD` and `YOUR_HOST` with your actual Upstash credentials
- `--ingress internal` means only other Container Apps can access this
- The service discovers others via internal DNS: `http://wealthtracker-market-data`
- `--replace` ensures old revisions are removed, keeping costs minimal

## Step 5: Deploy API Backend (Public)

The API needs PostgreSQL connection and talks to market-data internally.

```powershell
$API_APP="wealthtracker-api"
$NEON_URL="Host=ep-xxxx-pooler.xxx.neon.tech;Port=5432;Database=neondb;Username=neondb_owner;Password=YOUR_PASSWORD;SSL Mode=Require"
$GOOGLE_CLIENT_ID="YOUR_GOOGLE_CLIENT_ID"
$GOOGLE_CLIENT_SECRET="YOUR_GOOGLE_SECRET"

# First, store secrets securely
az containerapp secret set `
  -g $RG `
  -n $API_APP `
  --secrets `
    "google-client-secret=$GOOGLE_CLIENT_SECRET" `
    "jwt-private-pem=$(Get-Content ./WealthTrackerServer/keys/private.pem -Raw)" `
    "jwt-public-pem=$(Get-Content ./WealthTrackerServer/keys/public.pem -Raw)" `
    "neon-url=$NEON_URL"

# Check if app exists and deploy accordingly
$apiExists = az containerapp show -g $RG -n $API_APP 2>&1

if ($apiExists -match "ResourceNotFound") {
    # Create new app
    Write-Host "Creating new API app..."
    az containerapp create `
      -g $RG `
      -n $API_APP `
      --environment $ENV_NAME `
      --image "$ACR_NAME.azurecr.io/wealthtracker-api:1" `
      --ingress external `
      --target-port 5141 `
      --registry-server "$ACR_NAME.azurecr.io" `
      --secrets `
        "google-client-secret=$GOOGLE_CLIENT_SECRET" `
        "neon-url=$NEON_URL" `
      --env-vars `
        "PORT=5141" `
        "MIGRATE_ON_STARTUP=1" `
        "FrontendUrl=https://<TO_BE_UPDATED>" `
        "MarketDataService__BaseUrl=http://$MARKETDATA_APP" `
        "ConnectionStrings__DefaultConnection=secretref:neon-url" `
        "Authentication__Google__ClientId=$GOOGLE_CLIENT_ID" `
        "Authentication__Google__ClientSecret=secretref:google-client-secret" `
        "Authentication__Google__RedirectUri=https://<TO_BE_UPDATED>/auth/callback" `
        "Authentication__Jwt__Issuer=WealthTracker" `
        "Authentication__Jwt__Audience=WealthTrackerApi" `
        "Authentication__Jwt__AccessTokenExpirationMinutes=60" `
        "Authentication__Jwt__RefreshTokenExpirationDays=7" `
        "Authentication__Jwt__RsaPrivateKeyPath=/app/secrets/private.pem" `
        "Authentication__Jwt__RsaPublicKeyPath=/app/secrets/public.pem"
} else {
    # Update existing app with --replace
    Write-Host "Updating existing API app..."
    az containerapp update `
      -g $RG `
      -n $API_APP `
      --image "$ACR_NAME.azurecr.io/wealthtracker-api:1" `
      --replace
}
```

**Get your API URL:**

```powershell
$API_FQDN=$(az containerapp show -g $RG -n $API_APP --query properties.configuration.ingress.fqdn -o tsv)
Write-Host "API URL: https://$API_FQDN"
# Example output: https://wealthtracker-api.xxxxxxxxxxx.australiaeast.azurecontainerapps.io
```

## Step 6: Deploy Web Frontend (Public)

The frontend is a static React app that calls the API.

```powershell
$WEB_APP="wealthtracker-web"

# Check if app exists and deploy accordingly
$webExists = az containerapp show -g $RG -n $WEB_APP 2>&1

if ($webExists -match "ResourceNotFound") {
    # Create new app
    Write-Host "Creating new web app..."
    az containerapp create `
      -g $RG `
      -n $WEB_APP `
      --environment $ENV_NAME `
      --image "$ACR_NAME.azurecr.io/wealthtracker-web:1" `
      --ingress external `
      --target-port 8080 `
      --registry-server "$ACR_NAME.azurecr.io" `
      --env-vars `
        "PORT=8080" `
        "API_BASE_URL=https://$API_FQDN/api" `
        "GOOGLE_CLIENT_ID=$GOOGLE_CLIENT_ID" `
        "GOOGLE_REDIRECT_URI=https://<TO_BE_UPDATED>/auth/callback" `
        "SCANNER_REFRESH_SECONDS=300"
} else {
    # Update existing app with --replace
    Write-Host "Updating existing web app..."
    az containerapp update `
      -g $RG `
      -n $WEB_APP `
      --image "$ACR_NAME.azurecr.io/wealthtracker-web:1" `
      --replace
}
```

**Get your Web URL:**

```powershell
$WEB_FQDN=$(az containerapp show -g $RG -n $WEB_APP --query properties.configuration.ingress.fqdn -o tsv)
Write-Host "Web URL: https://$WEB_FQDN"
# Example output: https://wealthtracker-web.xxxxxxxxxxx.australiaeast.azurecontainerapps.io
```

## Step 7: Update Environment Variables with Real URLs

Now that you have actual URLs, update the apps:

```powershell
# Update API with correct FrontendUrl (for CORS) and RedirectUri
az containerapp update `
  -g $RG `
  -n $API_APP `
  --env-vars `
    "FrontendUrl=https://$WEB_FQDN" `
    "Authentication__Google__RedirectUri=https://$WEB_FQDN/auth/callback"

# Update Web with correct RedirectUri
az containerapp update `
  -g $RG `
  -n $WEB_APP `
  --env-vars `
    "GOOGLE_REDIRECT_URI=https://$WEB_FQDN/auth/callback"
```

## Step 8: Configure Google OAuth

1. Go to [Google Cloud Console](https://console.cloud.google.com/apis/credentials)
2. Find your OAuth 2.0 credentials
3. Add these **Authorized redirect URIs**:
   ```
   https://<YOUR_WEB_FQDN>/auth/callback
   ```
   Example: `https://wealthtracker-web.xxx.australiaeast.azurecontainerapps.io/auth/callback`

4. Add this **Authorized JavaScript origin**:
   ```
   https://<YOUR_WEB_FQDN>
   ```

## Step 9: Verify Deployment

Test all services:

```powershell
# Test API health
curl "https://$API_FQDN/api/health"

# Test market data through API
curl -X POST "https://$API_FQDN/api/scanner/day-gainers" `
  -H "Content-Type: application/json" `
  -d '{"universeLimit": 10, "limit": 5}'

# Open web app in browser
Start-Process "https://$WEB_FQDN"
```

Check logs if something fails:

```powershell
# View real-time logs
az containerapp logs show -g $RG -n $API_APP --follow
az containerapp logs show -g $RG -n $WEB_APP --follow
az containerapp logs show -g $RG -n $MARKETDATA_APP --follow
```

## Architecture Details

### How Services Communicate

```
User Browser
     ↓ HTTPS
Web Frontend (React)
     ↓ HTTPS /api/*
API Backend (.NET)
     ↓ HTTP (internal)
Market Data (Python) ←→ Upstash Redis (cached data)
     ↓
Yahoo Finance API
```

### Why This Design Works

**Azure Container Apps Free Tier includes:**
- 180,000 vCPU-seconds/month (~2,000 hours of 0.25 vCPU)
- 360,000 GiB-seconds/month (~4,000 hours of 0.25 GB RAM)
- 2 million requests/month

**With scale-to-zero enabled:**
- Each app runs with 0.25 vCPU + 0.5 GB RAM when active
- Apps scale to zero when not in use, minimizing costs
- Expected cost: **$0-5/month** (within Azure free tier)

### Service Configuration Summary

| Service | Port | Ingress | Min Replicas | Max Replicas |
|---------|------|---------|--------------|--------------|
| web | 8080 | External | 0 (scales to zero) | 1-3 |
| api | 5141 | External | 0 (scales to zero) | 1-3 |
| market-data | 8001 | Internal | 0 (scales to zero) | 1 |

## Environment Variables Reference

### Market Data Service

| Variable | Value | Description |
|----------|-------|-------------|
| `PORT` | `8001` | Service port |
| `REDIS_URL` | `rediss://...` | Upstash Redis connection |
| `UPSTASH_REDIS_REST_URL` | `https://...` | Upstash REST endpoint (optional alternative) |
| `UPSTASH_REDIS_REST_TOKEN` | `...` | Upstash REST token (optional alternative) |
| `CACHE_TTL_SECONDS` | `300` | Cache expiry (5 minutes) |
| `SCANNER_UNIVERSE_LIMIT` | `25` | Max stocks to scan |
| `SCANNER_RESULTS_LIMIT` | `25` | Max results to return |

### API Service

| Variable | Value | Description |
|----------|-------|-------------|
| `PORT` | `5141` | Service port |
| `MIGRATE_ON_STARTUP` | `1` | Auto-run DB migrations |
| `FrontendUrl` | `https://...` | CORS origin |
| `MarketDataService__BaseUrl` | `http://...` | Internal market-data URL |
| `ConnectionStrings__DefaultConnection` | `Host=...;Database=...` | Neon Npgsql connection string |
| `Authentication__Google__ClientId` | `...` | OAuth client ID |
| `Authentication__Google__ClientSecret` | `secretref:...` | OAuth secret |
| `Authentication__Google__RedirectUri` | `https://...` | OAuth callback |
| `Authentication__Jwt__*` | Various | JWT configuration |

### Web Frontend

| Variable | Value | Description |
|----------|-------|-------------|
| `PORT` | `8080` | Service port |
| `API_BASE_URL` | `https://.../api` | Backend API URL |
| `GOOGLE_CLIENT_ID` | `...` | OAuth client ID |
| `GOOGLE_REDIRECT_URI` | `https://...` | OAuth callback |
| `SCANNER_REFRESH_SECONDS` | `300` | Auto-refresh interval |

## Troubleshooting

### Issue: "Cannot connect to Redis"

**Symptoms:** Market data returns errors, scanners don't work

**Fix:**
```powershell
# Verify Redis URL format (must be rediss:// for Upstash)
az containerapp show -g $RG -n $MARKETDATA_APP --query properties.configuration.env

# Update if needed
az containerapp update `
  -g $RG `
  -n $MARKETDATA_APP `
  --env-vars "REDIS_URL=rediss://default:PASSWORD@HOST.upstash.io:6379"
```

### Issue: "Database connection failed"

**Symptoms:** API crashes on startup, migrations fail

**Fix:**
- Check Neon connection string format
- **Important**: Use `SSL Mode=Require` (not `VerifyFull`). `VerifyFull` requires strict certificate validation which may fail in Docker/Azure Container Apps.
- Ensure database exists (you may need to create it first in Neon SQL Editor)
- Verify password is correct
- Check Neon project is active (not paused)

### Issue: "Google OAuth not working"

**Symptoms:** Login fails, redirect URI errors

**Fix:**
1. Check redirect URI in Google Console matches exactly
2. Verify `FrontendUrl` and `GOOGLE_REDIRECT_URI` env vars
3. No trailing slashes mismatches
4. HTTPS (not HTTP)

### Issue: "Services can't communicate"

**Symptoms:** API can't reach market-data

**Fix:**
```powershell
# Check market-data is internal ingress
az containerapp show -g $RG -n $MARKETDATA_APP --query properties.configuration.ingress.external
# Should return: false

# Verify DNS resolution works (access via ACA internal ingress)
az containerapp exec -g $RG -n $API_APP --command "curl http://$MARKETDATA_APP/health"
```

## Cleanup

To remove all deployed resources:

```powershell
# Delete entire resource group (removes all Azure resources)
az group delete -n $RG --yes

# Also delete external resources:
# - Neon project (via Neon dashboard)
# - Upstash database (via Upstash dashboard)
```

## References

- [Azure Container Apps Documentation](https://learn.microsoft.com/en-us/azure/container-apps/)
- [Neon Documentation](https://neon.tech/docs)
- [Upstash Documentation](https://docs.upstash.com/redis)
- [Azure Container Apps Pricing](https://azure.microsoft.com/en-us/pricing/details/container-apps/)
- [Original docker-compose setup](../docker-compose.override.yml)

## Need Help?

If you encounter issues:
1. Check logs: `az containerapp logs show -g $RG -n <app-name> --follow`
2. Verify environment variables: `az containerapp show -g $RG -n <app-name> --query properties.configuration.env`
3. Test connections from within containers using `az containerapp exec`
4. Review this document's troubleshooting section
