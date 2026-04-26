# Afia App - 3-Stage Deployment Strategy

## Overview

This document outlines the deployment strategy for the Afia Oil Tracker application across three development stages.

## Stage Definitions

### Stage 1: LLM API Only (Current Production)
- **Branch**: `master`
- **Status**: ✅ Active Production
- **Model**: Gemini/Groq API only
- **Purpose**: Stable production release with proven cloud-based inference
- **Deployment**:
  - Worker: `afia-worker.savola.workers.dev`
  - Pages: `afia-app.pages.dev`

### Stage 2: Local Model + LLM Fallback (Testing)
- **Branch**: `local-model`
- **Status**: ⏳ **NOT YET IMPLEMENTED** (Planned)
- **Model**: ONNX local model (primary) + LLM API (fallback)
- **Purpose**: Test local model maturity while maintaining reliability
- **Deployment**:
  - Worker: `afia-worker-stage2.savola.workers.dev`
  - Pages: `afia-app-stage2.pages.dev`
- **Note**: Workflow is configured but local model implementation is pending

### Stage 3: Local Model Only (Future Production)
- **Branch**: TBD (will be merged to `master` when ready)
- **Status**: 🔮 Future
- **Model**: ONNX local model only
- **Purpose**: Full launch with cost-effective local inference
- **Deployment**: Will replace Stage 1 when local model is mature

---

## Branch Strategy

```
master (Stage 1)
  ├── Production deployment
  └── LLM API only

local-model (Stage 2)
  ├── Testing deployment
  ├── Local model + LLM fallback
  └── Merge to master when ready for Stage 3
```

---

## GitHub Actions Workflows

### 1. `deploy-stage1.yml` (master branch)
- **Triggers**: Push/PR to `master`
- **Tests**: Unit + E2E with LLM API
- **Deploys**: 
  - Worker to production environment
  - Pages to `afia-app.pages.dev`
- **Environment Variables**:
  - `VITE_STAGE=stage1`
  - `VITE_ENABLE_LOCAL_MODEL=false`

### 2. `deploy-stage2.yml` (local-model branch)
- **Triggers**: Push/PR to `local-model`
- **Tests**: Unit + E2E with local model + fallback
- **Deploys**:
  - Worker to stage2 environment
  - Pages to `afia-app-stage2.pages.dev`
- **Environment Variables**:
  - `VITE_STAGE=stage2`
  - `VITE_ENABLE_LOCAL_MODEL=true`

---

## Wrangler Configuration

The `worker/wrangler.toml` now includes three environments:

```toml
# Stage 1: Production (LLM API only)
[env.stage1]
name = "afia-worker"
vars = { STAGE = "stage1", ENABLE_LOCAL_MODEL = "false" }

# Stage 2: Testing (Local Model + LLM fallback)
[env.stage2]
name = "afia-worker-stage2"
vars = { STAGE = "stage2", ENABLE_LOCAL_MODEL = "true", LLM_FALLBACK_ENABLED = "true" }

# Stage 3: Future (Local Model only)
[env.stage3]
name = "afia-worker-stage3"
vars = { STAGE = "stage3", ENABLE_LOCAL_MODEL = "true", LLM_FALLBACK_ENABLED = "false" }
```

---

## Testing Strategy

### Stage 1 Tests (master)
- ✅ Unit tests with LLM API mocks
- ✅ E2E tests using Gemini/Groq APIs
- ✅ Visual regression tests
- ❌ Local model tests (not applicable)

### Stage 2 Tests (local-model)
- ✅ Unit tests with local model + LLM mocks
- ✅ E2E tests with local model primary
- ✅ Fallback tests (local model failure → LLM)
- ✅ Performance tests (local vs API latency)
- ✅ Accuracy comparison tests

---

## Deployment Commands

### Local Development

```bash
# Stage 1 (LLM API only)
npm run dev

# Stage 2 (Local Model + fallback)
VITE_ENABLE_LOCAL_MODEL=true npm run dev
```

### Manual Deployment

```bash
# Deploy Stage 1 (Production)
cd worker && npx wrangler deploy --env stage1

# Deploy Stage 2 (Testing)
cd worker && npx wrangler deploy --env stage2

# Deploy Stage 3 (Future)
cd worker && npx wrangler deploy --env stage3
```

---

## Migration Path

### Current State (Stage 1)
1. ✅ Production on `master` branch
2. ✅ Using LLM APIs (Gemini/Groq)
3. ✅ Stable and tested

### Transition to Stage 2
1. Create `local-model` branch from `master`
2. Implement local ONNX model inference
3. Add fallback logic to LLM APIs
4. Deploy to stage2 environment
5. Monitor accuracy and performance
6. Iterate until local model matches LLM quality

### Transition to Stage 3
1. When local model is mature:
   - Merge `local-model` → `master`
   - Update Stage 1 to use local model only
   - Deprecate Stage 2 environment
2. Remove LLM fallback code
3. Full production launch with local model

---

## Environment Variables

### Required Secrets (GitHub Actions)

```yaml
CLOUDFLARE_API_TOKEN: Cloudflare API token
CLOUDFLARE_ACCOUNT_ID: Cloudflare account ID
CLOUDFLARE_WORKER_URL: Stage 1 worker URL
CLOUDFLARE_WORKER_URL_STAGE2: Stage 2 worker URL
VITE_ADMIN_PASSWORD: Admin panel password
```

### Wrangler Secrets (per environment)

```bash
# Stage 1
wrangler secret put GEMINI_API_KEY --env stage1
wrangler secret put GEMINI_API_KEY2 --env stage1
wrangler secret put GEMINI_API_KEY3 --env stage1
wrangler secret put GROQ_API_KEY --env stage1

# Stage 2 (same keys for fallback)
wrangler secret put GEMINI_API_KEY --env stage2
wrangler secret put GEMINI_API_KEY2 --env stage2
wrangler secret put GEMINI_API_KEY3 --env stage2
wrangler secret put GROQ_API_KEY --env stage2

# Stage 3 (no API keys needed)
# Local model only - no secrets required
```

---

## Monitoring & Metrics

### Stage 1 Metrics
- API call count
- API latency
- API costs
- Error rates

### Stage 2 Metrics
- Local model inference count
- Local model latency
- Fallback trigger rate
- Accuracy comparison (local vs LLM)
- Cost savings

### Stage 3 Metrics
- Local model inference count
- Local model latency
- Error rates
- Total cost savings vs Stage 1

---

## Rollback Strategy

### If Stage 2 has issues:
1. Keep Stage 1 (master) running in production
2. Fix issues in `local-model` branch
3. Redeploy Stage 2 when ready

### If Stage 3 has issues after migration:
1. Revert `master` to previous Stage 1 commit
2. Redeploy Stage 1 configuration
3. Fix local model issues
4. Re-attempt migration

---

## Next Steps

1. ✅ Set up GitHub Actions workflows (DONE)
2. ✅ Configure wrangler environments (DONE)
3. ✅ Add secret validation to workflows (DONE)
4. ⏳ **Set VITE_ADMIN_PASSWORD secret in GitHub** (REQUIRED)
5. ⏳ Create `local-model` branch
6. ⏳ Implement local model inference
7. ⏳ Add fallback logic
8. ⏳ Deploy to Stage 2 environment
9. ⏳ Monitor and iterate
10. ⏳ Plan Stage 3 migration

---

## Setting Up Secrets

### GitHub Secrets (Required)

Before deploying, you must set these secrets in your GitHub repository:

**Go to:** `Settings > Secrets and variables > Actions > New repository secret`

**Required Secrets:**
```
CLOUDFLARE_API_TOKEN       # Get from Cloudflare dashboard
CLOUDFLARE_ACCOUNT_ID      # Get from Cloudflare dashboard
CLOUDFLARE_RATE_LIMIT_KV_ID  # KV namespace id in THIS account (see .github/workflows/README.md)
VITE_ADMIN_PASSWORD        # Choose a strong password (NOT '1234'!)
```

**Optional Secrets (have defaults):**
```
CLOUDFLARE_RATE_LIMIT_KV_PREVIEW_ID  # Optional second KV id for wrangler preview
CLOUDFLARE_WORKER_URL      # Defaults to: https://afia-worker.savola.workers.dev
CLOUDFLARE_WORKER_URL_STAGE2  # Defaults to: https://afia-worker-stage2.savola.workers.dev
```

### Wrangler Secrets (Per Environment)

Set these secrets for each Cloudflare Worker environment:

**Stage 1 (Production):**
```bash
cd worker

# Set Gemini API keys (3 keys for rotation/fallback)
wrangler secret put GEMINI_API_KEY --env stage1
wrangler secret put GEMINI_API_KEY2 --env stage1
wrangler secret put GEMINI_API_KEY3 --env stage1

# Set Groq API key (fallback)
wrangler secret put GROQ_API_KEY --env stage1

# Set Supabase credentials
wrangler secret put SUPABASE_SERVICE_KEY --env stage1

# Verify secrets are set
wrangler secret list --env stage1
```

**Stage 2 (Testing):**
```bash
# Same keys for Stage 2 (used for fallback)
wrangler secret put GEMINI_API_KEY --env stage2
wrangler secret put GEMINI_API_KEY2 --env stage2
wrangler secret put GEMINI_API_KEY3 --env stage2
wrangler secret put GROQ_API_KEY --env stage2
wrangler secret put SUPABASE_SERVICE_KEY --env stage2

# Verify
wrangler secret list --env stage2
```

**Stage 3 (Future):**
```bash
# Only Supabase needed (no LLM APIs)
wrangler secret put SUPABASE_SERVICE_KEY --env stage3
```

### Rotating Secrets

To rotate a secret without downtime:

```bash
# 1. Add new key as KEY2
wrangler secret put GEMINI_API_KEY2 --env stage1

# 2. Test that fallback works
# 3. Update primary key
wrangler secret put GEMINI_API_KEY --env stage1

# 4. Remove old KEY2 if no longer needed
wrangler secret delete GEMINI_API_KEY2 --env stage1
```

---

## Security Best Practices

### ✅ DO
- Use strong, unique passwords for admin access
- Rotate API keys regularly (every 90 days)
- Set all secrets via GitHub Secrets / Wrangler CLI
- Use different keys for Stage 1 and Stage 2 if possible
- Monitor API usage for anomalies

### ❌ DON'T
- Never commit `.env` files to git
- Never use default passwords like '1234'
- Never hardcode secrets in code or workflows
- Never share secrets in chat/email
- Never reuse passwords across environments

---

## Questions?

Contact the development team or refer to:
- GitHub Actions: `.github/workflows/`
- Wrangler Config: `worker/wrangler.toml`
- Test Fixes: `CI_TEST_FIXES.md`
