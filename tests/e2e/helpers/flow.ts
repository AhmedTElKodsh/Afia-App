import { Page, expect } from '@playwright/test';

/**
 * Shared helper to trigger analysis and handle the Fill Confirmation step
 * common in Stage 2.
 */
export async function triggerAnalyzeAndConfirm(page: Page) {
  // Register response waiter BEFORE triggering to avoid race condition
  const analyzePromise = page.waitForResponse(
    res => res.url().includes('/analyze'),
    { timeout: 20000 }
  );

  // Use the test hook — bypasses camera readyState race condition
  await page.evaluate(() => {
    (window as any).__AFIA_TRIGGER_ANALYZE__?.();
  });

  const response = await analyzePromise;
  expect(response.status()).toBe(200);

  // Wait a bit for the response to be processed and UI to update
  await page.waitForTimeout(500);

  // Stage 2: App now has an intermediate "Fill Confirmation" step
  // Wait for it and click confirm to proceed to results
  const fillConfirm = page.locator('.fill-confirm');
  const resultDisplay = page.locator('.result-display');
  
  try {
    // Race between fill-confirm appearing or result-display appearing directly
    await Promise.race([
      fillConfirm.waitFor({ state: 'visible', timeout: 8000 }),
      resultDisplay.waitFor({ state: 'visible', timeout: 8000 })
    ]);
    
    // If fill-confirm is visible, click it
    if (await fillConfirm.isVisible()) {
      // Robust click using evaluate to bypass any overlays or animations
      await page.evaluate(() => {
        const btn = Array.from(document.querySelectorAll('button')).find(
          b => b.textContent?.includes('Confirm') || b.className.includes('btn-success')
        ) as HTMLButtonElement | undefined;
        if (btn) btn.click();
      });
      
      // Wait for result display after clicking confirm
      await expect(resultDisplay).toBeVisible({ timeout: 10000 });
    }
  } catch (e) {
    // If neither appeared, try waiting for result display one more time
    console.log('Fill confirm or result display not shown, retrying result display...');
    await expect(resultDisplay).toBeVisible({ timeout: 10000 });
  }

  // Final verification that results are visible
  await expect(resultDisplay).toBeVisible({ timeout: 5000 });
}
