# Project-Level Retrospective: Local-First Testing Strategy
**Date:** 2026-04-20  
**Project:** Afia Oil Tracker  
**Scope:** All 10 Epics + Epic FC (54 stories completed)  
**Focus:** Local development, testing, and debugging before cloud deployment

---

## Executive Summary

**Project Status:** 100% Complete (54/54 stories)  
**Current State:** Dual-mode architecture (local dev + cloud production)  
**Critical Finding:** ⚠️ **Local-first testing gaps exist** - some features require cloud services to test properly

### Key Findings

✅ **Strengths:**
- Local development environment works (`npm run dev` + `wrangler dev`)
- Worker can run locally with `.dev.vars` configuration
- Unit tests run entirely locally (Vitest + jsdom)
- Frontend can be tested independently of Worker

⚠️ **Gaps:**
- AI model testing requires real API keys (Gemini/Groq)
- Supabase integration requires cloud database connection
- E2E tests require both frontend AND worker running
- No local mock for LLM responses
- KV namespace optional locally but required in production
- Camera testing requires browser (not available in jsdom)

🎯 **Recommendation:** Implement local mocking layer for cloud dependencies to enable **100% offline testing**

---

## 1. Current Local Development Setup

### 1.1 What Works Locally ✅

**Frontend Development:**
```bash
npm run dev  # Vite dev server on localhost:5173
```
- ✅ React components render
- ✅ UI interactions work
- ✅ Routing works
- ✅ PWA service worker generates
- ✅ Offline mode works (after first load)
- ✅ localStorage persistence works
- ✅ IndexedDB works

**Worker Development:**
```bash
cd worker && wrangler dev  # Worker on localhost:8787
```
- ✅ Hono routing works
- ✅ CORS configured for localhost
- ✅ Rate limiting works (with KV) or gracefully degrades (without KV)
- ✅ Admin authentication works with `.dev.vars`
- ✅ Health endpoint works

**Unit Testing:**
```bash
npm run test  # Vitest
```
- ✅ Component tests run in jsdom
- ✅ Utility function tests run
- ✅ Hook tests run
- ✅ Worker endpoint tests run
- ✅ All mocks work (camera, canvas, i18n)

### 1.2 What Requires Cloud Services ⚠️

**AI Model Testing:**
- ❌ Gemini API requires real API key
- ❌ Groq API requires real API key
- ❌ No local mock for LLM responses
- ❌ Can't test AI analysis flow without cloud
- **Impact:** Stories 1-9, 1-10, 2-3, 2-4, 2-8 can't be fully tested locally

**Database Testing:**
- ❌ Supabase requires cloud connection
- ❌ No local PostgreSQL instance
- ❌ Can't test feedback storage without cloud
- ❌ Can't test admin corrections without cloud
- **Impact:** Stories 4-1, 4-3, 5-3, 7-7 can't be fully tested locally

**E2E Testing:**
- ❌ Playwright tests require both frontend + worker running
- ❌ Tests require real API keys in `.dev.vars`
- ❌ Can't run E2E tests in CI without secrets
- ❌ Camera tests require real browser (not jsdom)
- **Impact:** Full user flows can't be tested without cloud dependencies

**KV Namespace:**
- ⚠️ Rate limiting disabled locally without KV
- ⚠️ Admin lockout protection disabled locally
- ⚠️ Production security features not testable locally
- **Impact:** Security features can't be validated before deployment

---

## 2. Local vs Cloud Configuration Analysis

### 2.1 Environment Variables

**Frontend (`.env.local`):**
```env
VITE_ADMIN_PASSWORD="1234"              # ✅ Local only
VITE_PROXY_URL="http://localhost:8787"  # ✅ Local worker
VITE_SUPABASE_URL="https://..."         # ⚠️ Cloud dependency
VITE_SUPABASE_ANON_KEY="..."            # ⚠️ Cloud dependency
```

**Worker (`worker/.dev.vars`):**
```env
ADMIN_PASSWORD="1234"                   # ✅ Local only (weak password OK)
SUPABASE_URL="https://..."              # ⚠️ Cloud dependency
SUPABASE_SERVICE_KEY="..."              # ⚠️ Cloud dependency (CRITICAL)
GEMINI_API_KEY="..."                    # ⚠️ Cloud dependency
GEMINI_API_KEY2="..."                   # ⚠️ Cloud dependency
GEMINI_API_KEY3="..."                   # ⚠️ Cloud dependency
GROQ_API_KEY="..."                      # ⚠️ Cloud dependency
```

**Analysis:**
- 2/9 variables are truly local (admin passwords)
- 7/9 variables require cloud services
- **No local fallbacks** for cloud dependencies
- **No mock mode** to bypass cloud requirements

### 2.2 Deployment Configuration

**Local Development:**
- `npm run dev` - Frontend only
- `wrangler dev` - Worker only
- **Manual coordination** required (start both separately)
- **No unified startup script** (though `start-local-dev.bat` exists)

**Cloud Deployment:**
- `npm run deploy` - Deploys to Cloudflare Pages
- `cd worker && wrangler deploy --env stage1` - Deploys Worker
- **Separate deployments** for frontend and Worker
- **No staging environment** - only production

**Gap:** No local environment that mirrors production architecture

---

## 3. Testing Strategy Analysis

### 3.1 Unit Tests (Vitest) ✅

**Coverage:** 80%+ overall  
**Runs:** Entirely locally in jsdom  
**Mocks:** Camera, canvas, i18n, service worker

**Strengths:**
- ✅ Fast (runs in seconds)
- ✅ No cloud dependencies
- ✅ Good coverage of utilities and components
- ✅ Mocks are comprehensive

**Gaps:**
- ❌ Can't test real AI model inference
- ❌ Can't test real database operations
- ❌ Can't test real Worker endpoints
- ❌ jsdom limitations (no camera, no service worker)

### 3.2 E2E Tests (Playwright) ⚠️

**Coverage:** Critical user paths  
**Runs:** Requires real browser + both servers  
**Dependencies:** Frontend, Worker, API keys

**Strengths:**
- ✅ Tests real user flows
- ✅ Tests camera in real browser
- ✅ Tests full stack integration

**Gaps:**
- ❌ Requires cloud API keys to run
- ❌ Can't run in CI without secrets
- ❌ Slow (30-60 seconds per test)
- ❌ Flaky due to network dependencies
- ❌ No mock mode for offline testing

### 3.3 Integration Tests ❌

**Status:** NOT IMPLEMENTED

**Missing:**
- ❌ No tests for Worker + Supabase integration
- ❌ No tests for Worker + LLM API integration
- ❌ No tests for frontend + Worker integration (without E2E)
- ❌ No tests for offline sync behavior

**Impact:** Integration bugs only discovered in production

---

## 4. Local-First Testing Gaps

### 4.1 Critical Gaps (Blockers)

**Gap 1: No Local LLM Mock**
- **Problem:** Can't test AI analysis without real API keys
- **Impact:** Stories 1-9, 1-10, 2-3, 2-4, 2-8 require cloud
- **Workaround:** None - must use real APIs
- **Recommendation:** Create mock LLM service that returns deterministic responses

**Gap 2: No Local Database**
- **Problem:** Can't test Supabase operations without cloud
- **Impact:** Stories 4-1, 4-3, 5-3, 7-7 require cloud
- **Workaround:** None - must use real Supabase
- **Recommendation:** Use Supabase local development mode or mock database

**Gap 3: No Unified Local Environment**
- **Problem:** Must manually start frontend + Worker separately
- **Impact:** Developer friction, easy to forget one service
- **Workaround:** `start-local-dev.bat` exists but not documented
- **Recommendation:** Document and improve startup script

**Gap 4: No Local KV Namespace**
- **Problem:** Rate limiting and security features disabled locally
- **Impact:** Can't test production security behavior
- **Workaround:** Graceful degradation in code
- **Recommendation:** Use Miniflare for local KV emulation

### 4.2 Medium Priority Gaps

**Gap 5: No Integration Test Suite**
- **Problem:** No tests between unit and E2E
- **Impact:** Integration bugs only found in E2E or production
- **Recommendation:** Add integration tests with mocked cloud services

**Gap 6: E2E Tests Require Cloud**
- **Problem:** Can't run E2E tests without API keys
- **Impact:** CI can't run E2E tests without secrets
- **Recommendation:** Add mock mode for E2E tests

**Gap 7: No Staging Environment**
- **Problem:** Only local dev and production
- **Impact:** No safe place to test before production
- **Recommendation:** Create staging environment on Cloudflare

### 4.3 Low Priority Gaps

**Gap 8: Manual Environment Setup**
- **Problem:** Developers must manually create `.dev.vars` and `.env.local`
- **Impact:** Onboarding friction
- **Recommendation:** Automated setup script

**Gap 9: No Local Telemetry**
- **Problem:** Error telemetry only works in production
- **Impact:** Can't test error reporting locally
- **Recommendation:** Add local telemetry mode (console output)

---

## 5. Recommended Improvements

### 5.1 Immediate Actions (High Priority)

**Action 1: Create Local LLM Mock Service**
```typescript
// worker/src/mocks/llmMock.ts
export function mockGeminiResponse(imageBase64: string, sku: string) {
  // Return deterministic response based on SKU
  return {
    brand: "Afia",
    fillPercentage: 75,
    confidence: 0.95,
    reasoning: "Mock response for local testing"
  };
}
```

**Implementation:**
- Add `ENABLE_MOCK_LLM=true` to `.dev.vars`
- Check flag in Worker before calling real API
- Return mock response if enabled
- **Benefit:** Can test AI flow without API keys

**Action 2: Document Local Development Setup**
- Create `LOCAL-DEVELOPMENT.md` guide
- Document all required environment variables
- Document startup sequence
- Document testing strategy
- **Benefit:** Faster onboarding, fewer setup errors

**Action 3: Improve Startup Script**
```bash
# start-local-dev.sh (cross-platform)
#!/bin/bash
echo "Starting Afia Oil Tracker local development..."

# Check for required files
if [ ! -f "worker/.dev.vars" ]; then
  echo "❌ Missing worker/.dev.vars - copying from example..."
  cp worker/.dev.vars.example worker/.dev.vars
fi

if [ ! -f ".env.local" ]; then
  echo "❌ Missing .env.local - copying from example..."
  cp .env.example .env.local
fi

# Start services
echo "✅ Starting Worker on http://localhost:8787..."
cd worker && wrangler dev &
WORKER_PID=$!

echo "✅ Starting Frontend on http://localhost:5173..."
cd .. && npm run dev &
FRONTEND_PID=$!

# Cleanup on exit
trap "kill $WORKER_PID $FRONTEND_PID" EXIT
wait
```

**Benefit:** One command to start everything

### 5.2 Short-Term Actions (Medium Priority)

**Action 4: Add Integration Test Suite**
```typescript
// src/test/integration/worker-api.test.ts
describe('Worker API Integration', () => {
  it('should analyze image with mock LLM', async () => {
    // Test Worker endpoint with mocked LLM
    const response = await fetch('http://localhost:8787/analyze', {
      method: 'POST',
      body: JSON.stringify({ imageBase64: '...', sku: 'test' })
    });
    expect(response.ok).toBe(true);
  });
});
```

**Benefit:** Catch integration bugs before E2E

**Action 5: Add Mock Mode for E2E Tests**
```typescript
// playwright.config.ts
use: {
  baseURL: 'http://localhost:5173',
  extraHTTPHeaders: {
    'X-Mock-Mode': 'true' // Enable mock responses
  }
}
```

**Benefit:** E2E tests can run without API keys

**Action 6: Use Supabase Local Development**
```bash
# Install Supabase CLI
npm install -g supabase

# Start local Supabase
supabase start

# Update .dev.vars
SUPABASE_URL="http://localhost:54321"
SUPABASE_SERVICE_KEY="<local-service-key>"
```

**Benefit:** Test database operations locally

### 5.3 Long-Term Actions (Low Priority)

**Action 7: Create Staging Environment**
- Deploy to `afia-staging.pages.dev`
- Use separate Supabase project
- Use separate API keys
- **Benefit:** Safe testing before production

**Action 8: Add Local Telemetry Mode**
```typescript
// src/services/errorTelemetry.ts
export function logError(message: string, error: unknown) {
  if (import.meta.env.DEV) {
    console.error('[Telemetry]', message, error);
  } else {
    // Send to production telemetry service
  }
}
```

**Benefit:** Test error reporting locally

**Action 9: Automate Environment Setup**
```bash
# setup-local-dev.sh
#!/bin/bash
echo "Setting up Afia Oil Tracker local development..."

# Copy example files
cp worker/.dev.vars.example worker/.dev.vars
cp .env.example .env.local

# Prompt for API keys
read -p "Enter Gemini API Key (or press Enter to use mock): " GEMINI_KEY
if [ -n "$GEMINI_KEY" ]; then
  sed -i "s/\[YOUR_GEMINI_KEY_1\]/$GEMINI_KEY/" worker/.dev.vars
else
  echo "ENABLE_MOCK_LLM=true" >> worker/.dev.vars
fi

echo "✅ Setup complete! Run 'npm run dev' to start."
```

**Benefit:** Zero-friction onboarding

---

## 6. Testing Strategy Recommendations

### 6.1 Proposed Testing Pyramid

```
        E2E Tests (Playwright)
       /                      \
      /   Critical Paths Only  \
     /    (With Mock Mode)      \
    /____________________________\
   
   Integration Tests (Vitest)
  /                            \
 /   Worker + Mocked Services   \
/________________________________\

        Unit Tests (Vitest)
       /                    \
      /   Components + Utils  \
     /   (jsdom + Mocks)      \
    /__________________________\
```

**Unit Tests (80% of tests):**
- Fast, isolated, no cloud dependencies
- Test components, hooks, utilities
- Mock all external dependencies
- **Target:** 90% coverage

**Integration Tests (15% of tests):**
- Test Worker endpoints with mocked LLM/DB
- Test frontend + Worker communication
- Test offline sync behavior
- **Target:** Critical integration points

**E2E Tests (5% of tests):**
- Test critical user paths only
- Use mock mode when possible
- Use real APIs for smoke tests
- **Target:** Happy path + error cases

### 6.2 Mock Strategy

**Level 1: Unit Test Mocks (jsdom)**
- Mock browser APIs (camera, canvas, service worker)
- Mock React hooks
- Mock localStorage/IndexedDB
- **Already implemented** ✅

**Level 2: Integration Test Mocks (Worker)**
- Mock LLM API responses
- Mock Supabase operations
- Mock KV namespace
- **NOT implemented** ❌

**Level 3: E2E Test Mocks (Optional)**
- Mock mode flag in Worker
- Return deterministic responses
- Skip real API calls
- **NOT implemented** ❌

### 6.3 CI/CD Testing Strategy

**Current State:**
- Unit tests run in CI ✅
- E2E tests DON'T run in CI (require secrets) ❌

**Recommended State:**
- Unit tests run in CI (no changes needed) ✅
- Integration tests run in CI with mocks ✅
- E2E tests run in CI with mock mode ✅
- E2E smoke tests run in staging with real APIs ✅

---

## 7. Deployment Readiness Checklist

### 7.1 Local Testing Checklist

Before deploying to production, verify:

**Frontend:**
- [ ] `npm run dev` starts without errors
- [ ] `npm run build` completes successfully
- [ ] `npm run preview` serves built app
- [ ] Unit tests pass: `npm run test`
- [ ] No TypeScript errors: `npm run build`
- [ ] No ESLint errors: `npm run lint`

**Worker:**
- [ ] `cd worker && wrangler dev` starts without errors
- [ ] Health endpoint responds: `curl http://localhost:8787/health`
- [ ] Admin auth works with test password
- [ ] Worker tests pass (if implemented)

**Integration:**
- [ ] Frontend can call Worker endpoints
- [ ] CORS configured correctly
- [ ] Environment variables set correctly
- [ ] E2E tests pass (with mock mode or real APIs)

### 7.2 Cloud Deployment Checklist

Before deploying to production:

**Secrets:**
- [ ] `ADMIN_PASSWORD` set via `wrangler secret put` (strong password)
- [ ] `GEMINI_API_KEY` set via `wrangler secret put`
- [ ] `GROQ_API_KEY` set via `wrangler secret put`
- [ ] `SUPABASE_SERVICE_KEY` set via `wrangler secret put`
- [ ] GitHub secrets set for CI/CD

**Configuration:**
- [ ] `wrangler.toml` configured for target environment
- [ ] KV namespace created and bound
- [ ] R2 bucket created (if using)
- [ ] Custom domain configured (if using)

**Testing:**
- [ ] Deploy to staging first (if available)
- [ ] Run smoke tests in staging
- [ ] Verify all features work
- [ ] Check error telemetry
- [ ] Monitor for 24 hours before promoting to production

---

## 8. Action Items

### Immediate (This Sprint)

1. **Create `LOCAL-DEVELOPMENT.md` guide**
   - Owner: Tech Writer
   - Deadline: End of week
   - Priority: HIGH

2. **Implement LLM mock service**
   - Owner: Senior Dev
   - Deadline: 3 days
   - Priority: HIGH

3. **Improve startup script**
   - Owner: DevOps
   - Deadline: 2 days
   - Priority: MEDIUM

### Short-Term (Next Sprint)

4. **Add integration test suite**
   - Owner: QA Engineer
   - Deadline: 1 week
   - Priority: HIGH

5. **Add mock mode for E2E tests**
   - Owner: QA Engineer
   - Deadline: 1 week
   - Priority: MEDIUM

6. **Set up Supabase local development**
   - Owner: Senior Dev
   - Deadline: 1 week
   - Priority: MEDIUM

### Long-Term (Next Quarter)

7. **Create staging environment**
   - Owner: DevOps
   - Deadline: 2 weeks
   - Priority: LOW

8. **Add local telemetry mode**
   - Owner: Senior Dev
   - Deadline: 1 week
   - Priority: LOW

9. **Automate environment setup**
   - Owner: DevOps
   - Deadline: 1 week
   - Priority: LOW

---

## 9. Conclusion

### Summary

The Afia Oil Tracker project has a **functional local development environment**, but **significant gaps exist** in local-first testing. The current setup requires cloud services (Supabase, Gemini API, Groq API) to test critical features, which creates friction and prevents fully offline development.

### Key Takeaways

1. **Local development works** - but requires cloud dependencies
2. **Unit tests are comprehensive** - but can't test real integrations
3. **E2E tests exist** - but require API keys and can't run in CI
4. **No integration test layer** - gap between unit and E2E
5. **No mock mode** - can't test without cloud services

### Recommended Path Forward

**Phase 1 (Immediate):**
- Document local development setup
- Create LLM mock service
- Improve startup script

**Phase 2 (Short-Term):**
- Add integration test suite
- Add mock mode for E2E tests
- Set up Supabase local development

**Phase 3 (Long-Term):**
- Create staging environment
- Add local telemetry mode
- Automate environment setup

### Success Criteria

✅ **Local-First Testing Achieved When:**
- Developers can run ALL tests without API keys
- CI can run ALL tests without secrets
- Integration tests cover Worker + mocked services
- E2E tests have mock mode for offline testing
- Documentation guides new developers through setup
- Startup script launches entire stack with one command

---

**Retrospective Complete**  
**Next Steps:** Review action items with team and prioritize implementation
