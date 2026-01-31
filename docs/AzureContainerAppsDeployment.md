# Deploy to Azure Container Apps (Guide)

Azure Container Apps doesn't take `docker-compose.yml` directly, so the local `docker-compose.local.yml` is only for local testing. For Azure you deploy each container image to its own Container App.

## Target architecture (recommended)

- **web**: `WealthTrackerClient` (external ingress)
- **api**: `WealthTrackerServer` (external ingress)
- **market-data**: `MarketDataService` (internal ingress)
- **redis**: Azure Cache for Redis (managed service)
- **postgres**: Azure Database for PostgreSQL Flexible Server (managed service)

## Prerequisites

- Azure CLI (`az`) and an Azure subscription.
- Docker Desktop (optional if you use `az acr build`).

References:

- Azure Container Apps tutorial (code to cloud): https://learn.microsoft.com/en-us/azure/container-apps/tutorial-code-to-cloud
- Configure ingress (overview): https://learn.microsoft.com/en-us/azure/container-apps/ingress-overview
- Configure ingress (how-to / target port): https://learn.microsoft.com/en-us/azure/container-apps/ingress-how-to
- Environment variables: https://learn.microsoft.com/en-us/azure/container-apps/environment-variables
- Secrets (incl. Key Vault references): https://learn.microsoft.com/en-us/azure/container-apps/manage-secrets
- App-to-app communication (internal DNS): https://learn.microsoft.com/en-us/azure/container-apps/connect-apps
- ACR build task quickstart (`az acr build`): https://learn.microsoft.com/en-us/azure/container-registry/container-registry-quickstart-task-cli
- PostgreSQL Flexible Server quickstart: https://learn.microsoft.com/en-us/azure/postgresql/flexible-server/quickstart-create-server
- PostgreSQL Flexible Server connection string format: https://learn.microsoft.com/en-us/azure/postgresql/flexible-server/quickstart-create-server#connection-string-format
- Private ACR image pull with managed identity: https://learn.microsoft.com/en-us/azure/container-apps/managed-identity-image-pull

## 1) Create Azure resources

Run in PowerShell (or Azure Cloud Shell):

```powershell
$RG="wealthtracker-rg"
$LOC="eastus"
$ACR_NAME="wealthtrackeracr$((Get-Random -Maximum 9999))"
$ENV_NAME="wealthtracker-env"

az login
az group create -n $RG -l $LOC

# ACR (container registry)
az acr create -g $RG -n $ACR_NAME --sku Basic
```

Create a Container Apps environment:

```powershell
az containerapp env create `
  -g $RG `
  -n $ENV_NAME `
  -l $LOC
```

## 2) Build and push container images

Option A (recommended): build in Azure with ACR Tasks (no local Docker needed):

```powershell
# From repo root
az acr build -g $RG -r $ACR_NAME -t wealthtracker-api:1 -f WealthTrackerServer/Dockerfile .
az acr build -g $RG -r $ACR_NAME -t wealthtracker-web:1 -f WealthTrackerClient/Dockerfile WealthTrackerClient
az acr build -g $RG -r $ACR_NAME -t wealthtracker-market-data:1 -f MarketDataService/Dockerfile MarketDataService
```

Option B: build locally + push:

```powershell
az acr login -n $ACR_NAME

docker build -t "$ACR_NAME.azurecr.io/wealthtracker-api:1" -f WealthTrackerServer/Dockerfile .
docker push "$ACR_NAME.azurecr.io/wealthtracker-api:1"

docker build -t "$ACR_NAME.azurecr.io/wealthtracker-web:1" -f WealthTrackerClient/Dockerfile WealthTrackerClient
docker push "$ACR_NAME.azurecr.io/wealthtracker-web:1"

docker build -t "$ACR_NAME.azurecr.io/wealthtracker-market-data:1" -f MarketDataService/Dockerfile MarketDataService
docker push "$ACR_NAME.azurecr.io/wealthtracker-market-data:1"
```

## 3) Provision managed Redis + Postgres

This repo uses Postgres and Redis in local Docker. In Azure, prefer managed services:

- Create **Azure Cache for Redis** and copy the connection string/host+port.
- Create **Azure Database for PostgreSQL Flexible Server** and a database (for example `WealthTracker`), then copy the ADO.NET connection string or construct it.

Notes:

- For Postgres, you typically want `Ssl Mode=Require` in production.
- Network access rules (public access vs VNet) depend on your security posture.

## 4) Deploy `market-data` container app (internal)

This service should be internal-only (no public ingress). Other apps in the same Container Apps environment can call it using `http://<APP_NAME>` (service discovery).

```powershell
$MARKETDATA_APP="wealthtracker-market-data"

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
    "REDIS_URL=<YOUR_AZURE_REDIS_URL>" `
    "CACHE_TTL_SECONDS=300"
```

## 5) Deploy `api` container app (external)

Important env vars for this repo:

- `ConnectionStrings__DefaultConnection`
- `MarketDataService__BaseUrl` (use internal service discovery, for example `http://wealthtracker-market-data`)
- `FrontendUrl` (for CORS)
- Google OAuth: `Authentication__Google__ClientId`, `Authentication__Google__ClientSecret`, `Authentication__Google__RedirectUri`
- JWT: `Authentication__Jwt__*`

For secrets (Google client secret, JWT private key), use Container Apps secrets + `secretref:` in env vars.

Create the API app (edit placeholders):

```powershell
$API_APP="wealthtracker-api"

az containerapp create `
  -g $RG `
  -n $API_APP `
  --environment $ENV_NAME `
  --image "$ACR_NAME.azurecr.io/wealthtracker-api:1" `
  --ingress external `
  --target-port 5141 `
  --registry-server "$ACR_NAME.azurecr.io" `
  --secrets `
    "google-client-secret=<VALUE>" `
    "jwt-private-pem=<VALUE>" `
    "jwt-public-pem=<VALUE>" `
  --env-vars `
    "PORT=5141" `
    "MIGRATE_ON_STARTUP=1" `
    "FrontendUrl=https://<YOUR_WEB_FQDN>" `
    "MarketDataService__BaseUrl=http://$MARKETDATA_APP" `
    "ConnectionStrings__DefaultConnection=<YOUR_POSTGRES_CONN_STRING>" `
    "Authentication__Google__ClientId=<VALUE>" `
    "Authentication__Google__ClientSecret=secretref:google-client-secret" `
    "Authentication__Google__RedirectUri=https://<YOUR_WEB_FQDN>/auth/callback" `
    "Authentication__Jwt__Issuer=WealthTracker" `
    "Authentication__Jwt__Audience=WealthTrackerApi" `
    "Authentication__Jwt__AccessTokenExpirationMinutes=60" `
    "Authentication__Jwt__RefreshTokenExpirationDays=7" `
    "Authentication__Jwt__RsaPrivateKeyPem=secretref:jwt-private-pem" `
    "Authentication__Jwt__RsaPublicKeyPem=secretref:jwt-public-pem"
```

After creation, get the API FQDN:

```powershell
az containerapp show -g $RG -n $API_APP --query properties.configuration.ingress.fqdn -o tsv
```

## 6) Deploy `web` container app (external)

The web container reads runtime config from environment variables and generates `/env.js` at startup.

```powershell
$WEB_APP="wealthtracker-web"
$API_FQDN="<YOUR_API_FQDN>"

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
    "GOOGLE_CLIENT_ID=<VALUE>" `
    "GOOGLE_REDIRECT_URI=https://<YOUR_WEB_FQDN>/auth/callback"
```

Get the web FQDN:

```powershell
az containerapp show -g $RG -n $WEB_APP --query properties.configuration.ingress.fqdn -o tsv
```

## 7) OAuth redirect + CORS checklist

You usually need to update these values when moving from localhost to Azure:

- **Google Cloud Console** OAuth redirect URI: `https://<YOUR_WEB_FQDN>/auth/callback`
- API CORS origin (`FrontendUrl`): `https://<YOUR_WEB_FQDN>`
- Frontend `API_BASE_URL`: `https://<YOUR_API_FQDN>/api`

## Common pitfalls

- **Port mismatch**: ensure `--target-port` matches the container `PORT`.
- **Secrets don’t apply automatically**: after changing secrets, deploy a new revision or restart revisions (see secrets docs).
- **Frontend API URL**: don’t point `API_BASE_URL` to an internal-only hostname; browsers can’t resolve internal Container Apps DNS.
