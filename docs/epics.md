---
stepsCompleted:
  [step-01-validate-prerequisites, step-02-design-epics, step-03-create-stories]
inputDocuments:
  - prd.md
  - architecture.md
  - ux-design-specification.md
---

# Safi Oil Tracker - Epic Breakdown

## Overview

This document provides the complete epic and story breakdown for Safi Oil Tracker, decomposing the requirements from the PRD, UX Design, and Architecture requirements into implementable stories.

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

### Epic 6: Stage 2 - Local Model & Advanced Analysis

Transition the primary analysis to a local lightweight model with LLM fallback, supported by a structured Supabase training pipeline and enhanced Admin tools.

## Epic 6: Stage 2 - Local Model & Advanced Analysis

Transition the primary analysis to a local lightweight model with LLM fallback, supported by a structured Supabase training pipeline and enhanced Admin tools.

### Story 6.1: Supabase Training Database Setup

As a developer,
I want a structured Supabase database for training data,
So that I can manage scan records, ground truth labels, and augmentation metadata.

**Acceptance Criteria:**
- Supabase project initialized with `scans` table.
- Table schema includes: `scan_id`, `image_url`, `sku`, `ai_estimate`, `admin_correction`, `is_training_eligible`, `augmentation_type`.
- RLS policies configured for secure Worker access.

### Story 6.2: Admin Dashboard Revision Interface

As an admin,
I want to review scans and provide manual corrections,
So that I can build a high-quality training dataset.

**Acceptance Criteria:**
- Admin can view scan image with AI-predicted "red line" overlay.
- Buttons for "Too Big" and "Too Small" quick flagging.
- Slider for precise manual oil level correction.
- "Submit to Training" button that marks record as training-eligible in Supabase.

### Story 6.3: Image & Metadata Upload Tool

As an admin,
I want to upload existing images with metadata and oil levels,
So that I can seed the training database with historical or augmented data.

**Acceptance Criteria:**
- Drag-and-drop upload for bottle images.
- Form to input SKU, actual oil level (ml), and metadata.
- Automated validation of uploaded data before storage.

### Story 6.4: Enhanced 55ml Slider UI

As a user,
I want to track my consumption using a 55ml-unit slider with visual cup feedback,
So that I can easily relate oil usage to common kitchen measures.

**Acceptance Criteria:**
- Slider thumb moves in 55ml increments (1/2 cup).
- "Half Cup" (55ml) and "Full Cup" (110ml) visual icons appear as the slider moves.
- Cumulative cup count displayed (e.g., "1.5 Cups consumed").
- Slider starts at the detected oil level red line.

### Story 6.5: Stage 1 Prompt Refinement (Few-Shot)

As a developer,
I want to refine the LLM prompt with directions and few-shot examples,
So that Stage 1 accuracy is maximized for better initial data collection.

**Acceptance Criteria:**
- Prompt includes precise text directions for bottle geometry.
- Low-resolution cropped few-shot examples included in payload.
- Token reduction through image pre-processing (downsampling/cropping).

### Story 6.6: Stage 2 Local Model Integration

As a developer,
I want a local model running in the browser as the primary analysis route,
So that the app is faster and cheaper to operate.

**Acceptance Criteria:**
- Local model (TensorFlow.js/ONNX) performs initial fill estimation.
- System triggers LLM Fallback (Stage 1) only if local confidence < threshold.
- Both results are logged in the Admin Dashboard for comparison.


## Epic 1: Core Scan Experience (End-to-End MVP)

Users can scan a QR code, photograph their oil bottle, and receive an AI-powered estimate with basic volume measurements in a complete end-to-end flow.

### Story 1.1: Project Foundation & PWA Setup

As a developer,
I want a working PWA foundation with Vite + React + PWA plugin,
So that I can build the app with fast development and proper PWA capabilities.

**Acceptance Criteria:**

**Given** I have initialized the project
**When** I run `npm run dev`
**Then** the app loads at localhost:5173 with React working
**And** the PWA manifest is generated with browser mode (not standalone)
**And** service worker is configured for app shell caching
**And** the app loads offline after first visit

### Story 1.2: Cloudflare Infrastructure Setup

As a developer,
I want Cloudflare Pages, Worker, and R2 configured,
So that I have the hosting, API proxy, and storage infrastructure ready.

**Acceptance Criteria:**

**Given** I have Cloudflare account credentials
**When** I deploy the infrastructure
**Then** Cloudflare Pages project is created and connected to GitHub
**And** Cloudflare Worker is deployed with R2 bucket binding
**And** Worker has /health endpoint returning 200 OK
**And** Worker enforces origin validation and rate limiting (10 req/min per IP)
**And** API keys (GEMINI_API_KEY, GROQ_API_KEY) are stored as Worker secrets

### Story 1.3: Bottle Registry & Nutrition Data

As a developer,
I want bottle registry and USDA nutrition data bundled in the app,
So that bottle information loads instantly without network calls.

**Acceptance Criteria:**

**Given** I have bottle specifications and USDA nutrition data
**When** I build the app
**Then** bottleRegistry.js contains 2-3 SKUs with geometry and oil type
**And** oilNutrition.js contains per-100g USDA data for each oil type
**And** each bottle entry includes: sku, name, oilType, shape, totalVolumeMl, geometry
**And** nutrition data includes: calories, totalFatG, saturatedFatG, densityGPerMl

### Story 1.4: QR Landing Page

As a user,
I want to scan a QR code and see my bottle information instantly,
So that I can quickly start tracking my oil consumption.

**Acceptance Criteria:**

**Given** I scan a QR code with ?sku=filippo-berio-500ml parameter
**When** the app loads
**Then** I see the bottle name, capacity, and oil type displayed
**And** I see a "Start Scan" button to begin camera capture
**And** the page loads in under 3 seconds on first visit (cold)
**And** the page loads in under 1 second on repeat visits (cached)

### Story 1.4: Unknown Bottle Handling

As a user,
I want clear feedback when my bottle SKU is not recognized,
So that I understand why the app can't proceed.

**Acceptance Criteria:**

**Given** I scan a QR code with an unregistered SKU parameter
**When** the app loads
**Then** I see a message "This bottle is not yet supported"
**And** I see the SKU that was scanned
**And** I see a suggestion to contact support or try a different bottle

### Story 1.5: Camera Activation & Viewfinder

As a user,
I want to activate my phone's rear camera with a live viewfinder,
So that I can prepare to photograph my oil bottle.

**Acceptance Criteria:**

**Given** I am on the QR landing page and have tapped "Start Scan"
**When** the camera activation begins
**Then** the rear-facing camera activates (not front-facing)
**And** I see a live viewfinder showing the camera feed
**And** the camera activates in under 2 seconds
**And** if camera permission is denied, I see Story 5.4 error message

### Story 1.6: Photo Capture & Preview

As a user,
I want to capture a still photo from the viewfinder and preview it,
So that I can verify the image quality before submitting.

**Acceptance Criteria:**

**Given** the camera viewfinder is active
**When** I tap the capture button
**Then** a still photo is captured from the current frame
**And** the viewfinder freezes showing the captured image
**And** I see "Retake" and "Use Photo" buttons
**And** the image is captured at 800px width with JPEG quality 0.78

### Story 1.7: Image Retake Flow

As a user,
I want to retake the photo if I'm not satisfied with the preview,
So that I can ensure I submit a clear, well-framed image.

**Acceptance Criteria:**

**Given** I am viewing the photo preview
**When** I tap "Retake"
**Then** the preview is discarded
**And** the live viewfinder reactivates
**And** I can capture a new photo
**And** this process can be repeated unlimited times

### Story 1.8: Worker API Proxy - Analyze Endpoint

As a developer,
I want a Worker /analyze endpoint that proxies AI requests,
So that API keys stay secure and requests are validated.

**Acceptance Criteria:**

**Given** the Worker is deployed with API key secrets
**When** a POST request is sent to /analyze with {sku, imageBase64}
**Then** the Worker validates the SKU exists in bottle registry
**And** the Worker validates the image is valid base64 and under 4MB
**And** the Worker validates the request origin against allowlist
**And** the Worker enforces rate limiting (10 req/min per IP)
**And** the Worker returns 400 for validation failures with clear error messages
**And** the Worker returns 429 for rate limit violations

### Story 1.9: Gemini Vision Integration

As a developer,
I want Gemini 2.5 Flash integrated as the primary AI provider,
So that fill level estimates are fast and accurate.

**Acceptance Criteria:**

**Given** the Worker receives a valid /analyze request
**When** the Worker calls Gemini API
**Then** the request uses Gemini 2.5 Flash model
**And** the request includes the structured JSON prompt for fill estimation
**And** the request sets thinkingBudget: 0 for speed
**And** the response is parsed for fillPercentage (0-100) and confidence (high/medium/low)
**And** the Worker returns the parsed result to the client
**And** the round-trip completes in under 8 seconds (p95)

### Story 1.10: Groq Fallback Integration

As a developer,
I want Groq + Llama 4 Scout as automatic fallback,
So that the app remains functional when Gemini is unavailable.

**Acceptance Criteria:**

**Given** the Worker attempts to call Gemini API
**When** Gemini returns 429 (rate limit) or 5xx (server error)
**Then** the Worker automatically retries with Groq API
**And** the Groq request uses Llama 4 Scout model
**And** the Groq request uses the same structured JSON prompt
**And** the response is parsed identically to Gemini
**And** the fallback happens transparently without user action
**And** the metadata records which provider was used

### Story 1.11: AI Analysis Loading State

As a developer,
I want Groq + Llama 4 Scout as automatic fallback,
So that the app remains functional when Gemini is unavailable.

**Acceptance Criteria:**

**Given** the Worker attempts to call Gemini API
**When** Gemini returns 429 (rate limit) or 5xx (server error)
**Then** the Worker automatically retries with Groq API
**And** the Groq request uses Llama 4 Scout model
**And** the Groq request uses the same structured JSON prompt
**And** the response is parsed identically to Gemini
**And** the fallback happens transparently without user action
**And** the metadata records which provider was used

### Story 2.7: AI Analysis Loading State

As a user,
I want to see clear feedback while my photo is being analyzed,
So that I know the app is working and approximately how long to wait.

**Acceptance Criteria:**

**Given** I have tapped "Use Photo" on the preview
**When** the image is being compressed and sent to the API
**Then** I see a loading indicator with "Analyzing your bottle..."
**And** the loading state shows for the duration of the API call
**And** the loading state disappears when results arrive or an error occurs
**And** image compression completes in under 500ms

### Story 2.8: Confidence Level Handling

As a user,
I want to see a confidence indicator with my fill estimate,
So that I understand how reliable the AI's assessment is.

**Acceptance Criteria:**

**Given** the AI analysis returns successfully
**When** the result includes a confidence level (high/medium/low)
**Then** high confidence shows a green indicator with "High confidence"
**And** medium confidence shows a yellow indicator with "Medium confidence"
**And** low confidence shows an orange indicator with "Low confidence - consider retaking"
**And** the confidence indicator is visible alongside the fill percentage
**And** low confidence triggers the retake prompt (Story 3.10)

### Story 2.9: Image Quality Issue Detection

As a user,
I want to be notified if my photo has quality issues,
So that I can retake it and get a better estimate.

**Acceptance Criteria:**

**Given** the AI analysis detects image quality problems
**When** the response includes quality issues (blur, poor lighting, obstruction)
**Then** I see a specific message describing the issue
**And** I see a "Retake Photo" button
**And** the message uses plain language (e.g., "Image is too blurry - try holding the phone steady")
**And** tapping "Retake Photo" returns me to the camera viewfinder

## Epic 3: Consumption Insights

Users can see detailed volume measurements and nutritional information for the oil they've consumed.

### Story 3.1: Volume Calculation Engine

As a developer,
I want a volume calculator that computes remaining and consumed oil,
So that users see accurate volume measurements based on fill percentage and bottle geometry.

**Acceptance Criteria:**

**Given** I have a fill percentage and bottle geometry data
**When** the volume calculator runs
**Then** it calculates remaining volume using cylinder formula for cylinder bottles
**And** it calculates remaining volume using frustum formula for tapered bottles
**And** it calculates consumed volume as (totalVolumeMl - remainingVolumeMl)
**And** all calculations are accurate to 2 decimal places
**And** the calculator handles 0% fill (empty) and 100% fill (full) correctly

### Story 3.2: Unit Conversion System

As a developer,
I want automatic unit conversion for volumes,
So that users can view measurements in ml, tablespoons, and cups.

**Acceptance Criteria:**

**Given** I have a volume in milliliters
**When** the unit converter runs
**Then** it converts ml to tablespoons using 1 tbsp = 14.7868 ml
**And** it converts ml to cups using 1 cup = 236.588 ml
**And** conversions are accurate to 1 decimal place
**And** the converter handles edge cases (0 ml, very small volumes)
**And** all three units (ml, tbsp, cups) are available for display

### Story 3.3: Nutrition Calculator

As a developer,
I want a nutrition calculator that computes consumed nutritional values,
So that users see accurate calorie and fat information.

**Acceptance Criteria:**

**Given** I have consumed volume in ml and oil type
**When** the nutrition calculator runs
**Then** it converts volume to grams using oil density (0.92 g/ml)
**And** it calculates calories from per-100g USDA data
**And** it calculates total fat grams from per-100g USDA data
**And** it calculates saturated fat grams from per-100g USDA data
**And** all nutritional values are accurate to 1 decimal place
**And** the calculator uses the correct USDA data for the bottle's oil type

### Story 3.4: Fill Gauge Visual Component

As a user,
I want to see a visual fill gauge showing my bottle's fill level,
So that I can quickly understand how much oil remains.

**Acceptance Criteria:**

**Given** I receive an AI fill estimate
**When** the result screen displays
**Then** I see a bottle-shaped fill gauge
**And** the gauge fills to the estimated percentage visually
**And** the fill percentage number is displayed prominently (e.g., "68%")
**And** the gauge uses color to indicate fill level (green for high, yellow for medium, red for low)
**And** the gauge is responsive and renders correctly on mobile screens

### Story 3.5: Volume Breakdown Display

As a user,
I want to see remaining and consumed volumes in multiple units,
So that I can understand my oil usage in familiar measurements.

**Acceptance Criteria:**

**Given** the volume calculations are complete
**When** the result screen displays
**Then** I see "Remaining" section with ml, tablespoons, and cups
**And** I see "Consumed" section with ml, tablespoons, and cups
**And** all six values are displayed on a single screen
**And** values are formatted clearly (e.g., "450 ml", "30.4 tbsp", "1.9 cups")
**And** the layout is readable on mobile portrait orientation

### Story 3.6: Nutrition Facts Panel

As a user,
I want to see nutritional information for the oil I've consumed,
So that I can track my calorie and fat intake.

**Acceptance Criteria:**

**Given** the nutrition calculations are complete
**When** the result screen displays
**Then** I see a "Nutrition Facts" panel for consumed oil
**And** the panel shows calories (e.g., "240 cal")
**And** the panel shows total fat (e.g., "27.0 g")
**And** the panel shows saturated fat (e.g., "3.8 g")
**And** the panel clarifies these are estimates based on USDA data
**And** the panel is visually distinct and easy to read

### Story 3.7: Result Screen Layout

As a user,
I want all my consumption insights on one screen,
So that I can see everything at a glance without scrolling excessively.

**Acceptance Criteria:**

**Given** the AI analysis is complete
**When** the result screen displays
**Then** I see the fill gauge at the top (Story 3.4)
**And** I see the volume breakdown below the gauge (Story 3.5)
**And** I see the nutrition facts panel below the volumes (Story 3.6)
**And** I see the confidence indicator (Story 2.8)
**And** all elements fit within 2 screen heights on mobile portrait
**And** the layout follows the UX design specification

### Story 3.8: Confidence Indicator Integration

As a user,
I want the confidence indicator visible on my results,
So that I know how much to trust the estimate.

**Acceptance Criteria:**

**Given** the result screen displays
**When** I view my consumption insights
**Then** I see the confidence level (high/medium/low) near the fill percentage
**And** the indicator uses color coding (green/yellow/orange)
**And** the indicator includes text label (not just color)
**And** the indicator is accessible (WCAG 2.1 AA contrast)
**And** the indicator is positioned prominently but doesn't obscure key data

### Story 3.9: Estimate Disclaimer

As a user,
I want to see a disclaimer about estimate accuracy,
So that I understand these are approximations, not certified measurements.

**Acceptance Criteria:**

**Given** the result screen displays
**When** I view my consumption insights
**Then** I see a disclaimer stating "Results are estimates (±15%)"
**And** the disclaimer clarifies "Not certified nutritional analysis"
**And** the disclaimer is visible but not intrusive
**And** the disclaimer uses plain language
**And** the disclaimer meets accessibility requirements

### Story 3.10: Low Confidence Retake Prompt

As a user,
I want a clear prompt to retake my photo when confidence is low,
So that I can get a more accurate estimate.

**Acceptance Criteria:**

**Given** the AI returns low confidence
**When** the result screen displays
**Then** I see a prominent message "Low confidence - consider retaking photo"
**And** I see a "Retake Photo" button
**And** tapping the button returns me to the camera viewfinder
**And** the prompt is visually distinct from other UI elements
**And** the prompt doesn't prevent me from viewing the current results

## Epic 4: Feedback & Continuous Improvement

Users can provide feedback on estimate accuracy to help improve the AI over time, with their input validated and stored for future model training.

### Story 4.1: Feedback Prompt UI

As a user,
I want to be asked if the AI estimate was accurate,
So that I can help improve the system.

**Acceptance Criteria:**

**Given** I am viewing my consumption results
**When** I scroll to the feedback section
**Then** I see the question "Was this estimate accurate?"
**And** I see four response options: "About right", "Too high", "Too low", "Way off"
**And** the options are presented as clear, tappable buttons
**And** all touch targets are ≥ 44×44px
**And** the prompt feels like a natural part of the flow, not an interruption

### Story 4.2: Corrected Estimate Slider

As a user,
I want to provide my own fill percentage estimate when the AI is wrong,
So that the system learns from my correction.

**Acceptance Criteria:**

**Given** I selected "Too high", "Too low", or "Way off"
**When** the correction UI appears
**Then** I see a slider to adjust the fill percentage (0-100%)
**And** the slider starts at the AI's original estimate
**And** I see the current slider value displayed as I move it
**And** I see a "Submit Feedback" button
**And** the slider is easy to use on mobile touch screens
**And** I can skip providing a correction and just submit the accuracy rating

### Story 4.3: Feedback Submission Flow

As a user,
I want my feedback submitted quickly and confirmed,
So that I know my input was received.

**Acceptance Criteria:**

**Given** I have selected an accuracy rating and optionally adjusted the slider
**When** I tap "Submit Feedback"
**Then** my feedback is sent to the Worker /feedback endpoint
**And** I see a loading indicator during submission
**And** I see a "Thank you" confirmation message when complete
**And** the submission completes in under 1 second
**And** if submission fails, I see an error message with retry option

### Story 4.4: Worker Feedback Endpoint

As a developer,
I want a Worker /feedback endpoint that receives and validates user feedback,
So that only quality data is stored for training.

**Acceptance Criteria:**

**Given** the Worker is deployed
**When** a POST request is sent to /feedback with {scanId, accuracyRating, correctedFillPercentage}
**Then** the Worker validates the scanId exists
**And** the Worker validates accuracyRating is one of: "about_right", "too_high", "too_low", "way_off"
**And** the Worker validates correctedFillPercentage is 0-100 if provided
**And** the Worker enforces rate limiting (10 req/min per IP)
**And** the Worker returns 400 for validation failures
**And** the Worker returns 200 with {feedbackId, validationStatus} on success

### Story 4.5: Feedback Validation Logic

As a developer,
I want Layer 1 validation checks on user feedback,
So that suspicious or contradictory responses are flagged.

**Acceptance Criteria:**

**Given** the Worker receives feedback
**When** validation runs
**Then** it flags feedback submitted < 3 seconds after result display (too_fast)
**And** it flags corrected values at exact boundaries 0%, 25%, 50%, 75%, 100% (boundary_value)
**And** it flags "about_right" with corrected value >10% different from AI (contradictory)
**And** it flags "way_off" with corrected value <5% different from AI (contradictory)
**And** it flags corrected values >30% different from AI estimate (extreme_delta)
**And** validation results are stored in metadata as flags array
**And** feedback with no flags gets validationStatus: "accepted"

### Story 4.6: Image Storage to R2

As a developer,
I want captured images stored in R2 for future training,
So that we can build a dataset for model improvement.

**Acceptance Criteria:**

**Given** a photo is submitted for analysis
**When** the Worker processes the request
**Then** the image is stored to R2 at images/{scanId}.jpg
**And** the image is stored with JPEG compression
**And** the R2 bucket is not publicly accessible
**And** the Worker uses R2 binding (not public URL)
**And** storage completes within the 8-second analysis window
**And** storage failures don't block the AI analysis response

### Story 4.7: Scan Metadata Storage

As a developer,
I want scan metadata stored alongside images,
So that we have complete context for each training sample.

**Acceptance Criteria:**

**Given** an AI analysis completes
**When** the Worker stores the scan record
**Then** metadata is stored to R2 at metadata/{scanId}.json
**And** metadata includes: scanId, sku, timestamp, aiProvider, fillPercentage, confidence, latency
**And** metadata includes: imageStoragePath, bottleGeometry, oilType
**And** metadata is stored as valid JSON
**And** metadata storage completes within the analysis window
**And** the scanId is returned to the client for feedback linking

### Story 4.8: Feedback Update to Metadata

As a developer,
I want user feedback appended to existing scan metadata,
So that training samples include both AI output and user corrections.

**Acceptance Criteria:**

**Given** feedback is submitted for a scanId
**When** the Worker processes the feedback
**Then** it retrieves the existing metadata/{scanId}.json from R2
**And** it appends feedback fields: accuracyRating, correctedFillPercentage, feedbackTimestamp
**And** it appends validation fields: validationStatus, validationFlags
**And** it sets trainingEligible: true if validationStatus === "accepted"
**And** it writes the updated metadata back to R2
**And** the update completes within 1 second
**And** if metadata retrieval fails, feedback is still stored separately

## Epic 5: Error Handling & Accessibility

Users receive clear, helpful guidance when issues occur and understand how their data is used, with accessible UI for all users.

### Story 5.1: AI Analysis Failure Handling

As a user,
I want a clear error message when AI analysis fails,
So that I understand what went wrong and can try again.

**Acceptance Criteria:**

**Given** the AI analysis request fails (both Gemini and Groq)
**When** the error response is received
**Then** I see a message "Unable to analyze image - please try again"
**And** I see a "Retry" button that resubmits the same photo
**And** I see a "Retake Photo" button to capture a new image
**And** the error message is displayed within 10 seconds even if all providers timeout
**And** the message uses plain language without technical jargon
**And** the error state is accessible to screen readers

### Story 5.2: Network Unavailability Detection

As a user,
I want to know when I can't scan due to no internet connection,
So that I don't waste time trying to capture photos.

**Acceptance Criteria:**

**Given** I am offline (no network connection)
**When** I navigate to the scan page
**Then** I see a message "Network connection required for scanning"
**And** the "Start Scan" button is disabled
**And** I see guidance to connect to WiFi or cellular data
**And** the app shell still loads from service worker cache
**And** when connection is restored, the message disappears automatically
**And** the offline state is detected before camera activation

### Story 5.3: iOS Browser Compatibility Check

As a user on iOS,
I want guidance to open the app in Safari if I'm in an incompatible browser,
So that camera functionality works correctly.

**Acceptance Criteria:**

**Given** I am on iOS in a non-Safari browser (e.g., Instagram in-app browser)
**When** the app loads
**Then** I see a message "For best experience, open in Safari"
**And** I see instructions: "Tap the share icon and select 'Open in Safari'"
**And** the message includes a visual indicator of the share icon
**And** the message is dismissible but reappears on next visit
**And** the detection works for common iOS in-app browsers
**And** Safari users don't see this message

### Story 5.4: Camera Permission Denied Handling

As a user,
I want clear instructions when camera access is denied,
So that I know how to grant permission in my device settings.

**Acceptance Criteria:**

**Given** I denied camera permission or it's blocked in settings
**When** the app attempts to activate the camera
**Then** I see a message "Camera access is required to scan bottles"
**And** I see step-by-step instructions to enable camera in device settings
**And** the instructions are specific to iOS or Android based on device detection
**And** I see a "Try Again" button to re-request permission
**And** the message uses plain language and is accessible
**And** the error is caught gracefully without app crash

### Story 5.5: Privacy Notice - First Scan

As a user,
I want to understand how my scan images are used,
So that I can make an informed decision before scanning.

**Acceptance Criteria:**

**Given** I am about to perform my first scan (detected via localStorage flag)
**When** I tap "Start Scan"
**Then** I see a notice: "Scan images are stored to improve AI accuracy"
**And** the notice clarifies: "No personal information is collected"
**And** I see "Understand" and "Learn More" buttons
**And** tapping "Understand" dismisses the notice and proceeds to camera
**And** tapping "Learn More" shows additional privacy details
**And** the notice only appears once per device
**And** the notice is accessible and uses plain language

### Story 5.6: Estimate Accuracy Disclaimer

As a user,
I want to see a disclaimer about estimate accuracy,
So that I understand the limitations of the AI analysis.

**Acceptance Criteria:**

**Given** I am viewing my consumption results
**When** the result screen displays
**Then** I see a disclaimer "Results are estimates (±15%)"
**And** the disclaimer states "Not certified nutritional analysis"
**And** the disclaimer is visible but doesn't dominate the screen
**And** the disclaimer uses plain language
**And** the disclaimer meets WCAG 2.1 AA contrast requirements
**And** the disclaimer is accessible to screen readers
