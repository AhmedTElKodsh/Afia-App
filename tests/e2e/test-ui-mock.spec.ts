import { test, expect } from '@playwright/test';

test.describe('Mock Scan UI Action Test', () => {
  test('should display mock scan results correctly and allow interaction', async ({ page }) => {
    // 1. Setup Mock API Response for /analyze
    const mockResponse = {
      scanId: 'mock-scan-789',
      fillPercentage: 65,
      remainingMl: 975,
      confidence: 'high',
      aiProvider: 'mock-ai-gemini',
      latencyMs: 250,
      red_line_y_normalized: 650 // custom property used in ResultDisplay
    };
    
    await page.route('**/analyze', async (route) => {
      console.log('Intercepted /analyze request');
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockResponse)
      });
    });

    // 2. Navigate to Landing Page with SKU
    // Using iPhone 13-like viewport for mobile UI testing
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/?sku=afia-corn-1.5l');
    
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
    console.log('Triggering scan via __AFIA_TRIGGER_ANALYZE__...');
    await page.evaluate(async () => {
      window.__AFIA_TEST_MODE__ = true;
      console.log('Current window state:', {
        testMode: window.__AFIA_TEST_MODE__,
        hasTrigger: !!window.__AFIA_TRIGGER_ANALYZE__
      });

      // Wait for trigger to be available
      for (let i = 0; i < 100; i++) {
        if (window.__AFIA_TRIGGER_ANALYZE__) break;
        await new Promise(r => setTimeout(r, 100));
      }

      if (window.__AFIA_TRIGGER_ANALYZE__) {
        console.log('Found trigger, calling it...');
        window.__AFIA_TRIGGER_ANALYZE__();
        return "triggered";
      } else {
        console.error('Trigger NOT found after 10s');
        return "trigger_missing";
      }
    });

    // 5. Verify FillConfirm screen (Stage 1 of results)
    console.log('Waiting for .fill-confirm or .api-status-error...');
    // We also wait for error just in case the API call fails despite mocking
    const element = await Promise.race([
      page.waitForSelector('.fill-confirm', { timeout: 30000 }).then(() => 'success'),
      page.waitForSelector('.api-status-error', { timeout: 30000 }).then(() => 'error'),
      page.waitForSelector('.app-loading', { timeout: 30000 }).then(() => 'loading')
    ]);

    console.log('Detection result:', element);

    if (element === 'error') {
      const errorText = await page.locator('.api-status-error').inner_text();
      console.error('App showing error state:', errorText);
    }

    await expect(page.locator('.fill-confirm')).toBeVisible({ timeout: 10000 });    
    // Take screenshot of confirmation screen
    await page.screenshot({ path: 'test-output-1-confirm.png' });

    // 6. Click Confirm to see ResultDisplay
    console.log('Confirming fill level...');
    await page.click('button:has-text("Confirm")');

    // 7. Verify ResultDisplay screen
    console.log('Waiting for ResultDisplay screen...');
    await page.waitForSelector('.result-display', { timeout: 15000 });
    
    // Verify main metrics
    await expect(page.locator('.summary-item.remaining .summary-value')).toContainText('975ml');
    
    // Take final screenshot
    await page.screenshot({ path: 'test-output-2-results.png', fullPage: true });
    
    console.log('Test completed successfully!');
  });
});
