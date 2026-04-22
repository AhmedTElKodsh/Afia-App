import { test, expect, Page } from '@playwright/test';
import { setupDefaultMocks } from './helpers/mockAPI';

test.describe('Analysis Router Edge Cases', () => {
  test.beforeEach(async ({ page }) => {
    page.on('console', msg => console.log('BROWSER CONSOLE:', msg.type(), msg.text()));
    page.on('request', request => {
      if (request.url().includes('localhost:5173')) {
        // Skip normal dev server requests unless they are intercepted
      } else {
        console.log('BROWSER REQUEST:', request.method(), request.url());
      }
    });
    page.on('response', response => {
      if (response.status() === 200 && response.headers()['content-type']?.includes('application/json')) {
        if (response.url().includes('localhost:5173')) {
          console.log('INTERCEPTED DEV SERVER REQUEST:', response.url());
        }
      }
    });
    await setupDefaultMocks(page);
    
    // Set test mode in init script so it persists across reloads
    await page.addInitScript(() => {
      (window as any).__AFIA_TEST_MODE__ = true;
    });

    // Navigate with a valid SKU to set origin
    await page.goto('/?sku=afia-corn-1.5l');
    
    // Set onboarding and mock state
    await page.evaluate(() => {
      localStorage.setItem('afia_mock_mode', 'true');
      localStorage.setItem('afia_onboarding_complete', 'true');
      localStorage.setItem('afia_privacy_accepted', 'true');
    });
    
    // Reload to ensure app starts with the correct state
    await page.reload();
  });

  test('should handle NEEDS_SKU error when brand confidence is low', async ({ page }) => {
    // Set low confidence to trigger LLM fallback path
    await page.evaluate(() => {
      localStorage.setItem('afia_force_local_confidence', '0.1');
    });

    await page.route(/:8787\/analyze$/, async (route) => {
      await route.fulfill({
        status: 400,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'NEEDS_SKU: Brand detection confidence too low' })
      });
    });

    // Wait for the app to be ready and show QrLanding or selector
    await expect(page.locator('.qr-landing, .unknown-bottle')).toBeVisible({ timeout: 15000 });

    // Trigger analysis directly via hook
    await page.waitForFunction(() => (window as any).__AFIA_TRIGGER_ANALYZE__ !== undefined, { timeout: 15000 });
    await page.evaluate(() => {
      (window as any).__AFIA_TRIGGER_ANALYZE__();
    });
    
    // Based on App.tsx code: NEEDS_SKU resets to IDLE view.
    await expect(page.locator('.unknown-bottle, .qr-landing')).toBeVisible({ timeout: 15000 });
  });

  test('should enqueue request for background sync on network failure', async ({ page }) => {
    // Set flags to force network error and sync queueing
    await page.evaluate(() => {
      localStorage.setItem('afia_force_local_confidence', '0.3');
      localStorage.setItem('afia_net_error_sync', 'true');
    });

    // Wait for the app to be ready
    await expect(page.locator('.qr-landing')).toBeVisible({ timeout: 15000 });

    // Trigger analysis
    await page.waitForFunction(() => (window as any).__AFIA_TRIGGER_ANALYZE__ !== undefined, { timeout: 15000 });
    await page.evaluate(() => {
      (window as any).__AFIA_TRIGGER_ANALYZE__();
    });
    
    // Wait for analysis to complete and result display to render
    await page.waitForFunction(() => {
      return document.querySelector('.result-display') !== null;
    }, { timeout: 20000 });
    
    const syncNotice = page.locator('[data-testid="sync-pending-icon"]');
    await expect(syncNotice).toBeVisible({ timeout: 15000 });
    
    // Check for "queued" or "sync" related text
    const syncText = await syncNotice.textContent();
    expect(syncText?.toLowerCase()).toMatch(/queued|sync/);
  });

  test('should fail-open when quality check crashes', async ({ page }) => {
    await page.addInitScript(() => {
      // Define override before app loads
      (window as any).analyzeImageQuality = async () => { throw new Error('Crashed'); };
    });
    
    await page.reload(); // Ensure init script runs
    
    // Wait for app to be ready after reload
    await expect(page.locator('.qr-landing')).toBeVisible({ timeout: 15000 });
    
    // Trigger analysis
    await page.waitForFunction(() => (window as any).__AFIA_TRIGGER_ANALYZE__ !== undefined, { timeout: 15000 });
    await page.evaluate(() => {
      (window as any).__AFIA_TRIGGER_ANALYZE__();
    });
    
    // Wait for analysis to complete (either success or fail-open)
    await page.waitForFunction(() => {
      return document.querySelector('.result-display') !== null || 
             document.querySelector('.error-notice') !== null;
    }, { timeout: 25000 });
    
    // Result should eventually appear (fail-open logic)
    await expect(page.locator('.result-display')).toBeVisible({ timeout: 10000 });
  });
});
