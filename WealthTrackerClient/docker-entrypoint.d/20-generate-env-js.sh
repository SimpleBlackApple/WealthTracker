#!/usr/bin/env sh
set -eu

WEB_ROOT="${WEB_ROOT:-/usr/share/nginx/html}"

cat > "${WEB_ROOT}/env.js" <<EOF
// Generated at container start. Do not edit.
window.__WEALTHTRACKER_CONFIG__ = {
  apiBaseUrl: "${API_BASE_URL:-}",
  googleClientId: "${GOOGLE_CLIENT_ID:-}",
  googleRedirectUri: "${GOOGLE_REDIRECT_URI:-}",
  scannerRefreshSeconds: ${SCANNER_REFRESH_SECONDS:-300}
}
EOF
