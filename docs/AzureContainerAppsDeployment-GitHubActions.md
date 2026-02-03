# Deploy to Azure Container Apps via GitHub Actions (CI/CD)

This guide adds a GitHub Actions workflow so every push to `main` automatically:

- Builds 3 Docker images (`web`, `api`, `market-data`)
- Pushes them to Azure Container Registry (ACR)
- Deploys them to Azure Container Apps (ACA)

To avoid historical buildup and extra ACR storage cost, the workflow keeps rollback capability but retains only the last 5 versions:

- Images: pushes tags using the commit SHA and deletes older images, keeping 5 per repository.
- Revisions: uses multiple revisions mode and keeps 4 inactive (5 total including the active revision).

It does not replace the existing manual Azure CLI guide (`docs/AzureContainerAppsDeployment.md`). Use that doc if you prefer deploying from your laptop; use this doc if you want automatic redeploys after each commit.

## Recommended region for Sydney

Use `australiaeast` (Sydney) to reduce latency.

Alternative: `australiasoutheast` (Melbourne) if you specifically want that region.

## What will be deployed

This workflow deploys the same 3 runtime services you run in `docker-compose.override.yml`:

- `wealthtracker-web` (React build served by Nginx) - public ingress, port 8080
- `wealthtracker-api` (ASP.NET Core) - public ingress, port 5141
- `wealthtracker-market-data` (FastAPI) - internal ingress only, port 8001

PostgreSQL and Redis are NOT deployed to Azure in this workflow. It assumes you use external services (Neon/Upstash, or Azure managed equivalents) and pass the connection details as GitHub secrets.

## Prerequisites (one-time)

You need:

- An Azure subscription
- A PostgreSQL connection string (for the API)
- A Redis URL (for the market-data cache)
- Google OAuth credentials (Client ID + Client Secret)

### Important: register Azure Resource Providers (one-time per subscription)

Your workflow uses a GitHub Service Principal that is typically scoped to a Resource Group. That scope does not allow registering subscription-level resource providers.

Before running the workflow the first time, register these providers once (run with your own Azure user that has subscription permissions):

```powershell
az login
az account show

az provider register --namespace Microsoft.App --wait
az provider register --namespace Microsoft.OperationalInsights --wait
az provider register --namespace Microsoft.ContainerRegistry --wait
```

Portal alternative:

- Azure Portal -> Subscriptions -> (your subscription) -> Resource providers -> search and Register the same namespaces.

## Step 1 - Configure the workflow file

This repo includes:

- `.github/workflows/azure-container-apps.yml`

Open that file and edit the `env:` block at the top:

- `AZURE_LOCATION`: Sydney example: `australiaeast`
- `AZURE_RESOURCE_GROUP`: example `wealthtracker-rg`
- `AZURE_CONTAINERAPPS_ENV`: example `wealthtracker-env`
- `AZURE_ACR_NAME`: must be globally unique and alphanumeric only (no hyphens)
  - Example: `wealthtrackeracr7392`

Tip: if your first run fails with "registry name is not available", change `AZURE_ACR_NAME` and rerun.

## Step 2 - Create Azure credentials for GitHub Actions

GitHub Actions must authenticate to Azure. A straightforward approach is an Azure Service Principal stored as a GitHub secret named `AZURE_CREDENTIALS`.

Run this locally (PowerShell) after `az login`:

```powershell
# Choose region (Sydney)
$RG="wealthtracker-rg"
$LOC="australiaeast"
az group create -n $RG -l $LOC

# Create a Service Principal scoped to the resource group.
# This prints a JSON payload that GitHub Actions can use.
$SUB_ID = (az account show --query id -o tsv)
$SCOPE = "/subscriptions/$SUB_ID/resourceGroups/$RG"

az ad sp create-for-rbac `
  --name "wealthtracker-github-actions" `
  --role "Contributor" `
  --scopes $SCOPE `
  --sdk-auth
```

What this does:

- Creates a "robot identity" (Service Principal) for automation.
- Grants it Contributor access to your Resource Group so the workflow can create/update ACR and Container Apps.
- Outputs a JSON blob that the `azure/login` action can consume.

## Step 3 - Add GitHub repository secrets

In your GitHub repo:

`Settings` -> `Secrets and variables` -> `Actions` -> `New repository secret`

Add these secrets (names must match exactly):

### Azure auth

- `AZURE_CREDENTIALS`: paste the full JSON output from Step 2.

### Database (API)

- `NEON_CONNECTION_STRING`: your PostgreSQL connection string.

### Redis (market-data cache)

- `UPSTASH_REDIS_URL`: example `rediss://default:...@....upstash.io:6379`

Optional (only if you use Upstash REST mode):

- `UPSTASH_REDIS_REST_URL`
- `UPSTASH_REDIS_REST_TOKEN`

Optional:

- `CACHE_TTL_SECONDS` (default is 300)

### Google OAuth

- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`

### JWT signing keys (required)

The backend requires an RSA key pair for JWT signing.

Important:

- These secrets must be the **PEM file contents**, not a file path.
  - Good: starts with `-----BEGIN PUBLIC KEY-----` / `-----BEGIN PRIVATE KEY-----`
  - Bad: `/app/keys/public.pem`
- For GitHub secrets, store them as a single line using literal `\n` sequences (so YAML/env handling is reliable).

Generate keys:

```powershell
mkdir -Force .\\tmp-keys | Out-Null
cd .\\tmp-keys

openssl genpkey -algorithm RSA -out private.pem -pkeyopt rsa_keygen_bits:2048
openssl rsa -pubout -in private.pem -out public.pem
```

Convert PEM to a one-line string with `\n`:

```powershell
$private = Get-Content .\\private.pem -Raw
$public  = Get-Content .\\public.pem -Raw

$privateOneLine = ($private -replace \"`r?`n\", \"\\\\n\").Trim()
$publicOneLine  = ($public  -replace \"`r?`n\", \"\\\\n\").Trim()

$privateOneLine | Set-Clipboard
# Paste clipboard into GitHub secret JWT_PRIVATE_KEY_PEM

$publicOneLine | Set-Clipboard
# Paste clipboard into GitHub secret JWT_PUBLIC_KEY_PEM
```

Add secrets:

- `JWT_PRIVATE_KEY_PEM`
- `JWT_PUBLIC_KEY_PEM`

## Step 4 - Run the workflow

The workflow triggers on:

- Push to `main`
- Manual run: GitHub -> `Actions` -> `Deploy to Azure Container Apps` -> `Run workflow`

On first run it will:

1. Create/ensure Resource Group, ACR, and Container Apps Environment
2. Build and push images for:
   - `WealthTrackerServer/Dockerfile`
   - `WealthTrackerClient/Dockerfile`
   - `MarketDataService/Dockerfile`
3. Create (or update) the 3 Container Apps
4. Print final URLs at the end of the job logs:
   - `Web: https://<your-web-fqdn>`
   - `API: https://<your-api-fqdn>`

## Step 5 - Configure Google OAuth redirect URIs

After the first successful run you will have the web URL:

- `https://wealthtracker-web.<hash>.australiaeast.azurecontainerapps.io`

In Google Cloud Console -> Credentials -> your OAuth client, add:

Authorized JavaScript origins:

- `https://<YOUR_WEB_FQDN>`

Authorized redirect URIs:

- `https://<YOUR_WEB_FQDN>/auth/callback`

Why this step exists:

- Google will only redirect to URLs you explicitly allow.
- Your Container App URL exists only after the first deployment.

## Step 6 - Verify

Open the web UI:

- `https://<YOUR_WEB_FQDN>`

Optional API check:

```bash
curl -X POST "https://<YOUR_API_FQDN>/api/scanner/day-gainers" \
  -H "Content-Type: application/json" \
  -d '{"universeLimit":10,"limit":5}'
```

## Notes

- Web runtime config is injected at container start (Nginx template + `env.js`):
  - `WealthTrackerClient/docker-entrypoint.d/20-generate-env-js.sh`
- API talks to market-data via internal DNS:
  - `MarketDataService__BaseUrl=http://wealthtracker-market-data`

## References

- Microsoft Learn: GitHub Actions for Azure Container Apps
  - https://learn.microsoft.com/en-us/azure/container-apps/github-actions
- Marketplace action: Azure Container Apps Build and Deploy
  - https://github.com/marketplace/actions/azure-container-apps-build-and-deploy
- Existing manual guide
  - `docs/AzureContainerAppsDeployment.md`
