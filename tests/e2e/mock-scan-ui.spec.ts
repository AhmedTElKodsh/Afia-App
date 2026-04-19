import { test, expect } from '@playwright/test';

test.describe('Mock Scan UI Test', () => {
  test('should display mock scan results correctly', async ({ page }) => {
    // 1. Setup Mock API Response
    const mockResponse = {
      scanId: 'mock-scan-123',
      fillPercentage: 65,
      remainingMl: 975,
      confidence: 'high',
      aiProvider: 'mock-provider',
      latencyMs: 150
    };
    
    await page.route('**/analyze', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockResponse)
      });
    });

    // 2. Navigate to Landing Page with SKU
    await page.goto('/?sku=afia-corn-1.5l');
    
    // Wait for the UI to be ready
    await page.waitForSelector('button:has-text("START SMART SCAN"), button:has-text("Start Scan")');

    // 3. Setup Test Mode and Privacy
    await page.addInitScript(() => {
      window.localStorage.setItem('afia_privacy_accepted', 'true');
      window.localStorage.setItem('afia_test_mode', 'true');
      window.__AFIA_TEST_MODE__ = true;
    });
    
    // Reload to apply init scripts/localStorage
    await page.reload();
    await page.waitForLoadState('networkidle');

    // 4. Trigger Scan via hook
    // We wait for the START button again to be sure the app is loaded after reload
    await page.waitForSelector('button:has-text("START SMART SCAN"), button:has-text("Start Scan")');

    await page.evaluate(async () => {
      // Re-assert test mode
      window.__AFIA_TEST_MODE__ = true;
      
      // Give React several seconds to run the useEffect that sets up the trigger
      // especially if it's waiting for model loading or other async stuff
      for (let i = 0; i < 100; i++) {
        if (window.__AFIA_TRIGGER_ANALYZE__) break;
        await new Promise(r => setTimeout(r, 100));
      }

      if (window.__AFIA_TRIGGER_ANALYZE__) {
        window.__AFIA_TRIGGER_ANALYZE__();
      } else {
        throw new Error("__AFIA_TRIGGER_ANALYZE__ hook not found even after waiting 10s");
      }
    });

    // 5. Verify Results
    // Wait for the results screen
    await page.waitForSelector('.result-display, .fill-confirm', { timeout: 15000 });
    
    // Check for mock values in UI
    const content = await page.content();
    expect(content).toContain('65');
    
    // Take a screenshot for visual verification
    await page.screenshot({ path: 'mock-scan-ui-result.png', fullPage: true });
  });
});
