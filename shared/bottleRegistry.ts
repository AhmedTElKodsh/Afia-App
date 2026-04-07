// Shared bottle registry — single source of truth
// Used by both client (src/) and worker (worker/src/)

export interface BottleGeometry {
  shape: "cylinder" | "frustum";
  heightMm: number;
  diameterMm?: number;
  topDiameterMm?: number;
  bottomDiameterMm?: number;
}

export interface BottleEntry {
  sku: string;
  name: string;
  oilType: string;
  totalVolumeMl: number;
  geometry: BottleGeometry;
  imageUrl?: string; // Optional: only used by client
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
      // Cylinder approximation for the 1.5L handled bottle.
      // Volume calc is linear (fill% × totalVolumeMl) so height/diameter
      // don't affect ml accuracy — adjust if actual measurements differ.
      shape: "cylinder",
      heightMm: 270,
      diameterMm: 88,
    },
    imageUrl: "/bottles/afia-corn-1.5l.png",
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
 * Retained as a named export for backwards compatibility with call sites that
 * expected a filtered list — now identical to bottleRegistry.
 */
export const activeBottleRegistry: BottleEntry[] = bottleRegistry;
