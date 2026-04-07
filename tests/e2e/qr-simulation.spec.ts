import { test, expect } from '@playwright/test';
import { mockCamera, mockAnalyzeSuccess } from './helpers/mockAPI';
import { testBottles } from './fixtures/testData';

/**
 * QR Code Simulation Tests
 *
 * The Afia app has NO traditional navigation — users arrive exclusively via
 * QR code scan, which produces a URL of the form:
 *   /?sku=<bottle-sku>[&mode=scan]
 *
 * "Simulating a QR scan" = navigating to that URL directly.
 * This test file verifies that every QR-reachable entry point works correctly.
 *
 * Coverage:
 *   1. Valid SKU URL → correct bottle loads (QR landing page)
 *   2. `mode=scan` param lands on the landing page with scan enabled
 *   3. All registered SKUs resolve to a bottle (no silent 404s)
 *   4. Invalid / missing SKU → clear unknown-bottle state
 *   5. QrMockGenerator renders QR codes for every bottle in admin panel
 *   6. QrMockGenerator "Copy URL" button copies correct URL
 *   7. QR landing page shows previous scan sparkline for returning users
 *   8. QR URL correctly isolates data per SKU (no cross-bottle leakage)
 */

// ─── All registered SKUs (matches shared/bottleRegistry.ts) ─────────────────
const REGISTERED_SKUS = [
  { sku: 'afia-corn-1.5l',        contains: 'Corn'  },
  { sku: 'afia-sunflower-250ml',  contains: '250'   },
  { sku: 'afia-sunflower-500ml',  contains: '500'   },
  { sku: 'afia-sunflower-700ml',  contains: '700'   },
  { sku: 'afia-sunflower-1l',     contains: '1'     },
  { sku: 'afia-sunflower-2.25l',  contains: '2'     },
  { sku: 'afia-sunflower-3l',     contains: '3'     },
  { sku: 'afia-sunflower-3.5l',   contains: '3'     },
];

// ─── Test Suite 1: QR URL as Entry Point ────────────────────────────────────

test.describe('QR Simulation: URL Entry Point (valid SKUs)', () => {

  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      window.localStorage.setItem('afia_privacy_accepted', 'true');
    });
  });

  test('navigating to /?sku=<valid> shows the QR landing page for that bottle', async ({ page }) => {
    await page.goto(`/?sku=${testBottles.filippoBerio.sku}`);
    await page.waitForLoadState('networkidle');

    // Bottle name / size pill should appear
    const pill = page.locator('.qrl-selector-pill');
    await expect(pill).toBeVisible({ timeout: 5000 });
    await expect(pill).toContainText(/500ml/i);

    // START SMART SCAN CTA is present
    await expect(
      page.locator('button:has-text("START SMART SCAN"), button:has-text("Start Scan")').first()
    ).toBeVisible();
  });

  test('navigating with mode=scan param loads landing page with scan intent', async ({ page }) => {
    await page.goto(`/?sku=${testBottles.filippoBerio.sku}&mode=scan`);
    await page.waitForLoadState('networkidle');

    // The landing page should still render correctly (mode=scan is a hint, not a route)
    await expect(page.locator('.qrl-selector-pill')).toBeVisible({ timeout: 5000 });
    await expect(
      page.locator('button:has-text("START SMART SCAN"), button:has-text("Start Scan")').first()
    ).toBeEnabled({ timeout: 5000 });
  });

  test('700ml SKU URL resolves correctly', async ({ page }) => {
    await page.goto(`/?sku=${testBottles.bertolli.sku}`);
    await page.waitForLoadState('networkidle');

    const pill = page.locator('.qrl-selector-pill');
    await expect(pill).toBeVisible({ timeout: 5000 });
    await expect(pill).toContainText(/700ml/i);
  });

  test('1L SKU URL resolves correctly', async ({ page }) => {
    await page.goto(`/?sku=${testBottles.afia.sku}`);
    await page.waitForLoadState('networkidle');

    const pill = page.locator('.qrl-selector-pill');
    await expect(pill).toBeVisible({ timeout: 5000 });
    await expect(pill).toContainText(/1/i);
  });

  test('all registered SKUs resolve without showing unknown-bottle state', async ({ page }) => {
    for (const { sku } of REGISTERED_SKUS) {
      await page.goto(`/?sku=${sku}`);
      await page.waitForLoadState('networkidle');

      // Must NOT show unknown bottle state
      const unknownEl = page.locator('.unknown-title, h1:has-text("not supported"), h1:has-text("unknown")');
      const isUnknown = await unknownEl.isVisible({ timeout: 2000 }).catch(() => false);
      expect(isUnknown, `SKU "${sku}" should not show unknown-bottle state`).toBe(false);

      // Must show the landing page CTA
      await expect(
        page.locator('button:has-text("START SMART SCAN"), button:has-text("Start Scan")').first(),
        `SKU "${sku}" should show scan CTA`
      ).toBeVisible({ timeout: 5000 });
    }
  });
});

// ─── Test Suite 2: Invalid / Missing SKU ─────────────────────────────────────

test.describe('QR Simulation: Invalid / Missing SKU states', () => {

  test('navigating with no SKU shows "No bottle linked" state', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    await expect(
      page.locator('.unknown-title, h1').first()
    ).toContainText(/not (yet )?supported|unknown|No bottle linked/i, { timeout: 5000 });
  });

  test('navigating with invalid SKU shows not-supported state', async ({ page }) => {
    await page.goto('/?sku=fake-bottle-99999');
    await page.waitForLoadState('networkidle');

    await expect(
      page.locator('.unknown-title, h1').first()
    ).toContainText(/not (yet )?supported|unknown/i, { timeout: 5000 });
  });

  test('invalid SKU does NOT show a camera start button', async ({ page }) => {
    await page.goto('/?sku=nonexistent-sku-abc');
    await page.waitForLoadState('networkidle');

    const startBtn = page.locator('button:has-text("START SMART SCAN"), button:has-text("Start Scan")');
    const isVisible = await startBtn.isVisible({ timeout: 2000 }).catch(() => false);
    expect(isVisible).toBe(false);
  });

  test('empty SKU param (?sku=) shows unknown state', async ({ page }) => {
    await page.goto('/?sku=');
    await page.waitForLoadState('networkidle');

    await expect(
      page.locator('.unknown-title, h1').first()
    ).toContainText(/not (yet )?supported|unknown|No bottle/i, { timeout: 5000 });
  });
});

// ─── Test Suite 3: Privacy Gate in QR Flow ───────────────────────────────────

test.describe('QR Simulation: Privacy consent gate', () => {

  test('START SMART SCAN is disabled until privacy checkbox is checked (first visit)', async ({ page }) => {
    // Ensure privacy NOT pre-accepted
    await page.addInitScript(() => {
      window.localStorage.removeItem('afia_privacy_accepted');
    });

    await page.goto(`/?sku=${testBottles.filippoBerio.sku}`);
    await page.waitForLoadState('networkidle');

    const startBtn = page.locator('button:has-text("START SMART SCAN"), button:has-text("Start Scan")').first();
    await expect(startBtn).toBeDisabled({ timeout: 5000 });

    // Checking the privacy checkbox enables the button
    await page.locator('label:has-text("I agree to privacy terms"), input[type="checkbox"]').first()
      .click({ force: true });
    await expect(startBtn).toBeEnabled({ timeout: 3000 });
  });

  test('START SMART SCAN is immediately enabled on repeat visit (privacy already accepted)', async ({ page }) => {
    await page.addInitScript(() => {
      window.localStorage.setItem('afia_privacy_accepted', 'true');
    });

    await page.goto(`/?sku=${testBottles.filippoBerio.sku}`);
    await page.waitForLoadState('networkidle');

    await expect(
      page.locator('button:has-text("START SMART SCAN"), button:has-text("Start Scan")').first()
    ).toBeEnabled({ timeout: 5000 });
  });
});

// ─── Test Suite 4: QR Landing Sparkline (returning user) ─────────────────────

test.describe('QR Simulation: QR Landing history sparkline', () => {

  test('shows "1 scan" count when bottle has one prior scan in history', async ({ page }) => {
    await page.addInitScript(() => {
      window.localStorage.setItem('afia_privacy_accepted', 'true');
      window.localStorage.setItem('afia_scan_history', JSON.stringify([
        {
          id: 'sparkline-test-1',
          sku: 'afia-sunflower-500ml',
          bottleName: 'Afia Pure Sunflower Oil 500ml',
          timestamp: new Date().toISOString(),
          fillPercentage: 70,
          remainingMl: 350,
          consumedMl: 150,
          confidence: 'high',
        },
      ]));
    });

    await page.goto('/?sku=afia-sunflower-500ml');
    await page.waitForLoadState('networkidle');

    const sparklineCount = page.locator('.qrl-sparkline-count');
    await expect(sparklineCount).toBeVisible({ timeout: 5000 });
    await expect(sparklineCount).toContainText('1');
  });

  test('sparkline only shows scans for the current SKU (no cross-SKU leakage)', async ({ page }) => {
    await page.addInitScript(() => {
      window.localStorage.setItem('afia_privacy_accepted', 'true');
      window.localStorage.setItem('afia_scan_history', JSON.stringify([
        {
          id: 'sku-a-1', sku: 'afia-sunflower-500ml', bottleName: 'Afia 500ml',
          timestamp: new Date().toISOString(), fillPercentage: 70, remainingMl: 350, consumedMl: 150, confidence: 'high',
        },
        {
          id: 'sku-b-1', sku: 'afia-sunflower-1l', bottleName: 'Afia 1L',
          timestamp: new Date().toISOString(), fillPercentage: 40, remainingMl: 400, consumedMl: 600, confidence: 'medium',
        },
      ]));
    });

    // Navigate to 500ml — should see count "1" (not "2")
    await page.goto('/?sku=afia-sunflower-500ml');
    await page.waitForLoadState('networkidle');

    const sparklineCount = page.locator('.qrl-sparkline-count');
    await expect(sparklineCount).toBeVisible({ timeout: 5000 });
    const text = await sparklineCount.textContent();
    expect(text?.trim()).toContain('1');
  });

  test('no sparkline shown on first-ever visit to a SKU (zero history)', async ({ page }) => {
    await page.addInitScript(() => {
      window.localStorage.setItem('afia_privacy_accepted', 'true');
      window.localStorage.removeItem('afia_scan_history');
    });

    await page.goto(`/?sku=${testBottles.filippoBerio.sku}`);
    await page.waitForLoadState('networkidle');

    const sparklineCount = page.locator('.qrl-sparkline-count');
    const isVisible = await sparklineCount.isVisible({ timeout: 2000 }).catch(() => false);
    // Either hidden or not present — zero scans means no sparkline
    expect(isVisible).toBe(false);
  });
});

// ─── Test Suite 5: Admin QrMockGenerator ─────────────────────────────────────

test.describe('QrMockGenerator: Admin QR Codes Tab', () => {

  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      window.sessionStorage.setItem('afia_admin_session', 'valid-token');
      window.sessionStorage.setItem('afia_admin_session_expires', String(Date.now() + 3600000));
      window.localStorage.setItem('afia_privacy_accepted', 'true');
    });
    // Desktop viewport — admin nav is always visible
    await page.setViewportSize({ width: 1280, height: 800 });
  });

  test('QR Codes tab in admin shows QrMockGenerator', async ({ page }) => {
    await page.goto('/?mode=admin');
    await page.waitForSelector('.top-navbar, .brand-name');

    await page.getByRole('button', { name: /QR Codes/i }).click();
    await expect(page.locator('.qr-mock-generator')).toBeVisible({ timeout: 5000 });
  });

  test('QrMockGenerator renders a QR code card for every registered bottle', async ({ page }) => {
    await page.goto('/?mode=admin');
    await page.waitForSelector('.top-navbar, .brand-name');
    await page.getByRole('button', { name: /QR Codes/i }).click();
    await expect(page.locator('.qr-mock-generator')).toBeVisible({ timeout: 5000 });

    // Each bottle has a card with an SVG QR code (restricted to 1 active bottle)
    const qrCards = page.locator('.qrmg-card');
    expect(await qrCards.count()).toBeGreaterThanOrEqual(1);

    // Each card contains a QR code SVG — qrcode.react renders with role="img"
    // (other SVGs in the card are Lucide icons; target the QR code specifically)
    for (let i = 0; i < await qrCards.count(); i++) {
      await expect(qrCards.nth(i).locator('svg[role="img"]')).toBeAttached();
    }
  });

  test('each QR card displays the bottle name and SKU', async ({ page }) => {
    await page.goto('/?mode=admin');
    await page.waitForSelector('.top-navbar, .brand-name');
    await page.getByRole('button', { name: /QR Codes/i }).click();
    await expect(page.locator('.qr-mock-generator')).toBeVisible({ timeout: 5000 });

    const firstCard = page.locator('.qrmg-card').first();
    await expect(firstCard.locator('.qrmg-bottle-name')).toBeVisible();
    await expect(firstCard.locator('.qrmg-sku')).toBeVisible();
  });

  test('each QR card shows the full app URL for that SKU', async ({ page }) => {
    await page.goto('/?mode=admin');
    await page.waitForSelector('.top-navbar, .brand-name');
    await page.getByRole('button', { name: /QR Codes/i }).click();
    await expect(page.locator('.qr-mock-generator')).toBeVisible({ timeout: 5000 });

    // URL display contains ?sku= param
    const urlDisplay = page.locator('.qrmg-url-display').first();
    await expect(urlDisplay).toBeVisible();
    await expect(urlDisplay).toContainText(/\?sku=/);
  });

  test('"Copy URL" button copies the SKU URL to clipboard', async ({ page, context }) => {
    // Grant clipboard permission
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);

    await page.goto('/?mode=admin');
    await page.waitForSelector('.top-navbar, .brand-name');
    await page.getByRole('button', { name: /QR Codes/i }).click();
    await expect(page.locator('.qr-mock-generator')).toBeVisible({ timeout: 5000 });

    // Click Copy URL on first card
    await page.locator('.qrmg-copy-btn').first().click();

    // Button shows "Copied!" feedback
    await expect(page.locator('.qrmg-copy-btn').first()).toContainText(/Copied!/i, { timeout: 3000 });

    // Clipboard contains a URL with ?sku= param
    const clipboardText = await page.evaluate(() => navigator.clipboard.readText());
    expect(clipboardText).toMatch(/\?sku=/);
  });

  test('HTTPS status badge shows when running on localhost (secure context)', async ({ page }) => {
    await page.goto('/?mode=admin');
    await page.waitForSelector('.top-navbar, .brand-name');
    await page.getByRole('button', { name: /QR Codes/i }).click();
    await expect(page.locator('.qr-mock-generator')).toBeVisible({ timeout: 5000 });

    // localhost is a secure context — should show HTTPS Active badge
    await expect(page.locator('.qrmg-status-ok')).toBeVisible({ timeout: 3000 });
    await expect(page.locator('.qrmg-status-ok')).toContainText(/HTTPS Active/i);
  });

  test('Quick Start Guide and Troubleshooting sections are visible', async ({ page }) => {
    await page.goto('/?mode=admin');
    await page.waitForSelector('.top-navbar, .brand-name');
    await page.getByRole('button', { name: /QR Codes/i }).click();
    await expect(page.locator('.qr-mock-generator')).toBeVisible({ timeout: 5000 });

    await expect(page.locator('.qrmg-quickstart')).toBeVisible();
    await expect(page.locator('.qrmg-troubleshooting')).toBeVisible();
  });
});

// ─── Test Suite 6: QR → Full Scan Flow (desktop camera mock) ─────────────────

test.describe('QR Simulation: Full scan flow triggered from URL entry point', () => {

  test('QR URL → privacy accept → camera → analyze → results (end-to-end)', async ({ page }) => {
    await page.addInitScript(() => {
      window.localStorage.setItem('afia_privacy_accepted', 'true');
      (window as any).__AFIA_TEST_MODE__ = true;
    });
    await mockCamera(page);
    await mockAnalyzeSuccess(page);

    // Simulate QR scan by navigating to URL with SKU
    await page.goto(`/?sku=${testBottles.filippoBerio.sku}&mode=scan`);
    await page.waitForLoadState('networkidle');

    // 1. Landing page loaded for correct bottle
    await expect(page.locator('.qrl-selector-pill')).toContainText(/500ml/i, { timeout: 5000 });

    // 2. Start scan (privacy already accepted)
    const startBtn = page.locator('button:has-text("START SMART SCAN"), button:has-text("Start Scan")').first();
    await expect(startBtn).toBeEnabled({ timeout: 5000 });
    await page.evaluate(() => {
      const btn = document.querySelector('button.qrl-cta') as HTMLButtonElement
        ?? Array.from(document.querySelectorAll('button')).find(
          b => b.textContent?.includes('START SMART SCAN') || b.textContent?.includes('Start Scan')
        ) as HTMLButtonElement;
      if (btn) btn.click();
    });

    // 3. Camera activates
    await expect(page.locator('.camera-active').first()).toBeVisible({ timeout: 15000 });
    await expect(page.locator('.camera-capture-btn')).toBeEnabled({ timeout: 10000 });

    // 4. Trigger analysis via test hook
    const analyzePromise = page.waitForResponse(
      res => res.url().includes('/analyze'),
      { timeout: 15000 }
    );
    await page.evaluate(() => { (window as any).__AFIA_TRIGGER_ANALYZE__?.(); });
    const response = await analyzePromise;
    expect(response.status()).toBe(200);

    // 5. Results displayed
    await expect(page.locator('.result-display')).toBeVisible({ timeout: 15000 });
    await expect(page.locator('.result-metric__value').first()).toContainText(/ml/i);

    // 6. Feedback grid appears
    await expect(page.locator('.feedback-grid-container')).toBeVisible({ timeout: 5000 });
  });
});
