# GitHub Actions Workflows

This directory contains CI/CD workflows for the Afia Oil Tracker application's 3-stage deployment strategy.

## Workflows

### Current Status: Manual Deployment Only

**All automatic workflows are disabled** (`.yml.disabled` extension) to prevent:
- ❌ Cloudflare endpoint overload during development
- ❌ GitHub Actions errors on incomplete features
- ❌ Wasted CI/CD minutes

**Deployment Strategy:** Deploy manually only when app is fully tested and functional.

See [../LOCAL-DEVELOPMENT-STRATEGY.md](../../_bmad-output/implementation-artifacts/LOCAL-DEVELOPMENT-STRATEGY.md) for complete strategy.

### Available Workflows (Disabled)

### 1. `deploy-stage1.yml.disabled` - Production (LLM API Only)
- **Branch**: `master`
- **Trigger**: Push or PR to `master`
- **Purpose**: Deploy production version using LLM APIs (Gemini/Groq)
- **Deployments**:
  - Worker: `afia-worker.savona.workers.dev`
  - Pages: `afia-app.pages.dev`

**Jobs**:
- `test`: Run unit tests and E2E tests with LLM API
- `deploy-worker-stage1`: Deploy worker to production
- `deploy-pages-stage1`: Deploy PWA to Cloudflare Pages

### 2. `deploy-stage2.yml.disabled` - Testing (Local Model + LLM Fallback)
- **Branch**: `local-model`
- **Trigger**: Push or PR to `local-model`
- **Purpose**: Test local ONNX model with LLM fallback
- **Deployments**:
  - Worker: `afia-worker-stage2.savona.workers.dev`
  - Pages: `afia-app-stage2.pages.dev`

**Jobs**:
- `test`: Run unit tests and E2E tests with local model + fallback
- `deploy-worker-stage2`: Deploy worker to stage2 environment
- `deploy-pages-stage2`: Deploy PWA to stage2 Pages project

## Environment Variables

### GitHub Secrets Required

**⚠️ SECURITY: All secrets must be set before deployment!**

```
CLOUDFLARE_API_TOKEN          # Cloudflare API token for deployments (REQUIRED)
CLOUDFLARE_ACCOUNT_ID         # Cloudflare account ID (REQUIRED)
VITE_ADMIN_PASSWORD           # Admin panel password (REQUIRED - use strong password!)
CLOUDFLARE_WORKER_URL         # Stage 1 worker URL (optional, has default)
CLOUDFLARE_WORKER_URL_STAGE2  # Stage 2 worker URL (optional, has default)
```

**How to set secrets:**
1. Go to: `Settings > Secrets and variables > Actions`
2. Click "New repository secret"
3. Add each secret with a strong value
4. Never use default passwords like '1234'

**Validation:**
- Workflows now validate that `VITE_ADMIN_PASSWORD` is set
- Build will fail if required secrets are missing
- This prevents deploying with weak default passwords

### Build-time Environment Variables

**Stage 1** (master):
```bash
VITE_STAGE=stage1
VITE_ENABLE_LOCAL_MODEL=false
```

**Stage 2** (local-model):
```bash
VITE_STAGE=stage2
VITE_ENABLE_LOCAL_MODEL=true
```

## Testing

Each workflow runs:
1. **Unit Tests**: `npm run test`
2. **E2E Tests**: `npx playwright test tests/e2e/`

Test results are uploaded as artifacts on failure for debugging.

## Deployment Flow

```
┌─────────────────────────────────────────────────────────────┐
│                     Push to master                          │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                    Run Tests (Stage 1)                      │
│  • Unit tests with LLM API mocks                            │
│  • E2E tests with Gemini/Groq                               │
└─────────────────────────────────────────────────────────────┘
                            │
                    ┌───────┴───────┐
                    │               │
                    ▼               ▼
        ┌──────────────────┐  ┌──────────────────┐
        │  Deploy Worker   │  │  Deploy Pages    │
        │   (Production)   │  │  (Production)    │
        └──────────────────┘  └──────────────────┘


┌─────────────────────────────────────────────────────────────┐
│                  Push to local-model                        │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                    Run Tests (Stage 2)                      │
│  • Unit tests with local model + LLM mocks                  │
│  • E2E tests with local model primary                       │
│  • Fallback tests (local → LLM)                             │
└─────────────────────────────────────────────────────────────┘
                            │
                    ┌───────┴───────┐
                    │               │
                    ▼               ▼
        ┌──────────────────┐  ┌──────────────────┐
        │  Deploy Worker   │  │  Deploy Pages    │
        │    (Stage 2)     │  │    (Stage 2)     │
        └──────────────────┘  └──────────────────┘
```

## Manual Deployment

### Using Deployment Script (Recommended)

```bash
# From project root
chmod +x scripts/deploy-manual.sh
./scripts/deploy-manual.sh
```

The script will:
1. Run all tests
2. Deploy Worker to production
3. Build and deploy Pages
4. Run smoke tests
5. Display production URLs

### Manual Commands

```bash
# 1. Run tests
npm test && npm run test:e2e

# 2. Deploy Worker
cd worker && npx wrangler deploy --env stage1

# 3. Build and deploy Pages
cd .. && npm run build
npx wrangler pages deploy dist --project-name=afia-app --branch=master
```

## Re-enabling GitHub Actions (Future)

When the app is stable and you want automated deployments:

### Option 1: Manual Trigger Only (Recommended)

```bash
# Use the template workflow
cp deploy-manual-trigger.yml.template deploy-manual-trigger.yml
```

This workflow:
- ✅ Only runs when manually triggered from GitHub UI
- ✅ Requires typing "deploy" to confirm
- ✅ Runs all tests before deploying
- ✅ Includes smoke tests after deployment
- ✅ No automatic deployments on push/PR

**How to trigger:**
1. Go to: `Actions > Deploy (Manual Trigger Only) > Run workflow`
2. Select environment (stage1 or stage2)
3. Type "deploy" to confirm
4. Click "Run workflow"

### Option 2: Tag-Based Deployment

Rename workflow and modify trigger:
```yaml
on:
  push:
    tags:
      - 'v*.*.*'  # Only deploy on version tags
```

Deploy by creating a tag:
```bash
git tag v1.0.0
git push origin v1.0.0
```

### Option 3: Protected Branch

Rename workflow and modify trigger:
```yaml
on:
  push:
    branches: [production]  # Separate production branch

jobs:
  deploy:
    environment:
      name: production
      url: https://afia-app.pages.dev
    # Requires manual approval in GitHub UI
```

## Manual Workflow Dispatch

Currently, workflows only trigger on push/PR. To add manual triggers, add this to any workflow:

```yaml
on:
  push:
    branches: [master]
  pull_request:
    branches: [master]
  workflow_dispatch:  # Add this for manual triggers
```

## Troubleshooting

### Tests Failing in CI

1. Check test results artifact in failed workflow run
2. Review `CI_TEST_FIXES.md` for known issues
3. Run tests locally: `npm run test`

### Deployment Failing

1. Verify Cloudflare secrets are set correctly
2. Check wrangler.toml configuration
3. Ensure worker dependencies are installed: `cd worker && npm ci`

### Worker Not Responding

1. Check Cloudflare Workers dashboard for errors
2. Review worker logs: `cd worker && npx wrangler tail`
3. Verify environment variables are set

## Related Documentation

- [DEPLOYMENT_STRATEGY.md](../../DEPLOYMENT_STRATEGY.md) - Overall deployment strategy
- [STAGE2-IMPLEMENTATION-CHECKLIST.md](../../STAGE2-IMPLEMENTATION-CHECKLIST.md) - Stage 2 implementation tasks
- [SECURITY-INCIDENT-REPORT.md](../../SECURITY-INCIDENT-REPORT.md) - Security best practices
- [CI_TEST_FIXES.md](../../CI_TEST_FIXES.md) - CI test fixes and troubleshooting
- [worker/wrangler.toml](../../worker/wrangler.toml) - Wrangler configuration

## Security Notes

### ✅ Security Improvements (2026-04-19)

1. **Removed weak default passwords**
   - No more `|| '1234'` fallbacks in workflows
   - `VITE_ADMIN_PASSWORD` is now required
   - Build fails if secret is not set

2. **Added secret validation**
   - Workflows validate required secrets before building
   - Clear error messages if secrets are missing
   - Prevents accidental deployment with weak credentials

3. **Verified .env protection**
   - `.env` files are in `.gitignore`
   - Credentials are never committed to git
   - All secrets managed via GitHub Secrets / Wrangler CLI

### 🔒 Best Practices

- Use strong, unique passwords (min 16 characters)
- Rotate secrets every 90 days
- Never commit secrets to git
- Use different credentials for Stage 1 and Stage 2
- Monitor for unauthorized access
