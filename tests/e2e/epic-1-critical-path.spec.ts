import { test, expect } from '@playwright/test';
import { mockAnalyzeSuccess, mockAnalyzeLowConfidence, mockCamera } from './helpers/mockAPI';
import { testBottles } from './fixtures/testData';

import { triggerAnalyzeAndConfirm } from './helpers/flow';

test.describe('Epic 1: Core Scan Experience', () => {

  test.beforeEach(async ({ page }) => {
    // Inject privacy acceptance and test mode BEFORE navigation
    await page.addInitScript(() => {
      window.localStorage.setItem('afia_privacy_accepted', 'true');
      (window as any).__AFIA_TEST_MODE__ = true;
    });
    // Camera mock only — each test registers its own analyze route
    await mockCamera(page);
  });

  /**
   * Navigate to the app, click START SMART SCAN, and wait for camera + capture button.
   * Privacy is pre-accepted via addInitScript so QrLanding renders the enabled button directly.
   */
  async function navigateToCamera(page: import('@playwright/test').Page) {
    await page.goto(`/?sku=${testBottles.afiaCorn15L.sku}`);

    const startBtn = page.locator('button:has-text("START SMART SCAN"), button:has-text("Start Scan")').first();
    await expect(startBtn).toBeEnabled({ timeout: 5000 });

    // Use evaluate to bypass Playwright's stability check on animated buttons
    await page.evaluate(() => {
      const btn = document.querySelector('button.qrl-cta') as HTMLButtonElement
        ?? Array.from(document.querySelectorAll('button')).find(
          b => b.textContent?.includes('START SMART SCAN') || b.textContent?.includes('Start Scan')
        ) as HTMLButtonElement;
      if (btn) btn.click();
    });

    await expect(page.locator('.camera-active').first()).toBeVisible({ timeout: 15000 });
    await expect(page.locator('.camera-capture-btn')).toBeEnabled({ timeout: 10000 });
  }

test('Critical Path: QR -> Privacy -> Scan -> Results', async ({ page }) => {
    await mockAnalyzeSuccess(page);
    await navigateToCamera(page);

    await triggerAnalyzeAndConfirm(page);

    await expect(page.locator('.result-metric__value').first()).toContainText(/ml/i);
  });

  test('Interaction: should allow cancel/retake during analysis', async ({ page }) => {
    // Hanging route: never responds so the AnalyzingOverlay stays visible long enough to interact
    await page.route(/.*\/analyze/, async (_route) => {
      await new Promise(() => {}); // intentional hang; page teardown cleans up
    });

    await navigateToCamera(page);

    // Use the test hook to trigger analyze directly — bypasses camera capture machinery
    await page.evaluate(() => {
      (window as any).__AFIA_TRIGGER_ANALYZE__?.();
    });

    // AnalyzingOverlay is visible while pending
    const cancelBtn = page.locator('.analyzing-cancel-btn, button:has-text("Cancel")').first();
    await expect(cancelBtn).toBeVisible({ timeout: 10000 });

    await page.evaluate(() => {
      (document.querySelector('.analyzing-cancel-btn') as HTMLButtonElement)?.click();
    });

    // Should return to camera
    await expect(page.locator('.camera-active')).toBeVisible();
  });

  test('UI State: should handle low confidence with specific badge', async ({ page }) => {
    await mockAnalyzeLowConfidence(page);
    await navigateToCamera(page);

    await triggerAnalyzeAndConfirm(page);

    // ConfidenceBadge uses BEM modifier: confidence-badge--low
    await expect(page.locator('.confidence-badge--low').first()).toBeVisible();
    await expect(page.locator('button:has-text("Retake")').first()).toBeVisible();
  });

  test('Error Handling: should show unknown bottle message for invalid SKU', async ({ page }) => {
    await page.goto('/?sku=invalid-sku-123');
    await expect(page.locator('h1, .unknown-title')).toContainText(/not (yet )?supported|unknown/i);
  });

  test('Privacy: start button should be disabled until checkbox is checked', async ({ page }) => {
    // This test verifies the privacy gate — remove the pre-seeded key so the button starts disabled
    await page.addInitScript(() => {
      window.localStorage.removeItem('afia_privacy_accepted');
    });
    await page.goto(`/?sku=${testBottles.filippoBerio.sku}`);
    await page.waitForLoadState('networkidle');

    const startBtn = page.locator('button:has-text("START SMART SCAN"), button:has-text("Start Scan")').first();
    await expect(startBtn).toBeDisabled();

    // Check it
    await page.locator('label:has-text("I agree to privacy terms")').first().click({ force: true });
    await expect(startBtn).toBeEnabled();
  });
});
