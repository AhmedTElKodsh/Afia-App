# Cloudflare Account Login Fix

## Target Account

This project is configured for:
- **Account ID**: `a34f53a07c2ef6f31c29f1dc20b71b23`
- **Subdomain**: `savola.workers.dev`

## Solution: Switch to Correct Account

### Option 1: Login to the Correct Account (Recommended)

If you have access to account `a34f53a07c2ef6f31c29f1dc20b71b23`:

```bash
# Logout from current account
npx wrangler logout

# Login again - this will open a browser
npx wrangler login

# In the browser, make sure you select the account with ID: a34f53a07c2ef6f31c29f1dc20b71b23
# This should be the account with subdomain "savola.workers.dev"

# Verify you're logged into the correct account
npx wrangler whoami
```

Look for account ID `a34f53a07c2ef6f31c29f1dc20b71b23` in the output.

### Option 2: Use API Token for Specific Account

If you can't switch accounts via OAuth, use the API token directly:

```bash
# Linux / macOS
export CLOUDFLARE_API_TOKEN="<YOUR_CLOUDFLARE_API_TOKEN>"
export CLOUDFLARE_ACCOUNT_ID="a34f53a07c2ef6f31c29f1dc20b71b23"

# Windows PowerShell
$env:CLOUDFLARE_API_TOKEN="<YOUR_CLOUDFLARE_API_TOKEN>"
$env:CLOUDFLARE_ACCOUNT_ID="a34f53a07c2ef6f31c29f1dc20b71b23"

# Deploy with environment variables
npx wrangler deploy --config worker/wrangler.toml --env stage1
```

## After Logging In Correctly

Once you're logged into the correct account, deploy:

```bash
# Deploy Worker
npx wrangler deploy --config worker/wrangler.toml --env stage1

# Deploy Pages
npm run build
npx wrangler pages deploy dist --project-name=afia-app
```

## Verify Deployment

```bash
# Test Worker
curl https://afia-worker.savola.workers.dev/health

# Should return:
# {"status":"ok","requestId":"..."}
```

## GitHub Actions Deployment

For GitHub Actions to work, you need to set these secrets with credentials for account `a34f53a07c2ef6f31c29f1dc20b71b23`:

1. Go to: https://github.com/AhmedTElKodsh/Afia-App/settings/secrets/actions

2. Add/Update:
   - `CLOUDFLARE_API_TOKEN` - API token for account a34f53a07c2ef6f31c29f1dc20b71b23
   - `CLOUDFLARE_ACCOUNT_ID` - `a34f53a07c2ef6f31c29f1dc20b71b23`

## Which Account Should You Use?

Based on your original message, you said:
> "I have 2 cloudflare accounts which cause confusion, I want to modify all the cloudflare related code to focus on the account id =a34f53a07c2ef6f31c29f1dc20b71b23"

So you should use **Option 1** or **Option 2** above to switch to account `a34f53a07c2ef6f31c29f1dc20b71b23`.

## Summary

✅ **Code Changes**: All done - pushed to GitHub
❌ **Local Deployment**: Blocked - need to login to correct account
⏳ **GitHub Actions**: Will work once secrets are updated

**Next Step**: Choose Option 1 or 2 above to login to the correct Cloudflare account.
