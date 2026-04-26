import { Page } from '@playwright/test';

/**
 * Utility functions for E2E tests
 */

/**
 * Wait for React to finish rendering and state updates
 */
export async function waitForReactUpdate(page: Page, timeout = 1000): Promise<void> {
  await page.waitForTimeout(timeout);
}

/**
 * Retry an action multiple times with exponential backoff
 */
export async function retryAction<T>(
  action: () => Promise<T>,
  maxRetries = 3,
  initialDelay = 500
): Promise<T> {
  let lastError: Error | undefined;
  
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await action();
    } catch (error) {
      lastError = error as Error;
      if (i < maxRetries - 1) {
        const delay = initialDelay * Math.pow(2, i);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  
  throw lastError;
}

/**
 * Wait for element with retry logic
 */
export async function waitForElementWithRetry(
  page: Page,
  selector: string,
  timeout = 10000
): Promise<void> {
  await retryAction(async () => {
    await page.waitForSelector(selector, { timeout, state: 'visible' });
  });
}

/**
 * Click element with retry logic
 */
export async function clickWithRetry(
  page: Page,
  selector: string,
  maxRetries = 3
): Promise<void> {
  await retryAction(async () => {
    const element = page.locator(selector).first();
    await element.waitFor({ state: 'visible', timeout: 10000 });
    await element.click({ timeout: 5000 });
  }, maxRetries);
}

/**
 * Safe evaluate that handles page closure
 */
export async function safeEvaluate<T>(
  page: Page,
  fn: () => T | Promise<T>
): Promise<T | null> {
  try {
    if (page.isClosed()) {
      return null;
    }
    return await page.evaluate(fn);
  } catch (error) {
    if (error instanceof Error && 
        (error.message.includes('Target page, context or browser has been closed') ||
         error.message.includes('Page is already closed'))) {
      return null;
    }
    throw error;
  }
}
