# Safi Oil Tracker — Claude Code Memory

## Project Overview
PWA for cooking oil bottle fill estimation using LLM vision. React+Vite+TypeScript frontend, Cloudflare Worker backend.

## Key Architecture Decisions
- `display: "browser"` (NOT standalone) — iOS WebKit camera bug in standalone mode
- `apple-mobile-web-app-capable` MUST be absent from index.html
- Worker uses Hono for routing; Gemini 2.5 Flash primary, Groq Llama 4 Scout fallback
- R2 stores training data; KV backs rate limiting (10 req/min/IP)

## Validated Thresholds (standardized across all docs + code)
- Feedback too_fast: `responseTimeMs < 3000`
- Feedback extreme_delta: `Math.abs(corrected - llm) > 30`

## Project Structure
```
/                       — React PWA (Vite)
  src/
    state/appState.ts   — AppState union type
    data/bottleRegistry.ts
    data/oilNutrition.ts
    utils/volumeCalculator.ts
    utils/nutritionCalculator.ts
    utils/imageCompressor.ts  (800px, JPEG 0.78)
    utils/feedbackValidator.ts
    api/apiClient.ts
    hooks/useCamera.ts
    components/          — QrLanding, CameraCapture, ApiStatus, ResultDisplay, FillGauge, FeedbackPrompt, UnknownBottle
    test/               — Vitest tests (34 passing)
  vite.config.ts        — uses vitest/config defineConfig (NOT vite's)
  .env.local            — VITE_PROXY_URL=http://localhost:8787

worker/                 — Cloudflare Worker (Hono)
  src/
    index.ts            — Hono router + CORS + rate limiting
    analyze.ts          — POST /analyze handler
    feedback.ts         — POST /feedback handler
    bottleRegistry.ts   — duplicate of client registry
    types.ts            — Env interface
    providers/gemini.ts
    providers/groq.ts
    validation/feedbackValidator.ts
    storage/r2Client.ts
  wrangler.toml         — KV/R2 bindings (placeholder IDs need real values)
  tsconfig.json         — allowImportingTsExtensions: true, noEmit: true
```

## TypeScript Fixes Learned
- vitest/config `defineConfig` (not vite's) to get `test` property in vite.config.ts
- Worker tsconfig needs `allowImportingTsExtensions: true` + `noEmit: true` for .ts imports

## New Hooks Added
- `src/hooks/useOnlineStatus.ts` — navigator.onLine + events
- `src/hooks/useIosInAppBrowser.ts` — detects Instagram/FB/standalone iOS (non-Safari)

## New Components Added (Epic 4)
- `IosWarning.tsx` — shown before anything else on problematic iOS contexts
- `PrivacyNotice.tsx` — first-scan modal overlay with localStorage persistence (`safi_privacy_accepted`)
- Privacy notice shown as overlay on IDLE state in App.tsx

## All Epics Complete (POC)
38 stories across 5 epics — all implemented.

## CI/CD
- `.github/workflows/deploy.yml` — test → build → deploy worker → deploy pages
- PR pushes → preview deployment, URL commented on PR
- Requires GitHub secrets: CLOUDFLARE_API_TOKEN, CLOUDFLARE_ACCOUNT_ID

## Build Commands
- Frontend: `npm test` (34 tests), `npm run build` (clean)
- Worker: `cd worker && npx tsc --noEmit` (clean)

## User Preferences
- Ahmed — technical, concise communication preferred
- BMad framework used for planning; all planning artifacts in `_bmad-output/planning-artifacts/`
