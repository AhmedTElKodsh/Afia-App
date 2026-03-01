# Data Schemas — Safi Oil Tracker

**Version:** POC v1

---

## Bottle Registry Schema

**File:** `src/data/bottleRegistry.ts`

```typescript
interface BottleGeometry {
  shape: "cylinder" | "frustum";
  heightMm: number;
  // For cylinder:
  diameterMm?: number;
  // For frustum (tapered bottle):
  topDiameterMm?: number;
  bottomDiameterMm?: number;
}

interface BottleEntry {
  sku: string; // Unique bottle identifier
  name: string; // Display name (e.g., "Filippo Berio Extra Virgin 500ml")
  oilType: string; // Oil type (e.g., "extra_virgin_olive")
  totalVolumeMl: number; // Total bottle capacity in milliliters
  geometry: BottleGeometry; // Physical dimensions for volume calculation
}

// Example:
export const bottleRegistry: BottleEntry[] = [
  {
    sku: "filippo-berio-500ml",
    name: "Filippo Berio Extra Virgin Olive Oil 500ml",
    oilType: "extra_virgin_olive",
    totalVolumeMl: 500,
    geometry: {
      shape: "cylinder",
      heightMm: 220,
      diameterMm: 65,
    },
  },
  {
    sku: "bertolli-750ml",
    name: "Bertolli Classico Olive Oil 750ml",
    oilType: "pure_olive",
    totalVolumeMl: 750,
    geometry: {
      shape: "frustum",
      heightMm: 280,
      topDiameterMm: 70,
      bottomDiameterMm: 85,
    },
  },
];
```

---

## Oil Nutrition Schema

**File:** `src/data/oilNutrition.ts`

```typescript
interface NutritionData {
  oilType: string; // Must match bottleRegistry.oilType
  per100g: {
    calories: number; // kcal per 100g
    totalFatG: number; // Total fat in grams
    saturatedFatG: number; // Saturated fat in grams
  };
  densityGPerMl: number; // Oil density (typically 0.92 for most oils)
}

// Example (USDA data):
export const oilNutrition: NutritionData[] = [
  {
    oilType: "extra_virgin_olive",
    per100g: {
      calories: 884,
      totalFatG: 100,
      saturatedFatG: 13.8,
    },
    densityGPerMl: 0.92,
  },
  {
    oilType: "pure_olive",
    per100g: {
      calories: 884,
      totalFatG: 100,
      saturatedFatG: 14.0,
    },
    densityGPerMl: 0.92,
  },
];
```

---

## Scan Metadata Schema

**File:** `metadata/{scanId}.json` in R2

```typescript
interface ScanMetadata {
  // Scan identification
  scanId: string; // UUID
  timestamp: string; // ISO 8601 timestamp

  // Bottle context
  sku: string; // From bottle registry
  bottleGeometry: BottleGeometry; // Snapshot of geometry at scan time
  oilType: string; // From bottle registry

  // AI analysis
  aiProvider: "gemini" | "groq";
  fillPercentage: number; // AI estimate (0-100)
  confidence: "high" | "medium" | "low";
  latencyMs: number; // Total processing time
  imageQualityIssues?: string[]; // Optional: ["blur", "poor_lighting"]

  // Storage
  imageStoragePath: string; // R2 path: "images/{scanId}.jpg"

  // User feedback (added after feedback submission)
  feedback?: {
    feedbackId: string; // UUID
    feedbackTimestamp: string; // ISO 8601
    accuracyRating: "about_right" | "too_high" | "too_low" | "way_off";
    correctedFillPercentage?: number; // Optional user correction

    // Validation
    validationStatus: "accepted" | "flagged";
    validationFlags?: string[]; // ["too_fast", "boundary_value", etc.]
    trainingEligible: boolean; // true if validationStatus === 'accepted'
  };
}
```

**Example:**

```json
{
  "scanId": "550e8400-e29b-41d4-a716-446655440000",
  "timestamp": "2026-02-27T14:32:18.123Z",
  "sku": "filippo-berio-500ml",
  "bottleGeometry": {
    "shape": "cylinder",
    "heightMm": 220,
    "diameterMm": 65
  },
  "oilType": "extra_virgin_olive",
  "aiProvider": "gemini",
  "fillPercentage": 68,
  "confidence": "high",
  "latencyMs": 6234,
  "imageStoragePath": "images/550e8400-e29b-41d4-a716-446655440000.jpg",
  "feedback": {
    "feedbackId": "660e8400-e29b-41d4-a716-446655440001",
    "feedbackTimestamp": "2026-02-27T14:32:45.789Z",
    "accuracyRating": "too_low",
    "correctedFillPercentage": 75,
    "validationStatus": "accepted",
    "trainingEligible": true
  }
}
```

---

## Volume Calculation Formulas

**Cylinder:**

```typescript
function calculateCylinderVolume(
  fillPercentage: number,
  heightMm: number,
  diameterMm: number,
): number {
  const radiusMm = diameterMm / 2;
  const fillHeightMm = (fillPercentage / 100) * heightMm;
  const volumeMm3 = Math.PI * radiusMm * radiusMm * fillHeightMm;
  return volumeMm3 / 1000; // Convert mm³ to ml
}
```

**Frustum (Tapered Bottle):**

```typescript
function calculateFrustumVolume(
  fillPercentage: number,
  heightMm: number,
  topDiameterMm: number,
  bottomDiameterMm: number,
): number {
  const fillHeightMm = (fillPercentage / 100) * heightMm;
  const topRadiusMm = topDiameterMm / 2;
  const bottomRadiusMm = bottomDiameterMm / 2;

  // Linear interpolation for radius at fill height
  const fillRadiusMm =
    bottomRadiusMm + (topRadiusMm - bottomRadiusMm) * (fillHeightMm / heightMm);

  // Frustum volume formula: V = (π * h / 3) * (r1² + r1*r2 + r2²)
  const volumeMm3 =
    ((Math.PI * fillHeightMm) / 3) *
    (bottomRadiusMm * bottomRadiusMm +
      bottomRadiusMm * fillRadiusMm +
      fillRadiusMm * fillRadiusMm);

  return volumeMm3 / 1000; // Convert mm³ to ml
}
```

---

## Unit Conversion Constants

```typescript
export const UNIT_CONVERSIONS = {
  ML_PER_TABLESPOON: 14.7868,
  ML_PER_CUP: 236.588,
  OIL_DENSITY_G_PER_ML: 0.92, // Standard for most cooking oils
};
```

---

## Feedback Validation Rules

```typescript
interface ValidationRule {
  flag: string;
  condition: (scan: ScanMetadata, feedback: FeedbackData) => boolean;
}

const validationRules: ValidationRule[] = [
  {
    flag: "too_fast",
    condition: (scan, feedback) => {
      const scanTime = new Date(scan.timestamp).getTime();
      const feedbackTime = new Date(feedback.feedbackTimestamp).getTime();
      return feedbackTime - scanTime < 3000; // < 3 seconds
    },
  },
  {
    flag: "boundary_value",
    condition: (scan, feedback) => {
      const corrected = feedback.correctedFillPercentage;
      return (
        corrected !== undefined && [0, 25, 50, 75, 100].includes(corrected)
      );
    },
  },
  {
    flag: "contradictory",
    condition: (scan, feedback) => {
      if (
        feedback.accuracyRating === "about_right" &&
        feedback.correctedFillPercentage !== undefined
      ) {
        const delta = Math.abs(
          feedback.correctedFillPercentage - scan.fillPercentage,
        );
        return delta > 10; // "About right" but >10% different
      }
      return false;
    },
  },
  {
    flag: "extreme_delta",
    condition: (scan, feedback) => {
      if (feedback.correctedFillPercentage !== undefined) {
        const delta = Math.abs(
          feedback.correctedFillPercentage - scan.fillPercentage,
        );
        return delta > 30; // >30% different from AI
      }
      return false;
    },
  },
];
```
