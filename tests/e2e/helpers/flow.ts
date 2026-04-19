import { Page, expect } from '@playwright/test';

/**
 * Shared helper to trigger analysis and handle the Fill Confirmation step
 * common in Stage 2.
 */
export async function triggerAnalyzeAndConfirm(page: Page) {
  // Register response waiter BEFORE triggering to avoid race condition
  const analyzePromise = page.waitForResponse(
    res => res.url().includes('/analyze'),
    { timeout: 15000 }
  );

  // Use the test hook — bypasses camera readyState race condition
  await page.evaluate(() => {
    (window as any).__AFIA_TRIGGER_ANALYZE__?.();
  });

  const response = await analyzePromise;
  expect(response.status()).toBe(200);

  // Stage 2: App now has an intermediate "Fill Confirmation" step
  // Wait for it and click confirm to proceed to results
  const fillConfirm = page.locator('.fill-confirm');
  try {
    // Wait for the confirmation screen to appear
    await fillConfirm.waitFor({ state: 'visible', timeout: 5000 });
    
    // Robust click using evaluate to bypass any overlays or animations
    await page.evaluate(() => {
      const btn = Array.from(document.querySelectorAll('button')).find(
        b => b.textContent?.includes('Confirm') || b.className.includes('btn-success')
      ) as HTMLButtonElement | undefined;
      if (btn) btn.click();
    });
  } catch (e) {
    // If not visible, maybe it's already at results (Stage 1 or auto-skip)
    console.log('Fill confirm not shown or timed out, continuing...');
  }

  // Final results should be visible
  await expect(page.locator('.result-display')).toBeVisible({ timeout: 15000 });
}
