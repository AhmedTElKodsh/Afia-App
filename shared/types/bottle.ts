export interface CalibrationPoint {
  /** Oil surface height as % of total bottle height (0 = base, 100 = cap top) */
  fillHeightPct: number;
  /** Remaining oil volume in ml at this fill height */
  remainingMl: number;
}

export interface BottleGeometry {
  shape: "cylinder" | "frustum" | "calibrated";
  /** Physical height in mm. Used by cylinder/frustum volume maths. Unused for "calibrated" shape. */
  heightMm?: number;
  diameterMm?: number;
  topDiameterMm?: number;
  bottomDiameterMm?: number;
  /** Required when shape === "calibrated". Must be sorted ascending by fillHeightPct. */
  calibrationPoints?: CalibrationPoint[];
}

export interface BottleEntry {
  sku: string;
  name: string;
  oilType: string;
  totalVolumeMl: number;
  geometry: BottleGeometry;
  imageUrl?: string; // Optional: only used by client
  /**
   * Optional bottle-specific visual anchor hints for the LLM prompt.
   * If present, appended to the shared system prompt so the model can
   * calibrate its fill estimate against known landmarks on this bottle.
   * Use plain text, one anchor per line starting with "*".
   */
  promptAnchors?: string;
  /**
   * Fraction of image height (0–1) where the bottle top/bottom edges appear
   * when the user follows the viewfinder framing guidance. Used by
   * FillConfirmScreen to map ml volumes to pixel Y coordinates.
   * Defaults: 0.05 (top), 0.95 (bottom).
   */
  frameTopPct?: number;
  frameBottomPct?: number;
}
