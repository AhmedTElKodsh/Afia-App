export interface NutritionResult {
  calories: number;
  totalFatG: number;
  saturatedFatG: number;
}

interface OilProfile {
  densityGPerMl: number;
  caloriesPer100g: number;
  totalFatPct: number;
  saturatedFatPct: number;
}

const OIL_PROFILES: Record<string, OilProfile> = {
  extra_virgin_olive: {
    densityGPerMl: 0.92,
    caloriesPer100g: 884,
    totalFatPct: 100,
    saturatedFatPct: 13.8,
  },
  olive: {
    densityGPerMl: 0.92,
    caloriesPer100g: 884,
    totalFatPct: 100,
    saturatedFatPct: 13.8,
  },
  sunflower: {
    densityGPerMl: 0.92,
    caloriesPer100g: 884,
    totalFatPct: 100,
    saturatedFatPct: 10.3,
  },
  corn: {
    densityGPerMl: 0.92,
    caloriesPer100g: 884,
    totalFatPct: 100,
    saturatedFatPct: 12.9,
  },
  vegetable: {
    densityGPerMl: 0.92,
    caloriesPer100g: 884,
    totalFatPct: 100,
    saturatedFatPct: 14.0,
  },
};

export function calculateNutrition(volumeMl: number, oilType: string): NutritionResult | null {
  const profile = OIL_PROFILES[oilType];
  if (!profile) return null;

  if (volumeMl === 0) {
    return { calories: 0, totalFatG: 0, saturatedFatG: 0 };
  }

  const massG = volumeMl * profile.densityGPerMl;
  const calories = (massG / 100) * profile.caloriesPer100g;
  const totalFatG = (massG / 100) * profile.totalFatPct;
  const saturatedFatG = (massG / 100) * profile.saturatedFatPct;

  return { calories, totalFatG, saturatedFatG };
}
