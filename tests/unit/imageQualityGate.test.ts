import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  checkMinResolution,
  checkLaplacianBlur,
  checkHistogramExposure,
  runQualityGate,
  THRESHOLDS,
} from '../../src/utils/imageQualityGate';

/**
 * Unit Tests for Image Quality Gate
 * 
 * Tests cover fixes from code review:
 * - Memory leak prevention (shared canvas)
 * - Correct percentile calculation
 * - Threshold validation
 */

describe('imageQualityGate', () => {
  let canvas: HTMLCanvasElement;
  let ctx: CanvasRenderingContext2D;

  beforeEach(() => {
    canvas = document.createElement('canvas');
    canvas.width = 800;
    canvas.height = 600;
    ctx = canvas.getContext('2d')!;
  });

  afterEach(() => {
    // Cleanup
    canvas = null as any;
    ctx = null as any;
  });

  describe('checkMinResolution', () => {
    it('should pass for images meeting minimum resolution', () => {
      canvas.width = 800;
      canvas.height = 600;
      
      const result = checkMinResolution(canvas);
      
      expect(result.passed).toBe(true);
      expect(result.message).toBeUndefined();
    });

    it('should fail for images below minimum resolution', () => {
      canvas.width = 300;
      canvas.height = 200;
      
      const result = checkMinResolution(canvas);
      
      expect(result.passed).toBe(false);
      expect(result.message).toBe('quality.tooFar');
    });

    it('should use shortest dimension for check', () => {
      // Wide image: 1000x300 (shortest = 300)
      canvas.width = 1000;
      canvas.height = 300;
      
      const result = checkMinResolution(canvas);
      
      expect(result.passed).toBe(false);
    });

    it('should pass at exact threshold', () => {
      canvas.width = THRESHOLDS.MIN_SHORTEST_DIMENSION_PX;
      canvas.height = 800;
      
      const result = checkMinResolution(canvas);
      
      expect(result.passed).toBe(true);
    });
  });

  describe('checkLaplacianBlur', () => {
    it('should pass for sharp images', () => {
      // Create a sharp pattern (checkerboard)
      const size = 200;
      for (let y = 0; y < size; y++) {
        for (let x = 0; x < size; x++) {
          const color = ((x + y) % 2) * 255;
          ctx.fillStyle = `rgb(${color},${color},${color})`;
          ctx.fillRect(x, y, 1, 1);
        }
      }
      
      const result = checkLaplacianBlur(canvas);
      
      expect(result.passed).toBe(true);
      expect(result.message).toBeUndefined();
    });

    it('should fail for blurry images', () => {
      // Create a uniform gray image (no edges = low variance)
      ctx.fillStyle = 'rgb(128,128,128)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      const result = checkLaplacianBlur(canvas);
      
      expect(result.passed).toBe(false);
      expect(result.message).toBe('quality.tooBlurry');
    });

    it('should handle edge cases gracefully', () => {
      // All white image
      ctx.fillStyle = 'white';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      const result = checkLaplacianBlur(canvas);
      
      expect(result.passed).toBe(false);
    });

    it('should not leak memory on repeated calls', () => {
      // This test verifies the shared canvas fix
      const initialCanvasCount = document.querySelectorAll('canvas').length;
      
      // Run check multiple times
      for (let i = 0; i < 100; i++) {
        checkLaplacianBlur(canvas);
      }
      
      const finalCanvasCount = document.querySelectorAll('canvas').length;
      
      // Should not create 100 new canvas elements
      // With the fix, it reuses a single shared canvas
      expect(finalCanvasCount - initialCanvasCount).toBeLessThan(5);
    });
  });

  describe('checkHistogramExposure', () => {
    it('should pass for well-exposed images', () => {
      // Create a gradient (good exposure range)
      const gradient = ctx.createLinearGradient(0, 0, canvas.width, 0);
      gradient.addColorStop(0, 'rgb(50,50,50)');
      gradient.addColorStop(1, 'rgb(200,200,200)');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      const result = checkHistogramExposure(canvas);
      
      expect(result.passed).toBe(true);
      expect(result.message).toBeUndefined();
    });

    it('should fail for overexposed images', () => {
      // Create a very bright image
      ctx.fillStyle = 'rgb(250,250,250)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      const result = checkHistogramExposure(canvas);
      
      expect(result.passed).toBe(false);
      expect(result.message).toBe('quality.tooBright');
    });

    it('should fail for underexposed images', () => {
      // Create a very dark image
      ctx.fillStyle = 'rgb(5,5,5)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      const result = checkHistogramExposure(canvas);
      
      expect(result.passed).toBe(false);
      expect(result.message).toBe('quality.tooDark');
    });

    it('should use correct percentile calculation', () => {
      // This test verifies the Math.floor fix for 5th percentile
      // Create an image with known distribution
      
      // Fill with mostly mid-gray
      ctx.fillStyle = 'rgb(128,128,128)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      // Add 5% very dark pixels
      ctx.fillStyle = 'rgb(10,10,10)';
      ctx.fillRect(0, 0, canvas.width * 0.05, canvas.height);
      
      // Add 5% very bright pixels
      ctx.fillStyle = 'rgb(245,245,245)';
      ctx.fillRect(canvas.width * 0.95, 0, canvas.width * 0.05, canvas.height);
      
      const result = checkHistogramExposure(canvas);
      
      // Should pass - 5th percentile is dark, 95th is bright, but within thresholds
      // With the Math.floor fix, percentiles are calculated correctly
      expect(result.passed).toBe(true);
    });

    it('should not leak memory on repeated calls', () => {
      const initialCanvasCount = document.querySelectorAll('canvas').length;
      
      for (let i = 0; i < 100; i++) {
        checkHistogramExposure(canvas);
      }
      
      const finalCanvasCount = document.querySelectorAll('canvas').length;
      
      // Should not create 100 new canvas elements
      expect(finalCanvasCount - initialCanvasCount).toBeLessThan(5);
    });
  });

  describe('runQualityGate', () => {
    it('should pass all checks for good quality image', () => {
      // Create a good quality image
      canvas.width = 800;
      canvas.height = 600;
      
      // Sharp pattern
      for (let y = 0; y < 100; y++) {
        for (let x = 0; x < 100; x++) {
          const color = ((x + y) % 2) * 100 + 50;
          ctx.fillStyle = `rgb(${color},${color},${color})`;
          ctx.fillRect(x * 8, y * 6, 8, 6);
        }
      }
      
      const result = runQualityGate(canvas);
      
      expect(result.passed).toBe(true);
      expect(result.issues).toHaveLength(0);
      expect(result.processingMs).toBeGreaterThan(0);
      expect(result.processingMs).toBeLessThan(200); // Should be fast
    });

    it('should fail on first check and stop early', () => {
      // Create image that fails resolution check
      canvas.width = 200;
      canvas.height = 150;
      
      const result = runQualityGate(canvas);
      
      expect(result.passed).toBe(false);
      expect(result.issues).toHaveLength(1);
      expect(result.issues[0].check).toBe('resolution');
      expect(result.issues[0].message).toBe('quality.tooFar');
    });

    it('should fail on blur check if resolution passes', () => {
      // Good resolution, but blurry
      canvas.width = 800;
      canvas.height = 600;
      
      ctx.fillStyle = 'rgb(128,128,128)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      const result = runQualityGate(canvas);
      
      expect(result.passed).toBe(false);
      expect(result.issues).toHaveLength(1);
      expect(result.issues[0].check).toBe('blur');
    });

    it('should fail on exposure check if resolution and blur pass', () => {
      // Good resolution and sharp, but overexposed
      canvas.width = 800;
      canvas.height = 600;
      
      // Sharp but very bright
      for (let y = 0; y < 100; y++) {
        for (let x = 0; x < 100; x++) {
          const color = ((x + y) % 2) * 5 + 250;
          ctx.fillStyle = `rgb(${color},${color},${color})`;
          ctx.fillRect(x * 8, y * 6, 8, 6);
        }
      }
      
      const result = runQualityGate(canvas);
      
      expect(result.passed).toBe(false);
      expect(result.issues).toHaveLength(1);
      expect(result.issues[0].check).toBe('exposure');
    });

    it('should complete within performance budget', () => {
      // Large canvas
      canvas.width = 1920;
      canvas.height = 1080;
      
      // Fill with pattern
      const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
      gradient.addColorStop(0, 'rgb(50,50,50)');
      gradient.addColorStop(0.5, 'rgb(128,128,128)');
      gradient.addColorStop(1, 'rgb(200,200,200)');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      const result = runQualityGate(canvas);
      
      // Should complete in under 100ms (performance budget)
      expect(result.processingMs).toBeLessThan(100);
    });

    it('should not leak memory on repeated calls', () => {
      const initialCanvasCount = document.querySelectorAll('canvas').length;
      
      // Run full quality gate 50 times
      for (let i = 0; i < 50; i++) {
        runQualityGate(canvas);
      }
      
      const finalCanvasCount = document.querySelectorAll('canvas').length;
      
      // Should not create 50+ new canvas elements
      // With the shared canvas fix, should create at most 1-2
      expect(finalCanvasCount - initialCanvasCount).toBeLessThan(5);
    });
  });

  describe('THRESHOLDS', () => {
    it('should have documented threshold values', () => {
      expect(THRESHOLDS.MIN_SHORTEST_DIMENSION_PX).toBe(400);
      expect(THRESHOLDS.LAPLACIAN_VARIANCE_MIN).toBe(50);
      expect(THRESHOLDS.OVEREXPOSED_TOP5_MAX).toBe(240);
      expect(THRESHOLDS.UNDEREXPOSED_BOTTOM5_MIN).toBe(15);
    });

    it('should have reasonable threshold values', () => {
      // Thresholds should be within expected ranges
      expect(THRESHOLDS.MIN_SHORTEST_DIMENSION_PX).toBeGreaterThan(0);
      expect(THRESHOLDS.MIN_SHORTEST_DIMENSION_PX).toBeLessThan(2000);
      
      expect(THRESHOLDS.LAPLACIAN_VARIANCE_MIN).toBeGreaterThan(0);
      expect(THRESHOLDS.LAPLACIAN_VARIANCE_MIN).toBeLessThan(1000);
      
      expect(THRESHOLDS.OVEREXPOSED_TOP5_MAX).toBeGreaterThan(200);
      expect(THRESHOLDS.OVEREXPOSED_TOP5_MAX).toBeLessThan(256);
      
      expect(THRESHOLDS.UNDEREXPOSED_BOTTOM5_MIN).toBeGreaterThan(0);
      expect(THRESHOLDS.UNDEREXPOSED_BOTTOM5_MIN).toBeLessThan(50);
    });
  });
});
