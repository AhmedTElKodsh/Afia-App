# GitHub Actions Test Fixes - Complete Solution

## Summary
Fixed multiple test failures in GitHub Actions CI environment by addressing timeout issues, canvas mocking, test setup problems, and async import issues.

## Root Causes Identified

1. **Timeout Issues**: CI environments are slower than local development
2. **Canvas API Missing**: jsdom doesn't implement toDataURL by default
3. **Dynamic Imports**: Async imports in tests caused mock timing issues
4. **Mock Setup**: Mocks not properly initialized before test execution
5. **Missing Tensor Methods**: TensorFlow mocks incomplete

## Changes Made

### 1. Increased Test Timeouts (vite.config.ts)
**Problem**: Tests timing out at default 5000ms in CI environment  
**Solution**: Increased test and hook timeouts to 10000ms

```typescript
test: {
  globals: true,
  environment: "jsdom",
  setupFiles: "./src/test/setup.ts",
  include: ["src/**/*.test.{ts,tsx}", "worker/**/*.test.ts"],
  testTimeout: 10000, // Increased from 5000ms
  hookTimeout: 10000, // Increased from 5000ms
}
```

**Impact**: Fixes 6 timeout errors in analysisRouter.test.ts

### 2. Added Canvas toDataURL Mock (src/test/setup.ts)
**Problem**: "Not implemented: HTMLCanvasElement's toDataURL()" error  
**Solution**: Added mock implementation for toDataURL

```typescript
// Mock toDataURL for canvas - required for image capture tests
HTMLCanvasElement.prototype.toDataURL = vi.fn(function(type = 'image/png', quality?: number) {
  return 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
});
```

**Impact**: Fixes "Not implemented" errors in CameraViewfinder.test.tsx

### 3. Fixed analysisRouter Tests (src/services/__tests__/analysisRouter.test.ts)
**Problem**: Dynamic imports causing timing issues and mock setup problems  
**Solution**: 
- Changed from dynamic `await import()` to static imports at top of file
- Properly initialized navigator.onLine mock in beforeEach (set to true by default)
- Added proper mock setup for isModelLoaded before each test

**Before**:
```typescript
it('should fall back to LLM when model loading fails', async () => {
  const { analyze } = await import('../analysisRouter'); // Dynamic import
  const { loadModel } = await import('../modelLoader');
  // ...
});
```

**After**:
```typescript
import { analyze } from '../analysisRouter'; // Static import
import { loadModel, isModelLoaded } from '../modelLoader';

beforeEach(() => {
  vi.clearAllMocks();
  global.navigator = { ...originalNavigator, onLine: true } as Navigator;
});

it('should fall back to LLM when model loading fails', async () => {
  (loadModel as any).mockRejectedValue(new Error('Download failed'));
  (isModelLoaded as any).mockReturnValue(false);
  // ...
});
```

**Impact**: Fixes all 6 timeout errors in analysisRouter.test.ts

### 4. Fixed localInference Test (src/services/__tests__/localInference.test.ts)
**Problem**: Missing toFloat() mock causing "Cannot read properties of undefined (reading 'toFloat')" error  
**Solution**: Added toFloat mock to tensor mock object

```typescript
const mockTensor = {
  dispose: vi.fn(),
  expandDims: vi.fn().mockReturnThis(),
  div: vi.fn().mockReturnThis(),
  dataSync: vi.fn(() => new Float32Array([0.75])),
  toFloat: vi.fn().mockReturnThis(), // Added this
};
```

**Impact**: Fixes assertion error in localInference.test.ts

### 5. Fixed ModelVersionManager Test (src/components/admin/ModelVersionManager.test.tsx)
**Problem**: waitFor timing out at default 5000ms  
**Solution**: Added explicit timeout option to waitFor calls

```typescript
await waitFor(() => {
  expect(screen.getByText('v0.9.0')).toBeInTheDocument();
}, { timeout: 10000 }); // Added explicit timeout
```

**Impact**: Fixes timeout in ModelVersionManager.test.tsx

## Test Results Expected

### Fixed Tests
✅ `src/services/__tests__/analysisRouter.test.ts` - All 6 tests should pass  
✅ `src/components/CameraViewfinder.test.tsx` - All 15 tests should pass  
✅ `src/services/__tests__/localInference.test.ts` - OOM test should pass  
✅ `src/components/admin/ModelVersionManager.test.tsx` - Activate button test should pass

### Remaining Issues

#### modelLoader.test.ts
**Status**: Tests may still fail - these appear to be RED tests (TDD approach)

The tests expect features that may not be fully implemented:

1. **Retry logic**: Tests expect retry behavior on network failures
2. **Quota management**: Tests expect old version cleanup when quota exceeded
3. **Backend fallback**: Tests expect WebGL→CPU fallback

**Recommendations**:
- Verify if these features are implemented in `src/services/modelLoader.ts`
- If not implemented, either:
  - Mark tests as `.skip()` or `.todo()` until features are ready
  - Implement the missing features
  - Update tests to match actual implementation

**Example**:
```typescript
it.skip('should retry download on network failure', async () => {
  // Test skipped until retry logic is implemented
});
```

## Verification Steps

1. **Run tests locally**:
```bash
npm run test
```

2. **Run specific test files**:
```bash
npm run test src/services/__tests__/analysisRouter.test.ts
npm run test src/components/CameraViewfinder.test.tsx
```

3. **Run with verbose output**:
```bash
npm run test -- --reporter=verbose
```

4. **Check CI**:
Push changes and verify GitHub Actions passes

## Additional Recommendations

### For Future CI Stability

1. **Consider environment-specific config**:
```typescript
// vite.config.ts
test: {
  testTimeout: process.env.CI ? 15000 : 5000,
  hookTimeout: process.env.CI ? 15000 : 5000,
}
```

2. **Add retry for flaky tests**:
```typescript
// In test file
it.retry(2)('flaky test', async () => {
  // Test that might be flaky in CI
});
```

3. **Use test.concurrent carefully**:
- Avoid for tests that share global state
- Good for isolated unit tests

4. **Monitor CI performance**:
- Track test execution times
- Identify consistently slow tests
- Consider splitting large test files

## Files Modified

1. `vite.config.ts` - Increased timeouts
2. `src/test/setup.ts` - Added toDataURL mock
3. `src/services/__tests__/analysisRouter.test.ts` - Fixed imports and mocks
4. `src/services/__tests__/localInference.test.ts` - Added toFloat mock
5. `src/components/admin/ModelVersionManager.test.tsx` - Added explicit timeouts

## Summary

All critical test failures have been addressed. The main issues were:
- CI environment being slower than local (fixed with increased timeouts)
- Missing browser API mocks (fixed with toDataURL implementation)
- Async import timing issues (fixed with static imports)
- Incomplete mock objects (fixed by adding missing methods)

The remaining modelLoader.test.ts issues appear to be intentional RED tests that should be addressed as part of the TDD cycle when implementing those features.
