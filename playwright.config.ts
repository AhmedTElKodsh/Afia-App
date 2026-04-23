import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright E2E Test Configuration for Afia Oil Tracker
 * 
 * Tests Epic 1 (Core Scan Experience) and Epic 2 (Rich Consumption Insights)
 */
export default defineConfig({
  // Test directory - E2E tests only (excludes unit tests in src/test/)
  testDir: './tests/e2e',
  
  // Only match .spec.ts files (excludes .test.tsx unit tests)
  testMatch: '**/*.spec.ts',
  
  // Run tests in parallel
  fullyParallel: true,
  
  // Fail CI on test files with only .only
  forbidOnly: !!process.env.CI,
  
  // Retry on failure (0 in local, 2 in CI)
  retries: process.env.CI ? 2 : 0,
  
  // Opt out of parallelization in CI, use limited workers locally for stability
  workers: process.env.CI ? 1 : 2,
  
  // Reporter
  reporter: [
    ['html', { outputFolder: 'playwright-report' }],
    ['json', { outputFile: 'test-results.json' }],
    ['list'],
  ],
  
  // Shared configuration for all projects
  use: {
    // Base URL for tests
    baseURL: 'http://localhost:5173',
    
    // Collect trace on failure
    trace: 'on-first-retry',
    
    // Screenshot on failure
    screenshot: 'only-on-failure',
    
    // Video on failure
    video: 'retain-on-failure',
    
    // Actionability timeout
    actionTimeout: 30000,

    // Navigation timeout
    navigationTimeout: 45000,

    
    // Enable mock mode for all E2E tests (no API keys required)
    extraHTTPHeaders: {
      'X-Mock-Mode': 'true',
    },
  },
  
  // Global test timeout - increased to 60s to accommodate slower analysis flows
  timeout: 60000,
  
  // Projects for different browsers/devices
  projects: [
    {
      name: 'chromium',
      use: { 
        ...devices['Desktop Chrome'],
        viewport: { width: 390, height: 844 }, // Mobile viewport
        launchOptions: {
          args: [
            '--use-fake-ui-for-media-stream',
            '--use-fake-device-for-media-stream',
            '--allow-file-access-from-files',
          ]
        },
        permissions: ['camera'],
      },
    },
    // Mobile and tablet tests require WebKit installation
    // Uncomment after running: npx playwright install webkit
    // {
    //   name: 'mobile',
    //   use: { ...devices['iPhone 13'] },
    // },
    // {
    //   name: 'tablet',
    //   use: { ...devices['iPad Mini'] },
    // },
  ],
  
  // Start dev server before running tests
  webServer: [
    {
      command: 'npm run dev',
      url: 'http://localhost:5173',
      reuseExistingServer: !process.env.CI,
      timeout: 60000,
    },
    {
      command: 'npm run dev --prefix worker',
      url: 'http://localhost:8787/health',
      reuseExistingServer: !process.env.CI,
      timeout: 60000,
    }
  ],
});
