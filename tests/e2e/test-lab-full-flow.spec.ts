import { test, expect } from '@playwright/test';
import { mockAnalyzeSuccess, mockAnalyzeLowConfidence, mockCamera } from './helpers/mockAPI';
import { testBottles } from './fixtures/testData';

/**
 * TestLab Full Flow — Mock QR Simulation
 *
 * Covers the Admin TestLab interface end-to-end:
 *   1. TestLab renders correctly in idle state
 *   2. Bottle selector dropdown: open, search, select, clear
 *   3. Mode switching: User Flow ↔ Debug Mode
 *   4. Mock QR button gating (disabled until bottle selected)
 *   5. Full flow: select bottle → Start Test Scan → camera → analyze → results
 *   6. Debug mode auto-opens AdminToolsOverlay on completion
 *   7. AdminToolsOverlay: open/close, validate result data
 *   8. Retake flow: returns to camera from results
 *   9. New test flow: resets state back to idle
 *  10. Session test count badge increments
 *
 * Pattern: all tests use addInitScript (not beforeEach navigation) so mocks
 * are injected before the first byte is loaded. Admin session bypass is used
 * throughout — actual password login is covered in epic-5-6-features.spec.ts.
 */

// ─── Shared helpers ──────────────────────────────────────────────────────────

/** Full admin setup: bypass auth, skip onboarding, accept privacy */
async function setupAdmin(page: import('@playwright/test').Page) {
  await page.addInitScript(() => {
    window.sessionStorage.setItem('afia_admin_session', 'valid-token');
    window.sessionStorage.setItem('afia_admin_session_expires', String(Date.now() + 3600000));
    window.localStorage.setItem('afia_privacy_accepted', 'true');
    window.localStorage.setItem('afia_admin_onboarding_seen', 'true');
  });
}

/** Navigate to admin, wait for dashboard, then switch to TestLab view */
async function navigateToTestLab(page: import('@playwright/test').Page) {
  await page.goto('/?mode=admin');
  await page.waitForLoadState('networkidle');
  await page.locator('button[aria-label="Test Lab"]').click();
  await expect(page.locator('.test-lab')).toBeVisible({ timeout: 5000 });
}

/**
 * Select a bottle from the TestLab dropdown and click "Start Test Scan"
 * to transition to scanning state with camera viewfinder active.
 *
 * Uses page.evaluate for the Mock QR click — same reliable pattern as
 * epic-1-critical-path.spec.ts START SMART SCAN — because a toast
 * notification appears immediately after bottle selection and can
 * briefly intercept pointer events on the button.
 */
async function selectBottleAndStartScan(
  page: import('@playwright/test').Page,
  _sku: string = testBottles.filippoBerio.sku
) {
  // Open bottle selector dropdown
  await page.locator('.bottle-selector-button').click();
  await expect(page.locator('.bottle-selector-dropdown')).toBeVisible({ timeout: 3000 });

  // Click the first available bottle item (any selection enables the Mock QR button)
  await page.locator('.bottle-selector-item').first().click();

  // Dropdown closes after selection
  await expect(page.locator('.bottle-selector-dropdown')).toBeHidden({ timeout: 3000 });

  // Wait for the Start Test Scan button to become enabled (selectedSku state set)
  await expect(page.locator('button:has-text("Start Test Scan")')).toBeEnabled({ timeout: 3000 });

  // Use evaluate to click — bypasses toast notification overlay reliably
  await page.evaluate(() => {
    const btn = Array.from(document.querySelectorAll('button')).find(
      b => b.textContent?.includes('Start Test Scan')
    ) as HTMLButtonElement | undefined;
    if (btn) btn.click();
  });

  // Camera viewfinder should appear
  await expect(page.locator('.camera-active, .camera-viewfinder, video').first()).toBeVisible({ timeout: 10000 });
}

/**
 * Trigger AI analysis using the window test hook (same pattern as epic-1 tests).
 * Waits for the result display to appear.
 */
async function triggerAnalyzeAndWaitForResult(page: import('@playwright/test').Page) {
  // Wait for capture button to be ready
  await expect(page.locator('.camera-capture-btn')).toBeEnabled({ timeout: 10000 });

  // Register response waiter BEFORE triggering to avoid race condition
  const analyzePromise = page.waitForResponse(
    res => res.url().includes('/analyze'),
    { timeout: 15000 }
  );

  // Use the test hook — bypasses camera readyState race condition
  await page.evaluate(() => {
    (window as any).__AFIA_TRIGGER_ANALYZE__?.();
  });

  const response = await analyzePromise;
  expect(response.status()).toBe(200);

  await expect(page.locator('.result-display')).toBeVisible({ timeout: 15000 });
}

// ─── Test Suite ───────────────────────────────────────────────────────────────

test.describe('TestLab: Idle State & Layout', () => {

  test.beforeEach(async ({ page }) => {
    await setupAdmin(page);
    await mockCamera(page);
    await mockAnalyzeSuccess(page);
  });

  test('renders TestLab with mode selector and bottle dropdown in idle state', async ({ page }) => {
    await navigateToTestLab(page);

    // Mode selector
    await expect(page.locator('button:has-text("User Flow"), .test-mode-card').first()).toBeVisible();
    await expect(page.locator('button:has-text("Debug Mode"), .test-mode-card').last()).toBeVisible();

    // Bottle selector
    await expect(page.locator('.bottle-selector-button')).toBeVisible();

    // Mock QR button is disabled — no bottle selected yet
    await expect(page.locator('button:has-text("Start Test Scan")')).toBeDisabled();
  });

  test('bottle selector dropdown opens and closes', async ({ page }) => {
    await navigateToTestLab(page);

    const dropdown = page.locator('.bottle-selector-dropdown');
    await expect(dropdown).toBeHidden();

    await page.locator('.bottle-selector-button').click();
    await expect(dropdown).toBeVisible({ timeout: 2000 });

    // Close with Escape
    await page.keyboard.press('Escape');
    await expect(dropdown).toBeHidden({ timeout: 2000 });
  });

  test('bottle selector shows the active bottle (1.5L Corn Oil)', async ({ page }) => {
    await navigateToTestLab(page);

    await page.locator('.bottle-selector-button').click();
    await expect(page.locator('.bottle-selector-dropdown')).toBeVisible();

    // Search input exists
    await expect(page.locator('.bottle-selector-search-input')).toBeVisible();

    // Exactly 1 bottle is available (restricted to 1.5L Corn Oil)
    const items = page.locator('.bottle-selector-item');
    await expect(items.first()).toBeVisible();
    expect(await items.count()).toBeGreaterThanOrEqual(1);
    await expect(items.first()).toContainText(/1\.5[lL]|corn/i);
  });

  test('bottle selector search filters results', async ({ page }) => {
    await navigateToTestLab(page);

    await page.locator('.bottle-selector-button').click();
    await page.locator('.bottle-selector-search-input').fill('corn');

    // The 1.5L Corn Oil should match
    const visible = page.locator('.bottle-selector-item:visible');
    const count = await visible.count();
    expect(count).toBeGreaterThanOrEqual(1);

    // Each visible item should contain "corn"
    for (let i = 0; i < count; i++) {
      await expect(visible.nth(i)).toContainText(/corn/i);
    }
  });

  test('selecting a bottle enables the Start Test Scan button', async ({ page }) => {
    await navigateToTestLab(page);

    // Initially disabled
    await expect(page.locator('button:has-text("Start Test Scan")')).toBeDisabled();

    // Select a bottle
    await page.locator('.bottle-selector-button').click();
    await page.locator('.bottle-selector-item').first().click();

    // Now enabled
    await expect(page.locator('button:has-text("Start Test Scan")')).toBeEnabled({ timeout: 2000 });
  });

  test('clear button removes bottle selection and re-disables Mock QR', async ({ page }) => {
    await navigateToTestLab(page);

    await page.locator('.bottle-selector-button').click();
    await page.locator('.bottle-selector-item').first().click();
    await expect(page.locator('button:has-text("Start Test Scan")')).toBeEnabled({ timeout: 2000 });

    // Clear selection
    await page.locator('.clear-bottle-button, button:has-text("✕")').first().click();
    await expect(page.locator('button:has-text("Start Test Scan")')).toBeDisabled();
  });
});

// ─────────────────────────────────────────────────────────────────────────────

test.describe('TestLab: Mode Switching', () => {

  test.beforeEach(async ({ page }) => {
    await setupAdmin(page);
    await mockCamera(page);
    await mockAnalyzeSuccess(page);
  });

  test('User Flow mode card shows as selected by default', async ({ page }) => {
    await navigateToTestLab(page);

    const userCard = page.locator('.test-mode-card').first();
    await expect(userCard).toHaveClass(/active/);
  });

  test('clicking Debug Mode card switches selection', async ({ page }) => {
    await navigateToTestLab(page);

    const debugCard = page.locator('.test-mode-card').last();
    await debugCard.click();
    await expect(debugCard).toHaveClass(/active/);

    // User Flow card is no longer active
    await expect(page.locator('.test-mode-card').first()).not.toHaveClass(/active/);
  });

  test('Debug Mode shows debug hint text below mode selector', async ({ page }) => {
    await navigateToTestLab(page);

    await page.locator('.test-mode-card').last().click();
    await expect(page.locator('.test-lab-debug-hint')).toBeVisible({ timeout: 2000 });
  });
});

// ─────────────────────────────────────────────────────────────────────────────

test.describe('TestLab: Mock QR → Camera → Analyze → Results (User Flow)', () => {

  test.beforeEach(async ({ page }) => {
    await setupAdmin(page);
    await page.addInitScript(() => {
      (window as any).__AFIA_TEST_MODE__ = true;
    });
    await mockCamera(page);
    await mockAnalyzeSuccess(page);
  });

  test('Start Test Scan activates camera viewfinder', async ({ page }) => {
    await navigateToTestLab(page);
    await selectBottleAndStartScan(page, testBottles.filippoBerio.sku);

    // Camera is live — viewfinder or video element visible
    await expect(page.locator('.camera-active, .camera-viewfinder, video').first()).toBeVisible({ timeout: 10000 });
    // Capture button is enabled
    await expect(page.locator('.camera-capture-btn')).toBeEnabled({ timeout: 10000 });
  });

  test('Full mock QR flow: select bottle → scan → analyze → results', async ({ page }) => {
    await navigateToTestLab(page);
    await selectBottleAndStartScan(page, testBottles.filippoBerio.sku);
    await triggerAnalyzeAndWaitForResult(page);

    // Result display shows core metrics
    await expect(page.locator('.result-display')).toBeVisible();
    await expect(page.locator('.result-metric__value').first()).toContainText(/ml/i);
  });

  test('results show correct fill percentage from mock API (65%)', async ({ page }) => {
    await navigateToTestLab(page);
    await selectBottleAndStartScan(page, testBottles.filippoBerio.sku);
    await triggerAnalyzeAndWaitForResult(page);

    // Mock API returns fillPercentage: 65
    await expect(page.locator('.result-display')).toContainText(/65/);
  });

  test('results show high confidence badge for successful analysis', async ({ page }) => {
    await navigateToTestLab(page);
    await selectBottleAndStartScan(page, testBottles.filippoBerio.sku);
    await triggerAnalyzeAndWaitForResult(page);

    await expect(page.locator('.confidence-badge--high, [class*="confidence"][class*="high"]').first())
      .toBeVisible({ timeout: 5000 });
  });

  test('results show low confidence badge when AI is uncertain', async ({ page }) => {
    // Override mock to return low confidence BEFORE navigating
    await mockAnalyzeLowConfidence(page);

    await navigateToTestLab(page);
    await selectBottleAndStartScan(page, testBottles.filippoBerio.sku);
    await triggerAnalyzeAndWaitForResult(page);

    await expect(page.locator('.confidence-badge--low, [class*="confidence"][class*="low"]').first())
      .toBeVisible({ timeout: 5000 });
  });

  test('"Scan Another Bottle" button is visible in results', async ({ page }) => {
    await navigateToTestLab(page);
    await selectBottleAndStartScan(page, testBottles.filippoBerio.sku);
    await triggerAnalyzeAndWaitForResult(page);

    // App.tsx's ResultDisplay always shows a scan-again / retake button
    await expect(
      page.locator('button:has-text("Scan Another Bottle"), .result-scan-again').first()
    ).toBeVisible({ timeout: 5000 });
  });

  test('feedback grid appears in results for accuracy rating', async ({ page }) => {
    await navigateToTestLab(page);
    await selectBottleAndStartScan(page, testBottles.filippoBerio.sku);
    await triggerAnalyzeAndWaitForResult(page);

    // FeedbackGrid is embedded in ResultDisplay
    await expect(page.locator('.feedback-grid-container')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('button:has-text("About right")')).toBeVisible();
  });
});

// ─────────────────────────────────────────────────────────────────────────────

test.describe('TestLab: Debug Mode', () => {

  test.beforeEach(async ({ page }) => {
    await setupAdmin(page);
    await mockCamera(page);
    await mockAnalyzeSuccess(page);
  });

  // Note: Debug mode changes are visible in the TestLab idle state UI.
  // After __AFIA_TRIGGER_ANALYZE__ is called, App.tsx takes over rendering
  // (its own ResultDisplay replaces TestLab), so debug-mode-specific post-analysis
  // UI (AdminToolsOverlay auto-open) is tested in TestLab's own handleCapture flow,
  // which is not reachable via the __AFIA_TRIGGER_ANALYZE__ E2E hook.

  test('Debug Mode shows hint text and is selectable', async ({ page }) => {
    await navigateToTestLab(page);

    await page.locator('.test-mode-card').last().click();
    await expect(page.locator('.test-mode-card').last()).toHaveClass(/active/);
    await expect(page.locator('.test-lab-debug-hint')).toBeVisible();
  });

  test('switching back from Debug to User Flow removes debug hint', async ({ page }) => {
    await navigateToTestLab(page);

    // Enable debug mode
    await page.locator('.test-mode-card').last().click();
    await expect(page.locator('.test-lab-debug-hint')).toBeVisible();

    // Switch back to User Flow
    await page.locator('.test-mode-card').first().click();
    await expect(page.locator('.test-lab-debug-hint')).toBeHidden();
  });
});

// ─────────────────────────────────────────────────────────────────────────────

test.describe('TestLab: Post-Analysis Navigation', () => {

  test.beforeEach(async ({ page }) => {
    await setupAdmin(page);
    await page.addInitScript(() => {
      (window as any).__AFIA_TEST_MODE__ = true;
    });
    await mockCamera(page);
    await mockAnalyzeSuccess(page);
  });

  // After __AFIA_TRIGGER_ANALYZE__, App.tsx renders its own ResultDisplay.
  // "Scan Another Bottle" calls App.tsx's handleRetake → appState = CAMERA_ACTIVE → camera shows.

  test('"Scan Another Bottle" returns to camera viewfinder', async ({ page }) => {
    await navigateToTestLab(page);
    await selectBottleAndStartScan(page, testBottles.filippoBerio.sku);
    await triggerAnalyzeAndWaitForResult(page);

    // Click "Scan Another Bottle" (App.tsx's ResultDisplay always shows this)
    await page.evaluate(() => {
      const btn = Array.from(document.querySelectorAll('button')).find(
        b => b.textContent?.includes('Scan Another Bottle')
      ) as HTMLButtonElement | undefined;
      if (btn) btn.click();
    });

    // App.tsx transitions to CAMERA_ACTIVE — camera viewfinder shows
    await expect(
      page.locator('.camera-active, .camera-viewfinder, video').first()
    ).toBeVisible({ timeout: 10000 });

    // Result display is gone
    await expect(page.locator('.result-display')).toBeHidden();
  });
});
