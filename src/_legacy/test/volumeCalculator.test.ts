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
