# CI/CD Workflow Status - Stage 1 (LLM Only)

## ✅ Current Status: READY

The GitHub Actions CI/CD workflow is fully configured and operational for Stage 1 (LLM-only implementation).

## Workflow Overview

**File**: `.github/workflows/ci-cd.yml`
**Name**: Stage1 LLM Only
**Status**: ✅ Active and configured

## Trigger Conditions

The workflow runs on:
- **Push** to branches: `master`, `local-model`, `stage-1-llm-only`
- **Pull requests** to branches: `master`, `local-model`, `stage-1-llm-only`
- **Manual dispatch** with environment selection (stage1/stage2)

## Pipeline Stages

### 1. Setup & Cache Dependencies ✅
- Caches Node.js dependencies for faster builds
- Separate caching for root and worker dependencies
- Uses Node.js v20

### 2. Lint & Code Quality ✅
- Runs ESLint for code quality checks
- Runs Prettier for code formatting validation
- Continues on error (non-blocking)

### 3. Unit Tests ✅
- Runs unit tests for both root and worker
- 10-minute timeout per test suite
- Uploads coverage reports as artifacts

### 4. Integration Tests ✅
- Starts Cloudflare Worker locally
- Waits for worker health check
- Runs integration tests against local worker
- 15-minute timeout

### 5. E2E Tests ✅
- Uses Playwright for end-to-end testing
- Caches Playwright browsers for faster runs
- Builds application before testing
- Uploads test reports and results
- Comments on PRs with test results
- 30-minute timeout

### 6. Security Scan ✅
- Runs npm audit on root dependencies
- Runs npm audit on worker dependencies
- Moderate severity threshold
- Continues on error (non-blocking)

### 7. Deploy Worker ✅
- Deploys to Cloudflare Workers
- Environment-based deployment:
  - `master` → Production (stage1)
  - `local-model` → Staging (stage2)
  - `stage-1-llm-only` → Staging (stage1)
- Applies KV namespace IDs
- Verifies deployment with health check

### 8. Deploy Pages ✅
- Deploys to Cloudflare Pages
- Builds with environment-specific configuration
- Uses appropriate worker URL based on branch

### 9. Notify on Failure ✅
- Creates failure summary if any job fails
- Only runs on push events

## Environment Variables

### Required Secrets (configured in GitHub)
- `CLOUDFLARE_API_TOKEN` - Cloudflare API authentication
- `CLOUDFLARE_ACCOUNT_ID` - Cloudflare account identifier
- `CLOUDFLARE_RATE_LIMIT_KV_ID` - KV namespace for rate limiting
- `CLOUDFLARE_RATE_LIMIT_KV_PREVIEW_ID` - KV namespace for preview
- `VITE_ADMIN_PASSWORD` - Admin dashboard password
- `GEMINI_API_KEY` - Primary Gemini API key
- `GEMINI_API_KEY2` - Secondary Gemini API key
- `GEMINI_API_KEY3` - Tertiary Gemini API key
- `GROQ_API_KEY` - Groq API key (fallback)

### Build-time Variables
- `VITE_PROXY_URL` - Worker URL (stage-dependent)
- `VITE_STAGE` - Deployment stage (stage1/stage2)

## Stage 1 Configuration

For Stage 1 (LLM-only implementation), the workflow:

1. **Uses LLM APIs directly** for oil level analysis
2. **Deploys to stage1 environment** when pushing to `master` or `stage-1-llm-only`
3. **Worker URL**: `https://afia-worker.savola.workers.dev`
4. **Pages URL**: `https://afia-app.pages.dev`

## Test Scripts (from package.json)

```json
{
  "test": "vitest run",
  "test:watch": "vitest",
  "test:integration": "vitest run src/test/integration",
  "test:integration:watch": "vitest src/test/integration",
  "test:all": "npm run test && npm run test:integration",
  "test:e2e": "playwright test",
  "lint": "npx eslint .",
  "lint:fix": "npx eslint . --fix",
  "type-check": "npx tsc --noEmit",
  "validate": "npm run lint && npm run type-check"
}
```

## Concurrency Control

- **Group**: `${{ github.workflow }}-${{ github.ref }}`
- **Cancel in progress**: Yes
- Prevents concurrent deployments to the same environment

## Permissions

- `contents: read` - Read repository contents
- `issues: write` - Create issue comments
- `pull-requests: write` - Comment on PRs

## Artifacts

The workflow generates and stores:

1. **Coverage Reports** (7 days retention)
   - Root coverage
   - Worker coverage

2. **Playwright Report** (30 days retention)
   - HTML test report
   - Screenshots and videos

3. **Test Results** (30 days retention)
   - Test results JSON
   - Detailed test output

## Deployment Flow

```
Push to branch
    ↓
Setup & Cache
    ↓
Lint → Unit Tests → Integration Tests → E2E Tests → Security Scan
    ↓                                                      ↓
    └──────────────────────────────────────────────────────┘
                            ↓
                    Deploy Worker
                            ↓
                    Verify Worker Health
                            ↓
                    Deploy Pages
                            ↓
                    Deployment Summary
```

## Branch Strategy

| Branch | Environment | Worker URL | Stage |
|--------|-------------|------------|-------|
| `master` | Production | `https://afia-worker.savola.workers.dev` | stage1 |
| `stage-1-llm-only` | Staging | `https://afia-worker.savola.workers.dev` | stage1 |
| `local-model` | Staging | `https://afia-worker-stage2.savola.workers.dev` | stage2 |

## Next Steps for Stage 2

When transitioning to Stage 2 (local model + LLM fallback):

1. Push to `local-model` branch
2. Workflow automatically detects stage2 environment
3. Deploys to stage2 worker URL
4. Local model becomes primary, LLM APIs become fallback

## Monitoring & Debugging

### View Workflow Runs
```bash
gh run list --limit 10
```

### View Specific Run
```bash
gh run view <run-id>
```

### Download Artifacts
```bash
gh run download <run-id>
```

### Trigger Manual Deployment
```bash
gh workflow run ci-cd.yml -f environment=stage1
```

## Health Checks

### Worker Health Check
```bash
curl https://afia-worker.savola.workers.dev/health
```

### Pages Health Check
```bash
curl https://afia-app.pages.dev
```

## Troubleshooting

### Common Issues

1. **Tests Failing Locally but Passing in CI**
   - Ensure local environment matches CI (Node v20)
   - Check environment variables
   - Run `npm run validate` before pushing

2. **Deployment Fails**
   - Verify Cloudflare secrets are set
   - Check KV namespace IDs
   - Verify API token permissions

3. **Worker Health Check Fails**
   - Check worker logs in Cloudflare dashboard
   - Verify environment variables are set
   - Check for deployment errors

4. **E2E Tests Timeout**
   - Check if worker is running
   - Verify network connectivity
   - Review Playwright traces in artifacts

## Success Criteria

✅ All jobs must pass before deployment
✅ Worker health check must succeed
✅ No critical security vulnerabilities
✅ Code coverage maintained
✅ E2E tests pass

## Documentation

- **Workflow File**: `.github/workflows/ci-cd.yml`
- **Manual Deploy**: `.github/workflows/deploy-manual.yml`
- **Workflow README**: `.github/workflows/README.md`
- **Setup Guide**: `SETUP-GUARDRAILS.md`
- **Fixes Applied**: `FIXES-APPLIED.md`

---

**Last Updated**: 2026-04-27
**Status**: ✅ Operational
**Stage**: Stage 1 (LLM Only)
