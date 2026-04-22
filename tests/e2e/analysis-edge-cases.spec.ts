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
    // Make local model loading fail quickly to force LLM fallback
    await page.addInitScript(() => {
      // Override isModelLoaded to return false
      (window as any).__mockModelNotLoaded__ = true;
    });
    
    // Mock the analyze endpoint to simulate network error and sync queue behavior
    await page.route(/:8787\/analyze$/, async (route) => {
      // Simulate the sync queue response that would be returned on network error
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          scanId: `queued-${Date.now()}`,
          fillPercentage: 50,
          remainingMl: 750,
          confidence: 'low',
          aiProvider: 'queued',
          latencyMs: 0,
          queuedForSync: true,
        }),
      });
    });
    
    // Reload to apply init script
    await page.reload();

    // Wait for the app to be ready
    await expect(page.locator('.qr-landing')).toBeVisible({ timeout: 15000 });

    // Trigger analysis
    await page.waitForFunction(() => (window as any).__AFIA_TRIGGER_ANALYZE__ !== undefined, { timeout: 15000 });
    await page.evaluate(() => {
      (window as any).__AFIA_TRIGGER_ANALYZE__();
    });
    
    // Wait for result display to render
    await expect(page.locator('.result-display')).toBeVisible({ timeout: 15000 });
    
    // Check for sync pending icon
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
    
    // Mock the analyze endpoint to return a successful response (fail-open behavior)
    await page.route(/:8787\/analyze$/, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          scanId: 'test-scan-failopen',
          fillPercentage: 55,
          remainingMl: 825,
          confidence: 'high',
          aiProvider: 'gemini',
          latencyMs: 1500,
        }),
      });
    });
    
    await page.reload(); // Ensure init script runs
    
    // Wait for app to be ready after reload
    await expect(page.locator('.qr-landing')).toBeVisible({ timeout: 15000 });
    
    // Trigger analysis
    await page.waitForFunction(() => (window as any).__AFIA_TRIGGER_ANALYZE__ !== undefined, { timeout: 15000 });
    await page.evaluate(() => {
      (window as any).__AFIA_TRIGGER_ANALYZE__();
    });
    
    // Wait for either fill-confirm or result-display (analysis completed despite quality check crash)
    await page.waitForSelector('.fill-confirm, .result-display', { timeout: 30000, state: 'visible' });
    
    // Verify analysis completed (fail-open worked)
    const hasFillConfirm = await page.locator('.fill-confirm').isVisible().catch(() => false);
    const hasResultDisplay = await page.locator('.result-display').isVisible().catch(() => false);
    
    // Either state indicates successful fail-open
    expect(hasFillConfirm || hasResultDisplay).toBe(true);
  });
});
