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

export const bottleRegistry: BottleEntry[] = [
  {
    sku: "filippo-berio-500ml",
    name: "Filippo Berio Extra Virgin Olive Oil",
    oilType: "extra_virgin_olive",
    totalVolumeMl: 500,
    geometry: {
      shape: "cylinder",
      heightMm: 220,
      diameterMm: 65,
    },
    imageUrl: "/bottles/filippo-berio-500ml.png",
  },
  {
    sku: "bertolli-750ml",
    name: "Bertolli Classico Olive Oil",
    oilType: "pure_olive",
    totalVolumeMl: 750,
    geometry: {
      shape: "frustum",
      heightMm: 280,
      topDiameterMm: 70,
      bottomDiameterMm: 85,
    },
    imageUrl: "/bottles/bertolli-750ml.png",
  },
  {
    sku: "safi-sunflower-1l",
    name: "Safi Sunflower Oil",
    oilType: "sunflower",
    totalVolumeMl: 1000,
    geometry: {
      shape: "cylinder",
      heightMm: 275,
      diameterMm: 80,
    },
    imageUrl: "/bottles/safi-sunflower-1l.png",
  },
];

export function getBottleBySku(sku: string): BottleEntry | undefined {
  return bottleRegistry.find((b) => b.sku === sku);
}
