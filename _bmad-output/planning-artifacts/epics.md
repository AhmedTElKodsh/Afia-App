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

# Safi Oil Tracker - Consolidated Epics & Stories

## Overview

This document is the single source of truth for Safi Oil Tracker's development. It merges all planning artifacts into a cohesive, actionable backlog.

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
- **Then** it calls Gemini 2.5 Flash with a structured JSON prompt
- **And** it automatically falls back to Groq Llama 4 Scout if Gemini returns 429/5xx
- **And** the response follows the schema: `{"fillPercentage": number, "confidence": "high|medium|low", "imageQualityIssues": string[], "reasoning": string}`
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

---

## Epic 4: Feedback Loop & Data Quality

### Story 4.1: Data Persistence (R2 Storage)
As a developer, I want every scan and correction stored in R2, so that we can build a training dataset for AI improvement.
**Acceptance Criteria:**
- **Given** a scan is processed or feedback is submitted
- **When** stored by the Worker
- **Then** the image is saved to `images/{scanId}.jpg`
- **And** metadata (sku, timestamp, provider, estimates, confidence) is saved to `metadata/{scanId}.json`.
- **And** user corrections are appended to the metadata record.
- **And** if R2 write fails, the error is logged but the user still sees their result.

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
