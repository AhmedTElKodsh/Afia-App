import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// RGB values for Afia bottle colours (verified against HSV thresholds in analyzeComposition)
// Green label: H≈120°, S≈80%, V≈60% → RGB(30,153,30)   passes isGreen (H 80–170, S≥0.25, V≥0.18)
// Amber oil:   H≈40°,  S≈80%, V≈80% → RGB(204,153,41)  passes isAmber (H 25–65, S≥0.28, V≥0.38)
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
  let analyzeComposition!: (typeof import('../utils/cameraQualityAssessment'))['analyzeComposition'];
  // The `!` definite-assignment assertion is required — TypeScript strict mode cannot
  // infer that `beforeEach` always runs before each `it` block.

  beforeEach(async () => {
    vi.resetModules(); // resets module-level processingCanvas singleton
    ({ analyzeComposition } = await import('../utils/cameraQualityAssessment'));
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

  it('TC1: bottle-shaped region (narrow neck, wide body) → distance good', () => {
    // bbox: x=20–40 (bboxWidth=20), y=10–90 (bboxHeight=80) → aspectRatio=20/80=0.25 ≤ 0.75 ✓
    // Density measurement zones (NOT the pixel placement regions):
    //   neck zone = top 25% of bbox = rows 10–30 (neckRows=20); pixels at x=28–32 (4 wide)
    //     neckTotal = 20×4 = 80;  neckDensity = 80/(20×20) = 0.20
    //   body zone = bottom 60% of bbox = rows 42–90 (bodyRows=48); pixels at x=20–40 (20 wide)
    //     bodyTotal = 48×20 = 960; bodyDensity = 960/(48×20) = 1.0
    // 0.20 < 0.40×1.0 → neck sparsity gate passes ✓
    // spanFraction = bboxHeight/H = 80/100 = 0.80 → distance 'good' ✓
    const pixels = makePixels((x, y) => {
      if (y >= 10 && y < 30 && x >= 28 && x < 32) return GREEN; // narrow neck
      if (y >= 30 && y < 90 && x >= 20 && x < 40) return AMBER; // wide body
      return BLACK;
    });
    mockCanvas(pixels);
    const result = analyzeComposition(document.createElement('canvas') as unknown as HTMLVideoElement);
    expect(result.bottleDetected).toBe(true);
    expect(result.distance).toBe('good');
  });

  it('TC2: wide squat shape → not-detected (aspect gate)', () => {
    // bbox: x=5–55 (w=50), y=40–60 (h=20) → aspectRatio=2.5 > 0.75 ✗
    const pixels = makePixels((x, y) => {
      if (y >= 40 && y < 60 && x >= 5 && x < 55) return AMBER;
      return BLACK;
    });
    mockCanvas(pixels);
    const result = analyzeComposition(document.createElement('canvas') as unknown as HTMLVideoElement);
    expect(result.bottleDetected).toBe(false);
    expect(result.distance).toBe('not-detected');
  });

  it('TC3: tall rectangle, uniform density (no neck) → not-detected (neck gate)', () => {
    // bbox: x=20–40 (w=20), y=10–90 (h=80) → aspect OK
    // neck density = body density → ratio = 1.0 ≥ 0.40 ✗
    const pixels = makePixels((x, y) => {
      if (y >= 10 && y < 90 && x >= 20 && x < 40) return AMBER;
      return BLACK;
    });
    mockCanvas(pixels);
    const result = analyzeComposition(document.createElement('canvas') as unknown as HTMLVideoElement);
    expect(result.bottleDetected).toBe(false);
    expect(result.distance).toBe('not-detected');
  });

  it('TC4: matched region < 8 rows tall → not-detected (bbox-size gate)', () => {
    // bbox height = 5 rows < BBOX_MIN_HEIGHT (8) ✗
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

  it('TC6: no matching pixels → bottleDetected false, distance not-detected (AC6 regression)', () => {
    // All-black canvas — zero green or amber pixels. bottleDetected stays false.
    // Verifies no gate refactor accidentally breaks the base no-detection path.
    const pixels = new Uint8ClampedArray(W * H * 4); // all zeros (RGBA black)
    mockCanvas(pixels);
    const result = analyzeComposition(document.createElement('canvas') as unknown as HTMLVideoElement);
    expect(result.bottleDetected).toBe(false);
    expect(result.distance).toBe('not-detected');
  });
});
