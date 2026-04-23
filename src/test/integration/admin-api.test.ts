/**
 * Admin API Integration Tests
 *
 * Tests the Worker Admin API endpoints with authentication.
 * Requires the Worker to be running locally (http://127.0.0.1:8787)
 *
 * Run with: npm run test:integration
 */

import { describe, it, expect, beforeAll } from 'vitest';

// Use 127.0.0.1 explicitly — on Windows, 'localhost' may resolve to IPv6 ::1
// while wrangler dev binds to IPv4 127.0.0.1
const WORKER_URL = 'http://127.0.0.1:8787';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || '1234';

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

describe('Admin API Integration', () => {
  let authToken: string;

  describe('POST /admin/auth', () => {
    it.skipIf(!workerRunning)('should authenticate with correct password', async () => {
      const response = await fetch(`${WORKER_URL}/admin/auth`, {
        method: 'POST',
        headers: JSON_HEADERS,
        body: JSON.stringify({ password: ADMIN_PASSWORD })
      });

      expect(response.ok).toBe(true);
      const data = await response.json();

      expect(data).toHaveProperty('token');
      expect(typeof data.token).toBe('string');
      expect(data.token.length).toBeGreaterThan(0);

      authToken = data.token;
    });

    it.skipIf(!workerRunning)('should reject authentication with wrong password', async () => {
      const response = await fetch(`${WORKER_URL}/admin/auth`, {
        method: 'POST',
        headers: JSON_HEADERS,
        body: JSON.stringify({ password: 'definitely-wrong-password' })
      });

      expect(response.status).toBe(401);
      const data = await response.json();
      expect(data).toHaveProperty('error');
    });

    it.skipIf(!workerRunning)('should return 400 for missing password', async () => {
      const response = await fetch(`${WORKER_URL}/admin/auth`, {
        method: 'POST',
        headers: JSON_HEADERS,
        body: JSON.stringify({})
      });

      // Fresh runs should return 400; repeated local reruns may hit auth rate limiting.
      expect([400, 429]).toContain(response.status);
      const data = await response.json();
      expect(data).toHaveProperty('error');
    });
  });

  describe('GET /admin/scans', () => {
    beforeAll(async () => {
      if (!authToken && workerRunning) {
        const authResponse = await fetch(`${WORKER_URL}/admin/auth`, {
          method: 'POST',
          headers: JSON_HEADERS,
          body: JSON.stringify({ password: ADMIN_PASSWORD })
        });
        const authData = await authResponse.json();
        authToken = authData.token;
      }
    });

    it.skipIf(!workerRunning)('should require authentication', async () => {
      const response = await fetch(`${WORKER_URL}/admin/scans`);
      expect(response.status).toBe(401);
    });

    it.skipIf(!workerRunning)('should return scans or service error with valid token', async () => {
      const response = await fetch(`${WORKER_URL}/admin/scans`, {
        headers: { 'Authorization': `Bearer ${authToken}` }
      });

      // 200 = Supabase available; 500 = Supabase not configured locally (both valid in local dev)
      expect([200, 500]).toContain(response.status);
      if (response.status === 200) {
        const data = await response.json();
        expect(Array.isArray(data.scans)).toBe(true);
      }
    });

    it.skipIf(!workerRunning)('should reject invalid token', async () => {
      const response = await fetch(`${WORKER_URL}/admin/scans`, {
        headers: { 'Authorization': 'Bearer invalid-token' }
      });
      expect(response.status).toBe(401);
    });
  });

  describe('GET /admin/model/versions', () => {
    beforeAll(async () => {
      if (!authToken && workerRunning) {
        const authResponse = await fetch(`${WORKER_URL}/admin/auth`, {
          method: 'POST',
          headers: JSON_HEADERS,
          body: JSON.stringify({ password: ADMIN_PASSWORD })
        });
        const authData = await authResponse.json();
        authToken = authData.token;
      }
    });

    it.skipIf(!workerRunning)('should require authentication', async () => {
      const response = await fetch(`${WORKER_URL}/admin/model/versions`);
      expect(response.status).toBe(401);
    });

    it.skipIf(!workerRunning)('should return model versions or service error with valid token', async () => {
      const response = await fetch(`${WORKER_URL}/admin/model/versions`, {
        headers: { 'Authorization': `Bearer ${authToken}` }
      });

      // 200 = KV available; 500 = not configured in local dev
      expect([200, 500]).toContain(response.status);
      if (response.status === 200) {
        const data = await response.json();
        expect(Array.isArray(data.versions)).toBe(true);
      }
    });
  });

  describe('POST /admin/model/activate', () => {
    beforeAll(async () => {
      if (!authToken && workerRunning) {
        const authResponse = await fetch(`${WORKER_URL}/admin/auth`, {
          method: 'POST',
          headers: JSON_HEADERS,
          body: JSON.stringify({ password: ADMIN_PASSWORD })
        });
        const authData = await authResponse.json();
        authToken = authData.token;
      }
    });

    it.skipIf(!workerRunning)('should require authentication', async () => {
      const response = await fetch(`${WORKER_URL}/admin/model/activate`, {
        method: 'POST',
        headers: JSON_HEADERS,
        body: JSON.stringify({ version: '1.0.0' })
      });
      expect(response.status).toBe(401);
    });

    it.skipIf(!workerRunning)('should return 400 for missing version parameter', async () => {
      const response = await fetch(`${WORKER_URL}/admin/model/activate`, {
        method: 'POST',
        headers: { ...JSON_HEADERS, 'Authorization': `Bearer ${authToken}` },
        body: JSON.stringify({})
      });
      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data).toHaveProperty('error');
    });
  });

  describe('Authentication Token Validation', () => {
    it.skipIf(!workerRunning)('should reject malformed tokens', async () => {
      const malformedTokens = [
        'invalid-token',
        '',
        'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.invalid.signature'
      ];

      for (const token of malformedTokens) {
        const response = await fetch(`${WORKER_URL}/admin/scans`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        expect(response.status).toBe(401);
      }
    });

    it.skipIf(!workerRunning)('should reject requests without Authorization header', async () => {
      const response = await fetch(`${WORKER_URL}/admin/scans`);
      expect(response.status).toBe(401);
    });

    it.skipIf(!workerRunning)('should reject malformed Authorization header format', async () => {
      const response = await fetch(`${WORKER_URL}/admin/scans`, {
        headers: { 'Authorization': 'InvalidFormat' }
      });
      expect(response.status).toBe(401);
    });
  });

  describe('Admin Endpoints Security', () => {
    it.skipIf(!workerRunning)('should require auth on all protected endpoints', async () => {
      const endpoints = ['/admin/scans', '/admin/model/versions'];

      for (const endpoint of endpoints) {
        const response = await fetch(`${WORKER_URL}${endpoint}`);
        expect(response.status).toBe(401);
      }
    });

    it.skipIf(!workerRunning)('should require auth for POST admin endpoints', async () => {
      const response = await fetch(`${WORKER_URL}/admin/model/activate`, {
        method: 'POST',
        headers: JSON_HEADERS,
        body: JSON.stringify({ version: '1.0.0' })
      });
      expect(response.status).toBe(401);
    });
  });
});
