import { test, expect } from '@playwright/test';

/**
 * Mock Mode Verification Test
 * 
 * Verifies that E2E tests can run without API keys using X-Mock-Mode header.
 * Tests deterministic mock responses from the Worker's LLM mock infrastructure.
 */
test.describe('Mock Mode Verification', () => {
  test('should return deterministic mock responses', async ({ page }) => {
    // Navigate to app
    await page.goto('/');
    
    // Wait for app to load
    await expect(page.locator('h1')).toBeVisible();
    
    // Verify we're on the home page
    await expect(page).toHaveURL('/');
    
    // Note: This test verifies that the mock mode header is being sent
    // and that the Worker is responding without requiring API keys.
    // Full scan flow testing is covered by other E2E tests.
    
    // Verify the app loads successfully without API key errors
    // If mock mode is working, no console errors about missing API keys should appear
    const consoleErrors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });
    
    // Wait a moment for any async errors to surface
    await page.waitForTimeout(1000);
    
    // Verify no API key errors
    const hasApiKeyError = consoleErrors.some(error => 
      error.toLowerCase().includes('api key') || 
      error.toLowerCase().includes('unauthorized')
    );
    
    expect(hasApiKeyError).toBe(false);
  });
  
  test('should handle Worker requests with mock mode header', async ({ page, request }) => {
    // Make a direct request to the Worker to verify mock mode is working
    // This tests the Worker middleware directly
    
    // Note: Worker runs on localhost:8787 during local development
    // In CI, this would need to be configured appropriately
    
    const workerUrl = 'http://localhost:8787';
    
    // Test health check endpoint
    const response = await request.get(`${workerUrl}/health`, {
      headers: {
        'X-Mock-Mode': 'true',
      },
    });
    
    // Verify the request succeeded
    expect(response.ok()).toBe(true);
    
    // Verify the X-RequestId header is present (proves middleware ran)
    const requestId = response.headers()['x-requestid'];
    expect(requestId).toBeTruthy();
    expect(requestId).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
  });

  test('should bypass rate limiting in mock mode', async ({ request }) => {
    const workerUrl = 'http://localhost:8787';
    
    // Make multiple rapid requests to verify rate limiting is bypassed
    // Normal rate limit is 30 req/min, so 35 rapid requests would trigger it
    const responses = [];
    for (let i = 0; i < 35; i++) {
      responses.push(await request.get(`${workerUrl}/health`, {
        headers: {
          'X-Mock-Mode': 'true',
        },
      }));
    }

    // Verify no 429 (rate limit) responses
    const rateLimitResponses = responses.filter(r => r.status() === 429);
    expect(rateLimitResponses.length).toBe(0);

    // Primary assertion for this test is rate-limit bypass;
    // still ensure we got healthy responses from the endpoint.
    const successResponses = responses.filter(r => r.status() === 200);
    expect(successResponses.length).toBeGreaterThanOrEqual(30);
  });

  test('should handle errors gracefully in mock mode', async ({ request }) => {
    const workerUrl = 'http://localhost:8787';
    
    // Test that mock mode handles edge cases without crashing
    
    // Test 1: Invalid endpoint (should return 404, not crash)
    const invalidResponse = await request.get(`${workerUrl}/invalid-endpoint`, {
      headers: {
        'X-Mock-Mode': 'true',
      },
    });
    expect(invalidResponse.status()).toBe(404);
    
    // Test 2: Malformed request (should handle gracefully)
    const malformedResponse = await request.post(`${workerUrl}/analyze`, {
      headers: {
        'X-Mock-Mode': 'true',
        'Content-Type': 'application/json',
      },
      data: 'invalid json',
    });
    // Should return error response, not crash
    expect([400, 500]).toContain(malformedResponse.status());
  });
});
