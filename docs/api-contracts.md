# API Contracts — Afia Oil Tracker

**Generated:** 2026-04-20 | **Scan Level:** Quick | **Mode:** Full Rescan

## Overview

This document defines all REST API endpoints exposed by the Cloudflare Worker backend. The API follows RESTful conventions and returns JSON responses.

**Base URL (Production):** `https://afia-worker.savola.workers.dev`  
**Base URL (Local Dev):** `http://localhost:8787`

**API Version:** 1.0  
**Authentication:** None (public API with rate limiting)  
**Content-Type:** `application/json`

---

## API Stages

### Stage 1 & 2: Cloud API (Current)
All endpoints are active and used for cloud-based LLM analysis and hybrid local+cloud inference.

### Stage 3: Minimal API (Future)
In Stage 3 (Local Model Only), the API will be optional and used only for:
- Background sync of training data
- Model version updates
- Optional cloud backup

---

## Endpoints

### 1. POST /analyze

**Purpose:** Analyze a bottle image and return fill level estimate

**Stage Availability:**
- ✅ Stage 1 (LLM Only) - Primary endpoint
- ✅ Stage 2 (Hybrid) - Fallback when local confidence < 85%
- ⚠️ Stage 3 (Local Only) - Optional, for backup/validation only

#### Request

**Method:** `POST`  
**Path:** `/analyze`  
**Content-Type:** `application/json`

**Headers:**
```http
Content-Type: application/json
Origin: https://afia-oil-tracker.pages.dev
```

**Body Schema:**
```typescript
interface AnalyzeRequest {
  sku: string;                    // Bottle SKU (e.g., "afia-corn-1.5l")
  imageBase64: string;             // Base64-encoded JPEG image
  localConfidence?: number;        // Optional: Local model confidence (Stage 2)
  localFillPercentage?: number;    // Optional: Local model prediction (Stage 2)
  modelVersion?: string;           // Optional: Local model version (Stage 2)
}
```

**Example Request:**
```json
{
  "sku": "afia-corn-1.5l",
  "imageBase64": "/9j/4AAQSkZJRgABAQEAYABgAAD...",
  "localConfidence": 0.72,
  "localFillPercentage": 65,
  "modelVersion": "v2.1.0"
}
```

**Validation Rules:**
- `sku`: Required, must exist in bottle registry
- `imageBase64`: Required, max 4MB after base64 decoding
- `localConfidence`: Optional, 0.0-1.0 range
- `localFillPercentage`: Optional, 0-100 range

#### Response

**Success Response (200 OK):**

```typescript
interface AnalyzeResponse {
  scanId: string;                  // Unique scan identifier
  fillPercentage: number;          // Estimated fill level (0-100)
  confidence: "high" | "medium" | "low";
  aiProvider: "gemini" | "groq" | "openrouter" | "mistral";
  latencyMs: number;               // API processing time
  imageQualityIssues?: string[];   // Optional quality warnings
  reasoning?: string;              // Optional: LLM reasoning (if DEBUG_REASONING=true)
  
  // UI mapping fields (for red line overlay)
  red_line_y_normalized?: number;  // 0-1000 scale
  bottle_top_y_px?: number;        // Pixel coordinate
  bottle_bottom_y_px?: number;     // Pixel coordinate
  
  // Guidance flags
  below_55ml_threshold?: boolean;  // True if < 55ml remaining
  guidanceNeeded?: string | null;  // Guidance message for user
}
```

**Example Success Response:**
```json
{
  "scanId": "scan_1713612345678_abc123",
  "fillPercentage": 67,
  "confidence": "high",
  "aiProvider": "gemini",
  "latencyMs": 1024,
  "imageQualityIssues": [],
  "red_line_y_normalized": 670,
  "bottle_top_y_px": 120,
  "bottle_bottom_y_px": 1800,
  "below_55ml_threshold": false,
  "guidanceNeeded": null
}
```

#### Error Responses

**400 Bad Request - Invalid SKU:**
```json
{
  "error": "Invalid SKU",
  "message": "SKU 'invalid-sku' not found in bottle registry",
  "code": "INVALID_SKU"
}
```

**400 Bad Request - Image Too Large:**
```json
{
  "error": "Image too large",
  "message": "Image size exceeds 4MB limit",
  "code": "IMAGE_TOO_LARGE"
}
```

**400 Bad Request - Missing Fields:**
```json
{
  "error": "Validation error",
  "message": "Missing required field: imageBase64",
  "code": "VALIDATION_ERROR"
}
```

**429 Too Many Requests:**
```json
{
  "error": "Rate limit exceeded",
  "message": "Maximum 10 requests per minute. Try again in 45 seconds.",
  "code": "RATE_LIMIT_EXCEEDED",
  "retryAfter": 45
}
```

**500 Internal Server Error - LLM Failure:**
```json
{
  "error": "Analysis failed",
  "message": "All AI providers failed. Please try again.",
  "code": "LLM_FAILURE",
  "details": {
    "gemini": "API quota exceeded",
    "groq": "Service unavailable"
  }
}
```

**503 Service Unavailable:**
```json
{
  "error": "Service unavailable",
  "message": "AI service temporarily unavailable",
  "code": "SERVICE_UNAVAILABLE"
}
```

#### Rate Limiting

**Limit:** 10 requests per minute per IP address  
**Window:** Sliding window (60 seconds)  
**Storage:** Cloudflare KV

**Rate Limit Headers:**
```http
X-RateLimit-Limit: 10
X-RateLimit-Remaining: 7
X-RateLimit-Reset: 1713612400
```

#### Performance

**Typical Latency:**
- Gemini 2.5 Flash: 800-1200ms
- Groq Llama 4 Scout: 600-900ms
- Worker processing: <50ms

**P95 Latency:** 1500ms  
**P99 Latency:** 2000ms

---

### 2. POST /feedback

**Purpose:** Submit user feedback on analysis accuracy

**Stage Availability:**
- ✅ Stage 1 (LLM Only) - Active
- ✅ Stage 2 (Hybrid) - Active
- ✅ Stage 3 (Local Only) - Active (background sync)

#### Request

**Method:** `POST`  
**Path:** `/feedback`  
**Content-Type:** `application/json`

**Body Schema:**
```typescript
interface FeedbackRequest {
  scanId: string;                  // Scan ID from /analyze response
  accuracyRating: "too_low" | "just_right" | "too_high";
  llmFillPercentage: number;       // Original LLM prediction
  correctedFillPercentage?: number; // User correction (if not "just_right")
  responseTimeMs: number;          // Time user took to respond
  userAgent?: string;              // Optional: Browser user agent
}
```

**Example Request:**
```json
{
  "scanId": "scan_1713612345678_abc123",
  "accuracyRating": "too_high",
  "llmFillPercentage": 67,
  "correctedFillPercentage": 55,
  "responseTimeMs": 8500,
  "userAgent": "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)"
}
```

**Validation Rules:**
- `scanId`: Required, must be valid scan ID
- `accuracyRating`: Required, one of three values
- `llmFillPercentage`: Required, 0-100
- `correctedFillPercentage`: Required if rating is not "just_right", 0-100
- `responseTimeMs`: Required, positive integer

#### Response

**Success Response (200 OK):**

```typescript
interface FeedbackResponse {
  feedbackId: string;              // Unique feedback identifier
  validationStatus: {
    flags: {
      too_fast: boolean;           // Response < 3 seconds
      boundary_value: boolean;     // Correction is 0 or 100
      contradictory: boolean;      // Rating contradicts correction
      extreme_delta: boolean;      // |corrected - llm| > 30%
    };
    confidenceWeight: number;      // 0.1 to 1.0 (1.0 - flagCount * 0.3)
    trainingEligible: boolean;     // True if no flags raised
  };
  message: string;
}
```

**Example Success Response:**
```json
{
  "feedbackId": "fb_1713612350000_xyz789",
  "validationStatus": {
    "flags": {
      "too_fast": false,
      "boundary_value": false,
      "contradictory": false,
      "extreme_delta": false
    },
    "confidenceWeight": 1.0,
    "trainingEligible": true
  },
  "message": "Feedback recorded successfully"
}
```

**Example Response with Flags:**
```json
{
  "feedbackId": "fb_1713612350000_xyz789",
  "validationStatus": {
    "flags": {
      "too_fast": true,
      "boundary_value": false,
      "contradictory": false,
      "extreme_delta": true
    },
    "confidenceWeight": 0.4,
    "trainingEligible": false
  },
  "message": "Feedback recorded with validation flags"
}
```

#### Validation Flags

| Flag | Condition | Meaning |
|------|-----------|---------|
| `too_fast` | `responseTimeMs < 3000` | User responded too quickly to assess |
| `boundary_value` | `correctedFillPercentage === 0 or 100` | Suspicious exact boundary |
| `contradictory` | Rating says "too_low" but correction < LLM | Rating contradicts correction |
| `extreme_delta` | `|corrected - llm| > 30%` | Unreasonably large correction |

**Confidence Weight Calculation:**
```typescript
confidenceWeight = Math.max(0.1, 1.0 - flagCount * 0.3)
```

#### Error Responses

**400 Bad Request - Invalid Scan ID:**
```json
{
  "error": "Invalid scan ID",
  "message": "Scan ID 'invalid-id' not found",
  "code": "INVALID_SCAN_ID"
}
```

**400 Bad Request - Missing Correction:**
```json
{
  "error": "Validation error",
  "message": "correctedFillPercentage required when rating is not 'just_right'",
  "code": "VALIDATION_ERROR"
}
```

**429 Too Many Requests:**
```json
{
  "error": "Rate limit exceeded",
  "message": "Maximum 10 requests per minute",
  "code": "RATE_LIMIT_EXCEEDED"
}
```

---

### 3. GET /health

**Purpose:** Health check endpoint for monitoring

**Stage Availability:**
- ✅ All stages

#### Request

**Method:** `GET`  
**Path:** `/health`

#### Response

**Success Response (200 OK):**

```typescript
interface HealthResponse {
  status: "ok" | "degraded" | "down";
  timestamp: string;               // ISO 8601 timestamp
  version: string;                 // API version
  services: {
    gemini: "ok" | "degraded" | "down";
    groq: "ok" | "degraded" | "down";
    r2: "ok" | "degraded" | "down";
    supabase: "ok" | "degraded" | "down";
    kv: "ok" | "degraded" | "down";
  };
  uptime: number;                  // Seconds since deployment
}
```

**Example Response:**
```json
{
  "status": "ok",
  "timestamp": "2026-04-20T14:45:00Z",
  "version": "1.0.0",
  "services": {
    "gemini": "ok",
    "groq": "ok",
    "r2": "ok",
    "supabase": "ok",
    "kv": "ok"
  },
  "uptime": 86400
}
```

**Degraded Response (200 OK):**
```json
{
  "status": "degraded",
  "timestamp": "2026-04-20T14:45:00Z",
  "version": "1.0.0",
  "services": {
    "gemini": "degraded",
    "groq": "ok",
    "r2": "ok",
    "supabase": "ok",
    "kv": "ok"
  },
  "uptime": 86400
}
```

---

### 4. POST /admin/correct

**Purpose:** Admin endpoint to manually correct a scan prediction

**Stage Availability:**
- ✅ All stages

**Authentication:** Required (password-based)

#### Request

**Method:** `POST`  
**Path:** `/admin/correct`  
**Content-Type:** `application/json`

**Headers:**
```http
Content-Type: application/json
Authorization: Bearer <ADMIN_PASSWORD>
```

**Body Schema:**
```typescript
interface AdminCorrectRequest {
  scanId: string;                  // Scan ID to correct
  correctedFillPercentage: number; // Admin's correction (0-100)
  notes?: string;                  // Optional admin notes
}
```

**Example Request:**
```json
{
  "scanId": "scan_1713612345678_abc123",
  "correctedFillPercentage": 58,
  "notes": "LLM overestimated due to lighting reflection"
}
```

#### Response

**Success Response (200 OK):**
```json
{
  "success": true,
  "scanId": "scan_1713612345678_abc123",
  "correctedFillPercentage": 58,
  "message": "Correction applied successfully"
}
```

#### Error Responses

**401 Unauthorized:**
```json
{
  "error": "Unauthorized",
  "message": "Invalid admin password",
  "code": "UNAUTHORIZED"
}
```

**404 Not Found:**
```json
{
  "error": "Scan not found",
  "message": "Scan ID 'invalid-id' not found",
  "code": "SCAN_NOT_FOUND"
}
```

---

### 5. POST /admin/rerun-llm

**Purpose:** Admin endpoint to re-run LLM analysis on a scan

**Stage Availability:**
- ✅ Stage 1 & 2

**Authentication:** Required (password-based)

#### Request

**Method:** `POST`  
**Path:** `/admin/rerun-llm`  
**Content-Type:** `application/json`

**Headers:**
```http
Content-Type: application/json
Authorization: Bearer <ADMIN_PASSWORD>
```

**Body Schema:**
```typescript
interface AdminRerunRequest {
  scanId: string;                  // Scan ID to re-analyze
  provider?: "gemini" | "groq" | "openrouter" | "mistral"; // Optional: Force provider
}
```

**Example Request:**
```json
{
  "scanId": "scan_1713612345678_abc123",
  "provider": "groq"
}
```

#### Response

**Success Response (200 OK):**
```json
{
  "success": true,
  "scanId": "scan_1713612345678_abc123",
  "newFillPercentage": 62,
  "provider": "groq",
  "confidence": "high",
  "latencyMs": 850
}
```

---

### 6. GET /admin/model-versions

**Purpose:** Get available ONNX model versions (Stage 2+)

**Stage Availability:**
- ✅ Stage 2 & 3

**Authentication:** Optional (public endpoint)

#### Request

**Method:** `GET`  
**Path:** `/admin/model-versions`

#### Response

**Success Response (200 OK):**

```typescript
interface ModelVersionsResponse {
  versions: Array<{
    version: string;               // e.g., "v2.1.0"
    releaseDate: string;           // ISO 8601 date
    accuracy: number;              // Validation accuracy (0-1)
    size: number;                  // Model size in bytes
    active: boolean;               // Currently active version
    downloadUrl: string;           // R2 URL for model file
  }>;
  latestVersion: string;
}
```

**Example Response:**
```json
{
  "versions": [
    {
      "version": "v2.1.0",
      "releaseDate": "2026-04-15T00:00:00Z",
      "accuracy": 0.92,
      "size": 8388608,
      "active": true,
      "downloadUrl": "https://r2.afia.com/models/oil-tracker-v2.1.0.onnx"
    },
    {
      "version": "v2.0.0",
      "releaseDate": "2026-03-01T00:00:00Z",
      "accuracy": 0.89,
      "size": 7340032,
      "active": false,
      "downloadUrl": "https://r2.afia.com/models/oil-tracker-v2.0.0.onnx"
    }
  ],
  "latestVersion": "v2.1.0"
}
```

---

## CORS Configuration

**Allowed Origins:**
- `https://afia-oil-tracker.pages.dev` (production)
- `https://*.afia-oil-tracker.pages.dev` (preview deployments)
- `http://localhost:5173` (local development)
- `http://localhost:4173` (local preview)

**Allowed Methods:** `GET, POST, OPTIONS`  
**Allowed Headers:** `Content-Type, Authorization`  
**Credentials:** Enabled (allows cookies and authentication headers)  
**Max Age:** 86400 seconds (24 hours)

**Preflight Response:**
```http
HTTP/1.1 204 No Content
Access-Control-Allow-Origin: https://afia-oil-tracker.pages.dev
Access-Control-Allow-Methods: GET, POST, OPTIONS
Access-Control-Allow-Headers: Content-Type, Authorization
Access-Control-Allow-Credentials: true
Access-Control-Max-Age: 86400
```

---

## Security Headers

All responses include security headers:

```http
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
X-XSS-Protection: 1; mode=block
Referrer-Policy: strict-origin-when-cross-origin
Content-Security-Policy: default-src 'self'
```

---

## Error Code Reference

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `INVALID_SKU` | 400 | SKU not found in bottle registry |
| `IMAGE_TOO_LARGE` | 400 | Image exceeds 4MB limit |
| `VALIDATION_ERROR` | 400 | Missing or invalid request fields |
| `RATE_LIMIT_EXCEEDED` | 429 | Too many requests from IP |
| `LLM_FAILURE` | 500 | All AI providers failed |
| `SERVICE_UNAVAILABLE` | 503 | Service temporarily unavailable |
| `UNAUTHORIZED` | 401 | Invalid admin credentials |
| `SCAN_NOT_FOUND` | 404 | Scan ID not found |
| `INTERNAL_ERROR` | 500 | Unexpected server error |

---

## API Client Example

### TypeScript Client

```typescript
class AfiaApiClient {
  private baseUrl: string;
  
  constructor(baseUrl: string = 'https://afia-worker.savola.workers.dev') {
    this.baseUrl = baseUrl;
  }
  
  async analyzeBottle(
    sku: string,
    imageBase64: string,
    localResult?: { confidence: number; fillPercentage: number; modelVersion: string }
  ): Promise<AnalyzeResponse> {
    const response = await fetch(`${this.baseUrl}/analyze`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sku,
        imageBase64,
        localConfidence: localResult?.confidence,
        localFillPercentage: localResult?.fillPercentage,
        modelVersion: localResult?.modelVersion,
      }),
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Analysis failed');
    }
    
    return response.json();
  }
  
  async submitFeedback(feedback: FeedbackRequest): Promise<FeedbackResponse> {
    const response = await fetch(`${this.baseUrl}/feedback`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(feedback),
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Feedback submission failed');
    }
    
    return response.json();
  }
  
  async checkHealth(): Promise<HealthResponse> {
    const response = await fetch(`${this.baseUrl}/health`);
    return response.json();
  }
}

// Usage
const client = new AfiaApiClient();

const result = await client.analyzeBottle(
  'afia-corn-1.5l',
  imageBase64
);

await client.submitFeedback({
  scanId: result.scanId,
  accuracyRating: 'just_right',
  llmFillPercentage: result.fillPercentage,
  responseTimeMs: 5000,
});
```

---

## Rate Limiting Details

### Implementation

**Storage:** Cloudflare KV  
**Algorithm:** Sliding window  
**Window Size:** 60 seconds  
**Limit:** 10 requests per window

### Key Format
```
ratelimit:<ip_address>:<timestamp_bucket>
```

### Bucket Calculation
```typescript
const bucket = Math.floor(Date.now() / 1000 / 60); // 1-minute buckets
const key = `ratelimit:${ip}:${bucket}`;
```

### Cleanup
Keys expire automatically after 60 seconds (TTL).

---

## Monitoring & Observability

### Metrics Tracked

1. **Request Metrics**
   - Total requests per endpoint
   - Success/error rates
   - Latency percentiles (P50, P95, P99)

2. **AI Provider Metrics**
   - Requests per provider
   - Success/failure rates
   - Average latency per provider
   - Fallback frequency

3. **Rate Limiting Metrics**
   - Rate limit hits per IP
   - Top rate-limited IPs
   - Rate limit effectiveness

4. **Business Metrics**
   - Scans per day
   - Feedback submission rate
   - Training-eligible feedback percentage

### Logging

**Log Format:** JSON structured logs

**Example Log Entry:**
```json
{
  "timestamp": "2026-04-20T14:45:00Z",
  "level": "info",
  "requestId": "req_abc123",
  "method": "POST",
  "path": "/analyze",
  "ip": "203.0.113.42",
  "userAgent": "Mozilla/5.0...",
  "sku": "afia-corn-1.5l",
  "provider": "gemini",
  "latencyMs": 1024,
  "status": 200
}
```

---

## API Evolution

### Stage 1 → Stage 2 Changes

**New Fields in POST /analyze:**
- `localConfidence` (optional)
- `localFillPercentage` (optional)
- `modelVersion` (optional)

**New Endpoint:**
- `GET /admin/model-versions`

**Behavior Change:**
- Worker now acts as fallback, not primary

### Stage 2 → Stage 3 Changes

**Deprecated Endpoints:**
- `POST /analyze` (optional, backup only)

**New Behavior:**
- All endpoints become optional
- Background sync via Service Worker
- Offline-first architecture

---

**For detailed architecture, see [Architecture](./architecture.md).**

**For component details, see [Component Inventory](./component-inventory.md).**

**For data models, see [Data Models](./data-models.md).**
