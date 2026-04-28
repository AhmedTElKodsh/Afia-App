import { test, expect } from '@playwright/test';
import { setupDefaultMocks } from './helpers/mockAPI';

test.describe('Camera Orientation Guide', () => {
  test.beforeEach(async ({ page }) => {
    await setupDefaultMocks(page);

    // Pre-accept privacy to avoid gate
    await page.addInitScript(() => {
      window.localStorage.setItem('afia_privacy_accepted', 'true');
      (window as any).__AFIA_TEST_MODE__ = true;
      // Manual mode is the only mode (no auto-capture)
      (window as any).__AFIA_FORCE_MANUAL__ = true;
    });
  });

  test('orientation guide appears in viewfinder', async ({ page }) => {
    // Navigate to scan page with a known SKU
    await page.goto('/?sku=afia-corn-1.5l');

    // Click Start Scan button in QrLanding using evaluate to bypass animations
    await page.evaluate(() => {
      const btn = document.querySelector('button.qrl-cta') as HTMLButtonElement
        ?? Array.from(document.querySelectorAll('button')).find(
          b => b.textContent?.includes('START SMART SCAN') || b.textContent?.includes('Start Scan')
        ) as HTMLButtonElement;
      if (btn) btn.click();
    });

    // Wait for camera to become active
    await page.waitForSelector('.camera-container.camera-active', { state: 'visible', timeout: 25000 });

    // Orientation guide should appear immediately when camera is active (no arbitrary timeout needed)
    const orientationGuide = page.locator('.orientation-guide');
    await expect(orientationGuide).toBeVisible({ timeout: 15000 });

    // Verify text content - unique selector to comply with strict mode
    await expect(page.locator('.orientation-guide:has-text("handle on the right")')).toBeVisible();

    // Verify arrow is present
    await expect(page.locator('.orientation-guide:has-text("→")')).toBeVisible();
  });

  test('orientation guide disappears after capture', async ({ page }) => {
    // Navigate to scan page
    await page.goto('/?sku=afia-corn-1.5l');

    // Click Start Scan using evaluate to bypass animations
    await page.evaluate(() => {
      const btn = document.querySelector('button.qrl-cta') as HTMLButtonElement
        ?? Array.from(document.querySelectorAll('button')).find(
          b => b.textContent?.includes('START SMART SCAN') || b.textContent?.includes('Start Scan')
        ) as HTMLButtonElement;
      if (btn) btn.click();
    });

    // Wait for camera to become active
    await page.waitForSelector('.camera-container.camera-active', { state: 'visible', timeout: 25000 });

    // Verify guide is visible before capture
    await expect(page.locator('.orientation-guide')).toBeVisible({ timeout: 15000 });

    // Capture photo (manual mode button)
    const captureBtn = page.locator('.camera-capture-btn');
    await expect(captureBtn).toBeEnabled({ timeout: 10000 });
    await captureBtn.click();

    // Wait for state transition to complete (React batches state updates)
    await page.waitForTimeout(200);

    // Wait for capture to complete (analyzing overlay appears)
    await page.waitForSelector('.analyzing-overlay, .result-display', { timeout: 15000 });

    // Orientation guide should no longer be visible
    await expect(page.locator('.orientation-guide')).not.toBeVisible();
  });

  test('orientation guide has correct positioning', async ({ page }) => {
    await page.goto('/?sku=afia-corn-1.5l');

    await page.evaluate(() => {
      const btn = document.querySelector('button.qrl-cta') as HTMLButtonElement
        ?? Array.from(document.querySelectorAll('button')).find(
          b => b.textContent?.includes('START SMART SCAN') || b.textContent?.includes('Start Scan')
        ) as HTMLButtonElement;
      if (btn) btn.click();
    });

    await page.waitForSelector('.camera-container.camera-active', { state: 'visible', timeout: 25000 });

    const guide = page.locator('.orientation-guide');
    await expect(guide).toBeVisible({ timeout: 15000 });

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
    await page.goto('/?sku=afia-corn-1.5l');

    await page.evaluate(() => {
      const btn = document.querySelector('button.qrl-cta') as HTMLButtonElement
        ?? Array.from(document.querySelectorAll('button')).find(
          b => b.textContent?.includes('START SMART SCAN') || b.textContent?.includes('Start Scan')
        ) as HTMLButtonElement;
      if (btn) btn.click();
    });

    await page.waitForSelector('.camera-container.camera-active', { state: 'visible', timeout: 25000 });

    const guide = page.locator('.orientation-guide');
    await expect(guide).toBeVisible({ timeout: 15000 });

    // Check ARIA attributes
    const role = await guide.getAttribute('role');
    const ariaLive = await guide.getAttribute('aria-live');

    expect(role).toBe('status');
    expect(ariaLive).toBe('polite');
  });

  test('orientation guide works in landscape orientation', async ({ page }) => {
    // Set viewport to landscape
    await page.setViewportSize({ width: 812, height: 375 });

    await page.goto('/?sku=afia-corn-1.5l');

    await page.evaluate(() => {
      const btn = document.querySelector('button.qrl-cta') as HTMLButtonElement
        ?? Array.from(document.querySelectorAll('button')).find(
          b => b.textContent?.includes('START SMART SCAN') || b.textContent?.includes('Start Scan')
        ) as HTMLButtonElement;
      if (btn) btn.click();
    });

    await page.waitForSelector('.camera-container.camera-active', { state: 'visible', timeout: 25000 });

    // Guide should still be visible in landscape
    await expect(page.locator('.orientation-guide')).toBeVisible({ timeout: 15000 });
    await expect(page.locator('.orientation-guide:has-text("handle on the right")')).toBeVisible();
  });

  test('orientation guide works across different viewport widths', async ({ page }) => {
    const viewportWidths = [375, 390, 414, 430]; // iPhone SE to iPhone 14 Pro Max

    for (const width of viewportWidths) {
      await page.setViewportSize({ width, height: 812 });
      await page.goto('/?sku=afia-corn-1.5l');

      await page.evaluate(() => {
        const btn = document.querySelector('button.qrl-cta') as HTMLButtonElement
          ?? Array.from(document.querySelectorAll('button')).find(
            b => b.textContent?.includes('START SMART SCAN') || b.textContent?.includes('Start Scan')
          ) as HTMLButtonElement;
        if (btn) btn.click();
      });

      await page.waitForSelector('.camera-container.camera-active', { state: 'visible', timeout: 25000 });

      // Verify guide is visible and centered
      const guide = page.locator('.orientation-guide');
      await expect(guide).toBeVisible({ timeout: 15000 });

      // Check that text is readable (not truncated)
      const text = await guide.textContent();
      expect(text?.toLowerCase()).toContain('handle on the right');
    }
  });
});
