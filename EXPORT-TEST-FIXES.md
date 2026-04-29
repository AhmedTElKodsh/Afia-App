# Export Test Fixes

## Problem
Three tests in `tests/e2e/epic-7-8-features.spec.ts` were failing:
1. CSV export button remained disabled
2. JSON export button remained disabled
3. Scan count showed 0 instead of expected value (≥2)

## Root Cause
The mock API response in `seedHistoryAndLogin()` was missing the required `timestamp` field. The `AdminScan` interface requires:
- `scanId: string`
- `timestamp: string` ← **This was missing**
- `sku: string`
- `fillPercentage: number`
- `confidence: string`
- `aiProvider: string`
- `latencyMs: number`

Without timestamps, the scans couldn't be properly processed, causing:
- `globalScans` array to be empty/invalid
- Export buttons to remain disabled (they check `filteredScans.length === 0`)
- Scan count to show 0

## Fixes Applied

### 1. Added Missing Timestamp Field
Updated the mock API response in `seedHistoryAndLogin()` to include timestamps:

```typescript
const mockScans = [
  {
    scanId: 'export-1',
    sku: 'afia-corn-1.5l',
    timestamp: new Date(Date.now() - 86400000).toISOString(), // ← Added
    fillPercentage: 80,
    confidence: 'high',
    aiProvider: 'gemini',
    latencyMs: 1234,
  },
  {
    scanId: 'export-2',
    sku: 'afia-corn-1.5l',
    timestamp: new Date().toISOString(), // ← Added
    fillPercentage: 55,
    confidence: 'medium',
    aiProvider: 'gemini',
    latencyMs: 2345,
  },
];
```

### 2. Improved Test Reliability
Replaced arbitrary `waitForTimeout()` calls with proper data-driven waits:

**Before:**
```typescript
await page.waitForTimeout(500);
const csvBtn = page.locator('.export-btn-card').filter({ hasText: /CSV/i });
await expect(csvBtn).not.toBeDisabled({ timeout: 10000 });
```

**After:**
```typescript
// Wait for scan count to be visible and greater than 0 (indicates data loaded)
const summaryCount = page.locator('.export-summary-count');
await expect(summaryCount).toBeVisible({ timeout: 5000 });
await page.waitForFunction(() => {
  const countEl = document.querySelector('.export-summary-count');
  return countEl && Number(countEl.textContent) > 0;
}, { timeout: 5000 });

const csvBtn = page.locator('.export-btn-card').filter({ hasText: /CSV/i });
await expect(csvBtn).not.toBeDisabled({ timeout: 10000 });
```

This ensures tests wait for actual data to load before attempting interactions.

### 3. Updated Scan Count Test
Simplified the scan count test to wait for the count to reach the expected value:

```typescript
// Wait for the count to be updated from the API
await page.waitForFunction(() => {
  const countEl = document.querySelector('.export-summary-count');
  return countEl && Number(countEl.textContent) >= 2;
}, { timeout: 5000 });
```

## Files Modified
- `tests/e2e/epic-7-8-features.spec.ts` - Added timestamps to mock data and improved test waits

## Expected Outcome
All three tests should now pass:
- ✅ CSV export button becomes enabled and triggers download
- ✅ JSON export button becomes enabled and triggers download
- ✅ Scan count displays correct value (2)

## To Verify
Run the tests:
```bash
npm run test:e2e -- tests/e2e/epic-7-8-features.spec.ts -g "CSV Export"
```
