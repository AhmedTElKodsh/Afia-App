---
stepsCompleted:
  [step-01-validate-prerequisites, step-02-design-epics, step-03-create-stories, step-04-reorganize-by-user-value]
inputDocuments:
  - prd.md
  - architecture.md
  - ux-design-specification.md
---

# Afia Oil Tracker — Epics & Stories (User-Value Sequence)

**Author:** Ahmed
**Date:** 2026-02-27
**Reorganization:** Technical sequence → User-value sequence

---

## Overview

This document is the **canonical implementation source of truth** for Afia Oil Tracker. Stories are organized by user-value delivery: Epic 1 delivers a complete working scan flow; subsequent epics add enrichment, feedback, resilience, and operational concerns.

## Requirements Inventory

### Functional Requirements (FR1–FR39)

See `prd.md` for complete list. FR coverage is mapped per-epic below.

### Non-Functional Requirements (NFR1–NFR30)

See `prd.md` for complete list. NFRs are cross-cutting and apply across all epics.

---

## Epic Summary

| Epic | Name | Stories | Goal | FRs Covered |
|------|------|---------|------|-------------|
| 1 | Core Scan Experience | 1.1–1.14 (14) | Complete working scan flow: QR → Camera → AI → Result | FR1-2, FR4-14, FR16-18, FR20-22 |
| 2 | Rich Consumption Insights | 2.1–2.7 (7) | Enhanced visuals, nutrition, confidence display | FR19, FR21+, FR22+, FR23, FR24, FR39 |
| 3 | Continuous Improvement Loop | 3.1–3.8 (8) | Feedback collection + training data storage | FR26-33 |
| 4 | Resilience & Edge Cases | 4.1–4.7 (7) | Error handling, privacy, compatibility | FR15, FR25, FR34-38 |
| 5 | Deployment & Operations | 5.1–5.2 (2) | Unknown bottle handling, CI/CD | FR3 |

**Total: 38 stories across 5 epics**

---

## Epic 1: Core Scan Experience (End-to-End MVP)

Users can scan a QR code, photograph their oil bottle, and receive an AI-powered fill estimate with volume measurements in ml, tablespoons, and cups — a complete end-to-end flow.

**FRs covered:** FR1, FR2, FR4, FR5, FR6, FR7, FR8, FR9, FR10, FR11, FR12, FR13, FR14, FR16, FR17, FR18, FR20, FR21, FR22

### Story 1.1: Project Foundation & PWA Setup

As a developer,
I want a working PWA foundation with Vite + React + PWA plugin,
So that I can build the app with fast development and proper PWA capabilities.

**Acceptance Criteria:**

**Given** I have initialized the project
**When** I run `npm run dev`
**Then** the app loads at localhost:5173 with React working
**And** the PWA manifest is generated with `display: "browser"` (not standalone)
**And** `apple-mobile-web-app-capable` meta tag is absent
**And** service worker is configured with CacheFirst for app shell, NetworkOnly for API routes
**And** the app shell loads offline after first visit showing "Network required for scanning"

### Story 1.2: Cloudflare Infrastructure Setup

As a developer,
I want Cloudflare Pages, Worker, and R2 configured,
So that I have the hosting, API proxy, and storage infrastructure ready.

**Acceptance Criteria:**

**Given** I have Cloudflare account credentials
**When** I deploy the infrastructure
**Then** Cloudflare Pages project is created and connected to GitHub
**And** Cloudflare Worker is deployed with R2 bucket binding
**And** KV namespace is created for rate limiting
**And** Worker has GET /health endpoint returning 200 OK
**And** Worker enforces origin validation (production domain + localhost)
**And** Worker enforces rate limiting (10 req/min per IP via KV sliding window)
**And** Worker rejects payloads > 4MB
**And** API keys (GEMINI_API_KEY, GROQ_API_KEY) are stored as Worker secrets

### Story 1.3: Bottle Registry & Nutrition Data

As a developer,
I want bottle registry and USDA nutrition data bundled in the app,
So that bottle information loads instantly without network calls.

**Acceptance Criteria:**

**Given** I have bottle specifications and USDA nutrition data
**When** I build the app
**Then** `bottleRegistry.ts` contains 2–3 SKUs with geometry and oil type
**And** `oilNutrition.ts` contains per-100g USDA data for each oil type
**And** each bottle entry includes: sku, name, oilType, shape (cylinder/frustum), totalVolumeMl, geometry
**And** each geometry includes shape-specific dimensions (heightMm, diameterMm for cylinder; heightMm, topDiameterMm, bottomDiameterMm for frustum)
**And** nutrition data includes: calories, totalFatG, saturatedFatG, densityGPerMl
**And** data matches the TypeScript interfaces defined in data-schemas.md

### Story 1.4: QR Landing Page

As a user,
I want to scan a QR code and see my bottle information instantly,
So that I can quickly start tracking my oil consumption.

**Acceptance Criteria:**

**Given** I scan a QR code with `?sku=filippo-berio-500ml` parameter
**When** the app loads
**Then** I see the bottle name, capacity, and oil type displayed
**And** I see a "Start Scan" button to begin camera capture
**And** the page loads in under 3 seconds on first visit (4G cold)
**And** the page loads in under 1 second on repeat visits (service worker cached)

### Story 1.5: Camera Activation & Viewfinder

As a user,
I want to activate my phone's rear camera with a live viewfinder,
So that I can prepare to photograph my oil bottle.

**Acceptance Criteria:**

**Given** I am on the QR landing page and have tapped "Start Scan"
**When** the camera activation begins
**Then** the rear-facing camera activates via `getUserMedia({ video: { facingMode: 'environment' } })`
**And** I see a live viewfinder showing the camera feed
**And** I see a bottle-shaped framing guide overlay to help align the bottle
**And** the camera activates in under 2 seconds
**And** if camera permission is denied, I see a permission denied error (Story 4.6)

### Story 1.6: Photo Capture & Preview

As a user,
I want to capture a still photo from the viewfinder and preview it,
So that I can verify the image quality before submitting.

**Acceptance Criteria:**

**Given** the camera viewfinder is active
**When** I tap the capture button
**Then** a still photo is captured from the current video frame to canvas
**And** the image is resized to 800px width and compressed to JPEG quality 0.78 (~70KB output)
**And** image compression completes in under 500ms
**And** the viewfinder shows the captured image as a preview
**And** I see "Retake" and "Use Photo" buttons

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

### Story 1.8: Worker API Proxy — Analyze Endpoint

As a developer,
I want a Worker POST /analyze endpoint that proxies AI requests,
So that API keys stay secure and requests are validated.

**Acceptance Criteria:**

**Given** the Worker is deployed with API key secrets
**When** a POST request is sent to /analyze with `{ sku, imageBase64 }`
**Then** the Worker validates the request origin against allowlist
**And** the Worker enforces rate limiting (10 req/min per IP)
**And** the Worker validates the SKU exists in a known bottle list
**And** the Worker validates the image is valid base64 and payload is under 4MB
**And** the Worker returns 400 for validation failures with structured error `{ error, code }`
**And** the Worker returns 429 for rate limit violations with `retryAfter` in response
**And** the endpoint follows the API contract in api-spec.md

### Story 1.9: Gemini Vision Integration

As a developer,
I want Gemini 2.5 Flash integrated as the primary AI provider,
So that fill level estimates are fast and accurate.

**Acceptance Criteria:**

**Given** the Worker receives a valid /analyze request
**When** the Worker calls Gemini API
**Then** the request uses `gemini-2.5-flash-latest` model
**And** the request includes the system prompt and user message from llm-prompts.md
**And** the request includes the bottle image as `inline_data` with `mime_type: "image/jpeg"`
**And** generation config sets `temperature: 0.1`, `response_mime_type: "application/json"`, `thinkingBudget: 0`
**And** the response is parsed for `fillPercentage` (integer 0–100), `confidence` (high/medium/low), and optional `imageQualityIssues`
**And** invalid/unparseable responses are treated as provider failure (trigger fallback)

### Story 1.10: Groq Fallback Integration

As a developer,
I want Groq + Llama 4 Scout as automatic fallback when Gemini fails,
So that the app remains functional when Gemini is unavailable.

**Acceptance Criteria:**

**Given** the Worker attempts to call Gemini API
**When** Gemini returns 429 (rate limit) or 5xx (server error)
**Then** the Worker retries Gemini once, then falls back to Groq API
**And** the Groq request uses `llama-4-scout` model via OpenAI-compatible API
**And** the Groq request uses the system prompt and user message from llm-prompts.md
**And** the Groq request sets `temperature: 0.1`, `max_tokens: 500`, `response_format: { type: "json_object" }`
**And** the response is parsed identically to Gemini (same `fillPercentage`, `confidence`, `imageQualityIssues` fields)
**And** the fallback happens transparently — no user action required
**And** the response includes `aiProvider` field indicating which provider was used
**And** if Gemini returns 400 (bad request), no fallback occurs — error returns to client

### Story 1.11: AI Analysis Loading State

As a user,
I want to see clear feedback while my photo is being analyzed,
So that I know the app is working and approximately how long to wait.

**Acceptance Criteria:**

**Given** I have tapped "Use Photo" on the preview
**When** the image is being sent to the API
**Then** I see a loading indicator with "Analyzing your bottle..." text
**And** the loading animation suggests progress (e.g., bottle fill animation)
**And** the loading state shows for the duration of the API call
**And** the loading state transitions to result display on success
**And** the loading state transitions to error prompt on failure (within 10 seconds max)

### Story 1.12: Volume Calculation Engine

As a developer,
I want a volume calculator that computes remaining and consumed oil from fill percentage and bottle geometry,
So that users see accurate volume measurements.

**Acceptance Criteria:**

**Given** I have a fill percentage and bottle geometry data
**When** the volume calculator runs
**Then** it calculates remaining volume using cylinder formula: `V = π × r² × h × (fillPercent / 100)` converted from mm³ to ml
**And** it calculates remaining volume using frustum formula for tapered bottles (per data-schemas.md)
**And** it calculates consumed volume as `totalVolumeMl - remainingMl`
**And** all calculations are accurate to 2 decimal places
**And** the calculator handles boundary cases: 0% (empty) returns 0ml, 100% (full) returns totalVolumeMl
**And** unit tests cover cylinder, frustum, boundary, and mid-range cases

### Story 1.13: Unit Conversion System

As a developer,
I want automatic unit conversion for volumes,
So that users can view measurements in ml, tablespoons, and cups.

**Acceptance Criteria:**

**Given** I have a volume in milliliters
**When** the unit converter runs
**Then** it converts ml to tablespoons using `1 tbsp = 14.7868 ml`
**And** it converts ml to cups using `1 cup = 236.588 ml`
**And** tablespoons are displayed to 1 decimal place
**And** cups are displayed to 1 decimal place
**And** the converter handles 0ml correctly (returns 0 for all units)
**And** unit tests cover standard, small, zero, and large volume cases

### Story 1.14: Basic Result Display

As a user,
I want to see my fill estimate and volume measurements after scanning,
So that I know how much oil remains in my bottle.

**Acceptance Criteria:**

**Given** the AI analysis returns successfully
**When** the result screen displays
**Then** I see the fill percentage prominently (e.g., "68% remaining")
**And** I see remaining volume in ml, tablespoons, and cups
**And** I see consumed volume in ml, tablespoons, and cups
**And** values are formatted clearly (e.g., "340 ml", "23.0 tbsp", "1.4 cups")
**And** the layout is readable on mobile portrait 375–430px viewport
**And** the result screen transitions smoothly from the loading state

---

## Epic 2: Rich Consumption Insights

Users see enhanced result displays with visual fill gauges, detailed nutritional information, and confidence indicators that make consumption data more meaningful and actionable.

**FRs covered:** FR19, FR21 (enhanced), FR22 (enhanced), FR23, FR24, FR39

### Story 2.1: Nutrition Calculator

As a developer,
I want a nutrition calculator that computes consumed nutritional values from volume and oil type,
So that users see accurate calorie and fat information.

**Acceptance Criteria:**

**Given** I have consumed volume in ml and oil type
**When** the nutrition calculator runs
**Then** it converts volume to grams using oil density (0.92 g/ml default)
**And** it calculates calories from per-100g USDA data: `calories = (grams / 100) × per100g.calories`
**And** it calculates total fat: `totalFatG = (grams / 100) × per100g.totalFatG`
**And** it calculates saturated fat: `saturatedFatG = (grams / 100) × per100g.saturatedFatG`
**And** all nutritional values are displayed to 1 decimal place
**And** the calculator uses the correct USDA data for the bottle's oil type from `oilNutrition.ts`
**And** unit tests cover standard, zero, and large volume cases

### Story 2.2: Fill Gauge Visual Component

As a user,
I want to see a visual fill gauge showing my bottle's fill level,
So that I can quickly understand how much oil remains at a glance.

**Acceptance Criteria:**

**Given** I receive an AI fill estimate
**When** the result screen displays
**Then** I see a bottle-shaped fill gauge
**And** the gauge fills to the estimated percentage visually
**And** the fill percentage number is displayed prominently (e.g., "68%")
**And** the gauge uses color to indicate fill level (green > 50%, yellow 25–50%, red < 25%)
**And** the gauge is responsive and renders correctly on 375–430px mobile screens
**And** touch targets on or near the gauge are ≥ 44×44px

### Story 2.3: Volume Breakdown Display

As a user,
I want to see remaining and consumed volumes in multiple units on a single screen,
So that I can understand my oil usage in familiar measurements.

**Acceptance Criteria:**

**Given** the volume calculations are complete
**When** the result screen displays
**Then** I see a "Remaining" section with ml, tablespoons, and cups
**And** I see a "Consumed" section with ml, tablespoons, and cups
**And** all six values are visible without horizontal scrolling
**And** values are formatted clearly (e.g., "450 ml", "30.4 tbsp", "1.9 cups")
**And** the layout is readable on mobile portrait orientation

### Story 2.4: Nutrition Facts Panel

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
**And** the panel is visually distinct from volume breakdown
**And** the panel is easy to read on mobile screens

### Story 2.5: Confidence Level Handling

As a user,
I want to see a confidence indicator with my fill estimate,
So that I understand how reliable the AI's assessment is.

**Acceptance Criteria:**

**Given** the AI analysis returns successfully
**When** the result includes a confidence level (high/medium/low)
**Then** high confidence shows a green indicator with "High confidence" text
**And** medium confidence shows a yellow indicator with "Estimate may be less accurate" text
**And** low confidence shows an orange indicator with "Low confidence — consider retaking" text
**And** the indicator includes both color and text (not color alone — WCAG 2.1 AA)
**And** the indicator is visible near the fill percentage
**And** low confidence triggers the retake prompt (Story 4.2)

### Story 2.6: Confidence Indicator Integration

As a user,
I want the confidence indicator positioned contextually on the result screen,
So that I can see confidence alongside my results without it obscuring key data.

**Acceptance Criteria:**

**Given** the result screen displays
**When** I view my consumption insights
**Then** the confidence indicator appears near the fill gauge
**And** the indicator does not overlap or obscure volume or nutrition data
**And** the indicator uses WCAG 2.1 AA contrast ratio ≥ 4.5:1
**And** the indicator is accessible to screen readers with appropriate ARIA labels

### Story 2.7: Estimate Disclaimer

As a user,
I want to see a disclaimer about estimate accuracy,
So that I understand these are approximations, not certified measurements.

**Acceptance Criteria:**

**Given** the result screen displays
**When** I view my consumption insights
**Then** I see a disclaimer stating "Results are estimates (±15%)"
**And** the disclaimer states "Not certified nutritional analysis"
**And** the disclaimer is visible but not visually dominant
**And** the disclaimer uses plain language
**And** the disclaimer meets WCAG 2.1 AA contrast requirements

---

## Epic 3: Continuous Improvement Loop

Users can provide feedback on estimate accuracy to help improve the AI over time, with their input validated and stored alongside scan images for future model training.

**FRs covered:** FR26, FR27, FR28, FR29, FR30, FR31, FR32, FR33

### Story 3.1: Feedback Prompt UI

As a user,
I want to be asked if the AI estimate was accurate,
So that I can help improve the system with minimal effort.

**Acceptance Criteria:**

**Given** I am viewing my consumption results
**When** the feedback section is visible below the results
**Then** I see the question "Was this estimate accurate?"
**And** I see four response options: "About right", "Too high", "Too low", "Way off"
**And** the options are presented as clear, tappable buttons
**And** all touch targets are ≥ 44×44px
**And** the prompt feels like a natural flow completion, not an interruption
**And** tapping "About right" submits immediately (1-tap happy path)

### Story 3.2: Corrected Estimate Slider

As a user,
I want to provide my own fill percentage estimate when the AI is wrong,
So that the system learns from my correction.

**Acceptance Criteria:**

**Given** I selected "Too high", "Too low", or "Way off"
**When** the correction UI appears
**Then** I see a slider to adjust the fill percentage (1–99%)
**And** the slider starts at the AI's original estimate
**And** I see the current slider value displayed as I move it
**And** I see a "Submit Feedback" button
**And** the slider is easy to use on mobile touch screens (large hit area)
**And** I can submit without adjusting the slider (just the accuracy rating)

### Story 3.3: Feedback Submission Flow

As a user,
I want my feedback submitted quickly and confirmed,
So that I know my input was received.

**Acceptance Criteria:**

**Given** I have selected an accuracy rating (and optionally adjusted the slider)
**When** I tap "Submit Feedback" (or "About right" directly)
**Then** my feedback is sent to the Worker POST /feedback endpoint
**And** the request includes `{ scanId, accuracyRating, correctedFillPercentage? }`
**And** I see a brief loading indicator during submission
**And** I see a "Thank you for your feedback!" confirmation message on success
**And** the submission completes in under 1 second
**And** if submission fails, I see an error message with retry option
**And** the client tracks `responseTimeMs` (time from result display to feedback submission)

### Story 3.4: Worker Feedback Endpoint

As a developer,
I want a Worker POST /feedback endpoint that receives and validates user feedback,
So that only quality data is stored for training.

**Acceptance Criteria:**

**Given** the Worker is deployed
**When** a POST request is sent to /feedback with `{ scanId, accuracyRating, correctedFillPercentage?, responseTimeMs }`
**Then** the Worker validates the scanId exists in R2 metadata
**And** the Worker validates `accuracyRating` is one of: `about_right`, `too_high`, `too_low`, `way_off`
**And** the Worker validates `correctedFillPercentage` is 1–99 if provided
**And** the Worker enforces origin validation and rate limiting (10 req/min per IP)
**And** the Worker returns 400 for validation failures
**And** the Worker returns 200 with `{ feedbackId, validationStatus, validationFlags }` on success
**And** the endpoint follows the API contract in api-spec.md

### Story 3.5: Feedback Validation Logic

As a developer,
I want Layer 1 validation checks on user feedback,
So that suspicious or contradictory responses are flagged.

**Acceptance Criteria:**

**Given** the Worker receives feedback with the original scan's fillPercentage
**When** validation runs
**Then** it flags `too_fast` if `responseTimeMs < 3000` (under 3 seconds)
**And** it flags `boundary_value` if corrected value is exactly 0 or 100
**And** it flags `contradictory` if accuracy is `too_low` but corrected value < AI estimate
**And** it flags `contradictory` if accuracy is `too_high` but corrected value > AI estimate
**And** it flags `extreme_delta` if `|correctedFillPercentage - fillPercentage| > 30`
**And** `validationStatus` is `accepted` when no flags, `flagged` when any flags
**And** `confidenceWeight = max(0.1, 1.0 - flags.length × 0.3)`
**And** `trainingEligible = true` only when `validationStatus === "accepted"`
**And** unit tests cover all flag conditions and edge cases

### Story 3.6: Image Storage to R2

As a developer,
I want captured images stored in R2 during the /analyze flow,
So that we accumulate a training dataset from day one.

**Acceptance Criteria:**

**Given** a photo is submitted to POST /analyze
**When** the Worker processes the request
**Then** the image is stored to R2 at `images/{scanId}.jpg` via Worker R2 binding
**And** the R2 bucket is not publicly accessible
**And** storage completes within the 8-second analysis window (non-blocking if possible)
**And** storage failures are logged but do not block the AI analysis response
**And** the `scanId` is a UUID generated by the Worker

### Story 3.7: Scan Metadata Storage

As a developer,
I want scan metadata stored alongside images during the /analyze flow,
So that we have complete context for each training sample.

**Acceptance Criteria:**

**Given** an AI analysis completes successfully
**When** the Worker stores the scan record
**Then** metadata is stored to R2 at `metadata/{scanId}.json`
**And** metadata includes all fields from the ScanMetadata interface in data-schemas.md
**And** metadata includes: scanId, sku, timestamp, aiProvider, fillPercentage, confidence, latencyMs
**And** metadata includes: imageStoragePath, bottleGeometry snapshot, oilType
**And** metadata includes device info: userAgent, platform, screenWidth (from request headers)
**And** `feedback` field is initially `null`
**And** `trainingEligible` is initially `false`
**And** the scanId is returned to the client for feedback linking

### Story 3.8: Feedback Update to Metadata

As a developer,
I want user feedback appended to existing scan metadata,
So that training samples include both AI output and user corrections.

**Acceptance Criteria:**

**Given** feedback is submitted for a valid scanId
**When** the Worker processes the feedback
**Then** it retrieves the existing `metadata/{scanId}.json` from R2
**And** it populates the `feedback` field with: feedbackId, feedbackTimestamp, accuracyRating, correctedFillPercentage
**And** it populates validation fields: validationStatus, validationFlags, confidenceWeight
**And** it sets `trainingEligible: true` if `validationStatus === "accepted"`
**And** it writes the updated metadata back to R2
**And** the update completes within 1 second
**And** if metadata retrieval fails, feedback is stored as a separate `feedback/{scanId}.json` file

---

## Epic 4: Resilience & Edge Cases

Users receive clear, helpful guidance when issues occur — poor image quality, network problems, permission errors, iOS compatibility — and understand how their data is used.

**FRs covered:** FR15, FR25, FR34, FR35, FR36, FR37, FR38

### Story 4.1: Image Quality Issue Detection

As a user,
I want to be notified if my photo has quality issues,
So that I can retake it and get a better estimate.

**Acceptance Criteria:**

**Given** the AI analysis returns with `imageQualityIssues` array populated
**When** the response is displayed
**Then** I see a specific message per issue:
  - `blur` → "Image is too blurry — try holding the phone steady"
  - `poor_lighting` → "Lighting is poor — try near a window or light"
  - `obstruction` → "Bottle is partially obscured — ensure full bottle is visible"
  - `reflection` → "Strong reflection detected — try a different angle"
**And** I see a "Retake Photo" button
**And** tapping "Retake Photo" returns me to the camera viewfinder
**And** messages use plain language

### Story 4.2: Low Confidence Retake Prompt

As a user,
I want a clear prompt to retake my photo when confidence is low,
So that I can get a more accurate estimate.

**Acceptance Criteria:**

**Given** the AI returns `confidence: "low"`
**When** the result screen displays
**Then** I see a prominent banner: "Low confidence — consider retaking photo"
**And** I see a "Retake Photo" button
**And** tapping the button returns me to the camera viewfinder
**And** the prompt is visually distinct (e.g., orange/warning styling)
**And** the prompt does NOT prevent me from viewing the current results below it
**And** I can still submit feedback on a low-confidence result

### Story 4.3: AI Analysis Failure Handling

As a user,
I want a clear error message when AI analysis fails,
So that I understand what went wrong and can try again.

**Acceptance Criteria:**

**Given** the AI analysis request fails (both Gemini and Groq return errors)
**When** the error response is received
**Then** I see "Unable to analyze image — please try again"
**And** I see a "Retry" button that resubmits the same captured photo
**And** I see a "Retake Photo" button to capture a new image
**And** the error appears within 10 seconds even if all providers timeout
**And** the message uses plain language without technical jargon
**And** the error state is accessible to screen readers

### Story 4.4: Network Unavailability Detection

As a user,
I want to know when I can't scan due to no internet connection,
So that I don't waste time trying to capture photos.

**Acceptance Criteria:**

**Given** I am offline (no network connection)
**When** I navigate to the scan page or attempt to start scanning
**Then** I see "Network connection required for scanning"
**And** the "Start Scan" button is disabled or hidden
**And** I see guidance to connect to WiFi or cellular data
**And** the app shell still loads from service worker cache
**And** when connection is restored, the message disappears and scanning becomes available
**And** offline detection occurs before camera activation (don't waste the camera permission prompt)

### Story 4.5: iOS Browser Compatibility Check

As a user on iOS,
I want guidance to open the app in Safari if I'm in an incompatible browser context,
So that camera functionality works correctly.

**Acceptance Criteria:**

**Given** I am on iOS in a non-Safari context (Instagram in-app browser, Chrome iOS standalone, etc.)
**When** the app loads
**Then** I see "For best experience, open in Safari"
**And** I see instructions: "Tap the share icon and select 'Open in Safari'"
**And** the detection works for common iOS in-app browsers (Instagram, Facebook, LinkedIn, Twitter)
**And** Safari users do NOT see this message
**And** the app also detects iOS standalone PWA mode and shows "Open in Safari" (WebKit camera bug)

### Story 4.6: Camera Permission Denied Handling

As a user,
I want clear instructions when camera access is denied,
So that I know how to grant permission in my device settings.

**Acceptance Criteria:**

**Given** I denied camera permission or it's blocked in device settings
**When** the app attempts to activate the camera via `getUserMedia`
**Then** I see "Camera access is required to scan bottles"
**And** I see platform-specific instructions:
  - iOS: "Go to Settings → Safari → Camera → Allow"
  - Android: "Go to Settings → Apps → Browser → Permissions → Camera → Allow"
**And** I see a "Try Again" button to re-request permission
**And** the error is caught gracefully without app crash
**And** the message is accessible and uses plain language

### Story 4.7: Privacy Notice — First Scan

As a user,
I want to understand how my scan images are used before my first scan,
So that I can make an informed decision.

**Acceptance Criteria:**

**Given** I am about to perform my first scan (detected via localStorage flag)
**When** I tap "Start Scan" for the first time
**Then** I see a notice: "Scan images are stored to improve AI accuracy"
**And** the notice states: "No personal information is collected"
**And** I see an "I Understand" button and a "Learn More" link
**And** tapping "I Understand" sets a localStorage flag, dismisses notice, and proceeds to camera
**And** tapping "Learn More" shows additional privacy details inline
**And** the notice only appears once per device (localStorage persistence)
**And** the notice is accessible and uses plain language

---

## Epic 5: Deployment & Operations

The system handles unknown bottles gracefully and deploys automatically with CI/CD, ensuring operational excellence.

**FRs covered:** FR3

### Story 5.1: Unknown Bottle Handling

As a user,
I want clear feedback when my bottle SKU is not recognized,
So that I understand why the app can't proceed.

**Acceptance Criteria:**

**Given** I scan a QR code with an unregistered SKU parameter (e.g., `?sku=unknown-brand-1L`)
**When** the app loads and looks up the SKU in `bottleRegistry.ts`
**Then** I see "This bottle is not yet supported"
**And** I see the SKU that was scanned
**And** I see a friendly message suggesting the app may support this bottle in the future
**And** the page still loads correctly (no crash or blank screen)

### Story 5.2: CI/CD Pipeline

As a developer,
I want automated deployment via GitHub Actions,
So that every push to `main` deploys both the PWA and Worker reliably.

**Acceptance Criteria:**

**Given** I push code to the `main` branch
**When** GitHub Actions runs the deploy workflow
**Then** it installs dependencies and runs unit tests (`npm test`)
**And** it builds the PWA (`npm run build`)
**And** it deploys the PWA to Cloudflare Pages via `wrangler pages deploy`
**And** it deploys the Worker to Cloudflare Workers via `wrangler deploy`
**And** deployment is blocked if any tests fail
**And** PR pushes trigger preview deployments with auto-commented preview URLs
**And** the workflow follows the structure in deployment-guide.md

---

## FR Coverage Verification

| FR | Story | Epic |
|----|-------|------|
| FR1 | 1.4 | 1 |
| FR2 | 1.4 | 1 |
| FR3 | 5.1 | 5 |
| FR4 | 1.3 | 1 |
| FR5 | 1.5 | 1 |
| FR6 | 1.5 | 1 |
| FR7 | 1.6 | 1 |
| FR8 | 1.6 | 1 |
| FR9 | 1.7 | 1 |
| FR10 | 1.6 | 1 |
| FR11 | 1.8, 1.9 | 1 |
| FR12 | 1.9 | 1 |
| FR13 | 1.9 | 1 |
| FR14 | 1.10 | 1 |
| FR15 | 4.1 | 4 |
| FR16 | 1.12 | 1 |
| FR17 | 1.12 | 1 |
| FR18 | 1.13 | 1 |
| FR19 | 2.1 | 2 |
| FR20 | 1.14 | 1 |
| FR21 | 1.14, 2.2 | 1, 2 |
| FR22 | 1.14, 2.3 | 1, 2 |
| FR23 | 2.4 | 2 |
| FR24 | 2.5, 2.6 | 2 |
| FR25 | 4.2 | 4 |
| FR26 | 3.1 | 3 |
| FR27 | 3.2 | 3 |
| FR28 | 3.5 | 3 |
| FR29 | 3.8 | 3 |
| FR30 | 3.6 | 3 |
| FR31 | 3.7 | 3 |
| FR32 | 3.8 | 3 |
| FR33 | 3.5 | 3 |
| FR34 | 4.3 | 4 |
| FR35 | 4.4 | 4 |
| FR36 | 4.5 | 4 |
| FR37 | 4.6 | 4 |
| FR38 | 4.7 | 4 |
| FR39 | 2.7 | 2 |

**All 39 FRs covered. No gaps.**
