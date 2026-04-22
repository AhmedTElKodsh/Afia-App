import { getNutritionByOilType } from "./oilNutrition.ts";

/**
 * Nutrition Result
 */
export interface NutritionResult {
  calories: number;
  totalFatG: number;
  saturatedFatG: number;
}

/**
 * Calculate nutrition facts based on consumed volume and oil type.
 * Uses density-corrected scaling.
 * 
 * @param consumedMl - Consumed volume in milliliters
 * @param oilType - The type of oil (corn, sunflower, etc.)
 * @returns Nutrition facts or null if oil type unknown
 */
export function calculateNutrition(
  consumedMl: number,
  oilType: string
): NutritionResult | null {
  const nutrition = getNutritionByOilType(oilType);
  if (!nutrition) return null;

  if (consumedMl <= 0) {
    return { calories: 0, totalFatG: 0, saturatedFatG: 0 };
  }

  // M1 FIX: Density-aware volume-to-mass conversion
  const consumedGrams = consumedMl * nutrition.densityGPerMl;
  const scale = consumedGrams / 100;

  return {
    calories: Math.round(nutrition.per100g.calories * scale * 10) / 10,
    totalFatG: Math.round(nutrition.per100g.totalFatG * scale * 10) / 10,
    saturatedFatG: Math.round(nutrition.per100g.saturatedFatG * scale * 10) / 10,
  };
}
