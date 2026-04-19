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
// Mock uploadFilter with immediate resolution to prevent Image loading
vi.mock('../uploadFilter', () => ({
  analyzeImageQuality: vi.fn(() => Promise.resolve({
    blurScore: 0.8,
    brightnessScore: 0.7,
  })),
  checkUploadQuality: vi.fn(() => ({ shouldWarn: false, reasons: [] })),
  QUALITY_THRESHOLDS: {
    BLUR_MIN: 0.4,
    BRIGHTNESS_MIN: 0.2,
    BRIGHTNESS_MAX: 0.95,
    BOTTLE_CONF_MIN: 0.5,
  },
}));
vi.mock('../syncQueue', () => ({
  enqueueAnalyzeRequest: vi.fn().mockResolvedValue('queue-id-123'),
}));
vi.mock('../inferenceRouter', () => ({
  routeInference: vi.fn((input) => {
    // Return 'local' for high confidence, 'llm' otherwise
    if (input.localModelConfidence && input.localModelConfidence >= 0.75) {
      return 'local';
    }
    return 'llm';
  }),
}));
vi.mock('../../utils/platformDetect', () => ({
  isIOS: false,
  isWebGLAvailable: vi.fn().mockResolvedValue(true),
}));
vi.mock('../../data/bottleRegistry', () => ({
  getBottleBySku: vi.fn().mockReturnValue({
    sku: 'TEST-001',
    name: 'Test Bottle',
    totalVolumeMl: 1000,
    geometry: 'cylindrical',
  }),
}));
vi.mock('../../utils/volumeCalculator', () => ({
  calculateRemainingMl: vi.fn().mockReturnValue(750),
}));

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
    }, 60000);

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
    }, 60000);

    it('should throw error when both local and LLM fail', async () => {
      (isModelLoaded as any).mockReturnValue(true);
      (runLocalInference as any).mockRejectedValue(new Error('Local failed'));
      (analyzeBottle as any).mockRejectedValue(new Error('LLM failed'));

      await expect(analyze({
        sku: 'TEST-003',
        imageBase64: 'data:image/png;base64,test',
        totalVolumeMl: 1000,
      })).rejects.toThrow();
    }, 60000);
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
    }, 60000);

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
    }, 60000);
  });

  describe('Progress Callback Errors', () => {
    it('should continue if progress callback throws', async () => {
      // Mock model as loaded
      (isModelLoaded as any).mockReturnValue(true);
      global.navigator = { ...originalNavigator, onLine: true } as Navigator;
      
      // Mock local inference to succeed with high confidence
      (runLocalInference as any).mockResolvedValue({
        fillPercentage: 75,
        confidence: 0.85, // High confidence - will use local result
        inferenceTimeMs: 45,
        modelVersion: '1.0.0',
      });
      
      const badCallback = () => {
        throw new Error('Callback error');
      };

      // Should not throw - callback errors should be caught
      const result = await analyze({
        sku: 'TEST-006',
        imageBase64: 'data:image/png;base64,test',
        totalVolumeMl: 1000,
        onProgress: badCallback,
      });
      
      expect(result).toBeDefined();
      expect(result.fillPercentage).toBe(75);
    }, 60000);
  });
});
