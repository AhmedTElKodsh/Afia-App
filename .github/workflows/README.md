# GitHub Actions Deployment Setup

## Required Secrets

To enable automatic deployments, you need to configure these secrets in your GitHub repository:

### 1. CLOUDFLARE_ACCOUNT_ID
- **Value**: `a34f53a07c2ef6f31c29f1dc20b71b23`
- **Description**: Your Cloudflare account ID

### 2. CLOUDFLARE_API_TOKEN
- **Description**: API token with Pages deployment permissions
- **How to create**:
  1. Go to https://dash.cloudflare.com/profile/api-tokens
  2. Click "Create Token"
  3. Use "Edit Cloudflare Workers" template or create custom token with:
     - Account → Cloudflare Pages → Edit
     - Account → Account Settings → Read
  4. Copy the token and add it to GitHub secrets

### 3. CLOUDFLARE_RATE_LIMIT_KV_ID (required for Worker deploy)
- **Description**: Cloudflare KV namespace id used for `RATE_LIMIT_KV` in `worker/wrangler.toml`
- **Why**: The ids committed in the repo belong to a specific Cloudflare account. Deploying to a different account fails with `KV namespace '…' not found` (code 10041).
- **How to create** (logged in as the target account, same as `CLOUDFLARE_ACCOUNT_ID`):
  ```bash
  cd worker && npx wrangler kv namespace create RATE_LIMIT_KV
  ```
  Copy the `id` from the JSON output and add it as this secret.
- **Optional**: `CLOUDFLARE_RATE_LIMIT_KV_PREVIEW_ID` — second namespace for Wrangler preview; if omitted, the production id is used for both bindings.

### 4. VITE_ADMIN_PASSWORD (Optional)
- **Description**: Admin password for the application
- **Set this if your app requires admin authentication**

## How to Add Secrets

1. Go to your GitHub repository
2. Navigate to: `Settings` → `Secrets and variables` → `Actions`
3. Click "New repository secret"
4. Add each secret with its name and value
5. Click "Add secret"

## Deployment Workflow

The deployment happens automatically when:
- CI tests pass on the `master` or `local-model` branch
- The workflow deploys:
  - **Worker**: `afia-worker` (stage1 for master, stage2 for local-model)
  - **Pages**: `afia-app` at https://afia-app.pages.dev

## Manual Deployment

To deploy manually from your local machine:

```bash
# Test your setup
bash scripts/test-deployment.sh

# Deploy worker (patch KV ids for your account unless wrangler.toml already matches)
export CLOUDFLARE_RATE_LIMIT_KV_ID="<your-32-char-kv-id>"
bash scripts/apply-wrangler-kv-ids.sh
cd worker && npx wrangler deploy --env stage1

# Deploy pages
npm run build
npx wrangler pages deploy dist --project-name=afia-app --branch=master
```

## Troubleshooting

### Error: "Project not found"
- Verify `CLOUDFLARE_ACCOUNT_ID` is set correctly in GitHub secrets
- Ensure the account ID matches: `a34f53a07c2ef6f31c29f1dc20b71b23`

### Error: "Authentication error"
- Verify `CLOUDFLARE_API_TOKEN` is set and has the correct permissions
- Token needs: Cloudflare Pages → Edit permission

### Error: "Account ID is masked (***)"
- The secret is not accessible to the workflow
- Check that secrets are set at the repository level, not environment level
- Ensure the workflow has permission to access secrets

### Error: KV namespace '…' not found (code 10041)
- Your Cloudflare account does not have the KV id baked into `worker/wrangler.toml` (expected when using a new account).
- Add GitHub secret `CLOUDFLARE_RATE_LIMIT_KV_ID` with a namespace id created in **that** account (see section 3 above), then re-run the deploy workflow.
