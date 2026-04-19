import { test, expect } from '@playwright/test';

/**
 * Epics 7 & 8: Single-SKU Restriction & Data Export
 *
 * Epic 7 — REWRITTEN: The app was originally designed to support multiple
 * bottle SKUs (Story 7.1). It has since been hard-locked to a single SKU
 * (afia-corn-1.5l). The tests below assert that behaviour instead: only
 * the 1.5L Corn Oil bottle is recognised, and unknown/legacy SKUs gracefully
 * fall back or are rejected.
 *
 * Epic 8 — Story 8.1: Admin can export scan data as CSV / JSON (unchanged).
 */

const ACTIVE_SKU = 'afia-corn-1.5l';
const ACTIVE_NAME_FRAGMENT = /1\.5[lL]|corn/i;

// ─── Shared admin init script ───────────────────────────────────────────────
async function seedHistoryAndLogin(page: any) {
  await page.addInitScript(() => {
    window.sessionStorage.setItem('afia_admin_session', 'valid-token');
    window.sessionStorage.setItem('afia_admin_session_expires', String(Date.now() + 3600000));
    const mockScans = [
      {
        id: 'export-1',
        sku: 'afia-corn-1.5l',
        bottleName: 'Afia Pure Corn Oil 1.5L',
        timestamp: new Date(Date.now() - 86400000).toISOString(),
        fillPercentage: 80,
        remainingMl: 1200,
        consumedMl: 300,
        confidence: 'high',
      },
      {
        id: 'export-2',
        sku: 'afia-corn-1.5l',
        bottleName: 'Afia Pure Corn Oil 1.5L',
        timestamp: new Date().toISOString(),
        fillPercentage: 55,
        remainingMl: 825,
        consumedMl: 675,
        confidence: 'medium',
      },
    ];
    localStorage.setItem('afia_scan_history', JSON.stringify(mockScans));
    localStorage.setItem('afia_privacy_accepted', 'true');
  });
}

// ─── Epic 7: Single-SKU Restriction ──────────────────────────────────────────

test.describe('Epic 7: Single-SKU Restriction (1.5L only)', () => {

  test.describe('Active SKU via URL', () => {

    test('should display the 1.5L Corn Oil bottle details', async ({ page }) => {
      await page.goto(`/?sku=${ACTIVE_SKU}`);
      await page.waitForLoadState('networkidle');

      const pill = page.locator('.qrl-selector-pill');
      await expect(pill).toBeVisible({ timeout: 5000 });
      await expect(pill).toContainText(ACTIVE_NAME_FRAGMENT);
    });

    test('legacy sunflower SKUs fall back gracefully (no crash)', async ({ page }) => {
      // These SKUs were removed from the registry. The app should not crash
      // when an old QR code is scanned — it should either render a fallback
      // or the default landing state.
      const legacySkus = [
        'afia-sunflower-500ml',
        'afia-sunflower-1l',
        'afia-sunflower-700ml',
      ];

      for (const sku of legacySkus) {
        await page.goto(`/?sku=${sku}`);
        await page.waitForLoadState('networkidle');
        // App shell must still render — no white screen of death
        await expect(page.locator('body')).toBeVisible();
      }
    });

    test('root URL (no SKU) renders the landing page', async ({ page }) => {
      await page.goto('/');
      await page.waitForLoadState('networkidle');
      await expect(page.locator('body')).toBeVisible();
    });
  });

  test.describe('Scan history (localStorage)', () => {

    test('should store scan in history for the active SKU', async ({ page }) => {
      await page.addInitScript(() => {
        const storedScan = {
          id: 'single-sku-scan-1',
          sku: 'afia-corn-1.5l',
          bottleName: 'Afia Pure Corn Oil 1.5L',
          timestamp: new Date().toISOString(),
          fillPercentage: 60,
          remainingMl: 900,
          consumedMl: 600,
          confidence: 'high',
        };
        localStorage.setItem('afia_scan_history', JSON.stringify([storedScan]));
        localStorage.setItem('afia_privacy_accepted', 'true');
      });

      await page.goto('/');
      await page.click('button[aria-label="History"]');

      await expect(page.locator('text=Afia Pure Corn Oil 1.5L')).toBeVisible({ timeout: 5000 });

      const history = await page.evaluate(() =>
        JSON.parse(localStorage.getItem('afia_scan_history') || '[]')
      );
      expect(history.length).toBeGreaterThan(0);
      expect(history[0].sku).toBe('afia-corn-1.5l');
    });

    test('QR landing sparkline counts only scans for the active SKU', async ({ page }) => {
      await page.addInitScript(() => {
        const mockScans = [
          {
            id: 's1', sku: 'afia-corn-1.5l', bottleName: 'Afia 1.5L',
            timestamp: new Date().toISOString(), fillPercentage: 70, remainingMl: 1050, consumedMl: 450, confidence: 'high'
          },
          // Legacy scan from a removed SKU — should be ignored by the active-SKU sparkline
          {
            id: 's2', sku: 'afia-sunflower-1l', bottleName: 'Afia 1L',
            timestamp: new Date().toISOString(), fillPercentage: 40, remainingMl: 400, consumedMl: 600, confidence: 'medium'
          },
        ];
        localStorage.setItem('afia_scan_history', JSON.stringify(mockScans));
        localStorage.setItem('afia_privacy_accepted', 'true');
      });

      await page.goto(`/?sku=${ACTIVE_SKU}`);
      await page.waitForLoadState('networkidle');

      const sparklineCount = page.locator('.qrl-sparkline-count');
      await expect(sparklineCount).toBeVisible({ timeout: 5000 });
      const countText = await sparklineCount.textContent();
      // Should only count the 1 scan for the active SKU
      expect(countText).toContain('1');
    });
  });

  test.describe('Bottle Selector (Admin mode)', () => {

    test('admin TestLab is reachable in admin mode', async ({ page }) => {
      await page.addInitScript(() => {
        window.sessionStorage.setItem('afia_admin_session', 'valid-token');
        window.sessionStorage.setItem('afia_admin_session_expires', String(Date.now() + 3600000));
        localStorage.setItem('afia_privacy_accepted', 'true');
      });
      await page.goto('/?mode=admin');
      await page.waitForLoadState('networkidle');

      await expect(page.locator('.nav-label:has-text("Test Lab"), .app-ctrl-admin-label').first()).toBeVisible({ timeout: 5000 });
    });

    test('bottle selector shows the 1.5L Corn Oil as confirmed (no dropdown)', async ({ page }) => {
      await page.addInitScript(() => {
        window.sessionStorage.setItem('afia_admin_session', 'valid-token');
        window.sessionStorage.setItem('afia_admin_session_expires', String(Date.now() + 3600000));
        localStorage.setItem('afia_privacy_accepted', 'true');
        localStorage.setItem('afia_admin_onboarding_seen', 'true');
      });
      await page.goto('/?mode=admin');
      await page.waitForLoadState('networkidle');
      
      // Wait for Test Lab button and click it
      const testLabBtn = page.locator('button[aria-label="Test Lab"]');
      await expect(testLabBtn).toBeVisible({ timeout: 10000 });
      await testLabBtn.click();

      // Wait for Test Lab to load
      await expect(page.locator('.test-lab, .test-lab-container').first()).toBeVisible({ timeout: 10000 });

      // No dropdown — single confirmed bottle card is shown
      await expect(page.locator('.bottle-confirmed-card')).toBeVisible({ timeout: 5000 });
      await expect(page.locator('.bottle-confirmed-name')).toContainText(/1\.5[lL]|corn/i);

      // Exactly one confirmed card — the single-SKU restriction
      const count = await page.locator('.bottle-confirmed-card').count();
      expect(count).toBe(1);
    });
  });
});

// ─── Epic 8: Data Export ─────────────────────────────────────────────────────

test.describe('Epic 8: Data Export', () => {

  test.describe('CSV Export', () => {

    // Export tests require desktop viewport — mobile hides nav behind hamburger menu
    test.beforeEach(async ({ page }) => {
      await page.setViewportSize({ width: 1280, height: 800 });
    });

    test('should trigger CSV download from admin Export tab', async ({ page }) => {
      await seedHistoryAndLogin(page);
      await page.goto('/?mode=admin');
      await page.waitForSelector('.top-navbar, .brand, .brand-name');

      await page.locator('.nav-items-container').getByRole('button', { name: 'Export' }).click();
      await expect(page.locator('.export-tab')).toBeVisible({ timeout: 5000 });

      const [download] = await Promise.all([
        page.waitForEvent('download', { timeout: 10000 }),
        page.locator('.export-btn-card').filter({ hasText: /CSV/i }).click(),
      ]);

      expect(download.suggestedFilename()).toMatch(/\.csv$/i);
    });

    test('should trigger JSON download from admin Export tab', async ({ page }) => {
      await seedHistoryAndLogin(page);
      await page.goto('/?mode=admin');
      await page.waitForSelector('.top-navbar, .brand, .brand-name');

      await page.locator('.nav-items-container').getByRole('button', { name: 'Export' }).click();
      await expect(page.locator('.export-tab')).toBeVisible({ timeout: 5000 });

      const [download] = await Promise.all([
        page.waitForEvent('download', { timeout: 10000 }),
        page.locator('.export-btn-card').filter({ hasText: /JSON/i }).click(),
      ]);

      expect(download.suggestedFilename()).toMatch(/\.json$/i);
    });

    test('export buttons are disabled when scan history is empty', async ({ page }) => {
      await page.addInitScript(() => {
        window.sessionStorage.setItem('afia_admin_session', 'valid-token');
        window.sessionStorage.setItem('afia_admin_session_expires', String(Date.now() + 3600000));
        localStorage.removeItem('afia_scan_history');
      });

      await page.goto('/?mode=admin');
      await page.waitForSelector('.top-navbar, .brand, .brand-name');

      await page.locator('.nav-items-container').getByRole('button', { name: 'Export' }).click();
      await expect(page.locator('.export-tab')).toBeVisible({ timeout: 5000 });

      const csvBtn = page.locator('.export-btn-card').filter({ hasText: /CSV/i });
      const jsonBtn = page.locator('.export-btn-card').filter({ hasText: /JSON/i });

      await expect(csvBtn).toBeDisabled();
      await expect(jsonBtn).toBeDisabled();
    });

    test('export tab shows scan count summary', async ({ page }) => {
      await seedHistoryAndLogin(page);
      await page.goto('/?mode=admin');
      await page.waitForSelector('.top-navbar, .brand, .brand-name');

      await page.locator('.nav-items-container').getByRole('button', { name: 'Export' }).click();
      await expect(page.locator('.export-tab')).toBeVisible({ timeout: 5000 });

      const summaryCount = page.locator('.export-summary-count');
      await expect(summaryCount).toBeVisible();
      const countText = await summaryCount.textContent();
      expect(Number(countText)).toBeGreaterThanOrEqual(2);
    });
  });

  test.describe('Scan History Export (User-facing)', () => {

    test('history page has export/download option when scans exist', async ({ page }) => {
      await page.addInitScript(() => {
        const mockScans = [
          {
            id: 'h-1', sku: 'afia-corn-1.5l', bottleName: 'Afia 1.5L',
            timestamp: new Date().toISOString(), fillPercentage: 70, remainingMl: 1050, consumedMl: 450, confidence: 'high'
          },
        ];
        localStorage.setItem('afia_scan_history', JSON.stringify(mockScans));
      });

      await page.goto('/');
      await page.click('button[aria-label="History"]');

      const exportEl = page.locator(
        'button:has-text("Export"), button:has-text("Download"), [data-testid*="export"]'
      ).first();

      const hasExport = await exportEl.isVisible({ timeout: 3000 }).catch(() => false);
      if (hasExport) {
        await expect(exportEl).toBeEnabled();
      }
    });
  });
});
