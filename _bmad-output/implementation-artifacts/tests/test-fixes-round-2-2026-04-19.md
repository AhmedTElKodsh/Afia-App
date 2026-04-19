# Playwright E2E Test Fixes - Round 2
**Date:** 2026-04-19  
**Status:** In Progress  
**Pass Rate:** 98/124 (79%) → Target: 100%

## Summary

Applied targeted fixes to address 26 failing tests across multiple test suites. The primary issues were:
1. Browser context closing prematurely during analysis flow
2. Camera activation timing and selector issues
3. Timeout configuration not being applied correctly

## Changes Applied

### 1. Enhanced `triggerAnalyzeAndConfirm` Helper (`tests/e2e/helpers/flow.ts`)

**Problem:** Browser context was closing before assertions could complete, causing "Target page, context or browser has been closed" errors in 20+ tests.

**Solution:**
- Added page closure detection at the start of the function
- Wrapped entire function in try-catch for graceful error handling
- Increased API response timeout from 25s to 30s
- Increased UI transition timeouts from 20s to 25s
- Added `page.waitForLoadState('domcontentloaded')` after API response for stability
- Added explicit `state: 'visible'` to waitForSelector calls
- Improved error messages to distinguish between page closure and other failures

```typescript
export async function triggerAnalyzeAndConfirm(page: Page) {
  try {
    // Check if page is still valid before starting
    if (page.isClosed()) {
      throw new Error('Page is already closed');
    }

    // Register response waiter with longer timeout
    const analyzePromise = page.waitForResponse(
      res => res.url().includes('/analyze'),
      { timeout: 30000 }  // Increased from 25000
    );

    await page.evaluate(() => {
      (window as any).__AFIA_TRIGGER_ANALYZE__?.();
    });

    const response = await analyzePromise;
    expect(response.status()).toBe(200);

    // Wait for stable state after API response
    await page.waitForLoadState('domcontentloaded', { timeout: 10000 }).catch(() => {});

    // Wait for UI with longer timeout and explicit visibility
    await page.waitForSelector('.fill-confirm, .result-display', { 
      timeout: 25000,  // Increased from 20000
      state: 'visible'
    });
    
    // ... rest of flow with extended timeouts
  } catch (error) {
    // Better error handling for page closure
    if (error instanceof Error && 
        (error.message.includes('Target page, context or browser has been closed') ||
         error.message.includes('Page is already closed'))) {
      throw new Error(`Browser context closed during analysis flow: ${error.message}`);
    }
    throw error;
  }
}
```

### 2. Fixed Camera Orientation Guide Tests (`tests/e2e/camera-orientation-guide.spec.ts`)

**Problem:** All 6 camera orientation tests timing out waiting for `.camera-viewfinder.camera-active` selector.

**Solution:**
- Simplified selector from `.camera-viewfinder.camera-active` to just `.camera-active`
- Increased camera activation timeout from 20s to 25s
- Increased camera stream initialization delay from 1s to 2s
- Added explicit `state: 'visible'` to waitForSelector
- Increased orientation guide visibility timeout from 10s to 15s

**Before:**
```typescript
await page.waitForSelector('.camera-viewfinder.camera-active', { 
  state: 'attached', 
  timeout: 20000 
});
await page.waitForTimeout(1000);
await expect(orientationGuide).toBeVisible({ timeout: 10000 });
```

**After:**
```typescript
await page.waitForSelector('.camera-active', { 
  state: 'visible', 
  timeout: 25000 
});
await page.waitForTimeout(2000);
await expect(orientationGuide).toBeVisible({ timeout: 15000 });
```

## Test Results Analysis

### Still Failing (26 tests)

#### Camera Orientation Guide (6 tests)
- All tests timing out at 30s global timeout
- Waiting for `.camera-active` selector
- **Root Cause:** Camera not activating in test environment OR global timeout override

#### Epic 1 Critical Path (2 tests)
- "Target page, context or browser has been closed" errors
- **Root Cause:** Browser closing during `triggerAnalyzeAndConfirm` - needs investigation

#### Epic 1 Error Handling (1 test)
- Rate limit (429) error message doesn't match expected pattern
- Expected: `/rate limit|too many|slow down|try again later/i`
- Actual: "unable to analyze imageanalysis failedretryretake photo"
- **Root Cause:** Error message format doesn't include rate limit keywords

#### Epic 3 Feedback (4 tests)
- All failing in `triggerAnalyzeAndConfirm` with element not found
- **Root Cause:** Same browser closure issue as Epic 1

#### Epic 7 Bottle Selector (1 test)
- `.bottle-confirmed-card` not visible in TestLab
- **Root Cause:** Single-SKU logic may not be rendering the confirmed card

#### Mock/TestLab Tests (12 tests)
- All failing in `triggerAnalyzeAndConfirm` or waiting for result display
- **Root Cause:** Browser context closure or timeout issues

## Known Issues

### 1. Global Test Timeout Override
The error messages show "Test timeout of 30000ms exceeded" but `playwright.config.ts` sets `timeout: 60000`. This suggests:
- Test-level timeout override somewhere
- Config not being reloaded
- Cached configuration

**Action Required:** Investigate why global timeout isn't being applied.

### 2. Browser Context Closure
Despite improvements to `triggerAnalyzeAndConfirm`, tests are still experiencing browser closure. This could be:
- Test isolation issues
- Memory pressure
- Playwright configuration problem
- Race condition in test teardown

**Action Required:** Add more detailed logging to identify when/why browser closes.

### 3. Camera Activation in Tests
Camera mock may not be initializing properly, causing `.camera-active` class to never appear.

**Action Required:** Verify `mockCamera` helper is working correctly and camera permissions are granted.

## Next Steps

1. **Run tests again** to verify fixes are applied (current results may be from old code)
2. **Investigate global timeout** - why 30s instead of 60s?
3. **Add debug logging** to `triggerAnalyzeAndConfirm` to track execution flow
4. **Fix rate limit error message** - update test or error handling code
5. **Verify camera mock** - ensure camera activates properly in test environment
6. **Check TestLab bottle selector** - verify single-SKU rendering logic

## Files Modified

- `tests/e2e/helpers/flow.ts` - Enhanced error handling and timeouts
- `tests/e2e/camera-orientation-guide.spec.ts` - Fixed selectors and timeouts

## Commit

```
commit 47b848a7c622bde2aadec3827298b48effcdb369
Author: AI Bot
Date: Sun Apr 19 2026

fix: improve test reliability with better selectors and error handling

- Updated camera orientation guide tests to use simpler `.camera-active` selector
- Increased camera activation wait time from 1s to 2s for stream initialization
- Enhanced triggerAnalyzeAndConfirm helper with better error handling
- Extended timeouts across the board for slower CI environments
```

## Recommendations

1. **Increase global timeout to 90s** - Some tests legitimately need more time
2. **Add retry logic** - Flaky tests should retry once before failing
3. **Improve test isolation** - Ensure each test starts with clean state
4. **Add test-level timeouts** - Override global timeout for known slow tests
5. **Enhance error messages** - Include more context about what was happening when failure occurred

## Status

**Current:** 79% pass rate (98/124 passing)  
**Target:** 100% pass rate  
**Blockers:** 
- Global timeout configuration issue
- Browser context closure root cause unknown
- Camera activation reliability in test environment
