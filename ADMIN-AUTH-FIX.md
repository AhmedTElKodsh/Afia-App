# Admin Authentication Fix Guide

## Problem
Admin login fails with "Network error. Please check your connection." despite `ADMIN_PASSWORD` being set in Cloudflare dashboard.

## Root Causes Identified

1. **Frontend can't reach the worker** - Network/CORS issue
2. **Worker URL not configured** - Missing `VITE_PROXY_URL` in Cloudflare Pages
3. **Secret not set for correct environment** - Secret needs to be set for production worker

## Step-by-Step Fix

### Step 1: Verify Worker URL in Cloudflare Pages

1. Go to Cloudflare Dashboard → Pages → `afia-app`
2. Click **Settings** → **Environment variables**
3. Check if `VITE_PROXY_URL` is set for **Production**
4. It should be: `https://afia-worker.savola.workers.dev`
5. If missing, add it:
   - Variable name: `VITE_PROXY_URL`
   - Value: `https://afia-worker.savola.workers.dev`
   - Environment: **Production**

### Step 2: Verify Worker Deployment

1. Go to Cloudflare Dashboard → Workers & Pages → `afia-worker`
2. Check the **Routes** tab - ensure it's deployed
3. Test the worker directly:
   ```bash
   curl https://afia-worker.savola.workers.dev/model/version
   ```
   Should return: `{"version":"1.0.0"}`

### Step 3: Verify ADMIN_PASSWORD Secret

The secret in your screenshot shows it's encrypted, which is correct. However, you need to verify:

1. Go to Cloudflare Dashboard → Workers & Pages → `afia-worker`
2. Click **Settings** → **Variables and Secrets**
3. Verify `ADMIN_PASSWORD` exists as a **Secret** (not a variable)
4. If you need to update it, click **Edit** → **Encrypt** → Enter new password

**IMPORTANT**: The secret must be set as a **Secret** (encrypted), not a plain text variable.

### Step 4: Test Authentication Locally First

Before testing in production, verify locally:

```bash
# In worker directory
cd worker

# Start local worker (uses .dev.vars)
npm run dev

# In another terminal, test auth
curl -X POST http://localhost:8787/admin/auth \
  -H "Content-Type: application/json" \
  -d '{"password":"1234"}'
```

Expected response:
```json
{
  "token": "eyJ...",
  "expiresAt": 1234567890
}
```

### Step 5: Check Browser Console

1. Open `https://afia-app.pages.dev` in browser
2. Open Developer Tools (F12)
3. Go to **Console** tab
4. Try to log in
5. Look for errors like:
   - `CORS error` → Worker URL not in allowed origins
   - `Failed to fetch` → Worker not reachable
   - `net::ERR_NAME_NOT_RESOLVED` → Worker URL wrong

### Step 6: Verify CORS Configuration

The worker should allow `https://afia-app.pages.dev`. Check [`worker/src/index.ts`](worker/src/index.ts:34):

```typescript
const allowedOrigins = env.ALLOWED_ORIGINS?.split(",").map((o) => o.trim()).filter(Boolean) ?? [
  "http://localhost:5173",
  "http://localhost:4173",
];
```

The `ALLOWED_ORIGINS` environment variable in [`worker/wrangler.toml`](worker/wrangler.toml:8) includes:
```
ALLOWED_ORIGINS = "https://afia-app.pages.dev,https://afia-oil-tracker.pages.dev,http://localhost:5173,http://localhost:4173"
```

This is correct ✓

## Quick Diagnostic Commands

### Test Worker Endpoint
```bash
# Test if worker is reachable
curl https://afia-worker.savola.workers.dev/model/version

# Test admin auth with wrong password (should return 401)
curl -X POST https://afia-worker.savola.workers.dev/admin/auth \
  -H "Content-Type: application/json" \
  -d '{"password":"wrong"}'
```

### Check Cloudflare Pages Build
```bash
# Check if VITE_PROXY_URL is being used during build
# In Cloudflare Pages build logs, look for:
# "VITE_PROXY_URL=https://afia-worker.savola.workers.dev"
```

## Most Likely Issue

Based on the "Network error" message, the most likely issue is:

**The frontend doesn't know where the worker is deployed.**

### Fix:
1. Go to Cloudflare Pages → `afia-app` → Settings → Environment variables
2. Add `VITE_PROXY_URL` = `https://afia-worker.savola.workers.dev` for **Production**
3. Redeploy the Pages site (Settings → Deployments → Retry deployment)

## Verification Checklist

- [ ] Worker is deployed and accessible at `https://afia-worker.savola.workers.dev`
- [ ] `ADMIN_PASSWORD` secret is set in Worker settings (encrypted)
- [ ] `VITE_PROXY_URL` is set in Pages environment variables
- [ ] Pages site has been redeployed after setting `VITE_PROXY_URL`
- [ ] Browser console shows no CORS errors
- [ ] Test auth endpoint returns 401 for wrong password (not network error)

## Testing the Fix

After applying the fix:

1. Open `https://afia-app.pages.dev`
2. Navigate to Admin panel
3. Enter the password you set in Cloudflare dashboard
4. Should successfully authenticate and show admin dashboard

## Additional Notes

- The password in `.dev.vars` (`1234`) is only for local development
- Production uses the encrypted secret from Cloudflare dashboard
- If you change the secret, no redeployment is needed - it takes effect immediately
- Session tokens expire after 30 minutes (see [`worker/src/adminAuth.ts`](worker/src/adminAuth.ts:4))
