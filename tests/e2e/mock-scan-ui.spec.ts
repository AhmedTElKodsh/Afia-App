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

    // 2. Setup Test Mode and Privacy BEFORE navigation
    await page.addInitScript(() => {
      window.localStorage.setItem('afia_privacy_accepted', 'true');
      window.localStorage.setItem('afia_test_mode', 'true');
      (window as any).__AFIA_TEST_MODE__ = true;
    });

    // 3. Navigate to Landing Page with SKU
    await page.goto('/?sku=afia-corn-1.5l');
    await page.waitForLoadState('networkidle');

    // 4. Wait for the START button to be ready
    await page.waitForSelector('button:has-text("START SMART SCAN"), button:has-text("Start Scan")', { timeout: 10000 });

    // 5. Trigger Scan via hook
    await page.evaluate(async () => {
      // Re-assert test mode
      (window as any).__AFIA_TEST_MODE__ = true;
      
      // Wait for trigger to be available
      for (let i = 0; i < 100; i++) {
        if ((window as any).__AFIA_TRIGGER_ANALYZE__) break;
        await new Promise(r => setTimeout(r, 100));
      }

      if ((window as any).__AFIA_TRIGGER_ANALYZE__) {
        (window as any).__AFIA_TRIGGER_ANALYZE__();
      } else {
        throw new Error("__AFIA_TRIGGER_ANALYZE__ hook not found even after waiting 10s");
      }
    });

    // 6. Wait for results - use Promise.race to handle both fill-confirm and direct result display with longer timeouts
    await Promise.race([
      page.waitForSelector('.result-display', { timeout: 30000 }),
      page.waitForSelector('.fill-confirm', { timeout: 30000 })
    ]);
    
    // If fill-confirm appeared, click it
    const fillConfirm = page.locator('.fill-confirm');
    if (await fillConfirm.isVisible()) {
      await page.evaluate(() => {
        const btn = Array.from(document.querySelectorAll('button')).find(
          b => b.textContent?.includes('Confirm') || b.className.includes('btn-success')
        ) as HTMLButtonElement | undefined;
        if (btn) btn.click();
      });
      await page.waitForSelector('.result-display', { timeout: 15000 });
    }
    
    // 7. Verify Results with longer timeout
    await expect(page.locator('.result-display')).toBeVisible({ timeout: 10000 });
    
    // Check for mock values in UI
    const content = await page.content();
    expect(content).toContain('65');
    
    // Take a screenshot for visual verification
    await page.screenshot({ path: 'mock-scan-ui-result.png', fullPage: true });
  });
});
