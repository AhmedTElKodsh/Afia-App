/**
 * Model Version Management Tests
 * Story 7.5 - Task 2
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { checkModelVersion } from '../modelLoader';

// Mock fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Mock IndexedDB
const mockDB = {
  getAll: vi.fn(),
  put: vi.fn(),
  delete: vi.fn(),
};

vi.mock('idb', () => ({
  openDB: vi.fn(() => Promise.resolve(mockDB)),
}));

// Mock TensorFlow.js
vi.mock('@tensorflow/tfjs', () => ({
  loadLayersModel: vi.fn(),
  getBackend: vi.fn(() => 'cpu'),
  setBackend: vi.fn(),
  ready: vi.fn(() => Promise.resolve()),
}));

// Mock error telemetry
vi.mock('../errorTelemetry', () => ({
  logError: vi.fn(),
}));

describe('Model Version Management', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockDB.getAll.mockResolvedValue([]);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('checkModelVersion', () => {
    it('should detect when update is available', async () => {
      // Mock server response with new version
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          version: '1.2.0',
          mae: 0.075,
          trainingCount: 1500,
          r2Key: 'models/fill-regressor/v1.2.0/model.json',
          deployedAt: '2026-04-17T10:00:00Z',
        }),
      });

      // Mock cached version (old)
      mockDB.getAll.mockResolvedValueOnce([
        {
          version: '1.0.0',
          cachedAt: Date.now() - 86400000, // 1 day ago
        },
      ]);

      const result = await checkModelVersion();

      expect(result.updateAvailable).toBe(true);
      expect(result.currentVersion).toBe('1.0.0');
      expect(result.latestVersion).toBe('1.2.0');
      expect(result.updateTriggered).toBe(true);
    });

    it('should return no update when versions match', async () => {
      // Mock server response with same version
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          version: '1.0.0',
          mae: 0.08,
          trainingCount: 1250,
          r2Key: 'models/fill-regressor/v1.0.0/model.json',
          deployedAt: '2026-04-01T10:00:00Z',
        }),
      });

      // Mock cached version (same)
      mockDB.getAll.mockResolvedValueOnce([
        {
          version: '1.0.0',
          cachedAt: Date.now() - 3600000, // 1 hour ago
        },
      ]);

      const result = await checkModelVersion();

      expect(result.updateAvailable).toBe(false);
      expect(result.currentVersion).toBe('1.0.0');
      expect(result.latestVersion).toBe('1.0.0');
      expect(result.updateTriggered).toBe(false);
    });

    it('should handle version check endpoint failure gracefully', async () => {
      // Mock server error
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
      });

      const result = await checkModelVersion();

      expect(result.updateAvailable).toBe(false);
      expect(result.updateTriggered).toBe(false);
      // Should return current version as fallback
      expect(result.currentVersion).toBe('1.0.0');
    });

    it('should handle network timeout gracefully', async () => {
      // Mock network timeout
      mockFetch.mockRejectedValueOnce(new Error('Network timeout'));

      const result = await checkModelVersion();

      expect(result.updateAvailable).toBe(false);
      expect(result.updateTriggered).toBe(false);
    });

    it('should use hardcoded version when no cache exists', async () => {
      // Mock server response
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          version: '1.2.0',
          mae: 0.075,
          trainingCount: 1500,
          r2Key: 'models/fill-regressor/v1.2.0/model.json',
          deployedAt: '2026-04-17T10:00:00Z',
        }),
      });

      // Mock empty cache
      mockDB.getAll.mockResolvedValueOnce([]);

      const result = await checkModelVersion();

      expect(result.updateAvailable).toBe(true);
      expect(result.currentVersion).toBe('1.0.0'); // Hardcoded fallback
      expect(result.latestVersion).toBe('1.2.0');
    });
  });
});
