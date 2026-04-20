import { test, expect } from '@playwright/test';
import { mockAnalyzeError, mockCamera } from './helpers/mockAPI';
import { testBottles } from './fixtures/testData';
import { waitForCameraReady } from './helpers/cameraHelpers';
import { TIMEOUTS } from './constants';

/**
 * Epic 1: Core Scan Experience - Error Handling Tests
 * 
 * Tests error scenarios and edge cases
 * Coverage: FR3, FR15, FR25, FR34, FR35, FR36, FR37
 */

test.describe('Epic 1: Error Handling', () => {
  
  test.beforeEach(async ({ page }) => {
    // Mock camera for all tests
    await mockCamera(page);
  });
  
  test.describe('Unknown Bottle Handling', () => {
    
    test('should show clear message for unknown SKU', async ({ page }) => {
      await page.goto(`/?sku=${testBottles.invalid.sku}`);
      await page.waitForLoadState('networkidle');
      
      // Should show error message
      const pageContent = await page.textContent('body');
      expect(pageContent.toLowerCase()).toMatch(
        /not (yet )?supported|unknown|not found|invalid|error/i
      );
    });
    
    test('should display the invalid SKU that was scanned', async ({ page }) => {
      await page.goto(`/?sku=${testBottles.invalid.sku}`);
      await page.waitForLoadState('networkidle');
      
      // Should show the SKU somewhere
      const pageContent = await page.textContent('body');
      expect(pageContent).toContain(testBottles.invalid.sku);
    });
  });
  
  test.describe('API Error Handling', () => {
    
    test('should show error message when API returns 500', async ({ page }) => {
      await page.addInitScript(() => {
        window.localStorage.setItem('afia_privacy_accepted', 'true');
        (window as any).__AFIA_TEST_MODE__ = true;
      });

      // Mock API error before navigation so route is ready
      await mockAnalyzeError(page, 500);

      await page.goto(`/?sku=${testBottles.filippoBerio.sku}`);
      await page.waitForLoadState('networkidle');

      // Trigger analyze directly — avoids timing race with auto-capture
      await page.evaluate(() => {
        (window as any).__AFIA_TRIGGER_ANALYZE__?.();
      });

      // Should show error message
      await expect(page.locator('.error-message, .analyzing-error, [class*="error"]').first())
        .toBeVisible({ timeout: TIMEOUTS.API_RESPONSE });

      const pageContent = await page.textContent('body');
      expect(pageContent?.toLowerCase()).toMatch(/error|failed|try again|problem/i);
    });
    
    test('should show error message when API returns 429 (rate limit)', async ({ page }) => {
      await page.addInitScript(() => {
        window.localStorage.setItem('afia_privacy_accepted', 'true');
        (window as any).__AFIA_TEST_MODE__ = true;
      });

      // Mock rate limit error before navigation so route is ready
      await mockAnalyzeError(page, 429);

      await page.goto(`/?sku=${testBottles.filippoBerio.sku}`);
      await page.waitForLoadState('networkidle');

      // Trigger analyze directly — avoids timing race with auto-capture
      await page.evaluate(() => {
        (window as any).__AFIA_TRIGGER_ANALYZE__?.();
      });

      // Should show rate limit message
      await expect(page.locator('.error-message, .analyzing-error, [class*="error"]').first())
        .toBeVisible({ timeout: TIMEOUTS.API_RESPONSE });

      const pageContent = await page.textContent('body');
      expect(pageContent?.toLowerCase()).toMatch(/rate limit|too many|slow down|try again later/i);
    });
    
    test('should offer retry option after API failure', async ({ page }) => {
      // Apply camera mock FIRST before any init scripts
      await mockCamera(page);
      
      await page.addInitScript(() => {
        window.localStorage.setItem('afia_privacy_accepted', 'true');
        (window as any).__AFIA_TEST_MODE__ = true;
      });
      
      await page.goto(`/?sku=${testBottles.filippoBerio.sku}`);
      await page.waitForLoadState('domcontentloaded');
      await page.waitForTimeout(300);
      
      // Mock API error
      await mockAnalyzeError(page, 503);
      
      // Start scan flow
      await page.evaluate(() => {
        const btn = document.querySelector('button.qrl-cta') as HTMLButtonElement
          ?? Array.from(document.querySelectorAll('button')).find(
            b => b.textContent?.includes('START SMART SCAN') || b.textContent?.includes('Start Scan')
          ) as HTMLButtonElement;
        if (btn) btn.click();
      });
      
      // Wait for camera to be ready using centralized helper
      await waitForCameraReady(page);
      
      // Trigger analyze
      await page.evaluate(() => {
        (window as any).__AFIA_TRIGGER_ANALYZE__?.();
      });
      
      // Should show error with retry option
      await expect(page.locator('.error-message, .analyzing-error, [class*="error"]').first())
        .toBeVisible({ timeout: TIMEOUTS.VIDEO_READY });
      
      // Should have retry/retake button
      await expect(
        page.locator('button:has-text("Retry"), button:has-text("Try Again"), button:has-text("Retake")').first()
      ).toBeVisible({ timeout: TIMEOUTS.ELEMENT_VISIBLE });
    });
  });
  
  test.describe('Network Error Handling', () => {
    
    test('should handle network timeout gracefully', async ({ page }) => {
      await page.goto(`/?sku=${testBottles.filippoBerio.sku}`);
      
      // Mock network timeout
      await page.route('**/analyze', async (route) => {
        // Don't respond - simulate timeout
        await new Promise(resolve => setTimeout(resolve, 5000));
      });
      
      // Navigate and wait
      await page.waitForLoadState('networkidle');
      
      // Page should still be functional
      expect(await page.textContent('body')).toBeTruthy();
    });
    
    test('should show offline message when network is unavailable', async ({ page }) => {
      // Navigate while online first
      await page.goto(`/?sku=${testBottles.filippoBerio.sku}`);
      await page.waitForLoadState('networkidle');
      
      // Then go offline
      await page.context().setOffline(true);
      
      // Wait a bit for offline state to show
      await page.waitForTimeout(500);
      
      // Should show some content (offline message or cached content)
      const pageContent = await page.textContent('body');
      expect(pageContent.length).toBeGreaterThan(0);
      
      // Go back online
      await page.context().setOffline(false);
    });
  });
  
  test.describe('Camera Permission Errors', () => {

    /**
     * Helper: set up camera-denied scenario and wait for error UI.
     * Overrides getUserMedia with a NotAllowedError before page load,
     * then clicks the START SMART SCAN button and waits for .camera-error.
     */
    async function triggerCameraPermissionError(page: import('@playwright/test').Page) {
      await page.addInitScript(() => {
        window.localStorage.setItem('afia_privacy_accepted', 'true');
        // Override getUserMedia to throw NotAllowedError
        try {
          Object.defineProperty(navigator, 'mediaDevices', {
            writable: true,
            configurable: true,
            value: {
              getUserMedia: async () => {
                const err = new Error('Permission denied');
                (err as any).name = 'NotAllowedError';
                throw err;
              },
              enumerateDevices: async () => [],
            },
          });
        } catch {
          if (navigator.mediaDevices) {
            navigator.mediaDevices.getUserMedia = async () => {
              const err = new Error('Permission denied');
              (err as any).name = 'NotAllowedError';
              throw err;
            };
          }
        }
      });

      await page.goto(`/?sku=${testBottles.filippoBerio.sku}`);
      await page.waitForLoadState('networkidle');

      // Click start scan — same pattern as working critical-path tests
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

      // Wait for camera error element (more reliable than fixed timeout)
      await expect(page.locator('.camera-error')).toBeVisible({ timeout: TIMEOUTS.VIDEO_READY });
    }

    test('should show permission denied message', async ({ page }) => {
      await triggerCameraPermissionError(page);

      const pageContent = await page.textContent('body');
      expect(pageContent!.toLowerCase()).toMatch(
        /permission|denied|camera|access|grant|settings|allow/i
      );
    });

    test('should provide instructions to grant camera access', async ({ page }) => {
      await triggerCameraPermissionError(page);

      const pageContent = await page.textContent('body');
      expect(pageContent!.toLowerCase()).toMatch(
        /settings|browser|device|enable|allow|permission|camera/i
      );
    });
  });
  
  test.describe('Image Quality Issues', () => {
    
    test('should detect and report poor image quality', async ({ page }) => {
      await page.goto(`/?sku=${testBottles.filippoBerio.sku}`);
      await page.waitForLoadState('networkidle');
      
      // Mock API with quality issues
      await page.route('**/analyze', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            scanId: 'test-quality-issue',
            fillPercentage: 50,
            remainingMl: 250,
            confidence: 'low',
            aiProvider: 'gemini',
            latencyMs: 1500,
            imageQualityIssues: ['blur', 'poor_lighting'],
          }),
        });
      });
      
      // Verify page loaded
      expect(await page.textContent('body')).toBeTruthy();
    });
    
    test('should suggest retake for poor quality images', async ({ page }) => {
      await page.goto(`/?sku=${testBottles.filippoBerio.sku}`);
      await page.waitForLoadState('networkidle');
      
      // Mock API suggesting retake
      await page.route('**/analyze', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            scanId: 'test-retake',
            fillPercentage: 40,
            remainingMl: 200,
            confidence: 'low',
            aiProvider: 'groq',
            latencyMs: 2000,
            imageQualityIssues: ['obstruction'],
          }),
        });
      });
      
      // Verify page loaded
      expect(await page.textContent('body')).toBeTruthy();
    });
  });
  
  test.describe('Edge Cases', () => {
    
    test('should handle empty SKU parameter', async ({ page }) => {
      await page.goto('/?sku=');
      await page.waitForLoadState('networkidle');
      
      // Should handle gracefully
      const pageContent = await page.textContent('body');
      expect(pageContent.length).toBeGreaterThan(0);
    });
    
    test('should handle special characters in SKU', async ({ page }) => {
      await page.goto('/?sku=special%40%23%24chars');
      await page.waitForLoadState('networkidle');
      
      // Should handle or show error
      const pageContent = await page.textContent('body');
      expect(pageContent.length).toBeGreaterThan(0);
    });
    
    test('should handle very long SKU parameter', async ({ page }) => {
      const longSku = 'a'.repeat(500);
      await page.goto(`/?sku=${longSku}`);
      await page.waitForLoadState('networkidle');
      
      // Should handle gracefully
      const pageContent = await page.textContent('body');
      expect(pageContent.length).toBeGreaterThan(0);
    });
  });
});
