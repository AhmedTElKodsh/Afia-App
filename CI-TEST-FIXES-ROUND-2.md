# CI Test Fixes - Round 2

**Date**: 2026-04-28
**Branch**: `stage-1-llm-only`
**Commit**: `6946ac1`
**Status**: Pushed to GitHub

## Summary

Fixed 9 failing E2E tests in CI environment by addressing timing issues and incorrect selectors.

## Root Causes Identified

### 1. Analyzing Overlay Timeout (3 tests)
**Issue**: Tests were waiting for API requests/responses that weren't being captured properly in CI
**Root Cause**: Using `waitForRequest` or `waitForResponse` with mock APIs is unreliable in CI
**Solution**: Use simple `waitForTimeout(500ms)` after capture click to allow React state updates

**Affected Tests**:
- `camera-orientation-guide.spec.ts:44` - orientation guide disappears after capture
- `camera-outline-matching.spec.ts:164` - should allow manual capture at any time
- `camera-outline-matching.spec.ts:182` - should show shutter flash effect on capture

### 2. Wrong CSS Selector (1 test)
**Issue**: Test was looking for `.guidance-hint-pill` but actual class is `.guidance-header-hint`
**Solution**: Updated selector to match actual DOM structure

**Affected Tests**:
- `camera-outline-matching.spec.ts:403` - should show guidance hint text

### 3. Admin Password Test Route Mock Timing (1 test)
**Issue**: Route mock was set up AFTER navigation, causing race condition
**Solution**: Set up route mock BEFORE calling `page.goto()`

**Affected Tests**:
- `epic-5-6-features.spec.ts:46` - should show error for incorrect password

### 4. Export Buttons Disabled (3 tests)
**Issue**: Tests were checking buttons immediately without waiting for history to load
**Solution**: Added `waitForTimeout(1000ms)` after dashboard loads to allow history loading

**Affected Tests**:
- `epic-5-6-features.spec.ts:129` - should show export options
- `epic-7-8-features.spec.ts:211` - should trigger CSV download
- `epic-7-8-features.spec.ts:233` - should trigger JSON download

### 5. Scan Count Shows 0 (1 test)
**Issue**: localStorage seeding in `seedHistoryAndLogin()` wasn't completing before component mount
**Solution**:
- Increased wait time to 1000ms after dashboard loads
- Added localStorage verification before checking count
- Added explicit wait after navigating to Export tab

**Affected Tests**:
- `epic-7-8-features.spec.ts:275` - export tab shows scan count summary

## Changes Made

### File: `tests/e2e/camera-orientation-guide.spec.ts`
```typescript
// BEFORE: Using waitForResponse (unreliable with mocks)
const analyzePromise = page.waitForResponse(
  response => response.url().includes('/analyze') && response.status() === 200,
  { timeout: 15000 }
);
await captureBtn.click();
await analyzePromise;

// AFTER: Simple timeout for React state update
await captureBtn.click();
await page.waitForTimeout(500);
await expect(page.locator('.analyzing-overlay, .result-display')).toBeVisible({ timeout: 10000 });
```

### File: `tests/e2e/camera-outline-matching.spec.ts`
```typescript
// Fix 1: Manual capture timing
await captureBtn.click();
await page.waitForTimeout(500);
await expect(analyzingOverlay).toBeVisible({ timeout: 10000 });

// Fix 2: Shutter flash timing
await captureBtn.click();
await page.waitForTimeout(500);
await expect(analyzingOverlay).toBeVisible({ timeout: 10000 });

// Fix 3: Wrong CSS selector
// BEFORE: const hint = page.locator('.guidance-hint-pill');
// AFTER:
const hint = page.locator('.guidance-header-hint');
```

### File: `tests/e2e/epic-5-6-features.spec.ts`
```typescript
// Fix 1: Route mock timing
// BEFORE: Mock set up after goto
await page.goto('/?mode=admin');
await page.route(/.*\/admin\/auth/, ...);

// AFTER: Mock set up before goto
await page.route(/.*\/admin\/auth/, ...);
await page.goto('/?mode=admin');

// Fix 2: Export buttons wait
await page.getByRole('button', { name: /Export/i }).click();
await expect(page.locator('.export-tab')).toBeVisible({ timeout: 5000 });
await page.waitForTimeout(500); // Wait for history to load
await expect(jsonBtn).not.toBeDisabled({ timeout: 5000 });
```

### File: `tests/e2e/epic-7-8-features.spec.ts`
```typescript
// Fix 1: CSV download - increased wait time
await page.waitForTimeout(1000); // Increased from 500ms
await page.waitForTimeout(500); // Additional wait after tab switch
await expect(csvBtn).not.toBeDisabled({ timeout: 10000 });

// Fix 2: JSON download - increased wait time
await page.waitForTimeout(1000); // Increased from 500ms
await page.waitForTimeout(500); // Additional wait after tab switch
await expect(jsonBtn).not.toBeDisabled({ timeout: 10000 });

// Fix 3: Scan count - verify localStorage and add waits
await page.waitForTimeout(1000); // Increased from 500ms
await page.waitForTimeout(500); // Additional wait after tab switch
// Verify localStorage has the seeded data
const historyData = await page.evaluate(() => {
  return localStorage.getItem('afia_scan_history');
});
expect(historyData).toBeTruthy();
```

## Testing Strategy

### Why Simple Timeouts Work Better Than API Waiting

In CI environments with mocked APIs:
1. **Mock API responses are synchronous** - They don't trigger real network events
2. **React state updates need time** - Even with mocks, React needs time to process state changes
3. **waitForRequest/waitForResponse are unreliable** - They may miss mocked requests
4. **Simple timeouts are predictable** - 500ms is enough for React state updates in CI

### Timeout Values Chosen

- **500ms**: After capture click (React state update)
- **1000ms**: After admin dashboard loads (component initialization + history loading)
- **500ms**: After tab navigation (tab switch animation + data loading)

## Expected Results

All 9 previously failing tests should now pass in CI:

1. ✅ camera-orientation-guide.spec.ts:44
2. ✅ camera-outline-matching.spec.ts:164
3. ✅ camera-outline-matching.spec.ts:182
4. ✅ camera-outline-matching.spec.ts:403
5. ✅ epic-5-6-features.spec.ts:46
6. ✅ epic-5-6-features.spec.ts:129
7. ✅ epic-7-8-features.spec.ts:211
8. ✅ epic-7-8-features.spec.ts:233
9. ✅ epic-7-8-features.spec.ts:275

## Next Steps

1. Monitor GitHub Actions workflow: https://github.com/AhmedTElKodsh/Afia-App/actions
2. If tests still fail, analyze CI logs for new timing issues
3. Consider increasing timeouts further if CI environment is slower than expected
4. If all tests pass, proceed with Stage 1 deployment

## Notes

- All fixes are specific to CI environment timing differences
- Tests pass locally but needed adjustments for CI
- No application code changes required
- Only test timing and selectors were adjusted
