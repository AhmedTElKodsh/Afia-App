/**
 * Worker API Integration Tests
 *
 * Tests the Worker API endpoints with real LLM providers (Gemini/Groq).
 * Requires the Worker to be running locally (http://127.0.0.1:8787)
 * with real API keys in worker/.dev.vars
 *
 * Run with: npm run test:integration
 */

import { describe, it, expect } from 'vitest';

// Use 127.0.0.1 explicitly — on Windows, 'localhost' may resolve to IPv6 ::1
// while wrangler dev binds to IPv4 127.0.0.1
const WORKER_URL = 'http://127.0.0.1:8787';

const JSON_HEADERS = { 'Content-Type': 'application/json' };

// Top-level await — must resolve before test definitions so it.skipIf reads correct value
let workerRunning = false;
try {
  const health = await fetch(`${WORKER_URL}/health`, { signal: AbortSignal.timeout(2000) });
  workerRunning = health.ok;
} catch {
  console.warn(
    `⚠️  Worker not running at ${WORKER_URL}. ` +
    `Integration tests will be skipped. ` +
    `Start it with: cd worker && wrangler dev`
  );
}

// Minimal valid PNG (1x1 transparent) — above the 50-char validation threshold
const TEST_IMAGE = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

describe('Worker API Integration (Real LLM Providers)', () => {

  describe('Health Check', () => {
    it.skipIf(!workerRunning)('should return 200 OK for health endpoint', async () => {
      const response = await fetch(`${WORKER_URL}/health`);

      expect(response.ok).toBe(true);
      expect(response.status).toBe(200);
    });

    it.skipIf(!workerRunning)('should return health status in response body', async () => {
      const response = await fetch(`${WORKER_URL}/health`);
      const data = await response.json();

      expect(data).toHaveProperty('status');
      expect(data.status).toBe('ok');
    });
  });

  describe('POST /analyze', () => {
    it.skipIf(!workerRunning)('should analyze image for afia-corn-1.5l (real LLM)', async () => {
      const response = await fetch(`${WORKER_URL}/analyze`, {
        method: 'POST',
        headers: JSON_HEADERS,
        body: JSON.stringify({ imageBase64: TEST_IMAGE, sku: 'afia-corn-1.5l' })
      });

      // 200 = successful inference; 503 = provider unavailable/transient upstream failure
      expect([200, 503]).toContain(response.status);
      const data = await response.json();
      if (response.status === 503) {
        expect(data).toHaveProperty('error');
        expect(data).toHaveProperty('code');
        return;
      }

      // Structure checks — real LLM returns non-deterministic values
      expect(data).toHaveProperty('fillPercentage');
      expect(data).toHaveProperty('confidence');
      expect(data).toHaveProperty('scanId');
      expect(typeof data.fillPercentage).toBe('number');
      expect(data.fillPercentage).toBeGreaterThanOrEqual(0);
      expect(data.fillPercentage).toBeLessThanOrEqual(100);
      expect(['high', 'medium', 'low']).toContain(data.confidence);
      expect(data.isUnsupportedSku).toBe(false);
    }, 15000); // real LLM can take up to 15s

    it.skipIf(!workerRunning)('should return 400 for missing sku', async () => {
      const response = await fetch(`${WORKER_URL}/analyze`, {
        method: 'POST',
        headers: JSON_HEADERS,
        body: JSON.stringify({ imageBase64: TEST_IMAGE })
      });

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data).toHaveProperty('error');
    });

    it.skipIf(!workerRunning)('should return 400 for missing imageBase64', async () => {
      const response = await fetch(`${WORKER_URL}/analyze`, {
        method: 'POST',
        headers: JSON_HEADERS,
        body: JSON.stringify({ sku: 'afia-corn-1.5l' })
      });

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data).toHaveProperty('error');
    });

    it.skipIf(!workerRunning)('should return 400 for invalid base64 image', async () => {
      const response = await fetch(`${WORKER_URL}/analyze`, {
        method: 'POST',
        headers: JSON_HEADERS,
        body: JSON.stringify({ imageBase64: 'invalid-base64', sku: 'afia-corn-1.5l' })
      });

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data).toHaveProperty('error');
    });

    it.skipIf(!workerRunning)('should accept unknown SKU as community contribution', async () => {
      const response = await fetch(`${WORKER_URL}/analyze`, {
        method: 'POST',
        headers: JSON_HEADERS,
        body: JSON.stringify({ imageBase64: TEST_IMAGE, sku: 'unknown-product-sku' })
      });

      // Story 5.3: unknown SKUs treated as community contributions, not rejected.
      // If providers are unavailable, endpoint may return 503 instead of an inference result.
      expect([200, 503]).toContain(response.status);
      const data = await response.json();
      if (response.status === 503) {
        expect(data).toHaveProperty('error');
        expect(data).toHaveProperty('code');
        return;
      }

      expect(data).toHaveProperty('isUnsupportedSku');
      expect(data.isUnsupportedSku).toBe(true);
    }, 15000);
  });

  describe('POST /feedback', () => {
    it.skipIf(!workerRunning)('should return 400 for missing scanId', async () => {
      const response = await fetch(`${WORKER_URL}/feedback`, {
        method: 'POST',
        headers: JSON_HEADERS,
        body: JSON.stringify({ accuracyRating: 'about_right' })
      });

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data).toHaveProperty('error');
    });

    it.skipIf(!workerRunning)('should return 400 for missing accuracyRating', async () => {
      const response = await fetch(`${WORKER_URL}/feedback`, {
        method: 'POST',
        headers: JSON_HEADERS,
        body: JSON.stringify({ scanId: 'test-scan-id' })
      });

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data).toHaveProperty('error');
    });

    it.skipIf(!workerRunning)('should return 400 for invalid accuracyRating value', async () => {
      const response = await fetch(`${WORKER_URL}/feedback`, {
        method: 'POST',
        headers: JSON_HEADERS,
        body: JSON.stringify({ scanId: 'test-scan-id', accuracyRating: 'wrong_value' })
      });

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data).toHaveProperty('error');
    });

    it.skipIf(!workerRunning)('should return 404 or 503 for valid format but missing scan in DB', async () => {
      const response = await fetch(`${WORKER_URL}/feedback`, {
        method: 'POST',
        headers: JSON_HEADERS,
        body: JSON.stringify({ scanId: 'non-existent-scan-id', accuracyRating: 'about_right' })
      });

      // 404 = scan not found; 503 = Supabase not configured locally
      expect([404, 503]).toContain(response.status);
    });
  });

  describe('CORS Headers', () => {
    it.skipIf(!workerRunning)('should include CORS headers when Origin is sent', async () => {
      const response = await fetch(`${WORKER_URL}/health`, {
        headers: { 'Origin': 'http://localhost:5173' }
      });

      expect(response.headers.has('access-control-allow-origin')).toBe(true);
    });

    it.skipIf(!workerRunning)('should handle OPTIONS preflight request', async () => {
      const response = await fetch(`${WORKER_URL}/analyze`, {
        method: 'OPTIONS',
        headers: {
          'Origin': 'http://localhost:5173',
          'Access-Control-Request-Method': 'POST',
          'Access-Control-Request-Headers': 'content-type'
        }
      });

      expect(response.ok).toBe(true);
      expect(response.headers.has('access-control-allow-methods')).toBe(true);
    });
  });

  describe('Error Handling', () => {
    it.skipIf(!workerRunning)('should return 404 for unknown endpoint', async () => {
      const response = await fetch(`${WORKER_URL}/unknown-endpoint`);
      expect(response.status).toBe(404);
    });

    it.skipIf(!workerRunning)('should return 404 for wrong HTTP method on /analyze', async () => {
      // Hono returns 404 (not 405) for unregistered method+path combinations
      const response = await fetch(`${WORKER_URL}/analyze`, { method: 'GET' });
      expect(response.status).toBe(404);
    });

    it.skipIf(!workerRunning)('should handle malformed JSON gracefully', async () => {
      const response = await fetch(`${WORKER_URL}/analyze`, {
        method: 'POST',
        headers: JSON_HEADERS,
        body: 'invalid-json{'
      });

      expect(response.status).toBe(400);
    });
  });
});
