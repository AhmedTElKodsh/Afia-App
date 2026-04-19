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

This document provides the complete epic and story breakdown for Afia Oil Tracker, decomposing the requirements from the PRD, UX Design, and Architecture into implementable stories.

## Epic 1: Core Scan Experience (End-to-End MVP)

Users can scan a QR code, photograph their oil bottle, and receive an AI-powered estimate.

### Story 1.1: Project Foundation & PWA Setup
- **Goal:** Working React PWA with offline caching.
- **AC:** App loads at localhost; PWA manifest uses browser mode; Service worker caches app shell.

### Story 1.2: Cloudflare Infrastructure Setup
- **Goal:** Hosting, API proxy, and storage ready.
- **AC:** Pages/Worker/R2 deployed; Worker enforces rate limits; Secrets stored securely.

### Story 1.3: Bottle Registry & Nutrition Data
- **Goal:** Bundled SKU and USDA data.
- **AC:** Local registry contains 2-3 SKUs with geometry; USDA data bundled as JSON.

### Story 1.4: QR Landing & Unknown SKU Handling
- **Goal:** Deep-link entry with SKU detection.
- **AC:** Pre-loads bottle context from URL; Shows clear message for unregistered SKUs.

### Story 1.5: Camera Activation & Viewfinder
- **Goal:** In-app rear camera feed.
- **AC:** Viewfinder active in < 2s; Framing guide visible; Permission errors handled.

### Story 1.6: Photo Capture & Preview
- **Goal:** Capture and review image.
- **AC:** Captures at 800px; Displays "Retake" vs "Use Photo"; Shutter feedback.

### Story 1.7: Image Analysis Proxy (Worker)
- **Goal:** Secure /analyze endpoint with validation.
- **AC:** Validates SKU/Image/Origin; Implements multi-key rotation (GEMINI_KEY_1..N).

### Story 1.8: AI Integration — Gemini & Few-Shot
- **Goal:** High-accuracy vision analysis.
- **AC:** Uses Gemini 2.5 Flash; Prompt includes reference images (100%/25%); Returns JSON fill %.

### Story 1.9: Groq Fallback Resilience
- **Goal:** Transparent failover to secondary provider.
- **AC:** On Gemini 429/5xx, auto-retries with Groq Llama 4; Provider logged in metadata.

## Epic 2: Rich Consumption Insights

Detailed volume and nutritional feedback based on the AI estimate.

### Story 2.1: Volume Calculation Engine
- **Goal:** Geometry-aware volume math.
- **AC:** Calculates remaining/consumed ml using cylinder/frustum formulas; Accurate to 2 decimals.

### Story 2.2: Unit Conversion System
- **Goal:** ml to Kitchen Units.
- **AC:** Converts ml to tablespoons (14.8ml) and cups (236.6ml) for display.

### Story 2.3: Nutrition Calculator
- **Goal:** Dietary impact calculation.
- **AC:** Converts ml to grams (0.92 density); Computes calories/fat via USDA reference.

### Story 2.4: Result Screen Hero Layout
- **Goal:** Clear, impactful data delivery.
- **AC:** Displays fill gauge, volume breakdown, and nutrition panel on a single screen.

### Story 2.5: Consumption Measurement Slider (Refined)
- **Goal:** Tactical usage planning (Screen 4b/6).
- **AC:** Vertical slider with 55ml (1/2 cup) steps; Displays cup icons and "Remaining after use".

### Story 2.6: Confidence & Disclaimer
- **Goal:** Transparency about accuracy.
- **AC:** Shows high/medium/low indicator; Visible ±15% estimate disclaimer.

## Epic 3: Feedback & Training Data Collection

Interactive tools to capture ground truth and user signal.

### Story 3.1: Accuracy Feedback UI
- **Goal:** Collect user signal for training.
- **AC:** 4-button rating: "About right", "Too high", "Too low", "Way off".

### Story 3.2: Correction Slider
- **Goal:** User-provided ground truth.
- **AC:** Slider allows manual fill % adjustment if estimate is inaccurate.

### Story 3.3: Feedback Submission & Validation
- **Goal:** Store validated corrections to R2 and Supabase.
- **AC:** Worker validates signal (too_fast, extreme_delta); Appends to R2 metadata and `training_samples` table.

## Epic 4: Admin Dashboard & Data Moat

Tools to manage the training dataset and model performance.

### Story 4.1: Supabase Training Database
- **Goal:** Centralized training management.
- **AC:** Tables for `training_samples` and `model_versions`; Schema supports image URLs, labels, and provider metadata.

### Story 4.2: Admin Authentication
- **Goal:** Secure admin access.
- **AC:** Worker validates `ADMIN_SECRET`; PWA route /admin behind login gate.

### Story 4.3: Scan Review Dashboard
- **Goal:** Audit user scans.
- **AC:** Paginated list with thumbnails and AI results; Click to view detail.

### Story 4.4: Admin Correction Flow
- **Goal:** Generate high-quality labels.
- **AC:** Admin can override fill % or re-run LLM; Updates Supabase training records.

### Story 4.5: Admin Image Upload
- **Goal:** Seed training data.
- **AC:** Form to upload images with manual annotations; Auto-marked `trainingEligible`.

### Story 4.6: Training Data Export
- **Goal:** Export for local training scripts.
- **AC:** CSV export of all training-eligible records with image URLs and labels.

## Epic 5: Local Model & Stage 2 Pipeline

Client-side intelligence for speed and cost reduction.

### Story 5.1: Training Data Augmentation
- **Goal:** Synthetic dataset expansion.
- **AC:** Node.js script generates 48x variants (flip, lighting, quality) for each base scan.

### Story 5.2: TF.js CNN Regressor
- **Goal:** Primary inference model.
- **AC:** MobileNetV3 backbone; SIGMOID head; Huber loss; Deployed to R2.

### Story 5.3: Stage 2 Fallback Routing
- **Goal:** Hybrid inference logic.
- **AC:** PWA runs local model; Confidence < 0.75 calls LLM Worker; Results compared in logs.

### Story 5.4: Model Version Control
- **Goal:** Safe updates and rollbacks.
- **AC:** PWA checks `GET /model/version`; Auto-downloads new shards if version increases.

## Epic 6: Resilience & Edge Cases

Ensuring a robust experience across devices and networks.

### Story 6.1: Quality Detection Guidance
- **Goal:** Fix bad inputs early.
- **AC:** AI detects blur/lighting; UI prompts "Too dark" or "Hold steady" with retake option.

### Story 6.2: Offline & Network Handling
- **Goal:** Graceful degradation.
- **AC:** Detects offline state; Disables scan; Guidance to connect to WiFi.

### Story 6.3: iOS Safari Compatibility
- **Goal:** Solve WebKit camera bugs.
- **AC:** Detects in-app browsers; Prompts "Open in Safari" with visual instructions.

### Story 6.4: Privacy & Consent
- **Goal:** Transparent data use.
- **AC:** First-scan notice about image storage; Explicit opt-out (cancel scan).

## Epic 7: Local Model & Training Pipeline

Client-side CNN model with training data collection and LLM fallback routing.

### Story 7.1: Supabase Training Database
- **Goal:** Centralized training data management.
- **AC:** Tables for `training_samples` and `model_versions`; Schema supports image URLs, labels, and provider metadata.
- **Status:** Completed via Story 4-1-0

### Story 7.2: Training Data Augmentation Pipeline
- **Goal:** Synthetic dataset expansion.
- **AC:** Node.js script generates augmented variants (flip, lighting, quality) for each base scan.

### Story 7.3: TF.js CNN Regressor Training & Deployment
- **Goal:** Primary inference model.
- **AC:** MobileNetV3 backbone; SIGMOID head; Huber loss; Deployed to R2.

### Story 7.4: Client-Side Model Integration & Fallback Routing
- **Goal:** Hybrid inference logic.
- **AC:** PWA runs local model; Confidence-based routing to LLM; Results logged for comparison.

### Story 7.5: Model Version Management
- **Goal:** Safe updates and rollbacks.
- **AC:** PWA checks `/model/version`; Auto-downloads new model shards if version increases.

### Story 7.6: LLM Fallback Routing Logic
- **Goal:** Intelligent routing between local model and LLM.
- **AC:** Confidence threshold routing; iOS WebGL detection; Network-aware fallback; Telemetry logging.
- **Added:** 2026-04-17 via Course Correction (FR46)

### Story 7.7: Admin Correction Feedback Loop
- **Goal:** Admin can correct predictions and trigger retraining.
- **AC:** Admin correction UI; Re-run LLM endpoint; Training sample updates; Feedback loop complete.
- **Added:** 2026-04-17 via Course Correction (FR47)

### Story 7.8: Service Worker Smart Upload Filtering
- **Goal:** Quality checks and sync queue for training uploads.
- **AC:** Image quality validation; Duplicate detection; Background sync queue; Retry logic.
- **Added:** 2026-04-17 via Course Correction (FR44-46)

## Epic 8: Multi-Bottle Selection

Support for multiple bottle SKUs in a single household.

### Story 8.1: Multi-Bottle Selection
- **Goal:** User can select from multiple registered bottles.
- **AC:** Bottle selection screen; SKU persistence; QR code bypass for returning users.

## Epic 9: Data Export

Export scan history and consumption data.

### Story 9.1: Export Data (CSV/PDF)
- **Goal:** User can export their scan history.
- **AC:** CSV export with all scan metadata; PDF summary report option.

## Epic 10: Stage 1 Launch Readiness

Critical pre-launch requirements identified in Epic 7 retrospective.

### Story 10.1: Camera Orientation Guide (FR28)
- **Goal:** Enforce consistent bottle orientation during capture.
- **Scope:** Viewfinder overlay indicator showing "Handle on Right" for consistent training data collection.
- **AC:** 
  - Overlay visible in viewfinder before capture
  - Clear visual indicator for handle direction
  - Does not obstruct bottle view
  - Works on iOS Safari and Android Chrome
- **Priority:** CRITICAL — Data quality gate for Stage 2 training
- **Estimated Effort:** 0.5 weeks

### Story 10.2: Version Management UI (Story 7.5b)
- **Goal:** Admin can activate/deactivate model versions from admin panel.
- **Scope:** Admin dashboard section for model version management with toggle controls.
- **AC:**
  - Admin can view all model versions
  - Admin can activate a version (sets `is_active=true`)
  - Admin can deactivate a version (sets `is_active=false`)
  - Only one version can be active at a time
  - Changes reflected in `/model/version` endpoint immediately
- **Priority:** CRITICAL — Operational requirement before Stage 2 scale
- **Estimated Effort:** 0.5 weeks
- **Dependencies:** Story 7.5 (Model Version Management backend — DONE)

---
_Epics updated: 2026-04-17 to include Epic 10 (Stage 1 Launch Readiness) and complete Epic 7-9 details._
