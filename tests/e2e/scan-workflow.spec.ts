import { test, expect } from '@playwright/test';
import { mockCamera, mockAnalyzeSuccess } from './helpers/mockAPI';
import { triggerAnalyzeAndConfirm } from './helpers/flow';

test.describe('Scan Workflow', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      window.localStorage.setItem('afia_privacy_accepted', 'true');
      (window as any).__AFIA_TEST_MODE__ = true;
    });
    await mockCamera(page);
    await mockAnalyzeSuccess(page);
  });

  test('complete scan flow with result display', async ({ page }) => {
    await page.goto('/?sku=afia-corn-1.5l');

    const startBtn = page.locator('button:has-text("START SMART SCAN"), button:has-text("Start Scan")').first();
    await expect(startBtn).toBeEnabled({ timeout: 5000 });
    await page.evaluate(() => {
      const btn = document.querySelector('button.qrl-cta') as HTMLButtonElement
        ?? Array.from(document.querySelectorAll('button')).find(
          b => b.textContent?.includes('START SMART SCAN') || b.textContent?.includes('Start Scan')
        ) as HTMLButtonElement;
      if (btn) btn.click();
    });

    await expect(page.locator('.camera-active, .camera-viewfinder, video').first()).toBeVisible({ timeout: 10000 });

    await triggerAnalyzeAndConfirm(page);

    await expect(page.locator('.result-display')).toBeVisible({ timeout: 15000 });
    await expect(page.locator('.result-metric__value').first()).toContainText(/ml/i);
  });
});
