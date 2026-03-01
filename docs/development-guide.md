# Afia App — Development Guide

## Prerequisites

| Requirement        | Version   | Purpose                                                       |
| ------------------ | --------- | ------------------------------------------------------------- |
| Node.js            | 20+       | Runtime for both frontend and worker                          |
| npm                | 10+       | Package manager (lockfile v3)                                 |
| Cloudflare account | Free tier | Worker deployment, KV, R2                                     |
| Gemini API key     | —         | Primary AI provider ([get one](https://aistudio.google.com/)) |
| Groq API key       | —         | Fallback AI provider ([get one](https://console.groq.com/))   |

## Quick Start

### 1. Frontend Setup

```bash
# Clone and install
cd D:\AI\Freelance\Afia-App
npm install

# Configure environment
cp .env.example .env.local
# Edit .env.local → VITE_PROXY_URL=http://localhost:8787

# Start dev server
npm run dev
# → http://localhost:5173/?sku=filippo-berio-500ml
```

### 2. Worker Setup

```bash
cd worker
npm install

# Login to Cloudflare
npx wrangler login

# Set API key secrets (stored in Cloudflare, never in code)
npx wrangler secret put GEMINI_API_KEY
npx wrangler secret put GROQ_API_KEY

# Optional: additional Gemini keys for load distribution
npx wrangler secret put GEMINI_API_KEY2
npx wrangler secret put GEMINI_API_KEY3

# Create KV namespace for rate limiting (first time only)
npx wrangler kv namespace create "RATE_LIMIT_KV"
# → Copy the id into wrangler.toml [[kv_namespaces]] id field

# Start local Worker
npm run dev
# → http://localhost:8787
```

### 3. Test the Full Flow

1. Open `http://localhost:5173/?sku=filippo-berio-500ml`
2. Accept the privacy notice
3. Click "Start Scan"
4. Allow camera access
5. Photograph an oil bottle
6. Click "Use Photo"
7. Wait for AI analysis (3-8 seconds)
8. View results and submit feedback

## Available Test SKUs

| URL                        | Bottle                                                |
| -------------------------- | ----------------------------------------------------- |
| `?sku=filippo-berio-500ml` | Filippo Berio Extra Virgin Olive Oil 500ml (cylinder) |
| `?sku=bertolli-750ml`      | Bertolli Classico Olive Oil 750ml (frustum)           |
| `?sku=safi-sunflower-1l`   | Safi Pure Sunflower Oil 1L (cylinder)                 |
| `?sku=unknown-sku`         | Unknown bottle fallback screen                        |
| (no sku param)             | "No bottle specified" screen                          |

## npm Scripts

### Frontend (root)

| Command              | Description                                          |
| -------------------- | ---------------------------------------------------- |
| `npm run dev`        | Start Vite dev server with HMR (port 5173)           |
| `npm run build`      | TypeScript compile + Vite production build → `dist/` |
| `npm run preview`    | Serve production build locally (port 4173)           |
| `npm test`           | Run Vitest unit tests (34 tests)                     |
| `npm run test:watch` | Run tests in watch mode                              |
| `npm run lint`       | Run ESLint across all .ts/.tsx files                 |

### Worker (`cd worker`)

| Command              | Description                            |
| -------------------- | -------------------------------------- |
| `npm run dev`        | Start wrangler dev server (port 8787)  |
| `npm run deploy`     | Deploy Worker to Cloudflare            |
| `npm run type-check` | TypeScript type check (`tsc --noEmit`) |

## Testing

### Running Tests

```bash
# All unit tests (34 tests across 3 files)
npm test

# Watch mode for active development
npm run test:watch

# Type-check the Worker separately
cd worker && npm run type-check
```

### Test Structure

| File                                   | Tests | What it covers                                                                                                                   |
| -------------------------------------- | ----- | -------------------------------------------------------------------------------------------------------------------------------- |
| `src/test/volumeCalculator.test.ts`    | 16    | Cylinder + frustum volume calculation, boundary cases (0%, 100%), unit conversions (ml→tbsp, ml→cups), remaining+consumed totals |
| `src/test/nutritionCalculator.test.ts` | 7     | Unknown oil type handling, zero volume, correct calorie/fat calculation, proportional scaling, multiple oil types                |
| `src/test/feedbackValidator.test.ts`   | 11    | All 4 validation flags, exact boundary conditions (3000ms, 30% delta), confidence weight decay, minimum weight 0.1               |

### Test Setup

`src/test/setup.ts` mocks:

- `HTMLCanvasElement.prototype.getContext` → returns `null`
- `navigator.mediaDevices.getUserMedia` → resolves with mock stream

### Writing New Tests

- Place tests in `src/test/` with `.test.ts` suffix
- Import from `vitest`: `describe`, `it`, `expect`
- Vitest config is in `vite.config.ts` under `test` key
- Environment: `jsdom` (browser API mocks)
- Globals enabled (`describe`, `it`, `expect` available without import)

## Building for Production

```bash
# Build frontend
npm run build
# Output: dist/ (~209KB JS gzip ~65KB, ~9KB CSS)

# Build includes:
# - TypeScript compilation
# - Vite bundling + tree shaking
# - PWA manifest generation
# - Service worker generation (Workbox)
```

## Deployment

### Manual Deploy

```bash
# Deploy Worker
cd worker && npx wrangler deploy

# Deploy frontend to Cloudflare Pages
npm run build
npx wrangler pages deploy dist --project-name=safi-oil-tracker
```

### CI/CD (GitHub Actions)

The project has a full CI/CD pipeline in `.github/workflows/deploy.yml`:

- **Push to main**: test → build → deploy Worker → deploy Pages (production)
- **Pull request**: test → build → deploy Pages (preview) → comment preview URL

Required GitHub secrets:

- `CLOUDFLARE_API_TOKEN` — API token with Pages + Workers permissions
- `CLOUDFLARE_ACCOUNT_ID` — Your Cloudflare account ID
- `VITE_PROXY_URL` — Production Worker URL (optional, defaults to `https://safi-worker.savola.workers.dev`)

### First-Time Cloudflare Setup

1. Create Cloudflare account + install Wrangler: `npm i -g wrangler && wrangler login`
2. Create KV namespace: `cd worker && npx wrangler kv namespace create RATE_LIMIT_KV`
3. Update `worker/wrangler.toml` with KV namespace ID
4. Set secrets: `npx wrangler secret put GEMINI_API_KEY` (and GROQ_API_KEY)
5. Create Cloudflare Pages project linked to GitHub repo
6. Set `VITE_PROXY_URL` in Pages environment variables
7. Optionally create R2 bucket: `npx wrangler r2 bucket create safi-training-data` and uncomment R2 binding in `wrangler.toml`

## Environment Variables

### Frontend (.env.local)

| Variable         | Required | Default                 | Description                               |
| ---------------- | -------- | ----------------------- | ----------------------------------------- |
| `VITE_PROXY_URL` | Yes      | `http://localhost:8787` | Cloudflare Worker URL (no trailing slash) |

### Worker (wrangler.toml vars + secrets)

| Variable          | Type   | Required | Description                          |
| ----------------- | ------ | -------- | ------------------------------------ |
| `ALLOWED_ORIGINS` | var    | Yes      | Comma-separated allowed CORS origins |
| `GEMINI_API_KEY`  | secret | Yes      | Primary Gemini API key               |
| `GEMINI_API_KEY2` | secret | No       | Optional second key for rotation     |
| `GEMINI_API_KEY3` | secret | No       | Optional third key for rotation      |
| `GROQ_API_KEY`    | secret | Yes      | Groq API key for fallback provider   |

### Worker Bindings (wrangler.toml)

| Binding           | Type         | Required | Description                                 |
| ----------------- | ------------ | -------- | ------------------------------------------- |
| `RATE_LIMIT_KV`   | KV Namespace | Yes      | Sliding window rate limiter storage         |
| `TRAINING_BUCKET` | R2 Bucket    | No       | Image + metadata storage (disabled for POC) |

## Code Conventions

- **No CSS framework** — Pure CSS with custom properties design system in `index.css`
- **Co-located styles** — Each component has a matching `.css` file
- **No barrel exports** — Direct file imports throughout
- **Type-only imports** — `import type { ... }` used consistently
- **Explicit file extensions** — `.ts` / `.tsx` in import paths
- **Functional components** — No class components
- **Hooks pattern** — Custom hooks for platform concerns (camera, network, iOS detection)
- **State machine** — App flow modeled as finite state in `AppState` union type
- **Manual sync** — Bottle registry and feedback validator duplicated between frontend/worker (shared package planned for Phase 2)

## Common Development Tasks

### Adding a New Bottle

1. Add entry to `src/data/bottleRegistry.ts` with SKU, name, oil type, volume, geometry
2. Add matching entry to `worker/src/bottleRegistry.ts` (keep in sync)
3. If new oil type, add nutrition data to `src/data/oilNutrition.ts`
4. Print QR code pointing to `/?sku=<new-sku>`

### Adding a New Oil Type

1. Add entry to `src/data/oilNutrition.ts` with USDA FDC ID, density, per-100g values
2. Reference the `oilType` string in new bottle entries

### Modifying Feedback Validation

1. Update logic in BOTH `src/utils/feedbackValidator.ts` AND `worker/src/validation/feedbackValidator.ts`
2. Update tests in `src/test/feedbackValidator.test.ts`
3. Keep both files in exact sync
