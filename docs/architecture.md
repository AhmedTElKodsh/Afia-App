# Afia App — Architecture Documentation

## Two-Stage AI Strategy

The project is divided into two distinct levels of maturity to balance speed-to-market with long-term cost efficiency and offline capability.

### Stage 1: LLM-Primary (POC/Prototype)
- **Primary:** Gemini 2.5 Flash via Cloudflare Worker proxy.
- **Fallback:** Groq Llama 4 Scout.
- **Mechanism:** Text-based prompts with image-to-text directions and few-shot visual examples (optimized for size/token reduction).
- **Goal:** Gather "ground truth" data through real-world usage and admin corrections.

### Stage 2: Local-Primary (Production)
- **Primary:** Lightweight browser-based model (TensorFlow.js or ONNX Runtime Web).
- **Fallback:** LLM API (Stage 1 mechanism) if local confidence < 85%.
- **Mechanism:** Model runs directly on the mobile browser, providing sub-second latency and offline support.
- **Goal:** Cost elimination and maximum privacy.

## Architecture Pattern

**Hybrid Client-Side Intelligence with Serverless Training Pipeline**

```
┌─────────────────────────┐         ┌──────────────────────────────────┐
│   Browser (PWA)         │         │   Cloudflare Worker (Hono)       │
│                         │  HTTPS  │                                  │
│  React 19 + Vite 7      │────────►│  CORS → Rate Limit → Router     │
│  Local Model (Primary)  │         │    ├── POST /analyze (Fallback)  │
│  LLM API (Fallback)     │◄────────│    │   ├── Gemini / Groq         │
│                         │         │    └── R2 Store (Images)         │
│  Slider (55ml/Cup)      │         │                                  │
│  Visual Feedback        │────────►│  POST /feedback (Correction)     │
│                         │◄────────│    └── Supabase Update           │
└─────────────────────────┘         └──────────────────────────────────┘
            │                                    │              │
            ▼                                    ▼              ▼
      ┌───────────┐                        ┌───────────┐  ┌───────────┐
      │  Local    │                        │ Supabase  │  │   R2      │
      │  Model    │                        │ (Training)│  │ (Images)  │
      └───────────┘                        └───────────┘  └───────────┘
```

## Data Pipeline & Training

1. **Image Storage (R2):** All captured images (real and AI-augmented) are stored in Cloudflare R2.
2. **Metadata & Labels (Supabase):** 
    - AI predictions (Local + LLM fallback) are stored in Supabase.
    - Admin corrections ("Too Big", "Too Small", manual ML entry) provide the "Ground Truth".
3. **Model Refinement:** The Admin Dashboard allows uploading images + metadata to fine-tune and retrain the local model iteratively.


## Frontend Architecture

### State Machine

The app is driven by a finite state machine defined in `src/state/appState.ts`:

```
IDLE → CAMERA_ACTIVE → PHOTO_CAPTURED → API_PENDING → API_SUCCESS
                                                    → API_LOW_CONFIDENCE
                                                    → API_ERROR
         (also: UNKNOWN_BOTTLE — terminal state for bad SKUs)
```

State transitions are managed in `App.tsx` using `useState`. No external state library is used — the app is simple enough that React's built-in state suffices.

### Component Hierarchy

```
App.tsx (state machine router)
├── IosWarning           — shown if iOS in-app browser detected
├── UnknownBottle        — shown if no SKU or unknown SKU
├── QrLanding            — IDLE state
│   └── PrivacyNotice    — overlay on first visit
├── CameraCapture        — CAMERA_ACTIVE state
│   └── useCamera hook   — getUserMedia + canvas capture
├── [Photo Preview]      — PHOTO_CAPTURED state (inline in App.tsx)
├── ApiStatus            — API_PENDING or API_ERROR state
└── ResultDisplay        — API_SUCCESS or API_LOW_CONFIDENCE state
    ├── FillGauge        — SVG bottle visualization
    ├── Volume breakdown — calculated via volumeCalculator
    ├── Nutrition facts  — calculated via nutritionCalculator
    └── FeedbackPrompt   — user accuracy rating + correction slider
```

### Data Flow

1. **URL parameter** `?sku=xxx` → `getBottleBySku()` → `BottleContext`
2. **Camera** → `useCamera.capturePhoto()` → `compressImage()` → base64 string
3. **API call** → `apiClient.analyzeBottle(sku, imageBase64)` → `AnalysisResult`
4. **Volume calc** → `calculateVolumes(fillPercentage, totalVolumeMl, geometry)` → `{remaining, consumed}` in ml/tbsp/cups
5. **Nutrition calc** → `calculateNutrition(consumedMl, oilType)` → `{calories, totalFatG, saturatedFatG}`
6. **Feedback** → `apiClient.submitFeedback(...)` → `{feedbackId, validationStatus}`

### Styling Architecture

- **CSS Custom Properties** design system in `index.css` — colors, typography, spacing, radii, shadows
- **No CSS framework or UI library** — pure CSS with utility classes (`.card`, `.btn`, `.btn-primary`, `.text-secondary`)
- **Co-located CSS** — each component has a matching `.css` file
- **Mobile-first** — `max-width: 430px` container, `min-height: 100dvh`
- **Reduced motion** — `@media (prefers-reduced-motion: reduce)` respected

## Backend Architecture

### Worker Structure

The Cloudflare Worker uses **Hono** as a lightweight router framework:

```
Request
  │
  ├── CORS middleware (origin allowlist from ALLOWED_ORIGINS env var)
  ├── Rate limiting middleware (10 req/min/IP, KV-backed sliding window)
  │
  ├── POST /analyze
  │   ├── Input validation (sku: string, imageBase64: string, max 4MB)
  │   ├── SKU lookup from worker-side bottleRegistry
  │   ├── LLM call: Gemini first, Groq fallback
  │   ├── R2 storage (non-blocking via executionCtx.waitUntil)
  │   └── Response: {scanId, fillPercentage, confidence, aiProvider, latencyMs}
  │
  ├── POST /feedback
  │   ├── Input validation
  │   ├── Feedback validation (4 flags)
  │   ├── R2 metadata update (non-blocking)
  │   └── Response: {feedbackId, validationStatus}
  │
  ├── GET /health → {status: "ok"}
  └── * → 404
```

### AI Provider Strategy

| Provider      | Model                                       | Role     | API Style          |
| ------------- | ------------------------------------------- | -------- | ------------------ |
| Google Gemini | `gemini-2.5-flash-latest`                   | Primary  | Google AI REST API |
| Groq          | `meta-llama/llama-4-scout-17b-16e-instruct` | Fallback | OpenAI-compatible  |

- **Automatic failover**: If Gemini throws, Groq is tried.
- **Round-Robin Rotation**: Worker rotates through `GEMINI_KEY_1..N` (min 3 keys) to bypass free-tier rate limits.
- **Few-Shot Visuals**: Prompts include 2 visual anchors (100%/25%) to stabilize estimation across SKUs.
- **Temperature**: 0.1 for both (deterministic output).
- **Response format**: JSON mode enforced (`responseMimeType` for Gemini, `response_format` for Groq).
- **Structured output**: Both providers return `{fillPercentage, confidence, imageQualityIssues[], reasoning}`.

### Rate Limiting

- **Mechanism**: Sliding window, 10 requests per minute per IP.
- **Storage**: Cloudflare KV with 60-second TTL.
- **Headers**: `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset`.
- **IP detection**: `CF-Connecting-IP` → `X-Forwarded-For` → `"unknown"`.

## Data Storage

### R2 Storage
- **Status:** ACTIVE (Integrated for POC).
- **images/**: `{scanId}.jpg` (optimized user uploads).
- **metadata/**: `{scanId}.json` (AI predictions + user feedback).
- **models/**: TF.js model shards for client-side inference.

### Supabase (Training Moat)
- **training_samples**: Centralized table for ground truth (Admin/User corrections).
- **model_versions**: Tracks MAE performance and active shards.
- **Role**: Backend for Admin Dashboard and source of truth for the augmentation pipeline.

### Feedback Validation Pipeline

Both client and server run identical validation logic:

| Flag             | Condition                                                      | Meaning                                     |
| ---------------- | -------------------------------------------------------------- | ------------------------------------------- | ------ | ----------------------------- |
| `too_fast`       | `responseTimeMs < 3000`                                        | User responded too quickly to have assessed |
| `boundary_value` | `correctedFillPercentage === 0 or 100`                         | Suspicious exact boundary                   |
| `contradictory`  | "too_low" but corrected < AI, or "too_high" but corrected > AI | Rating contradicts correction               |
| `extreme_delta`  | `                                                              | corrected - AI                              | > 30%` | Unreasonably large correction |

Result: `confidenceWeight = max(0.1, 1.0 - flagCount * 0.3)`. Only unflagged feedback is `trainingEligible: true`.

## Security Architecture

| Layer              | Mechanism                                                                       |
| ------------------ | ------------------------------------------------------------------------------- |
| CORS               | Origin allowlist (`ALLOWED_ORIGINS` env var)                                    |
| Rate Limiting      | 10 req/min/IP via KV sliding window                                             |
| Input Validation   | SKU string check, image size cap (4MB), field type validation                   |
| Secrets            | API keys stored as Cloudflare secrets (never in code)                           |
| HTTP Headers       | CSP, X-Frame-Options: DENY, X-Content-Type-Options: nosniff                     |
| Permissions-Policy | camera=self, microphone=(), geolocation=()                                      |
| Privacy            | localStorage consent, no personal data collected, images not linked to identity |

## Testing Architecture

| Scope                    | Tool           | Location             | Count |
| ------------------------ | -------------- | -------------------- | ----- |
| Unit tests               | Vitest + jsdom | `src/test/*.test.ts` | 34    |
| Type checking (frontend) | `tsc -b`       | via `npm run build`  | —     |
| Type checking (worker)   | `tsc --noEmit` | `worker/`            | —     |
| Linting                  | ESLint 9       | `eslint.config.js`   | —     |

Test setup mocks: `HTMLCanvasElement.getContext`, `navigator.mediaDevices.getUserMedia`.

## Deployment Architecture

```
GitHub (main branch)
  │
  ├── GitHub Actions: deploy.yml
  │   ├── Job: test        → npm test + worker tsc --noEmit
  │   ├── Job: build       → npm run build → artifact
  │   ├── Job: deploy-worker → wrangler deploy (main only)
  │   ├── Job: deploy-pages-production → wrangler pages deploy (main only)
  │   └── Job: deploy-pages-preview → PR preview URL + comment
  │
  ▼
Cloudflare
  ├── Pages: Afia-oil-tracker.pages.dev (frontend PWA)
  └── Workers: Afia-worker.savola.workers.dev (API)
      ├── KV: RATE_LIMIT_KV
      ├── R2: Afia-training-data (disabled for POC)
      └── Secrets: GEMINI_API_KEY(s), GROQ_API_KEY
```

### CI/CD Pipeline

- **Push to main**: Full pipeline — test → build → deploy Worker → deploy Pages
- **Pull request**: Test → build → deploy preview → comment preview URL on PR
- **Concurrency**: Cancel in-progress runs on same ref
- **Required secrets**: `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`
