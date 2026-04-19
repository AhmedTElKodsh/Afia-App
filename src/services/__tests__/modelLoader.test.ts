/**
 * Model Loader Tests - Error Handling & Resilience
 * Story 7.4 - Task 8
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as tf from '@tensorflow/tfjs';
import { openDB } from 'idb';

// Mock dependencies
vi.mock('@tensorflow/tfjs');
vi.mock('idb');

describe('ModelLoader - Error Handling', () => {
  let originalFetch: typeof fetch;

  beforeEach(() => {
    vi.clearAllMocks();
    // Save original fetch
    originalFetch = global.fetch;
  });

  afterEach(async () => {
    vi.restoreAllMocks();
    // Restore original fetch
    global.fetch = originalFetch;
    // CRITICAL: Dispose model instance to prevent caching between tests
    const { disposeModel } = await import('../modelLoader');
    disposeModel();
  });

  describe('Model Download Failures', () => {
    it('should retry download on network failure', async () => {
      const { loadModel } = await import('../modelLoader');
      
      // Mock IndexedDB to return null (no cache)
      const mockDB = {
        get: vi.fn(() => Promise.resolve(null)),
        put: vi.fn(() => Promise.resolve()),
      };
      (openDB as any).mockResolvedValue(mockDB);
      
      // Mock fetch to fail twice, then succeed
      let callCount = 0;
      global.fetch = vi.fn(() => {
        callCount++;
        if (callCount <= 2) {
          return Promise.reject(new Error('Network error'));
        }
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            modelTopology: { class_name: 'Sequential', config: {} },
            weightsManifest: [{ paths: ['weights.bin'] }],
          }),
          arrayBuffer: () => Promise.resolve(new ArrayBuffer(100)),
        } as Response);
      });

      // Mock TensorFlow
      (tf.loadLayersModel as any).mockResolvedValue({ predict: vi.fn(), dispose: vi.fn() });
      (tf.setBackend as any).mockResolvedValue(undefined);
      (tf.ready as any).mockResolvedValue(undefined);
      (tf.getBackend as any).mockReturnValue('webgl');

      await loadModel();
      expect(callCount).toBeGreaterThan(1);
    });

    it('should throw error after max retries exceeded', async () => {
      const { loadModel } = await import('../modelLoader');
      
      // Mock IndexedDB to return null (no cache)
      const mockDB = {
        get: vi.fn(() => Promise.resolve(null)),
        put: vi.fn(() => Promise.resolve()),
      };
      (openDB as any).mockResolvedValue(mockDB);
      
      global.fetch = vi.fn(() => Promise.reject(new Error('Network error')));

      await expect(loadModel()).rejects.toThrow(/Model download failed after 3 retries/);
    });

    it('should handle HTTP error responses gracefully', async () => {
      const { loadModel } = await import('../modelLoader');
      
      // Mock IndexedDB to return null (no cache)
      const mockDB = {
        get: vi.fn(() => Promise.resolve(null)),
        put: vi.fn(() => Promise.resolve()),
      };
      (openDB as any).mockResolvedValue(mockDB);
      
      global.fetch = vi.fn(() => Promise.resolve({
        ok: false,
        status: 404,
      } as Response));

      await expect(loadModel()).rejects.toThrow(/Model download failed/);
    });
  });

  describe('IndexedDB Quota Exceeded', () => {
    it('should clear old model versions when quota exceeded', async () => {
      const { loadModel } = await import('../modelLoader');
      
      let putCallCount = 0;
      const mockDB = {
        get: vi.fn(() => Promise.resolve(null)),
        getAll: vi.fn(() => Promise.resolve([
          { version: '0.9.0', cachedAt: Date.now() - 1000000 },
          { version: '1.0.0', cachedAt: Date.now() },
        ])),
        put: vi.fn(() => {
          putCallCount++;
          if (putCallCount === 1) {
            const error: any = new Error('QuotaExceededError');
            error.name = 'QuotaExceededError';
            return Promise.reject(error);
          }
          return Promise.resolve();
        }),
        delete: vi.fn(() => Promise.resolve()),
      };

      (openDB as any).mockResolvedValue(mockDB);
      
      // Mock successful model download
      global.fetch = vi.fn(() => Promise.resolve({
        ok: true,
        json: () => Promise.resolve({
          modelTopology: { class_name: 'Sequential', config: {} },
          weightsManifest: [{ paths: ['weights.bin'] }],
        }),
        arrayBuffer: () => Promise.resolve(new ArrayBuffer(100)),
      } as Response));
      
      (tf.loadLayersModel as any).mockResolvedValue({ predict: vi.fn(), dispose: vi.fn() });
      (tf.setBackend as any).mockResolvedValue(undefined);
      (tf.ready as any).mockResolvedValue(undefined);
      (tf.getBackend as any).mockReturnValue('webgl');

      await loadModel();
      
      // Wait for async cache operations to complete - increased timeout for CI
      await new Promise(resolve => setTimeout(resolve, 300));
      
      expect(mockDB.delete).toHaveBeenCalledWith('models', '0.9.0');
      expect(putCallCount).toBe(2);
    }, 10000);

    it('should continue without caching if quota cannot be freed', async () => {
      const { loadModel } = await import('../modelLoader');
      
      const mockDB = {
        get: vi.fn(() => Promise.resolve(null)),
        getAll: vi.fn(() => Promise.resolve([])),
        put: vi.fn(() => {
          const error: any = new Error('QuotaExceededError');
          error.name = 'QuotaExceededError';
          return Promise.reject(error);
        }),
      };

      (openDB as any).mockResolvedValue(mockDB);
      
      // Mock successful model download
      global.fetch = vi.fn(() => Promise.resolve({
        ok: true,
        json: () => Promise.resolve({
          modelTopology: { class_name: 'Sequential', config: {} },
          weightsManifest: [{ paths: ['weights.bin'] }],
        }),
        arrayBuffer: () => Promise.resolve(new ArrayBuffer(100)),
      } as Response));
      
      (tf.loadLayersModel as any).mockResolvedValue({ predict: vi.fn(), dispose: vi.fn() });
      (tf.setBackend as any).mockResolvedValue(undefined);
      (tf.ready as any).mockResolvedValue(undefined);
      (tf.getBackend as any).mockReturnValue('webgl');

      await expect(loadModel()).resolves.toBeDefined();
    });
  });

  describe('Model Parse Errors', () => {
    it('should clear cache and retry on corrupt model data', async () => {
      const { loadModel } = await import('../modelLoader');
      
      let getCallCount = 0;
      const mockDB = {
        get: vi.fn(() => {
          getCallCount++;
          if (getCallCount === 1) {
            return Promise.resolve({ 
              version: '1.0.0',
              modelTopology: 'corrupt', 
              weightSpecs: [],
              weightData: new ArrayBuffer(0),
              cachedAt: Date.now(),
              mae: 0.08,
            });
          }
          return Promise.resolve(null);
        }),
        delete: vi.fn(() => Promise.resolve()),
        put: vi.fn(() => Promise.resolve()),
      };

      (openDB as any).mockResolvedValue(mockDB);
      
      let loadCallCount = 0;
      (tf.loadLayersModel as any).mockImplementation(() => {
        loadCallCount++;
        if (loadCallCount === 1) {
          return Promise.reject(new Error('Invalid model format'));
        }
        return Promise.resolve({ predict: vi.fn(), dispose: vi.fn() });
      });
      
      (tf.setBackend as any).mockResolvedValue(undefined);
      (tf.ready as any).mockResolvedValue(undefined);
      (tf.getBackend as any).mockReturnValue('webgl');
      
      // Mock successful model download for retry
      global.fetch = vi.fn(() => Promise.resolve({
        ok: true,
        json: () => Promise.resolve({
          modelTopology: { class_name: 'Sequential', config: {} },
          weightsManifest: [{ paths: ['weights.bin'] }],
        }),
        arrayBuffer: () => Promise.resolve(new ArrayBuffer(100)),
      } as Response));

      await expect(loadModel()).rejects.toThrow(/Model parse failed/);
      
      // Wait for async delete operation to complete
      await new Promise(resolve => setTimeout(resolve, 100));
      
      expect(mockDB.delete).toHaveBeenCalledWith('models', '1.0.0');
    }, 10000);
  });

  describe('Backend Optimization Failures', () => {
    it('should fall back to CPU if WebGL fails', async () => {
      const { loadModel } = await import('../modelLoader');
      
      // Mock IndexedDB to return null (no cache)
      const mockDB = {
        get: vi.fn(() => Promise.resolve(null)),
        put: vi.fn(() => Promise.resolve()),
      };
      (openDB as any).mockResolvedValue(mockDB);
      
      // Mock getBackend to return something other than 'webgl' initially
      (tf.getBackend as any).mockReturnValue('cpu');
      
      // Mock setBackend to fail for webgl, succeed for cpu
      (tf.setBackend as any).mockImplementation((backend: string) => {
        if (backend === 'webgl') {
          return Promise.reject(new Error('WebGL not supported'));
        }
        return Promise.resolve();
      });
      (tf.ready as any).mockResolvedValue(undefined);
      
      // Mock successful model download
      global.fetch = vi.fn(() => Promise.resolve({
        ok: true,
        json: () => Promise.resolve({
          modelTopology: { class_name: 'Sequential', config: {} },
          weightsManifest: [{ paths: ['weights.bin'] }],
        }),
        arrayBuffer: () => Promise.resolve(new ArrayBuffer(100)),
      } as Response));
      
      (tf.loadLayersModel as any).mockResolvedValue({ predict: vi.fn(), dispose: vi.fn() });

      await loadModel();
      
      // Should have tried webgl first, then fallen back to cpu
      expect(tf.setBackend).toHaveBeenCalledWith('webgl');
      expect(tf.setBackend).toHaveBeenCalledWith('cpu');
    }, 10000);
  });
});
