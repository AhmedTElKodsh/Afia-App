import { describe, it, expect } from "vitest";
import { fillMlToPixelY } from "../utils/fillMlToPixelY.ts";

/**
 * Helper function to create a mock HTMLImageElement with specified dimensions
 */
function makeImg(
  natW: number,
  natH: number,
  renderedW: number,
  renderedH: number
) {
  return {
    naturalWidth: natW,
    naturalHeight: natH,
    getBoundingClientRect: () =>
      ({
        width: renderedW,
        height: renderedH,
        top: 0,
        left: 0,
        right: renderedW,
        bottom: renderedH,
        x: 0,
        y: 0,
        toJSON: () => {},
      }) as DOMRect,
  } as HTMLImageElement;
}

describe("fillMlToPixelY", () => {
  it("AC1 - Basic mapping, full bottle (no letterbox)", () => {
    // naturalWidth=1280, naturalHeight=720, displayed at 320x180 (scale=0.25)
    // bottleTopPct=0.1, bottleBottomPct=0.9, capacity=1500ml
    // 100% full (1500ml) → line at bottleTopPx
    const img = makeImg(1280, 720, 320, 180);
    const result = fillMlToPixelY(1500, 1500, img, 0.1, 0.9);

    // Expected: bottleTopPx = 0 + 0.1 * 180 = 18.0
    expect(result).toBe(18.0);
  });

  it("AC2 - Letterbox (portrait image in landscape container)", () => {
    // naturalWidth=720, naturalHeight=1280 (portrait)
    // container: 320x240
    // scaleX = 320/720 = 0.444, scaleY = 240/1280 = 0.1875
    // min scale = 0.1875
    // renderedH = 1280 * 0.1875 = 240
    // renderedW = 720 * 0.1875 = 135
    // offsetX = (320-135)/2 = 92.5, offsetY = 0
    // 0% fill (0ml) → line at bottleBottomPx
    const img = makeImg(720, 1280, 320, 240);
    const result = fillMlToPixelY(0, 1500, img, 0.05, 0.95);

    // Expected: bottleBottomPx = 0 + 0.95 * 240 = 228.0
    expect(result).toBe(228.0);
  });

  it("AC3 - 50% fill midpoint", () => {
    // Bottle fills full frame (bottleTopPct=0, bottleBottomPct=1)
    // No letterbox (perfect aspect match)
    // renderedH = 300
    // 50% fill (750ml / 1500ml) → midpoint
    const img = makeImg(400, 300, 400, 300);
    const result = fillMlToPixelY(750, 1500, img, 0, 1);

    // Expected: 150.0 (exact vertical midpoint)
    expect(result).toBe(150.0);
  });

  it("AC4 - Unloaded image guard (naturalWidth=0)", () => {
    // Image not yet loaded → naturalWidth=0
    const img = makeImg(0, 0, 320, 180);
    const result = fillMlToPixelY(1500, 1500, img, 0.1, 0.9);

    // Expected: 0 (guard returns 0)
    expect(result).toBe(0);
  });

  it("AC5 - Empty rect guard (width=0, height=0)", () => {
    // Element not yet painted → rect has no size
    const img = makeImg(1280, 720, 0, 0);
    const result = fillMlToPixelY(1500, 1500, img, 0.1, 0.9);

    // Expected: 0 (guard returns 0)
    expect(result).toBe(0);
  });

  it("AC6 - Clamped fill fraction (waterMl exceeds capacity)", () => {
    // waterMl=2000, capacity=1500 → fill fraction clamped to 1.0
    // Line should not go above bottleTopPx
    const img = makeImg(400, 300, 400, 300);
    const result = fillMlToPixelY(2000, 1500, img, 0.1, 0.9);

    // Expected: bottleTopPx = 0 + 0.1 * 300 = 30.0
    expect(result).toBe(30.0);
  });

  it("AC7 - Minimum fill (55ml) stays within bottle bounds", () => {
    // waterMl=55, capacity=1500 → fill fraction = 55/1500 = 0.0367
    // Result should be within [bottleTopPx, bottleBottomPx]
    const img = makeImg(400, 300, 400, 300);
    const bottleTopPct = 0.1;
    const bottleBottomPct = 0.9;
    const result = fillMlToPixelY(55, 1500, img, bottleTopPct, bottleBottomPct);

    const bottleTopPx = 0 + bottleTopPct * 300; // 30
    const bottleBottomPx = 0 + bottleBottomPct * 300; // 270

    // Result should be between top and bottom
    expect(result).toBeGreaterThanOrEqual(bottleTopPx);
    expect(result).toBeLessThanOrEqual(bottleBottomPx);

    // Verify calculation: bottleBottomPx - (55/1500) * (270-30)
    // = 270 - 0.0367 * 240 = 270 - 8.8 = 261.2
    expect(result).toBeCloseTo(261.2, 1);
  });

  it("Edge case - Negative waterMl clamped to 0", () => {
    // waterMl=-100 → should clamp to 0% fill
    const img = makeImg(400, 300, 400, 300);
    const result = fillMlToPixelY(-100, 1500, img, 0.1, 0.9);

    // Expected: bottleBottomPx = 0 + 0.9 * 300 = 270.0
    expect(result).toBe(270.0);
  });

  it("Edge case - Zero capacity (division by zero guard)", () => {
    // bottleCapacityMl=0 → should not crash
    const img = makeImg(400, 300, 400, 300);
    const result = fillMlToPixelY(100, 0, img, 0.1, 0.9);

    // fillFraction = 100/0 = Infinity → clamped to 1.0
    // Expected: bottleTopPx = 30.0
    expect(result).toBe(30.0);
  });
});
