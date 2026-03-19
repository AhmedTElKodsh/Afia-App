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
 * All bottles are Afia brand with different sizes and shapes
 * Geometries are approximate - adjust based on actual bottle measurements
 */
export const bottleRegistry: BottleEntry[] = [
  {
    sku: "afia-sunflower-250ml",
    name: "Afia Pure Sunflower Oil 250ml",
    oilType: "sunflower",
    totalVolumeMl: 250,
    geometry: {
      shape: "cylinder",
      heightMm: 165,
      diameterMm: 55,
    },
    imageUrl: "/bottles/afia-sunflower-250ml.png",
  },
  {
    sku: "afia-sunflower-500ml",
    name: "Afia Pure Sunflower Oil 500ml",
    oilType: "sunflower",
    totalVolumeMl: 500,
    geometry: {
      shape: "cylinder",
      heightMm: 210,
      diameterMm: 65,
    },
    imageUrl: "/bottles/afia-sunflower-500ml.png",
  },
  {
    sku: "afia-sunflower-700ml",
    name: "Afia Pure Sunflower Oil 700ml",
    oilType: "sunflower",
    totalVolumeMl: 700,
    geometry: {
      shape: "cylinder",
      heightMm: 245,
      diameterMm: 70,
    },
    imageUrl: "/bottles/afia-sunflower-700ml.png",
  },
  {
    sku: "afia-sunflower-1l",
    name: "Afia Pure Sunflower Oil 1L",
    oilType: "sunflower",
    totalVolumeMl: 1000,
    geometry: {
      shape: "cylinder",
      heightMm: 275,
      diameterMm: 80,
    },
    imageUrl: "/bottles/afia-sunflower-1l.png",
  },
  {
    sku: "afia-sunflower-2.25l",
    name: "Afia Pure Sunflower Oil 2.25L",
    oilType: "sunflower",
    totalVolumeMl: 2250,
    geometry: {
      shape: "frustum",
      heightMm: 340,
      topDiameterMm: 95,
      bottomDiameterMm: 120,
    },
    imageUrl: "/bottles/afia-sunflower-2.25l.png",
  },
  {
    sku: "afia-sunflower-3l",
    name: "Afia Pure Sunflower Oil 3L",
    oilType: "sunflower",
    totalVolumeMl: 3000,
    geometry: {
      shape: "frustum",
      heightMm: 380,
      topDiameterMm: 105,
      bottomDiameterMm: 135,
    },
    imageUrl: "/bottles/afia-sunflower-3l.png",
  },
  {
    sku: "afia-sunflower-3.5l",
    name: "Afia Pure Sunflower Oil 3.5L",
    oilType: "sunflower",
    totalVolumeMl: 3500,
    geometry: {
      shape: "frustum",
      heightMm: 410,
      topDiameterMm: 110,
      bottomDiameterMm: 140,
    },
    imageUrl: "/bottles/afia-sunflower-3.5l.png",
  },
];

export function getBottleBySku(sku: string): BottleEntry | undefined {
  return bottleRegistry.find((b) => b.sku === sku);
}
