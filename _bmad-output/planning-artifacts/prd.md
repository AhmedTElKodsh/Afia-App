---
stepsCompleted:
  [
    step-01-init,
    step-02-discovery,
    step-02b-vision,
    step-02c-executive-summary,
    step-03-success,
    step-04-journeys,
    step-05-domain,
    step-06-innovation,
    step-07-project-type,
    step-08-scoping,
    step-09-functional,
    step-10-nonfunctional,
    step-11-polish,
  ]
classification:
  projectType: web_app
  projectSubType: PWA
  domain: consumer_health_tech
  complexity: high
  projectContext: greenfield
inputDocuments:
  - product-brief-Safi-Image-Analysis-2026-02-26.md
  - research/technical-oil-bottle-ai-app-poc-research-2026-02-26.md
  - architecture.md
  - sprint-change-proposal-2026-04-14.md
  - research/technical-browser-vision-apis-bottle-scanning-research-2026-04-16.md
workflowType: "prd"
project_name: "Safi Oil Tracker"
user_name: "Ahmed"
date: "2026-02-26"
lastEdited: "2026-04-16"
editHistory:
  - date: "2026-04-16"
    changes: "Incorporate Stage 2 Local AI scope, Admin Dashboard, and enhanced Result screen features (55ml slider)."
  - date: "2026-04-16"
    changes: "Stage 2 technical research updates: fix FR45 inference targets (platform-specific WASM/WebGL), add iOS WASM prohibition, add FR49 brand/variant classifier, update FR46 routing, fix NFR performance table, add COOP/COEP security requirement, add 8 technical constraint entries (iOS backend, OpenCV.js, DeviceOrientation permission, distance guidance via bounding box)."
  - date: "2026-04-16"
    changes: "PRD validation fixes: FR10 compression target (≤800px/≤85% JPEG), FR21 remove normalization impl detail, FR34 remove 'clear', FR38 notice word limit (≤100 words), FR43 remove SVG impl detail, FR48 remove field name impl detail, NFR Scalability clarify 'structural changes'. Improvements: FR44-FR46 annotated [Phase 3], FR47-FR48 annotated [Sprint CP], FR46 edge case added (no-QR + low-confidence → manual SKU prompt)."
---

# Product Requirements Document — Safi Oil Tracker

**Author:** Ahmed
**Date:** 2026-02-26
**Status:** POC v1 — Ready for Implementation

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Project Classification](#project-classification)
3. [Success Criteria](#success-criteria)
4. [Product Scope & Phased Roadmap](#product-scope--phased-roadmap)
5. [Domain-Specific Requirements](#domain-specific-requirements)
6. [Innovation & Novel Patterns](#innovation--novel-patterns)
7. [PWA Requirements](#pwa-requirements)
8. [Functional Requirements](#functional-requirements)
9. [Non-Functional Requirements](#non-functional-requirements)

---

## Executive Summary

Safi Oil Tracker is a Progressive Web App (PWA) that enables home cooking oil consumers to measure remaining oil in their bottle using their phone camera and AI vision analysis. Accessed instantly via QR code printed on the bottle — no app store download required — the app photographs the bottle, estimates the fill level using an LLM vision API, and delivers the result in ml, tablespoons, and cups alongside nutritional facts for the estimated consumed amount.

The POC targets a single oil company's bottle lineup (2–3 SKUs, clear glass, known geometry), with the starting level anchored at a full bottle (100%). Volume is calculated client-side using pre-registered bottle geometry (cylinder/frustum math) rather than relying solely on LLM precision — giving ±15% accuracy on clear glass bottles. Every scan captures image + metadata + user feedback for future model fine-tuning. Persistent storage in Cloudflare R2 and Supabase is integrated immediately to create a continuous data collection engine for Stage 2 local AI models.

**Target users:** Health-conscious home cooks who want passive dietary awareness without manual measuring — particularly those tracking calorie or fat intake. Secondary stakeholder: the oil company, which gains customer engagement data and a direct digital touchpoint.

**Problem solved:** Consumers have no practical way to track how much oil they've consumed from a bottle. Visual estimation is unreliable, measuring before every use is disruptive, and no existing product bridges the gap between physical cooking and dietary tracking.

**Why now:** LLM vision APIs (Gemini 2.5 Flash) now have sufficient accuracy and low enough latency to make camera-based estimation viable as a consumer product. Free-tier infrastructure (Cloudflare, Gemini) makes the POC zero-cost.

### What Makes This Special

**The insight:** Every oil bottle has a defined geometry. The LLM estimates only a fill _percentage_ from the photo; precise volume is calculated deterministically client-side using known bottle dimensions. This hybrid approach (imprecise AI + precise math) achieves ±15% accuracy without requiring hardware or specialized CV models.

**The differentiator:** Zero friction. QR code on the bottle → camera open in 2 taps → result in under 8 seconds. No account, no download, no manual entry. The dietary insight arrives at the moment of maximum motivation — right after cooking.

**The long game:** Every scan is a labeled training example (image + LLM prediction + user correction). The POC is simultaneously a consumer product and a data collection engine. The system is designed to get smarter with use without requiring a separate data collection phase.

---

## Project Classification

| Field               | Value                                                                             |
| ------------------- | --------------------------------------------------------------------------------- |
| **Project Type**    | Web App — Progressive Web App (SPA)                                               |
| **Domain**          | Consumer Health Tech                                                              |
| **Complexity**      | High                                                                              |
| **Project Context** | Greenfield                                                                        |
| **POC Scope**       | 2–3 bottle SKUs, clear glass, full-bottle baseline, Cloudflare + Gemini free tier |

---

## Success Criteria

### User Success

- User completes full scan flow (QR → camera → result) in **under 8 seconds** from photo capture to result display
- Volume output in ml, tablespoons, and cups is immediately legible without explanation
- Confidence level is surfaced clearly — "Estimate may be less accurate" for medium; retake prompt for low
- Feedback submission rate ≥ 30% of scans
- User does not abandon mid-flow due to camera errors, slow API, or confusing UI

### Business Success

- ≥ 50 real scans collected with usable training data within the first month of deployment
- LLM fill-level estimates within ±15% MAE for clear glass bottles across all registered SKUs
- ≥ 60% of feedback submissions pass Layer 1 validation (`validationStatus: accepted`)
- $0/month infrastructure cost throughout POC (all services on free tiers)
- POC demonstrates sufficient accuracy and UX quality to justify Phase 2 investment

### Technical Success

- API end-to-end latency (photo → result) p95 **< 8 seconds** on a standard mobile connection
- Gemini → Groq fallback activates transparently — user sees no difference
- Layer 1 feedback validation correctly flags contradictory, boundary-value, and too-fast submissions
- CI/CD deploys cleanly to Cloudflare Pages + Worker on every `main` push
- All unit tests pass: `volumeCalculator`, `nutritionCalculator`, `feedbackValidator`, `imageCompressor`
- App shell loads offline; scan page shows "Network required" when offline
- iOS camera functions correctly in Safari browser mode (not standalone)

### Measurable Outcomes

| Outcome                              | Target                                        | Measurement                                             |
| ------------------------------------ | --------------------------------------------- | ------------------------------------------------------- |
| Scan completion rate                 | ≥ 80% of initiated scans reach result display | R2 metadata: scans with `fillPercentage` populated      |
| API latency (p95)                    | < 8 seconds                                   | Worker latency logs                                     |
| LLM accuracy (MAE)                   | ≤ 15% fill level delta from user correction   | R2: `llm.fillPercentage` vs `userFeedback.userEstimate` |
| Feedback acceptance rate             | ≥ 60% `validationStatus: accepted`            | R2 metadata aggregate                                   |
| Infrastructure cost                  | $0/month                                      | Cloudflare + Gemini dashboards                          |
| Training-eligible records at 30 days | ≥ 30 records                                  | R2 metadata: `trainingEligible: true`                   |

---

## Product Scope & Phased Roadmap

### MVP — POC v1 (Current Scope)

**Goal:** Prove the core assumption — _"An LLM can estimate fill level accurately enough to be useful for dietary tracking."_
**Resources:** 1 full-stack developer, 2–4 weeks, $0 infrastructure.

**Core user journey:**

> User scans QR on oil bottle → app opens pre-loaded with bottle context → user captures photo → AI estimates fill level → app displays remaining/consumed in ml/tbsp/cups + nutritional facts → user optionally submits accuracy feedback

**Must-have capabilities:**

| Capability                                | Rationale                                 |
| ----------------------------------------- | ----------------------------------------- |
| QR deep link → PWA with SKU pre-loaded    | Core differentiator — zero-friction entry |
| Camera capture + image compression        | Core input                                |
| Gemini 2.5 Flash vision analysis (fill %) | The POC hypothesis                        |
| Volume calculation (ml → tbsp → cups)     | Core value output                         |
| Nutritional facts for consumed amount     | Core value output                         |
| Groq fallback if Gemini fails             | Single provider = unreliable POC          |
| User feedback prompt + Layer 1 validation | Training data collection + quality        |
| R2 scan image + metadata storage          | POC doubles as data collection engine     |
| 2–3 registered bottle SKUs (clear glass)  | Minimum to demonstrate the pattern        |
| CI/CD (GitHub Actions → Cloudflare)       | Maintainable deployment                   |

**Accepted POC constraints:** Starting level = 100% (full bottle); clear glass only; no user accounts; privacy notice as inline text.

**🚨 CRITICAL POC LIMITATION — Full Bottle Baseline:**

This POC assumes the user's first scan occurs when the bottle is brand new (100% full). The app tracks consumption from that baseline forward. This means:

- ✅ **Works:** User buys new bottle → scans QR immediately → uses app to track consumption over time
- ❌ **Doesn't work:** User buys bottle → uses some oil → then scans QR for first time → app has no baseline

**User-facing communication:** The app will display a clear notice on first scan: _"For accurate tracking, scan your bottle when it's brand new. This POC tracks consumption from a full bottle baseline."_

**Rationale:** Custom starting level requires either (a) manual user input ("My bottle is 60% full") which adds friction, or (b) AI estimation of absolute volume which is less accurate than percentage estimation. The POC prioritizes accuracy and zero-friction over flexibility.

**Phase 2 solution:** Allow users to set custom starting level with explicit accuracy trade-off messaging.

### Phase 2 — User Engagement (Post-POC Validation)

- User accounts (email/social login) + scan history timeline
- Custom starting level ("My bottle is already half used")
- Push notifications ("Time to restock?")
- Additional SKUs

### Phase 3 — Model Intelligence (~Month 4–6, 500+ Training-Eligible Scans)

- **Epic 7 local model pipeline activates** at 500 training-eligible scans
- TF.js MobileNetV3-Small CNN regressor deployed as primary inference route (FR45/FR46)
- Supabase training database + augmentation pipeline (Epic 7.1/7.2) deployed at POC launch to accumulate training data immediately — gated activation at 500 base scans
- Fine-tune Gemini Flash via Google AI Studio (1,000+ scans)
- Layer 2 statistical outlier detection on feedback

### Phase 4 — Platform Scale

- Native mobile app (React Native) — reliable iOS camera, offline scan
- Dynamic bottle shape detection for unregistered bottles
- Multi-brand open bottle registry API
- Barcode scanning (UPC — no QR required)
- Multi-language support

### Phase 5 — Business Intelligence

- Aggregated anonymized consumption analytics for the oil company
- Regional consumption pattern reports
- Product size optimization insights
- Loyalty program integration

### Risk Mitigation

| Risk Category | Risk                             | Mitigation                                                                                     |
| ------------- | -------------------------------- | ---------------------------------------------------------------------------------------------- |
| Technical     | LLM accuracy worse than ±15%     | Prompt refinement + few-shot examples as first lever                                           |
| Technical     | iOS camera reliability           | Safari browser mode hard constraint; baked into architecture                                   |
| Technical     | Gemini API latency > 8s          | `thinkingBudget: 0` + 800px compression; Groq fallback                                         |
| Market        | Users don't submit feedback      | 4-button UI (no slider for "About right"); incentive copy if rate < 20%                        |
| Market        | Client unsatisfied with accuracy | Set ±15% expectation before POC launch; frame as improving baseline                            |
| Resource      | Developer bandwidth              | Core value (QR → camera → result) achievable in ~1 week; CI/CD and Groq fallback are droppable |

---

## Domain-Specific Requirements

### Compliance & Regulatory

- No regulatory pathway required — not a medical device, diagnostic tool, or clinical product. No FDA 510(k), no HIPAA.
- USDA FoodData Central nutrition data is authoritative (CC0 license). App must display a disclaimer: results are **estimates**, not certified nutritional analysis.
- Scan images and metadata are stored for model training. A brief privacy notice is required before the user's first scan.
- No COPPA concerns — app does not target users under 13; no account creation.

### Technical Constraints

- **Accuracy framing:** ±15% is the honest ceiling for LLM vision on clear glass. UI must communicate this as an estimate, never a precise measurement.
- **iOS camera:** WebKit bug in standalone PWA mode (iOS 18.0–18.1). Hard constraint: Safari browser mode only. `apple-mobile-web-app-capable` must be absent. "Open in Safari" fallback required.
- **Network dependency:** Scan requires internet (Gemini API call). App shell loads offline; scan page must handle offline state with clear messaging.
- **Image storage:** Bottle photos stored in R2 may contain kitchen backgrounds. No PII directly captured, but must be disclosed in the privacy notice.
- **Local ML backend — iOS prohibition:** ONNX Runtime Web WASM backend must not be used on iOS Safari (active crash bug: CPU stuck at 400%+, memory unbounded, process killed — microsoft/onnxruntime #22086, #22776, #26827). WebGL backend is the mandated iOS fallback for all on-device inference. Implement backend detection at startup: `/iPhone|iPad/i.test(navigator.userAgent)` → force WebGL.
- **OpenCV.js — Vite bundling:** OpenCV.js WASM must be loaded inside a Web Worker, not imported on the main thread. Direct Vite import causes `Module is not defined` error (vitejs/vite #5259). Web Worker loading is both the workaround and the correct architecture pattern.
- **DeviceOrientationEvent — iOS permission:** `DeviceOrientationEvent.requestPermission()` is required on iOS 13+. Must be triggered by an explicit user tap with a brief explanation (e.g., "Enable tilt guidance" button). Calling on page load or without user gesture will be silently denied.
- **Distance guidance — ProximityEvent deprecated:** The W3C Proximity API is non-standard and unsupported outside Firefox legacy. Distance guidance must use bounding-box size heuristics from the detection model output: if detected bottle bounding box occupies < 20% of frame area, surface "Move closer"; if > 80%, surface "Step back."

### Integration Requirements

| Integration           | Role                     | Notes                                                                |
| --------------------- | ------------------------ | -------------------------------------------------------------------- |
| Gemini 2.5 Flash      | Primary vision provider  | `responseMimeType: 'application/json'`; `thinkingBudget: 0`          |
| Groq Llama 4 Scout    | Fallback vision provider | OpenAI-compatible; activates on Gemini 429/5xx                       |
| USDA FoodData Central | Nutrition data source    | Bundled as static JSON at build time; CC0 license; no live API calls |
| Cloudflare R2         | Scan storage             | Worker binding; zero egress fees                                     |

---

## Innovation & Novel Patterns

### Detected Innovation Areas

**1. Hybrid AI + Geometry Measurement**
LLM estimates only fill _percentage_; precise volume is calculated deterministically from pre-registered bottle geometry. This achieves ±15% accuracy without demanding precision from the imprecise component — a deliberate separation of concerns. Distinct from pure LLM volume estimation (unreliable) and from CV depth-sensing (requires hardware).

**2. QR Code as Zero-Friction Entry Point**
The QR code on the physical product pre-loads all context (SKU, geometry, nutrition profile) before the user opens the camera. No installation, no account, no onboarding. Eliminates the largest drop-off point in consumer health apps: setup friction before first value delivery.

**3. POC as Training Data Engine**
Every scan generates a labeled training example (image + LLM prediction + user correction). Layer 1 validation ensures signal quality from day one. No separate data collection phase required — the product and the training pipeline are the same thing.

**4. Multi-Provider LLM Resilience at Edge**
Gemini → Groq fallback chain runs inside a Cloudflare Worker (zero cold starts, IP rate limiting, R2 binding). Keeps API keys server-side, provides graceful degradation, adds persistence — all without an application server.

### Competitive Landscape

- No direct competitor for AI-powered oil level tracking via QR + camera
- Manual log apps (MyFitnessPal) — high friction, no visual capture
- Smart kitchen hardware (connected scales) — requires hardware purchase
- Receipt-scanning apps — scan labels, not remaining content

Safi occupies an uncontested niche: **passive dietary tracking via product-embedded QR + AI vision, zero hardware**.

### Innovation Validation (POC)

| Aspect                      | Validation Method                        | Target        |
| --------------------------- | ---------------------------------------- | ------------- |
| Hybrid accuracy             | LLM fill% vs user corrections, ≥50 scans | MAE ≤ 15%     |
| Zero-friction entry         | Scan completion rate                     | ≥ 80%         |
| Feedback as training signal | Submission rate + acceptance rate        | ≥ 30% / ≥ 60% |
| Edge AI proxy latency       | Worker p95 latency                       | < 8 seconds   |

---

## PWA Requirements

### Architecture

Single-Page Application (SPA), `display: "browser"` — not `"standalone"`. Browser mode is mandatory for iOS camera compatibility (WebKit bug in standalone mode). Android gets full PWA capabilities including install prompt.

### Browser Support Matrix

| Platform | Browser             | Support Level                     |
| -------- | ------------------- | --------------------------------- |
| Android  | Chrome 120+         | Full — primary target             |
| Android  | Firefox 120+        | Full                              |
| iOS      | Safari 17+          | Full (browser mode only)          |
| iOS      | Chrome (iOS)        | Partial — same WebKit constraints |
| Desktop  | Chrome/Firefox/Edge | Dev + QA only                     |

### PWA Manifest (Key Fields)

```json
{
  "display": "browser",
  "start_url": "/",
  "scope": "/"
}
```

`apple-mobile-web-app-capable` meta tag must be **absent**.

### Service Worker Caching

| Asset                                | Strategy               | Rationale                 |
| ------------------------------------ | ---------------------- | ------------------------- |
| App shell (JS/CSS/HTML)              | CacheFirst             | Instant repeat loads      |
| API routes (`/analyze`, `/feedback`) | NetworkOnly            | Never cache LLM responses |
| Bottle images (`/bottles/*.png`)     | CacheFirst, 30-day TTL | Static assets             |

### Responsive Design

- Primary viewport: mobile portrait 375–430px
- Touch targets: ≥ 44×44px
- Camera viewfinder: full-screen on mobile
- Result display: single-scroll, no horizontal scroll
- No desktop-specific layouts required

### Accessibility

WCAG 2.1 AA — pragmatic POC implementation:

- Text contrast ratio ≥ 4.5:1
- Touch targets ≥ 44×44px
- Error and status states conveyed via text + icon (not color alone)
- Result values rendered as text (screen reader compatible)
- Camera permission denied state includes plain-language grant instructions

---

## Functional Requirements

### Bottle Entry & Context Loading

- FR1: User can navigate to the app via a QR code scan that pre-loads the correct bottle context (SKU, geometry, oil type)
- FR2: The app can display the registered bottle name, capacity, and oil type upon QR-initiated entry
- FR3: The app can detect when a scanned SKU is not registered and present an appropriate fallback state
- FR4: The app can load bottle geometry and nutritional profile from local bundled data without network access

### Camera Capture

- FR5: User can activate the rear-facing camera directly within the app without leaving the browser
- FR6: User can see a live camera viewfinder with a framing guide overlay to align the bottle
- FR7: User can capture a still photo of the oil bottle from the live viewfinder
- FR8: User can preview the captured photo before submitting it for analysis
- FR9: User can retake the photo if the preview is unsatisfactory
- FR10: The app can compress the captured image to ≤ 800px on the longest dimension at ≤ 85% JPEG quality before transmission

### AI Vision Analysis

- FR11: The app can submit the captured bottle photo to an AI vision API for fill level estimation
- FR12: The system can estimate the oil fill level as a percentage (0–100%) from the submitted photo
- FR13: The system can return a confidence level (high / medium / low) alongside the fill percentage estimate
- FR14: The system can automatically fall back to a secondary AI provider if the primary provider is unavailable
- FR15: The app can surface image quality issues (blur, poor lighting) to the user when the AI detects them

### Volume & Nutrition Calculation

- FR16: The app can calculate remaining oil volume (ml) from the estimated fill percentage and known bottle geometry
- FR17: The app can calculate consumed oil volume (ml) by subtracting remaining from total bottle capacity
- FR18: The app can convert oil volumes to tablespoons and cups for display
- FR19: The app can calculate nutritional values (calories, total fat, saturated fat) for the consumed volume using bundled USDA reference data
- FR20: The app can display remaining and consumed volumes simultaneously in ml, tablespoons, and cups

### Result Display

- FR21: User can view the estimated fill level via a horizontal line marker positioned at the AI-estimated fill level on the captured image
- FR22: User can interact with a 55ml-stepped vertical slider to plan consumption and see visual cup equivalents (1/2 cup = 55ml)
- FR23: User can view nutritional facts (calories, total fat, saturated fat) for the estimated consumed amount
- FR24: User can see a confidence indicator that communicates the reliability of the estimate
- FR25: User can see a prompt to retake the photo when the AI returns low confidence

### User Feedback Collection

- FR26: User can indicate whether the AI fill estimate was accurate ("About right", "Too high", "Too low", "Way off")
- FR27: User can provide a corrected fill percentage estimate via the 55ml-stepped slider when marking the result inaccurate
- FR28: The system must enforce that the bottle is captured from the frontside with the handle on the right for valid analysis
- FR29: The system can store validated feedback alongside the original scan record

### Data Collection & Storage

- FR30: The system can store the captured bottle image for future model training purposes
- FR31: The system can store scan metadata (SKU, timestamp, AI provider, fill estimate, confidence, latency) for each scan
- FR32: The system can update the stored scan record with validated user feedback after submission
- FR33: The system can mark scan records as training-eligible when they pass all validation criteria

### Error & Edge Case Handling

- FR34: User can see an error message with a retry action when the AI analysis fails
- FR35: User can see a network unavailability message when attempting to scan without internet
- FR36: User can see guidance to open the app in Safari when accessing from an incompatible iOS browser context
- FR37: User can see a camera permission denied message with instructions to grant access in device settings

### Privacy & Transparency

- FR38: User can view a privacy notice of ≤ 100 words explaining that scan images are stored for AI model improvement before their first scan
- FR39: The app can display a disclaimer that results are estimates (±15%) and not certified nutritional analysis

### Multi-Provider Key Management

- FR40: The Worker maintains a pool of GEMINI_KEY_1..GEMINI_KEY_N secrets (minimum 2); rotates round-robin per request; on 429 advances to next key; pool exhausted → falls to Groq fallback
- FR41: The LLM prompt includes 2 low-resolution reference images (100% and 25% fill levels) as few-shot visual anchors; combined overhead < 15KB per request

### Consumption Measurement

- FR42: The result screen displays a vertical consumption tracking slider anchored at the confirmed fill level; steps of 55ml; minimum step 55ml; slider stops at last valid step if remaining < 55ml
- FR43: The slider drives a cup visualization below it: n × 55ml = n/2 cups displayed as cup icons (half-filled at odd steps, full at even steps); "Remaining after use: Nml" updates in real time

### Training Data Pipeline

- FR44: [Phase 3] A Supabase Postgres database stores training-eligible scan records: image URL, confirmed fill %, label source, confidence weight, augmentation flag, train/val/test split
- FR45: [Phase 3] A TF.js MobileNetV3-Small CNN regressor runs client-side; lazy-loaded from Cloudflare R2 (~5MB); cached in IndexedDB; inference target ≤ 150ms WASM (Android) / ≤ 100ms WebGL (iOS); MAE target ≤ 10%; iOS Safari must use WebGL backend — WASM backend is prohibited on iOS due to active crash bug (microsoft/onnxruntime #22086, #26827: CPU 400%+, unbounded memory growth, process kill); WebGPU upgrade path available at Safari 26 stable via feature flag
- FR46: [Phase 3] The client routes fill-level inference to the local model when confidence ≥ 0.75; falls through to the LLM Worker when below threshold or model not yet loaded; on iOS, if WebGL backend unavailable, falls through to LLM Worker regardless of confidence; brand classification result (FR49) used to pre-populate bottle context if classifier confidence ≥ 0.80, falls back to QR-loaded SKU if below threshold or model unavailable; if brand classifier confidence < 0.80 AND no QR SKU is available, the app prompts the user to manually select a SKU or scan the QR code before proceeding
- FR49: A TF.js MobileNet-based brand/variant classifier runs client-side as part of the Stage 2 local model pipeline; lazy-loaded (~4MB); cached in IndexedDB alongside FR45 model; identifies the active Afia bottle SKU from the label region; training data sourced from in-house bottle images augmented via Fal.ai Flux Schnell (kitchen background generation, ~$0.003/image); activates at Stage 2 launch gated by local model development readiness; brand/logo identification is explicitly Stage 2 scope and not active in POC v1

### Admin Dashboard

- FR47: [Sprint CP] An authenticated admin can view all scans (image + LLM result + local model result), flag accuracy (too big / too small / correct / way off), manually correct fill %, or re-run LLM on any scan; correction written to R2 metadata and Supabase training record
- FR48: [Sprint CP] An authenticated admin can upload an image with SKU, fill level annotation, and optional notes; the upload is automatically marked as training-eligible with an admin-upload label source

---

## Non-Functional Requirements

### Performance

| Requirement                                  | Target      | Measurement Context                                           |
| -------------------------------------------- | ----------- | ------------------------------------------------------------- |
| App shell load — cached (service worker hit) | < 1 second  | Repeat visits                                                 |
| App shell load — cold (first visit, 4G)      | < 3 seconds | First QR scan                                                 |
| Time to camera active after "Start Scan"     | < 2 seconds | getUserMedia + stream init                                    |
| Photo-to-result round-trip (p95)             | < 8 seconds | Full pipeline: capture → compress → Worker → Gemini → display |
| Image compression (canvas resize + JPEG)     | < 500ms     | Client-side, before transmission                              |
| Feedback submission round-trip               | < 1 second  | POST /feedback → Worker → response                            |
| JS bundle size (gzipped)                     | < 200KB     | QR lib 35KB + React 45KB + app logic                          |
| Local model inference (p95) — Android WASM   | ≤ 150ms     | Client-side TF.js MobileNetV3, WASM backend, after model loaded |
| Local model inference (p95) — iOS WebGL      | ≤ 100ms     | Client-side TF.js MobileNetV3, WebGL backend (WASM prohibited on iOS) |
| Local model lazy-load — first time (4G)      | < 15 seconds | ~9MB total (fill regressor + brand classifier) from R2 CDN edge; camera preview shown immediately during load |
| Supabase training record write               | < 500ms     | Async, non-blocking — does not affect user-facing p95 (NFR-32)|

### Security

- `GEMINI_KEY_1..GEMINI_KEY_N` and `GROQ_API_KEY` stored only as Cloudflare Worker secrets — never in client code, git history, or `wrangler.toml`
- `ADMIN_SECRET` stored as Cloudflare Worker secret; validates all `/admin/*` route access
- All Worker endpoints validate request origin against allowlist (production domain + localhost)
- Worker enforces ≤10 requests/IP/minute via KV-backed sliding window rate limiter
- Worker rejects payloads > 4MB
- R2 bucket is not publicly accessible — all access via Worker binding only
- All client-Worker traffic over HTTPS (enforced by Cloudflare)
- Cloudflare Worker and Pages responses must include `Cross-Origin-Opener-Policy: same-origin` and `Cross-Origin-Embedder-Policy: require-corp` headers to enable `SharedArrayBuffer` for WASM multithreading; absence causes silent fallback to single-threaded WASM (3–5× slower inference)
- No PII collected: no names, emails, phone numbers, or user accounts

### Reliability

- Primary LLM (Gemini) failure triggers automatic Groq fallback with no user action required
- App shell loads from service worker cache when offline; scan page displays "Network required for scanning"
- Worker returns a structured error response within 10 seconds even if all LLM providers fail
- CI/CD pipeline blocks deployment if unit or E2E tests fail

### Scalability

- POC infrastructure stays within free-tier limits: Cloudflare Worker ≤100,000 req/day; R2 ≤10GB / ≤1M write ops/month; Gemini ≤1,500 req/day
- No scaling configuration required at POC scale (< 500 users/month) — serverless handles it inherently
- Architecture accommodates 10× user growth post-POC without adding new infrastructure components or changing the deployment topology

### Accessibility

- All interactive elements: WCAG 2.1 AA contrast ratio ≥ 4.5:1
- All touch targets: ≥ 44×44px
- All error and status messages conveyed via text (not color or icon alone)
- Result values (fill %, volume, nutrition) rendered as text — screen reader compatible
- Camera permission denied state includes plain-language grant instructions

### Compatibility

- iOS Safari 17+ (browser mode): full functionality — camera, fetch, service worker
- Android Chrome 120+: full functionality including PWA install prompt
- Android Firefox 120+: full functionality
- Desktop Chrome/Firefox/Edge: functional for dev and QA
- App detects iOS standalone mode and prompts "Open in Safari" to avoid WebKit camera bug

---

_PRD produced: 2026-02-26_
_Based on: Technical research report (800+ lines) + Architecture decision document (905 lines)_
_Author: Ahmed_
_Status: POC v1 scope finalized — ready for epics & stories_
