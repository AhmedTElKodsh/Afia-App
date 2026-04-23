import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// RGB values verified against updated HSV thresholds in analyzeComposition:
//   Green label: H≈120°, S≈80%, V≈60% → RGB(30,153,30)   passes isGreen (H 90–160, S≥0.35, V≥0.22)
//   Amber oil:   H≈40°,  S≈80%, V≈80% → RGB(204,153,41)  passes isAmber (H 28–58, S≥0.38, V≥0.42)
const GREEN: [number, number, number] = [30, 153, 30];
const AMBER: [number, number, number] = [204, 153, 41];
const BLACK: [number, number, number] = [0, 0, 0];
const W = 60, H = 100; // processing canvas dimensions

function makePixels(fn: (x: number, y: number) => [number, number, number]): Uint8ClampedArray {
  const data = new Uint8ClampedArray(W * H * 4);
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const [r, g, b] = fn(x, y);
      const i = (y * W + x) * 4;
      data[i] = r; data[i + 1] = g; data[i + 2] = b; data[i + 3] = 255;
    }
  }
  return data;
}

describe('analyzeComposition', () => {
  let analyzeComposition!: (typeof import('../utils/cameraQualityAssessment.ts'))['analyzeComposition'];
  // The `!` definite-assignment assertion is required — TypeScript strict mode cannot
  // infer that `beforeEach` always runs before each `it` block.

  beforeEach(async () => {
    vi.resetModules(); // resets module-level processingCanvas singleton
    ({ analyzeComposition } = await import('../utils/cameraQualityAssessment.ts'));
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  function mockCanvas(pixels: Uint8ClampedArray) {
    const mockCtx = {
      drawImage: vi.fn(),
      getImageData: vi.fn().mockReturnValue({ data: pixels }),
    };
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(
      mockCtx as unknown as CanvasRenderingContext2D
    );
    return mockCtx;
  }

  it('TC1: bottle-shaped region (narrow neck, wide body) → bottleDetected true, distance good', () => {
    // bbox: x=18–42 (bboxWidth=24), y=10–90 (bboxHeight=80) → aspectRatio=24/80=0.30 ≤ 0.75 ✓
    // neck zone = top 25% of bbox = rows 10–30 (neckRows=20); pixels at x=28–32 (4 wide)
    //   neckTotal = 20×4 = 80; neckDensity = 80/(20×24) = 0.166
    // body zone = bottom 60% of bbox = rows 42–90 (bodyRows=48); pixels at x=18–42 (24 wide)
    //   bodyTotal = 48×24 = 1152; bodyDensity = 1152/(48×24) = 1.0
    // 0.166 < 0.40×1.0 → neck sparsity gate passes ✓
    // spanFraction = 80/100 = 0.80 → within 0.55–0.90 → verticalOk ✓
    // widthFraction = 24/60 = 0.40 → ≥ 0.35 → horizontalOk ✓
    // centroidX ≈ 0.5 → isCentered ✓
    const pixels = makePixels((x, y) => {
      if (y >= 10 && y < 30 && x >= 28 && x < 32) return GREEN; // narrow neck
      if (y >= 30 && y < 90 && x >= 18 && x < 42) return AMBER; // wide body
      return BLACK;
    });
    mockCanvas(pixels);
    const result = analyzeComposition(document.createElement('canvas') as unknown as HTMLVideoElement);
    expect(result.bottleDetected).toBe(true);
    expect(result.distance).toBe('good');
    expect(result.widthFraction).toBeCloseTo(0.40);
    expect(result.centroidX).toBeCloseTo(0.5, 1);
    expect(result.isBrandMatch).toBeDefined();
  });

  it('TC1b: too narrow bottle → distance too-far', () => {
    // bboxWidth=18 (18/60 = 0.30) < 0.35 threshold
    const pixels = makePixels((x, y) => {
      if (y >= 10 && y < 30 && x >= 28 && x < 32) return GREEN;
      if (y >= 30 && y < 90 && x >= 21 && x < 39) return AMBER;
      return BLACK;
    });
    mockCanvas(pixels);
    const result = analyzeComposition(document.createElement('canvas') as unknown as HTMLVideoElement);
    expect(result.bottleDetected).toBe(true);
    expect(result.distance).toBe('too-far');
    expect(result.widthFraction).toBeCloseTo(0.30);
  });

  it('TC1c: off-centre bottle → distance too-far', () => {
    // bboxWidth=24, but shifted right: x=30–54
    // centroidX ≈ 42/60 = 0.70. |0.70 - 0.5| = 0.20 > 0.15 limit.
    const pixels = makePixels((x, y) => {
      if (y >= 10 && y < 30 && x >= 40 && x < 44) return GREEN;
      if (y >= 30 && y < 90 && x >= 30 && x < 54) return AMBER;
      return BLACK;
    });
    mockCanvas(pixels);
    const result = analyzeComposition(document.createElement('canvas') as unknown as HTMLVideoElement);
    expect(result.bottleDetected).toBe(true);
    expect(result.isCentered).toBe(false);
    expect(result.distance).toBe('too-far');
  });

  it('TC2: wide squat shape → not-detected (aspect ratio gate)', () => {
    // bbox: x=5–55 (bboxWidth=50), y=40–60 (bboxHeight=20) → aspectRatio=2.5 > 0.75 ✗
    // bottleDetected=true: colour pixels exceeded 4% threshold; shape gate rejected,
    // not pixel absence. distance='not-detected' still triggers "Point camera at bottle".
    const pixels = makePixels((x, y) => {
      if (y >= 40 && y < 60 && x >= 5 && x < 55) return AMBER;
      return BLACK;
    });
    mockCanvas(pixels);
    const result = analyzeComposition(document.createElement('canvas') as unknown as HTMLVideoElement);
    expect(result.bottleDetected).toBe(true);
    expect(result.distance).toBe('not-detected');
  });

  it('TC3: tall rectangle with uniform density (no neck) → not-detected (neck sparsity gate)', () => {
    // bbox: x=20–40 (bboxWidth=20), y=10–90 (bboxHeight=80) → aspect OK
    // neck and body have identical density → ratio = 1.0 ≥ 0.40 ✗
    // bottleDetected=true: colour pixels present and shape gates ran; neck gate rejected.
    const pixels = makePixels((x, y) => {
      if (y >= 10 && y < 90 && x >= 20 && x < 40) return AMBER;
      return BLACK;
    });
    mockCanvas(pixels);
    const result = analyzeComposition(document.createElement('canvas') as unknown as HTMLVideoElement);
    expect(result.bottleDetected).toBe(true);
    expect(result.distance).toBe('not-detected');
  });

  it('TC4: matched region < 8 rows tall → not-detected (bbox-size gate)', () => {
    // bboxHeight = 5 rows < BBOX_MIN_HEIGHT (8) ✗
    const pixels = makePixels((x, y) => {
      if (y >= 48 && y < 53 && x >= 20 && x < 40) return AMBER;
      return BLACK;
    });
    mockCanvas(pixels);
    const result = analyzeComposition(document.createElement('canvas') as unknown as HTMLVideoElement);
    expect(result.bottleDetected).toBe(false);
    expect(result.distance).toBe('not-detected');
  });

  it('TC5: drawImage called with correct ROI source rect (30–70% x, 10–90% y)', () => {
    const pixels = new Uint8ClampedArray(W * H * 4); // all black → not-detected
    const mockCtx = mockCanvas(pixels);

    const fakeVideo = document.createElement('video');
    Object.defineProperty(fakeVideo, 'videoWidth',  { value: 800, configurable: true });
    Object.defineProperty(fakeVideo, 'videoHeight', { value: 600, configurable: true });

    analyzeComposition(fakeVideo);

    const [, srcX, srcY, srcW, srcH] = mockCtx.drawImage.mock.calls[0] as number[];
    expect(srcX).toBeCloseTo(800 * 0.30);  // 240
    expect(srcY).toBeCloseTo(600 * 0.10);  // 60
    expect(srcW).toBeCloseTo(800 * 0.40);  // 320  (CROP_X_END - CROP_X_START)
    expect(srcH).toBeCloseTo(600 * 0.80);  // 480  (CROP_Y_END - CROP_Y_START)
  });

  it('TC6: no matching pixels → bottleDetected false, distance not-detected (base regression)', () => {
    // All-black canvas — zero green or amber pixels.
    const pixels = new Uint8ClampedArray(W * H * 4); // all zeros (RGBA black)
    mockCanvas(pixels);
    const result = analyzeComposition(document.createElement('canvas') as unknown as HTMLVideoElement);
    expect(result.bottleDetected).toBe(false);
    expect(result.distance).toBe('not-detected');
  });
});
