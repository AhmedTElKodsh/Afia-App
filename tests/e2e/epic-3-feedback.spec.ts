import { test, expect } from '@playwright/test';
import { mockCamera, mockAnalyzeSuccess } from './helpers/mockAPI';
import { testBottles } from './fixtures/testData';

import { triggerAnalyzeAndConfirm } from './helpers/flow';

/**
 * Epic 3: Continuous Improvement Loop - Feedback Tests
 *
 * The FeedbackGrid component shows for ALL users (no employee gating) after analysis.
 * It collects accuracy ratings: "About right" (1-tap), "Too high", "Too low", "Way off".
 * "About right" auto-submits after 150ms; others require clicking "Submit Feedback".
 * No API call is made — feedback just updates local state.
 */

test.describe('Epic 3: Feedback System', () => {

  /**
   * Navigates to camera view and triggers analysis to reach result + feedback state.
   * Identical to the navigateToCamera + trigger pattern from passing critical-path tests.
   */
  async function setupWithResult(page: import('@playwright/test').Page) {
    await page.addInitScript(() => {
      window.localStorage.setItem('afia_privacy_accepted', 'true');
      (window as any).__AFIA_TEST_MODE__ = true;
    });

    await mockCamera(page);
    await mockAnalyzeSuccess(page);

    await page.goto(`/?sku=${testBottles.filippoBerio.sku}`);
    await page.waitForLoadState('networkidle');

    // Navigate to camera (same evaluate approach as working critical-path tests)
    await page.evaluate(() => {
      const btn = (document.querySelector('button.qrl-cta') as HTMLButtonElement)
        ?? (Array.from(document.querySelectorAll('button')).find(
          b => !b.disabled && (
            (b as HTMLButtonElement).textContent?.includes('START SMART SCAN') ||
            (b as HTMLButtonElement).textContent?.includes('Start Scan')
          )
        ) as HTMLButtonElement);
      if (btn) btn.click();
    });

    // We might transition very fast through camera -> pending -> confirm
    // So we don't strictly wait for .camera-active if we are already at confirm/results
    
    // Trigger analysis using shared robust helper which handles the whole chain
    await triggerAnalyzeAndConfirm(page);

    // FeedbackGrid should be visible in result display
    await expect(page.locator('.feedback-grid-container')).toBeVisible({ timeout: 5000 });
  }

  test('should display feedback grid after scan', async ({ page }) => {
    await setupWithResult(page);

    // Feedback title (i18n key feedback.title = "Was this estimate accurate?")
    await expect(page.locator('text=Was this estimate accurate?')).toBeVisible();

    // All 4 rating buttons
    await expect(page.locator('button:has-text("About right")')).toBeVisible();
    await expect(page.locator('button:has-text("Too high")')).toBeVisible();
    await expect(page.locator('button:has-text("Too low")')).toBeVisible();
    await expect(page.locator('button:has-text("Way off")')).toBeVisible();
  });

  test('should auto-submit and show thank you for "About right"', async ({ page }) => {
    await setupWithResult(page);

    // "About right" auto-submits after 150ms → ResultDisplay replaces FeedbackGrid with thanks div
    await page.locator('button:has-text("About right")').click();

    // ResultDisplay shows .result-feedback-thanks with "Thank you! 🙏"
    await expect(page.locator('.result-feedback-thanks')).toBeVisible({ timeout: 3000 });
    // The feedback grid should be gone
    await expect(page.locator('.feedback-grid-container')).toBeHidden({ timeout: 3000 });
  });

  test('should show Submit Feedback button after selecting non-accurate rating', async ({ page }) => {
    await setupWithResult(page);

    // Select "Too low" — should NOT auto-submit
    await page.locator('button:has-text("Too low")').click();

    // Submit button appears for non-"about right" selections
    await expect(page.locator('.feedback-submit-btn')).toBeVisible({ timeout: 3000 });
    await expect(page.locator('button:has-text("Submit Feedback")')).toBeVisible();
  });

  test('should show thank you after submitting non-accurate feedback', async ({ page }) => {
    await setupWithResult(page);

    // Select "Way off"
    await page.locator('button:has-text("Way off")').click();
    await expect(page.locator('.feedback-submit-btn')).toBeVisible({ timeout: 3000 });

    // Submit
    await page.locator('.feedback-submit-btn').click();

    // ResultDisplay swaps FeedbackGrid for thank-you message
    await expect(page.locator('.result-feedback-thanks')).toBeVisible({ timeout: 3000 });
    await expect(page.locator('.feedback-grid-container')).toBeHidden({ timeout: 3000 });
  });

  test('should show thank you after submitting "Too high" feedback', async ({ page }) => {
    await setupWithResult(page);

    await page.locator('button:has-text("Too high")').click();
    await expect(page.locator('.feedback-submit-btn')).toBeVisible({ timeout: 3000 });
    await page.locator('.feedback-submit-btn').click();

    await expect(page.locator('.result-feedback-thanks')).toBeVisible({ timeout: 3000 });
    await expect(page.locator('.feedback-grid-container')).toBeHidden({ timeout: 3000 });
  });
});
