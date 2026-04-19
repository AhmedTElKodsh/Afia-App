import { test, expect } from '@playwright/test';
import { triggerAnalyzeAndConfirm } from './helpers/flow';

test.describe('Mock Scan UI Action Test', () => {
  test('should display mock scan results correctly and allow interaction', async ({ page }) => {
    // 1. Setup Mock API Response for /analyze BEFORE navigation
    const mockResponse = {
      scanId: 'mock-scan-789',
      fillPercentage: 65,
      remainingMl: 975,
      confidence: 'high',
      aiProvider: 'mock-ai-gemini',
      latencyMs: 250,
      red_line_y_normalized: 650
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
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/?sku=afia-corn-1.5l');
    await page.waitForLoadState('networkidle');

    // 4. Trigger analysis and handle fill confirmation using shared helper
    await triggerAnalyzeAndConfirm(page);

    // 5. Verify ResultDisplay screen
    await expect(page.locator('.result-display')).toBeVisible({ timeout: 5000 });
    
    // Verify main metrics
    await expect(page.locator('.summary-item.remaining .summary-value, .result-metric__value').first())
      .toContainText(/975|ml/i);
  });
});
