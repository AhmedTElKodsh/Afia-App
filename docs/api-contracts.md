# Afia App — API Contracts

## Base URL

| Environment | URL |
|-------------|-----|
| Local dev | `http://localhost:8787` |
| Production | `https://afia-worker.<subdomain>.workers.dev` |

Configured via `VITE_PROXY_URL` environment variable on the frontend.

---

## POST /analyze

Analyze a bottle image and estimate fill level using AI vision.

### Request

```json
{
  "sku": "filippo-berio-500ml",
  "imageBase64": "<base64-encoded JPEG, max 4MB>"
}
```

| Field | Type | Required | Constraints |
|-------|------|----------|-------------|
| `sku` | string | Yes | Must match a registered bottle SKU |
| `imageBase64` | string | Yes | Base64 JPEG, max 4,194,304 characters |

### Response — 200 OK

```json
{
  "scanId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "fillPercentage": 65,
  "confidence": "high",
  "aiProvider": "gemini",
  "latencyMs": 4200,
  "imageQualityIssues": ["poor_lighting"]
}
```

| Field | Type | Description |
|-------|------|-------------|
| `scanId` | string (UUID) | Unique scan identifier for feedback correlation |
| `fillPercentage` | number (0-100) | AI-estimated fill level, rounded to integer |
| `confidence` | `"high"` \| `"medium"` \| `"low"` | AI confidence in estimate |
| `aiProvider` | `"gemini"` \| `"groq"` | Which LLM produced the result |
| `latencyMs` | number | Total processing time in milliseconds |
| `imageQualityIssues` | string[] (optional) | Present only if issues detected: `"blur"`, `"poor_lighting"`, `"obstruction"`, `"reflection"` |

### Error Responses

| Status | Code | Condition |
|--------|------|-----------|
| 400 | `INVALID_REQUEST` | Missing or invalid `sku` or `imageBase64` |
| 400 | `IMAGE_TOO_LARGE` | `imageBase64` exceeds 4MB |
| 400 | `UNKNOWN_SKU` | SKU not in bottle registry |
| 429 | `RATE_LIMIT_EXCEEDED` | More than 10 requests/min from same IP |
| 503 | `SERVICE_UNAVAILABLE` | Both Gemini and Groq failed |

Error body format:
```json
{
  "error": "Human-readable message",
  "code": "ERROR_CODE",
  "details": {}
}
```

Rate limit error includes:
```json
{
  "error": "Rate limit exceeded",
  "code": "RATE_LIMIT_EXCEEDED",
  "details": { "retryAfter": 45 }
}
```

---

## POST /feedback

Submit user feedback on an analysis result.

### Request

```json
{
  "scanId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "accuracyRating": "too_high",
  "llmFillPercentage": 65,
  "responseTimeMs": 8500,
  "correctedFillPercentage": 45
}
```

| Field | Type | Required | Constraints |
|-------|------|----------|-------------|
| `scanId` | string | Yes | UUID from /analyze response |
| `accuracyRating` | string | Yes | `"about_right"` \| `"too_high"` \| `"too_low"` \| `"way_off"` |
| `llmFillPercentage` | number | Yes | The AI's original estimate |
| `responseTimeMs` | number | Yes | Time between result display and feedback submission (≥0) |
| `correctedFillPercentage` | number | No | User's corrected estimate (1-99), sent when rating ≠ "about_right" |

### Response — 200 OK

```json
{
  "feedbackId": "f1a2b3c4-d5e6-7890-abcd-ef1234567890",
  "validationStatus": "accepted"
}
```

| Field | Type | Description |
|-------|------|-------------|
| `feedbackId` | string (UUID) | Unique feedback identifier |
| `validationStatus` | `"accepted"` \| `"flagged"` | Whether feedback passed validation |
| `validationFlags` | string[] (optional) | Present only if flagged: `"too_fast"`, `"boundary_value"`, `"contradictory"`, `"extreme_delta"` |

### Error Responses

| Status | Code | Condition |
|--------|------|-----------|
| 400 | `INVALID_REQUEST` | Missing/invalid scanId, accuracyRating, responseTimeMs, or llmFillPercentage |
| 429 | `RATE_LIMIT_EXCEEDED` | Rate limit exceeded |

---

## GET /health

Health check endpoint.

### Response — 200 OK

```json
{
  "status": "ok"
}
```

---

## Common Headers

### Rate Limit Headers (all endpoints)

| Header | Description |
|--------|-------------|
| `X-RateLimit-Limit` | Maximum requests per window (10) |
| `X-RateLimit-Remaining` | Remaining requests in current window |
| `X-RateLimit-Reset` | Unix timestamp when window resets |

### CORS

- **Allowed origins**: Configured via `ALLOWED_ORIGINS` env var
- **Default (dev)**: `http://localhost:5173`, `http://localhost:4173`
- **Production**: `https://afia-oil-tracker.pages.dev`
- **Allowed methods**: `POST`, `OPTIONS`
- **Allowed headers**: `Content-Type`
- **Preflight cache**: 86400 seconds (24 hours)

---

## Data Models

### ScanMetadata (R2 stored)

```typescript
interface ScanMetadata {
  scanId: string;
  timestamp: string;              // ISO 8601
  sku: string;
  bottleGeometry: BottleGeometry;
  oilType: string;
  aiProvider: "gemini" | "groq";
  fillPercentage: number;
  confidence: "high" | "medium" | "low";
  latencyMs: number;
  imageQualityIssues?: string[];
  imageStoragePath: string;       // "images/{scanId}.jpg"
  feedback?: {
    feedbackId: string;
    feedbackTimestamp: string;     // ISO 8601
    accuracyRating: "about_right" | "too_high" | "too_low" | "way_off";
    correctedFillPercentage?: number;
    validationStatus: "accepted" | "flagged";
    validationFlags?: string[];
    confidenceWeight: number;     // 0.1 - 1.0
    trainingEligible: boolean;
  };
}
```

### R2 Storage Layout

```
afia-training-data/
├── images/{scanId}.jpg           # Raw JPEG from user (binary)
└── metadata/{scanId}.json        # ScanMetadata JSON
```

---

## Registered SKUs

| SKU | Bottle | Oil Type | Volume | Geometry |
|-----|--------|----------|--------|----------|
| `filippo-berio-500ml` | Filippo Berio Extra Virgin Olive Oil | extra_virgin_olive | 500ml | cylinder (220mm × 65mm) |
| `bertolli-750ml` | Bertolli Classico Olive Oil | pure_olive | 750ml | frustum (280mm, 70mm→85mm) |
| `afia-sunflower-1l` | Afia Sunflower Oil | sunflower | 1000ml | cylinder (275mm × 80mm) |
