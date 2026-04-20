# Local Development Strategy: Decoupled Cloudflare Deployment

## Current Status

✅ **GitHub Actions workflows are already disabled** (`.yml.disabled` extension)
- This prevents automatic deployments on every push
- Cloudflare endpoints won't be overloaded during development
- You maintain full control over when to deploy

## Strategy Overview

### Phase 1: Local Development & Testing (CURRENT)
**Goal:** Build and test the app fully functional locally before any Cloudflare deployment

**Workflow:**
1. ✅ Frontend runs on `http://localhost:5173`
2. ✅ Worker runs on `http://localhost:8787`
3. ✅ All testing happens locally (unit + E2E)
4. ✅ No automatic Cloudflare deployments
5. ✅ QR codes can point to local IP for mobile testing

**Testing Approach:**
```bash
# Terminal 1: Start Worker (optional for E2E tests)
cd worker
npm run dev

# Terminal 2: Start Frontend
npm run dev

# Terminal 3: Run Tests
npm test                    # Unit tests
npm run test:e2e           # E2E tests (Playwright) - runs in mock mode, no API keys needed
npm run test:integration   # Integration tests - requires Worker running
```

**Note:** E2E tests automatically run in **mock mode** (no real API keys required). The `playwright.config.ts` sets `X-Mock-Mode: true` header for all requests, enabling the Worker's mock LLM responses. This allows you to run E2E tests immediately without Worker setup or API keys.

## Action 5: E2E Mock Mode (COMPLETE)

**Status:** ✅ Complete

**What:** E2E tests run without API keys using header-based mock mode.

**How It Works:**
- Playwright sends `X-Mock-Mode: true` header on all requests (configured in `playwright.config.ts`)
- Worker detects header and enables all mocks (`ENABLE_MOCK_LLM = "true"`)
- Rate limiting is bypassed for mock requests via `skipRateLimit` flag
- Mock mode flag is automatically cleaned up after each request (prevents cross-request contamination)
- RequestId is preserved for logging/debugging

### Limitations and Considerations

- **Scope**: Mock mode currently applies to all API endpoints that use the LLM service
- **Environment Variables**: The `ENABLE_MOCK_LLM` flag is set per-request and cleaned up automatically
- **Rate Limiting**: Bypassed completely in mock mode - tests won't reflect production rate limit behavior
- **Determinism**: Mock responses are deterministic but may not reflect actual LLM behavior
- **Performance**: Mock mode is significantly faster than real LLM calls, which may mask performance issues
- **Coverage**: Tests should complement, not replace, integration tests with real LLM services

**Usage:**

**Running E2E Tests Locally:**
```bash
# No API keys needed - mock mode is default
npm run test:e2e
```

**Disabling Mock Mode:**
Remove `extraHTTPHeaders` from `playwright.config.ts` to test against real APIs.

**CORS Behavior:**
Mock mode does NOT bypass CORS. Localhost origins (`http://localhost:5173`) are already allowed in Worker CORS config.

**CI Configuration (When Re-enabled):**
GitHub Actions workflows can run E2E tests without secrets:
```yaml
- name: Run E2E Tests
  run: npm run test:e2e
  # No GROQ_API_KEY or GEMINI_API_KEY needed
```

**Verification:**
Run `tests/e2e/mock-mode.spec.ts` to verify mock responses are deterministic.

**Manual Verification Steps:**
1. Remove all API keys from `.dev.vars` (comment out `GROQ_API_KEY`, `GEMINI_API_KEY`, etc.)
2. Start Worker: `cd worker && npm run dev`
3. Start Vite dev server: `npm run dev` (in separate terminal)
4. Run E2E tests: `npm run test:e2e`
5. Verify all tests pass (14 total: 13 existing + 1 new `mock-mode.spec.ts`)
6. Check Worker logs for mock indicators (no real API calls)

**Mobile Testing (QR Code):**
- Find your local IP: `ipconfig` (look for IPv4 Address like `192.168.1.100`)
- Generate QR with: `http://192.168.1.100:5173/?sku=afia-corn-1.5l`
- Both devices must be on same WiFi
- Worker must be accessible: `http://192.168.1.100:8787`

### Phase 2: Manual Cloudflare Deployment (When Ready)
**Goal:** Deploy to Cloudflare only when app is stable and tested

**When to Deploy:**
- ✅ All unit tests passing
- ✅ All E2E tests passing (mock mode validates UI flows)
- ✅ All integration tests passing (validates real Worker API)
- ✅ Manual testing complete
- ✅ No critical bugs
- ✅ Feature is production-ready

**Manual Deployment Commands:**
```bash
# 1. Deploy Worker (Stage 1 - Production)
cd worker
npx wrangler deploy --env stage1

# 2. Build and Deploy Pages (Stage 1)
cd ..
npm run build
npx wrangler pages deploy dist --project-name=afia-app --branch=master

# 3. Verify deployment
curl https://afia-worker.savona.workers.dev/health
```

### Phase 3: Selective CI/CD Re-enablement (Future)
**Goal:** Re-enable GitHub Actions only for specific scenarios

**Option A: Manual Trigger Only**
```yaml
# .github/workflows/deploy-stage1.yml
on:
  workflow_dispatch:  # Manual trigger only - no automatic pushes
    inputs:
      environment:
        description: 'Deployment environment'
        required: true
        default: 'stage1'
        type: choice
        options:
          - stage1
          - stage2
```

**Option B: Tag-Based Deployment**
```yaml
# .github/workflows/deploy-stage1.yml
on:
  push:
    tags:
      - 'v*.*.*'  # Only deploy on version tags (e.g., v1.0.0)
```

**Option C: Protected Branch with Manual Approval**
```yaml
# .github/workflows/deploy-stage1.yml
on:
  push:
    branches: [production]  # Separate branch for production deploys

jobs:
  deploy:
    environment:
      name: production
      url: https://afia-app.pages.dev
    # Requires manual approval in GitHub UI
```

## Recommended Workflow

### During Active Development (NOW)

```
┌─────────────────────────────────────────────────────────────┐
│                    Local Development                        │
│                                                             │
│  1. Code changes                                            │
│  2. Run tests locally (npm test)                            │
│  3. Test with local worker (localhost:8787)                 │
│  4. Test with mobile QR (local IP)                          │
│  5. Iterate until stable                                    │
│                                                             │
│  ❌ NO automatic Cloudflare deployment                      │
│  ❌ NO GitHub Actions triggers                              │
└─────────────────────────────────────────────────────────────┘
```

### When Feature is Ready

```
┌─────────────────────────────────────────────────────────────┐
│                  Manual Deployment                          │
│                                                             │
│  1. Final test suite run (all passing)                      │
│  2. Manual deploy worker: npx wrangler deploy               │
│  3. Manual deploy pages: npx wrangler pages deploy          │
│  4. Smoke test production endpoints                         │
│  5. Monitor for errors                                      │
│                                                             │
│  ✅ Controlled deployment timing                            │
│  ✅ No endpoint overload                                    │
└─────────────────────────────────────────────────────────────┘
```

### Future: Selective Automation

```
┌─────────────────────────────────────────────────────────────┐
│              Re-enable GitHub Actions                       │
│                                                             │
│  Option 1: Manual trigger (workflow_dispatch)               │
│  Option 2: Tag-based (only on v*.*.* tags)                  │
│  Option 3: Protected branch (production branch only)        │
│                                                             │
│  ✅ Deployment only when you explicitly trigger it          │
│  ✅ No accidental deployments on every commit               │
└─────────────────────────────────────────────────────────────┘
```

## Implementation Steps

### Step 1: Continue Local Development ✅ (Already Done)

Your current setup is perfect:
- Workflows disabled (`.yml.disabled`)
- Local development working
- Tests running locally

### Step 2: Create Manual Deployment Script

Create a deployment script for when you're ready:

```bash
# scripts/deploy-manual.sh
#!/bin/bash

echo "🚀 Manual Deployment Script"
echo "============================"
echo ""

# Check if tests pass
echo "📋 Running tests..."
npm test
if [ $? -ne 0 ]; then
    echo "❌ Tests failed. Aborting deployment."
    exit 1
fi

echo "✅ Tests passed"
echo ""

# Deploy Worker
echo "🔧 Deploying Worker..."
cd worker
npx wrangler deploy --env stage1
if [ $? -ne 0 ]; then
    echo "❌ Worker deployment failed"
    exit 1
fi
cd ..

echo "✅ Worker deployed"
echo ""

# Build and Deploy Pages
echo "📦 Building PWA..."
npm run build
if [ $? -ne 0 ]; then
    echo "❌ Build failed"
    exit 1
fi

echo "✅ Build complete"
echo ""

echo "🌐 Deploying Pages..."
npx wrangler pages deploy dist --project-name=afia-app --branch=master
if [ $? -ne 0 ]; then
    echo "❌ Pages deployment failed"
    exit 1
fi

echo ""
echo "✅ Deployment complete!"
echo "🔗 Worker: https://afia-worker.savona.workers.dev"
echo "🔗 Pages: https://afia-app.pages.dev"
```

### Step 3: Update README with New Workflow

Add a section to README.md explaining the new development workflow:

```markdown
## Development Workflow

### Local Development (Current Mode)

1. **Start Worker:** `cd worker && npm run dev`
2. **Start Frontend:** `npm run dev`
3. **Run Tests:** `npm test && npm run test:e2e`
4. **Mobile Testing:** Use local IP in QR code (e.g., `http://192.168.1.100:5173`)

### Deployment (Manual Only)

**When to Deploy:**
- All tests passing
- Feature complete and tested
- No critical bugs

**How to Deploy:**
```bash
# Option 1: Use deployment script
chmod +x scripts/deploy-manual.sh
./scripts/deploy-manual.sh

# Option 2: Manual commands
cd worker && npx wrangler deploy --env stage1
cd .. && npm run build
npx wrangler pages deploy dist --project-name=afia-app
```

**GitHub Actions Status:**
- ⏸️ Currently disabled (`.yml.disabled`)
- Will be re-enabled with manual triggers only when app is stable
```

### Step 4: Future Re-enablement (When Ready)

When the app is stable and you want to re-enable CI/CD:

1. **Rename workflow files:**
   ```bash
   mv .github/workflows/deploy-stage1.yml.disabled .github/workflows/deploy-stage1.yml
   ```

2. **Modify workflow to use manual trigger:**
   ```yaml
   on:
     workflow_dispatch:  # Manual trigger only
       inputs:
         confirm:
           description: 'Type "deploy" to confirm'
           required: true
   ```

3. **Add deployment frequency limit:**
   ```yaml
   jobs:
     deploy:
       # Only allow deployment once per day
       if: github.event.inputs.confirm == 'deploy'
   ```

## Benefits of This Approach

### ✅ Advantages

1. **No Cloudflare Overload**
   - Deployments only when you explicitly trigger them
   - No automatic deployments on every commit
   - Controlled deployment frequency

2. **Faster Development**
   - Instant local testing
   - No waiting for CI/CD pipelines
   - Immediate feedback loop

3. **Cost Control**
   - Fewer Cloudflare Worker invocations
   - Reduced bandwidth usage
   - Lower API costs during development

4. **Better Testing**
   - Test everything locally first
   - Deploy only when confident
   - Fewer production bugs

5. **Flexibility**
   - Easy to switch between local and production
   - Can test with local IP on mobile
   - Can use ngrok for external testing

### ⚠️ Considerations

1. **Manual Deployment Required**
   - You must remember to deploy manually
   - No automatic production updates
   - Need to track what's deployed vs what's in code

2. **Local Environment Differences**
   - Local worker may behave slightly differently than Cloudflare
   - Need to test in production after deployment
   - Environment variables must be synced

## Testing Strategy

### Local Testing Checklist

Before any Cloudflare deployment:

- [ ] All unit tests passing (`npm test`)
- [ ] All E2E tests passing (`npm run test:e2e`) - validates UI flows in mock mode
- [ ] Integration tests passing (`npm run test:integration`) - validates real Worker API
- [ ] Manual testing on desktop browser
- [ ] Manual testing on mobile (local IP QR)
- [ ] Camera functionality tested
- [ ] QR code scanning tested
- [ ] Result display tested
- [ ] Feedback submission tested
- [ ] Error handling tested
- [ ] Offline mode tested (PWA)

### Production Testing Checklist

After Cloudflare deployment:

- [ ] Worker health check: `curl https://afia-worker.savona.workers.dev/health`
- [ ] Pages loading: `https://afia-app.pages.dev`
- [ ] QR code with production URL works
- [ ] Camera access works on mobile
- [ ] AI analysis returns results
- [ ] Feedback submission works
- [ ] Rate limiting works (test with 11+ requests)
- [ ] CORS headers correct
- [ ] No console errors

## Monitoring

### Local Development

```bash
# Watch Worker logs
cd worker && npm run dev

# Watch Frontend logs
npm run dev

# Watch test output
npm run test:watch
```

### Production (After Deployment)

```bash
# Watch Worker logs
cd worker && npx wrangler tail

# Check Worker metrics
npx wrangler metrics

# Check R2 storage
npx wrangler r2 object list afia-training-data
```

## Summary

**Current State:** ✅ Perfect for development
- Workflows disabled
- Local testing working
- No Cloudflare overload

**Next Steps:**
1. Continue local development until app is fully functional
2. Run comprehensive test suite
3. Deploy manually when ready using `npx wrangler deploy`
4. Monitor production for errors
5. Only re-enable GitHub Actions when app is stable (with manual triggers)

**Key Principle:** Deploy to Cloudflare only when you're confident the app is working, not on every code change.
