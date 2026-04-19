import { getNutritionByOilType } from "../data/oilNutrition.ts";

export interface NutritionResult {
  calories: number;
  totalFatG: number;
  saturatedFatG: number;
}

export function calculateNutrition(
  consumedMl: number,
  oilType: string
): NutritionResult | null {
  const nutrition = getNutritionByOilType(oilType);
  if (!nutrition) return null;

  if (consumedMl < 0) {
    return { calories: 0, totalFatG: 0, saturatedFatG: 0 };
  }

  const consumedGrams = consumedMl * nutrition.densityGPerMl;
  const scale = consumedGrams / 100;

  return {
    calories: Math.round(nutrition.per100g.calories * scale * 100) / 100,
    totalFatG: Math.round(nutrition.per100g.totalFatG * scale * 100) / 100,
    saturatedFatG:
      Math.round(nutrition.per100g.saturatedFatG * scale * 100) / 100,
  };
}
