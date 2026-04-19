import { test, expect } from '@playwright/test';

test.describe('Camera Orientation Guide', () => {
  test.beforeEach(async ({ page }) => {
    // Pre-accept privacy to avoid gate
    await page.addInitScript(() => {
      window.localStorage.setItem('afia_privacy_accepted', 'true');
      (window as any).__AFIA_TEST_MODE__ = true;
    });
  });

  test('orientation guide appears in viewfinder', async ({ page }) => {
    // Navigate to scan page with a known SKU
    await page.goto('/?sku=filippo-berio-500ml');
    
    // Click Start Scan button in QrLanding using evaluate to bypass animations
    await page.evaluate(() => {
      const btn = document.querySelector('button.qrl-cta') as HTMLButtonElement
        ?? Array.from(document.querySelectorAll('button')).find(
          b => b.textContent?.includes('START SMART SCAN') || b.textContent?.includes('Start Scan')
        ) as HTMLButtonElement;
      if (btn) btn.click();
    });
    
    // Wait for camera to activate with longer timeout
    await page.waitForSelector('.camera-viewfinder.camera-active, .camera-active', { timeout: 15000 });
    
    // Verify orientation guide is visible with longer timeout
    const orientationGuide = page.locator('.orientation-guide');
    await expect(orientationGuide).toBeVisible({ timeout: 10000 });
    
    // Verify text content
    await expect(page.locator('text=Handle on Right')).toBeVisible();
    
    // Verify arrow is present
    await expect(page.locator('.orientation-guide:has-text("→")')).toBeVisible();
  });

  test('orientation guide disappears after capture', async ({ page, context }) => {
    // Grant camera permissions
    await context.grantPermissions(['camera']);
    
    // Navigate to scan page
    await page.goto('/?sku=filippo-berio-500ml');
    
    // Click Start Scan using evaluate to bypass animations
    await page.evaluate(() => {
      const btn = document.querySelector('button.qrl-cta') as HTMLButtonElement
        ?? Array.from(document.querySelectorAll('button')).find(
          b => b.textContent?.includes('START SMART SCAN') || b.textContent?.includes('Start Scan')
        ) as HTMLButtonElement;
      if (btn) btn.click();
    });
    
    // Wait for camera to be active with longer timeout
    await page.waitForSelector('.camera-viewfinder.camera-active, .camera-active', { timeout: 15000 });
    
    // Verify guide is visible before capture with longer timeout
    await expect(page.locator('.orientation-guide')).toBeVisible({ timeout: 10000 });
    
    // Capture photo (manual mode button)
    await page.click('.camera-capture-btn');
    
    // Wait for capture to complete (analyzing overlay appears)
    await page.waitForSelector('.analyzing-overlay', { timeout: 10000 });
    
    // Orientation guide should no longer be visible
    await expect(page.locator('.orientation-guide')).not.toBeVisible();
  });

  test('orientation guide has correct positioning', async ({ page }) => {
    await page.goto('/?sku=filippo-berio-500ml');
    
    await page.evaluate(() => {
      const btn = document.querySelector('button.qrl-cta') as HTMLButtonElement
        ?? Array.from(document.querySelectorAll('button')).find(
          b => b.textContent?.includes('START SMART SCAN') || b.textContent?.includes('Start Scan')
        ) as HTMLButtonElement;
      if (btn) btn.click();
    });
    
    await page.waitForSelector('.camera-viewfinder.camera-active, .camera-active', { timeout: 15000 });
    
    const guide = page.locator('.orientation-guide');
    await expect(guide).toBeVisible({ timeout: 10000 });
    
    // Check CSS positioning
    const styles = await guide.evaluate((el) => {
      const computed = window.getComputedStyle(el);
      return {
        position: computed.position,
        zIndex: computed.zIndex,
        textAlign: computed.textAlign,
      };
    });
    
    expect(styles.position).toBe('absolute');
    expect(parseInt(styles.zIndex)).toBeGreaterThanOrEqual(10);
    expect(styles.textAlign).toBe('center');
  });

  test('orientation guide is accessible', async ({ page }) => {
    await page.goto('/?sku=filippo-berio-500ml');
    
    await page.evaluate(() => {
      const btn = document.querySelector('button.qrl-cta') as HTMLButtonElement
        ?? Array.from(document.querySelectorAll('button')).find(
          b => b.textContent?.includes('START SMART SCAN') || b.textContent?.includes('Start Scan')
        ) as HTMLButtonElement;
      if (btn) btn.click();
    });
    
    await page.waitForSelector('.camera-viewfinder.camera-active, .camera-active', { timeout: 15000 });
    
    const guide = page.locator('.orientation-guide');
    await expect(guide).toBeVisible({ timeout: 10000 });
    
    // Check ARIA attributes
    const role = await guide.getAttribute('role');
    const ariaLive = await guide.getAttribute('aria-live');
    
    expect(role).toBe('status');
    expect(ariaLive).toBe('polite');
  });

  test('orientation guide works in landscape orientation', async ({ page }) => {
    // Set viewport to landscape
    await page.setViewportSize({ width: 812, height: 375 });
    
    await page.goto('/?sku=filippo-berio-500ml');
    
    await page.evaluate(() => {
      const btn = document.querySelector('button.qrl-cta') as HTMLButtonElement
        ?? Array.from(document.querySelectorAll('button')).find(
          b => b.textContent?.includes('START SMART SCAN') || b.textContent?.includes('Start Scan')
        ) as HTMLButtonElement;
      if (btn) btn.click();
    });
    
    await page.waitForSelector('.camera-viewfinder.camera-active, .camera-active', { timeout: 15000 });
    
    // Guide should still be visible in landscape with longer timeout
    await expect(page.locator('.orientation-guide')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('text=Handle on Right')).toBeVisible();
  });

  test('orientation guide works across different viewport widths', async ({ page }) => {
    const viewportWidths = [375, 390, 414, 430]; // iPhone SE to iPhone 14 Pro Max
    
    for (const width of viewportWidths) {
      await page.setViewportSize({ width, height: 812 });
      await page.goto('/?sku=filippo-berio-500ml');
      
      await page.evaluate(() => {
        const btn = document.querySelector('button.qrl-cta') as HTMLButtonElement
          ?? Array.from(document.querySelectorAll('button')).find(
            b => b.textContent?.includes('START SMART SCAN') || b.textContent?.includes('Start Scan')
          ) as HTMLButtonElement;
        if (btn) btn.click();
      });
      
      await page.waitForSelector('.camera-viewfinder.camera-active, .camera-active', { timeout: 15000 });
      
      // Verify guide is visible and centered with longer timeout
      const guide = page.locator('.orientation-guide');
      await expect(guide).toBeVisible({ timeout: 10000 });
      
      // Check that text is readable (not truncated)
      const text = await guide.textContent();
      expect(text).toContain('Handle on Right');
    }
  });
});
