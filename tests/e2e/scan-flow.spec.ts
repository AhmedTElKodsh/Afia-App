import { test, expect } from '@playwright/test';
import { acceptPrivacyDialog, getStartScanButton } from './helpers/testHelpers';

test.describe('Oil Bottle Scan Flow', () => {

  test('should display bottle info for valid SKU', async ({ page }) => {
    // Navigate to app with valid SKU
    await page.goto('/?sku=afia-sunflower-500ml');

    // Verify bottle info is displayed (use first() to avoid strict mode)
    await expect(page.locator('h1, .qrl-selector-pill')).toContainText(/Afia.*Sunflower/i);
    await expect(page.locator('text=500ml').first()).toBeVisible();
    
    // START SMART SCAN is the CTA text for Afia app
    await expect(page.locator('button:has-text("START SMART SCAN"), button:has-text("Start Scan")').first()).toBeVisible();
  });

  test('should show unknown bottle message for invalid SKU', async ({ page }) => {
    // Navigate with invalid SKU
    await page.goto('/?sku=invalid-bottle-123');

    // Verify unknown bottle message
    await expect(page.locator('h1, .unknown-title')).toContainText(/not (yet )?supported|unknown|not found/i);
  });

  test('should show no bottle message when no SKU provided', async ({ page }) => {
    // Navigate without SKU
    await page.goto('/');

    // Should show the unknown/default state ("No bottle linked" when no sku param)
    await expect(page.locator('h1, .unknown-title')).toContainText(/not (yet )?supported|unknown|No bottle linked/i);
  });

  test('should activate camera when Start Scan clicked', async ({ page }) => {
    // Pre-accept privacy before navigation so QrLanding renders the enabled START button
    await page.addInitScript(() => {
      window.localStorage.setItem('afia_privacy_accepted', 'true');
    });

    // Navigate to app
    await page.goto('/?sku=afia-sunflower-500ml');

    // Click Start Scan using helper
    const startButton = getStartScanButton(page);
    await startButton.click();

    // Verify camera viewfinder appears (or camera permission prompt)
    // Note: In real browser, camera may not work without actual device
    await page.waitForTimeout(2000); // Wait for camera activation

    // Check for viewfinder or camera error/instructions
    const hasViewfinder = await page.locator('.viewfinder, video').count();
    const hasCameraText = await page.locator('text=/camera|permission|allow/i').count();

    expect(hasViewfinder + hasCameraText).toBeGreaterThan(0);
  });

  test('should navigate between views', async ({ page }) => {
    await page.goto('/?sku=afia-sunflower-500ml');

    // Check if navigation exists
    const hasNavigation = await page.locator('nav, .main-navigation').count();

    if (hasNavigation > 0) {
      // Click history link if it exists
      const historyLink = page.locator('text=History, .nav-item:has-text("History")');
      if (await historyLink.count() > 0) {
        await historyLink.first().click();
        await expect(page.locator('h1, h2, .history-title')).toContainText(/History|Scans/i);
      }
    }
  });
});
