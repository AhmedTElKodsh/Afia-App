# Party Mode Analysis: Camera Outline Matching Test Failures

## Problem Identified

Two E2E tests were consistently failing:
- `should allow manual capture at any time`
- `should show shutter flash effect on capture`

**Error:** `.analyzing-overlay` element not visible within 10-second timeout

## Root Cause Analysis

### Investigation by the Team

🧪 **Quinn (QA Engineer)** identified that the tests were timing out waiting for the analyzing overlay to appear, suggesting a state transition issue.

💻 **Amelia (Developer)** traced the code flow:
1. `handleCapture` → `handleAnalyze` → should set `API_PENDING` state
2. Found early return guard in `handleAnalyze` (line 204): `if (!img || !selectedSku) return;`
3. If `selectedSku` is missing, the function exits without setting `API_PENDING` state
4. Without `API_PENDING` state, `AnalyzingOverlay` never renders

🏗️ **Winston (Architect)** identified the missing test environment configuration:
- The test URL was `/?sku=afia-corn-1.5l`
- Missing `test_mode=1` parameter meant:
  - Privacy/onboarding screens might block camera access
  - Mock mode might not be enabled
  - Test environment not properly configured

## The Fix

**File:** `tests/e2e/camera-outline-matching.spec.ts`

**Change:** Added `&test_mode=1` parameter to the test URL

```typescript
// Before:
await page.goto('/?sku=afia-corn-1.5l');

// After:
await page.goto('/?sku=afia-corn-1.5l&test_mode=1');
```

## What `test_mode=1` Does

From `src/App.tsx` (lines 62-68):
```typescript
if (import.meta.env.DEV && params.get("test_mode") === "1") {
  window.__AFIA_TEST_MODE__ = true;
  localStorage.setItem('afia_privacy_accepted', 'true');
  localStorage.setItem('afia_onboarding_complete', 'true');
  localStorage.setItem('afia_mock_mode', 'true');
}
```

This ensures:
- ✅ Privacy acceptance is bypassed
- ✅ Onboarding is skipped
- ✅ Mock API mode is enabled
- ✅ Test environment is properly configured

## Testing the Fix

To verify the fix works, run:

```bash
# Start dev server (in one terminal)
npm run dev

# Run the specific failing tests (in another terminal)
npx playwright test tests/e2e/camera-outline-matching.spec.ts --grep "Manual Capture"
```

Expected result: Both tests should now pass ✅

## Additional Recommendations

1. **Audit other test files** - Check if other E2E tests are missing `test_mode=1`
2. **Create a test helper** - Centralize URL construction with test mode enabled
3. **Add defensive logging** - Consider adding console.warn when `handleAnalyze` exits early

## Team Credits

- 🧪 Quinn: Test analysis and timeout investigation
- 💻 Amelia: Code tracing and implementation fix
- 🏗️ Winston: Architecture review and root cause identification
