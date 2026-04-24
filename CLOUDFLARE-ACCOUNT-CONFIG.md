# Cloudflare Account Configuration

This document contains the official Cloudflare account details for the AFIA project.

## Account Details

- **Account ID**: `a34f53a07c2ef6f31c29f1dc20b71b23`
- **Subdomain**: `savola.workers.dev`
- **API Token**: `<stored in GitHub Secrets>`

## Worker URLs

### Production (Stage 1)
- **Worker Name**: `afia-worker`
- **URL**: `https://afia-worker.savola.workers.dev`
- **Purpose**: LLM API only (production)

### Stage 2 (Testing)
- **Worker Name**: `afia-worker-stage2`
- **URL**: `https://afia-worker-stage2.savola.workers.dev`
- **Purpose**: Local Model + LLM fallback

### Stage 3 (Future)
- **Worker Name**: `afia-worker-stage3`
- **URL**: `https://afia-worker-stage3.savola.workers.dev`
- **Purpose**: Local Model only

## Pages Deployment

- **Project Name**: `afia-app`
- **Production URL**: `https://afia-app.pages.dev`

## GitHub Secrets Required

Add these secrets to your GitHub repository (Settings → Secrets and variables → Actions):

1. **CLOUDFLARE_API_TOKEN**
   - Value: `<your-cloudflare-api-token>` (Get from https://dash.cloudflare.com/profile/api-tokens)
   - Purpose: Authenticate GitHub Actions to deploy to Cloudflare

2. **CLOUDFLARE_ACCOUNT_ID**
   - Value: `a34f53a07c2ef6f31c29f1dc20b71b23`
   - Purpose: Specify which Cloudflare account to deploy to

3. **VITE_ADMIN_PASSWORD**
   - Value: (Your admin password)
   - Purpose: Admin authentication

4. **CLOUDFLARE_RATE_LIMIT_KV_ID**
   - Value: `9dc0bcc958de473199e5ded5701b932a`
   - Purpose: KV namespace for rate limiting

## Environment Variables

### For Cloudflare Pages

Set these in Cloudflare Pages dashboard (Settings → Environment Variables):

- **VITE_API_URL**: `https://afia-worker.savola.workers.dev`
- **VITE_PROXY_URL**: `https://afia-worker.savola.workers.dev`

### For Local Development (.env)

```bash
VITE_API_URL=https://afia-worker.savola.workers.dev
VITE_PROXY_URL=https://afia-worker.savola.workers.dev
```

## Deployment Commands

### Deploy Worker (Production)
```bash
cd worker
npx wrangler deploy --env stage1
```

### Deploy Worker (Stage 2)
```bash
cd worker
npx wrangler deploy --env stage2
```

### Deploy Pages
```bash
npm run build
npx wrangler pages deploy dist --project-name=afia-app
```

## Verification

### Test Worker Health
```bash
curl https://afia-worker.savola.workers.dev/health
```

Expected response:
```json
{"status":"ok","requestId":"..."}
```

### Test Pages
Visit: https://afia-app.pages.dev

## Notes

- All configurations in this repository now use the `savola.workers.dev` subdomain
- The account ID `a34f53a07c2ef6f31c29f1dc20b71b23` is set in `worker/wrangler.toml`
- CSP headers in `public/_headers` allow connections to `https://afia-worker.savola.workers.dev`
