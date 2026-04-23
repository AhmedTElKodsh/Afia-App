# GitHub Secrets Setup Guide

## Required Secrets for Deployment

To enable automatic deployments to Cloudflare, you need to configure these secrets in your GitHub repository.

### 🔐 Required Secrets

| Secret Name | Value | Description |
|------------|-------|-------------|
| `CLOUDFLARE_ACCOUNT_ID` | `531c665068721c28fb05e5bb83aade0c` | Your Cloudflare account ID |
| `CLOUDFLARE_API_TOKEN` | *Create new token* | API token with Pages & Workers permissions |
| `CLOUDFLARE_RATE_LIMIT_KV_ID` | `9dc0bcc958de473199e5ded5701b932a` | Production KV namespace ID |
| `CLOUDFLARE_RATE_LIMIT_KV_PREVIEW_ID` | `d6d688f5cfd04d73a42c7c979c1f1791` | Preview KV namespace ID |
| `VITE_ADMIN_PASSWORD` | *Your admin password* | Admin password for the application |

### 📝 Step-by-Step Setup

#### 1. Create Cloudflare API Token

1. Go to: https://dash.cloudflare.com/profile/api-tokens
2. Click **"Create Token"**
3. Click **"Create Custom Token"**
4. Configure the token:
   - **Token name**: `GitHub Actions - Afia App`
   - **Permissions**:
     - Account → Cloudflare Pages → Edit
     - Account → Workers Scripts → Edit
     - Account → Workers KV Storage → Edit
     - Account → Account Settings → Read
   - **Account Resources**: Include → Ahmedtelkodsh@gmail.com's Account
   - **Zone Resources**: All zones (or specific zones if preferred)
5. Click **"Continue to summary"**
6. Click **"Create Token"**
7. **Copy the token** (you'll only see it once!)

#### 2. Add Secrets to GitHub

1. Go to your repository: https://github.com/AhmedTElKodsh/Afia-App
2. Click **Settings** → **Secrets and variables** → **Actions**
3. Click **"New repository secret"** for each secret below:

##### Add CLOUDFLARE_ACCOUNT_ID
- Name: `CLOUDFLARE_ACCOUNT_ID`
- Value: `531c665068721c28fb05e5bb83aade0c`
- Click **"Add secret"**

##### Add CLOUDFLARE_API_TOKEN
- Name: `CLOUDFLARE_API_TOKEN`
- Value: *Paste the token you created in step 1*
- Click **"Add secret"**

##### Add CLOUDFLARE_RATE_LIMIT_KV_ID
- Name: `CLOUDFLARE_RATE_LIMIT_KV_ID`
- Value: `9dc0bcc958de473199e5ded5701b932a`
- Click **"Add secret"**

##### Add CLOUDFLARE_RATE_LIMIT_KV_PREVIEW_ID
- Name: `CLOUDFLARE_RATE_LIMIT_KV_PREVIEW_ID`
- Value: `d6d688f5cfd04d73a42c7c979c1f1791`
- Click **"Add secret"**

##### Add VITE_ADMIN_PASSWORD
- Name: `VITE_ADMIN_PASSWORD`
- Value: *Your desired admin password*
- Click **"Add secret"**

#### 3. Verify Secrets Are Set

After adding all secrets, you should see them listed (values will be hidden):
- ✅ CLOUDFLARE_ACCOUNT_ID
- ✅ CLOUDFLARE_API_TOKEN
- ✅ CLOUDFLARE_RATE_LIMIT_KV_ID
- ✅ CLOUDFLARE_RATE_LIMIT_KV_PREVIEW_ID
- ✅ VITE_ADMIN_PASSWORD

### 🚀 Trigger Deployment

Once all secrets are configured:

#### Option 1: Re-run Failed Workflow
1. Go to **Actions** tab
2. Find the failed "Deploy On CI Success" workflow
3. Click **"Re-run all jobs"**

#### Option 2: Push a New Commit
```bash
# Make a small change and push
git commit --allow-empty -m "chore: trigger deployment with configured secrets"
git push origin master
```

### 🎯 Expected Result

After the workflow runs successfully, you should see:

```
✅ Worker deployed to: https://afia-worker.savola.workers.dev
✅ Pages deployed to: https://afia-app.pages.dev
```

### 🔍 Troubleshooting

#### Error: "Authentication error"
- Verify `CLOUDFLARE_API_TOKEN` has all required permissions
- Check token hasn't expired
- Ensure token is for the correct account

#### Error: "Project not found"
- Verify `CLOUDFLARE_ACCOUNT_ID` is exactly: `531c665068721c28fb05e5bb83aade0c`
- Check for extra spaces or characters

#### Error: "KV namespace not found"
- Verify KV namespace IDs are correct
- Check that KV namespaces exist in your Cloudflare account

#### Deployment succeeds but site doesn't work
- Check that `VITE_ADMIN_PASSWORD` is set correctly
- Verify worker secrets are synced (ADMIN_PASSWORD)
- Check browser console for errors

### 📚 Additional Resources

- [Cloudflare API Tokens Documentation](https://developers.cloudflare.com/fundamentals/api/get-started/create-token/)
- [GitHub Actions Secrets Documentation](https://docs.github.com/en/actions/security-guides/encrypted-secrets)
- [Wrangler CLI Documentation](https://developers.cloudflare.com/workers/wrangler/)

### 🆘 Need Help?

If you continue to experience issues:
1. Check the GitHub Actions logs for detailed error messages
2. Verify all secrets are set correctly (no typos)
3. Ensure your Cloudflare account has access to Pages and Workers
4. Check that KV namespaces exist in your Cloudflare dashboard
