---
stepsCompleted: [1, 2, 3, 4, 5, 6, 7, 8]
inputDocuments:
  - technical-oil-bottle-ai-app-poc-research-2026-02-26.md
  - product-brief-Safi-Image-Analysis-2026-02-26.md
workflowType: "architecture"
project_name: "Safi Oil Tracker"
user_name: "Ahmed"
date: "2026-02-26"
---

# Architecture Decision Document — Safi Oil Tracker

_A Progressive Web App that uses LLM vision to estimate oil bottle fill levels and display consumption metrics with nutritional facts._

---

## Table of Contents

1. [Project Context Analysis](#1-project-context-analysis)
2. [POC Scope Boundaries](#2-poc-scope-boundaries)
3. [System Architecture Overview](#3-system-architecture-overview)
4. [Technology Stack Decisions](#4-technology-stack-decisions)
5. [Component Architecture](#5-component-architecture)
6. [Data Architecture](#6-data-architecture)
7. [API Contracts](#7-api-contracts)
8. [LLM Vision Integration](#8-llm-vision-integration)
9. [Data Collection & Feedback Loop](#9-data-collection--feedback-loop)
10. [Security Architecture](#10-security-architecture)
11. [Project Structure](#11-project-structure)
12. [Deployment Architecture](#12-deployment-architecture)
13. [Risk Register](#13-risk-register)
14. [Post-POC Evolution Path](#14-post-poc-evolution-path)

---

## 1. Project Context Analysis

### Problem Statement

Home cooking oil consumers have no practical way to track how much oil they've used from a bottle. This matters for calorie-conscious users, people managing dietary conditions, and the oil company's customer engagement strategy.

### Solution

A PWA accessible via QR code on each oil bottle. The user photographs their bottle, the app uses LLM vision to estimate the remaining fill level, calculates the volume consumed (in ml, tablespoons, and cups), and displays nutritional facts for the amount used.

### Functional Requirements (from Research)

| ID    | Requirement                                                      | POC Scope    |
| ----- | ---------------------------------------------------------------- | ------------ |
| FR-1  | QR code on bottle → opens PWA with bottle SKU pre-loaded         | In scope     |
| FR-2  | Camera capture of oil bottle showing remaining level             | In scope     |
| FR-3  | LLM Vision API estimates fill level as percentage                | In scope     |
| FR-4  | Calculate remaining/consumed volume from fill % + known geometry | In scope     |
| FR-5  | Display results in ml, tablespoons, and cups                     | In scope     |
| FR-6  | Display nutritional facts for consumed amount                    | In scope     |
| FR-7  | User feedback on estimation accuracy ("Was this correct?")       | In scope     |
| FR-8  | Store scan images + metadata + feedback for future fine-tuning   | In scope     |
| FR-9  | Feedback validation (sanity checks on user corrections)          | In scope     |
| FR-10 | Multi-provider LLM fallback chain (Gemini → Groq → local)        | In scope     |
| FR-11 | User accounts / scan history                                     | Out of scope |
| FR-12 | Custom starting level (partially used bottle as baseline)        | Out of scope |
| FR-13 | Multiple brands / dynamic bottle shape detection                 | Out of scope |
| FR-14 | Admin dashboard for reviewing feedback                           | Out of scope |
| FR-15 | Model fine-tuning pipeline                                       | Out of scope |

### Non-Functional Requirements

| NFR                 | Target                                         | Rationale                                           |
| ------------------- | ---------------------------------------------- | --------------------------------------------------- |
| **Latency**         | < 8s photo-to-result                           | User patience threshold for camera-initiated action |
| **Accuracy**        | ±15% fill level on clear glass bottles         | Current LLM vision capability ceiling               |
| **Availability**    | Best-effort (no SLA)                           | POC — free tier infrastructure                      |
| **Offline**         | App shell loads offline; scan requires network | Gemini API call requires connectivity               |
| **iOS support**     | Safari browser mode (not standalone)           | Known WebKit camera bug in standalone PWA mode      |
| **Android support** | Chrome, full PWA capabilities                  | No known blockers                                   |
| **Cost**            | $0/month infrastructure                        | All services on free tiers                          |
| **Data retention**  | All scan data retained indefinitely in R2      | Training data accumulation is strategic             |

---

## 2. POC Scope Boundaries

### In Scope (POC v1)

```
✅ PWA (responsive web app, no App Store submission)
✅ QR code on bottle → deep link to PWA with SKU parameter
✅ 2–3 bottle SKUs (defined shapes, known capacities)
✅ Clear glass bottles only (best LLM accuracy)
✅ Camera capture → LLM Vision API → fill level percentage
✅ Volume calculation: ml → tablespoons → cups
✅ Nutritional facts for consumed amount (bundled USDA data)
✅ Starting level = full bottle (100%) — hardcoded in v1
✅ Multi-provider fallback: Gemini → Groq → Ollama (local)
✅ User feedback collection with automated validation
⚠️ Image + metadata storage in Cloudflare R2 for future fine-tuning (DEFERRED — free tier requires credit card activation; images processed but not persisted in POC)
✅ CI/CD pipeline (GitHub Actions → Cloudflare)
```

### Out of Scope (Post-POC)

```
🔲 Native mobile app (iOS/Android)
🔲 User accounts, authentication, scan history
🔲 Dynamic bottle shape detection (unknown bottles)
🔲 Multiple oil brands / third-party bottle registry
🔲 Custom starting level (partially used bottle baseline)
🔲 Admin dashboard for feedback review
🔲 Model fine-tuning pipeline (data collected now, tuning later)
🔲 Offline-only scan mode (requires network for LLM API)
🔲 Multi-language support
🔲 Push notifications / reminders
```

---

## 3. System Architecture Overview

### Architecture Pattern

**Thin-Client PWA + Serverless Edge Proxy + Object Storage**

All domain logic (volume calculation, unit conversion, nutrition lookup) runs in the PWA client. The Cloudflare Worker is a security proxy with data persistence responsibilities. No application server. No database server.

### System Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                      USER DEVICE                             │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐   │
│  │                    PWA (React)                        │   │
│  │                                                       │   │
│  │  QrLanding → CameraCapture → ApiStatus → ResultDisplay│   │
│  │                                                       │   │
│  │  Local Logic:                                         │   │
│  │  ├── bottleRegistry.js  (SKU → geometry + nutrition)  │   │
│  │  ├── volumeCalculator.js (fill% → ml → tbsp → cups)  │   │
│  │  └── nutritionCalculator.js (consumed ml → kcal/fat)  │   │
│  └──────────────────┬───────────────────────────────────┘   │
│                     │ POST /analyze (JPEG base64)            │
│                     │ POST /feedback (user correction)       │
└─────────────────────┼───────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────┐
│              CLOUDFLARE WORKER (Edge Proxy)                   │
│                                                              │
│  Responsibilities:                                           │
│  ├── Origin validation (CORS whitelist)                      │
│  ├── Rate limiting (IP-based, 10 req/min)                    │
│  ├── Request size guard (< 4MB)                              │
│  ├── Multi-provider LLM routing (Gemini → Groq → error)     │
│  ├── Store image → Cloudflare R2 [DEFERRED in POC]            │
│  ├── Store metadata → Cloudflare R2 [DEFERRED in POC]        │
│  ├── Validate user feedback (sanity checks)                  │
│  └── Update metadata with validated feedback                 │
│                                                              │
│  Endpoints:                                                  │
│  ├── POST /analyze     → LLM + store                        │
│  ├── POST /feedback    → validate + update metadata          │
│  └── GET  /health      → status check                       │
└────────┬──────────────────────────────┬─────────────────────┘
         │                              │
         ▼                              ▼
┌─────────────────────┐   ┌─────────────────────────────────┐
│   LLM VISION APIs    │   │      CLOUDFLARE R2 STORAGE      │
│                      │   │                                  │
│  Primary:            │   │  images/{scanId}.jpg             │
│  Gemini 2.5 Flash    │   │  metadata/{scanId}.json          │
│                      │   │                                  │
│  Fallback:           │   │  Free tier: 10GB                 │
│  Groq Llama 4 Scout  │   │  ~140,000 scans capacity         │
│  (online-only, POC)  │   │  ⚠ Requires CC (Phase 2)        │
│                      │   │                                  │
│  Local dev:          │   │  Purpose:                        │
│  Ollama Qwen2.5-VL   │   │  ├── Training data accumulation │
│                      │   │  ├── Feedback collection         │
└──────────────────────┘   │  └── Future fine-tuning dataset  │
                           └──────────────────────────────────┘
```

### Data Flow — Happy Path

```
1. User scans QR code on bottle
2. Browser navigates to: https://safi-oil-tracker.pages.dev/?sku=filippo-berio-500ml
3. PWA loads bottle geometry from local bottleRegistry.js
4. PWA activates rear camera via getUserMedia
5. User captures still photo → canvas → JPEG @ 800px, quality 0.78 (~70KB)
6. PWA POST /analyze { image: base64, sku: "filippo-berio-500ml" }
7. Worker validates origin, rate limit, payload size
8. Worker stores image to R2: images/{scanId}.jpg
9. Worker calls Gemini 2.5 Flash with structured JSON prompt
   └── If Gemini fails → retry once → fall back to Groq Llama 4 Scout
10. Worker receives: { fill_percentage: 42, confidence: "high" }
11. Worker stores metadata to R2: metadata/{scanId}.json
12. Worker returns { scanId, fillPercentage: 42, confidence: "high", provider: "gemini" }
13. PWA calculates: 500ml × 0.42 = 210ml remaining, 290ml consumed
14. PWA converts: 210ml = 14.2 tbsp = 0.89 cups
15. PWA calculates nutrition: 290ml consumed ≈ 19.3 tbsp × 120kcal = 2,320 kcal
16. PWA displays result with feedback prompt
17. User taps "About right" / "Too high" / "Too low"
18. PWA POST /feedback { scanId, accuracy: "about_right", userEstimate: null }
19. Worker validates feedback → updates metadata/{scanId}.json
```

---

## 4. Technology Stack Decisions

### Decision Record

| Decision               | Choice                 | Rationale                                           | Alternatives Considered              |
| ---------------------- | ---------------------- | --------------------------------------------------- | ------------------------------------ |
| **App type**           | PWA                    | No App Store; QR → instant access; single codebase  | React Native, Flutter                |
| **Frontend framework** | Vite + React           | Fastest POC setup; excellent PWA tooling            | Next.js (SSR not needed), Vanilla JS |
| **PWA plugin**         | vite-plugin-pwa v1     | Best maintained; Workbox integration; auto manifest | Manual service worker                |
| **Hosting**            | Cloudflare Pages       | Free; unlimited bandwidth; same platform as Worker  | Vercel, Netlify                      |
| **API proxy**          | Cloudflare Worker      | Zero cold start; free tier; R2 binding native       | Firebase Functions, AWS Lambda       |
| **Object storage**     | Cloudflare R2          | S3-compatible; zero egress; same platform           | S3, GCS, Firebase Storage            |
| **Primary LLM**        | Gemini 2.5 Flash       | Free tier; $0.00025/call; JSON mode                 | GPT-4o, Claude Sonnet                |
| **Fallback LLM**       | Groq + Llama 4 Scout   | Free tier; OpenAI-compatible API; fast              | Together AI, Replicate               |
| **Local dev LLM**      | Ollama + Qwen2.5-VL 7B | One command setup; best open-source VLM             | LLaVA, Moondream                     |
| **QR scanning**        | paulmillr/qr           | 35KB; zero deps; canvas-native decode               | Nimiq qr-scanner, ZXing              |
| **Nutrition data**     | Bundled USDA JSON      | Offline; zero latency; free; authoritative          | USDA API live calls, Nutritionix     |
| **Testing**            | Vitest + Playwright    | Modern; fast; PWA-aware E2E                         | Jest, Cypress                        |
| **CI/CD**              | GitHub Actions         | Free; wrangler-action@v3 integration                | GitLab CI, Cloudflare direct         |

### Version Pinning (as of 2026-02-26)

```json
{
  "react": "^19.0",
  "vite": "^6.0",
  "vite-plugin-pwa": "^1.0",
  "qr": "^0.3",
  "@google/generative-ai": "^0.24",
  "vitest": "^3.0",
  "@playwright/test": "^1.50"
}
```

---

## 5. Component Architecture

### PWA Component Tree

```
<App />                          — Root state machine + router
├── <QrLanding />                — Reads ?sku= param, loads bottle from registry
│   └── Shows bottle name, capacity, "Start Scan" button
├── <CameraCapture />            — getUserMedia, live viewfinder, capture button
│   ├── <CameraGuide />         — Overlay guide frame for bottle alignment
│   └── <PhotoPreview />        — Canvas preview after capture, "Retake" / "Analyze"
├── <ApiStatus />                — Loading animation, error states, retry
│   ├── <AnalyzingSpinner />    — Bottle fill animation during API call
│   └── <ErrorPrompt />        — "Try again" / "Open in Safari" / "Poor lighting"
├── <ResultDisplay />            — Fill %, volume in 3 units, nutrition panel
│   ├── <FillGauge />           — Visual bottle fill indicator
│   ├── <VolumeBreakdown />     — ml | tablespoons | cups (remaining + consumed)
│   ├── <NutritionFacts />      — Calories, fat, saturated fat for consumed amount
│   └── <FeedbackPrompt />      — "Was this accurate?" with correction slider
└── <UnknownBottle />            — SKU not in registry fallback
```

### State Machine

```
IDLE                    — QR landed, bottle SKU loaded, awaiting user action
  ↓ [user taps "Start Scan"]
CAMERA_ACTIVE           — Camera stream active, viewfinder showing
  ↓ [user captures photo]
PHOTO_CAPTURED          — Preview shown, user can retake or submit
  ↓ [user taps "Analyze"]
API_PENDING             — Image sent to Worker, waiting for response
  ↓ [response received]
API_SUCCESS             — Result displayed, feedback prompt shown
  or
API_LOW_CONFIDENCE      — LLM confidence < threshold, suggest retake
  or
API_ERROR               — Network/server error, retry available
  or
API_UNRECOVERABLE       — Bad image, semantic refusal, must retake
```

### Camera Hook

```javascript
// src/hooks/useCamera.ts
// - Requests rear-facing camera (facingMode: 'environment')
// - Captures still to canvas at 800px width
// - Compresses to JPEG @ 0.78 quality (~70KB output)
// - Returns base64 string with data URL prefix stripped
// - Handles iOS permission denial with graceful error message
// - Reuses single MediaStream across component lifecycle
```

### Volume Calculator (Pure Logic)

```javascript
// src/utils/volumeCalculator.ts
// Two formulas based on bottle shape:
//
// Cylinder:  V_remaining = totalVolumeMl × (fillPercent / 100)
//
// Frustum:   h_fill = H × (fillPercent / 100)
//            r_fill = r + (R - r) × (fillPercent / 100)
//            V_mm3  = (π/3) × h_fill × (r² + r×r_fill + r_fill²)
//            V_ml   = V_mm3 / 1000
//
// Unit conversion:
//   1 tablespoon = 14.7868 ml
//   1 cup = 16 tablespoons = 236.588 ml
```

---

## 6. Data Architecture

### Bottle Registry (Bundled Static Data)

```javascript
// src/data/bottleRegistry.ts
// Each SKU entry contains:
{
  sku: "filippo-berio-500ml",
  name: "Filippo Berio Extra Virgin Olive Oil 500ml",
  oilType: "olive-oil",              // Maps to nutrition data
  shape: "cylinder",                  // or "frustum"
  totalVolumeMl: 500,
  geometry: {
    // Cylinder: { innerRadiusMm, liquidHeightMm }
    // Frustum:  { bottomRadiusMm, topRadiusMm, liquidHeightMm }
    innerRadiusMm: 33,
    liquidHeightMm: 146
  },
  imageUrl: "/bottles/filippo-berio-500ml.png"  // Reference image for UI
}
```

### Nutrition Data (Bundled Static Data)

```javascript
// src/data/oilNutrition.ts
// Per 100g values from USDA FoodData Central (CC0 license)
// Scales to any serving size via: nutrient × (servingMl / 100 × density)
// Oil density ≈ 0.92 g/ml
{
  "olive-oil": {
    fdcId: 748608,
    name: "Olive Oil",
    densityGPerMl: 0.92,
    per100g: {
      calories: 884,
      totalFatG: 100,
      saturatedFatG: 13.8,
      monounsaturatedFatG: 72.9,
      polyunsaturatedFatG: 10.5,
      vitaminEMg: 14.35,
      vitaminKUg: 60.2
    }
  }
}
```

### Scan Record (Cloudflare R2)

**Image:** `images/{scanId}.jpg` — Original JPEG from camera capture

**Metadata:** `metadata/{scanId}.json`

```json
{
  "scanId": "a1b2c3d4-uuid",
  "timestamp": "2026-03-01T14:22:00.000Z",
  "sku": "filippo-berio-500ml",
  "bottleCapacityMl": 500,
  "imageKey": "images/a1b2c3d4-uuid.jpg",
  "imageSizeBytes": 72340,
  "llm": {
    "provider": "gemini-2.5-flash",
    "model": "gemini-2.5-flash",
    "fillPercentage": 42,
    "confidence": "high",
    "notes": "",
    "latencyMs": 2340,
    "tokenCostEstimate": 0.00025
  },
  "calculatedResult": {
    "remainingMl": 210,
    "consumedMl": 290,
    "remainingTbsp": 14.2,
    "remainingCups": 0.89
  },
  "userFeedback": null,
  "device": {
    "userAgent": "Mozilla/5.0 ...",
    "platform": "iOS",
    "screenWidth": 390
  },
  "trainingEligible": false
}
```

**After user feedback:**

```json
{
  "userFeedback": {
    "accuracy": "too_low",
    "userEstimate": 55,
    "submittedAt": "2026-03-01T14:22:45.000Z",
    "responseTimeMs": 3400,
    "validationStatus": "accepted",
    "validationFlags": [],
    "confidenceWeight": 0.85
  },
  "trainingEligible": true
}
```

---

## 7. API Contracts

### POST /analyze

**Request:**

```json
{
  "image": "<base64 JPEG, no data URL prefix>",
  "sku": "filippo-berio-500ml",
  "mimeType": "image/jpeg"
}
```

**Response (success):**

```json
{
  "scanId": "a1b2c3d4-uuid",
  "fillPercentage": 42,
  "confidence": "high",
  "provider": "gemini-2.5-flash",
  "notes": ""
}
```

**Response (low confidence):**

```json
{
  "scanId": "a1b2c3d4-uuid",
  "fillPercentage": 35,
  "confidence": "low",
  "provider": "gemini-2.5-flash",
  "notes": "Image blurry, poor lighting",
  "qualityIssues": ["blurry", "bad_lighting"]
}
```

**Error responses:**
| Status | Body | Meaning |
|---|---|---|
| 400 | `{ "error": "invalid_request" }` | Malformed JSON, missing fields |
| 400 | `{ "error": "unknown_sku" }` | SKU not recognized by Worker |
| 413 | `{ "error": "payload_too_large" }` | Image > 4MB |
| 429 | `{ "error": "rate_limit_exceeded" }` | > 10 requests/min from this IP |
| 502 | `{ "error": "all_providers_failed" }` | Gemini and Groq both failed |

### POST /feedback

**Request:**

```json
{
  "scanId": "a1b2c3d4-uuid",
  "accuracy": "too_low",
  "userEstimate": 55
}
```

`accuracy` enum: `"about_right"` | `"too_high"` | `"too_low"` | `"way_off"`

`userEstimate`: optional number 1–99 (required when accuracy ≠ "about_right")

**Response:**

```json
{
  "status": "accepted",
  "validationFlags": []
}
```

---

## 8. LLM Vision Integration

### Multi-Provider Fallback Chain

```
Request arrives at Worker
    │
    ├─→ Try Gemini 2.5 Flash
    │   ├── Success → return result
    │   ├── 429 (rate limit) → try Groq
    │   ├── 5xx (server error) → retry once → try Groq
    │   └── 400 (bad request) → return error to client (no fallback)
    │
    ├─→ Try Groq Llama 4 Scout (fallback)
    │   ├── Success → return result
    │   └── Any error → return 502 to client
    │
    └── Local Ollama: dev/testing only, not deployed to Worker
```

### LLM Prompt (Shared Across Providers)

```
You are a liquid level estimation expert analyzing a photo of an oil bottle.

Bottle context:
- Type: {sku_name}
- Total capacity: {total_volume_ml}ml
- Shape: {shape_type}

Estimate the remaining oil fill level as a percentage from 0 to 100.
Look at the visible liquid level line (meniscus) against the bottle wall.
If the bottle is transparent, note the oil color and clarity.

Respond ONLY with valid JSON:
{
  "fill_percentage": <integer 0-100>,
  "confidence": "high" | "medium" | "low",
  "notes": "<any quality issues or uncertainty>"
}

If you cannot determine the fill level due to image quality, set confidence
to "low" and describe the issues in notes.
```

### Generation Config

```javascript
generationConfig: {
  temperature: 0.1,                          // Consistent numeric output
  responseMimeType: 'application/json',       // Force structured JSON (Gemini)
  thinkingConfig: { thinkingBudget: 0 }      // Disable thinking — saves 2-5s
}
```

### Confidence Threshold Handling

```
confidence === "high"   → Show result normally
confidence === "medium" → Show result with "Estimate may be less accurate" note
confidence === "low"    → Show result grayed out + "Try retaking with better lighting"
```

---

## 9. Data Collection & Feedback Loop

### Purpose

Accumulate labeled (image, fill_percentage, user_correction) pairs from day one. This training data enables future model fine-tuning and prompt refinement without requiring any architectural changes.

### User Feedback UI

After result display, the PWA shows:

```
"We estimated ~42% remaining (210ml). Was this:"

  [✓ About right]  [↑ Too high]  [↓ Too low]  [✗ Way off]
```

If user selects anything other than "About right", show a slider:

```
"What would you estimate? [────●────────] 55%"
```

### Feedback Validation (Layer 1 — Real-time in Worker)

```javascript
function validateFeedback(llmEstimate, feedback) {
  const flags = [];

  if (feedback.responseTimeMs < 3000) flags.push("too_fast");

  if (feedback.userEstimate === 0 || feedback.userEstimate === 100)
    flags.push("boundary_value");

  if (feedback.accuracy === "too_low" && feedback.userEstimate < llmEstimate)
    flags.push("contradictory");

  if (feedback.accuracy === "too_high" && feedback.userEstimate > llmEstimate)
    flags.push("contradictory");

  if (Math.abs(feedback.userEstimate - llmEstimate) > 30)
    flags.push("extreme_delta");

  return {
    validationStatus: flags.length === 0 ? "accepted" : "flagged",
    validationFlags: flags,
    confidenceWeight: Math.max(0.1, 1.0 - flags.length * 0.3),
    trainingEligible: flags.length === 0,
  };
}
```

### Validation Layers (POC vs Post-POC)

| Layer                                  | Description                                     | When                          |
| -------------------------------------- | ----------------------------------------------- | ----------------------------- |
| **Layer 1: Sanity checks**             | Contradictions, boundary values, response speed | **POC — runs live in Worker** |
| Layer 2: Statistical outlier detection | Per-SKU mean/stddev delta analysis              | Post-POC (batch)              |
| Layer 3: Consensus scoring             | Cross-user agreement weighting for same SKU     | Post-POC (batch)              |
| Layer 4: Admin review queue            | Manual approve/reject of flagged records        | Post-POC (dashboard)          |

### Training Data Eligibility Criteria (Post-POC)

Only records meeting ALL criteria enter fine-tuning datasets:

- `validationStatus === "accepted"`
- `confidenceWeight >= 0.5`
- `responseTimeMs >= 2000`
- No unresolved flags
- Peer consensus within ±10% (when sufficient data exists)

### Fine-Tuning Path (Post-POC)

| Milestone   | Approach                                                  |
| ----------- | --------------------------------------------------------- |
| 50+ scans   | Analyze error patterns → refine system prompt (zero cost) |
| 100+ scans  | Include best-labeled pairs as few-shot examples in prompt |
| 500+ scans  | Fine-tune Qwen2.5-VL 7B (open-source, full control)       |
| 1000+ scans | Fine-tune Gemini Flash via Google AI Studio               |

---

## 10. Security Architecture

### API Key Protection

| Secret                 | Storage                                          | Access              |
| ---------------------- | ------------------------------------------------ | ------------------- |
| `GEMINI_API_KEY`       | Cloudflare Worker secret (`wrangler secret put`) | Worker runtime only |
| `GROQ_API_KEY`         | Cloudflare Worker secret                         | Worker runtime only |
| `CLOUDFLARE_API_TOKEN` | GitHub Actions secret                            | CI/CD only          |

**No secrets in client-side code. No secrets in git. No secrets in wrangler.toml.**

### Worker Security Controls

```
1. Origin Validation
   Allow: https://safi-oil-tracker.pages.dev, http://localhost:5173
   Deny: all other origins

2. Rate Limiting
   10 requests/minute per IP (KV-backed sliding window)

3. Payload Size Guard
   Reject requests > 4MB

4. Method Guard
   Only POST /analyze and POST /feedback accepted
   OPTIONS for CORS preflight

5. Input Validation
   SKU must exist in known registry
   Image must be valid base64
   Feedback fields must pass type validation
```

### Data Privacy Considerations

- Scan images stored in R2 contain user-photographed content
- No personal identifiable information (PII) collected — no accounts, no names, no emails
- Device metadata (user agent, screen width) is non-identifying
- IP addresses logged by Cloudflare infrastructure (standard) but not stored in scan metadata
- R2 data retained for training purposes — this should be disclosed in a terms/privacy notice on the PWA

---

## 11. Project Structure

```
safi-oil-tracker/
│
├── src/                                # PWA source (Cloudflare Pages)
│   ├── main.tsx                        # React entry point
│   ├── App.tsx                         # Root state machine + routing
│   │
│   ├── components/
│   │   ├── QrLanding.tsx               # SKU param reader, bottle info display
│   │   ├── CameraCapture.tsx           # getUserMedia, viewfinder, capture
│   │   ├── CameraGuide.tsx             # Alignment overlay for bottle framing
│   │   ├── PhotoPreview.tsx            # Captured image preview, retake/submit
│   │   ├── ApiStatus.tsx               # Loading, error, retry states
│   │   ├── ResultDisplay.tsx           # Fill gauge + volume + nutrition
│   │   ├── FillGauge.tsx               # Visual bottle fill indicator
│   │   ├── VolumeBreakdown.tsx         # ml | tbsp | cups display
│   │   ├── NutritionFacts.tsx          # Calorie/fat panel for consumed amount
│   │   ├── FeedbackPrompt.tsx          # "Was this accurate?" + slider
│   │   └── UnknownBottle.tsx           # SKU not found fallback
│   │
│   ├── hooks/
│   │   └── useCamera.ts               # Camera lifecycle management
│   │
│   ├── api/
│   │   └── apiClient.ts               # POST /analyze + POST /feedback client
│   │
│   ├── utils/
│   │   ├── volumeCalculator.ts        # Fill % → ml → tbsp → cups
│   │   ├── nutritionCalculator.ts     # Consumed ml → kcal, fat, etc.
│   │   └── imageCompressor.ts         # Canvas resize + JPEG compression
│   │
│   ├── data/
│   │   ├── bottleRegistry.ts          # SKU → geometry + oil type mapping
│   │   └── oilNutrition.ts            # Oil type → per-100g USDA nutrients
│   │
│   └── state/
│       └── appState.ts                # State machine enum + transitions
│
├── public/
│   ├── manifest.json                   # PWA web app manifest
│   ├── icons/                          # PWA icons (192px, 512px)
│   ├── bottles/                        # Reference bottle images for UI
│   └── _headers                        # Cloudflare Pages headers config
│
├── worker/                             # Cloudflare Worker (API proxy)
│   ├── src/
│   │   ├── index.ts                    # Worker entry: routing + CORS
│   │   ├── analyze.ts                  # POST /analyze handler
│   │   ├── feedback.ts                 # POST /feedback handler
│   │   ├── providers/
│   │   │   ├── gemini.ts               # Gemini API client
│   │   │   └── groq.ts                 # Groq API client (fallback)
│   │   ├── validation/
│   │   │   └── feedbackValidator.ts    # Layer 1 sanity checks
│   │   └── storage/
│   │       └── r2Client.ts             # R2 image + metadata operations
│   └── wrangler.toml                   # Worker config + R2 binding
│
├── tests/
│   ├── unit/
│   │   ├── volumeCalculator.test.ts    # Pure math tests
│   │   ├── nutritionCalculator.test.ts # Nutrition scaling tests
│   │   ├── feedbackValidator.test.ts   # Validation logic tests
│   │   └── imageCompressor.test.ts     # Compression output tests
│   ├── e2e/
│   │   ├── scan-flow.spec.ts           # Full happy path E2E
│   │   ├── offline-shell.spec.ts       # App shell loads offline
│   │   └── error-states.spec.ts        # Error handling E2E
│   └── vitest.setup.ts                 # Camera mock + test globals
│
├── .github/
│   └── workflows/
│       └── deploy.yml                  # CI/CD: Pages + Worker deploy
│
├── vite.config.ts                      # Vite + React + PWA plugin config
├── index.html                          # HTML entry point
├── package.json
└── README.md
```

---

## 12. Deployment Architecture

### Infrastructure (All Cloudflare, All Free Tier)

```
┌────────────────────────────────────┐
│         CLOUDFLARE PLATFORM        │
│                                    │
│  ┌─────────────────────────────┐   │
│  │    Cloudflare Pages (CDN)   │   │
│  │    safi-oil-tracker.pages.dev│   │
│  │                             │   │
│  │    Serves: React PWA        │   │
│  │    Bandwidth: Unlimited     │   │
│  │    Custom domains: Yes      │   │
│  │    Auto HTTPS: Yes          │   │
│  │    PR preview deploys: Yes  │   │
│  └─────────────────────────────┘   │
│                                    │
│  ┌─────────────────────────────┐   │
│  │    Cloudflare Worker        │   │
│  │    safi-oil-proxy.workers.dev│   │
│  │                             │   │
│  │    Requests/day: 100,000    │   │
│  │    CPU/request: 10ms        │   │
│  │    Cold starts: None (V8)   │   │
│  └─────────────────────────────┘   │
│                                    │
│  ┌─────────────────────────────┐   │
│  │    Cloudflare R2 Bucket     │   │
│  │    safi-scan-data           │   │
│  │                             │   │
│  │    Storage: 10 GB free      │   │
│  │    Writes: 1M ops/month     │   │
│  │    Reads: 10M ops/month     │   │
│  │    Egress: $0 (always)      │   │
│  └─────────────────────────────┘   │
└────────────────────────────────────┘
```

### CI/CD Pipeline

```yaml
# .github/workflows/deploy.yml

on push to main:
  ├── Job 1: deploy-pages
  │   ├── checkout → setup node → npm ci → npm run build
  │   └── wrangler pages deploy dist --project-name=safi-oil-tracker
  │
  └── Job 2: deploy-worker
      ├── checkout → setup node → npm ci
      └── wrangler deploy (working dir: worker/)

on pull_request:
  └── Job 1: deploy-pages (preview)
      └── Auto-comments preview URL on the PR
```

### Environment Variables

| Variable                | Location              | Value                                            |
| ----------------------- | --------------------- | ------------------------------------------------ |
| `VITE_PROXY_URL`        | Cloudflare Pages env  | `https://safi-oil-proxy.<subdomain>.workers.dev` |
| `GEMINI_API_KEY`        | Worker secret         | (via `wrangler secret put`)                      |
| `GROQ_API_KEY`          | Worker secret         | (via `wrangler secret put`)                      |
| `CLOUDFLARE_API_TOKEN`  | GitHub Actions secret | (scoped API token)                               |
| `CLOUDFLARE_ACCOUNT_ID` | GitHub Actions secret | (from CF dashboard)                              |

---

## 13. Risk Register

| #   | Risk                                     | Severity | Likelihood | Mitigation                                                                                | Scope |
| --- | ---------------------------------------- | -------- | ---------- | ----------------------------------------------------------------------------------------- | ----- |
| R1  | iOS camera broken in standalone PWA mode | High     | High       | Remove `apple-mobile-web-app-capable`; use Safari browser mode; "Open in Safari" fallback | POC   |
| R2  | Gemini inaccuracy on dark/opaque bottles | High     | High       | Scope POC to clear glass only; expose confidence in UI; frame as ±15% estimate            | POC   |
| R3  | API latency > 8s degrades UX             | Medium   | Medium     | Disable `thinkingBudget`; compress image to 800px; optimistic UI animation                | POC   |

**⚠️ R3 VALIDATION NOTE:** The 8-second latency target is based on theoretical component timings:

- Image compression: ~500ms (client-side canvas resize)
- Upload: ~1-2s (800px JPEG @ 4G speeds)
- Gemini API inference: ~3-5s (observed in testing)
- Response parsing + UI render: ~500ms

**Total estimated: 5-8 seconds under ideal conditions.**

**Real-world validation required:** This target must be validated with actual Gemini API calls on representative mobile networks (4G, flaky WiFi) before committing to the PRD promise. If p95 latency exceeds 8s in testing, options include:

1. Adjust PRD target to "< 10 seconds" with explicit messaging
2. Implement aggressive image compression (reduce to 600px width)
3. Add "Analyzing..." progress indicator with time estimate
4. Consider Groq as primary (faster but less accurate) with Gemini as fallback for low-confidence results

**POC acceptance criteria:** p95 latency < 10s is acceptable for POC validation. The 8s target is aspirational for production.
| R4 | Gemini free tier rate limit hit | Medium | Low | Auto-fallback to Groq Llama 4 Scout; 10 req/min per-IP limit in Worker | POC |
| R5 | User feedback data is unreliable | Medium | Medium | Layer 1 sanity checks in Worker; flag contradictions, boundary values, fast taps | POC |
| R6 | R2 storage exceeds 10GB free tier | Low | Low | At ~70KB/scan, 10GB holds ~140K scans; purge old unflagged images if needed | Post-POC |
| R7 | Bottle shape variance within same SKU | Medium | Medium | Geometry per SKU is approximation; ±15% estimate absorbs minor variance | Accepted |
| R8 | Service worker caches stale API responses | Medium | Low | `NetworkOnly` Workbox rule for Worker API routes | POC |

---

## 14. Post-POC Evolution Path

### Phase 2: User Engagement

```
🔲 User accounts (email/social login via Cloudflare Access or Auth.js)
🔲 Scan history timeline — track consumption over days/weeks
🔲 Custom starting level — "My bottle is already half used"
🔲 Push notifications — "Time to restock?" based on consumption rate
```

### Phase 3: Model Intelligence

```
🔲 Admin dashboard — review flagged feedback, approve/reject training data
🔲 Prompt refinement from error pattern analysis (50+ scans)
🔲 Few-shot examples injected into prompt (100+ scans)
🔲 Fine-tune Qwen2.5-VL on validated training pairs (500+ scans)
🔲 Fine-tune Gemini Flash via Google AI Studio (1000+ scans)
🔲 Specialized small model distillation (Moondream-size)
```

### Phase 4: Platform Scale

```
🔲 Native mobile app (React Native) for reliable iOS camera + offline scan
🔲 Dynamic bottle shape detection (unknown bottles without pre-registered SKU)
🔲 Multi-brand support — open bottle registry API for third-party oil companies
🔲 Barcode (not QR) scanning — read existing UPC barcodes on bottles
🔲 Multi-language support
🔲 Database migration (R2 → D1 or Neon) for relational queries on scan data
```

### Phase 5: Business Intelligence

```
🔲 Aggregated anonymized consumption analytics for the oil company
🔲 Regional consumption patterns
🔲 Product size optimization insights (which bottle sizes sell best vs. actual usage)
🔲 Integration with oil company loyalty program
```

---

_Architecture document produced: 2026-02-26_
_Based on: Comprehensive technical research report (800+ lines, 40+ verified sources)_
_Author: Ahmed + Winston (Architect Agent)_
_Status: POC scope finalized — ready for implementation_
