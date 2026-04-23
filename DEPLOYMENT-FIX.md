# 🔧 Cloudflare Deployment Fix

## Problem
Your GitHub Actions deployment is failing with:
```
✘ [ERROR] A request to the Cloudflare API (/accounts/***/pages/projects/afia-app) failed.
Project not found. The specified project name does not match any of your existing projects.
```

## Root Cause
The `CLOUDFLARE_ACCOUNT_ID` GitHub secret is either missing or not accessible to the workflow, causing the account ID to be masked as `***`.

## ✅ Solution

### Step 1: Add GitHub Secrets

1. Go to your GitHub repository: https://github.com/YOUR_USERNAME/YOUR_REPO
2. Navigate to: **Settings** → **Secrets and variables** → **Actions**
3. Add these secrets:

#### CLOUDFLARE_ACCOUNT_ID
```
531c665068721c28fb05e5bb83aade0c
```

#### CLOUDFLARE_API_TOKEN
Create a new API token:
1. Visit: https://dash.cloudflare.com/profile/api-tokens
2. Click **"Create Token"**
3. Use **"Edit Cloudflare Workers"** template OR create custom with:
   - Permission: **Account → Cloudflare Pages → Edit**
   - Permission: **Account → Account Settings → Read**
4. Click **"Continue to summary"** → **"Create Token"**
5. Copy the token (you'll only see it once!)
6. Add it to GitHub secrets as `CLOUDFLARE_API_TOKEN`

### Step 2: Verify Locally (Optional)

Test your deployment setup locally:

```bash
# Run the test script
bash scripts/test-deployment.sh

# If successful, try a manual deployment
npm run build
npx wrangler pages deploy dist --project-name=afia-app --branch=master
```

### Step 3: Re-run the Failed Workflow

1. Go to your GitHub repository
2. Click **"Actions"** tab
3. Find the failed workflow run
4. Click **"Re-run all jobs"**

## 📊 Current Status

✅ **Cloudflare Pages project exists**: `afia-app`
✅ **Account ID confirmed**: `531c665068721c28fb05e5bb83aade0c`
✅ **Project URL**: https://afia-app.pages.dev
✅ **Production branch**: `master`
❌ **GitHub secrets**: Need to be configured

## 🎯 Expected Result

After adding the secrets and re-running the workflow, you should see:
```
✅ Worker deployed: https://afia-worker.savola.workers.dev
✅ Pages deployed: https://afia-app.pages.dev
```

## 📝 Additional Notes

- The project was created on: April 23, 2026
- No deployments have been made yet (this will be the first)
- The workflow deploys both the Worker and Pages app
- Master branch → stage1 environment
- local-model branch → stage2 environment

## 🆘 Still Having Issues?

If you continue to see errors after adding the secrets:

1. **Verify token permissions**: Make sure the API token has "Edit" permission for Cloudflare Pages
2. **Check token expiry**: Ensure the token hasn't expired
3. **Verify account access**: Confirm you have access to account `531c665068721c28fb05e5bb83aade0c`
4. **Check workflow logs**: Look for more specific error messages in the GitHub Actions logs

For more details, see: `.github/workflows/README.md`
