---
stepsCompleted: [step-01-validate-prerequisites, step-02-design-epics, step-03-create-stories]
inputDocuments:
  - _bmad-output/planning-artifacts/prd.md
  - _bmad-output/planning-artifacts/architecture.md
  - _bmad-output/planning-artifacts/architecture-fill-confirm-screen.md
  - _bmad-output/planning-artifacts/ux-design-specification.md
  - _bmad-output/planning-artifacts/epics.md
  - _bmad-output/planning-artifacts/epics-fill-confirm-screen.md
---

# Afia Oil Tracker - Consolidated Epics & Stories

## Overview

This document is the single source of truth for Afia Oil Tracker's development. It merges all planning artifacts into a cohesive, actionable backlog.

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

- NFR1: Performance: App shell load - cached < 1s
- NFR2: Performance: App shell load - cold < 3s
- NFR3: Performance: Time to camera active < 2s
- NFR4: Performance: Photo-to-result round-trip (p95) < 8s
- NFR5: Performance: Image compression < 500ms
- NFR6: Performance: Feedback submission round-trip < 1s
- NFR7: Performance: JS bundle size (gzipped) < 200KB
- NFR8: Security: API keys stored as Cloudflare Worker secrets
- NFR9: Security: Origin validation for Worker endpoints
- NFR10: Security: Rate limiting (≤10 req/IP/min)
- NFR11: Security: Payload limit (>4MB rejection)
- NFR12: Security: R2 bucket access via Worker binding only
- NFR13: Security: HTTPS enforcement
- NFR14: Security: No PII collected
- NFR15: Reliability: Automatic Groq fallback
- NFR16: Reliability: Offline app shell loading with "Network required" message
- NFR17: Reliability: Structured error response within 10s
- NFR18: Reliability: CI/CD test gates
- NFR19: Scalability: Free-tier alignment (Cloudflare, Gemini)
- NFR20: Accessibility: WCAG 2.1 AA contrast (≥ 4.5:1)
- NFR21: Accessibility: Touch targets (≥ 44x44px)
- NFR22: Accessibility: Text + icon for status/errors
- NFR23: Compatibility: iOS Safari 17+ (browser mode)
- NFR24: Compatibility: Android Chrome/Firefox 120+
- NFR25: Compatibility: iOS standalone detection → "Open in Safari" prompt
- NFR26: Latency: p95 latency < 10s acceptable for POC validation
- NFR27: Accuracy: ±15% fill level estimation target
- NFR28: Data Retention: Retain all scan data in R2 indefinitely
- NFR29: iOS Camera: Avoid standalone mode to bypass WebKit bug
- NFR30: Motion: Respect `prefers-reduced-motion`

### Additional Requirements (Architecture)

- AR1: Use Vite + React + vite-plugin-pwa v1 starter template.
- AR2: Deployment to Cloudflare Pages (frontend) and Cloudflare Worker (proxy).
- AR3: Cloudflare R2 bucket binding for image and metadata storage.
- AR4: Multi-provider LLM fallback chain (Gemini 2.5 Flash -> Groq Llama 4 Scout).
- AR5: 55ml step increments for Fill Confirmation slider (Fail-safe floor of 1 step).
- AR6: Annotation Rendering via absolutely-positioned SVG overlay (not Canvas).
- AR7: Vertical Step Slider using `@radix-ui/react-slider`.
- AR8: Coordinate Mapping via `getBoundingClientRect` + `naturalWidth/Height`.
- AR9: RTL support via `dir="rtl"` on flex container using CSS logical properties.
- AR10: No secrets in client-side code; use `wrangler secret put`.

### UX Design Requirements

- UX-DR1: Implement Olive Green (`#2D6A4F`) design system with food-adjacent warm palette.
- UX-DR2: Verify WCAG 2.1 AA contrast compliance (≥ 4.5:1) for all text/background pairs.
- UX-DR3: Ensure all interactive elements have ≥ 44x44px touch targets.
- UX-DR4: Privacy notice modal overlay for first-time users (localStorage tracked).
- UX-DR5: Animated bottle filling spinner during API analysis state.
- UX-DR6: Responsive layout optimized for mobile portrait (375-430px) with centered max-width.
- UX-DR7: iOS Safari compatibility: must work within browser chrome (no standalone mode).
- UX-DR8: "Open in Safari" detection and visual prompt for iOS in-app browsers.
- UX-DR9: Color-coded confidence indicators (Green/Yellow/Orange) and confidence-specific UI states.
- UX-DR10: 600ms fill gauge animation on result display (respects motion preferences).
- UX-DR11: Fill Confirmation: "What you see is what you confirm" visual alignment between line and slider.

## Requirements Coverage Map

### FR Coverage Map

- FR1: Epic 1 - QR code navigation with pre-loaded context
- FR2: Epic 1 - Display bottle name/capacity
- FR3: Epic 5 - Detect and handle unregistered SKU
- FR4: Epic 1 - Load bottle geometry and nutrition from local data
- FR5: Epic 1 - Activate rear camera in-app
- FR6: Epic 1 - Live viewfinder with framing guide
- FR7: Epic 1 - Capture still photo from viewfinder
- FR8: Epic 1 - Preview captured photo
- FR9: Epic 1 - Retake photo option
- FR10: Epic 1 - Compress image before transmission
- FR11: Epic 1 - Submit photo to AI vision API
- FR12: Epic 1 - Estimate fill level as percentage
- FR13: Epic 1 - Return confidence level with estimate
- FR14: Epic 1 - Automatic fallback to secondary AI provider
- FR15: Epic 5 - Surface image quality issues to user
- FR16: Epic 3 - Calculate remaining volume from fill % and geometry
- FR17: Epic 3 - Calculate consumed volume
- FR18: Epic 3 - Convert volumes to tablespoons and cups
- FR19: Epic 3 - Calculate nutritional values for consumed volume
- FR20: Epic 3 - Display remaining and consumed simultaneously
- FR21: Epic 2 & 3 - View fill percentage with visual gauge
- FR22: Epic 3 - View volumes in three units on single screen
- FR23: Epic 3 - View nutritional facts for consumed amount
- FR24: Epic 4 - See confidence indicator
- FR25: Epic 4 - See retake prompt for low confidence
- FR26: Epic 2 & 4 - Indicate estimate accuracy (4 options)
- FR27: Epic 2 - Provide corrected fill percentage via slider
- FR28: Epic 4 - Validate feedback for consistency
- FR29: Epic 4 - Store validated feedback with scan record
- FR30: Epic 4 - Store captured image for training
- FR31: Epic 4 - Store scan metadata
- FR32: Epic 4 - Update scan record with feedback
- FR33: Epic 4 - Mark records as training-eligible
- FR34: Epic 5 - Clear error message with retry option
- FR35: Epic 5 - Network unavailability message
- FR36: Epic 5 - iOS Safari guidance for incompatible browser
- FR37: Epic 1 & 5 - Camera permission denied message with instructions
- FR38: Epic 1 & 5 - Privacy notice about image storage
- FR39: Epic 2 - Disclaimer about estimate accuracy

## Epic List

### Epic 1: Basic Scan Experience (End-to-End MVP)
Users can scan a physical bottle QR code and receive an immediate AI-powered baseline fill level estimate in a frictionless single-flow interaction.
**FRs covered:** FR1, FR2, FR4, FR5, FR6, FR7, FR8, FR9, FR10, FR11, FR12, FR13, FR14, FR37, FR38

### Epic 2: Fill Verification & Accuracy
Users can visually confirm or adjust the AI's estimation using an annotated photo overlay and a precision slider, ensuring tracking accuracy.
**FRs covered:** FR21, FR26, FR27, FR39

### Epic 3: Deep Consumption Insights
Users receive meaningful dietary data through calculated volume metrics (ml, tbsp, cups) and nutritional facts (calories, fat) for the oil they've consumed.
**FRs covered:** FR16, FR17, FR18, FR19, FR20, FR21, FR22, FR23

### Epic 4: Feedback Loop & Data Quality
The system captures user corrections and metadata to build a high-quality training dataset for future model improvement while providing confidence indicators to the user.
**FRs covered:** FR24, FR25, FR26, FR28, FR29, FR30, FR31, FR32, FR33

### Epic 5: Resilience, Privacy & Edge Cases
Users are guided through technical failures, device compatibility issues, and privacy notifications, ensuring a professional and trustworthy experience.
**FRs covered:** FR3, FR15, FR34, FR35, FR36, FR37, FR38

---

## Epic 1: Basic Scan Experience (End-to-End MVP)

### Story 1.1: Project Foundation & PWA Setup
As a developer, I want a working PWA foundation with Vite + React + PWA plugin, so that I can build the app with fast development and proper PWA capabilities.
**Acceptance Criteria:**
- **Given** I have initialized the project
- **When** I run `npm run dev`
- **Then** the app loads at localhost:5173 with React working
- **And** the PWA manifest is generated with browser mode (not standalone)
- **And** service worker is configured for app shell caching
- **And** the app loads offline after first visit

### Story 1.2: Cloudflare Infrastructure Setup
As a developer, I want Cloudflare Pages, Worker, and R2 configured, so that I have the hosting, API proxy, and storage infrastructure ready.
**Acceptance Criteria:**
- **Given** I have Cloudflare account credentials
- **When** I deploy the infrastructure
- **Then** Cloudflare Pages project is created and connected to GitHub
- **And** Cloudflare Worker is deployed with R2 bucket binding
- **And** Worker has /health endpoint returning 200 OK
- **And** Worker enforces origin validation and rate limiting (10 req/min per IP)
- **And** API keys (GEMINI_API_KEY, GROQ_API_KEY) are stored as Worker secrets

### Story 1.3: Bottle Registry & Nutrition Data
As a developer, I want bottle registry and USDA nutrition data bundled in the app, so that bottle information loads instantly without network calls.
**Acceptance Criteria:**
- **Given** I have bottle specifications and USDA nutrition data
- **When** I build the app
- **Then** bottleRegistry.js contains 2-3 SKUs with geometry and oil type
- **And** oilNutrition.js contains per-100g USDA data for each oil type
- **And** each bottle entry includes: sku, name, oilType, shape, totalVolumeMl, geometry
- **And** nutrition data includes: calories, totalFatG, saturatedFatG, densityGPerMl

### Story 1.4: QR Landing Page
As a user, I want to scan a QR code and see my bottle information instantly, so that I can quickly start tracking my oil consumption.
**Acceptance Criteria:**
- **Given** I scan a QR code with ?sku=filippo-berio-500ml parameter
- **When** the app loads
- **Then** I see the bottle name, capacity, and oil type displayed
- **And** I see a "Start Scan" button to begin camera capture
- **And** if SKU is not in registry, I am redirected to the "Unsupported Bottle" screen (Story 5.3)
- **And** the page loads in under 3 seconds on first visit (cold)
- **And** the page loads in under 1 second on repeat visits (cached)

### Story 1.5: Camera Activation & Permission Handling
As a user, I want to activate my phone's rear camera with clear guidance, so that I can prepare to photograph my oil bottle.
**Acceptance Criteria:**
- **Given** I am on the QR landing page and have tapped "Start Scan"
- **When** the camera activation begins
- **Then** the rear-facing camera activates (not front-facing)
- **And** I see a live viewfinder showing the camera feed
- **And** I see a color-coded framing guide overlay (green = aligned / amber = marginal / red = no bottle detected)
- **And** if blur score exceeds threshold, I see a "Photo too blurry — hold steady" guidance message
- **And** the camera activates in under 2 seconds
- **And** if permission is denied, I see a "Camera access required" message with iOS/Android specific instructions to enable it in settings.

### Story 1.6: Photo Capture & Preview
As a user, I want to capture a still photo from the viewfinder and preview it, so that I can verify the image quality before submitting.
**Acceptance Criteria:**
- **Given** the camera viewfinder is active
- **When** I tap the capture button (or auto-capture triggers)
- **Then** a still photo is captured from the current frame
- **And** the viewfinder freezes showing the captured image
- **And** I see "Retake" and "Use Photo" buttons
- **And** the image is captured at 800px width with JPEG quality 0.78

### Story 1.7a: Worker API Proxy & Security
As a developer, I want a secure Worker /analyze endpoint, so that I have a protected interface for AI requests.
**Acceptance Criteria:**
- **Given** an incoming request to /analyze
- **When** processed by the Worker
- **Then** it validates the SKU exists in the registry
- **And** it rejects images larger than 4MB
- **And** it enforces origin validation against the production domain
- **And** it returns a 429 response if the rate limit is exceeded

### Story 1.7b: AI Vision Integration & Fallback
As a developer, I want the Worker to integrate Gemini with Groq fallback, so that fill estimates are reliable.
**Acceptance Criteria:**
- **Given** a valid /analyze request payload
- **When** calling the AI providers
- **Then** it calls Gemini using a round-robin key pool (`GEMINI_KEY_1..GEMINI_KEY_N`, min 2 keys)
- **And** on 429 it advances to the next key in the pool; pool exhausted → falls to Groq Llama 4 Scout
- **And** on 5xx it retries once then advances to next key or falls to Groq
- **And** the LLM prompt includes 2 low-resolution reference images (100% and 25% fill) as few-shot visual anchors stored as Worker environment assets; combined overhead < 15KB
- **And** it automatically falls back to Groq Llama 4 Scout if entire Gemini key pool fails
- **And** the response follows the schema: `{"fillPercentage": number, "confidence": "high|medium|low", "imageQualityIssues": string[], "reasoning": string}`
- **And** the Worker stores `llmKeyIndex` (which key produced the result) in the inference metadata record
- **And** the total round-trip completes in under 8 seconds (p95)

---

## Epic 2: Fill Verification & Accuracy

### Story 2.1: `fillMlToPixelY` Coordinate Mapping Utility
As a developer, I want a pure TypeScript utility function that maps water volume to a CSS pixel Y-coordinate, so that the annotation line is correctly positioned over the bottle photo regardless of display size.
**Acceptance Criteria:**
- **Given** a loaded <img> element and bottle bounds (Top/Bottom Pct)
- **When** I call `fillMlToPixelY(waterMl, capacity, imgEl, top, bottom)`
- **Then** it returns the correct CSS pixel Y-coordinate accounting for `object-fit: contain` letterboxing.
- **And** it returns 0 if the image is not yet loaded.

### Story 2.2: Vertical Step Slider & SVG Overlay
As a user, I want a vertical slider beside my photo that repositions a dashed line on the bottle, so that I can visually verify and adjust the AI estimate in 55ml steps.
**Acceptance Criteria:**
- **Given** I am on the Fill Confirmation screen
- **When** I drag the vertical slider (Radix-based)
- **Then** the red dashed SVG line moves in real-time to match the slider value.
- **And** the slider enforces a minimum of 55ml (cannot set to 0).
- **And** at 100% fill, the line aligns correctly with the bottle shoulder.
- **And** the layout adapts to RTL by moving the slider to the right side of the image.

### Story 2.3: Confirmation Flow Integration
As a user, I want to be brought to the confirmation screen after analysis and lock in my result, so that my volume data is accurate.
**Acceptance Criteria:**
- **Given** AI analysis completes
- **When** I arrive at the confirmation screen
- **Then** the slider initializes at the AI estimate snapped to the nearest 55ml.
- **And** while waiting for AI result, I see a loading indicator with copy 'Analyzing your bottle…'
- **And** tapping "Confirm" uses the slider value for all downstream nutrition/volume displays.
- **And** tapping "Retake" returns to the camera flow (Story 1.5).

---

## Epic 3: Deep Consumption Insights

### Story 3.1: Calculation Engine (Volume & Nutrition)
As a developer, I want an engine that calculates volumes and nutritional values from the confirmed fill level, so that users see accurate dietary data.
**Acceptance Criteria:**
- **Given** a confirmed waterMl value
- **When** calculations run
- **Then** it computes remaining/consumed volumes in ml, tbsp, and cups.
- **And** it calculates Calories, Total Fat, and Saturated Fat using bundled USDA data and 0.92 g/ml oil density.

### Story 3.2a: Result Header & Fill Gauge
As a user, I want to see a bold fill gauge, so that my scan result feels meaningful.
**Acceptance Criteria:**
- **Given** I have confirmed my fill level
- **When** the result screen renders
- **Then** I see a bottle-shaped SVG gauge that animates from 0 to the target level over 600ms.
- **And** the animation respects `prefers-reduced-motion: reduce`.
- **And** the result screen shows a ±15% accuracy disclaimer.

### Story 3.2b: Nutrition & Volume Panels
As a user, I want to see detailed volume and nutrition panels, so that I understand my oil consumption.
**Acceptance Criteria:**
- **Given** result data is available
- **When** the screen renders
- **Then** I see a breakdown of volumes in 3 units (ml, tbsp, cups).
- **And** I see a distinct "Nutrition Facts" panel with Calories and Fat data.
- **And** all text/background combinations meet WCAG 2.1 AA contrast ratios.

### Story 3.3: Consumption Measurement Slider
As a user, I want a slider on the result screen that helps me measure how much oil I'm about to use in cooking, so that I can track my portions in familiar cup units.
**Acceptance Criteria:**
- **Given** I am on the Result screen and remaining oil >= 55ml
- **When** the screen renders
- **Then** a vertical Radix slider appears beside the bottle image, anchored at the confirmed fill level (top = current oil level)
- **And** the slider moves in 55ml steps; minimum value = 0 (no movement); maximum = remaining oil
- **And** below the slider, a cup visualization updates at each step:
  - 55ml → "½ Cup" (half-filled SVG cup icon)
  - 110ml → "1 Cup" (full SVG cup icon)
  - 165ml → "1½ Cups" (half-filled + full icons)
  - pattern: n × 55ml = n/2 Cups; icon alternates half/full per step
- **And** secondary text shows "Remaining after use: {remainingMl - selectedMl}ml" in real time
- **And** haptic feedback fires on each 55ml increment (if device supports)
- **And** the bottle fill line does NOT change (slider is measurement-only, not a new fill confirmation)
- **Given** remaining oil < 55ml
- **When** the screen renders
- **Then** the slider is hidden and replaced with "Less than ½ cup remaining (Nml)"
- **And** the component uses CSS logical properties for RTL layout support
- **Dependencies:** Story 2.3 (confirmedFillMl), Story 3.1 (volumeCalculator)
- **Component:** `<ConsumptionSlider />` (new)
- **AR:** Radix UI Slider (vertical), consistent with Epic 2 slider

---

## Epic 4: Feedback Loop & Data Quality

### Story 4.1: Data Persistence (R2 Storage + Supabase)
As a developer, I want every scan and correction stored in R2 and training-eligible records mirrored to Supabase, so that we can build a training dataset for AI improvement.
**Acceptance Criteria:**
- **Given** a scan is processed or feedback is submitted
- **When** stored by the Worker
- **Then** the image is saved to `images/{scanId}.jpg`
- **And** metadata is saved to `metadata/{scanId}.json` using the `inference` block schema:
  ```json
  {
    "inference": {
      "localModelResult": null,
      "localModelConfidence": null,
      "localModelVersion": null,
      "llmFallbackUsed": true,
      "llmProvider": "gemini-2.5-flash",
      "llmKeyIndex": 2,
      "llmFillPercentage": 42,
      "llmConfidence": "high",
      "llmLatencyMs": 2340
    }
  }
  ```
- **And** user corrections are appended to the metadata record
- **And** when `trainingEligible` becomes `true`, the Worker writes a corresponding row to the Supabase `training_samples` table (async, non-blocking)
- **And** if R2 write fails, the error is logged but the user still sees their result
- **And** if Supabase write fails, the error is logged but does not affect user-facing response

### Story 4.2: Confidence & Feedback UI
As a user, I want to see confidence indicators and provide quick accuracy feedback, so that I can help improve the system.
**Note:** This story depends on Epic 3 (Result Screen) being complete.
**Acceptance Criteria:**
- **Given** the result screen is displayed (Story 3.2a)
- **When** I view the results
- **Then** I see a color-coded confidence badge (Green/Yellow/Orange).
- **And** I can tap "About right", "Too high", "Too low", or "Way off" to provide quick feedback.
- **And** tapping "Way off" (or high variance) displays the second correction slider (Story 7 UX).
- **And** "Low confidence" results trigger a specific prompt to retake the photo.

### Story 4.3: Feedback Validation Logic
As a developer, I want user feedback validated for sanity, so that suspicious responses are flagged.
**Acceptance Criteria:**
- **Given** the Worker receives user feedback
- **When** validation runs
- **Then** it flags responses that are "too fast" (<3s) or contradictory (e.g., "Too high" but user estimate is lower than AI).
- **And** records with no flags are marked as `trainingEligible: true`.

---

## Epic 5: Resilience, Privacy & Edge Cases

### Story 5.1: Error Handling & Offline Support
As a user, I want clear guidance when things go wrong, so that I don't feel lost during technical issues.
**Acceptance Criteria:**
- **Given** a network failure or AI analysis error
- **When** the app is active
- **Then** I see a clear error message with "Retry" and "Retake Photo" options.
- **And** if I'm offline, the "Start Scan" button is disabled with a "Network connection required" notice.

### Story 5.2: iOS Compatibility & Privacy
As a user, I want to be warned about iOS browser issues and informed about my privacy, so that I can use the app safely.
**Acceptance Criteria:**
- **Given** I am on iOS in an in-app browser
- **When** the app loads
- **Then** I see a visual prompt to "Open in Safari" to ensure camera compatibility.
- **And** before my first scan, I see a privacy notice explaining that images are stored for AI improvement but no PII is collected.

### Story 5.3: Unknown Bottle Handling & Community Contribution
As a user, I want to contribute scans of unsupported bottles, so that I can help improve the app while feeling like a valued pioneer.
**Acceptance Criteria:**
- **Given** I scan an unregistered SKU
- **When** the app loads
- **Then** I see a "Help us learn this bottle" message instead of a hard error.
- **And** I can still take and submit a photo as a "Community Contribution."
- **And** the Worker stores the scan in R2 with the `unsupported_sku_contribution` metadata tag.
- **And** the app displays a "Thank You" message showing my local contribution count (stored in localStorage).

### Story 5.4: CI/CD Pipeline (NFR18)
As a developer, I want a GitHub Actions pipeline that runs tests and deploys automatically, so that main is always stable and deployable.
**Acceptance Criteria:**
- **Given** a code push to the `master` branch
- **When** the CI pipeline triggers
- **Then** it runs vitest unit tests for both frontend and worker
- **And** it blocks deployment if any test fails
- **And** it automatically deploys the frontend to Cloudflare Pages on success
- **And** it automatically deploys the worker via `wrangler-action@v3` on success

---

## Epic 6: Admin Dashboard
_Track C — begins after Epic 4 complete (requires real scan data in R2/Supabase)_

### Story 6.1: Admin Authentication
As Ahmed (admin), I want a password-protected admin area, so that scan data and corrections are only accessible to me.
**Acceptance Criteria:**
- **Given** I navigate to `/admin`
- **When** no valid session token exists in localStorage
- **Then** I see a password prompt
- **And** submitting correct password → `POST /admin/auth` → receives session token stored in localStorage with 24h expiry
- **And** submitting wrong password → 401 error displayed
- **Given** a valid session token exists
- **When** I navigate to `/admin`
- **Then** I am taken directly to the scan list (Story 6.2)
- **And** all `/admin/*` Worker routes validate `Authorization: Bearer <token>` against `ADMIN_SECRET`

### Story 6.2: Scan Review Dashboard
As Ahmed, I want to browse all scans with filter and detail view, so that I can identify inaccurate readings efficiently.
**Acceptance Criteria:**
- **Given** I am authenticated at `/admin`
- **When** the dashboard loads
- **Then** I see a paginated list of scans (20/page, newest first)
- **And** each row shows: thumbnail (60×60px), SKU, date, LLM fill %, local model result ("—" if null), trainingEligible badge
- **And** filter tabs: [All] [Training-eligible] [Needs review] [Admin uploads]
- **Given** I tap a scan row
- **When** the detail view opens
- **Then** I see the full image, inference panel (LLM result vs local model side by side), user feedback (if any), and current trainingEligible status

### Story 6.3: Admin Correction Flow
As Ahmed, I want to flag and correct inaccurate scan readings, so that the training data has reliable ground-truth labels.
**Acceptance Criteria:**
- **Given** I am on a scan detail view
- **When** I tap an accuracy button
- **Then** [Too Big] [Too Small] [Correct] [Way Off] buttons are shown
- **And** tapping "Correct" → marks trainingEligible: true with no correction entry
- **And** tapping any other button → shows "Correct fill %" text input AND [Run LLM Again] button
- **Given** I enter a manual fill % and tap Save
- **When** the Worker processes the correction
- **Then** R2 metadata is updated with `adminCorrection: { correctedFillPct, by: "admin", method: "manual", at: timestamp }`
- **And** `trainingEligible` is set to `true`
- **And** a Supabase `training_samples` row is upserted with `label_source: "admin_correction"`, `label_confidence: 1.0`
- **Given** I tap [Run LLM Again]
- **When** the Worker re-calls the LLM (using key rotation)
- **Then** result is stored in `adminLlmResult` field in R2 metadata
- **And** displayed in the scan detail view alongside original result

### Story 6.4: Admin Image Upload
As Ahmed, I want to upload labeled images directly, so that I can seed the training dataset with high-quality examples.
**Acceptance Criteria:**
- **Given** I am on the admin dashboard
- **When** I tap "Upload Image"
- **Then** I see a form: image file picker (JPEG/PNG, max 4MB), SKU dropdown (from bottleRegistry), fill level % slider (0–100, step 1), notes textarea (optional)
- **Given** I submit the form
- **When** the Worker processes the upload
- **Then** image is stored to R2 as `images/admin-{uuid}.jpg`
- **And** metadata is written with `source: "admin_upload"`, `trainingEligible: true`
- **And** Supabase row inserted with `label_source: "admin_upload"`, `label_confidence: 1.0`
- **And** the upload appears in the scan list with "Admin Upload" badge

### Story 6.5: Training Data Export
As Ahmed, I want to export training-eligible scans as CSV, so that I can feed them into the model training pipeline.
**Acceptance Criteria:**
- **Given** I am on the admin dashboard
- **When** I tap "Export training-eligible scans (CSV)"
- **Then** a CSV file downloads containing: scanId, imageUrl, confirmedFillPct, labelSource, correctionMethod, sku, timestamp
- **And** only `trainingEligible: true` records are included
- **And** the export completes within 5 seconds for up to 10,000 records

---

## Epic 7: Local Model + Training Pipeline
_Track B/D — Supabase infrastructure (7.1) deploys at POC launch; CNN model (7.3–7.5) gates on 500 training-eligible scans (~Month 4–6)_

### Story 7.1: Supabase Training Database
As a developer, I want training-eligible scan data mirrored to Supabase, so that we have a queryable, structured dataset for model training.
**Acceptance Criteria:**
- **Given** a scan's `trainingEligible` becomes `true`
- **When** the Worker processes the event (scan completion or admin correction)
- **Then** a row is inserted/upserted in Supabase `training_samples` table with all required fields (see architecture Section 15)
- **And** `label_confidence` is set per source: admin_correction/upload → 1.0, user_feedback (validated) → 0.85, llm_only (high conf) → 0.60
- **And** `split` is assigned at insert time (80% train / 10% val / 10% test)
- **And** Supabase write is async and non-blocking (does not affect user-facing p95)
- **And** write failures are logged to Worker console, not surfaced to users

### Story 7.2: Training Data Augmentation Pipeline
As a developer, I want an augmentation script that multiplies training samples, so that we reach model training threshold faster.
**Acceptance Criteria:**
- **Given** base training samples in Supabase where `augmented = false`
- **When** the augmentation script runs (manual trigger or CI scheduled job)
- **Then** it generates ~8 variants per image: brightness ±20%, contrast ±15%, horizontal flip, rotation ±5°, JPEG quality variation (0.6–0.95)
- **And** each variant is written to R2 and a new Supabase row inserted with `augmented: true`
- **And** the script is idempotent (re-running does not create duplicate variants)
- **And** training activation threshold is 500 base (non-augmented) training-eligible scans

### Story 7.3: TF.js CNN Regressor — Training & Deployment
As a developer, I want a trained TF.js fill-level regressor deployed to R2, so that the PWA can run on-device inference.
**Acceptance Criteria:**
- **Given** 500+ training-eligible base scans available in Supabase
- **When** training script runs (Python, Colab or local GPU)
- **Then** it trains MobileNetV3-Small backbone + single sigmoid regression head using Huber loss
- **And** achieves validation MAE ≤ 10% on held-out val split
- **And** exports TF.js LayersModel format: `model.json` + weight shards
- **And** files are uploaded to R2 at `models/fill-regressor/v{semver}/model.json`
- **And** a row is inserted into Supabase `model_versions` table with version, MAE, val_accuracy, training_samples_count, r2_key, is_active: true

### Story 7.4: Client-Side Model Integration & Fallback Routing
As a user, I want the app to use on-device AI for fill estimation when available, so that analysis is faster, cheaper, and works offline.
**Acceptance Criteria:**
- **Given** the PWA loads for the first time after model deployment
- **When** the user initiates analysis
- **Then** the model is lazy-loaded from R2, cached in IndexedDB
- **And** subsequent loads use the cached model without re-downloading
- **Given** the model is loaded and produces a result
- **When** `localModelConfidence >= 0.75`
- **Then** the local result is used directly; no Worker /analyze call is made
- **And** the inference record shows `llmFallbackUsed: false`
- **Given** `localModelConfidence < 0.75` or model not yet loaded
- **When** analysis runs
- **Then** the PWA falls through to Worker /analyze (existing LLM path)
- **And** the request body includes `localModelResult` and `localModelConfidence` for storage
- **And** `llmFallbackUsed: true` in metadata

### Story 7.5: Model Version Management
As a developer, I want the PWA to automatically pick up new model versions, so that improvements deploy without user action.
**Acceptance Criteria:**
- **Given** the PWA loads
- **When** it checks `GET /model/version`
- **Then** it compares the response version against the cached model version in IndexedDB
- **And** if a newer version is available, re-downloads the model and updates IndexedDB cache
- **Given** Ahmed deploys a new model version in Supabase `model_versions`
- **When** `is_active` is set to `true` for the new version
- **Then** the next PWA load detects and downloads the update
- **And** the Admin dashboard (Story 6.2) shows current model version, MAE, and training sample count
- **Given** a model version causes accuracy regression
- **When** Ahmed sets the previous version's `is_active` to `true` in Supabase
- **Then** PWA reverts to the previous model on next load
