/**
 * Tests for imageQualityGate.ts
 * Story 10-3 — Client-Side Image Quality Gate
 *
 * NOTE: checkLaplacianBlur and checkHistogramExposure create an internal 200×200
 * sample canvas via document.createElement. Since JSDOM's canvas is a no-op,
 * tests override HTMLCanvasElement.prototype.getContext before calling the SUT
 * so that getImageData returns controlled pixel data.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  checkMinResolution,
  checkLaplacianBlur,
  checkHistogramExposure,
  runQualityGate,
  THRESHOLDS,
} from './imageQualityGate';

// ─── pixel-data factories ────────────────────────────────────────────────────

function makeCanvas(width: number, height: number): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = width;
  c.height = height;
  return c;
}

/** Uniform grey — zero Laplacian variance, controlled exposure */
function uniformGrey(intensity: number) {
  return (w: number, h: number): Uint8ClampedArray => {
    const data = new Uint8ClampedArray(w * h * 4);
    for (let i = 0; i < w * h; i++) {
      data[i * 4] = intensity;
      data[i * 4 + 1] = intensity;
      data[i * 4 + 2] = intensity;
      data[i * 4 + 3] = 255;
    }
    return data;
  };
}

/** Checkerboard (alternating 0/255) — high Laplacian variance, but underexposed (50% zeros) */
function checkerboard() {
  return (w: number, h: number): Uint8ClampedArray => {
    const data = new Uint8ClampedArray(w * h * 4);
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const v = (x + y) % 2 === 0 ? 255 : 0;
        const i = (y * w + x) * 4;
        data[i] = v; data[i + 1] = v; data[i + 2] = v; data[i + 3] = 255;
      }
    }
    return data;
  };
}

/**
 * Mid-range checkerboard (alternating 50/200).
 * Passes blur (high Laplacian variance) AND exposure (5th%ile=50 ≥ 15, 95th%ile=200 ≤ 240).
 * Use this for "all checks pass" scenarios.
 */
function midCheckerboard() {
  return (w: number, h: number): Uint8ClampedArray => {
    const data = new Uint8ClampedArray(w * h * 4);
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const v = (x + y) % 2 === 0 ? 200 : 50;
        const i = (y * w + x) * 4;
        data[i] = v; data[i + 1] = v; data[i + 2] = v; data[i + 3] = 255;
      }
    }
    return data;
  };
}

/**
 * Returns pixel data where `darkPct` of pixels have `darkVal` and
 * `brightPct` of pixels have `brightVal`, with midVal for the rest.
 * Useful for constructing specific histogram exposure scenarios.
 */
function exposureData(
  darkPct: number, darkVal: number,
  brightPct: number, brightVal: number,
  midVal: number,
) {
  return (w: number, h: number): Uint8ClampedArray => {
    const data = new Uint8ClampedArray(w * h * 4);
    const n = w * h;
    const darkCount = Math.floor(n * darkPct);
    const brightCount = Math.floor(n * brightPct);
    for (let i = 0; i < n; i++) {
      let v: number;
      if (i < darkCount) v = darkVal;
      else if (i >= n - brightCount) v = brightVal;
      else v = midVal;
      data[i * 4] = v; data[i * 4 + 1] = v; data[i * 4 + 2] = v; data[i * 4 + 3] = 255;
    }
    return data;
  };
}

// ─── canvas prototype mock helpers ──────────────────────────────────────────

type PixelFactory = (w: number, h: number) => Uint8ClampedArray;
let originalGetContext: typeof HTMLCanvasElement.prototype.getContext;

beforeEach(() => {
  originalGetContext = HTMLCanvasElement.prototype.getContext;
});
afterEach(() => {
  HTMLCanvasElement.prototype.getContext = originalGetContext;
});

/** Override getContext so all 2d contexts return data from the given factory */
function setPixelData(factory: PixelFactory) {
  HTMLCanvasElement.prototype.getContext = function (type: string, ...args: any[]) {
    if (type !== '2d') return (originalGetContext as any).call(this, type, ...args);
    return {
      drawImage: vi.fn(),
      getImageData: vi.fn((_x: number, _y: number, w: number, h: number) => ({
        data: factory(w, h),
        width: w,
        height: h,
      })),
    } as any;
  };
}

// ─── checkMinResolution ─────────────────────────────────────────────────────

describe('checkMinResolution', () => {
  it('passes when both dimensions are well above threshold', () => {
    expect(checkMinResolution(makeCanvas(800, 600)).passed).toBe(true);
  });

  it('passes when shortest dimension equals threshold exactly', () => {
    expect(checkMinResolution(makeCanvas(THRESHOLDS.MIN_SHORTEST_DIMENSION_PX, 800)).passed).toBe(true);
    expect(checkMinResolution(makeCanvas(800, THRESHOLDS.MIN_SHORTEST_DIMENSION_PX)).passed).toBe(true);
  });

  it('passes for a square at threshold', () => {
    expect(checkMinResolution(makeCanvas(400, 400)).passed).toBe(true);
  });

  it('fails when width is one pixel below threshold', () => {
    const result = checkMinResolution(makeCanvas(399, 800));
    expect(result.passed).toBe(false);
    expect(result.message).toBe('quality.tooFar');
  });

  it('fails when height is one pixel below threshold', () => {
    expect(checkMinResolution(makeCanvas(800, 399)).passed).toBe(false);
  });

  it('fails for a tiny canvas', () => {
    expect(checkMinResolution(makeCanvas(100, 100)).passed).toBe(false);
  });

  it('uses the shorter dimension as the deciding factor', () => {
    // 10000 × 300 — shortest is 300, which is < 400
    expect(checkMinResolution(makeCanvas(10000, 300)).passed).toBe(false);
  });
});

// ─── checkLaplacianBlur ─────────────────────────────────────────────────────

describe('checkLaplacianBlur', () => {
  it('fails for a uniform grey image (zero Laplacian variance)', () => {
    setPixelData(uniformGrey(128));
    const result = checkLaplacianBlur(makeCanvas(800, 600));
    expect(result.passed).toBe(false);
    expect(result.message).toBe('quality.tooBlurry');
  });

  it('fails for an all-black image', () => {
    setPixelData(uniformGrey(0));
    expect(checkLaplacianBlur(makeCanvas(800, 600)).passed).toBe(false);
  });

  it('fails for an all-white image', () => {
    setPixelData(uniformGrey(255));
    expect(checkLaplacianBlur(makeCanvas(800, 600)).passed).toBe(false);
  });

  it('passes for a high-contrast checkerboard image', () => {
    setPixelData(checkerboard());
    const result = checkLaplacianBlur(makeCanvas(800, 600));
    expect(result.passed).toBe(true);
  });

  it('returns passed:true when canvas context is unavailable (fail-open)', () => {
    HTMLCanvasElement.prototype.getContext = () => null as any;
    expect(checkLaplacianBlur(makeCanvas(800, 600)).passed).toBe(true);
  });
});

// ─── checkHistogramExposure ─────────────────────────────────────────────────

describe('checkHistogramExposure', () => {
  it('passes for a well-exposed mid-range image', () => {
    setPixelData(uniformGrey(128));
    expect(checkHistogramExposure(makeCanvas(800, 600)).passed).toBe(true);
  });

  it('fails (underexposed) for an all-black image', () => {
    setPixelData(uniformGrey(0));
    const result = checkHistogramExposure(makeCanvas(800, 600));
    expect(result.passed).toBe(false);
    expect(result.message).toBe('quality.tooDark');
  });

  it('fails (overexposed) for an all-white image', () => {
    setPixelData(uniformGrey(255));
    const result = checkHistogramExposure(makeCanvas(800, 600));
    expect(result.passed).toBe(false);
    expect(result.message).toBe('quality.tooBright');
  });

  it('fails (overexposed) when >5% pixels are above 240', () => {
    // 10% of pixels at intensity 250, rest at 128
    setPixelData(exposureData(0, 0, 0.10, 250, 128));
    const result = checkHistogramExposure(makeCanvas(800, 600));
    expect(result.passed).toBe(false);
    expect(result.message).toBe('quality.tooBright');
  });

  it('fails (underexposed) when >5% pixels are below 15', () => {
    // 10% of pixels at intensity 5, rest at 128
    setPixelData(exposureData(0.10, 5, 0, 255, 128));
    const result = checkHistogramExposure(makeCanvas(800, 600));
    expect(result.passed).toBe(false);
    expect(result.message).toBe('quality.tooDark');
  });

  it('passes when exactly 5% of pixels are at the underexposed boundary', () => {
    // 4% dark pixels at exactly the threshold (15), rest = 128
    setPixelData(exposureData(0.04, THRESHOLDS.UNDEREXPOSED_BOTTOM5_MIN, 0, 200, 128));
    expect(checkHistogramExposure(makeCanvas(800, 600)).passed).toBe(true);
  });

  it('passes when exactly 5% of pixels are at the overexposed boundary', () => {
    // 4% bright pixels at exactly the threshold (240), rest = 128
    setPixelData(exposureData(0, 30, 0.04, THRESHOLDS.OVEREXPOSED_TOP5_MAX, 128));
    expect(checkHistogramExposure(makeCanvas(800, 600)).passed).toBe(true);
  });

  it('returns passed:true when canvas context is unavailable (fail-open)', () => {
    HTMLCanvasElement.prototype.getContext = () => null as any;
    expect(checkHistogramExposure(makeCanvas(800, 600)).passed).toBe(true);
  });
});

// ─── runQualityGate ─────────────────────────────────────────────────────────

describe('runQualityGate', () => {
  it('passes (all 3 checks OK) for a sharp, well-exposed image', () => {
    setPixelData(midCheckerboard());
    const canvas = makeCanvas(800, 600);
    const result = runQualityGate(canvas);
    expect(result.passed).toBe(true);
    expect(result.issues).toHaveLength(0);
  });

  it('short-circuits at resolution check — only 1 issue returned', () => {
    setPixelData(checkerboard());
    const canvas = makeCanvas(100, 100); // too small
    const result = runQualityGate(canvas);
    expect(result.passed).toBe(false);
    expect(result.issues).toHaveLength(1);
    expect(result.issues[0].check).toBe('resolution');
    expect(result.issues[0].message).toBe('quality.tooFar');
  });

  it('reports blur failure after resolution passes', () => {
    setPixelData(uniformGrey(128)); // passes resolution, fails blur (and exposure)
    const canvas = makeCanvas(800, 600);
    const result = runQualityGate(canvas);
    expect(result.passed).toBe(false);
    // Blur is checked second — short-circuit stops before exposure
    expect(result.issues[0].check).toBe('blur');
    expect(result.issues[0].message).toBe('quality.tooBlurry');
  });

  it('reports exposure failure after resolution and blur pass', () => {
    // Use a sequence mock: first call (blur check) → sharp data; second call (exposure) → overexposed
    let callIndex = 0;
    HTMLCanvasElement.prototype.getContext = function (type: string) {
      if (type !== '2d') return null as any;
      return {
        drawImage: vi.fn(),
        getImageData: vi.fn((_x: number, _y: number, w: number, h: number) => {
          callIndex++;
          const factory = callIndex === 1 ? checkerboard() : uniformGrey(255);
          return { data: factory(w, h), width: w, height: h };
        }),
      } as any;
    };

    const canvas = makeCanvas(800, 600);
    const result = runQualityGate(canvas);
    expect(result.passed).toBe(false);
    expect(result.issues[0].check).toBe('exposure');
  });

  it('includes processingMs as a non-negative number', () => {
    setPixelData(midCheckerboard());
    const result = runQualityGate(makeCanvas(800, 600));
    expect(typeof result.processingMs).toBe('number');
    expect(result.processingMs).toBeGreaterThanOrEqual(0);
  });

  it('processes in < 100ms on a 1280×960 canvas', () => {
    setPixelData(midCheckerboard());
    const result = runQualityGate(makeCanvas(1280, 960));
    expect(result.processingMs).toBeLessThan(100);
  });
});
