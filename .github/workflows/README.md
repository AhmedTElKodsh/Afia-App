# GitHub Actions CI/CD Pipeline Setup

## Required Secrets

To enable automatic deployments, you need to configure these secrets in your GitHub repository for the account `a34f53a07c2ef6f31c29f1dc20b71b23` (savola.workers.dev).

### 1. CLOUDFLARE_ACCOUNT_ID
- **Value**: `a34f53a07c2ef6f31c29f1dc20b71b23`
- **Description**: Your Cloudflare account ID

### 2. CLOUDFLARE_API_TOKEN
- **Description**: API token with Workers and Pages deployment permissions
- **How to create**:
  1. Go to https://dash.cloudflare.com/profile/api-tokens
  2. Click "Create Token"
  3. Use "Edit Cloudflare Workers" template or create custom token with:
     - Account → Cloudflare Pages → Edit
     - Account → Workers Scripts → Edit
     - Account → Account Settings → Read
  4. Copy the token and add it to GitHub secrets

### 3. CLOUDFLARE_RATE_LIMIT_KV_ID (required for Worker deploy)
- **Description**: Cloudflare KV namespace id used for `RATE_LIMIT_KV` in `worker/wrangler.toml`
- **How to create** (logged in as the target account):
  ```bash
  cd worker && npx wrangler kv namespace create RATE_LIMIT_KV
  ```
  Copy the `id` from the output and add it as this secret.

### 4. VITE_ADMIN_PASSWORD
- **Value**: `1234` (or your preferred password)
- **Description**: Admin password for the application

## Deployment Pipeline

The deployment happens automatically on `push` to `master` or `local-model` branches, **ONLY** if the following pass:
1. **Unit Tests** (Frontend & Worker)
2. **Integration Tests** (Real LLM API calls with mock worker)
3. **E2E Tests** (Playwright scans)

## Troubleshooting

### Error: "Authentication error"
- Ensure `CLOUDFLARE_API_TOKEN` matches the account `a34f53a07c2ef6f31c29f1dc20b71b23`.
- Verify the token has permissions for both Workers and Pages.
