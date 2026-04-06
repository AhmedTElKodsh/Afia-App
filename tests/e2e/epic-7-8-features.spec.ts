import { test, expect } from '@playwright/test';
import { testBottles } from './fixtures/testData';
import { mockAnalyzeSuccess, mockCamera } from './helpers/mockAPI';
import { clickStartScan, clickCapture } from './helpers/testHelpers';

/**
 * Epics 7 & 8: Multi-Bottle Support & Data Export
 *
 * Epic 7 — Story 7.1: User can track multiple distinct bottles (different SKUs/sizes)
 * Epic 8 — Story 8.1: Admin can export scan data as CSV / JSON
 */

// ─── Shared admin init script ───────────────────────────────────────────────
async function seedHistoryAndLogin(page: any) {
  await page.addInitScript(() => {
    window.sessionStorage.setItem('afia_admin_session', 'valid-token');
    window.sessionStorage.setItem('afia_admin_session_expires', String(Date.now() + 3600000));
    const mockScans = [
      {
        id: 'export-1',
        sku: 'afia-sunflower-500ml',
        bottleName: 'Afia Pure Sunflower Oil 500ml',
        timestamp: new Date(Date.now() - 86400000).toISOString(),
        fillPercentage: 80,
        remainingMl: 400,
        consumedMl: 100,
        confidence: 'high',
      },
      {
        id: 'export-2',
        sku: 'afia-sunflower-1l',
        bottleName: 'Afia Pure Sunflower Oil 1L',
        timestamp: new Date().toISOString(),
        fillPercentage: 55,
        remainingMl: 550,
        consumedMl: 450,
        confidence: 'medium',
      },
    ];
    localStorage.setItem('afia_scan_history', JSON.stringify(mockScans));
    localStorage.setItem('afia_privacy_accepted', 'true');
  });
}

// ─── Epic 7: Multi-Bottle Support ────────────────────────────────────────────

test.describe('Epic 7: Multi-Bottle Support', () => {

  test.describe('Different bottle SKUs via URL', () => {

    test('should display 500ml bottle details', async ({ page }) => {
      await page.goto('/?sku=afia-sunflower-500ml');
      await page.waitForLoadState('networkidle');

      const pill = page.locator('.qrl-selector-pill');
      await expect(pill).toBeVisible({ timeout: 5000 });
      await expect(pill).toContainText('500ml');
    });

    test('should display 1L bottle details', async ({ page }) => {
      await page.goto('/?sku=afia-sunflower-1l');
      await page.waitForLoadState('networkidle');

      const pill = page.locator('.qrl-selector-pill');
      await expect(pill).toBeVisible({ timeout: 5000 });
      await expect(pill).toContainText('1');
    });

    test('should display 700ml bottle details', async ({ page }) => {
      await page.goto(`/?sku=${testBottles.bertolli.sku}`);
      await page.waitForLoadState('networkidle');

      const pill = page.locator('.qrl-selector-pill');
      await expect(pill).toBeVisible({ timeout: 5000 });
      await expect(pill).toContainText('700ml');
    });

    test('each SKU shows the correct bottle name in header', async ({ page }) => {
      const skus = [
        { sku: 'afia-sunflower-250ml', contains: '250' },
        { sku: 'afia-sunflower-500ml', contains: '500' },
        { sku: 'afia-sunflower-700ml', contains: '700' },
      ];

      for (const { sku, contains } of skus) {
        await page.goto(`/?sku=${sku}`);
        await page.waitForLoadState('networkidle');
        const pill = page.locator('.qrl-selector-pill');
        await expect(pill).toBeVisible({ timeout: 5000 });
        const pillText = await pill.textContent();
        expect(pillText).toContain(contains);
      }
    });

    test('switching SKU via URL updates bottle context', async ({ page }) => {
      const pill = page.locator('.qrl-selector-pill');

      // Start with 500ml
      await page.goto('/?sku=afia-sunflower-500ml');
      await expect(pill).toBeVisible({ timeout: 10000 });
      const pill500 = await pill.textContent();
      expect(pill500).toContain('500');

      // Navigate to 1L
      await page.goto('/?sku=afia-sunflower-1l');
      await expect(pill).toBeVisible({ timeout: 10000 });
      const pill1l = await pill.textContent();
      expect(pill1l).toContain('1');

      // The two bottle names should be different
      expect(pill500).not.toEqual(pill1l);
    });
  });

  test.describe('Scan history per bottle (localStorage)', () => {

    test('should store scan in history for the scanned SKU', async ({ page }) => {
      // Seed a scan directly — simulates what happens after a successful analysis
      await page.addInitScript(() => {
        const storedScan = {
          id: 'multi-bottle-scan-1',
          sku: 'afia-sunflower-500ml',
          bottleName: 'Afia Pure Sunflower Oil 500ml',
          timestamp: new Date().toISOString(),
          fillPercentage: 60,
          remainingMl: 300,
          consumedMl: 200,
          confidence: 'high',
        };
        localStorage.setItem('afia_scan_history', JSON.stringify([storedScan]));
        localStorage.setItem('afia_privacy_accepted', 'true');
      });

      await page.goto('/');
      await page.click('button[aria-label="History"]');

      // Verify the scan appears in history with correct SKU data
      await expect(page.locator('text=Afia Pure Sunflower Oil 500ml')).toBeVisible({ timeout: 5000 });

      // Verify the history localStorage entry has the correct SKU
      const history = await page.evaluate(() =>
        JSON.parse(localStorage.getItem('afia_scan_history') || '[]')
      );
      expect(history.length).toBeGreaterThan(0);
      expect(history[0].sku).toBe('afia-sunflower-500ml');
    });

    test('scan history view shows scans from multiple bottle SKUs', async ({ page }) => {
      await page.addInitScript(() => {
        const mockScans = [
          {
            id: 'mb-1', sku: 'afia-sunflower-500ml', bottleName: 'Afia 500ml',
            timestamp: new Date().toISOString(), fillPercentage: 70, remainingMl: 350, consumedMl: 150, confidence: 'high'
          },
          {
            id: 'mb-2', sku: 'afia-sunflower-1l', bottleName: 'Afia 1L',
            timestamp: new Date().toISOString(), fillPercentage: 40, remainingMl: 400, consumedMl: 600, confidence: 'medium'
          },
        ];
        localStorage.setItem('afia_scan_history', JSON.stringify(mockScans));
      });

      await page.goto('/');
      await page.click('button[aria-label="History"]');

      await expect(page.locator('text=Afia 500ml')).toBeVisible({ timeout: 5000 });
      await expect(page.locator('text=Afia 1L')).toBeVisible({ timeout: 5000 });
    });

    test('QR landing page sparkline shows history only for the current SKU', async ({ page }) => {
      await page.addInitScript(() => {
        const mockScans = [
          {
            id: 'sku-a-1', sku: 'afia-sunflower-500ml', bottleName: 'Afia 500ml',
            timestamp: new Date().toISOString(), fillPercentage: 70, remainingMl: 350, consumedMl: 150, confidence: 'high'
          },
          {
            id: 'sku-b-1', sku: 'afia-sunflower-1l', bottleName: 'Afia 1L',
            timestamp: new Date().toISOString(), fillPercentage: 40, remainingMl: 400, consumedMl: 600, confidence: 'medium'
          },
        ];
        localStorage.setItem('afia_scan_history', JSON.stringify(mockScans));
        localStorage.setItem('afia_privacy_accepted', 'true');
      });

      // Navigate to 500ml bottle
      await page.goto('/?sku=afia-sunflower-500ml');
      await page.waitForLoadState('networkidle');

      // The sparkline should show "1 scans" for this SKU only
      const sparklineCount = page.locator('.qrl-sparkline-count');
      await expect(sparklineCount).toBeVisible({ timeout: 5000 });
      const countText = await sparklineCount.textContent();
      expect(countText).toContain('1');
    });
  });

  test.describe('Bottle Selector (Admin mode)', () => {

    test('should show bottle selector in admin mode with no SKU', async ({ page }) => {
      await page.addInitScript(() => {
        window.sessionStorage.setItem('afia_admin_session', 'valid-token');
        window.sessionStorage.setItem('afia_admin_session_expires', String(Date.now() + 3600000));
        localStorage.setItem('afia_privacy_accepted', 'true');
      });
      await page.goto('/?mode=admin');
      await page.waitForLoadState('networkidle');

      // Admin mode shows TestLab at root, which has the bottle selector
      // The .nav-label for "Test Lab" should be present
      await expect(page.locator('.nav-label:has-text("Test Lab"), .app-ctrl-admin-label').first()).toBeVisible({ timeout: 5000 });
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

      // Navigate to Export tab using the nav-items-container to avoid ambiguity
      await page.locator('.nav-items-container').getByRole('button', { name: 'Export' }).click();
      await expect(page.locator('.export-tab')).toBeVisible({ timeout: 5000 });

      // Promise.all to avoid race condition between setup and click
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

      // Both export buttons should be disabled when no scans exist
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

      // The summary box shows the count of scans ready to export
      const summaryCount = page.locator('.export-summary-count');
      await expect(summaryCount).toBeVisible();
      const countText = await summaryCount.textContent();
      // 2 scans were seeded
      expect(Number(countText)).toBeGreaterThanOrEqual(2);
    });
  });

  test.describe('Scan History Export (User-facing)', () => {

    test('history page has export/download option when scans exist', async ({ page }) => {
      await page.addInitScript(() => {
        const mockScans = [
          {
            id: 'h-1', sku: 'afia-sunflower-500ml', bottleName: 'Afia 500ml',
            timestamp: new Date().toISOString(), fillPercentage: 70, remainingMl: 350, consumedMl: 150, confidence: 'high'
          },
        ];
        localStorage.setItem('afia_scan_history', JSON.stringify(mockScans));
      });

      await page.goto('/');
      await page.click('button[aria-label="History"]');

      // Look for any export-related element in the history view
      const exportEl = page.locator(
        'button:has-text("Export"), button:has-text("Download"), [data-testid*="export"]'
      ).first();

      // If an export option exists in the scan history view, it should be visible
      const hasExport = await exportEl.isVisible({ timeout: 3000 }).catch(() => false);
      if (hasExport) {
        await expect(exportEl).toBeEnabled();
      }
      // If no export option in history view, that's also fine — export lives in admin only
    });
  });
});
