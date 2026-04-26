# Quick Test Guide

## Before Running Tests

### 1. Clean Up Hanging Processes (if tests were interrupted)
```bash
# Windows
taskkill /F /IM node.exe /T
taskkill /F /IM chrome.exe /T

# Then restart your terminal
```

### 2. Ensure Dev Server is Running
```bash
# Terminal 1: Start dev server
npm run dev

# Wait for: "Local: http://localhost:5173"
```

## Running Tests

### All Camera Tests
```bash
# Terminal 2: Run tests
npx playwright test tests/e2e/camera-outline-matching.spec.ts --project=chromium
```

### Specific Test Groups
```bash
# Outline Geometry tests only
npx playwright test tests/e2e/camera-outline-matching.spec.ts --grep "Outline Geometry"

# Color Transitions tests only
npx playwright test tests/e2e/camera-outline-matching.spec.ts --grep "Color Transitions"

# Auto-Lock tests only
npx playwright test tests/e2e/camera-outline-matching.spec.ts --grep "Auto-Lock"

# Manual Mode tests only
npx playwright test tests/e2e/camera-outline-matching.spec.ts --grep "Manual Mode"
```

### Single Test
```bash
# By line number
npx playwright test tests/e2e/camera-outline-matching.spec.ts:75

# By test name
npx playwright test -g "should render precision-calibrated SVG outline"
```

### Debug Mode
```bash
# Opens browser and pauses at each step
npx playwright test --debug tests/e2e/camera-outline-matching.spec.ts
```

### UI Mode (Interactive)
```bash
# Opens interactive test runner
npx playwright test --ui
```

## Viewing Results

### HTML Report
```bash
# Generate and open report
npx playwright test --reporter=html
npx playwright show-report
```

### Test Artifacts
- Screenshots: `test-results/*/test-failed-*.png`
- Videos: `test-results/*/video.webm`
- Traces: `test-results/*/trace.zip`

## Common Issues

### Issue: Tests timeout waiting for video
**Solution:** Check that `mockCamera()` is called in `beforeEach` and not duplicated in individual tests.

### Issue: Dev server not starting
**Solution:** 
```bash
# Kill port 5173
netstat -ano | findstr :5173
taskkill /F /PID <PID>

# Restart dev server
npm run dev
```

### Issue: Tests hang indefinitely
**Solution:**
```bash
# Kill all Node processes
taskkill /F /IM node.exe /T

# Restart terminal and try again
```

### Issue: "Camera not available" errors
**Solution:** Tests use mock camera. Check that `mockCamera()` is imported and called:
```typescript
import { mockCamera } from './helpers/mockAPI';

test.beforeEach(async ({ page }) => {
  await mockCamera(page);
});
```

## Test Status Quick Check

Run this to see which tests pass/fail:
```bash
npx playwright test tests/e2e/camera-outline-matching.spec.ts --reporter=list
```

Expected results:
- ✅ 34+ tests passing
- ⚠️ 6 tests may timeout (auto-capture tests with 2.5s hold)

## Tips

1. **Run tests in order**: Start with simple tests (Outline Geometry) before complex ones (Auto-Capture)
2. **Use --grep**: Filter tests to run specific groups
3. **Check artifacts**: Screenshots show exactly what failed
4. **Increase timeout**: For slow machines, edit `playwright.config.ts`:
   ```typescript
   timeout: 90000, // 90 seconds instead of 60
   ```
5. **Parallel execution**: Tests run in parallel by default. For debugging, use:
   ```bash
   npx playwright test --workers=1
   ```

## Success Criteria

Tests are working correctly when:
- ✅ Dev server starts on port 5173
- ✅ Camera mock initializes video element
- ✅ Bottle outline renders on screen
- ✅ Color transitions work (RED → GREEN)
- ✅ Manual capture button is functional
- ✅ Most tests complete within 60 seconds

## Need Help?

Check these files:
- `TEST_FIXES_SUMMARY.md` - Detailed fix explanations
- `E2E_TEST_STATUS.md` - Complete test status report
- `playwright.config.ts` - Test configuration
- `tests/e2e/helpers/mockAPI.ts` - Mock implementations
