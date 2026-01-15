# Google OAuth 2.0 Setup Guide

This guide walks through setting up Google OAuth 2.0 for WealthTracker authentication.

## Prerequisites

- A Google account (your personal account works for development)
- Google Cloud Console access

---

## Step 1: Create Google Cloud Project

1. Go to [console.cloud.google.com](https://console.cloud.google.com)
2. Click the project dropdown in the top bar and select **New Project**
3. **Project Name**: `WealthTracker` (or your preferred name)
4. Click **Create**
5. **Important**: Make sure the new project is selected in the top bar before proceeding

---

## Step 2: Enable Google People API

The Google People API replaces the old Google+ API for getting user profile information.

1. Navigate to **APIs & Services** → **Library**
2. Search for "Google People API"
3. Click on the result and click **Enable**

---

## Step 3: Configure OAuth Consent Screen

Required before creating OAuth credentials.

1. Navigate to **APIs & Services** → **OAuth consent screen**
2. **User Type**: Select **External** and click **Create**

### App Information

| Field | Value |
|-------|-------|
| App name | WealthTracker |
| User support email | Your email address |
| Developer contact information | Your email address |

3. **Save and Continue** through Scopes (you don't need to add any for now)
4. **Save and Continue** through Test Users (important: see below)

### Test Users (Crucial for Development)

While the app is in **Testing** mode, only users listed here can log in.

1. Click **+ ADD USERS**
2. Enter your own Google email address
3. Click **Add**
4. **Save** and return to the dashboard

> **Note**: When you're ready for production, you'll need to submit for verification by Google.

---

## Step 4: Create OAuth 2.0 Credentials

1. Navigate to **APIs & Services** → **Credentials**
2. Click **+ CREATE CREDENTIALS** → **OAuth client ID**
3. **Application type**: Select **Web application**
4. **Name**: `WealthTracker Frontend`

### Authorized JavaScript Origins

```
http://localhost:5173
```

> **Note**: No trailing slash, no paths

### Authorized Redirect URIs

```
http://localhost:5173/auth/callback
```

> **Note**: Must match your frontend callback route exactly

5. Click **Create**

---

## Step 5: Store Credentials Securely

A popup will appear with your credentials. **Copy these immediately** - you won't see the Client Secret again!

### Frontend Configuration

File: `WealthTrackerClient/.env.local`

```bash
VITE_GOOGLE_CLIENT_ID=your-client-id-here.apps.googleusercontent.com
VITE_GOOGLE_REDIRECT_URI=http://localhost:5173/auth/callback
```

> **Note**: The Client ID is public and safe to use in frontend code.

### Backend Configuration

File: `WealthTrackerServer/appsettings.Development.json`

```json
{
  "Authentication": {
    "Google": {
      "ClientId": "your-client-id-here.apps.googleusercontent.com",
      "ClientSecret": "your-client-secret-here",
      "RedirectUri": "http://localhost:5173/auth/callback"
    }
  }
}
```

> **Security Warning**: Never commit `ClientSecret` to git. Use `appsettings.Development.json` for local development and use environment variables or a secret manager for production.

---

## Step 6: Generate RSA Keys for JWT

The backend uses RS256 (asymmetric encryption) for JWT tokens. You need to generate RSA key pairs.

### Using OpenSSL (Recommended)

```bash
# Generate private key
openssl genrsa -out WealthTrackerServer/keys/private.pem 2048

# Generate public key from private key
openssl rsa -in WealthTrackerServer/keys/private.pem -pubout -out WealthTrackerServer/keys/public.pem
```

### Using PowerShell (Windows)

```powershell
# Generate private key
openssl genrsa -out WealthTrackerServer\keys\private.pem 2048

# Generate public key
openssl rsa -in WealthTrackerServer\keys\private.pem -pubout -out WealthTrackerServer\keys\public.pem
```

### Verify Keys

Your `WealthTrackerServer/keys/` folder should contain:

```
keys/
├── private.pem  # Keep this secret!
└── public.pem   # Can be shared for debugging
```

---

## Step 7: Verify Configuration

### Frontend Check

File: `WealthTrackerClient/.env.local`

```bash
# Should have these variables:
VITE_GOOGLE_CLIENT_ID=<your-client-id>
VITE_GOOGLE_REDIRECT_URI=http://localhost:5173/auth/callback
```

### Backend Check

File: `WealthTrackerServer/appsettings.Development.json`

```json
{
  "Authentication": {
    "Google": {
      "ClientId": "<same as frontend>",
      "ClientSecret": "<your-secret>",
      "RedirectUri": "http://localhost:5173/auth/callback"
    },
    "Jwt": {
      "Issuer": "WealthTracker",
      "Audience": "WealthTrackerApi",
      "AccessTokenExpirationMinutes": 60,
      "RefreshTokenExpirationDays": 7,
      "RsaPrivateKeyPath": "./keys/private.pem",
      "RsaPublicKeyPath": "./keys/public.pem"
    }
  }
}
```

---

## Testing the OAuth Flow

Once implementation is complete:

1. Start the backend server (usually `https://localhost:5001` or `http://localhost:5000`)
2. Start the frontend dev server (`http://localhost:5173`)
3. Navigate to `http://localhost:5173`
4. Click "Sign in with Google"
5. You should be redirected to Google's OAuth consent screen
6. After approving, you'll be redirected back with an authorization code
7. The backend exchanges this for tokens and creates your user account

---

## Troubleshooting

### Error: redirect_uri_mismatch

**Cause**: The redirect URI in your code doesn't match what's configured in Google Cloud.

**Solution**:
1. Go to Google Cloud Console → Credentials
2. Edit your OAuth 2.0 Client ID
3. Verify Authorized redirect URIs matches exactly: `http://localhost:5173/auth/callback`

### Error: invalid_client

**Cause**: Client ID or Client Secret is incorrect.

**Solution**:
1. Verify Client ID matches in both frontend and backend
2. Verify Client Secret is correct in backend settings

### Error: access_denied

**Cause**: Your email is not in the Test Users list.

**Solution**:
1. Go to OAuth consent screen
2. Add your email to Test Users

### JWT Key Errors

**Cause**: RSA keys not found or invalid.

**Solution**:
1. Verify keys exist in `WealthTrackerServer/keys/`
2. Check file paths in `appsettings.Development.json`
3. Regenerate keys if needed

---

## Production Deployment

When deploying to production:

1. **Add production URLs** to Google OAuth credentials:
   - Add your domain to Authorized JavaScript origins
   - Add your domain's callback URL to Authorized redirect URIs

2. **Use environment variables** for secrets:
   - Never hardcode ClientSecret
   - Use your hosting platform's secret management

3. **Submit for verification** (if you want public access):
   - Go to OAuth consent screen
   - Submit app for verification by Google
   - This process can take days/weeks

4. **HTTPS is required** for production OAuth callbacks

---

## Additional Resources

- [Google OAuth 2.0 Documentation](https://developers.google.com/identity/protocols/oauth2)
- [Google People API Documentation](https://developers.google.com/people)
- [Setting up OAuth 2.0](https://support.google.com/cloud/answer/6158849)
