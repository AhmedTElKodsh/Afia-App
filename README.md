# Afia Oil Tracker

A mobile-first PWA that uses AI vision to estimate the fill level of cooking oil bottles from a single photo. Users scan a QR code on their bottle, photograph it, and instantly see how much oil remains — in ml, tablespoons, and cups — along with nutrition facts for the oil consumed.

> **POC scope — single SKU:** The app is currently hard-locked to one bottle: **Afia Pure Corn Oil 1.5L** (`afia-corn-1.5l`). Legacy multi-bottle support (Epic 7) was retired in favour of a focused POC pilot. Unknown or legacy SKUs gracefully degrade to the "not supported" state.

## How It Works

1. **QR code → landing page** — Each bottle has a QR code encoding `/?sku=<bottle-id>`
2. **Camera capture** — Rear camera activates; user photographs the bottle
3. **AI analysis** — Image is sent to Cloudflare Worker → Gemini 2.5 Flash (with Groq Llama 4 Scout fallback)
4. **Result** — Fill %, volume breakdown (remaining + consumed), nutrition facts, visual fill gauge
5. **Feedback** — User rates accuracy; corrected estimates are stored for future model training

## 🛠 Local-First Development Mode (ACTIVE)

> **IMPORTANT:** Automated Cloudflare deployments are currently **PAUSED** to focus on local testing and hardening. The GitHub Actions workflows in `.github/workflows/` have been disabled (`.yml.disabled`).
>
> **Deployment Strategy:** We deploy to Cloudflare **manually** only when the app is fully functional and tested. This prevents:
> - ❌ Cloudflare endpoint overload from frequent deployments
> - ❌ GitHub Actions errors during active development
> - ❌ Wasted CI/CD minutes on incomplete features
>
> See [LOCAL-DEVELOPMENT-STRATEGY.md](_bmad-output/implementation-artifacts/LOCAL-DEVELOPMENT-STRATEGY.md) for the complete strategy.

To develop and test the app fully locally:

### 1. Frontend (Vite)
```bash
# In the root directory
npm install
cp .env.example .env.local
# Ensure VITE_PROXY_URL=http://localhost:8787 is set in .env.local
npm run dev
```

### 2. Backend (Cloudflare Worker)
```bash
cd worker
npm install
# Copy the local secrets template
cp .dev.vars.example .dev.vars
# EDIT .dev.vars with your actual Gemini/Groq API keys
npm run dev
```

### 3. Local Testing Strategy
- **Unit Tests:** `npm test` (Runs Vitest)
- **E2E Tests:** `npm run test:e2e` (Runs Playwright)
- **Manual Scan:** Open `http://localhost:5173/?sku=Afia-sunflower-1l` and use the local worker.

---

## Tech Stack

| Layer         | Technology                                           |
| ------------- | ---------------------------------------------------- |
| Frontend      | React 19 + TypeScript + Vite 7                       |
| PWA           | vite-plugin-pwa v1 (service worker, offline shell)   |
| Styling       | CSS custom properties (design system), no UI library |
| AI Primary    | Gemini 2.5 Flash (`gemini-2.5-flash-latest`)         |
| AI Fallback   | Groq + Llama 4 Scout                                 |
| API Proxy     | Cloudflare Workers (Hono)                            |
| Storage       | Cloudflare R2 (training images + metadata)           |
| Rate Limiting | Cloudflare KV (10 req/min/IP, sliding window)        |
| Testing       | Vitest 34 unit tests                                 |
| CI/CD         | GitHub Actions → Cloudflare Pages + Workers          |

## Project Structure

```
/
├── src/
│   ├── state/appState.ts          # State machine types
│   ├── data/
│   │   ├── bottleRegistry.ts      # SKU → geometry + oil type
│   │   └── oilNutrition.ts        # USDA per-100g nutrition data
│   ├── utils/
│   │   ├── volumeCalculator.ts    # Cylinder + frustum formulas
│   │   ├── nutritionCalculator.ts # ml → grams → kcal/fat
│   │   ├── imageCompressor.ts     # 800px resize, JPEG 0.78
│   │   └── feedbackValidator.ts   # Client-side validation mirror
│   ├── api/apiClient.ts           # POST /analyze, POST /feedback
│   ├── hooks/
│   │   ├── useCamera.ts           # getUserMedia + canvas capture
│   │   ├── useOnlineStatus.ts     # navigator.onLine + events
│   │   └── useIosInAppBrowser.ts  # Detects non-Safari iOS contexts
│   ├── components/
│   │   ├── QrLanding.tsx          # Bottle info + Start Scan
│   │   ├── CameraCapture.tsx      # Viewfinder + capture button
│   │   ├── ApiStatus.tsx          # Loading + error states
│   │   ├── ResultDisplay.tsx      # Fill gauge + volumes + nutrition
│   │   ├── FillGauge.tsx          # SVG bottle fill animation
│   │   ├── FeedbackPrompt.tsx     # Rating grid + slider
│   │   ├── PrivacyNotice.tsx      # First-scan consent (localStorage)
│   │   ├── IosWarning.tsx         # Non-Safari iOS redirect hint
│   │   └── UnknownBottle.tsx      # Unregistered SKU fallback
│   ├── App.tsx                    # Root state machine
│   ├── App.css                    # Screen-level layout styles
│   └── index.css                  # Design system tokens + utilities
│
├── worker/                        # Cloudflare Worker (Hono)
│   ├── src/
│   │   ├── index.ts               # Router + CORS + rate limiting
│   │   ├── analyze.ts             # POST /analyze handler
│   │   ├── feedback.ts            # POST /feedback handler
│   │   ├── bottleRegistry.ts      # Worker-side SKU registry
│   │   ├── types.ts               # Env bindings interface
│   │   ├── providers/
│   │   │   ├── gemini.ts          # Gemini 2.5 Flash integration
│   │   │   └── groq.ts            # Groq Llama 4 Scout fallback
│   │   ├── validation/
│   │   │   └── feedbackValidator.ts  # Flag: too_fast, contradictory, extreme_delta
│   │   └── storage/
│   │       └── r2Client.ts        # Store scans + update with feedback
│   ├── wrangler.toml
│   ├── package.json
│   └── tsconfig.json
│
├── public/
│   ├── icons/                     # PWA icons (192 + 512)
│   ├── bottles/                   # Bottle reference images (optional)
│   └── _headers                   # Cloudflare security headers
│
└── .github/workflows/
    └── deploy.yml                 # CI/CD: test → build → deploy
```

## Local Development

### Prerequisites

- Node.js 20+
- A Cloudflare account (free tier works)
- Gemini API key ([get one](https://aistudio.google.com/))
- Groq API key ([get one](https://console.groq.com/))

### Frontend Setup

```bash
# Install dependencies
npm install

# Copy environment template
cp .env.example .env.local
# Edit .env.local — set VITE_PROXY_URL=http://localhost:8787

# Start dev server
npm run dev
# → http://localhost:5173/?sku=filippo-berio-500ml
```

### Test Mode (Stage 1 Development)

For PC-based testing without mobile camera:

```bash
# Start dev server
npm run dev

# Open test mode
# → http://localhost:5173/?test=true
```

See [TEST-MODE.md](./TEST-MODE.md) for detailed testing instructions.

### Worker Setup

```bash
cd worker
npm install

# Set API key secrets (stored in Cloudflare — not in code)
npx wrangler secret put GEMINI_API_KEY
npx wrangler secret put GROQ_API_KEY

# Create KV namespace for rate limiting
npx wrangler kv namespace create "RATE_LIMIT_KV"
# → Copy the id into wrangler.toml [[kv_namespaces]] id field

# Create R2 bucket for training data
npx wrangler r2 bucket create Afia-training-data

# Start local Worker (runs at localhost:8787)
npm run dev
```

### Available SKUs for Testing

| QR URL Parameter           | Bottle                                     |
| -------------------------- | ------------------------------------------ |
| `?sku=filippo-berio-500ml` | Filippo Berio Extra Virgin Olive Oil 500ml |
| `?sku=bertolli-750ml`      | Bertolli Classico Olive Oil 750ml          |
| `?sku=Afia-sunflower-1l`   | Afia Pure Sunflower Oil 1L                 |

## Testing

```bash
# Run unit tests (34 tests)
npm test

# Run E2E tests (Playwright - no API keys required)
npm run test:e2e

# Run integration tests (requires Worker running at localhost:8787)
npm run test:integration

# Run all tests (unit + integration + E2E)
npm run test:all

# Watch mode
npm run test:watch

# Type-check Worker
cd worker && npx tsc --noEmit
```

**Note:** Test and hook timeouts are set to 10 seconds (increased from the default 5 seconds) to accommodate CI environment performance variations.

**E2E Tests (Playwright):** All E2E tests run in **mock mode** by default, which means they don't require real API keys or a running Worker. The `playwright.config.ts` automatically sets the `X-Mock-Mode: true` header for all requests, enabling the Worker's mock LLM responses. This allows you to run E2E tests immediately without any setup. E2E tests are located in `tests/e2e/` and are separate from unit tests in `src/test/`.

**Integration Tests:** The integration test suite (`src/test/integration/worker-api.test.ts`) automatically detects if the Worker is running. If the Worker is not available at `http://localhost:8787`, tests will be gracefully skipped with a warning message instead of failing. To run integration tests, start the Worker first with `cd worker && npm run dev`.

### Test Coverage

| File                     | Tests | Coverage                                            |
| ------------------------ | ----- | --------------------------------------------------- |
| `volumeCalculator.ts`    | 16    | Cylinder, frustum, boundary cases, unit conversions |
| `nutritionCalculator.ts` | 7     | Unknown oil, zero volume, proportional scaling      |
| `feedbackValidator.ts`   | 11    | All 4 flag conditions, weight decay, minimum        |

## Building

```bash
# Build PWA for production
npm run build
# → dist/ (JS ~209KB gzip 65KB, CSS ~9KB)

# Preview production build locally
npm run preview
```

## Deployment

### Current Strategy: Manual Deployment Only

**GitHub Actions are disabled** during active development to prevent:
- Cloudflare endpoint overload
- CI/CD errors on incomplete features
- Wasted deployment cycles

**When to Deploy:**
- ✅ All tests passing (unit + E2E + integration)
- ✅ Feature complete and manually tested
- ✅ No critical bugs
- ✅ Ready for production use

### Manual Deployment (Recommended)

**Option 1: Use Deployment Script**
```bash
# Make script executable (first time only)
chmod +x scripts/deploy-manual.sh

# Run deployment
./scripts/deploy-manual.sh
```

The script will:
1. Run all tests
2. Deploy Worker to production
3. Build and deploy Pages
4. Run smoke tests
5. Display production URLs

**Option 2: Manual Commands**
```bash
# 1. Run tests first
npm test && npm run test:e2e

# 2. Deploy Worker
cd worker && npx wrangler deploy --env stage1

# 3. Build and deploy Pages
cd .. && npm run build
npx wrangler pages deploy dist --project-name=afia-app --branch=master

# 4. Verify deployment
curl https://afia-worker.savola.workers.dev/health
```

### First-time Cloudflare Setup

If you haven't set up Cloudflare yet:

1. Create a Cloudflare account and install Wrangler: `npm i -g wrangler && wrangler login`
2. Create the R2 bucket: `cd worker && npx wrangler r2 bucket create afia-training-data`
3. Create the KV namespace: `npx wrangler kv namespace create RATE_LIMIT_KV`
4. Update `worker/wrangler.toml` with the real KV namespace IDs
5. Set secrets: `npx wrangler secret put GEMINI_API_KEY` and `GROQ_API_KEY`
6. Create a Cloudflare Pages project: `npx wrangler pages project create afia-app`

### Future: Re-enabling GitHub Actions

When the app is stable, you can re-enable CI/CD with **manual triggers only**:

```bash
# Rename workflow files to re-enable them
mv .github/workflows/deploy-stage1.yml.disabled .github/workflows/deploy-stage1.yml
```

Then modify the workflow to use manual triggers:
```yaml
on:
  workflow_dispatch:  # Manual trigger only - no automatic pushes
```

See [LOCAL-DEVELOPMENT-STRATEGY.md](_bmad-output/implementation-artifacts/LOCAL-DEVELOPMENT-STRATEGY.md) for details.

## Key Design Decisions

**`display: "browser"` (not standalone)** — iOS WebKit has a bug where `getUserMedia` fails in standalone PWA mode. Using browser mode keeps the address bar but ensures camera works on all iOS devices. `apple-mobile-web-app-capable` is deliberately absent from `index.html`.

**Hybrid AI + Math** — The LLM estimates fill percentage (0–100%); deterministic cylinder/frustum formulas calculate exact volume. This gives reliable volume calculations even when the LLM estimate has minor inaccuracies.

**Training data from day one** — Every scan stores the image and metadata to R2. User feedback is validated (4 flags: `too_fast`, `boundary_value`, `contradictory`, `extreme_delta`) before being marked `trainingEligible: true`. This builds a labeled dataset automatically.

**Feedback validation thresholds** — `responseTimeMs < 3000` (too fast), `|corrected - ai| > 30%` (extreme delta). These are synchronized between client (`src/utils/feedbackValidator.ts`) and worker (`worker/src/validation/feedbackValidator.ts`).

## Architecture

```
Browser (PWA)
    │ POST /analyze {sku, imageBase64}
    ▼
Cloudflare Worker (Afia-worker.savola.workers.dev)
    ├── CORS check (allowlist)
    ├── Rate limit (10/min/IP via KV)
    ├── SKU validation
    ├── Gemini 2.5 Flash ──────────────► Google AI API
    │   └── on failure → Groq Llama 4  ► Groq API
    ├── R2 store image + metadata (waitUntil — non-blocking)
    └── Return {scanId, fillPercentage, confidence, aiProvider, latencyMs}
    │
    │ POST /feedback {scanId, accuracyRating, llmFillPercentage, responseTimeMs}
    ▼
Cloudflare Worker
    ├── Layer 1 validation (4 flags)
    ├── R2 update metadata with feedback
    └── Return {feedbackId, validationStatus}
```

## Epics Status

| Epic                           | Stories | Status      |
| ------------------------------ | ------- | ----------- |
| 1: Core Scan Experience        | 14      | ✅ Complete |
| 2: Rich Consumption Insights   | 7       | ✅ Complete |
| 3: Continuous Improvement Loop | 8       | ✅ Complete |
| 4: Resilience & Edge Cases     | 7       | ✅ Complete |
| 5: Deployment & Operations     | 2       | ✅ Complete |
