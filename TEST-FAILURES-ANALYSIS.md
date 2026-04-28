# Test Failures Analysis & Fixes

## Executive Summary

11 E2E tests are failing due to 4 distinct root causes:
1. **Incorrect CSS selectors** in tests (guidance hint pill)
2. **Race condition** in AdminDashboard loading state
3. **Export buttons disabled** due to missing scan history initialization
4. **Analyzing overlay not appearing** due to mock API timing issues

## Detailed Analysis

### Issue 1: Guidance Hint Pill Selector (2 failures)

**Failing Tests:**
- `camera-outline-matching.spec.ts:149` - Visual Guidance › should show guidance hint text
- `camera-outline-matching.spec.ts:397` - Static Guidance Integration › should show guidance hint text

**Root Cause:**
Tests are looking for `.guidance-hint-pill` but the actual class is `.guidance-header-hint`

**Location:** `src/components/CameraViewfinder.tsx:266`
```tsx
<div className="guidance-header-hint">
  <span>{t('camera.guidanceHint')}</span>
  <span>{t('camera.guidanceHint2')}</span>
</div>
```

**Fix:** Update test selectors from `.guidance-hint-pill` to `.guidance-header-hint`

---

### Issue 2: Admin Password Input Disabled (1 failure)

**Failing Test:**
- `epic-5-6-features.spec.ts:46` - Admin Dashboard Authentication › should show error for incorrect password

**Root Cause:**
The password input is disabled while `isLoading` is true. The component starts with `isLoading: true` and only sets it to `false` after `fetchGlobalData()` completes. The test tries to fill the password before the component finishes its initial load.

**Location:** `src/components/AdminDashboard.tsx:234`
```tsx
<input
  id="admin-pw-input"
  type={showPassword ? 'text' : 'password'}
  className="password-input"
  disabled={isLoading}  // ← Starts as true
  ...
/>
```

**Fix:** Test should wait for the input to be enabled before filling it:
```typescript
const passwordInput = page.locator('input[type="password"]');
await expect(passwordInput).toBeEnabled({ timeout: 5000 });
await passwordInput.fill('definitely-wrong-password-12345');
```

---

### Issue 3: Export Buttons Disabled (3 failures)

**Failing Tests:**
- `epic-5-6-features.spec.ts:122` - Admin Dashboard Features › should show export options
- `epic-7-8-features.spec.ts:211` - CSV Export › should trigger CSV download from admin Export tab
- `epic-7-8-features.spec.ts:227` - CSV Export › should trigger JSON download from admin Export tab

**Root Cause:**
Export buttons are disabled when scan history is empty. The test's `beforeEach` seeds history in `addInitScript`, but the AdminDashboard component loads BEFORE the script runs, so it sees empty history initially.

**Location:** Tests seed history but timing is wrong
```typescript
test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    // This runs AFTER component mounts
    const mockScans = [...];
    localStorage.setItem('afia_scan_history', JSON.stringify(mockScans));
  });
});
```

**Fix:** Seed history BEFORE navigating to the page:
```typescript
await page.addInitScript(() => {
  const mockScans = [...];
  localStorage.setItem('afia_scan_history', JSON.stringify(mockScans));
});
await page.goto('/?mode=admin');  // Navigate AFTER seeding
```

---

### Issue 4: Scan Count Summary Shows 0 (1 failure)

**Failing Test:**
- `epic-7-8-features.spec.ts:263` - CSV Export › export tab shows scan count summary

**Root Cause:**
Same as Issue 3 - scan history not properly seeded before component reads it.

**Fix:** Same as Issue 3 - ensure history is seeded before navigation.

---

### Issue 5: Analyzing Overlay Not Appearing (5 failures)

**Failing Tests:**
- `camera-orientation-guide.spec.ts:44` - orientation guide disappears after capture
- `camera-outline-matching.spec.ts:164` - Manual Capture › should allow manual capture at any time
- `camera-outline-matching.spec.ts:179` - Manual Capture › should show shutter flash effect on capture
- `code-review-fixes.spec.ts:297` - Memory Leak Prevention › should not leak memory on multiple captures

**Root Cause:**
The capture button click triggers `handleCapture` → `handleAnalyze` → `setAppState("API_PENDING")`. However, the mock API response might be returning too quickly or the state update isn't completing before the test checks for the overlay.

**Flow:**
1. Test clicks `.camera-capture-btn`
2. `handleCapture(imageBase64)` is called
3. `handleAnalyze(imageBase64)` is called
4. `setAppState("API_PENDING")` is set
5. Component re-renders with `AnalyzingOverlay`
6. Test waits for `.analyzing-overlay` to appear

**Potential Issues:**
- Mock API might be responding synchronously
- React state update batching
- Test checking too quickly

**Fix:** Add a small delay in the mock API response to ensure state updates complete:
```typescript
export async function mockAnalyzeSuccess(page: Page) {
  await page.route(/\/analyze$/, async (route) => {
    // Add small delay to ensure state updates complete
    await new Promise(resolve => setTimeout(resolve, 100));
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({...}),
    });
  });
}
```

Alternatively, ensure the test waits for the state transition:
```typescript
await captureBtn.click();
// Wait for state to update
await page.waitForTimeout(100);
await page.waitForSelector('.analyzing-overlay', { timeout: 15000 });
```

---

## Summary of Fixes

### Test File Changes Required:

1. **tests/e2e/camera-outline-matching.spec.ts** (2 fixes)
   - Line 153: Change `.guidance-hint-pill` → `.guidance-header-hint`
   - Line 402: Change `.guidance-hint-pill` → `.guidance-header-hint`

2. **tests/e2e/epic-5-6-features.spec.ts** (2 fixes)
   - Line 60: Add `await expect(passwordInput).toBeEnabled()` before fill
   - Line 85-95: Move `addInitScript` before `goto` in beforeEach

3. **tests/e2e/epic-7-8-features.spec.ts** (3 fixes)
   - Line 211-227: Ensure history is seeded before navigation
   - Line 263: Same fix as above

4. **tests/e2e/camera-orientation-guide.spec.ts** (1 fix)
   - Line 69: Add small delay after capture click

5. **tests/e2e/code-review-fixes.spec.ts** (1 fix)
   - Line 334: Add timeout/retry logic for retake button

### Mock File Changes:

6. **tests/e2e/helpers/mockAPI.ts** (1 fix)
   - Add delay to `mockAnalyzeSuccess` to ensure state updates complete

---

## Priority Order

1. **High Priority** - Quick wins (selector fixes):
   - Fix guidance hint pill selectors (2 tests)

2. **Medium Priority** - Timing fixes:
   - Fix admin password input wait (1 test)
   - Fix export button history seeding (3 tests)

3. **Low Priority** - Complex timing:
   - Fix analyzing overlay appearance (5 tests)

---

## Testing Strategy

After applying fixes:
1. Run each test file individually to verify fixes
2. Run full suite to check for regressions
3. Add comments to tests explaining timing requirements
4. Consider adding helper functions for common wait patterns
