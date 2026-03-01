# Afia App — Data Models

## Frontend Types

### AppState (State Machine)

**Location**: `src/state/appState.ts`

```typescript
type AppState =
  | "IDLE"               // Landing screen, ready to scan
  | "CAMERA_ACTIVE"      // Camera viewfinder open
  | "PHOTO_CAPTURED"     // Photo taken, preview shown
  | "API_PENDING"        // Waiting for AI analysis
  | "API_SUCCESS"        // Result received, high/medium confidence
  | "API_LOW_CONFIDENCE" // Result received, low confidence
  | "API_ERROR"          // Analysis failed
  | "UNKNOWN_BOTTLE";    // Invalid or missing SKU
```

### AnalysisResult

**Location**: `src/state/appState.ts`

```typescript
interface AnalysisResult {
  scanId: string;                          // UUID from worker
  fillPercentage: number;                  // 0-100, integer
  confidence: "high" | "medium" | "low";
  aiProvider: "gemini" | "groq";
  latencyMs: number;
  imageQualityIssues?: string[];           // "blur", "poor_lighting", "obstruction", "reflection"
}
```

### BottleContext

**Location**: `src/state/appState.ts`

```typescript
interface BottleContext {
  sku: string;
  name: string;
  oilType: string;
  totalVolumeMl: number;
}
```

### BottleEntry

**Location**: `src/data/bottleRegistry.ts`

```typescript
interface BottleGeometry {
  shape: "cylinder" | "frustum";
  heightMm: number;
  diameterMm?: number;         // cylinder only
  topDiameterMm?: number;      // frustum only
  bottomDiameterMm?: number;   // frustum only
}

interface BottleEntry {
  sku: string;
  name: string;
  oilType: string;
  totalVolumeMl: number;
  geometry: BottleGeometry;
  imageUrl: string;            // Frontend only — path to reference image
}
```

### NutritionData

**Location**: `src/data/oilNutrition.ts`

```typescript
interface NutritionData {
  oilType: string;          // Matches BottleEntry.oilType
  name: string;             // Human-readable oil name
  fdcId: number;            // USDA FoodData Central ID
  densityGPerMl: number;    // Oil density (all currently 0.92)
  per100g: {
    calories: number;       // kcal per 100g
    totalFatG: number;      // grams per 100g
    saturatedFatG: number;  // grams per 100g
  };
}
```

### NutritionResult

**Location**: `src/utils/nutritionCalculator.ts`

```typescript
interface NutritionResult {
  calories: number;        // Rounded to 1 decimal
  totalFatG: number;       // Rounded to 1 decimal
  saturatedFatG: number;   // Rounded to 1 decimal
}
```

### VolumeBreakdown

**Location**: `src/utils/volumeCalculator.ts`

```typescript
interface VolumeBreakdown {
  ml: number;              // Rounded to 2 decimals
  tablespoons: number;     // Rounded to 1 decimal
  cups: number;            // Rounded to 1 decimal
}
```

### FeedbackInput / ValidationResult

**Location**: `src/utils/feedbackValidator.ts`

```typescript
interface FeedbackInput {
  accuracyRating: "about_right" | "too_high" | "too_low" | "way_off";
  responseTimeMs: number;
  correctedFillPercentage?: number;
}

interface ValidationResult {
  validationStatus: "accepted" | "flagged";
  validationFlags: string[];       // "too_fast", "boundary_value", "contradictory", "extreme_delta"
  confidenceWeight: number;        // 0.1 - 1.0
  trainingEligible: boolean;       // true only if no flags
}
```

---

## Worker Types

### Env (Cloudflare Bindings)

**Location**: `worker/src/types.ts`

```typescript
interface Env {
  TRAINING_BUCKET?: R2Bucket;      // Optional — disabled for POC
  RATE_LIMIT_KV: KVNamespace;      // Rate limiting storage
  GEMINI_API_KEY: string;          // Primary Gemini key
  GEMINI_API_KEY2?: string;        // Optional rotation key
  GEMINI_API_KEY3?: string;        // Optional rotation key
  GROQ_API_KEY: string;            // Fallback provider key
  ALLOWED_ORIGINS: string;         // Comma-separated CORS origins
}
```

### LLMResponse

**Location**: `worker/src/types.ts`

```typescript
interface LLMResponse {
  fillPercentage: number;                  // 0-100
  confidence: "high" | "medium" | "low";
  imageQualityIssues?: string[];
  reasoning?: string;                      // Brief explanation (not sent to client)
}
```

### ScanMetadata (R2 Stored)

**Location**: `worker/src/storage/r2Client.ts`

```typescript
interface ScanMetadata {
  scanId: string;
  timestamp: string;                       // ISO 8601
  sku: string;
  bottleGeometry: BottleGeometry;
  oilType: string;
  aiProvider: "gemini" | "groq";
  fillPercentage: number;
  confidence: "high" | "medium" | "low";
  latencyMs: number;
  imageQualityIssues?: string[];
  imageStoragePath: string;                // "images/{scanId}.jpg"
  feedback?: {
    feedbackId: string;
    feedbackTimestamp: string;              // ISO 8601
    accuracyRating: "about_right" | "too_high" | "too_low" | "way_off";
    correctedFillPercentage?: number;
    validationStatus: "accepted" | "flagged";
    validationFlags?: string[];
    confidenceWeight: number;              // 0.1 - 1.0
    trainingEligible: boolean;
  };
}
```

---

## Static Data Registries

### Bottle Registry (3 entries)

| SKU | Name | Oil Type | Volume | Shape | Dimensions |
|-----|------|----------|--------|-------|------------|
| `filippo-berio-500ml` | Filippo Berio Extra Virgin Olive Oil | extra_virgin_olive | 500ml | cylinder | h=220mm, d=65mm |
| `bertolli-750ml` | Bertolli Classico Olive Oil | pure_olive | 750ml | frustum | h=280mm, top=70mm, bottom=85mm |
| `safi-sunflower-1l` | Safi Sunflower Oil | sunflower | 1000ml | cylinder | h=275mm, d=80mm |

Note: Frontend version includes `imageUrl` field; worker version omits it. Worker returns `null` for unknown SKU; frontend returns `undefined`.

### Oil Nutrition Registry (3 entries)

| Oil Type | Name | USDA FDC ID | Density | Cal/100g | Fat/100g | Sat Fat/100g |
|----------|------|-------------|---------|----------|----------|--------------|
| extra_virgin_olive | Extra Virgin Olive Oil | 748608 | 0.92 g/ml | 884 | 100g | 13.8g |
| pure_olive | Olive Oil | 748608 | 0.92 g/ml | 884 | 100g | 14.0g |
| sunflower | Sunflower Oil | 172862 | 0.92 g/ml | 884 | 100g | 10.3g |

---

## Data Flow Diagram

```
URL ?sku= ──► bottleRegistry.getBottleBySku() ──► BottleEntry
                                                       │
Camera ──► useCamera.capturePhoto() ──► compressImage() ──► base64
                                                               │
                            ┌──────────────────────────────────┘
                            ▼
              apiClient.analyzeBottle(sku, imageBase64)
                            │
                            ▼ (Worker)
              analyze.ts ──► LLM Provider ──► LLMResponse
                            │
                            ▼ (Client)
                      AnalysisResult
                            │
              ┌─────────────┼──────────────┐
              ▼             ▼              ▼
    volumeCalculator  nutritionCalculator  FillGauge
    (fillPct + geometry  (consumedMl +     (SVG render)
     → ml/tbsp/cups)      oilType → cal)
              │             │
              ▼             ▼
         VolumeBreakdown  NutritionResult
              │             │
              └──────┬──────┘
                     ▼
              ResultDisplay.tsx
                     │
                     ▼
              FeedbackPrompt ──► apiClient.submitFeedback()
                                        │
                                        ▼ (Worker)
                              feedback.ts ──► validateFeedback()
                                        │         ──► ValidationResult
                                        ▼
                              r2Client.updateScanWithFeedback()
```

---

## Local Storage

| Key | Value | Purpose |
|-----|-------|---------|
| `safi_privacy_accepted` | `"true"` | Privacy notice consent flag |

No other client-side persistence. The app is stateless per session — each scan is independent.
