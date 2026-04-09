import { describe, it, expect } from "vitest";
import {
  calculateRemainingMl,
  calculateVolumes,
  mlToTablespoons,
  mlToCups,
  ML_PER_TABLESPOON,
  ML_PER_CUP,
} from "../utils/volumeCalculator.ts";
import type { BottleGeometry } from "../data/bottleRegistry.ts";
import { bottleRegistry } from "../data/bottleRegistry.ts";

const cylinder: BottleGeometry = {
  shape: "cylinder",
  heightMm: 220,
  diameterMm: 65,
};

const frustum: BottleGeometry = {
  shape: "frustum",
  heightMm: 280,
  topDiameterMm: 70,
  bottomDiameterMm: 85,
};

describe("calculateRemainingMl", () => {
  describe("cylinder", () => {
    it("returns totalVolumeMl at 100%", () => {
      expect(calculateRemainingMl(100, 500, cylinder)).toBe(500);
    });

    it("returns 0 at 0%", () => {
      expect(calculateRemainingMl(0, 500, cylinder)).toBe(0);
    });

    it("returns half at 50%", () => {
      expect(calculateRemainingMl(50, 500, cylinder)).toBeCloseTo(250, 1);
    });

    it("handles 68% correctly", () => {
      expect(calculateRemainingMl(68, 500, cylinder)).toBeCloseTo(340, 1);
    });
  });

  describe("frustum", () => {
    it("returns 0 at 0%", () => {
      expect(calculateRemainingMl(0, 750, frustum)).toBe(0);
    });

    it("returns totalVolumeMl at 100%", () => {
      expect(calculateRemainingMl(100, 750, frustum)).toBe(750);
    });

    it("returns a positive value at 50%", () => {
      const result = calculateRemainingMl(50, 750, frustum);
      expect(result).toBeGreaterThan(0);
      expect(result).toBeLessThan(750);
    });
  });
});

describe("calculateRemainingMl — calibrated (afia-corn-1.5l)", () => {
  const bottle = bottleRegistry.find(b => b.sku === "afia-corn-1.5l")!;
  const geometry = bottle.geometry;
  const totalVolumeMl = bottle.totalVolumeMl; // 1500

  it("returns 0 at fillPercentage <= 0", () => {
    expect(calculateRemainingMl(0, totalVolumeMl, geometry)).toBe(0);
    expect(calculateRemainingMl(-5, totalVolumeMl, geometry)).toBe(0);
  });

  it("returns totalVolumeMl at fillPercentage >= 100", () => {
    expect(calculateRemainingMl(100, totalVolumeMl, geometry)).toBe(totalVolumeMl);
    expect(calculateRemainingMl(110, totalVolumeMl, geometry)).toBe(totalVolumeMl);
  });

  it("AC-2: returns exact remainingMl for all 28 calibration points", () => {
    if (geometry.shape !== "calibrated" || !geometry.calibrationPoints) return;
    for (const point of geometry.calibrationPoints) {
      const result = calculateRemainingMl(point.fillHeightPct, totalVolumeMl, geometry);
      expect(result).toBe(point.remainingMl);
    }
  });

  it("AC-1: fillHeightPct=85 returns ~1397 ml (within ±15 ml)", () => {
    // Derived: t = (85-83)/(88-83) = 0.4; 1375 + 0.4*55 = 1397
    const result = calculateRemainingMl(85, totalVolumeMl, geometry);
    expect(result).toBeGreaterThanOrEqual(1382);
    expect(result).toBeLessThanOrEqual(1412);
  });

  it("AC-1: fillHeightPct=79 returns ~1331 ml (within ±15 ml)", () => {
    // Derived: t = (79-78)/(83-78) = 0.2; 1320 + 0.2*55 = 1331
    const result = calculateRemainingMl(79, totalVolumeMl, geometry);
    expect(result).toBeGreaterThanOrEqual(1316);
    expect(result).toBeLessThanOrEqual(1346);
  });

  it("AC-3: interpolated values are strictly between adjacent calibration points", () => {
    if (geometry.shape !== "calibrated" || !geometry.calibrationPoints) return;
    const points = geometry.calibrationPoints;
    for (let i = 0; i < points.length - 1; i++) {
      const lo = points[i];
      const hi = points[i + 1];
      const mid = (lo.fillHeightPct + hi.fillHeightPct) / 2;
      const result = calculateRemainingMl(mid, totalVolumeMl, geometry);
      expect(result).toBeGreaterThan(lo.remainingMl);
      expect(result).toBeLessThan(hi.remainingMl);
    }
  });

  it("clamps to first calibration point for fill below table minimum", () => {
    const result = calculateRemainingMl(1, totalVolumeMl, geometry);
    // 1% is between 0 (0ml) and 3 (55ml) — should be between them
    expect(result).toBeGreaterThanOrEqual(0);
    expect(result).toBeLessThanOrEqual(55);
  });

  it("clamps to last calibration point for fill above table maximum (but below 100)", () => {
    // 98% is above the last point (97 → 1500), but below 100%
    // interpolateCalibration clamps to last point: 1500
    const result = calculateRemainingMl(98, totalVolumeMl, geometry);
    expect(result).toBe(totalVolumeMl);
  });
});

describe("mlToTablespoons", () => {
  it("converts 0 ml to 0 tbsp", () => {
    expect(mlToTablespoons(0)).toBe(0);
  });

  it("converts 1 tablespoon correctly", () => {
    expect(mlToTablespoons(ML_PER_TABLESPOON)).toBeCloseTo(1, 5);
  });

  it("converts 500 ml correctly", () => {
    expect(mlToTablespoons(500)).toBeCloseTo(500 / ML_PER_TABLESPOON, 2);
  });
});

describe("mlToCups", () => {
  it("converts 0 ml to 0 cups", () => {
    expect(mlToCups(0)).toBe(0);
  });

  it("converts 1 cup correctly", () => {
    expect(mlToCups(ML_PER_CUP)).toBeCloseTo(1, 5);
  });
});

describe("calculateVolumes", () => {
  it("remaining + consumed = total volume", () => {
    const { remaining, consumed } = calculateVolumes(42, 500, cylinder);
    expect(remaining.ml + consumed.ml).toBeCloseTo(500, 1);
  });

  it("at 100% fill all volume is remaining and 0 is consumed", () => {
    const { remaining, consumed } = calculateVolumes(100, 500, cylinder);
    expect(remaining.ml).toBe(500);
    expect(consumed.ml).toBe(0);
  });

  it("at 0% fill all volume is consumed and 0 is remaining", () => {
    const { remaining, consumed } = calculateVolumes(0, 500, cylinder);
    expect(remaining.ml).toBe(0);
    expect(consumed.ml).toBe(500);
  });

  it("tablespoons and cups are derived from ml", () => {
    const { remaining } = calculateVolumes(50, 500, cylinder);
    expect(remaining.tablespoons).toBeCloseTo(250 / ML_PER_TABLESPOON, 0);
    expect(remaining.cups).toBeCloseTo(250 / ML_PER_CUP, 0);
  });
});
