# Quick Fix Deployment Guide

## Issues Fixed

1. ✅ CSP violation - Updated to allow `afia-worker.savola.workers.dev`
2. ✅ CORS credentials error - Added `credentials: true`
3. ✅ Account confusion - All configs use account `a34f53a07c2ef6f31c29f1dc20b71b23`
4. ✅ API URL fallback - Added `VITE_API_URL` environment variable

## Immediate Actions Required

### 1. Update GitHub Secrets (5 minutes)

Go to: `https://github.com/YOUR_USERNAME/YOUR_REPO/settings/secrets/actions`

Add or update these secrets:

```
CLOUDFLARE_API_TOKEN = <your-cloudflare-api-token>
CLOUDFLARE_ACCOUNT_ID = a34f53a07c2ef6f31c29f1dc20b71b23
```

Get your API token from: https://dash.cloudflare.com/profile/api-tokens

### 2. Deploy Worker (2 minutes)

```bash
cd worker
npx wrangler deploy --env stage1
```

Expected output:
```
✨ Deployment complete!
https://afia-worker.savola.workers.dev
```

### 3. Update Cloudflare Pages Environment Variables (3 minutes)

Go to: `https://dash.cloudflare.com/a34f53a07c2ef6f31c29f1dc20b71b23/pages/view/afia-app/settings/environment-variables`

Add these variables for **Production**:

```
VITE_API_URL = https://afia-worker.savola.workers.dev
VITE_PROXY_URL = https://afia-worker.savola.workers.dev
```

### 4. Rebuild and Deploy Pages (3 minutes)

```bash
npm run build
npx wrangler pages deploy dist --project-name=afia-app
```

### 5. Verify Everything Works (2 minutes)

```bash
# Test Worker
curl https://afia-worker.savola.workers.dev/health

# Should return:
# {"status":"ok","requestId":"..."}
```

Then visit: `https://afia-app.pages.dev`

Check browser console - you should see:
- ✅ No CSP violations
- ✅ No CORS errors
- ✅ Model version check succeeds
- ✅ Admin login works

## What Changed

### Files Modified

1. **worker/wrangler.toml**
   - Added `account_id = "a34f53a07c2ef6f31c29f1dc20b71b23"` to all environments

2. **worker/src/index.ts**
   - Added `credentials: true` to CORS configuration

3. **public/_headers**
   - Updated CSP to allow `https://afia-worker.savola.workers.dev`

4. **.env**
   - Added `VITE_API_URL=https://afia-worker.savola.workers.dev`

### Files Created

1. **CLOUDFLARE-ACCOUNT-CONFIG.md** - Complete account setup guide
2. **CLOUDFLARE-MIGRATION-SUMMARY.md** - Detailed migration documentation
3. **QUICK-FIX-DEPLOYMENT.md** - This file

## Troubleshooting

### If Worker deployment fails:

```bash
# Login to correct account
npx wrangler login

# Verify you're using the right account
npx wrangler whoami
# Should show account: a34f53a07c2ef6f31c29f1dc20b71b23
```

### If Pages deployment fails:

```bash
# Make sure you're authenticated
npx wrangler login

# Try deploying with explicit account
CLOUDFLARE_ACCOUNT_ID=a34f53a07c2ef6f31c29f1dc20b71b23 npx wrangler pages deploy dist --project-name=afia-app
```

### If you still see CSP errors:

1. Clear browser cache
2. Hard refresh (Ctrl+Shift+R or Cmd+Shift+R)
3. Check that Pages environment variables are set correctly

### If CORS errors persist:

1. Verify Worker deployed successfully
2. Check Worker logs: `npx wrangler tail --env stage1`
3. Ensure origin is in ALLOWED_ORIGINS list

## Next Steps

After deployment succeeds:

1. Test admin login functionality
2. Test model loading (check for pub-models.afia.app DNS issues)
3. Monitor Worker logs for any errors
4. Set up GitHub Actions for automatic deployments

## Support

For detailed information, see:
- `CLOUDFLARE-ACCOUNT-CONFIG.md` - Account configuration
- `CLOUDFLARE-MIGRATION-SUMMARY.md` - Complete change log
- `README.md` - General project documentation
