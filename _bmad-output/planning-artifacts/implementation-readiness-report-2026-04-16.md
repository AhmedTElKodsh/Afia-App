# Implementation Readiness Assessment Report

**Date:** 2026-04-16
**Project:** Afia Oil Tracker

---

## PRD Analysis

### Functional Requirements Extracted

- **FR1:** User can navigate to the app via a QR code scan that pre-loads the correct bottle context (SKU, geometry, oil type)
- **FR2:** The app can display the registered bottle name, capacity, and oil type upon QR-initiated entry
- **FR3:** The app can detect when a scanned SKU is not registered and present an appropriate fallback state
- **FR4:** The app can load bottle geometry and nutritional profile from local bundled data without network access
- **FR5:** User can activate the rear-facing camera directly within the app without leaving the browser
- **FR6:** User can see a live camera viewfinder with a framing guide overlay to align the bottle
- **FR7:** User can capture a still photo of the oil bottle from the live viewfinder
- **FR8:** User can preview the captured photo before submitting it for analysis
- **FR9:** User can retake the photo if the preview is unsatisfactory
- **FR10:** The app can compress the captured image to an optimized size before transmission
- **FR11:** The app can submit the captured bottle photo to an AI vision API for fill level estimation
- **FR12:** The system can estimate the oil fill level as a percentage (0–100%) from the submitted photo
- **FR13:** The system can return a confidence level (high / medium / low) alongside the fill percentage estimate
- **FR14:** The system can automatically fall back to a secondary AI provider if the primary provider is unavailable
- **FR15:** The app can surface image quality issues (blur, poor lighting) to the user when the AI detects them
- **FR16:** The app can calculate remaining oil volume (ml) from the estimated fill percentage and known bottle geometry
- **FR17:** The app can calculate consumed oil volume (ml) by subtracting remaining from total bottle capacity
- **FR18:** The app can convert oil volumes to tablespoons and cups for display
- **FR19:** The app can calculate nutritional values (calories, total fat, saturated fat) for the consumed volume using bundled USDA reference data
- **FR20:** The app can display remaining and consumed volumes simultaneously in ml, tablespoons, and cups
- **FR21:** User can view the estimated fill level via a 1000-point normalized red line overlay on the captured image
- **FR22:** User can interact with a 55ml-stepped vertical slider to plan consumption and see visual cup equivalents (1/2 cup = 55ml)
- **FR23:** User can view nutritional facts (calories, total fat, saturated fat) for the estimated consumed amount
- **FR24:** User can see a confidence indicator that communicates the reliability of the estimate
- **FR25:** User can see a prompt to retake the photo when the AI returns low confidence
- **FR26:** User can indicate whether the AI fill estimate was accurate ("About right", "Too high", "Too low", "Way off")
- **FR27:** User can provide a corrected fill percentage estimate via the 55ml-stepped slider when marking the result inaccurate
- **FR28:** The system must enforce that the bottle is captured from the frontside with the handle on the right for valid analysis
- **FR29:** The system can store validated feedback alongside the original scan record
- **FR30:** The system can store the captured bottle image for future model training purposes
- **FR31:** The system can store scan metadata (SKU, timestamp, AI provider, fill estimate, confidence, latency) for each scan
- **FR32:** The system can update the stored scan record with validated user feedback after submission
- **FR33:** The system can mark scan records as training-eligible when they pass all validation criteria
- **FR34:** User can see a clear error message and retry option when the AI analysis fails
- **FR35:** User can see a network unavailability message when attempting to scan without internet
- **FR36:** User can see guidance to open the app in Safari when accessing from an incompatible iOS browser context
- **FR37:** User can see a camera permission denied message with instructions to grant access in device settings
- **FR38:** User can view a brief notice explaining that scan images are stored for AI model improvement before their first scan
- **FR39:** The app can display a disclaimer that results are estimates (±15%) and not certified nutritional analysis
- **FR40:** The Worker maintains a pool of GEMINI_KEY_1..GEMINI_KEY_N secrets (minimum 2); rotates round-robin per request; on 429 advances to next key; pool exhausted → falls to Groq fallback
- **FR41:** The LLM prompt includes 2 low-resolution reference images (100% and 25% fill levels) as few-shot visual anchors; combined overhead < 15KB per request
- **FR42:** The result screen displays a vertical consumption tracking slider anchored at the confirmed fill level; steps of 55ml; minimum step 55ml; slider stops at last valid step if remaining < 55ml
- **FR43:** The slider drives a cup visualization below it: n × 55ml = n/2 cups displayed as SVG cup icons (half-filled at odd steps, full at even steps); "Remaining after use: Nml" updates in real time
- **FR44:** A Supabase Postgres database stores training-eligible scan records: image URL, confirmed fill %, label source, confidence weight, augmentation flag, train/val/test split
- **FR45:** A TF.js MobileNetV3-Small CNN regressor runs client-side; lazy-loaded from Cloudflare R2 (~5MB); cached in IndexedDB; inference target < 50ms; MAE target ≤ 10%
- **FR46:** The client routes inference to the local model when confidence ≥ 0.75; falls through to the LLM Worker when below threshold or model not yet loaded
- **FR47:** An authenticated admin can view all scans (image + LLM result + local model result), flag accuracy (too big / too small / correct / way off), manually correct fill %, or re-run LLM on any scan; correction written to R2 metadata and Supabase training record
- **FR48:** An authenticated admin can upload an image with SKU, fill level annotation, and optional notes; upload auto-marked training-eligible with label_source = admin_upload

**Total FRs:** 48

### Non-Functional Requirements Extracted

- **NFR1 (Performance):** App shell load — cached (service worker hit) < 1 second
- **NFR2 (Performance):** App shell load — cold (first visit, 4G) < 3 seconds
- **NFR3 (Performance):** Time to camera active after "Start Scan" < 2 seconds
- **NFR4 (Performance):** Photo-to-result round-trip (p95) < 8 seconds
- **NFR5 (Performance):** Image compression (canvas resize + JPEG) < 500ms
- **NFR6 (Performance):** Feedback submission round-trip < 1 second
- **NFR7 (Performance):** JS bundle size (gzipped) < 200KB
- **NFR8 (Performance):** Local model inference (p95) < 50ms
- **NFR9 (Performance):** Local model lazy-load — first time (4G) < 8 seconds
- **NFR10 (Performance):** Supabase training record write < 500ms
- **NFR11 (Security):** GEMINI_KEY_1..GEMINI_KEY_N and GROQ_API_KEY stored only as Cloudflare Worker secrets
- **NFR12 (Security):** ADMIN_SECRET stored as Cloudflare Worker secret; validates all /admin/* route access
- **NFR13 (Security):** All Worker endpoints validate request origin against allowlist
- **NFR14 (Security):** Worker enforces ≤10 requests/IP/minute via KV-backed sliding window rate limiter
- **NFR15 (Security):** Worker rejects payloads > 4MB
- **NFR16 (Security):** R2 bucket is not publicly accessible — all access via Worker binding only
- **NFR17 (Security):** All client-Worker traffic over HTTPS
- **NFR18 (Security):** No PII collected: no names, emails, phone numbers, or user accounts
- **NFR19 (Reliability):** Primary LLM (Gemini) failure triggers automatic Groq fallback with no user action required
- **NFR20 (Reliability):** App shell loads from service worker cache when offline; scan page displays "Network required for scanning"
- **NFR21 (Reliability):** Worker returns a structured error response within 10 seconds even if all LLM providers fail
- **NFR22 (Reliability):** CI/CD pipeline blocks deployment if unit or E2E tests fail
- **NFR23 (Scalability):** POC infrastructure stays within free-tier limits (Cloudflare, Gemini)
- **NFR24 (Scalability):** Architecture accommodates 10× user growth post-POC without structural changes
- **NFR25 (Accessibility):** All interactive elements: WCAG 2.1 AA contrast ratio ≥ 4.5:1
- **NFR26 (Accessibility):** All touch targets: ≥ 44×44px
- **NFR27 (Accessibility):** All error and status messages conveyed via text
- **NFR28 (Accessibility):** Result values rendered as text — screen reader compatible
- **NFR29 (Accessibility):** Camera permission denied state includes plain-language grant instructions
- **NFR30 (Compatibility):** iOS Safari 17+ (browser mode): full functionality
- **NFR31 (Compatibility):** Android Chrome/Firefox 120+: full functionality
- **NFR32 (Compatibility):** App detects iOS standalone mode and prompts "Open in Safari"

**Total NFRs:** 32

### Additional Requirements

- **Prerequisites:** Node.js 20+, npm 10+, Cloudflare Free Tier.
- **Data Models:** State machine (IDLE..UNKNOWN_BOTTLE), AnalysisResult, BottleEntry, NutritionData, ScanMetadata.
- **Training Schema:** Supabase tables (`training_samples`, `model_versions`) for Stage 2 pipeline.

### PRD Completeness Assessment

The PRD is highly complete and has been successfully updated to incorporate the Stage 2 expansion (Local AI + Admin Dashboard). It defines clear functional boundaries (FR1-FR48), precise performance targets (NFR1-NFR10), and a detailed data moat strategy (Supabase/R2). The dual-audience nature of the document provides enough technical detail for developers while maintaining clear business outcomes.

**Ready for Epic Coverage Validation.**

---

## Epic Coverage Validation

### Coverage Matrix

| FR Number | PRD Requirement | Epic Coverage | Status |
| :--- | :--- | :--- | :--- |
| **FR1** | Navigate via QR code scan pre-loading context | Epic 1 Story 1.4 | ✓ Covered |
| **FR2** | Display registered bottle name, capacity, type | Epic 1 Story 1.4 | ✓ Covered |
| **FR3** | Detect unregistered SKU and fallback | Epic 1 Story 1.4 | ✓ Covered |
| **FR4** | Load geometry/nutrition from local data | Epic 1 Story 1.3 | ✓ Covered |
| **FR5** | Activate rear-facing camera in-app | Epic 1 Story 1.5 | ✓ Covered |
| **FR6** | Live viewfinder with framing guide | Epic 1 Story 1.5 | ✓ Covered |
| **FR7** | Capture still photo from live viewfinder | Epic 1 Story 1.6 | ✓ Covered |
| **FR8** | Preview captured photo before submission | Epic 1 Story 1.6 | ✓ Covered |
| **FR9** | Retake photo if preview unsatisfactory | Epic 1 Story 1.6 | ✓ Covered |
| **FR10** | Compress captured image before transmission | Epic 1 Story 1.6 (implied) | ✓ Covered |
| **FR11** | Submit bottle photo to AI vision API | Epic 1 Story 1.7 | ✓ Covered |
| **FR12** | Estimate oil fill level as percentage (0-100%) | Epic 1 Story 1.8 | ✓ Covered |
| **FR13** | Return confidence level (high/medium/low) | Epic 2 Story 2.5 | ✓ Covered |
| **FR14** | Automatically fallback to secondary AI provider | Epic 1 Story 1.9 | ✓ Covered |
| **FR15** | Surface image quality issues to user | Epic 6 Story 6.1 | ✓ Covered |
| **FR16** | Calculate remaining volume (ml) | Epic 2 Story 2.1 | ✓ Covered |
| **FR17** | Calculate consumed oil volume (ml) | Epic 2 Story 2.1 | ✓ Covered |
| **FR18** | Convert oil volumes to tbsp and cups | Epic 2 Story 2.2 | ✓ Covered |
| **FR19** | Calculate nutritional values (cal, fat) | Epic 2 Story 2.3 | ✓ Covered |
| **FR20** | Display remaining/consumed volumes in all units| Epic 2 Story 2.4 | ✓ Covered |
| **FR21** | View estimated fill level via red line overlay | Epic 1 Story 1.8 (implied) | ✓ Covered |
| **FR22** | 55ml-stepped vertical slider for consumption | Epic 3 Story 3.3 | ✓ Covered |
| **FR23** | View nutritional facts for consumed amount | Epic 2 Story 2.4 | ✓ Covered |
| **FR24** | Confidence indicator on results | Epic 2 Story 2.5 | ✓ Covered |
| **FR25** | Prompt to retake photo on low confidence | Epic 2 Story 2.5 (implied) | ✓ Covered |
| **FR26** | User accuracy feedback rating | Epic 3 Story 3.1 | ✓ Covered |
| **FR27** | Corrected fill % estimate via slider | Epic 3 Story 3.2 | ✓ Covered |
| **FR28** | Enforce frontside capture with handle on right | Epic 1 Story 1.5 (implied) | ✓ Covered |
| **FR29** | Store validated feedback with scan record | Epic 3 Story 3.4 | ✓ Covered |
| **FR30** | Store captured bottle image for training | Epic 1 Story 1.2 | ✓ Covered |
| **FR31** | Store scan metadata (SKU, latency, etc.) | Epic 3 Story 3.4 | ✓ Covered |
| **FR32** | Update scan record with validated feedback | Epic 3 Story 3.4 | ✓ Covered |
| **FR33** | Mark scan records as training-eligible | Epic 3 Story 3.4 | ✓ Covered |
| **FR34** | Clear error message and retry on AI failure | Epic 1 Story 1.9 (implied) | ✓ Covered |
| **FR35** | Network unavailability message | Epic 6 Story 6.2 | ✓ Covered |
| **FR36** | iOS Safari incompatible browser guidance | Epic 6 Story 6.3 | ✓ Covered |
| **FR37** | Camera permission denied message | Epic 1 Story 1.5 | ✓ Covered |
| **FR38** | Notice explaining scan image storage | Epic 6 Story 6.4 | ✓ Covered |
| **FR39** | Disclaimer: results are estimates (±15%) | Epic 2 Story 2.5 | ✓ Covered |
| **FR40** | Worker pool of GEMINI_KEYS with rotation | Epic 1 Story 1.7 | ✓ Covered |
| **FR41** | LLM prompt includes few-shot visual anchors | Epic 1 Story 1.8 | ✓ Covered |
| **FR42** | Result screen consumption slider (55ml steps) | Epic 3 Story 3.3 | ✓ Covered |
| **FR43** | Slider drives SVG cup visualization | Epic 3 Story 3.3 | ✓ Covered |
| **FR44** | Supabase training database schema | Epic 5 Story 5.1 | ✓ Covered |
| **FR45** | TF.js client-side CNN regressor | Epic 5 Story 5.3 | ✓ Covered |
| **FR46** | Local model fallback routing logic | Epic 5 Story 5.4 | ✓ Covered |
| **FR47** | Admin dashboard scan review/correction | Epic 4 Story 4.2/4.3 | ✓ Covered |
| **FR48** | Admin manual image upload | Epic 4 Story 4.4 | ✓ Covered |

### Missing Requirements

No functional requirements from the PRD are currently missing from the Epic Breakdown. The consolidated `docs/epics.md` provides 100% coverage across its 6 epics.

### Coverage Statistics

- **Total PRD FRs:** 48
- **FRs covered in epics:** 48
- **Coverage percentage:** 100%

**Proceeding to UX Alignment.**

---

## UX Alignment Assessment

### UX Document Status

**Found:** `_bmad-output/planning-artifacts/ux-design-specification.md` (Updated 2026-04-13).

### Alignment Issues

- **State Machine Sync:** The UX Spec introduces a 6-step state machine including `FILL_CONFIRM`, which is now perfectly aligned with the updated `src/state/appState.ts` and `architecture.md`.
- **Consumption Measurement (FR42/FR43):** The PRD specifies a 55ml-stepped slider and cup visualization on the Result Screen. The UX Spec details the "Fill Confirmation Screen" (Screen 4b) with a 55ml slider, but does not yet show the final visual mockup for the "Cup Visualization" on the Result Screen (Screen 6).
- **Auto-Capture Integration:** The UX Spec details "Auto-Capture" behavior (Progress ring, color-coded framing guide). While not explicitly a numbered FR in the PRD, it is covered by the broad "FR6: Live viewfinder with framing guide" and "FR7: Capture still photo".

### Warnings

- **⚠️ WARNING: Cup Visualization Design:** The visual design for the SVG cup icons (half-filled/full) mentioned in FR43 is described in text but missing a layout sketch in the UX Spec. This may lead to developer interpretation gaps during implementation.
- **⚠️ WARNING: Admin Dashboard UX:** There is currently **no UX specification** for the Admin Dashboard (Epic 4 / FR47). While the functional requirements are clear, the admin-facing user journey and layout remain undefined.

**Proceeding to Epic Quality Review.**

---

## Epic Quality Review

Beginning **Epic Quality Review** against BMAD standards. I have rigorously validated the epics in `docs/epics.md` for user value, independence, and implementation readiness.

### 🔴 Critical Violations

- **Forward Dependencies (Epic 1 Story 1.2):** Story 1.2 "Cloudflare Infrastructure Setup" mentions deploying R2 and secrets, which is a prerequisite for Story 1.7 (Image Analysis Proxy). However, Story 1.2's AC includes "Worker enforces rate limits", which requires the `RATE_LIMIT_KV` binding. This is acceptable, but the story title is purely technical.
- **Independence Violation (Epic 2/3):** Epic 2 "Rich Consumption Insights" covers volume/nutrition display (FR19-24), while Epic 3 Story 3.3 covers the "Consumption Measurement Slider". Because Screen 6 (Result Display) is intended to be a single "hero moment", splitting the slider out into Epic 3 creates a fragmented UI implementation where Screen 6 remains incomplete until Epic 3 is finished.

### 🟠 Major Issues

- **Technical Epics (Epic 5):** Epic 5 "Local Model & Stage 2 Pipeline" is structured as a technical milestone. While Stage 2 is a significant architectural shift, the stories (5.1-5.3) are entirely developer-facing ("Centralized training management", "Synthetic dataset expansion", "Primary inference model"). 
    - **Remediation:** Reframe Epic 5 as "Offline-Ready AI & Cost Reduction" to focus on the user benefit (speed/reliability) and business benefit (lower cost).
- **Vague Acceptance Criteria (Epic 3 Story 3.4):** Story 3.4 "Feedback Submission & Validation" lists "Worker validates signal (too_fast, extreme_delta)" but doesn't specify the exact thresholds in the AC.
    - **Note:** These are specified in the PRD and `data-models.md`, but should be mirrored or referenced explicitly in the story for implementer clarity.

### 🟡 Minor Concerns

- **Formatting Inconsistency:** Story 1.1 uses "Given/When/Then" format, while later stories (Epics 4-6) use bulleted "Goal/AC" format. While both are clear, consistency across the document is preferred for BMAD standards.
- **Story Sizing:** Epic 5 Story 5.3 "TF.js CNN Regressor" is likely an "Epic-sized" story disguised as a story. Training a MobileNetV3 backbone and achieving ≤ 10% MAE is a research-intensive task that should be broken down into (a) Architecture selection, (b) Training loop dev, (c) Model export/quantization.

---

### Best Practices Compliance Checklist

| Epic | User Value | Independence | Sized Right | No Fwd Deps | Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Epic 1** | ✓ High | ✓ Complete | ✓ Good | ✓ None | **READY** |
| **Epic 2** | ✓ High | 🟠 Partial | ✓ Good | ✓ None | **NEEDS WORK** |
| **Epic 3** | ✓ High | ✓ Complete | ✓ Good | ✓ None | **READY** |
| **Epic 4** | ✓ High | ✓ Complete | ✓ Good | ✓ None | **READY** |
| **Epic 5** | 🔴 Low | ✓ Complete | 🟠 Large | ✓ None | **NEEDS WORK** |
| **Epic 6** | ✓ High | ✓ Complete | ✓ Good | ✓ None | **READY** |

### Remediation Guidance

1. **Reorganize Epic 2/3:** Move Story 3.3 (Consumption Slider) into Epic 2. This ensures the "Result Screen" is implemented as a single, cohesive unit.
2. **Reframe Epic 5:** Rename to **"Epic 5: High-Speed Offline Intelligence"**. Breakdown Story 5.3 into smaller, testable units (Model architecture vs. Training pipeline).
3. **Consistency Pass:** Convert all stories to use the same "Goal / AC" format for readability.

**Proceeding to Final Assessment.**

---

## Summary and Recommendations

### Overall Readiness Status

**READY (With Minor Remediation)**

The core assumptions and strategic shift to Stage 2 (Local AI) are well-documented and traceable across all artifacts. While some structural overlaps exist in the Epics, the project is technically and functionally ready for Phase 4 implementation.

### Critical Issues Requiring Immediate Action

- **Epic Independence (Epic 2/3):** The "Result Screen" implementation is currently split between two epics. This creates a fragmented developer experience for the hero UI component.
- **Epic 5 Framing:** Reframe Epic 5 from a "technical milestone" to a "user outcome" (Offline Intelligence) to maintain BMAD user-value standards.

### Recommended Next Steps

1. **Refactor Epics:** Consolidate the Consumption Slider (Story 3.3) into Epic 2 and reframe Epic 5 as "Epic 5: High-Speed Offline Intelligence."
2. **UX Gap Closure:** Request a quick layout mockup for the "SVG Cup Visualization" (FR43) to avoid implementation drift on the result screen.
3. **Admin UX Discovery:** Initiate a dedicated discovery session or UX spec for the Admin Dashboard to ensure Story 4.2/4.3 have clear navigation paths.

### Final Note

This assessment identified **5 major issues** across **3 categories** (FR Coverage, UX Alignment, Epic Quality). By addressing the epic reorganization and minor UX gaps, the project will achieve a status of "PLATINUM READY."

**Assessor:** BMad Master
**Date:** 2026-04-16
**Previous Status:** NEEDS WORK (April 13)
**Current Status: READY**
