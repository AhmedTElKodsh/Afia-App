import { test, expect } from '@playwright/test';

/**
 * Visual Regression Tests for Premium UI Components
 * 
 * Grouped for performance: navigates once to the gallery and snapshots all states.
 * 
 * Run: npx playwright test --update-snapshots
 */

test.describe('Premium UI Components - Visual Regression', () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
  });

  test('QR Landing Page - States', async ({ page }) => {
    // Default
    await page.goto('/?sku=afia-corn-1.5l');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500);
    expect(await page.screenshot()).toMatchSnapshot('qr-landing-default.png');

    // Offline
    await page.context().setOffline(true);
    await page.waitForTimeout(200);
    expect(await page.screenshot()).toMatchSnapshot('qr-landing-offline.png');
    await page.context().setOffline(false);
  });

  test('Privacy Inline - States', async ({ page }) => {
    await page.goto('/?sku=afia-corn-1.5l');
    const card = page.locator('.privacy-inline-card');
    await card.waitFor({ state: 'visible' });
    
    // Collapsed
    expect(await card.screenshot()).toMatchSnapshot('privacy-inline-collapsed.png', { maxDiffPixelRatio: 0.02 });

    // Expanded
    await page.click('button:has-text("Learn More")');
    await page.waitForTimeout(300);
    expect(await card.screenshot()).toMatchSnapshot('privacy-inline-expanded.png');
  });

  test('Component Gallery - All States', async ({ page }) => {
    // Setup session
    await page.addInitScript(() => {
      window.sessionStorage.setItem("afia_admin_session", "mock-test-token");
      window.sessionStorage.setItem("afia_admin_session_expires", (Date.now() + 3600000).toString());
      window.localStorage.setItem('afia_privacy_accepted', 'true');
      window.localStorage.setItem('afia_admin_onboarding_seen', 'true'); 
      window.localStorage.setItem('i18nextLng', 'en');
    });

    // Jump directly to visuals
    await page.goto('/?mode=admin&sku=afia-corn-1.5l&view=scan&tab=visuals');
    await page.waitForSelector('[data-testid="visual-harness"]', { state: 'visible', timeout: 15000 });

    // Snapshots
    await expect(page.locator('[data-testid="gauge-75"]')).toHaveScreenshot('gauge-75.png');
    await expect(page.locator('[data-testid="gauge-40"]')).toHaveScreenshot('gauge-40.png');
    await expect(page.locator('[data-testid="gauge-15"]')).toHaveScreenshot('gauge-15.png');
    
    await expect(page.locator('[data-testid="confidence-high"]')).toHaveScreenshot('confidence-high.png');
    await expect(page.locator('[data-testid="confidence-medium"]')).toHaveScreenshot('confidence-medium.png');
    await expect(page.locator('[data-testid="confidence-low"]')).toHaveScreenshot('confidence-low.png');
    
    await expect(page.locator('[data-testid="feedback-default"]')).toHaveScreenshot('feedback-default.png');
    await expect(page.locator('[data-testid="feedback-selected"]')).toHaveScreenshot('feedback-selected.png');
    await expect(page.locator('[data-testid="feedback-confirmed"]')).toHaveScreenshot('feedback-confirmed.png');
  });

  test('Responsive & Themes', async ({ page }) => {
    const url = '/?sku=afia-corn-1.5l';
    
    // Tablet
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.goto(url);
    await page.waitForLoadState('networkidle');
    expect(await page.screenshot()).toMatchSnapshot('responsive-tablet-768.png');

    // Desktop
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto(url);
    await page.waitForLoadState('networkidle');
    expect(await page.screenshot()).toMatchSnapshot('responsive-desktop-1440.png');

    // Dark Theme Check (Functional)
    const bgColor = await page.evaluate(() => window.getComputedStyle(document.body).backgroundColor);
    expect(['rgb(2, 8, 16)', 'rgb(253, 251, 244)']).toContain(bgColor);

    // Reduced Motion
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto(url);
    await page.waitForLoadState('networkidle');
    expect(await page.screenshot()).toMatchSnapshot('reduced-motion.png');
  });
});

test.describe('Accessibility - Focus States', () => {
  test('Keyboard Navigation', async ({ page }) => {
    await page.goto('/?sku=afia-corn-1.5l');
    
    // Focus visible
    await page.keyboard.press('Tab');
    const focusedTag = await page.evaluate(() => document.activeElement?.tagName ?? 'BODY');
    expect(focusedTag).not.toBe('BODY');

    // Element count
    const count = await page.locator('button, a, input, [tabindex="0"]').count();
    expect(count).toBeGreaterThanOrEqual(2);
  });
});
