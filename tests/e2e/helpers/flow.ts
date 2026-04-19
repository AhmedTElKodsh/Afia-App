import { Page, expect } from '@playwright/test';

/**
 * Shared helper to trigger analysis and handle the Fill Confirmation step
 * common in Stage 2.
 */
export async function triggerAnalyzeAndConfirm(page: Page) {
  // Register response waiter BEFORE triggering to avoid race condition
  const analyzePromise = page.waitForResponse(
    res => res.url().includes('/analyze'),
    { timeout: 25000 }
  );

  // Use the test hook — bypasses camera readyState race condition
  await page.evaluate(() => {
    (window as any).__AFIA_TRIGGER_ANALYZE__?.();
  });

  const response = await analyzePromise;
  expect(response.status()).toBe(200);

  // Wait for UI to process the response
  // Stage 2: App now has an intermediate "Fill Confirmation" step
  // Wait for it and click confirm to proceed to results
  const fillConfirm = page.locator('.fill-confirm');
  const resultDisplay = page.locator('.result-display');
  
  // Wait for either fill-confirm or result-display to appear
  await page.waitForSelector('.fill-confirm, .result-display', { timeout: 20000 });
  
  // Check if fill-confirm is visible and click it
  const isFillConfirmVisible = await fillConfirm.isVisible().catch(() => false);
  if (isFillConfirmVisible) {
    // Click the confirm button
    await page.evaluate(() => {
      const btn = Array.from(document.querySelectorAll('button')).find(
        b => b.textContent?.includes('Confirm') || b.className.includes('btn-success')
      ) as HTMLButtonElement | undefined;
      if (btn) btn.click();
    });
    
    // Wait for result display after clicking confirm
    await expect(resultDisplay).toBeVisible({ timeout: 20000 });
  }

  // Final verification that results are visible
  await expect(resultDisplay).toBeVisible({ timeout: 5000 });
}
