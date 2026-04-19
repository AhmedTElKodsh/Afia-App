import { Page, expect } from '@playwright/test';

/**
 * Shared helper to trigger analysis and handle the Fill Confirmation step
 * common in Stage 2.
 */
export async function triggerAnalyzeAndConfirm(page: Page) {
  try {
    // Check if page is still valid before starting
    if (page.isClosed()) {
      throw new Error('Page is already closed');
    }

    // Register response waiter BEFORE triggering to avoid race condition
    const analyzePromise = page.waitForResponse(
      res => res.url().includes('/analyze'),
      { timeout: 30000 }
    );

    // Use the test hook — bypasses camera readyState race condition
    await page.evaluate(() => {
      (window as any).__AFIA_TRIGGER_ANALYZE__?.();
    });

    const response = await analyzePromise;
    expect(response.status()).toBe(200);

    // Wait for page to be in a stable state after API response
    await page.waitForLoadState('domcontentloaded', { timeout: 10000 }).catch(() => {});

    // Wait for UI to process the response
    // Stage 2: App now has an intermediate "Fill Confirmation" step
    // Wait for it and click confirm to proceed to results
    const fillConfirm = page.locator('.fill-confirm');
    const resultDisplay = page.locator('.result-display');
    
    // Wait for either fill-confirm or result-display to appear with longer timeout
    await page.waitForSelector('.fill-confirm, .result-display', { 
      timeout: 25000,
      state: 'visible'
    });
    
    // Check if fill-confirm is visible and click it
    const isFillConfirmVisible = await fillConfirm.isVisible().catch(() => false);
    if (isFillConfirmVisible) {
      // Click the confirm button using a more reliable method
      await page.evaluate(() => {
        const btn = Array.from(document.querySelectorAll('button')).find(
          b => b.textContent?.includes('Confirm') || b.className.includes('btn-success')
        ) as HTMLButtonElement | undefined;
        if (btn) btn.click();
      });
      
      // Wait for result display after clicking confirm with extended timeout
      await expect(resultDisplay).toBeVisible({ timeout: 25000 });
    }

    // Final verification that results are visible
    await expect(resultDisplay).toBeVisible({ timeout: 10000 });
  } catch (error) {
    // Check if error is due to page/context closure
    if (error instanceof Error && 
        (error.message.includes('Target page, context or browser has been closed') ||
         error.message.includes('Page is already closed'))) {
      throw new Error(`Browser context closed during analysis flow: ${error.message}`);
    }
    throw error;
  }
}
