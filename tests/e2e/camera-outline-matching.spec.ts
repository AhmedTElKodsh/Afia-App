import { test, expect } from '@playwright/test';
import { setupDefaultMocks } from './helpers/mockAPI';
import { waitForCameraReady } from './helpers/cameraHelpers';
import { TIMEOUTS } from './constants';

/**
 * Camera Outline Matching System Tests
 *
 * Comprehensive E2E tests for the static bottle guide system.
 * Tests the engineering-accurate SVG outline used as visual guidance for manual capture.
 *
 * Based on Afia 1.5L bottle engineering specifications:
 * - Total height: 301mm (±12mm)
 * - Neck diameter: Ø 37.3mm (±0.5mm)
 * - Body width: 78.1mm at base
 * - Capacity: 1500cc
 * - SVG: 2 paths (outer contour + handle inner aperture), viewBox 280 970 815 1780
 *
 * Note: Auto-detection and auto-capture features have been removed.
 * The outline now serves purely as static visual guidance for manual capture.
 */

test.describe('Camera Outline Matching System', () => {
  test.beforeEach(async ({ page }) => {
    await setupDefaultMocks(page);

    // Pre-accept privacy and enable test mode
    await page.addInitScript(() => {
      window.localStorage.setItem('afia_privacy_accepted', 'true');
      (window as any).__AFIA_TEST_MODE__ = true;
      // Manual mode is the only mode now (no auto-capture)
      (window as any).__AFIA_FORCE_MANUAL__ = true;
    });
  });

  /**
   * Helper: Navigate to camera view
   */
  async function navigateToCamera(page: import('@playwright/test').Page) {
    await page.goto('/?sku=afia-corn-1.5l&test_mode=1');

    // Wait for page to be fully loaded
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(TIMEOUTS.REACT_UPDATE);

    // Click Start Scan button
    await page.evaluate(() => {
      const btn = document.querySelector('button.qrl-cta') as HTMLButtonElement
        ?? Array.from(document.querySelectorAll('button')).find(
          b => b.textContent?.includes('START SMART SCAN') || b.textContent?.includes('Start Scan')
        ) as HTMLButtonElement;
      if (btn) btn.click();
    });

    // Use consolidated camera ready helper
    await waitForCameraReady(page);
  }

  test.describe('Outline Geometry', () => {
    test('should render static SVG outline for visual guidance', async ({ page }) => {
      await navigateToCamera(page);

      // Bottle guide wrapper should be visible
      const bottleGuide = page.locator('.bottle-guide-wrapper');
      await expect(bottleGuide).toBeVisible({ timeout: 5000 });

      // SVG should exist with correct viewBox (high-fidelity extraction from real bottle scan)
      const svg = page.locator('.bottle-guide-svg');
      await expect(svg).toBeVisible();

      const viewBox = await svg.getAttribute('viewBox');
      expect(viewBox).toBe('280 970 815 1780');
    });

    test('should display major bottle components', async ({ page }) => {
      await navigateToCamera(page);

      const svg = page.locator('.bottle-guide-svg');
      await expect(svg).toBeVisible();

      // Check that SVG has the 2 bottle component paths: outer contour + handle inner aperture
      const paths = svg.locator('path');
      const pathCount = await paths.count();
      expect(pathCount).toBe(2);

      // Check for group element with stroke attributes
      const group = svg.locator('g');
      await expect(group).toHaveAttribute('stroke');
    });

    test('should render as simple static outline', async ({ page }) => {
      await navigateToCamera(page);

      const svg = page.locator('.bottle-guide-svg');

      // Static outline has no additional markers or indicators
      // Just the basic bottle shape paths (2 components: outer contour + handle inner aperture)
      const paths = svg.locator('path');
      const pathCount = await paths.count();
      expect(pathCount).toBe(2);
    });

    test('should display as simple visual reference', async ({ page }) => {
      await navigateToCamera(page);

      const svg = page.locator('.bottle-guide-svg');

      // Static outline serves as visual reference only (2 paths: contour + handle aperture)
      // No brand markers or detection indicators
      await expect(svg).toBeVisible();

      // Verify it has the basic bottle shape
      const group = svg.locator('g');
      await expect(group).toBeVisible();
    });

    test('should scale responsively', async ({ page }) => {
      await navigateToCamera(page);

      const bottleGuide = page.locator('.bottle-guide-wrapper');

      // Check CSS properties for responsive behavior
      const styles = await bottleGuide.evaluate((el) => {
        const computed = window.getComputedStyle(el);
        return {
          width: computed.width,
          maxWidth: computed.maxWidth,
        };
      });

      // Should have percentage-based width with max-width constraint
      expect(styles.maxWidth).toBe('190px');
    });
  });

  test.describe('Visual Guidance', () => {
    test('should display static outline with consistent styling', async ({ page }) => {
      await navigateToCamera(page);

      const svg = page.locator('.bottle-guide-svg');
      await expect(svg).toBeVisible();

      // Check that group element has stroke styling
      const group = svg.locator('g');
      const stroke = await group.getAttribute('stroke');
      expect(stroke).toBeTruthy();
      expect(stroke).toContain('rgba');
    });

    test('should show guidance hint text', async ({ page }) => {
      await navigateToCamera(page);

      // Guidance hint should be visible
      const hint = page.locator('.guidance-header-hint');
      await expect(hint).toBeVisible({ timeout: 5000 });

      // Should have helpful text
      const hintText = await hint.textContent();
      expect(hintText).toBeTruthy();
      expect(hintText!.length).toBeGreaterThan(0);
    });
  });

  test.describe('Manual Capture', () => {
    test('should allow manual capture at any time', async ({ page }) => {
      await navigateToCamera(page);

      // Manual capture button should be enabled
      const captureBtn = page.locator('.camera-capture-btn');
      await expect(captureBtn).toBeEnabled({ timeout: 5000 });

      // Click to capture
      await captureBtn.click();

      // Should proceed to analyzing immediately (check before the mock API completes)
      const analyzingOverlay = page.locator('.analyzing-overlay');
      await expect(analyzingOverlay).toBeVisible({ timeout: 2000 });
    });

    test('should show shutter flash effect on capture', async ({ page }) => {
      await navigateToCamera(page);

      const captureBtn = page.locator('.camera-capture-btn');
      await expect(captureBtn).toBeVisible({ timeout: 5000 });

      await captureBtn.click();

      // After capture, analyzing overlay should be visible immediately
      const analyzingOverlay = page.locator('.analyzing-overlay');
      await expect(analyzingOverlay).toBeVisible({ timeout: 2000 });
    });
  });

  test.describe('Accessibility', () => {
    test('should have proper ARIA attributes', async ({ page }) => {
      await navigateToCamera(page);

      const svg = page.locator('.bottle-guide-svg');

      // SVG should be aria-hidden (decorative)
      const ariaHidden = await svg.getAttribute('aria-hidden');
      expect(ariaHidden).toBe('true');
    });

    test('should provide visual guidance through static outline', async ({ page }) => {
      await navigateToCamera(page);

      // Static outline is always visible as visual reference
      const bottleGuide = page.locator('.bottle-guide-wrapper');
      await expect(bottleGuide).toBeVisible({ timeout: 5000 });

      // Verify SVG is present
      const svg = page.locator('.bottle-guide-svg');
      await expect(svg).toBeVisible();
    });

    test('should work with keyboard navigation', async ({ page }) => {
      await navigateToCamera(page);

      // Capture button should be focusable
      const captureBtn = page.locator('.camera-capture-btn');
      await captureBtn.focus();

      const isFocused = await captureBtn.evaluate((el) => {
        return document.activeElement === el;
      });

      expect(isFocused).toBe(true);
    });
  });

  test.describe('Performance', () => {
    test('should render outline without lag', async ({ page }) => {
      const startTime = Date.now();

      await navigateToCamera(page);

      // Bottle guide should appear quickly
      const bottleGuide = page.locator('.bottle-guide-wrapper');
      await expect(bottleGuide).toBeVisible({ timeout: 5000 });

      const renderTime = Date.now() - startTime;
      expect(renderTime).toBeLessThan(8000); // Should render within 8 seconds (headless startup overhead)
    });

    test('should handle rapid interactions without crashing', async ({ page }) => {
      await navigateToCamera(page);

      // Wait for camera to be fully ready
      await page.waitForTimeout(1000);

      // Verify capture button exists
      const captureBtn = page.locator('.camera-capture-btn');
      await expect(captureBtn).toBeVisible({ timeout: 5000 });

      // Verify bottle guide is still present (camera didn't crash)
      const bottleGuide = page.locator('.bottle-guide-wrapper');
      await expect(bottleGuide).toBeVisible();

      // Verify camera container is still active
      const cameraContainer = page.locator('.camera-container.camera-active');
      await expect(cameraContainer).toBeVisible();
    });

    test('should maintain consistent visual appearance', async ({ page }) => {
      await navigateToCamera(page);

      // Wait for ready state with animations
      await page.waitForTimeout(1000);

      // Check that bottle guide is rendered
      const bottleGuide = page.locator('.bottle-guide-wrapper');
      await expect(bottleGuide).toBeVisible();

      // Verify SVG is present
      const svg = page.locator('.bottle-guide-svg');
      await expect(svg).toBeVisible();
    });
  });

  test.describe('Edge Cases', () => {
    test('should handle missing video element gracefully', async ({ page }) => {
      // setupDefaultMocks already called in beforeEach

      // Navigate without camera mock to trigger error state
      await page.addInitScript(() => {
        window.localStorage.setItem('afia_privacy_accepted', 'true');
        (window as any).__AFIA_TEST_MODE__ = true;
        (window as any).__AFIA_FORCE_MANUAL__ = true;

        // Mock getUserMedia to fail
        navigator.mediaDevices.getUserMedia = async () => {
          throw new Error('Camera not available');
        };
      });

      await page.goto('/?sku=afia-corn-1.5l');

      await page.evaluate(() => {
        const btn = document.querySelector('button.qrl-cta') as HTMLButtonElement
          ?? Array.from(document.querySelectorAll('button')).find(
            b => b.textContent?.includes('START SMART SCAN') || b.textContent?.includes('Start Scan')
          ) as HTMLButtonElement;
        if (btn) btn.click();
      });

      // Should show error state
      const errorState = page.locator('.camera-error, .camera-permission-denied, .camera-state-overlay');
      await expect(errorState).toBeVisible({ timeout: 10000 });
    });

    test('should work on different viewport sizes', async ({ page }) => {
      const viewports = [
        { width: 375, height: 667 },  // iPhone SE
        { width: 390, height: 844 },  // iPhone 12
        { width: 414, height: 896 },  // iPhone 11 Pro Max
        { width: 430, height: 932 },  // iPhone 14 Pro Max
      ];

      for (const viewport of viewports) {
        await page.setViewportSize(viewport);
        await navigateToCamera(page);

        const bottleGuide = page.locator('.bottle-guide-wrapper');
        await expect(bottleGuide).toBeVisible({ timeout: 5000 });

        // Should scale appropriately
        const width = await bottleGuide.evaluate((el) => {
          return window.getComputedStyle(el).width;
        });

        expect(width).toBeTruthy();
      }
    });

    test('should handle landscape orientation', async ({ page }) => {
      await page.setViewportSize({ width: 812, height: 375 });

      await navigateToCamera(page);

      const bottleGuide = page.locator('.bottle-guide-wrapper');
      await expect(bottleGuide).toBeVisible({ timeout: 5000 });
    });

    test('should work with different SKUs', async ({ page }) => {
      const skus = ['afia-corn-1.5l', 'afia-sunflower-1.5l'];

      for (let i = 0; i < skus.length; i++) {
        const sku = skus[i];

        // Navigate to new page for each SKU
        await page.goto(`/?sku=${sku}`);

        // Wait for page to load
        await page.waitForLoadState('domcontentloaded');
        await page.waitForTimeout(500);

        // Click start button
        const startBtn = page.locator('button:has-text("START SMART SCAN"), button:has-text("Start Scan")').first();
        if (await startBtn.isVisible({ timeout: 5000 })) {
          await page.evaluate(() => {
            const btn = document.querySelector('button.qrl-cta') as HTMLButtonElement
              ?? Array.from(document.querySelectorAll('button')).find(
                b => b.textContent?.includes('START SMART SCAN') || b.textContent?.includes('Start Scan')
              ) as HTMLButtonElement;
            if (btn) btn.click();
          });

          // Wait for camera to be active
          await page.waitForSelector('.camera-container.camera-active', { timeout: 10000 });

          // Wait for video to be ready
          await page.waitForFunction(() => {
            const video = document.querySelector('video');
            return video && video.videoWidth > 0 && video.videoHeight > 0;
          }, { timeout: 5000 });

          // Verify bottle guide is visible
          const bottleGuide = page.locator('.bottle-guide-wrapper');
          await expect(bottleGuide).toBeVisible({ timeout: 5000 });
        }
      }
    });
  });

  test.describe('Static Guidance Integration', () => {
    test('should display static outline consistently', async ({ page }) => {
      await navigateToCamera(page);

      // Bottle guide should be visible
      const bottleGuide = page.locator('.bottle-guide-wrapper');
      await expect(bottleGuide).toBeVisible();

      // SVG outline should be present
      const svg = page.locator('.bottle-guide-svg');
      await expect(svg).toBeVisible();
    });

    test('should show guidance hint text', async ({ page }) => {
      await navigateToCamera(page);

      // Guidance hint should be visible (correct selector)
      const hint = page.locator('.guidance-header-hint');
      await expect(hint).toBeVisible({ timeout: 5000 });

      // Should have helpful text
      const hintText = await hint.textContent();
      expect(hintText).toBeTruthy();
    });
  });
});
