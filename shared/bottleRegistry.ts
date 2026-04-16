// Shared bottle registry — single source of truth
// Used by both client (src/) and worker (worker/src/)

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
}

/**
 * AFIA BRAND BOTTLE REGISTRY
 *
 * Single-SKU hard restriction: only the 1.5L Afia Corn Oil bottle is
 * supported end-to-end. Multi-bottle support (Epic 7) was removed — the
 * app is now deliberately locked to one SKU to match the physical bottle
 * the POC is being piloted against.
 */
export const bottleRegistry: BottleEntry[] = [
  {
    sku: "afia-corn-1.5l",
    name: "Afia Pure Corn Oil 1.5L",
    oilType: "corn",
    totalVolumeMl: 1500,
    geometry: {
      shape: "calibrated",
      heightMm: 270,
      calibrationPoints: [
        { fillHeightPct: 0,  remainingMl: 0    },
        { fillHeightPct: 3,  remainingMl: 55   },
        { fillHeightPct: 6,  remainingMl: 110  },
        { fillHeightPct: 9,  remainingMl: 165  },
        { fillHeightPct: 12, remainingMl: 220  },
        { fillHeightPct: 15, remainingMl: 275  },
        { fillHeightPct: 19, remainingMl: 330  },
        { fillHeightPct: 24, remainingMl: 440  },
        { fillHeightPct: 27, remainingMl: 495  },
        { fillHeightPct: 31, remainingMl: 550  },
        { fillHeightPct: 34, remainingMl: 605  },
        { fillHeightPct: 38, remainingMl: 660  },
        { fillHeightPct: 41, remainingMl: 715  },
        { fillHeightPct: 44, remainingMl: 770  },
        { fillHeightPct: 47, remainingMl: 825  },
        { fillHeightPct: 50, remainingMl: 880  },
        { fillHeightPct: 53, remainingMl: 935  },
        { fillHeightPct: 57, remainingMl: 990  },
        { fillHeightPct: 60, remainingMl: 1045 },
        { fillHeightPct: 63, remainingMl: 1100 },
        { fillHeightPct: 66, remainingMl: 1155 },
        { fillHeightPct: 69, remainingMl: 1210 },
        { fillHeightPct: 72, remainingMl: 1265 },
        { fillHeightPct: 78, remainingMl: 1320 },
        { fillHeightPct: 83, remainingMl: 1375 },
        { fillHeightPct: 88, remainingMl: 1430 },
        { fillHeightPct: 93, remainingMl: 1485 },
        { fillHeightPct: 97, remainingMl: 1500 },
      ],
    },
    imageUrl: "/bottles/afia-corn-1.5l.png",
    promptAnchors: `* Oil only covers the base (tiny pool, below label): fillPercentage 0–12
* Oil at bottom of the green diagonal band on label: fillPercentage ~19
* Oil at center of label (Afia heart logo): fillPercentage ~38
* Oil at top of label / top of green diagonal: fillPercentage ~63
* Oil at bottom of handle arch: fillPercentage ~72
* Oil at shoulder/neck junction (where body narrows): fillPercentage ~78–83
* Oil visible in neck (clear region at top, oil in narrow cylinder): fillPercentage ~83–93
* Neck nearly or completely full (tiny or no air gap below cap): fillPercentage 93–97`,
  },
  {
    sku: "afia-corn-2.5l",
    name: "Afia Pure Corn Oil 2.5L",
    oilType: "corn",
    totalVolumeMl: 2500,
    geometry: {
      shape: "calibrated",
      heightMm: 270, // Placeholder
      calibrationPoints: [
        { fillHeightPct: 0,  remainingMl: 0    },
        { fillHeightPct: 97, remainingMl: 2500 },
      ],
    },
    imageUrl: "/bottles/afia-corn-1.5l.png", // Placeholder
    promptAnchors: `* Mock entry for 2.5L - full guidance coming soon.`,
  },
];

export function getBottleBySku(sku: string): BottleEntry | undefined {
  return bottleRegistry.find((b) => b.sku === sku);
}

/**
 * The SKU currently active for user scanning.
 * Only this bottle is available in the user-facing flow.
 */
export const ACTIVE_SKU = "afia-corn-1.5l";

/**
 * Subset of bottleRegistry containing only bottles available for user scanning.
 * Includes 1.5L (full guidance) and 2.5L (mock/manual).
 */
export const activeBottleRegistry: BottleEntry[] = bottleRegistry.filter(
  (b) => b.sku === "afia-corn-1.5l"
);
