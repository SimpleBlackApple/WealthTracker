# AWS Lightsail Deployment via GitHub Actions

This document explains how to use `.github/workflows/cd.yml` to deploy WealthTracker to a persistent AWS Lightsail instance.

## Why this approach

- Purpose: Keep production stable and cheap.
- We create one persistent Lightsail instance first, then CI/CD only updates containers on that instance.
- This avoids IP/DNS churn, avoids accidental data loss, and keeps deploys fast.

## Domain in use

Current domain setup (your records):

- `wealthtrackertrading.com -> 52.64.244.242`
- `www.wealthtrackertrading.com -> 52.64.244.242`

Use the root URL for app config:

- `https://wealthtrackertrading.com`
- Login page path example: `https://wealthtrackertrading.com/login`

## Target sizing (based on measured usage + headroom)

The deployment caps your 3 runtime containers to fit a 2 GB / 2 vCPU Lightsail instance:

- `web`: `cpus: 0.15`, `mem_limit: 128m`
- `api`: `cpus: 0.35`, `mem_limit: 384m`
- `market-data`: `cpus: 0.60`, `mem_limit: 768m`

Total caps: `1.10 vCPU`, `1.28 GB` (+ OS/Docker overhead).

Runtime files used by CD:

- `deploy/lightsail/docker-compose.lightsail.yml`
- `deploy/lightsail/nginx.default.conf.template`
- `deploy/lightsail/host-nginx/wealthtrackertrading.com.conf`

Important:

- The app container now binds web to `127.0.0.1:8080` (not public `:80`).
- Public `80/443` should be served by host Nginx with Certbot-managed TLS.

## What the new `cd.yml` does

Workflow file: `.github/workflows/cd.yml`

- `pull_request -> main`: build-only validation (no push, no deploy).
  - Purpose: test Docker builds before merge.
- `push -> main`: build, push to GHCR, deploy over SSH to Lightsail.
  - Purpose: production release automation.
- `workflow_dispatch` with `deploy=false`: build/validate only.
  - Purpose: dry-run in GitHub Actions.
- `workflow_dispatch` with `deploy=true`: full deploy.
  - Purpose: manual controlled release.

Deployment flow:

1. Build 3 Docker images.
2. Push images to GHCR tagged by commit SHA.
3. Upload compose + app nginx template + host nginx template + generated `.env` to `/opt/wealthtracker` on Lightsail.
4. `docker compose pull` and `docker compose up -d --remove-orphans`.
5. Clean old GHCR package versions (keep latest 5 per image repo).
6. Run final web/API endpoint verification.

## Before pushing to `main` (one-time setup)

### 1. Create the Lightsail instance (manual)

- Purpose: establish a stable host that CI/CD updates.
- Create a **Linux/Unix instance, 2 GB RAM / 2 vCPU plan**.
- Attach a **Static IP**.
- Keep this instance persistent; do not recreate it per deploy.

### 2. Configure firewall/networking in Lightsail

- Purpose: allow only required inbound traffic.
- Open inbound ports:
  - `22` (SSH, ideally limited to your IP)
  - `80` (HTTP)
  - `443` (HTTPS)

### 3. Install Docker + Compose plugin on the instance

- Purpose: make host ready to run compose-based deploys.

Ubuntu example:

```bash
sudo apt-get update
sudo apt-get install -y ca-certificates curl gnupg
sudo install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
sudo chmod a+r /etc/apt/keyrings/docker.gpg

echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
  $(. /etc/os-release && echo $VERSION_CODENAME) stable" | \
  sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

sudo apt-get update
sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
sudo usermod -aG docker $USER
newgrp docker

docker --version
docker compose version
```

### 4. Install host Nginx + Certbot (no Lightsail LB)

- Purpose: terminate HTTPS on the VM itself and avoid Lightsail Load Balancer fees.
- Required before your next deploy after this change: the app web container is no longer exposed on host port `80`.

Ubuntu example:

```bash
sudo apt-get update
sudo apt-get install -y nginx certbot python3-certbot-nginx
sudo systemctl enable nginx
sudo systemctl start nginx
```

If Nginx fails to start because port `80` is busy, stop it for now and continue setup:

```bash
sudo systemctl stop nginx
```

You can start it again right after the next deploy (when web is moved to `127.0.0.1:8080`).

### 5. Configure host Nginx reverse proxy

- Purpose: expose your app publicly on domain ports `80/443` while app containers stay on localhost ports.
- Use the template from this repo:
  - `deploy/lightsail/host-nginx/wealthtrackertrading.com.conf`

Commands (on Lightsail instance):

```bash
sudo tee /etc/nginx/sites-available/wealthtrackertrading.com >/dev/null <<'EOF'
server {
  listen 80;
  listen [::]:80;
  server_name wealthtrackertrading.com www.wealthtrackertrading.com;

  location / {
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_pass http://127.0.0.1:8080;
  }
}
EOF

sudo ln -sf /etc/nginx/sites-available/wealthtrackertrading.com /etc/nginx/sites-enabled/wealthtrackertrading.com
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl reload nginx
```

### 6. Issue certificate with Certbot

- Purpose: enable HTTPS on your domain and keep certificates renewable.

```bash
sudo certbot --nginx \
  -d wealthtrackertrading.com \
  -d www.wealthtrackertrading.com \
  --redirect \
  --agree-tos \
  --no-eff-email \
  -m <your-email>
```

This command updates Nginx config to install the cert and redirect HTTP to HTTPS.

### 7. Verify automatic renewal

- Purpose: ensure HTTPS won't expire silently.

```bash
systemctl list-timers | grep -E 'certbot|snap.certbot.renew' || true
sudo certbot renew --dry-run
```

### 8. Prepare external managed services

- Purpose: stay within 3 containers on Lightsail.
- Provision these external services:
  - PostgreSQL (Neon): `NEON_CONNECTION_STRING`
  - Redis (Upstash): `UPSTASH_REDIS_URL`

### 9. Prepare GitHub Container Registry access for Lightsail pull

- Purpose: let the instance pull private GHCR images.
- Create a PAT with at least `read:packages`.
- Store as `GHCR_READ_TOKEN` in GitHub secrets.

### 10. Configure GitHub repository secrets

- Purpose: provide deploy credentials/config to the workflow.

Required secrets:

- `LIGHTSAIL_HOST` (static IP or DNS)
- `LIGHTSAIL_USER` (for example `ubuntu`)
- `LIGHTSAIL_SSH_PRIVATE_KEY` (PEM private key content)
- `LIGHTSAIL_SSH_PORT` (optional, default `22`)
- `GHCR_READ_TOKEN`
- `FRONTEND_URL` (set this to `https://wealthtrackertrading.com`)
- `NEON_CONNECTION_STRING`
- `UPSTASH_REDIS_URL`
- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `JWT_PRIVATE_KEY_PEM`
- `JWT_PUBLIC_KEY_PEM`

Optional secrets:

- `UPSTASH_REDIS_REST_URL`
- `UPSTASH_REDIS_REST_TOKEN`

Optional repo variables (`Settings -> Secrets and variables -> Actions -> Variables`):

- `CACHE_TTL_SECONDS`, `CACHE_STALE_TTL_SECONDS`, `SCANNER_REFRESH_SECONDS`
- `MIGRATE_ON_STARTUP`, `MARKETDATA_TIMEOUT_SECONDS`
- `JWT_ISSUER`, `JWT_AUDIENCE`, `JWT_ACCESS_TOKEN_EXP_MINUTES`, `JWT_REFRESH_TOKEN_EXP_DAYS`
- `SERVE_STALE_WHILE_REVALIDATE`, `STALE_RETRY_AFTER_MS`
- `YF_RATE_LIMIT_SCREEN_PER_MIN`, `YF_RATE_LIMIT_DOWNLOAD_PER_MIN`, `YF_RATE_LIMIT_TICKER_PER_MIN`

Important for JWT PEM secrets:

- Store PEM contents, not file paths.
- Multi-line PEM is normalized by workflow; one-line with literal `\n` is recommended.

## After pushing to `main`

### 1. Watch the workflow run

- Purpose: ensure build, push, and remote deploy all succeeded.
- Open GitHub Actions run for `Deploy to AWS Lightsail`.

### 2. Verify runtime on server

- Purpose: catch startup/config regressions early.

```bash
ssh <LIGHTSAIL_USER>@<LIGHTSAIL_HOST>
cd /opt/wealthtracker
docker compose --env-file .env -f docker-compose.lightsail.yml ps
docker compose --env-file .env -f docker-compose.lightsail.yml logs --tail=200
```

### 2.1 Inspect logs for debugging (frontend/backend/market-data + Nginx)

- Purpose: quickly isolate whether failures are in containers or host reverse proxy.

Container logs from anywhere on the server (recommended: absolute paths):

```bash
docker compose \
  --env-file /opt/wealthtracker/.env \
  -f /opt/wealthtracker/docker-compose.lightsail.yml \
  logs -f --tail=200
```

Per-service logs:

```bash
docker compose \
  --env-file /opt/wealthtracker/.env \
  -f /opt/wealthtracker/docker-compose.lightsail.yml \
  logs -f --tail=200 web

docker compose \
  --env-file /opt/wealthtracker/.env \
  -f /opt/wealthtracker/docker-compose.lightsail.yml \
  logs -f --tail=200 api

docker compose \
  --env-file /opt/wealthtracker/.env \
  -f /opt/wealthtracker/docker-compose.lightsail.yml \
  logs -f --tail=200 market-data
```

Host Nginx logs (required for TLS/redirect/proxy issues):

```bash
sudo tail -f /var/log/nginx/access.log /var/log/nginx/error.log
sudo journalctl -u nginx -f
sudo nginx -t
```

Common gotcha:

- If you run `docker compose --env-file .env ...` from `~`, Compose looks for `/home/<user>/.env`.
- Either `cd /opt/wealthtracker` first, or always use absolute paths as shown above.

### 3. Verify domain + HTTPS routing

- Purpose: confirm DNS and TLS are correctly wired.

If this is your first HTTPS cutover after moving web to `127.0.0.1:8080`, ensure host Nginx is running first:

```bash
sudo systemctl start nginx
sudo nginx -t
sudo systemctl reload nginx
```

```bash
curl -I http://wealthtrackertrading.com
curl -I https://wealthtrackertrading.com
curl -I https://www.wealthtrackertrading.com
```

Expected:

- HTTP redirects to HTTPS.
- HTTPS returns valid response with a trusted certificate.

### 4. Configure Google OAuth

- Purpose: allow sign-in from deployed domain.
- In Google Cloud Console OAuth client:
  - Authorized JavaScript origins: `https://wealthtrackertrading.com`
  - Authorized redirect URI: `https://wealthtrackertrading.com/auth/callback`

### 5. Check Certbot renewal periodically

- Purpose: catch renewal failures before certificate expiry.

```bash
sudo certbot renew --dry-run
sudo systemctl status certbot.timer || true
```

## Can I test this CD workflow before pushing to main?

Yes, partially and safely.

### Option A: PR build validation (recommended pre-merge)

- Trigger: open PR to `main`.
- What it tests: Docker builds for all 3 services.
- What it does not test: GHCR push + SSH deploy (by design).
- Purpose: validate the workflow and Dockerfiles without touching production.

### Option B: Manual dry-run in Actions

- Trigger: `workflow_dispatch` with `deploy=false`.
- What it tests: build path only.
- Purpose: repeatable dry-run from GitHub UI.

### Option C: Full deploy test to a non-prod Lightsail instance

- Purpose: end-to-end test before switching production.
- Use a separate repo (or separate workflow file) with staging secrets/host.
- Do not point staging deploys at production host.

Notes:

- `workflow_dispatch` can only run when the workflow file exists on the default branch.
- PR workflows from forks do not receive repository secrets.

## References

- AWS Lightsail pricing (instance plans): https://aws.amazon.com/lightsail/pricing/
- Lightsail instance management: https://docs.aws.amazon.com/lightsail/latest/userguide/lightsail-create-and-start-ubuntu-20-04-instance.html
- Lightsail static IP: https://docs.aws.amazon.com/lightsail/latest/userguide/lightsail-create-static-ip.html
- Lightsail firewall rules: https://docs.aws.amazon.com/lightsail/latest/userguide/understanding-firewall-and-port-mappings-in-amazon-lightsail.html
- GitHub Actions manual runs (`workflow_dispatch`): https://docs.github.com/en/actions/how-tos/managing-workflow-runs-and-deployments/managing-workflow-runs/manually-running-a-workflow
- GitHub Actions fork secret restrictions: https://docs.github.com/en/actions/reference/events-that-trigger-workflows#workflows-in-forked-repositories
- GitHub packages permissions: https://docs.github.com/en/packages/learn-github-packages/about-permissions-for-github-packages
- Docker Compose CPU/memory service limits: https://docs.docker.com/reference/compose-file/services/
- Certbot (Nginx plugin): https://eff-certbot.readthedocs.io/en/stable/using.html#nginx
- Certbot automated renewals: https://eff-certbot.readthedocs.io/en/stable/using.html#automated-renewals
