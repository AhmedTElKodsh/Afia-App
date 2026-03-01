import { describe, it, expect } from "vitest";
import { calculateNutrition } from "../utils/nutritionCalculator.ts";

describe("calculateNutrition", () => {
  it("returns null for unknown oil type", () => {
    expect(calculateNutrition(100, "unknown_oil")).toBeNull();
  });

  it("returns 0 calories for 0ml consumed", () => {
    const result = calculateNutrition(0, "extra_virgin_olive");
    expect(result).not.toBeNull();
    expect(result!.calories).toBe(0);
    expect(result!.totalFatG).toBe(0);
    expect(result!.saturatedFatG).toBe(0);
  });

  it("calculates correct calories for 100ml olive oil", () => {
    // 100ml × 0.92 g/ml = 92g; 92/100 × 884 kcal ≈ 813.3 kcal
    const result = calculateNutrition(100, "extra_virgin_olive");
    expect(result).not.toBeNull();
    expect(result!.calories).toBeCloseTo(813.3, 0);
  });

  it("calculates correct fat for 100ml olive oil", () => {
    // 100ml × 0.92 g/ml = 92g; 92/100 × 100g fat = 92g fat
    const result = calculateNutrition(100, "extra_virgin_olive");
    expect(result).not.toBeNull();
    expect(result!.totalFatG).toBeCloseTo(92, 0);
  });

  it("calculates saturated fat for 100ml olive oil", () => {
    // 100ml × 0.92 g/ml = 92g; 92/100 × 13.8 = 12.7g sat fat
    const result = calculateNutrition(100, "extra_virgin_olive");
    expect(result).not.toBeNull();
    expect(result!.saturatedFatG).toBeCloseTo(12.7, 0);
  });

  it("scales proportionally for different volumes", () => {
    const result50 = calculateNutrition(50, "extra_virgin_olive");
    const result100 = calculateNutrition(100, "extra_virgin_olive");
    expect(result50).not.toBeNull();
    expect(result100).not.toBeNull();
    expect(result100!.calories).toBeCloseTo(result50!.calories * 2, 0);
  });

  it("works for sunflower oil type", () => {
    const result = calculateNutrition(50, "sunflower");
    expect(result).not.toBeNull();
    expect(result!.calories).toBeGreaterThan(0);
  });
});
