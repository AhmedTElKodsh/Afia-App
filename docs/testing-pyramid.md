# Afia App — Testing Pyramid

> Last updated: 2026-04-08 | Single-SKU POC (`afia-corn-1.5l`)

```
                        ▲
                       ╱ ╲
                      ╱ 4 ╲  Real Device
                     ╱─────╲  phone + afia-app.pages.dev
                    ╱   3   ╲  Manual · highest fidelity
                   ╱─────────╲
                  ╱     3     ╲  Admin TestLab
                 ╱─────────────╲  laptop webcam · desktop simulation
                ╱       2       ╲  Manual · on demand
               ╱─────────────────╲
              ╱         2         ╲  Playwright E2E
             ╱─────────────────────╲  automated · localhost · mocked Worker
            ╱           1           ╲  Runs on every push
           ╱─────────────────────────╲
          ╱             1             ╲  Vitest Unit
         ╱───────────────────────────── logic · hooks · utils
                                        Runs on every push
```

Higher = more realistic, slower, and manual.
Lower = faster, automated, and isolated from external services.

Run **all automated layers** before every push — the pre-push git hook does
this for you. Add **Layer 3** after any UI or AI prompt change. Add **Layer 4**
before any client demo or after a camera-related change.

---

## Layer 1 — Vitest Unit Tests

### What it is

Pure TypeScript logic tests. No browser, no DOM, no camera, no network. Vitest
runs the test files directly in Node with a jsdom environment for any Web API
references. These tests finish in about 2 seconds and are the first line of
defence for the math and business rules the app depends on.

### What it proves

- Volume calculations are correct for both bottle geometries (cylinder,
  frustum) across the full 0–100 % fill range
- Nutrition values scale proportionally from the oil type data
- The feedback validator correctly flags suspicious readings before they reach
  the worker
- API client builds the right request shape and handles error codes
- Camera hook correctly manages `getUserMedia` lifecycle and
  permission-denied state
- Network status hook wires up `navigator.onLine` events correctly
- iOS in-app browser detection fires the redirect hint in the right UA strings

### Test files

| File | Tests | What it covers |
|------|------:|----------------|
| `src/test/volumeCalculator.test.ts` | 16 | Cylinder + frustum formulas, 0 %/100 % edge cases, ml → tbsp/cups |
| `src/test/nutritionCalculator.test.ts` | 7 | kcal + fat from volume, unknown oil type, zero volume, proportional scaling |
| `src/test/feedbackValidator.test.ts` | 11 | All 4 validation flags, confidence weight decay, minimum weight floor |
| `src/test/apiClient.test.ts` | — | POST `/analyze` + POST `/feedback` shaping, HTTP error handling |
| `src/test/useCamera.test.ts` | — | `getUserMedia` mount/unmount, permission denied path |
| `src/test/useOnlineStatus.test.ts` | — | `navigator.onLine` + online/offline event listener |
| `src/test/useIosInAppBrowser.test.ts` | — | UA-string detection, redirect hint trigger condition |

**Total: 196 tests across 7 files**

### How to run

```bash
# From the project root — no servers needed
npm test

# Keep running while you edit (re-runs on save)
npm run test:watch

# Run a single file
npm test src/test/volumeCalculator.test.ts
```

### What it does NOT cover

- React component rendering or user interaction flows → Layer 2
- Real Worker endpoints → Layer 3
- Real camera hardware → Layer 4

---

## Layer 2 — Playwright E2E Tests

### What it is

Full browser automation using Chromium (via Playwright). Tests open the real
built app at `localhost:5173`, click through the UI, and assert on what appears
on screen. The Cloudflare Worker is **mocked** — Playwright intercepts every
`/analyze` and `/feedback` request and returns a scripted response, so no real
API keys or network connection are needed.

### What it proves

- The complete scan flow renders and navigates correctly end-to-end
- Error states (500, 429, network offline, camera denied, bad image) show the
  right messages
- Volume breakdown, fill gauge, nutrition facts, and confidence badge all render
  with the expected values
- The feedback rating grid submits correctly and shows the thank-you state
- Admin login, dashboard tabs, scan history, and CSV/JSON export all work
- The single-SKU restriction is enforced — legacy SKUs fall back gracefully
- The Admin TestLab (idle layout, mode switching, scan → results → retake) works

### Spec files

| File | Tests | Scope |
|------|------:|-------|
| `epic-1-critical-path.spec.ts` | 4 | QR URL → privacy gate → camera → AI result |
| `epic-1-error-handling.spec.ts` | 15 | HTTP 500 / 429 / offline / camera denied / low-quality image |
| `epic-2-features.spec.ts` | 20 | Volume ml, tbsp, cups; nutrition facts; fill gauge; confidence badge |
| `epic-3-feedback.spec.ts` | 5 | Rating grid display, auto-submit "About right", submit with correction |
| `epic-5-6-features.spec.ts` | 14 | Admin auth, dashboard tabs, scan history list + search, data export |
| `epic-7-8-features.spec.ts` | 12 | Single-SKU confirmed card, legacy SKU fallback, CSV/JSON export |
| `qr-simulation.spec.ts` | 18 | URL params, invalid/legacy SKUs, privacy gate, sparkline, QrMockGenerator |
| `scan-flow.spec.ts` | 5 | Smoke test: valid SKU, invalid SKU, no SKU, camera start |
| `test-lab-full-flow.spec.ts` | 18 | TestLab idle, mode switch, debug hint, full scan → results → retake |
| `test-lab.spec.ts` | 3 | TestLab banner, confirmed bottle card, scan view entry |

**Total: 114 tests across 10 spec files**

### What is mocked and what is real

| Thing | Status | Detail |
|-------|--------|--------|
| React rendering | **Real** | Full Vite build, real components |
| Browser navigation | **Real** | Chromium, real DOM, real LocalStorage |
| Cloudflare Worker | **Mocked** | `page.route()` intercepts `/analyze` → returns fixed 65 % fill |
| Camera | **Mocked** | `<canvas>` stub emits a 1 × 1 pixel JPEG; `__AFIA_TRIGGER_ANALYZE__` global triggers the capture |
| Admin session | **Injected** | `addInitScript` writes a valid token directly into `sessionStorage` |
| Gemini / Groq | **Mocked** | Worker is mocked, so AI providers are never called |

### How to run

**Prerequisites:** two terminals running simultaneously.

```bash
# Terminal 1 — frontend dev server
npm run dev
# → http://localhost:5173

# Terminal 2 — worker dev server (needs to be reachable for CORS; responses are mocked)
cd worker && npm run dev
# → http://localhost:8787
```

```bash
# Terminal 3 — run all E2E tests
npx playwright test

# Run a single spec
npx playwright test tests/e2e/epic-1-critical-path.spec.ts

# Watch a test visually (shows the browser window)
npx playwright test --headed tests/e2e/scan-flow.spec.ts

# Step through a failing test interactively
npx playwright test --debug tests/e2e/scan-flow.spec.ts

# Update visual regression snapshots after intentional UI changes
npx playwright test tests/visual-regression.spec.ts --update-snapshots
```

> The pre-push git hook runs `npx playwright test` automatically before every
> `git push`. If any test fails, the push is blocked until the test is fixed.

### What it does NOT cover

- Real Gemini or Groq API responses — only fixed mock JSON is returned
- Real camera frames — only a 1 × 1 pixel stub JPEG is analyzed
- Safari or Firefox rendering — CI runs Chromium only
- Visual pixel regression — `visual-regression.spec.ts` exists but snapshots need
  a manual refresh after UI changes (`--update-snapshots`)

---

## Layer 3 — Admin TestLab (Desktop Simulation)

### What it is

An interactive testing interface built into the admin panel. It uses your
**laptop webcam** to run the full scan flow and connects to the **real Worker**
(Gemini 2.0 Flash → Groq fallback) — so every test produces a genuine AI
response. No mocks. No phone needed.

Use this layer after changing any UI component, AI prompt, or Worker logic, to
confirm the real end-to-end flow works before committing.

### Prerequisites

Both dev servers running (same as Layer 2), **plus** real API keys set:

```bash
# worker/.dev.vars  (gitignored — create this file if it doesn't exist)
GEMINI_API_KEY=your-key-here
GROQ_API_KEY=your-key-here
ADMIN_PASSWORD=1234
```

Or, for production validation, use the deployed admin at
`https://afia-app.pages.dev/?mode=admin` — the Worker already has the secrets
set in Cloudflare.

### How to open

```
http://localhost:5173/?mode=admin
```

Enter the password from `.env.local` (`VITE_ADMIN_PASSWORD=1234`) → click
**Login** → navigate to the **Test Lab** tab in the bottom navigation bar.

---

### Flow Test tab — simulate the user scan

This is the closest a desktop can get to the real user experience.

| Step | What you do | What to verify |
|------|-------------|----------------|
| 1 | Confirmed bottle card shows `🌽 Afia Pure Corn Oil 1.5L ✓` | No dropdown; bottle is pre-selected |
| 2 | Choose **USER SIMULATION** or **API INSPECTOR** mode | Mode card highlights green |
| 3 | Click **Start Test Scan** | Laptop webcam permission prompt appears |
| 4 | Allow camera → point at an oil bottle (or any object) | Live viewfinder renders, no black screen |
| 5 | Tap the capture shutter | Still frame + "Analysing with AI…" spinner |
| 6 | Wait for the AI result (~3–8 s) | Fill gauge animates, percentage renders |
| 7 | Check volume breakdown and nutrition facts | Values match the 1500 ml bottle |
| 8 | Submit a feedback rating | "Thank you" toast appears |

**API INSPECTOR mode** adds a debug panel after each scan showing:
- Raw JSON response from the Worker
- Which provider answered (Gemini or Groq)
- Response latency in ms
- Validation flags from the feedback validator

---

### API Inspector tab — test the Worker without a camera

Sends requests directly to `/analyze` — no webcam required. Useful for
verifying API keys are alive, checking provider fallback, or measuring latency
without the full scan UX.

| Action | How | What it checks |
|--------|-----|----------------|
| Fire test request | Click **Fire Test Request** | Worker receives a 1 × 1 JPEG and returns a valid JSON response |
| Upload a local image | Drag/drop or file picker | Full Gemini pipeline runs on a real image you choose |
| Check provider | Read the `provider` field in the response | Confirms whether Gemini or Groq answered |
| Check latency | Read the `latencyMs` field | Confirms response time is under the 10 s UX target |

---

### "Open as Real User ↗" link

Visible in the Test Lab header. Opens `/?sku=afia-corn-1.5l` in a new browser
tab with **no admin session** — the exact experience a real user gets, on your
desktop. Useful for a quick sanity check without unlocking your phone.

### What it does NOT cover

- Touch events and mobile gestures → Layer 4
- iOS Safari's camera implementation → Layer 4
- PWA install prompt and offline shell → Layer 4
- Physical screen size, safe areas, and notch layout → Layer 4

---

## Layer 4 — Real Device (Highest Fidelity)

### What it is

Manual testing on a physical phone against the **deployed production build** at
`afia-app.pages.dev`. This is the only layer that exercises:

- Real rear camera hardware (autofocus, exposure, actual image quality)
- iOS Safari's WebKit implementation of `getUserMedia`
- Android Chrome's camera API
- PWA install prompt and home-screen launch behaviour
- Offline shell and service worker cache
- Physical touch targets, safe areas, notch / home-bar layout

### When to run Layer 4

- After any camera-related code change (`CameraViewfinder`, `useCamera`)
- After any significant UI layout change (especially mobile breakpoints)
- After the Worker AI prompt changes (to verify real Gemini output looks sensible)
- Before any client demo

### Prerequisites

Push your changes to `master` → GitHub Actions deploys automatically. Wait for
the green check in GitHub → deployment is live at `afia-app.pages.dev`.

---

### How to start a Layer 4 session (QR workflow — no typing on the phone)

Instead of manually typing the URL on the phone, use the Admin QR Codes tab:

| Step | What you do |
|------|-------------|
| 1 | On your **laptop**, open `https://afia-app.pages.dev/?mode=admin` |
| 2 | Login → navigate to the **QR Codes** tab |
| 3 | The QR code automatically encodes `https://afia-app.pages.dev/?sku=afia-corn-1.5l&mode=scan` |
| 4 | **Point your phone camera** at the QR code on the laptop screen |
| 5 | Tap the banner notification on the phone |
| 6 | The live deployed app opens on the phone with the bottle pre-selected |

> **Why this works:** The QR Codes tab reads `window.location.origin` at
> runtime to build the URL. Opening admin on `pages.dev` means the QR always
> encodes the deployed HTTPS URL — which the phone can reach. If you open
> admin on `localhost`, the QR encodes `localhost` and the phone cannot reach it.
> Always use the deployed URL for Layer 4.

---

### Smoke test checklist

Run through this before any client demo or after significant changes:

**Entry point**
- [ ] QR scan from laptop admin page opens the landing screen on the phone
- [ ] URL shows `?sku=afia-corn-1.5l&mode=scan`
- [ ] Bottle name "Afia Pure Corn Oil 1.5L" is visible on the landing card

**Privacy gate**
- [ ] "START SMART SCAN" button is disabled until the privacy checkbox is ticked
- [ ] Ticking the checkbox enables the button immediately

**Camera**
- [ ] Tapping "START SMART SCAN" shows the browser camera permission prompt
- [ ] Allowing permission opens the live viewfinder (no black screen)
- [ ] Rear camera is used by default (not front-facing selfie camera)
- [ ] Shutter button is reachable with one thumb

**Scan + AI result**
- [ ] Tapping shutter captures the frame and shows "Analysing…" spinner
- [ ] AI result appears within 10 seconds
- [ ] Fill gauge animates to the estimated fill level
- [ ] Remaining volume in ml is visible
- [ ] Confidence badge (High / Medium / Low) is visible
- [ ] Nutrition facts section renders without layout overflow

**Feedback**
- [ ] Feedback rating grid appears below the result
- [ ] Tapping "About right" auto-submits and shows the thank-you toast
- [ ] Tapping "Too high" or "Too low" reveals the Submit button

**Navigation**
- [ ] "Scan Another Bottle" returns to the camera viewfinder
- [ ] Browser back button works without crashing

**Admin (on phone)**
- [ ] `pages.dev/?mode=admin` loads the login screen on the phone
- [ ] Logging in works with the correct password
- [ ] Test Lab tab is accessible from the bottom nav on mobile

---

## Coverage Gaps (Known)

| Area | Layer needed | Status |
|------|-------------|--------|
| React component rendering (unit level) | L1 (Vitest + React Testing Library) | Not covered — no component tests written |
| Worker `/analyze` with real Gemini key | L2 (integration, not mocked) | Not covered — always mocked in CI |
| Worker `/feedback` with real DB write | L2 (integration) | Not covered |
| Safari / Firefox E2E | L2 | Chromium only in CI |
| Visual pixel regression | L2 (snapshot) | `visual-regression.spec.ts` exists — baselines need manual refresh after UI changes |
| iOS standalone PWA (Add to Home Screen) | L4 | Camera behaves differently in standalone mode — manual only |

---

## Quick Reference

```bash
# ── Layer 1: unit tests ──────────────────────────────
npm test                            # run once
npm run test:watch                  # watch mode

# ── Layer 2: E2E (auto-runs on git push) ────────────
npx playwright test                 # all 114 tests
npx playwright test --headed        # show the browser
npx playwright test --debug         # step-through debugger
npx playwright test tests/e2e/scan-flow.spec.ts   # single spec

# ── Layer 3: Admin TestLab (local) ──────────────────
# Start both servers first (npm run dev + cd worker && npm run dev)
open http://localhost:5173/?mode=admin

# Layer 3 on deployed build
open https://afia-app.pages.dev/?mode=admin

# ── Layer 4: Real device (QR workflow) ──────────────
# 1. Push to master → wait for CI deploy
# 2. Open on laptop:
open https://afia-app.pages.dev/?mode=admin
# 3. Go to QR Codes tab → scan QR with phone camera
```

## At a Glance

| Layer | Speed | Automated | Uses real AI | Uses real camera | When to run |
|-------|-------|-----------|-------------|------------------|-------------|
| 1 Vitest Unit | ~2 s | ✅ | ✗ | ✗ | Every save / every push |
| 2 Playwright E2E | ~50 s | ✅ | ✗ (mocked) | ✗ (stub) | Every push (pre-push hook) |
| 3 Admin TestLab | Interactive | ✗ | ✅ | ✅ (laptop) | After UI / AI / Worker changes |
| 4 Real Device | Manual | ✗ | ✅ | ✅ (phone) | Before demos; after camera changes |
