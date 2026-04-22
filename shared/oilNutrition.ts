export interface NutritionData {
  oilType: string;
  name: string;
  fdcId: number;
  densityGPerMl: number;
  per100g: {
    calories: number;
    totalFatG: number;
    saturatedFatG: number;
  };
}

/**
 * Standard USDA-based nutrition data for oils used by Afia.
 * Values per 100g.
 */
export const oilNutrition: NutritionData[] = [
  {
    oilType: "extra_virgin_olive",
    name: "Extra Virgin Olive Oil",
    fdcId: 748608,
    densityGPerMl: 0.92,
    per100g: {
      calories: 884,
      totalFatG: 100,
      saturatedFatG: 13.8,
    },
  },
  {
    oilType: "pure_olive",
    name: "Olive Oil",
    fdcId: 748608,
    densityGPerMl: 0.92,
    per100g: {
      calories: 884,
      totalFatG: 100,
      saturatedFatG: 14.0,
    },
  },
  {
    oilType: "sunflower",
    name: "Sunflower Oil",
    fdcId: 172862,
    densityGPerMl: 0.92,
    per100g: {
      calories: 884,
      totalFatG: 100,
      saturatedFatG: 10.3,
    },
  },
  {
    oilType: "corn",
    name: "Corn Oil",
    fdcId: 171017,
    densityGPerMl: 0.92,
    per100g: {
      calories: 884,
      totalFatG: 100,
      saturatedFatG: 12.9,
    },
  },
];

export function getNutritionByOilType(
  oilType: string
): NutritionData | undefined {
  return oilNutrition.find((n) => n.oilType === oilType);
}
