import { Page, expect } from '@playwright/test';

/**
 * Accept the privacy dialog if it appears
 * This function waits for the dialog to fully load and clicks the accept button
 * Call this BEFORE any interaction that requires the dialog to be dismissed
 */
export async function acceptPrivacyDialog(page: Page) {
  try {
    // 1. Check for PrivacyNotice (Overlay version)
    const overlay = page.locator('.privacy-overlay');
    if (await overlay.isVisible({ timeout: 1000 }).catch(() => false)) {
      const acceptBtn = overlay.locator('.privacy-accept, button:has-text("I Understand")').first();
      if (await acceptBtn.isVisible()) {
        await acceptBtn.click({ force: true });
        await overlay.waitFor({ state: 'hidden', timeout: 5000 }).catch(() => {});
        return;
      }
    }

    // 2. Check for PrivacyInline (Inline version in QrLanding)
    const inline = page.locator('.privacy-inline-card, .privacy-inline-container');
    if (await inline.isVisible({ timeout: 2000 }).catch(() => false)) {
      // Force set storage and check
      await page.evaluate(() => localStorage.setItem('afia_privacy_accepted', 'true'));
      
      const checkbox = inline.locator('input[type="checkbox"]').first();
      await checkbox.click({ force: true }).catch(() => {});
      
      const acceptBtn = inline.locator('button:has-text("START SMART SCAN"), .privacy-accept-btn').first();
      await expect(acceptBtn).toBeEnabled({ timeout: 5000 });
      await acceptBtn.click({ force: true });
      
      await expect(inline).toBeHidden({ timeout: 5000 });
      return;
    }
  } catch (e) {
    // Silence errors as dialog may already be accepted or not present
  }
}

/**
 * Dismiss the privacy dialog if decline option exists
 */
export async function dismissPrivacyDialog(page: Page) {
  const dismissButton = page.locator(
    'button:has-text("Decline"), button:has-text("Cancel"), button[aria-label="Close"]'
  ).first();
  
  if (await dismissButton.isVisible()) {
    await dismissButton.click();
    await page.waitForTimeout(300);
  }
}

/**
 * Handle privacy dialog - either accept or dismiss
 * @param page - Playwright page
 * @param action - 'accept' or 'dismiss'
 */
export async function handlePrivacyDialog(page: Page, action: 'accept' | 'dismiss' = 'accept') {
  if (action === 'accept') {
    await acceptPrivacyDialog(page);
  } else {
    await dismissPrivacyDialog(page);
  }
}

/**
 * Clicks the Start Scan button with retry logic and longer timeout
 */
export async function clickStartScan(page: Page) {
  // If we are already in camera view or loading it, skip
  const cameraView = page.locator('.camera-active, .camera-video, .camera-loading');
  if (await cameraView.isVisible({ timeout: 500 }).catch(() => false)) {
    return;
  }

  const startButton = getStartScanButton(page);
  
  // Wait for button to be visible
  try {
    await startButton.waitFor({ state: 'visible', timeout: 5000 });
    
    // Check if it's disabled - if it is, maybe privacy wasn't accepted
    if (await startButton.isDisabled()) {
       // Force accept privacy again just in case
       await page.evaluate(() => localStorage.setItem('afia_privacy_accepted', 'true'));
       await page.locator('input[type="checkbox"]').check({ force: true }).catch(() => {});
       await expect(startButton).toBeEnabled({ timeout: 5000 });
    }

    await startButton.click({ force: true });
  } catch (e) {
    // If it's already gone, assume transition started
    if (await cameraView.isVisible({ timeout: 2000 }).catch(() => false)) {
      return;
    }
  }
}

/**
 * Get the Start Scan button with proper selector
 */
export function getStartScanButton(page: Page) {
  return page.locator('button:has-text("START SMART SCAN"), button:has-text("Start Scan"), [data-testid="start-scan"]').first();
}

/**
 * Clicks the capture button using direct evaluation if normal click fails
 * (Guidance re-renders often detach the button)
 */
export async function clickCapture(page: Page) {
  const btn = page.locator('.camera-capture-btn').first();
  await expect(btn).toBeVisible({ timeout: 10000 });
  
  // Wait for it to be enabled if it was disabled by guidance
  await expect(btn).toBeEnabled({ timeout: 10000 }).catch(() => {});

  // Use evaluate to click directly on the element in the browser
  // dispatching a pointerdown+pointerup sequence is often more reliable than .click()
  await page.evaluate(() => {
    const el = document.querySelector('.camera-capture-btn') as HTMLButtonElement;
    if (el) {
      el.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
      el.dispatchEvent(new PointerEvent('pointerup', { bubbles: true }));
      el.click();
    }
  });
}

/**
 * Get capture button with proper selector
 */
export function getCaptureButton(page: Page) {
  return page.locator('.camera-capture-btn').first();
}

/**
 * Get use photo button with proper selector
 */
export function getUsePhotoButton(page: Page) {
  return page.locator(
    'button:has-text("Use"), button:has-text("Use Photo"), button:has-text("Analyze"), [data-testid*="use"]'
  ).first();
}

/**
 * Get retake button with proper selector
 */
export function getRetakeButton(page: Page) {
  return page.locator(
    'button:has-text("Retake"), button:has-text("Retake Photo"), [data-testid*="retake"]'
  ).first();
}
