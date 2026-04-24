# Cloudflare Account Migration Summary

## Overview

All Cloudflare-related configurations have been updated to use the correct account:

- **Account ID**: `a34f53a07c2ef6f31c29f1dc20b71b23`
- **Subdomain**: `savola.workers.dev`
- **API Token**: `<stored in GitHub Secrets - do not commit>`

## Files Updated

### 1. Worker Configuration
- **File**: `worker/wrangler.toml`
- **Changes**:
  - Added `account_id = "a34f53a07c2ef6f31c29f1dc20b71b23"` to main config
  - Added `account_id` to all three environments (stage1, stage2, stage3)
  - All worker URLs now use `savola.workers.dev` subdomain

### 2. Environment Files
- **Files**: `.env`, `.env.example`
- **Changes**:
  - Added `VITE_API_URL=https://afia-worker.savola.workers.dev`
  - This ensures the frontend connects to the correct Worker

### 3. CSP Headers
- **File**: `public/_headers`
- **Changes**:
  - Updated CSP to allow `https://afia-worker.savola.workers.dev`
  - Fixed case sensitivity (was `Afia-worker`, now `afia-worker`)

### 4. CORS Configuration
- **File**: `worker/src/index.ts`
- **Changes**:
  - Added `credentials: true` to CORS middleware
  - This fixes the "Access-Control-Allow-Credentials" error

### 5. Documentation
- **Files Updated**:
  - `README.md` - Updated account references
  - `DEPLOYMENT-SUCCESS.md` - Updated account ID and API token
  - `scripts/test-deployment.sh` - Updated expected account ID
- **Files Created**:
  - `CLOUDFLARE-ACCOUNT-CONFIG.md` - Comprehensive account configuration guide
  - `CLOUDFLARE-MIGRATION-SUMMARY.md` - This file

## Worker URLs

All workers now deploy to the `savola.workers.dev` subdomain:

| Environment | Worker Name | URL |
|-------------|-------------|-----|
| Stage 1 (Production) | afia-worker | https://afia-worker.savola.workers.dev |
| Stage 2 (Testing) | afia-worker-stage2 | https://afia-worker-stage2.savola.workers.dev |
| Stage 3 (Future) | afia-worker-stage3 | https://afia-worker-stage3.savola.workers.dev |

## GitHub Secrets

Update these secrets in your GitHub repository (Settings → Secrets and variables → Actions):

1. **CLOUDFLARE_API_TOKEN**
   ```
   <your-cloudflare-api-token>
   ```
   Get from: https://dash.cloudflare.com/profile/api-tokens

2. **CLOUDFLARE_ACCOUNT_ID**
   ```
   a34f53a07c2ef6f31c29f1dc20b71b23
   ```

3. **CLOUDFLARE_WORKER_URL** (optional, has default)
   ```
   https://afia-worker.savola.workers.dev
   ```

## Next Steps

### 1. Update GitHub Secrets
```bash
# Go to: https://github.com/YOUR_USERNAME/YOUR_REPO/settings/secrets/actions
# Add or update the secrets listed above
```

### 2. Deploy Worker
```bash
cd worker
npx wrangler deploy --env stage1
```

### 3. Set Cloudflare Pages Environment Variables
```bash
# Go to: https://dash.cloudflare.com/YOUR_ACCOUNT_ID/pages/view/afia-app/settings/environment-variables
# Add:
# - VITE_API_URL = https://afia-worker.savola.workers.dev
# - VITE_PROXY_URL = https://afia-worker.savola.workers.dev
```

### 4. Deploy Pages
```bash
npm run build
npx wrangler pages deploy dist --project-name=afia-app
```

### 5. Verify Deployment
```bash
# Test Worker
curl https://afia-worker.savola.workers.dev/health

# Expected response:
# {"status":"ok","requestId":"..."}

# Test Pages
# Visit: https://afia-app.pages.dev
```

## Issues Fixed

1. ✅ **CSP Violation**: Updated CSP to allow connections to correct Worker URL
2. ✅ **CORS Credentials**: Added `credentials: true` to CORS middleware
3. ✅ **Account Confusion**: All configs now use account `a34f53a07c2ef6f31c29f1dc20b71b23`
4. ✅ **URL Case Sensitivity**: Fixed `Afia-worker` → `afia-worker`
5. ✅ **API URL Fallback**: Added `VITE_API_URL` to prevent fallback to non-existent `api.afia.app`

## Remaining Issues to Address

1. **DNS for pub-models.afia.app**: Verify this domain is properly configured or update the R2 URL
2. **Worker 503 Error**: Check Worker logs for admin auth endpoint issues (may be Supabase connection or missing secrets)

## Testing Checklist

- [ ] Worker health endpoint responds: `curl https://afia-worker.savola.workers.dev/health`
- [ ] Pages loads without CSP errors
- [ ] Model version check succeeds (no CSP violation)
- [ ] Admin login works (no 503 error)
- [ ] CORS credentials work properly
- [ ] GitHub Actions deployment succeeds

## Reference

For detailed configuration information, see:
- `CLOUDFLARE-ACCOUNT-CONFIG.md` - Complete account setup guide
- `worker/wrangler.toml` - Worker configuration
- `public/_headers` - CSP and security headers
- `.github/workflows/deploy-on-ci-success.yml` - CI/CD configuration
