# Integration Tests

Integration tests for the Afia Oil Tracker Worker API. These tests verify that the Worker endpoints work correctly with mocked services.

## Overview

Integration tests sit between unit tests and E2E tests:

```
E2E Tests (Playwright)     ← Full browser automation
         |
         |
Integration Tests          ← API endpoint testing (YOU ARE HERE)
         |
         |
Unit Tests (Vitest)        ← Individual function testing
```

## Prerequisites

**The Worker must be running locally before running integration tests.**

### Start the Worker

```bash
# Option 1: Use the startup script (recommended)
./start-local-dev.sh

# Option 2: Start Worker manually
cd worker && wrangler dev
```

The Worker should be available at `http://localhost:8787`

### Verify Worker is Running

```bash
curl http://localhost:8787/health
# Should return: {"status":"ok"}
```

## Running Tests

### Run All Integration Tests

```bash
npm run test:integration
```

### Run Integration Tests in Watch Mode

```bash
npm run test:integration:watch
```

### Run All Tests (Unit + Integration)

```bash
npm run test:all
```

### Run Specific Test File

```bash
npm run test:integration -- worker-api.test.ts
npm run test:integration -- admin-api.test.ts
```

## Test Files

### `worker-api.test.ts`

Tests public API endpoints:
- ✅ Health check endpoint
- ✅ POST /analyze with mock LLM
- ✅ POST /feedback
- ✅ Rate limiting
- ✅ CORS headers
- ✅ Error handling

**Key Features:**
- Uses mock LLM (no API keys required)
- Tests deterministic responses
- Validates error cases
- Tests concurrent requests

### `admin-api.test.ts`

Tests admin API endpoints:
- ✅ POST /admin/auth (authentication)
- ✅ GET /admin/scans (with pagination)
- ✅ GET /admin/stats
- ✅ GET /admin/model/versions
- ✅ POST /admin/model/activate
- ✅ Authentication token validation
- ✅ Security checks

**Key Features:**
- Tests authentication flow
- Validates token-based access
- Tests admin-only endpoints
- Security validation

## Configuration

### Mock Mode

Integration tests require mock mode to be enabled in the Worker:

**File:** `worker/.dev.vars`
```env
ENABLE_MOCK_LLM="true"
```

This is enabled by default in `worker/.dev.vars.example`.

### Admin Password

Tests use the default admin password:

**File:** `worker/.dev.vars`
```env
ADMIN_PASSWORD="1234"
```

If you change this, update the `ADMIN_PASSWORD` constant in `admin-api.test.ts`.

## Test Structure

Each test file follows this structure:

```typescript
describe('Feature Group', () => {
  beforeAll(async () => {
    // Verify Worker is running
    // Set up test data
  });

  describe('Specific Feature', () => {
    it('should do something', async () => {
      // Arrange
      const input = { ... };
      
      // Act
      const response = await fetch(...);
      
      // Assert
      expect(response.ok).toBe(true);
    });
  });
});
```

## Writing New Tests

### 1. Create Test File

```bash
touch src/test/integration/my-feature.test.ts
```

### 2. Basic Template

```typescript
import { describe, it, expect, beforeAll } from 'vitest';

const WORKER_URL = 'http://localhost:8787';

describe('My Feature Integration', () => {
  beforeAll(async () => {
    // Verify Worker is running
    const health = await fetch(`${WORKER_URL}/health`);
    expect(health.ok).toBe(true);
  });

  it('should test my feature', async () => {
    const response = await fetch(`${WORKER_URL}/my-endpoint`);
    expect(response.ok).toBe(true);
  });
});
```

### 3. Run Your Test

```bash
npm run test:integration -- my-feature.test.ts
```

## Best Practices

### 1. Test Real API Behavior

Integration tests should test the actual HTTP API, not mocked implementations:

```typescript
// ✅ Good - Tests real API
const response = await fetch(`${WORKER_URL}/analyze`, {
  method: 'POST',
  body: JSON.stringify({ ... })
});

// ❌ Bad - Tests mocked function
const result = mockAnalyze({ ... });
```

### 2. Use Minimal Valid Data

Use the smallest valid data that tests the feature:

```typescript
// ✅ Good - Minimal 1x1 PNG
const minimalImage = 'data:image/png;base64,iVBORw0KGgo...';

// ❌ Bad - Large real image
const largeImage = fs.readFileSync('large-image.jpg');
```

### 3. Test Error Cases

Always test both success and error cases:

```typescript
it('should succeed with valid input', async () => { ... });
it('should return 400 for missing field', async () => { ... });
it('should return 401 for invalid auth', async () => { ... });
```

### 4. Clean Up After Tests

If tests create data, clean it up:

```typescript
afterAll(async () => {
  // Clean up test data
  await fetch(`${WORKER_URL}/admin/cleanup`, { ... });
});
```

### 5. Use Descriptive Test Names

```typescript
// ✅ Good - Clear what's being tested
it('should return 400 for missing sku parameter', async () => { ... });

// ❌ Bad - Unclear
it('should fail', async () => { ... });
```

## Troubleshooting

### Worker Not Running

**Error:**
```
Worker is not running at http://localhost:8787
```

**Solution:**
```bash
cd worker && wrangler dev
```

### Port Already in Use

**Error:**
```
Port 8787 is already in use
```

**Solution:**
```bash
# Find and kill the process
lsof -ti:8787 | xargs kill -9

# Or on Windows
netstat -ano | findstr :8787
taskkill /PID <PID> /F
```

### Mock Mode Not Enabled

**Error:**
```
GEMINI_API_KEY is not defined
```

**Solution:**
```bash
# Edit worker/.dev.vars
ENABLE_MOCK_LLM="true"

# Restart Worker
cd worker && wrangler dev
```

### Tests Timeout

**Error:**
```
Test timeout exceeded
```

**Solution:**
1. Check Worker logs: `tail -f worker.log`
2. Verify Worker is responding: `curl http://localhost:8787/health`
3. Increase timeout in test file:

```typescript
it('should do something', async () => {
  // ...
}, 10000); // 10 second timeout
```

### Authentication Failures

**Error:**
```
401 Unauthorized
```

**Solution:**
1. Verify admin password in `worker/.dev.vars`
2. Check token is being passed correctly:

```typescript
headers: {
  'Authorization': `Bearer ${authToken}`
}
```

## CI/CD Integration

Integration tests can run in CI without secrets:

```yaml
# .github/workflows/test.yml
- name: Start Worker
  run: |
    cd worker
    wrangler dev &
    sleep 5

- name: Run Integration Tests
  run: npm run test:integration
```

**Requirements:**
- Mock mode enabled (`ENABLE_MOCK_LLM="true"`)
- Worker started before tests
- Health check to verify Worker is ready

## Performance

Integration tests are faster than E2E tests but slower than unit tests:

| Test Type | Speed | Scope |
|-----------|-------|-------|
| Unit | ~1ms | Single function |
| Integration | ~100ms | API endpoint |
| E2E | ~1s | Full user flow |

**Typical run times:**
- Unit tests: 2-5 seconds
- Integration tests: 10-20 seconds
- E2E tests: 1-3 minutes

## Coverage

Integration tests should cover:

- ✅ All public API endpoints
- ✅ All admin API endpoints
- ✅ Authentication flows
- ✅ Error handling
- ✅ Rate limiting
- ✅ CORS configuration
- ✅ Request validation
- ✅ Response formats

Integration tests should NOT cover:
- ❌ UI rendering (use E2E tests)
- ❌ Individual functions (use unit tests)
- ❌ Browser behavior (use E2E tests)

## Related Documentation

- [Local Development Guide](../../../docs/LOCAL-DEVELOPMENT.md)
- [Unit Tests](../README.md)
- [E2E Tests](../../../e2e/README.md)
- [Worker API Documentation](../../../worker/README.md)

## Support

If you encounter issues:

1. Check Worker logs: `tail -f worker.log`
2. Verify mock mode: `grep ENABLE_MOCK_LLM worker/.dev.vars`
3. Test Worker manually: `curl http://localhost:8787/health`
4. Review test output for specific errors

For more help, see the [troubleshooting guide](../../../docs/LOCAL-DEVELOPMENT.md#troubleshooting).
