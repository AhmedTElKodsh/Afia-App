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
