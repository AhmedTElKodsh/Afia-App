# Afia App — Source Tree Analysis

## Directory Structure

```
D:\AI\Freelance\Afia-App\
├── src/                              # Frontend PWA (React 19 + TypeScript)
│   ├── main.tsx                      # ★ Entry point — React root render
│   ├── App.tsx                       # ★ Root component — state machine router
│   ├── App.css                       # Photo preview screen styles
│   ├── index.css                     # Design system tokens + global utilities
│   │
│   ├── state/
│   │   └── appState.ts              # AppState union type + AnalysisResult + BottleContext interfaces
│   │
│   ├── api/
│   │   └── apiClient.ts             # HTTP client — analyzeBottle() + submitFeedback()
│   │
│   ├── data/
│   │   ├── bottleRegistry.ts        # BottleEntry[] with SKU, geometry, oil type (3 bottles)
│   │   └── oilNutrition.ts          # NutritionData[] with USDA per-100g values (3 oils)
│   │
│   ├── hooks/
│   │   ├── useCamera.ts             # getUserMedia, canvas capture, image compression
│   │   ├── useOnlineStatus.ts       # navigator.onLine + online/offline events
│   │   └── useIosInAppBrowser.ts    # Detects iOS in-app browsers + standalone PWA mode
│   │
│   ├── utils/
│   │   ├── volumeCalculator.ts      # Cylinder + frustum volume formulas, unit conversions
│   │   ├── nutritionCalculator.ts   # ml → grams → calories/fat via oil density
│   │   ├── feedbackValidator.ts     # Client-side validation (4 flags, confidence weight)
│   │   └── imageCompressor.ts       # Canvas resize to 800px width, JPEG quality 0.78
│   │
│   ├── components/
│   │   ├── QrLanding.tsx            # Bottle info card + "Start Scan" button + offline banner
│   │   ├── CameraCapture.tsx        # Video viewfinder + capture button + permission errors
│   │   ├── ApiStatus.tsx            # Loading animation + error state with retry/retake
│   │   ├── ResultDisplay.tsx        # Fill gauge + volume breakdown + nutrition + feedback
│   │   ├── FillGauge.tsx            # SVG bottle visualization with color-coded fill level
│   │   ├── FeedbackPrompt.tsx       # 4-option rating grid + correction slider
│   │   ├── PrivacyNotice.tsx        # First-scan consent overlay (localStorage persistence)
│   │   ├── IosWarning.tsx           # "Open in Safari" instructions for iOS in-app browsers
│   │   └── UnknownBottle.tsx        # Fallback for missing/unregistered SKU
│   │   └── *.css                    # Co-located component styles (1 CSS per component)
│   │
│   ├── test/
│   │   ├── setup.ts                 # Vitest setup — mocks for canvas + getUserMedia
│   │   ├── volumeCalculator.test.ts # 16 tests — cylinder, frustum, boundaries, conversions
│   │   ├── nutritionCalculator.test.ts # 7 tests — unknown oil, zero vol, scaling
│   │   └── feedbackValidator.test.ts   # 11 tests — all 4 flags, weight decay, minimum
│   │
│   └── assets/
│       └── react.svg                # Default Vite asset (unused)
│
├── worker/                           # Backend API (Cloudflare Worker + Hono)
│   ├── src/
│   │   ├── index.ts                 # ★ Entry point — Hono router, CORS, rate limiting
│   │   ├── analyze.ts               # POST /analyze — validate, call LLM, store scan
│   │   ├── feedback.ts              # POST /feedback — validate, update R2 metadata
│   │   ├── types.ts                 # Env bindings (R2, KV, API keys, ALLOWED_ORIGINS)
│   │   ├── bottleRegistry.ts        # Worker-side SKU registry (manually synced with frontend)
│   │   ├── providers/
│   │   │   ├── gemini.ts            # Gemini 2.5 Flash — system prompt, image analysis, JSON parse
│   │   │   └── groq.ts             # Groq Llama 4 Scout — OpenAI-compatible fallback
│   │   ├── validation/
│   │   │   └── feedbackValidator.ts # Server-side validation mirror (same logic as client)
│   │   └── storage/
│   │       └── r2Client.ts          # storeScan() + updateScanWithFeedback() — R2 operations
│   ├── wrangler.toml                # Cloudflare config — KV binding, CORS origins, R2 (disabled for POC)
│   ├── package.json                 # Hono 4.7, wrangler 4.3, @cloudflare/workers-types
│   └── tsconfig.json
│
├── public/
│   ├── _headers                     # Cloudflare security headers (CSP, X-Frame-Options, Permissions-Policy)
│   ├── icons/
│   │   ├── icon-192.png             # PWA icon 192x192
│   │   └── icon-512.png             # PWA icon 512x512
│   └── vite.svg                     # Default Vite favicon
│
├── .github/
│   └── workflows/
│       └── deploy.yml               # CI/CD — test → build → deploy Worker + Pages (+ PR preview)
│
├── dist/                            # Production build output (gitignored typically)
│
├── index.html                       # SPA entry — meta tags, theme-color, PWA manifest link
├── package.json                     # Frontend deps: React 19, Vite 7, Vitest, vite-plugin-pwa
├── tsconfig.json                    # Project references → tsconfig.app.json + tsconfig.node.json
├── tsconfig.app.json                # App TypeScript config
├── tsconfig.node.json               # Node/Vite TypeScript config
├── vite.config.ts                   # Vite + React + PWA plugin + Vitest config
├── eslint.config.js                 # ESLint 9 flat config — TS + React Hooks + React Refresh
├── .env.example                     # VITE_PROXY_URL template
├── .env.local                       # Local environment (gitignored)
└── README.md                        # Comprehensive project documentation
```

## Critical Directories

| Directory | Purpose | Criticality |
|-----------|---------|-------------|
| `src/components/` | All 9 UI components — the entire user interface | High |
| `src/state/` | State machine types driving the entire app flow | High |
| `src/api/` | Frontend ↔ Worker communication layer | High |
| `worker/src/providers/` | AI provider integrations (Gemini + Groq) | High |
| `worker/src/storage/` | Training data persistence (R2) | Medium |
| `src/data/` | Static data registries (bottles + nutrition) | Medium |
| `src/utils/` | Business logic (volume, nutrition, validation) | Medium |
| `src/hooks/` | Platform abstraction (camera, network, iOS detection) | Medium |
| `public/` | Security headers, PWA icons | Low |

## Entry Points

| Part | Entry File | Description |
|------|-----------|-------------|
| Frontend | `src/main.tsx` | React root render into `#root` |
| Frontend HTML | `index.html` | SPA shell with meta tags |
| Worker | `worker/src/index.ts` | Hono app with CORS + rate limiting + routes |

## Integration Points (Frontend ↔ Worker)

| Endpoint | Direction | Purpose |
|----------|-----------|---------|
| `POST /analyze` | Frontend → Worker | Send `{sku, imageBase64}`, receive `{scanId, fillPercentage, confidence, aiProvider, latencyMs}` |
| `POST /feedback` | Frontend → Worker | Send `{scanId, accuracyRating, llmFillPercentage, responseTimeMs, correctedFillPercentage?}`, receive `{feedbackId, validationStatus}` |
| `GET /health` | Any → Worker | Health check |

## Shared/Duplicated Code

| Code | Frontend Location | Worker Location | Sync Method |
|------|------------------|-----------------|-------------|
| Bottle Registry | `src/data/bottleRegistry.ts` | `worker/src/bottleRegistry.ts` | Manual sync |
| Feedback Validator | `src/utils/feedbackValidator.ts` | `worker/src/validation/feedbackValidator.ts` | Manual sync |

Note: Minor differences exist between copies (e.g., worker version returns `null` vs `undefined` from `getBottleBySku`). A shared package is planned for Phase 2.

## File Organization Patterns

- **Co-located CSS**: Each component has a matching `.css` file in the same directory
- **Feature-based grouping**: Components, hooks, utils, data, api, state are separated by concern
- **Provider pattern**: LLM integrations isolated in `worker/src/providers/`
- **No barrel exports**: Direct imports throughout (no `index.ts` re-exports)
