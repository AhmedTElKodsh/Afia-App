# API Specification — Safi Oil Tracker Worker

**Version:** POC v1
**Base URL:** `https://safi-oil-tracker.pages.dev` (production) or `http://localhost:8787` (local dev)

---

## Authentication

All Worker endpoints use:

- **Origin validation:** Request origin must match allowlist (production domain + localhost)
- **Rate limiting:** 10 requests per minute per IP address (KV-backed sliding window)
- **API keys:** Stored as Worker secrets, never exposed to client

---

## Endpoints

### POST /analyze

Analyzes a bottle photo and returns fill level estimate with confidence.

**Request:**

```typescript
interface AnalyzeRequest {
  sku: string; // Bottle SKU (must exist in registry)
  imageBase64: string; // Base64-encoded JPEG image (max 4MB)
}
```

**Response (Success):**

```typescript
interface AnalyzeResponse {
  scanId: string; // Unique scan identifier (UUID)
  fillPercentage: number; // Estimated fill level (0-100)
  confidence: "high" | "medium" | "low";
  aiProvider: "gemini" | "groq";
  latencyMs: number; // Total processing time
  imageQualityIssues?: string[]; // Optional: ["blur", "poor_lighting", etc.]
}
```

**Response (Error):**

```typescript
interface ErrorResponse {
  error: string; // Error message
  code: string; // Error code
  details?: any; // Optional additional context
}
```

**Error Codes:**

- `400` - Invalid request (missing fields, invalid SKU, image too large)
- `429` - Rate limit exceeded
- `500` - Server error (LLM API failure, storage error)
- `503` - Service unavailable (all LLM providers failed)

**Example Request:**

```bash
curl -X POST https://safi-oil-tracker.pages.dev/analyze \
  -H "Content-Type: application/json" \
  -d '{
    "sku": "filippo-berio-500ml",
    "imageBase64": "/9j/4AAQSkZJRgABAQEAYABgAAD..."
  }'
```

**Example Response:**

```json
{
  "scanId": "550e8400-e29b-41d4-a716-446655440000",
  "fillPercentage": 68,
  "confidence": "high",
  "aiProvider": "gemini",
  "latencyMs": 6234
}
```

---

### POST /feedback

Submits user feedback on scan accuracy with optional corrected estimate.

**Request:**

```typescript
interface FeedbackRequest {
  scanId: string; // Scan ID from /analyze response
  accuracyRating: "about_right" | "too_high" | "too_low" | "way_off";
  llmFillPercentage: number; // Original AI estimate from /analyze (required for contradiction detection)
  correctedFillPercentage?: number; // Optional: user's corrected estimate (0-100)
  responseTimeMs?: number; // Optional: ms elapsed between result display and feedback submit
}
```

**Response (Success):**

```typescript
interface FeedbackResponse {
  feedbackId: string; // Unique feedback identifier
  validationStatus: "accepted" | "flagged";
  validationFlags?: string[]; // Optional: ["too_fast", "boundary_value", etc.]
}
```

**Validation Flags:**

- `too_fast` - Feedback submitted < 3 seconds after result display
- `boundary_value` - Corrected value at exact boundary (0%, 25%, 50%, 75%, 100%)
- `contradictory` - "about_right" but corrected value >10% different from AI
- `extreme_delta` - Corrected value >30% different from AI estimate

**Example Request:**

```bash
curl -X POST https://safi-oil-tracker.pages.dev/feedback \
  -H "Content-Type: application/json" \
  -d '{
    "scanId": "550e8400-e29b-41d4-a716-446655440000",
    "accuracyRating": "too_low",
    "llmFillPercentage": 55,
    "correctedFillPercentage": 75,
    "responseTimeMs": 8432
  }'
```

**Example Response:**

```json
{
  "feedbackId": "660e8400-e29b-41d4-a716-446655440001",
  "validationStatus": "accepted"
}
```

---

## Rate Limiting

**Implementation:** KV-backed sliding window counter per IP address

**Limits:**

- 10 requests per minute per IP for both `/analyze` and `/feedback`
- Shared counter across both endpoints

**Headers:**

- `X-RateLimit-Limit: 10`
- `X-RateLimit-Remaining: 7`
- `X-RateLimit-Reset: 1709123456` (Unix timestamp)

**429 Response:**

```json
{
  "error": "Rate limit exceeded",
  "code": "RATE_LIMIT_EXCEEDED",
  "details": {
    "retryAfter": 42
  }
}
```

---

## Security

**Origin Validation:**

- Production: `https://safi-oil-tracker.pages.dev`
- Localhost: `http://localhost:5173`, `http://localhost:8787`

**Payload Validation:**

- Max image size: 4MB (base64-encoded)
- SKU must exist in bottle registry
- All required fields must be present

**API Key Storage:**

- `GEMINI_API_KEY` - Stored as Worker secret
- `GROQ_API_KEY` - Stored as Worker secret
- Never exposed to client or logged

---

## Storage

**R2 Bucket Structure:**

```
images/
  {scanId}.jpg              # Captured bottle photo (JPEG)

metadata/
  {scanId}.json             # Scan metadata + feedback
```

**Metadata Schema:** See `data-schemas.md`
