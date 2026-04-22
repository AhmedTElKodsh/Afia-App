# Local-First Testing Action Plan
**Date:** 2026-04-20  
**Project:** Afia Oil Tracker  
**Goal:** Enable 100% local testing before cloud deployment

---

## Quick Summary

Your project is **100% complete** (54/54 stories), but testing currently requires cloud services. This plan enables **fully local testing** while keeping cloud deployment code intact.

---

## Critical Gaps Identified

1. ❌ **No local LLM mock** - AI testing requires real API keys
2. ❌ **No local database** - Supabase operations require cloud
3. ❌ **No unified startup** - Must manually start frontend + Worker
4. ❌ **No integration tests** - Gap between unit and E2E tests
5. ❌ **E2E tests require cloud** - Can't run in CI without secrets

---

## Immediate Actions (This Week)

### Action 1: Create LLM Mock Service ⚡ HIGH PRIORITY

**File:** `worker/src/mocks/llmMock.ts`

```typescript
/**
 * Mock LLM responses for local testing
 * Enable with ENABLE_MOCK_LLM=true in .dev.vars
 */

export interface MockLLMResponse {
  brand: string;
  fillPercentage: number;
  confidence: number;
  reasoning: string;
}

export function mockGeminiResponse(imageBase64: string, sku: string): MockLLMResponse {
  // Deterministic responses based on SKU for testing
  const mockResponses: Record<string, MockLLMResponse> = {
    'afia-corn-oil-1.8l': {
      brand: 'Afia',
      fillPercentage: 75,
      confidence: 0.95,
      reasoning: 'Mock: Detected Afia corn oil bottle at 75% fill level'
    },
    'afia-sunflower-oil-1.8l': {
      brand: 'Afia',
      fillPercentage: 50,
      confidence: 0.92,
      reasoning: 'Mock: Detected Afia sunflower oil bottle at 50% fill level'
    },
    'default': {
      brand: 'Afia',
      fillPercentage: 60,
      confidence: 0.90,
      reasoning: 'Mock: Default response for testing'
    }
  };

  return mockResponses[sku] || mockResponses['default'];
}

export function mockGroqResponse(imageBase64: string, sku: string): MockLLMResponse {
  // Groq fallback mock
  return {
    brand: 'Afia',
    fillPercentage: 65,
    confidence: 0.88,
    reasoning: 'Mock: Groq fallback response for testing'
  };
}
```

**Update Worker:** `worker/src/services/geminiService.ts`

```typescript
import { mockGeminiResponse } from '../mocks/llmMock';

export async function analyzeImage(imageBase64: string, sku: string, env: Env) {
  // Check for mock mode
  if (env.ENABLE_MOCK_LLM === 'true') {
    console.log('[Mock Mode] Using mock LLM response');
    return mockGeminiResponse(imageBase64, sku);
  }

  // Real API call
  // ... existing code ...
}
```

**Update `.dev.vars.example`:**
```env
# Enable mock LLM for local testing (no API keys required)
ENABLE_MOCK_LLM="true"

# Real API keys (optional for local dev)
GEMINI_API_KEY="[YOUR_GEMINI_KEY_1]"
GROQ_API_KEY="[YOUR_GROQ_KEY]"
```

**Benefit:** Test AI analysis flow without API keys ✅

---

### Action 2: Create Local Development Guide 📚 HIGH PRIORITY

**File:** `LOCAL-DEVELOPMENT.md`

```markdown
# Local Development Guide

## Quick Start

### 1. Install Dependencies
\`\`\`bash
npm install
cd worker && npm install && cd ..
\`\`\`

### 2. Configure Environment

**Copy example files:**
\`\`\`bash
cp .env.example .env.local
cp worker/.dev.vars.example worker/.dev.vars
\`\`\`

**Enable mock mode (no API keys required):**
\`\`\`bash
# In worker/.dev.vars
ENABLE_MOCK_LLM="true"
ENABLE_MOCK_DB="true"  # Coming soon
\`\`\`

### 3. Start Development Servers

**Option A: Unified Script (Recommended)**
\`\`\`bash
./start-local-dev.sh
\`\`\`

**Option B: Manual Start**
\`\`\`bash
# Terminal 1 - Worker
cd worker && wrangler dev

# Terminal 2 - Frontend
npm run dev
\`\`\`

### 4. Verify Setup

- Frontend: http://localhost:5173
- Worker: http://localhost:8787
- Health check: http://localhost:8787/health

## Testing

### Unit Tests (No API keys required)
\`\`\`bash
npm run test
\`\`\`

### E2E Tests (Requires mock mode)
\`\`\`bash
npm run test:e2e
\`\`\`

## Troubleshooting

### "GEMINI_API_KEY is not defined"
- Set \`ENABLE_MOCK_LLM="true"\` in \`worker/.dev.vars\`
- Or add real API key

### "Worker not responding"
- Check \`wrangler dev\` is running
- Verify \`VITE_PROXY_URL="http://localhost:8787"\` in \`.env.local\`

### "Admin password not working"
- Check \`ADMIN_PASSWORD="1234"\` in \`worker/.dev.vars\`
- Restart \`wrangler dev\`
\`\`\`

**Benefit:** Faster onboarding, fewer setup errors ✅

---

### Action 3: Improve Startup Script 🚀 MEDIUM PRIORITY

**File:** `start-local-dev.sh`

```bash
#!/bin/bash
set -e

echo "🚀 Starting Afia Oil Tracker local development..."
echo ""

# Check for required files
if [ ! -f "worker/.dev.vars" ]; then
  echo "⚠️  Missing worker/.dev.vars - copying from example..."
  cp worker/.dev.vars.example worker/.dev.vars
  echo "✅ Created worker/.dev.vars"
  echo "   💡 Tip: Mock mode enabled by default (no API keys required)"
fi

if [ ! -f ".env.local" ]; then
  echo "⚠️  Missing .env.local - copying from example..."
  cp .env.example .env.local
  echo "✅ Created .env.local"
fi

# Check if dependencies are installed
if [ ! -d "node_modules" ]; then
  echo "📦 Installing frontend dependencies..."
  npm install
fi

if [ ! -d "worker/node_modules" ]; then
  echo "📦 Installing worker dependencies..."
  cd worker && npm install && cd ..
fi

echo ""
echo "✅ Setup complete!"
echo ""
echo "Starting services..."
echo "  - Worker: http://localhost:8787"
echo "  - Frontend: http://localhost:5173"
echo ""
echo "Press Ctrl+C to stop all services"
echo ""

# Start Worker in background
cd worker
wrangler dev > ../worker.log 2>&1 &
WORKER_PID=$!
cd ..

# Wait for Worker to start
echo "⏳ Waiting for Worker to start..."
for i in {1..30}; do
  if curl -s http://localhost:8787/health > /dev/null 2>&1; then
    echo "✅ Worker ready!"
    break
  fi
  sleep 1
done

# Start Frontend in background
npm run dev > frontend.log 2>&1 &
FRONTEND_PID=$!

# Wait for Frontend to start
echo "⏳ Waiting for Frontend to start..."
for i in {1..30}; do
  if curl -s http://localhost:5173 > /dev/null 2>&1; then
    echo "✅ Frontend ready!"
    break
  fi
  sleep 1
done

echo ""
echo "🎉 All services running!"
echo ""
echo "📝 Logs:"
echo "  - Worker: tail -f worker.log"
echo "  - Frontend: tail -f frontend.log"
echo ""

# Cleanup on exit
cleanup() {
  echo ""
  echo "🛑 Stopping services..."
  kill $WORKER_PID $FRONTEND_PID 2>/dev/null || true
  echo "✅ Stopped"
}
trap cleanup EXIT INT TERM

# Keep script running
wait
```

**Make executable:**
```bash
chmod +x start-local-dev.sh
```

**Benefit:** One command to start everything ✅

---

## Short-Term Actions (Next Week)

### Action 4: Add Integration Test Suite 🧪 HIGH PRIORITY

**File:** `src/test/integration/worker-api.test.ts`

```typescript
import { describe, it, expect, beforeAll, afterAll } from 'vitest';

describe('Worker API Integration (Mock Mode)', () => {
  const WORKER_URL = 'http://localhost:8787';

  beforeAll(async () => {
    // Verify Worker is running
    const health = await fetch(`${WORKER_URL}/health`);
    expect(health.ok).toBe(true);
  });

  it('should analyze image with mock LLM', async () => {
    const response = await fetch(`${WORKER_URL}/analyze`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        imageBase64: 'data:image/jpeg;base64,/9j/4AAQ...',
        sku: 'afia-corn-oil-1.8l'
      })
    });

    expect(response.ok).toBe(true);
    const data = await response.json();
    expect(data.brand).toBe('Afia');
    expect(data.fillPercentage).toBe(75);
    expect(data.confidence).toBeGreaterThan(0.9);
  });

  it('should handle admin authentication', async () => {
    const response = await fetch(`${WORKER_URL}/admin/auth`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: '1234' })
    });

    expect(response.ok).toBe(true);
    const data = await response.json();
    expect(data.token).toBeDefined();
  });

  it('should handle rate limiting gracefully', async () => {
    // Make multiple requests
    const requests = Array(5).fill(null).map(() =>
      fetch(`${WORKER_URL}/health`)
    );

    const responses = await Promise.all(requests);
    const allOk = responses.every(r => r.ok);
    expect(allOk).toBe(true);
  });
});
```

**Update `package.json`:**
```json
{
  "scripts": {
    "test:integration": "vitest run src/test/integration",
    "test:all": "npm run test && npm run test:integration"
  }
}
```

**Benefit:** Catch integration bugs before E2E ✅

---

### Action 5: Add Mock Mode for E2E Tests 🎭 MEDIUM PRIORITY

**Update:** `playwright.config.ts`

```typescript
export default defineConfig({
  use: {
    baseURL: 'http://localhost:5173',
    extraHTTPHeaders: {
      // Enable mock mode for E2E tests
      'X-Mock-Mode': process.env.CI ? 'true' : 'false'
    }
  },
  
  // Environment variables for tests
  env: {
    ENABLE_MOCK_LLM: 'true',
    ENABLE_MOCK_DB: 'true'
  }
});
```

**Update Worker to respect mock header:**

```typescript
// worker/src/index.ts
app.use('*', async (c, next) => {
  const mockMode = c.req.header('X-Mock-Mode') === 'true';
  if (mockMode) {
    c.set('mockMode', true);
  }
  await next();
});
```

**Benefit:** E2E tests can run in CI without secrets ✅

---

### Action 6: Set Up Supabase Local Development 🗄️ MEDIUM PRIORITY

**Install Supabase CLI:**
```bash
npm install -g supabase
```

**Initialize local Supabase:**
```bash
supabase init
supabase start
```

**Update `.dev.vars` for local mode:**
```env
# Local Supabase (started with 'supabase start')
SUPABASE_URL="http://localhost:54321"
SUPABASE_SERVICE_KEY="<local-service-key-from-supabase-start>"

# Or enable mock mode (no Supabase required)
ENABLE_MOCK_DB="true"
```

**Create database mock:**

**File:** `worker/src/mocks/dbMock.ts`

```typescript
export interface MockScan {
  id: string;
  sku: string;
  fillPercentage: number;
  timestamp: string;
}

const mockScans: MockScan[] = [];

export const mockDB = {
  async insertScan(scan: Omit<MockScan, 'id'>) {
    const newScan = { ...scan, id: `mock-${Date.now()}` };
    mockScans.push(newScan);
    return newScan;
  },

  async getScans(limit = 10) {
    return mockScans.slice(-limit);
  },

  async getScanById(id: string) {
    return mockScans.find(s => s.id === id);
  }
};
```

**Benefit:** Test database operations locally ✅

---

## Long-Term Actions (Next Month)

### Action 7: Create Staging Environment 🌐 LOW PRIORITY

**Deploy to staging:**
```bash
# Create staging branch
git checkout -b staging

# Deploy to Cloudflare Pages (staging)
wrangler pages deploy dist --project-name afia-staging

# Deploy Worker (staging)
cd worker && wrangler deploy --env staging
```

**Update `wrangler.toml`:**
```toml
[env.staging]
name = "afia-worker-staging"
vars = { STAGE = "staging", ALLOWED_ORIGINS = "https://afia-staging.pages.dev" }
```

**Benefit:** Safe testing before production ✅

---

## Testing Strategy Summary

### Current State
```
E2E Tests (Playwright) ❌ Requires API keys
         |
         |
Integration Tests ❌ NOT IMPLEMENTED
         |
         |
Unit Tests (Vitest) ✅ Works locally
```

### Target State
```
E2E Tests (Playwright) ✅ Mock mode enabled
         |
         |
Integration Tests ✅ Worker + mocked services
         |
         |
Unit Tests (Vitest) ✅ Works locally
```

---

## Success Criteria

✅ **Local-First Testing Achieved When:**

- [ ] Developers can run ALL tests without API keys
- [ ] CI can run ALL tests without secrets
- [ ] Integration tests cover Worker + mocked services
- [ ] E2E tests have mock mode for offline testing
- [ ] Documentation guides new developers through setup
- [ ] Startup script launches entire stack with one command
- [ ] Mock mode is documented and easy to enable
- [ ] Cloud deployment code remains intact and functional

---

## Implementation Priority

**Week 1 (Immediate):**
1. ✅ Create LLM mock service
2. ✅ Create local development guide
3. ✅ Improve startup script

**Week 2 (Short-Term):**
4. ✅ Add integration test suite
5. ✅ Add mock mode for E2E tests
6. ✅ Set up Supabase local development

**Month 1 (Long-Term):**
7. ✅ Create staging environment
8. ✅ Add local telemetry mode
9. ✅ Automate environment setup

---

## Next Steps

1. **Review this action plan** with the team
2. **Prioritize actions** based on team capacity
3. **Assign owners** for each action item
4. **Set deadlines** for completion
5. **Track progress** in sprint planning

---

**Document Created:** 2026-04-20  
**Full Retrospective:** `_bmad-output/implementation-artifacts/project-local-first-retrospective-2026-04-20.md`
