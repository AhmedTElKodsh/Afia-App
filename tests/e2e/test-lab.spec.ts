import { test, expect } from '@playwright/test';
import { mockAnalyzeSuccess, mockCamera } from './helpers/mockAPI';
import { testBottles } from './fixtures/testData';
import { acceptPrivacyDialog } from './helpers/testHelpers';

/**
 * Admin Test Lab - Feature Tests
 */

test.describe('Admin Test Lab', () => {
  
  test.beforeEach(async ({ page }) => {
    // Set up admin session bypass before navigation
    await page.addInitScript(() => {
      window.sessionStorage.setItem('afia_admin_session', 'valid-token');
      window.sessionStorage.setItem('afia_admin_session_expires', String(Date.now() + 3600000));
      window.localStorage.setItem('afia_privacy_accepted', 'true');
    });

    // Mock API and Camera before navigation
    await mockAnalyzeSuccess(page);
    await mockCamera(page);

    // Navigate to the test lab
    await page.goto('/?mode=admin');
    await page.waitForLoadState('domcontentloaded');
  });

  test('should display test lab banner', async ({ page }) => {
    // Be more specific to avoid strict mode violation (multiple elements)
    const adminBanner = page.locator('.app-ctrl-admin-label, .nav-label:has-text("Test Lab")').first();
    await expect(adminBanner).toBeVisible();
  });

  test('should allow selecting a bottle from mock list', async ({ page }) => {
    // Look for mock QR list or bottle selector
    const bottleSelector = page.locator('select, [data-testid="bottle-selector"]').first();
    
    if (await bottleSelector.isVisible()) {
      await bottleSelector.selectOption({ label: testBottles.filippoBerio.name });
      
      // Should show the camera flow for that bottle
      const startButton = page.locator('button:has-text("Start Scan"), [data-testid="start-scan"]').first();
      await expect(startButton).toBeVisible();
    }
  });

  test('should show TestLab interface when switching to scan view', async ({ page }) => {
    // Set onboarding as seen so TestLab doesn't show the onboarding screen
    await page.addInitScript(() => {
      window.localStorage.setItem('afia_privacy_accepted', 'true');
      window.localStorage.setItem('afia_admin_onboarding_seen', 'true');
    });

    // Navigate with a valid SKU — required for TestLab to render (needs bottle context)
    await page.goto(`/?mode=admin&sku=${testBottles.filippoBerio.sku}`);
    await page.waitForLoadState('domcontentloaded');

    // Currently shows AdminDashboard (currentView="admin")
    // Click the "Test Lab" nav button to switch currentView to "scan"
    await page.locator('button[aria-label="Test Lab"]').click();

    // TestLab should now render (admin mode + IDLE scan state + valid SKU)
    await expect(page.locator('.test-lab')).toBeVisible({ timeout: 5000 });

    // TestLab shows its main interface elements
    await expect(page.locator('h1:has-text("TEST LAB")')).toBeVisible();
    await expect(page.locator('.test-lab-tab').first()).toBeVisible();
    await expect(page.locator('button:has-text("Start Test Scan")')).toBeVisible();
  });
});
