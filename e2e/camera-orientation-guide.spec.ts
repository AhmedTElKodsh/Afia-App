import { test, expect } from '@playwright/test';

test.describe('Camera Orientation Guide', () => {
  test.beforeEach(async ({ context }) => {
    // Grant camera permissions
    await context.grantPermissions(['camera']);
  });

  test('orientation guide appears in viewfinder as static guidance', async ({ page }) => {
    // Navigate to QR landing page with SKU
    await page.goto('/?sku=filippo-berio-500ml');
    
    // Start scan flow
    await page.click('text=Start Scan');
    
    // Wait for camera to activate
    await page.waitForSelector('.camera-viewfinder', { timeout: 5000 });
    
    // Verify orientation guide is visible
    const orientationGuide = page.locator('.orientation-guide');
    await expect(orientationGuide).toBeVisible();
    
    // Verify text content
    await expect(page.locator('text=Handle on Right')).toBeVisible();
    
    // Verify arrow is present
    const guideText = await orientationGuide.textContent();
    expect(guideText).toContain('→');
  });

  test('orientation guide disappears after capture', async ({ page }) => {
    await page.goto('/?sku=filippo-berio-500ml');
    await page.click('text=Start Scan');
    await page.waitForSelector('.camera-viewfinder', { timeout: 5000 });
    
    // Verify guide is visible before capture
    await expect(page.locator('.orientation-guide')).toBeVisible();
    
    // Capture photo
    await page.click('button[aria-label*="Capture"]');
    
    // Wait for photo preview to appear
    await page.waitForSelector('.photo-preview-screen', { timeout: 3000 });
    
    // Verify orientation guide is no longer visible
    await expect(page.locator('.orientation-guide')).not.toBeVisible();
  });

  test('orientation guide positioned correctly on mobile viewport', async ({ page }) => {
    // Set mobile viewport (iPhone SE size)
    await page.setViewportSize({ width: 375, height: 667 });
    
    await page.goto('/?sku=filippo-berio-500ml');
    await page.click('text=Start Scan');
    await page.waitForSelector('.camera-viewfinder', { timeout: 5000 });
    
    const orientationGuide = page.locator('.orientation-guide');
    await expect(orientationGuide).toBeVisible();
    
    // Verify positioning (top center)
    const box = await orientationGuide.boundingBox();
    expect(box).not.toBeNull();
    if (box) {
      // Should be near top of viewport
      expect(box.y).toBeLessThan(100);
      // Should be horizontally centered (within 50px of center)
      const centerX = 375 / 2;
      const guideCenterX = box.x + box.width / 2;
      expect(Math.abs(guideCenterX - centerX)).toBeLessThan(50);
    }
  });

  test('orientation guide does not obstruct capture button', async ({ page }) => {
    await page.goto('/?sku=filippo-berio-500ml');
    await page.click('text=Start Scan');
    await page.waitForSelector('.camera-viewfinder', { timeout: 5000 });
    
    // Verify both guide and capture button are visible
    await expect(page.locator('.orientation-guide')).toBeVisible();
    const captureButton = page.locator('button[aria-label*="Capture"]');
    await expect(captureButton).toBeVisible();
    
    // Verify capture button is clickable (not obstructed)
    await expect(captureButton).toBeEnabled();
    
    // Get bounding boxes
    const guideBox = await page.locator('.orientation-guide').boundingBox();
    const buttonBox = await captureButton.boundingBox();
    
    expect(guideBox).not.toBeNull();
    expect(buttonBox).not.toBeNull();
    
    if (guideBox && buttonBox) {
      // Guide should be at top, button at bottom - no overlap
      expect(guideBox.y + guideBox.height).toBeLessThan(buttonBox.y);
    }
  });
});
