import type { BottleGeometry } from "./bottleRegistry.ts";

export const ML_PER_TABLESPOON = 14.7868;
export const ML_PER_CUP = 220;
export const ML_PER_VOLUME_STEP = 55;

/**
 * Linear interpolation helper for calibration table lookup.
 * Points must be sorted ascending by fillHeightPct.
 */
const sortedCalibrationCache = new WeakMap<
  Array<{ fillHeightPct: number; remainingMl: number }>,
  Array<{ fillHeightPct: number; remainingMl: number }>
>();

function getSortedCalibrationPoints(
  points: Array<{ fillHeightPct: number; remainingMl: number }>
): Array<{ fillHeightPct: number; remainingMl: number }> {
  const cached = sortedCalibrationCache.get(points);
  if (cached) return cached;
  const sorted = [...points].sort((a, b) => a.fillHeightPct - b.fillHeightPct);
  sortedCalibrationCache.set(points, sorted);
  return sorted;
}

function interpolateCalibration(
  fillHeightPct: number,
  points: Array<{ fillHeightPct: number; remainingMl: number }>
): number {
  if (points.length === 0) return 0;
  if (points.length === 1) return points[0].remainingMl;
  
  // Ensure points are sorted by fillHeightPct ascending without mutating original,
  // but avoid re-sorting on hot paths (memoized by array reference).
  const sortedPoints = getSortedCalibrationPoints(points);

  if (Number.isNaN(fillHeightPct) || !Number.isFinite(fillHeightPct)) {
    return sortedPoints[0].remainingMl;
  }
  
  // Boundary checks
  if (fillHeightPct <= sortedPoints[0].fillHeightPct) return sortedPoints[0].remainingMl;
  const last = sortedPoints[sortedPoints.length - 1];
  if (fillHeightPct >= last.fillHeightPct) return last.remainingMl;

  for (let i = 1; i < sortedPoints.length; i++) {
    const lo = sortedPoints[i - 1];
    const hi = sortedPoints[i];
    if (fillHeightPct <= hi.fillHeightPct) {
      const denom = hi.fillHeightPct - lo.fillHeightPct;
      // M8: Guard against divide by zero (redundant due to boundary check + sort, but safe)
      if (denom <= 0) return lo.remainingMl;
      const t = (fillHeightPct - lo.fillHeightPct) / denom;
      return lo.remainingMl + t * (hi.remainingMl - lo.remainingMl);
    }
  }
  return last.remainingMl;
}

export function calculateRemainingMl(
  fillPercentage: number,
  totalVolumeMl: number,
  geometry: BottleGeometry
): number {
  if (fillPercentage <= 0) return 0;
  if (fillPercentage >= 100) return totalVolumeMl;

  if (geometry.shape === "calibrated") {
    if (!geometry.calibrationPoints || geometry.calibrationPoints.length < 2) {
      // Fallback to linear if table missing
      return totalVolumeMl * (fillPercentage / 100);
    }
    // fillPercentage from the AI IS the fillHeightPct used in the table — no remapping needed.
    return Math.round(interpolateCalibration(fillPercentage, geometry.calibrationPoints));
  }

  if (geometry.shape === "cylinder") {
    return totalVolumeMl * (fillPercentage / 100);
  }

  if (geometry.shape === "frustum") {
    const { heightMm, topDiameterMm, bottomDiameterMm } = geometry;
    if (!topDiameterMm || !bottomDiameterMm || !heightMm || heightMm <= 0) return 0;
    const fillHeightMm = (fillPercentage / 100) * heightMm;
    const bottomRadiusMm = bottomDiameterMm / 2;
    const topRadiusMm = topDiameterMm / 2;
    const fillRadiusMm =
      bottomRadiusMm + (topRadiusMm - bottomRadiusMm) * (fillHeightMm / heightMm);
    const volumeMm3 =
      ((Math.PI * fillHeightMm) / 3) *
      (bottomRadiusMm ** 2 + bottomRadiusMm * fillRadiusMm + fillRadiusMm ** 2);
    return Math.min(volumeMm3 / 1000, totalVolumeMl);
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
  const remainingMl = calculateRemainingMl(fillPercentage, totalVolumeMl, geometry);
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
