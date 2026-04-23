# 🚀 Quick Deploy Setup - 5 Minutes

## What You Need

You need to add 5 secrets to GitHub. Here's the fastest way:

### Option 1: Using GitHub CLI (Recommended - 2 minutes)

```bash
# Install GitHub CLI if you haven't: https://cli.github.com/

# Login to GitHub
gh auth login

# Set the secrets (run these commands one by one)
echo "531c665068721c28fb05e5bb83aade0c" | gh secret set CLOUDFLARE_ACCOUNT_ID
echo "9dc0bcc958de473199e5ded5701b932a" | gh secret set CLOUDFLARE_RATE_LIMIT_KV_ID
echo "d6d688f5cfd04d73a42c7c979c1f1791" | gh secret set CLOUDFLARE_RATE_LIMIT_KV_PREVIEW_ID

# For these two, you'll need to provide the values:
gh secret set CLOUDFLARE_API_TOKEN  # Paste your token when prompted
gh secret set VITE_ADMIN_PASSWORD   # Enter your admin password when prompted
```

### Option 2: Using GitHub Web UI (5 minutes)

1. Go to: https://github.com/AhmedTElKodsh/Afia-App/settings/secrets/actions/new

2. Add each secret:

| Name | Value | Where to get it |
|------|-------|-----------------|
| `CLOUDFLARE_ACCOUNT_ID` | `531c665068721c28fb05e5bb83aade0c` | ✅ Copy this |
| `CLOUDFLARE_RATE_LIMIT_KV_ID` | `9dc0bcc958de473199e5ded5701b932a` | ✅ Copy this |
| `CLOUDFLARE_RATE_LIMIT_KV_PREVIEW_ID` | `d6d688f5cfd04d73a42c7c979c1f1791` | ✅ Copy this |
| `CLOUDFLARE_API_TOKEN` | *Create new* | 👇 See below |
| `VITE_ADMIN_PASSWORD` | *Your choice* | Any secure password |

### Creating CLOUDFLARE_API_TOKEN

1. Go to: https://dash.cloudflare.com/profile/api-tokens
2. Click "Create Token" → "Create Custom Token"
3. Set permissions:
   - **Cloudflare Pages**: Edit
   - **Workers Scripts**: Edit
   - **Workers KV Storage**: Edit
   - **Account Settings**: Read
4. Click "Continue to summary" → "Create Token"
5. Copy the token (you'll only see it once!)
6. Add it as `CLOUDFLARE_API_TOKEN` in GitHub

## Deploy Now!

Once secrets are added:

```bash
# Trigger deployment with an empty commit
git commit --allow-empty -m "chore: trigger deployment"
git push origin master
```

Or go to: https://github.com/AhmedTElKodsh/Afia-App/actions
And re-run the failed workflow.

## Expected Result

✅ Worker: https://afia-worker.savola.workers.dev
✅ Pages: https://afia-app.pages.dev

## Troubleshooting

**Still failing?** Check:
- All 5 secrets are set (no typos in names)
- API token has all 4 permissions
- Token is for account: Ahmedtelkodsh@gmail.com's Account

**Need more help?** See `GITHUB-SECRETS-SETUP.md` for detailed instructions.
