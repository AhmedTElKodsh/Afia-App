# Deployment Verification Steps

## 1. Check Browser Cache
- Open https://afia-app.pages.dev/ in **Incognito/Private mode**
- Or hard refresh: `Ctrl + Shift + R` (Windows) / `Cmd + Shift + R` (Mac)

## 2. Verify Build Environment Variables
The GitHub Actions workflow sets these at build time:
```yaml
VITE_PROXY_URL: https://afia-worker.savola.workers.dev
VITE_ADMIN_PASSWORD: ${{ secrets.VITE_ADMIN_PASSWORD }}
VITE_STAGE: stage1
```

## 3. Check GitHub Secrets
Go to: https://github.com/AhmedTElKodsh/Afia-App/settings/secrets/actions

Verify these secrets exist:
- ✅ `VITE_ADMIN_PASSWORD` (must match the password in Cloudflare Worker)
- ✅ `CLOUDFLARE_API_TOKEN`
- ✅ `CLOUDFLARE_ACCOUNT_ID`

## 4. Test Admin Login
1. Open: https://afia-app.pages.dev/
2. Navigate to Admin section
3. Enter the password (same as `ADMIN_PASSWORD` in Worker settings)
4. Should authenticate successfully

## 5. Debug Network Error
If still getting "Network error":

### Check Browser DevTools:
1. Press `F12` to open DevTools
2. Go to **Network** tab
3. Try admin login
4. Look for request to `/admin/auth`
5. Check the **Request URL** - should be:
   ```
   https://afia-worker.savola.workers.dev/admin/auth
   ```
   NOT:
   ```
   http://localhost:8787/admin/auth
   ```

### If URL is still localhost:
- Clear all browser cache (not just hard refresh)
- Or wait 5-10 minutes for CDN cache to expire

## 6. Verify Worker is Accessible
Test the worker directly:
```bash
curl https://afia-worker.savola.workers.dev/health
```

Should return:
```json
{"status":"ok","version":"1.0.0"}
```

## Current Status
- ✅ Deployment environment: Production (fixed)
- ✅ GitHub Actions workflow: Updated
- ✅ VITE_PROXY_URL: Set in workflow
- ⏳ Browser cache: Needs clearing
- ❓ VITE_ADMIN_PASSWORD secret: Needs verification
