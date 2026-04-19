/**
 * Analysis Router Tests - Error Handling & Resilience
 * Story 7.4 - Task 8
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { analyze } from '../analysisRouter';
import { loadModel, isModelLoaded } from '../modelLoader';
import { runLocalInference } from '../localInference';
import { analyzeBottle } from '../../api/apiClient';

vi.mock('../modelLoader');
vi.mock('../localInference');
vi.mock('../../api/apiClient');

describe('AnalysisRouter - Error Handling', () => {
  let originalNavigator: Navigator;

  beforeEach(() => {
    vi.clearAllMocks();
    // Save original navigator
    originalNavigator = global.navigator;
    // Mock as online by default
    global.navigator = { ...originalNavigator, onLine: true } as Navigator;
  });

  afterEach(() => {
    // Restore original navigator
    global.navigator = originalNavigator;
  });

  describe('Graceful LLM Fallback', () => {
    it('should fall back to LLM when model loading fails', async () => {
      (loadModel as any).mockRejectedValue(new Error('Download failed'));
      (isModelLoaded as any).mockReturnValue(false);
      (analyzeBottle as any).mockResolvedValue({
        scanId: 'llm-123',
        fillPercentage: 75,
        confidence: 'high',
      });

      const result = await analyze({
        sku: 'TEST-001',
        imageBase64: 'data:image/png;base64,test',
        totalVolumeMl: 1000,
      });

      expect(result.llmFallbackUsed).toBe(true);
      expect(analyzeBottle).toHaveBeenCalled();
    });

    it('should fall back to LLM when inference fails', async () => {
      (isModelLoaded as any).mockReturnValue(true);
      (runLocalInference as any).mockRejectedValue(new Error('Inference failed'));
      (analyzeBottle as any).mockResolvedValue({
        scanId: 'llm-456',
        fillPercentage: 80,
      });

      const result = await analyze({
        sku: 'TEST-002',
        imageBase64: 'data:image/png;base64,test',
        totalVolumeMl: 1000,
      });

      expect(result.llmFallbackUsed).toBe(true);
    });

    it('should throw error when both local and LLM fail', async () => {
      (isModelLoaded as any).mockReturnValue(true);
      (runLocalInference as any).mockRejectedValue(new Error('Local failed'));
      (analyzeBottle as any).mockRejectedValue(new Error('LLM failed'));

      await expect(analyze({
        sku: 'TEST-003',
        imageBase64: 'data:image/png;base64,test',
        totalVolumeMl: 1000,
      })).rejects.toThrow();
    });
  });

  describe('Offline Error Handling', () => {
    it('should throw clear error when offline without cached model', async () => {
      (isModelLoaded as any).mockReturnValue(false);
      
      // Mock navigator.onLine as offline
      global.navigator = { ...originalNavigator, onLine: false } as Navigator;

      await expect(analyze({
        sku: 'TEST-004',
        imageBase64: 'data:image/png;base64,test',
        totalVolumeMl: 1000,
      })).rejects.toThrow('Cannot analyze offline without cached model');
    });

    it('should not attempt LLM fallback when offline', async () => {
      // Mock navigator.onLine as offline
      global.navigator = { ...originalNavigator, onLine: false } as Navigator;
      (isModelLoaded as any).mockReturnValue(true);
      (runLocalInference as any).mockRejectedValue(new Error('Inference failed'));

      await expect(analyze({
        sku: 'TEST-005',
        imageBase64: 'data:image/png;base64,test',
        totalVolumeMl: 1000,
      })).rejects.toThrow();

      expect(analyzeBottle).not.toHaveBeenCalled();
    });
  });

  describe('Progress Callback Errors', () => {
    it('should continue if progress callback throws', async () => {
      // Mock model as loaded and online
      (isModelLoaded as any).mockReturnValue(true);
      global.navigator = { ...originalNavigator, onLine: true } as Navigator;
      
      // Low confidence result triggers LLM fallback
      (runLocalInference as any).mockResolvedValue({
        fillPercentage: 75,
        confidence: 0.65, // Below 0.75 threshold
        inferenceTimeMs: 45,
        modelVersion: '1.0.0',
      });
      
      // Mock successful LLM response
      (analyzeBottle as any).mockResolvedValue({
        scanId: 'test-123',
        fillPercentage: 75,
        confidence: 'high',
      });

      const badCallback = () => {
        throw new Error('Callback error');
      };

      // Should not throw - callback errors should be caught
      await expect(analyze({
        sku: 'TEST-006',
        imageBase64: 'data:image/png;base64,test',
        totalVolumeMl: 1000,
        onProgress: badCallback,
      })).resolves.toBeDefined();
    });
  });
});
