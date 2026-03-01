import type { BottleGeometry } from "../data/bottleRegistry.ts";

export const ML_PER_TABLESPOON = 14.7868;
export const ML_PER_CUP = 236.588;

export function calculateRemainingMl(
  fillPercentage: number,
  totalVolumeMl: number,
  geometry: BottleGeometry
): number {
  if (fillPercentage <= 0) return 0;
  if (fillPercentage >= 100) return totalVolumeMl;

  if (geometry.shape === "cylinder") {
    return totalVolumeMl * (fillPercentage / 100);
  }

  if (geometry.shape === "frustum") {
    const { heightMm, topDiameterMm, bottomDiameterMm } = geometry;
    if (!topDiameterMm || !bottomDiameterMm || !heightMm) return 0;

    const fillHeightMm = (fillPercentage / 100) * heightMm;
    const bottomRadiusMm = bottomDiameterMm / 2;
    const topRadiusMm = topDiameterMm / 2;

    const fillRadiusMm =
      bottomRadiusMm +
      (topRadiusMm - bottomRadiusMm) * (fillHeightMm / heightMm);

    const volumeMm3 =
      ((Math.PI * fillHeightMm) / 3) *
      (bottomRadiusMm * bottomRadiusMm +
        bottomRadiusMm * fillRadiusMm +
        fillRadiusMm * fillRadiusMm);

    return volumeMm3 / 1000;
  }

  return 0;
}

export function mlToTablespoons(ml: number): number {
  return ml / ML_PER_TABLESPOON;
}

export function mlToCups(ml: number): number {
  return ml / ML_PER_CUP;
}

export interface VolumeBreakdown {
  ml: number;
  tablespoons: number;
  cups: number;
}

export function calculateVolumes(
  fillPercentage: number,
  totalVolumeMl: number,
  geometry: BottleGeometry
): { remaining: VolumeBreakdown; consumed: VolumeBreakdown } {
  const remainingMl = calculateRemainingMl(
    fillPercentage,
    totalVolumeMl,
    geometry
  );
  const consumedMl = totalVolumeMl - remainingMl;

  return {
    remaining: {
      ml: Math.round(remainingMl * 100) / 100,
      tablespoons: Math.round(mlToTablespoons(remainingMl) * 10) / 10,
      cups: Math.round(mlToCups(remainingMl) * 10) / 10,
    },
    consumed: {
      ml: Math.round(consumedMl * 100) / 100,
      tablespoons: Math.round(mlToTablespoons(consumedMl) * 10) / 10,
      cups: Math.round(mlToCups(consumedMl) * 10) / 10,
    },
  };
}
