/**
 * Upload Filter Tests
 * Story 7.8 - Service Worker Smart Upload Filtering
 */

import { describe, it, expect } from 'vitest';
import {
  checkUploadQuality,
  calculateBlurScore,
  calculateBrightnessScore,
  QUALITY_THRESHOLDS,
  type ImageQualitySignals,
} from '../uploadFilter';

describe('uploadFilter', () => {
  describe('checkUploadQuality', () => {
    it('should not warn for high-quality image', () => {
      const signals: ImageQualitySignals = {
        blurScore: 0.8,
        brightnessScore: 0.5,
        bottleDetectionConfidence: 0.9,
      };

      const result = checkUploadQuality(signals);

      expect(result.shouldWarn).toBe(false);
      expect(result.reasons).toHaveLength(0);
    });

    it('should warn for blurry image', () => {
      const signals: ImageQualitySignals = {
        blurScore: 0.3, // Below BLUR_MIN (0.4)
        brightnessScore: 0.5,
        bottleDetectionConfidence: 0.9,
      };

      const result = checkUploadQuality(signals);

      expect(result.shouldWarn).toBe(true);
      expect(result.reasons).toContain('uploadQuality.reasons.blur');
    });

    it('should warn for too dark image', () => {
      const signals: ImageQualitySignals = {
        blurScore: 0.8,
        brightnessScore: 0.1, // Below BRIGHTNESS_MIN (0.2)
        bottleDetectionConfidence: 0.9,
      };

      const result = checkUploadQuality(signals);

      expect(result.shouldWarn).toBe(true);
      expect(result.reasons).toContain('uploadQuality.reasons.tooDark');
    });

    it('should warn for overexposed image', () => {
      const signals: ImageQualitySignals = {
        blurScore: 0.8,
        brightnessScore: 0.96, // Above BRIGHTNESS_MAX (0.95)
        bottleDetectionConfidence: 0.9,
      };

      const result = checkUploadQuality(signals);

      expect(result.shouldWarn).toBe(true);
      expect(result.reasons).toContain('uploadQuality.reasons.tooBright');
    });

    it('should warn for low bottle detection confidence', () => {
      const signals: ImageQualitySignals = {
        blurScore: 0.8,
        brightnessScore: 0.5,
        bottleDetectionConfidence: 0.4, // Below BOTTLE_CONF_MIN (0.5)
      };

      const result = checkUploadQuality(signals);

      expect(result.shouldWarn).toBe(true);
      expect(result.reasons).toContain('uploadQuality.reasons.noBottle');
    });

    it('should not warn when bottle detection confidence is null', () => {
      const signals: ImageQualitySignals = {
        blurScore: 0.8,
        brightnessScore: 0.5,
        bottleDetectionConfidence: null,
      };

      const result = checkUploadQuality(signals);

      expect(result.shouldWarn).toBe(false);
      expect(result.reasons).toHaveLength(0);
    });

    it('should warn for multiple issues', () => {
      const signals: ImageQualitySignals = {
        blurScore: 0.3, // Blurry
        brightnessScore: 0.1, // Too dark
        bottleDetectionConfidence: 0.4, // Low confidence
      };

      const result = checkUploadQuality(signals);

      expect(result.shouldWarn).toBe(true);
      expect(result.reasons).toHaveLength(3);
      expect(result.reasons).toContain('uploadQuality.reasons.blur');
      expect(result.reasons).toContain('uploadQuality.reasons.tooDark');
      expect(result.reasons).toContain('uploadQuality.reasons.noBottle');
    });

    it('should handle edge case at exact threshold values', () => {
      const signals: ImageQualitySignals = {
        blurScore: QUALITY_THRESHOLDS.BLUR_MIN, // Exactly at threshold
        brightnessScore: QUALITY_THRESHOLDS.BRIGHTNESS_MIN, // Exactly at threshold
        bottleDetectionConfidence: QUALITY_THRESHOLDS.BOTTLE_CONF_MIN, // Exactly at threshold
      };

      const result = checkUploadQuality(signals);

      // At threshold should not warn
      expect(result.shouldWarn).toBe(false);
      expect(result.reasons).toHaveLength(0);
    });

    it('should handle edge case just below threshold values', () => {
      const signals: ImageQualitySignals = {
        blurScore: QUALITY_THRESHOLDS.BLUR_MIN - 0.01,
        brightnessScore: QUALITY_THRESHOLDS.BRIGHTNESS_MIN - 0.01,
        bottleDetectionConfidence: QUALITY_THRESHOLDS.BOTTLE_CONF_MIN - 0.01,
      };

      const result = checkUploadQuality(signals);

      // Just below threshold should warn
      expect(result.shouldWarn).toBe(true);
      expect(result.reasons.length).toBeGreaterThan(0);
    });
  });

  describe('calculateBlurScore', () => {
    it('should return a value between 0 and 1', () => {
      // Create a simple test image
      const canvas = document.createElement('canvas');
      canvas.width = 100;
      canvas.height = 100;
      const ctx = canvas.getContext('2d')!;
      
      // Fill with random noise
      const imageData = ctx.createImageData(100, 100);
      for (let i = 0; i < imageData.data.length; i += 4) {
        imageData.data[i] = Math.random() * 255;
        imageData.data[i + 1] = Math.random() * 255;
        imageData.data[i + 2] = Math.random() * 255;
        imageData.data[i + 3] = 255;
      }

      const score = calculateBlurScore(imageData);

      expect(score).toBeGreaterThanOrEqual(0);
      expect(score).toBeLessThanOrEqual(1);
    });

    it('should return higher score for sharp edges', () => {
      const canvas = document.createElement('canvas');
      canvas.width = 100;
      canvas.height = 100;
      const ctx = canvas.getContext('2d')!;
      
      // Create sharp edge pattern (black and white stripes)
      const imageData = ctx.createImageData(100, 100);
      for (let i = 0; i < imageData.data.length; i += 4) {
        const x = (i / 4) % 100;
        const value = x % 2 === 0 ? 0 : 255;
        imageData.data[i] = value;
        imageData.data[i + 1] = value;
        imageData.data[i + 2] = value;
        imageData.data[i + 3] = 255;
      }

      const sharpScore = calculateBlurScore(imageData);

      // Create blurry pattern (gradual gradient)
      const blurryImageData = ctx.createImageData(100, 100);
      for (let i = 0; i < blurryImageData.data.length; i += 4) {
        const x = (i / 4) % 100;
        const value = (x / 100) * 255;
        blurryImageData.data[i] = value;
        blurryImageData.data[i + 1] = value;
        blurryImageData.data[i + 2] = value;
        blurryImageData.data[i + 3] = 255;
      }

      const blurryScore = calculateBlurScore(blurryImageData);

      expect(sharpScore).toBeGreaterThan(blurryScore);
    });
  });

  describe('calculateBrightnessScore', () => {
    it('should return 0 for completely black image', () => {
      const canvas = document.createElement('canvas');
      canvas.width = 100;
      canvas.height = 100;
      const ctx = canvas.getContext('2d')!;
      
      const imageData = ctx.createImageData(100, 100);
      // All pixels are black (0, 0, 0)
      for (let i = 0; i < imageData.data.length; i += 4) {
        imageData.data[i] = 0;
        imageData.data[i + 1] = 0;
        imageData.data[i + 2] = 0;
        imageData.data[i + 3] = 255;
      }

      const score = calculateBrightnessScore(imageData);

      expect(score).toBe(0);
    });

    it('should return 1 for completely white image', () => {
      const canvas = document.createElement('canvas');
      canvas.width = 100;
      canvas.height = 100;
      const ctx = canvas.getContext('2d')!;
      
      const imageData = ctx.createImageData(100, 100);
      // All pixels are white (255, 255, 255)
      for (let i = 0; i < imageData.data.length; i += 4) {
        imageData.data[i] = 255;
        imageData.data[i + 1] = 255;
        imageData.data[i + 2] = 255;
        imageData.data[i + 3] = 255;
      }

      const score = calculateBrightnessScore(imageData);

      expect(score).toBe(1);
    });

    it('should return approximately 0.5 for mid-gray image', () => {
      const canvas = document.createElement('canvas');
      canvas.width = 100;
      canvas.height = 100;
      const ctx = canvas.getContext('2d')!;
      
      const imageData = ctx.createImageData(100, 100);
      // All pixels are mid-gray (128, 128, 128)
      for (let i = 0; i < imageData.data.length; i += 4) {
        imageData.data[i] = 128;
        imageData.data[i + 1] = 128;
        imageData.data[i + 2] = 128;
        imageData.data[i + 3] = 255;
      }

      const score = calculateBrightnessScore(imageData);

      expect(score).toBeCloseTo(0.5, 1);
    });

    it('should use luminance formula correctly', () => {
      const canvas = document.createElement('canvas');
      canvas.width = 1;
      canvas.height = 1;
      const ctx = canvas.getContext('2d')!;
      
      const imageData = ctx.createImageData(1, 1);
      // Red pixel (255, 0, 0)
      imageData.data[0] = 255;
      imageData.data[1] = 0;
      imageData.data[2] = 0;
      imageData.data[3] = 255;

      const score = calculateBrightnessScore(imageData);

      // Luminance = 0.299 * 255 = 76.245
      // Normalized = 76.245 / 255 ≈ 0.299
      expect(score).toBeCloseTo(0.299, 2);
    });
  });
});
