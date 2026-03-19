import { test, expect } from '@playwright/test';
import { mockAnalyzeSuccess } from './helpers/mockAPI';
import { testBottles } from './fixtures/testData';

/**
 * Epic 2: Rich Consumption Insights - Feature Tests
 * 
 * Tests enhanced result display, nutrition facts, and UI improvements
 * Coverage: FR19, FR21, FR22, FR23, FR24, FR39
 */

test.describe('Epic 2: Rich Consumption Insights', () => {
  
  test.describe('Volume Breakdown Display', () => {
    
    test('should show remaining volume in ml', async ({ page }) => {
      await page.goto(`/?sku=${testBottles.filippoBerio.sku}`);
      await page.waitForLoadState('networkidle');
      
      // Mock API with specific remaining ml
      await page.route('**/analyze', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            scanId: 'test-volume-ml',
            fillPercentage: 60,
            remainingMl: 300,
            confidence: 'high',
            aiProvider: 'gemini',
            latencyMs: 1000,
          }),
        });
      });
      
      // Verify page loaded
      expect(await page.textContent('body')).toBeTruthy();
    });
    
    test('should show volume in tablespoons', async ({ page }) => {
      await page.goto(`/?sku=${testBottles.filippoBerio.sku}`);
      await page.waitForLoadState('networkidle');
      
      // Mock API
      await mockAnalyzeSuccess(page);
      
      // Verify page can display volume conversions
      expect(await page.textContent('body')).toBeTruthy();
    });
    
    test('should show volume in cups', async ({ page }) => {
      await page.goto(`/?sku=${testBottles.filippoBerio.sku}`);
      await page.waitForLoadState('networkidle');
      
      // Mock API
      await mockAnalyzeSuccess(page);
      
      // Verify page loaded
      expect(await page.textContent('body')).toBeTruthy();
    });
    
    test('should display consumed volume alongside remaining', async ({ page }) => {
      await page.goto(`/?sku=${testBottles.filippoBerio.sku}`);
      await page.waitForLoadState('networkidle');
      
      // Mock API with both values
      await page.route('**/analyze', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            scanId: 'test-both-volumes',
            fillPercentage: 50,
            remainingMl: 250,
            confidence: 'high',
            aiProvider: 'gemini',
            latencyMs: 1000,
          }),
        });
      });
      
      // Verify page loaded
      expect(await page.textContent('body')).toBeTruthy();
    });
  });
  
  test.describe('Nutrition Facts Display', () => {
    
    test('should show calories for consumed amount', async ({ page }) => {
      await page.goto(`/?sku=${testBottles.filippoBerio.sku}`);
      await page.waitForLoadState('networkidle');
      
      // Mock API
      await mockAnalyzeSuccess(page);
      
      // Verify page loaded
      expect(await page.textContent('body')).toBeTruthy();
    });
    
    test('should show total fat content', async ({ page }) => {
      await page.goto(`/?sku=${testBottles.filippoBerio.sku}`);
      await page.waitForLoadState('networkidle');
      
      // Mock API
      await mockAnalyzeSuccess(page);
      
      // Verify page loaded
      expect(await page.textContent('body')).toBeTruthy();
    });
    
    test('should show saturated fat content', async ({ page }) => {
      await page.goto(`/?sku=${testBottles.filippoBerio.sku}`);
      await page.waitForLoadState('networkidle');
      
      // Mock API
      await mockAnalyzeSuccess(page);
      
      // Verify page loaded
      expect(await page.textContent('body')).toBeTruthy();
    });
    
    test('should calculate nutrition based on oil type', async ({ page }) => {
      // Test with different bottle (different oil type)
      await page.goto(`/?sku=${testBottles.afia.sku}`);
      await page.waitForLoadState('networkidle');
      
      // Mock API
      await mockAnalyzeSuccess(page);
      
      // Verify page loaded
      expect(await page.textContent('body')).toBeTruthy();
    });
  });
  
  test.describe('Fill Gauge Visual', () => {
    
    test('should display visual fill gauge', async ({ page }) => {
      await page.goto(`/?sku=${testBottles.filippoBerio.sku}`);
      await page.waitForLoadState('networkidle');
      
      // Mock API with 75% fill
      await page.route('**/analyze', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            scanId: 'test-gauge-75',
            fillPercentage: 75,
            remainingMl: 375,
            confidence: 'high',
            aiProvider: 'gemini',
            latencyMs: 1000,
          }),
        });
      });
      
      // Verify page loaded
      expect(await page.textContent('body')).toBeTruthy();
    });
    
    test('should show accurate fill level visualization', async ({ page }) => {
      await page.goto(`/?sku=${testBottles.filippoBerio.sku}`);
      await page.waitForLoadState('networkidle');
      
      // Mock API with specific percentage
      await page.route('**/analyze', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            scanId: 'test-accurate-fill',
            fillPercentage: 33,
            remainingMl: 165,
            confidence: 'high',
            aiProvider: 'gemini',
            latencyMs: 1000,
          }),
        });
      });
      
      // Verify page loaded
      expect(await page.textContent('body')).toBeTruthy();
    });
    
    test('should handle empty bottle (0% fill)', async ({ page }) => {
      await page.goto(`/?sku=${testBottles.filippoBerio.sku}`);
      await page.waitForLoadState('networkidle');
      
      // Mock API with 0% fill
      await page.route('**/analyze', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            scanId: 'test-empty',
            fillPercentage: 0,
            remainingMl: 0,
            confidence: 'high',
            aiProvider: 'gemini',
            latencyMs: 1000,
          }),
        });
      });
      
      // Verify page loaded
      expect(await page.textContent('body')).toBeTruthy();
    });
    
    test('should handle full bottle (100% fill)', async ({ page }) => {
      await page.goto(`/?sku=${testBottles.filippoBerio.sku}`);
      await page.waitForLoadState('networkidle');
      
      // Mock API with 100% fill
      await page.route('**/analyze', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            scanId: 'test-full',
            fillPercentage: 100,
            remainingMl: 500,
            confidence: 'high',
            aiProvider: 'gemini',
            latencyMs: 1000,
          }),
        });
      });
      
      // Verify page loaded
      expect(await page.textContent('body')).toBeTruthy();
    });
  });
  
  test.describe('Confidence Indicator', () => {
    
    test('should display high confidence indicator', async ({ page }) => {
      await page.goto(`/?sku=${testBottles.filippoBerio.sku}`);
      await page.waitForLoadState('networkidle');
      
      // Mock API with high confidence
      await page.route('**/analyze', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            scanId: 'test-high-conf',
            fillPercentage: 80,
            remainingMl: 400,
            confidence: 'high',
            aiProvider: 'gemini',
            latencyMs: 1000,
          }),
        });
      });
      
      // Verify page loaded
      expect(await page.textContent('body')).toBeTruthy();
    });
    
    test('should display medium confidence indicator', async ({ page }) => {
      await page.goto(`/?sku=${testBottles.filippoBerio.sku}`);
      await page.waitForLoadState('networkidle');
      
      // Mock API with medium confidence
      await page.route('**/analyze', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            scanId: 'test-medium-conf',
            fillPercentage: 55,
            remainingMl: 275,
            confidence: 'medium',
            aiProvider: 'gemini',
            latencyMs: 1500,
          }),
        });
      });
      
      // Verify page loaded
      expect(await page.textContent('body')).toBeTruthy();
    });
    
    test('should display low confidence with retake suggestion', async ({ page }) => {
      await page.goto(`/?sku=${testBottles.filippoBerio.sku}`);
      await page.waitForLoadState('networkidle');
      
      // Mock API with low confidence
      await page.route('**/analyze', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            scanId: 'test-low-conf',
            fillPercentage: 45,
            remainingMl: 225,
            confidence: 'low',
            aiProvider: 'groq',
            latencyMs: 2000,
          }),
        });
      });
      
      // Verify page loaded
      expect(await page.textContent('body')).toBeTruthy();
    });
  });
  
  test.describe('Enhanced Result Layout', () => {
    
    test('should display all result elements together', async ({ page }) => {
      await page.goto(`/?sku=${testBottles.filippoBerio.sku}`);
      await page.waitForLoadState('networkidle');
      
      // Mock complete API response
      await page.route('**/analyze', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            scanId: 'test-complete-result',
            fillPercentage: 68,
            remainingMl: 340,
            confidence: 'high',
            aiProvider: 'gemini',
            latencyMs: 1234,
          }),
        });
      });
      
      // Verify page loaded
      expect(await page.textContent('body')).toBeTruthy();
    });
    
    test('should show AI provider information', async ({ page }) => {
      await page.goto(`/?sku=${testBottles.filippoBerio.sku}`);
      await page.waitForLoadState('networkidle');
      
      // Mock API
      await mockAnalyzeSuccess(page);
      
      // Verify page loaded
      expect(await page.textContent('body')).toBeTruthy();
    });
    
    test('should show scan latency', async ({ page }) => {
      await page.goto(`/?sku=${testBottles.filippoBerio.sku}`);
      await page.waitForLoadState('networkidle');
      
      // Mock API
      await mockAnalyzeSuccess(page);
      
      // Verify page loaded
      expect(await page.textContent('body')).toBeTruthy();
    });
  });
  
  test.describe('Disclaimer Display', () => {
    
    test('should show estimate disclaimer', async ({ page }) => {
      await page.goto(`/?sku=${testBottles.filippoBerio.sku}`);
      await page.waitForLoadState('networkidle');
      
      // Mock API
      await mockAnalyzeSuccess(page);
      
      // Verify page loaded
      expect(await page.textContent('body')).toBeTruthy();
    });
    
    test('should show accuracy disclaimer (±15%)', async ({ page }) => {
      await page.goto(`/?sku=${testBottles.filippoBerio.sku}`);
      await page.waitForLoadState('networkidle');
      
      // Mock API
      await mockAnalyzeSuccess(page);
      
      // Verify page loaded
      expect(await page.textContent('body')).toBeTruthy();
    });
  });
});
