/**
 * Inference Router Tests
 * Story 7.6 - LLM Fallback Routing Logic
 */
import { describe, it, expect } from 'vitest';
import { routeInference, type RouterInput } from '../inferenceRouter';

describe('inferenceRouter', () => {
  describe('routeInference', () => {
    it('returns "local" when model loaded, confidence >= 0.75, not iOS', () => {
      const input: RouterInput = {
        modelLoaded: true,
        localModelConfidence: 0.75,
        isIOS: false,
        webGLAvailable: true,
        brandClassifierConfidence: 0.85,
        sku: 'afia-1.5l',
      };

      expect(routeInference(input)).toBe('local');
    });

    it('returns "local" when model loaded, confidence 0.80, iOS + WebGL available', () => {
      const input: RouterInput = {
        modelLoaded: true,
        localModelConfidence: 0.80,
        isIOS: true,
        webGLAvailable: true,
        brandClassifierConfidence: 0.85,
        sku: 'afia-1.5l',
      };

      expect(routeInference(input)).toBe('local');
    });

    it('returns "llm" when model loaded, confidence 0.74', () => {
      const input: RouterInput = {
        modelLoaded: true,
        localModelConfidence: 0.74,
        isIOS: false,
        webGLAvailable: true,
        brandClassifierConfidence: 0.85,
        sku: 'afia-1.5l',
      };

      expect(routeInference(input)).toBe('llm');
    });

    it('returns "llm" when model not loaded', () => {
      const input: RouterInput = {
        modelLoaded: false,
        localModelConfidence: null,
        isIOS: false,
        webGLAvailable: true,
        brandClassifierConfidence: 0.85,
        sku: 'afia-1.5l',
      };

      expect(routeInference(input)).toBe('llm');
    });

    it('returns "llm" when iOS + WebGL unavailable (regardless of confidence)', () => {
      const input: RouterInput = {
        modelLoaded: true,
        localModelConfidence: 0.90,
        isIOS: true,
        webGLAvailable: false,
        brandClassifierConfidence: 0.85,
        sku: 'afia-1.5l',
      };

      expect(routeInference(input)).toBe('llm');
    });

    it('returns "needs-sku" when brandClassifierConfidence 0.79 + sku null', () => {
      const input: RouterInput = {
        modelLoaded: true,
        localModelConfidence: 0.80,
        isIOS: false,
        webGLAvailable: true,
        brandClassifierConfidence: 0.79,
        sku: null,
      };

      expect(routeInference(input)).toBe('needs-sku');
    });

    it('returns "local" when brandClassifierConfidence 0.79 + sku present (QR loaded)', () => {
      const input: RouterInput = {
        modelLoaded: true,
        localModelConfidence: 0.80,
        isIOS: false,
        webGLAvailable: true,
        brandClassifierConfidence: 0.79,
        sku: 'afia-1.5l',
      };

      expect(routeInference(input)).toBe('local');
    });

    it('returns "needs-sku" when brandClassifierConfidence null + sku null', () => {
      const input: RouterInput = {
        modelLoaded: true,
        localModelConfidence: 0.80,
        isIOS: false,
        webGLAvailable: true,
        brandClassifierConfidence: null,
        sku: null,
      };

      expect(routeInference(input)).toBe('needs-sku');
    });

    it('returns "llm" when confidence null (model not run yet)', () => {
      const input: RouterInput = {
        modelLoaded: true,
        localModelConfidence: null,
        isIOS: false,
        webGLAvailable: true,
        brandClassifierConfidence: 0.85,
        sku: 'afia-1.5l',
      };

      expect(routeInference(input)).toBe('llm');
    });
  });
});
