---
stepsCompleted:
  [step-01-validate-prerequisites, step-02-design-epics, step-03-create-stories]
inputDocuments:
  - prd.md
  - architecture.md
  - ux-design-specification.md
---

# Afia Oil Tracker - Epic Breakdown

## Overview

This document provides the complete epic and story breakdown for Afia Oil Tracker, decomposing the requirements from the PRD, UX Design, and Architecture requirements into implementable stories.

## Requirements Inventory

### Functional Requirements

- FR1: User can navigate to the app via a QR code scan that pre-loads the correct bottle context (SKU, geometry, oil type)
- FR2: The app can display the registered bottle name, capacity, and oil type upon QR-initiated entry
- FR3: The app can detect when a scanned SKU is not registered and present an appropriate fallback state
- FR4: The app can load bottle geometry and nutritional profile from local bundled data without network access
- FR5: User can activate the rear-facing camera directly within the app without leaving the browser
- FR6: User can see a live camera viewfinder with a framing guide overlay to align the bottle
- FR7: User can capture a still photo of the oil bottle from the live viewfinder
- FR8: User can preview the captured photo before submitting it for analysis
- FR9: User can retake the photo if the preview is unsatisfactory
- FR10: The app can compress the captured image to an optimized size before transmission
- FR11: The app can submit the captured bottle photo to an AI vision API for fill level estimation
- FR12: The system can estimate the oil fill level as a percentage (0–100%) from the submitted photo
- FR13: The system can return a confidence level (high / medium / low) alongside the fill percentage estimate
- FR14: The system can automatically fall back to a secondary AI provider if the primary provider is unavailable
- FR15: The app can surface image quality issues (blur, poor lighting) to the user when the AI detects them
- FR16: The app can calculate remaining oil volume (ml) from the estimated fill percentage and known bottle geometry
- FR17: The app can calculate consumed oil volume (ml) by subtracting remaining from total bottle capacity
- FR18: The app can convert oil volumes to tablespoons and cups for display
- FR19: The app can calculate nutritional values (calories, total fat, saturated fat) for the consumed volume using bundled USDA reference data
- FR20: The app can display remaining and consumed volumes simultaneously in ml, tablespoons, and cups
- FR21: User can view the estimated fill percentage alongside a visual fill gauge
- FR22: User can view remaining and consumed volumes in three units (ml, tablespoons, cups) on a single screen
- FR23: User can view nutritional facts (calories, total fat, saturated fat) for the estimated consumed amount
- FR24: User can see a confidence indicator that communicates the reliability of the estimate
- FR25: User can see a prompt to retake the photo when the AI returns low confidence
- FR26: User can indicate whether the AI fill estimate was accurate ("About right", "Too high", "Too low", "Way off")
- FR27: User can provide a corrected fill percentage estimate via slider when marking the result inaccurate
- FR28: The system can validate user feedback for consistency and flag contradictory or suspicious responses
- FR29: The system can store validated feedback alongside the original scan record
- FR30: The system can store the captured bottle image for future model training purposes
- FR31: The system can store scan metadata (SKU, timestamp, AI provider, fill estimate, confidence, latency) for each scan
- FR32: The system can update the stored scan record with validated user feedback after submission
- FR33: The system can mark scan records as training-eligible when they pass all validation criteria
- FR34: User can see a clear error message and retry option when the AI analysis fails
- FR35: User can see a network unavailability message when attempting to scan without internet
- FR36: User can see guidance to open the app in Safari when accessing from an incompatible iOS browser context
- FR37: User can see a camera permission denied message with instructions to grant access in device settings
- FR38: User can view a brief notice explaining that scan images are stored for AI model improvement before their first scan
- FR39: The app can display a disclaimer that results are estimates (±15%) and not certified nutritional analysis

### Non-Functional Requirements

- NFR1: App shell load — cached (service worker hit) < 1 second
- NFR2: App shell load — cold (first visit, 4G) < 3 seconds
- NFR3: Time to camera active after "Start Scan" < 2 seconds
- NFR4: Photo-to-result round-trip (p95) < 8 seconds
- NFR5: Image compression (canvas resize + JPEG) < 500ms
- NFR6: Feedback submission round-trip < 1 second
- NFR7: JS bundle size (gzipped) < 200KB
- NFR8: GEMINI_API_KEY and GROQ_API_KEY stored only as Cloudflare Worker secrets
- NFR9: All Worker endpoints validate request origin against allowlist
- NFR10: Worker enforces ≤10 requests/IP/minute via KV-backed sliding window rate limiter
- NFR11: Worker rejects payloads > 4MB
- NFR12: R2 bucket is not publicly accessible — all access via Worker binding only
- NFR13: All client-Worker traffic over HTTPS
- NFR14: No PII collected: no names, emails, phone numbers, or user accounts
- NFR15: Primary LLM (Gemini) failure triggers automatic Groq fallback with no user action required
- NFR16: App shell loads from service worker cache when offline; scan page displays "Network required for scanning"
- NFR17: Worker returns a structured error response within 10 seconds even if all LLM providers fail
- NFR18: CI/CD pipeline blocks deployment if unit or E2E tests fail
- NFR19: POC infrastructure stays within free-tier limits: Cloudflare Worker ≤100,000 req/day; R2 ≤10GB / ≤1M write ops/month; Gemini ≤1,500 req/day
- NFR20: No scaling configuration required at POC scale (< 500 users/month)
- NFR21: All interactive elements: WCAG 2.1 AA contrast ratio ≥ 4.5:1
- NFR22: All touch targets: ≥ 44×44px
- NFR23: All error and status messages conveyed via text (not color or icon alone)
- NFR24: Result values (fill %, volume, nutrition) rendered as text — screen reader compatible
- NFR25: Camera permission denied state includes plain-language grant instructions
- NFR26: iOS Safari 17+ (browser mode): full functionality — camera, fetch, service worker
- NFR27: Android Chrome 120+: full functionality including PWA install prompt
- NFR28: Android Firefox 120+: full functionality
- NFR29: Desktop Chrome/Firefox/Edge: functional for dev and QA
- NFR30: App detects iOS standalone mode and prompts "Open in Safari" to avoid WebKit camera bug

### Additional Requirements

**Starter Template & Technology Stack:**

- Vite + React + vite-plugin-pwa v1 for PWA setup
- Cloudflare Pages for hosting (free tier, unlimited bandwidth)
- Cloudflare Worker for API proxy (zero cold start, R2 binding)
- Cloudflare R2 for object storage (S3-compatible, zero egress)
- Gemini 2.5 Flash as primary LLM (free tier, JSON mode)
- Groq + Llama 4 Scout as fallback LLM (free tier, OpenAI-compatible)
- paulmillr/qr library for QR scanning (35KB, zero deps)
- Bundled USDA JSON for nutrition data (offline, zero latency)
- Vitest + Playwright for testing (modern, PWA-aware E2E)
- GitHub Actions for CI/CD (wrangler-action@v3 integration)

**Infrastructure & Deployment:**

- All services on Cloudflare free tier ($0/month target)
- CI/CD: GitHub Actions → Cloudflare Pages + Worker
- Environment variables: VITE_PROXY_URL, GEMINI_API_KEY, GROQ_API_KEY
- Worker secrets via wrangler secret put (never in git)
- R2 bucket binding for image + metadata storage

**Multi-Provider LLM Fallback Chain:**

- Primary: Gemini 2.5 Flash with JSON mode, thinkingBudget: 0
- Fallback: Groq Llama 4 Scout (activates on Gemini 429/5xx)
- Local dev: Ollama + Qwen2.5-VL 7B (not deployed to Worker)
- Structured JSON prompt shared across all providers
- Confidence threshold handling: high/medium/low with different UI states

**Security Requirements:**

- API keys stored only in Worker secrets (never client-side)
- Origin validation: whitelist production domain + localhost
- Rate limiting: 10 requests/minute per IP (KV-backed sliding window)
- Payload size guard: reject requests > 4MB
- Method guard: only POST /analyze and POST /feedback accepted
- Input validation: SKU must exist, image must be valid base64
- R2 bucket not publicly accessible (Worker binding only)

**Data Collection & Training Pipeline:**

- Every scan stores image to R2: images/{scanId}.jpg
- Every scan stores metadata to R2: metadata/{scanId}.json
- Metadata includes: SKU, timestamp, LLM provider, fill estimate, confidence, latency
- User feedback validation (Layer 1 sanity checks in Worker)
- Training eligibility criteria: validationStatus === "accepted"
- Feedback validation flags: too_fast, boundary_value, contradictory, extreme_delta

**PWA Requirements:**

- display: "browser" mode (NOT standalone) for iOS camera compatibility
- apple-mobile-web-app-capable meta tag must be ABSENT
- Service worker caching: app shell CacheFirst, API routes NetworkOnly
- Offline: app shell loads offline, scan page shows "Network required"
- Responsive design: mobile portrait 375–430px primary viewport
- Touch targets: ≥ 44×44px minimum

**UX Requirements:**

- Complete scan flow in under 8 seconds from photo capture to result display
- Feedback submission rate target: ≥30% of scans
- Camera overlay: bottle-shaped framing guide for precision signal
- Result as hero moment: bold fill gauge + volume numbers + nutrition panel
- Feedback as natural flow completion (not an interrupt)
- Confidence handling: different UI states for high/medium/low
- iOS browser chrome: must work within Safari viewport (not full screen)

**Bottle Registry & Nutrition Data:**

- 2-3 bottle SKUs registered (clear glass, known geometry)
- Each SKU: name, oilType, shape (cylinder/frustum), totalVolumeMl, geometry
- Bundled USDA nutrition data: per-100g values, oil density 0.92 g/ml
- Volume calculation: cylinder or frustum formulas based on shape
- Unit conversion: 1 tbsp = 14.7868 ml, 1 cup = 236.588 ml

**Component Architecture:**

- State machine: IDLE → CAMERA_ACTIVE → PHOTO_CAPTURED → API_PENDING → API_SUCCESS/ERROR
- Components: QrLanding, CameraCapture, CameraGuide, PhotoPreview, ApiStatus, ResultDisplay, FillGauge, VolumeBreakdown, NutritionFacts, FeedbackPrompt, UnknownBottle
- Hooks: useCamera (rear-facing, 800px width, JPEG 0.78 quality)
- Utils: volumeCalculator, nutritionCalculator, imageCompressor
- Data: bottleRegistry, oilNutrition (bundled static)

### FR Coverage Map

FR1: Epic 1 - QR code navigation with pre-loaded bottle context
FR2: Epic 1 - Display bottle name, capacity, oil type
FR3: Epic 1 - Detect and handle unregistered SKU
FR4: Epic 1 - Load bottle geometry and nutrition from local data
FR5: Epic 2 - Activate rear-facing camera in-app
FR6: Epic 2 - Live viewfinder with framing guide
FR7: Epic 2 - Capture still photo from viewfinder
FR8: Epic 2 - Preview captured photo
FR9: Epic 2 - Retake photo option
FR10: Epic 2 - Compress image before transmission
FR11: Epic 2 - Submit photo to AI vision API
FR12: Epic 2 - Estimate fill level as percentage
FR13: Epic 2 - Return confidence level with estimate
FR14: Epic 2 - Automatic fallback to secondary AI provider
FR15: Epic 2 - Surface image quality issues to user
FR16: Epic 3 - Calculate remaining volume from fill % and geometry
FR17: Epic 3 - Calculate consumed volume
FR18: Epic 3 - Convert volumes to tablespoons and cups
FR19: Epic 3 - Calculate nutritional values for consumed volume
FR20: Epic 3 - Display remaining and consumed in all units
FR21: Epic 3 - View fill percentage with visual gauge
FR22: Epic 3 - View volumes in three units on single screen
FR23: Epic 3 - View nutritional facts for consumed amount
FR24: Epic 3 - See confidence indicator
FR25: Epic 3 - See retake prompt for low confidence
FR26: Epic 4 - Indicate estimate accuracy (4 options)
FR27: Epic 4 - Provide corrected fill percentage via slider
FR28: Epic 4 - Validate feedback for consistency
FR29: Epic 4 - Store validated feedback with scan record
FR30: Epic 4 - Store captured image for training
FR31: Epic 4 - Store scan metadata
FR32: Epic 4 - Update scan record with feedback
FR33: Epic 4 - Mark records as training-eligible
FR34: Epic 5 - Clear error message with retry option
FR35: Epic 5 - Network unavailability message
FR36: Epic 5 - iOS Safari guidance for incompatible browser
FR37: Epic 5 - Camera permission denied message with instructions
FR38: Epic 5 - Privacy notice about image storage
FR39: Epic 5 - Disclaimer about estimate accuracy

## Epic List

### Epic 1: Core Scan Experience (End-to-End MVP)

Users can scan a QR code, photograph their oil bottle, and receive an AI-powered estimate with basic volume measurements in a complete end-to-end flow.
**FRs covered:** FR1, FR2, FR4, FR5, FR6, FR7, FR8, FR9, FR10, FR11, FR12, FR13, FR14, FR16, FR17, FR18, FR20, FR21, FR22

### Epic 2: Rich Consumption Insights

Users see enhanced result displays with visual fill gauges, detailed nutritional information, and confidence indicators that make consumption data more meaningful and actionable.
**FRs covered:** FR19, FR21 (enhanced), FR22 (enhanced), FR23, FR24, FR39

### Epic 3: Continuous Improvement Loop

Users can provide feedback on estimate accuracy to help improve the AI over time, with their input validated and stored for future model training.
**FRs covered:** FR26, FR27, FR28, FR29, FR30, FR31, FR32, FR33

### Epic 4: Resilience & Edge Cases

Users receive clear, helpful guidance when issues occur (poor image quality, network problems, permission errors) and understand how their data is used.
**FRs covered:** FR15, FR25, FR34, FR35, FR36, FR37, FR38

### Epic 5: Deployment & Operations

The system handles unknown bottles gracefully and deploys automatically with production-grade CI/CD, ensuring operational excellence.
**FRs covered:** FR3
