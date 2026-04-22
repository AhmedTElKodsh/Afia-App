import { test, expect } from '@playwright/test';
import { setupDefaultMocks } from './helpers/mockAPI';
import { testBottles } from './fixtures/testData';
import { triggerAnalyzeAndConfirm } from './helpers/flow';

/**
 * Epic 3: Continuous Improvement Loop - Feedback Tests
 */

test.describe('Epic 3: Feedback System', () => {

  test.beforeEach(async ({ page }) => {
    await setupDefaultMocks(page);
    
    // Use test_mode=1 to enable test features immediately
    await page.goto(`/?sku=${testBottles.filippoBerio.sku}&test_mode=1`);
    
    // Set mock state
    await page.evaluate(() => {
      localStorage.setItem('afia_privacy_accepted', 'true');
      localStorage.setItem('afia_onboarding_complete', 'true');
      localStorage.setItem('afia_mock_mode', 'true');
    });
    
    await page.reload();
  });

  /**
   * Navigates to camera view and triggers analysis to reach result + feedback state.
   */
  async function setupWithResult(page: import('@playwright/test').Page) {
    // Wait for app to be interactive
    const scanBtn = page.locator('button:has-text("SCAN")').first();
    await expect(scanBtn).toBeVisible({ timeout: 20000 });
    await scanBtn.click();

    // Trigger analysis using shared flow helper
    await triggerAnalyzeAndConfirm(page);

    // FeedbackGrid should be visible in result display
    await expect(page.locator('.feedback-grid-container')).toBeVisible({ timeout: 15000 });
  }

  test('should display feedback grid after scan', async ({ page }) => {
    await setupWithResult(page);

    // Feedback title (i18n key feedback.title = "Was this estimate accurate?")
    await expect(page.locator('text=accurate?')).toBeVisible();

    // All 4 rating buttons
    await expect(page.locator('button:has-text("About right")')).toBeVisible();
    await expect(page.locator('button:has-text("Too high")')).toBeVisible();
    await expect(page.locator('button:has-text("Too low")')).toBeVisible();
    await expect(page.locator('button:has-text("Way off")')).toBeVisible();
  });

  test('should auto-submit and show thank you for "About right"', async ({ page }) => {
    await setupWithResult(page);

    // "About right" auto-submits after 150ms
    await page.locator('button:has-text("About right")').click();

    // ResultDisplay shows .result-feedback-thanks - robust wait for state change
    await page.waitForFunction(() => {
      return document.querySelector('.result-feedback-thanks') !== null &&
             document.querySelector('.feedback-grid-container') === null;
    }, { timeout: 15000 });

    await expect(page.locator('.result-feedback-thanks')).toBeVisible();
    await expect(page.locator('.result-feedback-thanks')).toContainText('Thank you');
    
    // The feedback grid should be gone
    await expect(page.locator('.feedback-grid-container')).toBeHidden();
  });

  test('should show Submit Feedback button after selecting non-accurate rating', async ({ page }) => {
    await setupWithResult(page);

    // Select "Too low" — should NOT auto-submit
    await page.locator('button:has-text("Too low")').click();

    // Submit button appears for non-"about right" selections
    const submitBtn = page.locator('.feedback-submit-btn');
    await expect(submitBtn).toBeVisible({ timeout: 10000 });
  });

  test('should show thank you after submitting non-accurate feedback', async ({ page }) => {
    await setupWithResult(page);

    // Select "Way off"
    await page.locator('button:has-text("Way off")').click();
    
    const submitBtn = page.locator('.feedback-submit-btn');
    await expect(submitBtn).toBeVisible({ timeout: 5000 });

    // Submit
    await submitBtn.click();

    // ResultDisplay swaps FeedbackGrid for thank-you message - robust wait for transition
    await page.waitForFunction(() => {
      return document.querySelector('.result-feedback-thanks') !== null &&
             document.querySelector('.feedback-grid-container') === null;
    }, { timeout: 15000 });

    await expect(page.locator('.result-feedback-thanks')).toBeVisible();
    await expect(page.locator('.result-feedback-thanks')).toContainText('Thank you');
    await expect(page.locator('.feedback-grid-container')).toBeHidden();
  });

  test('should show thank you after submitting "Too high" feedback', async ({ page }) => {
    await setupWithResult(page);

    await page.locator('button:has-text("Too high")').click();
    
    const submitBtn = page.locator('.feedback-submit-btn');
    await expect(submitBtn).toBeVisible({ timeout: 5000 });
    
    await page.locator('.feedback-submit-btn').click();

    // Wait for transition
    await page.waitForFunction(() => {
      return document.querySelector('.result-feedback-thanks') !== null &&
             document.querySelector('.feedback-grid-container') === null;
    }, { timeout: 15000 });

    await expect(page.locator('.result-feedback-thanks')).toBeVisible();
    await expect(page.locator('.result-feedback-thanks')).toContainText('Thank you');
    await expect(page.locator('.feedback-grid-container')).toBeHidden();
    });
    });
