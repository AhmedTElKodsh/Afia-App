# Sprint Change Proposal — Viewfinder Simplification & Client-Side Quality Gate

**Date:** 2026-04-24
**Proposed By:** Ahmed (Project Lead)
**Trigger:** Continuous bug cycle — outline/geometry mismatch, brittle auto-lock/auto-capture
**Change Type:** Implementation Simplification + New Story (Story 10-3)
**Priority:** HIGH — Developer velocity and reliability blocker
**Status:** APPROVED — 2026-04-24

---

## Executive Summary

The camera viewfinder's auto-lock/auto-detect/auto-capture pipeline has proven brittle due to a geometry mismatch between the detection model's learned bottle shape and real bottle outlines. The three-stage pipeline (detect → align → auto-capture) creates a compounding failure surface with no proportional accuracy benefit — removing it is estimated to degrade fill-level accuracy by only 0–5%.

**Proposed correction:**
1. Comment out / disable the viewfinder detection, alignment scoring, and auto-capture system
2. Retain Stage 1 LLM API workflow (Gemini → Groq fallback) — unchanged
3. Replace auto-capture with manual capture + a 3-check client-side quality gate (Laplacian blur, histogram exposure, minimum resolution) that runs post-capture before the LLM call
4. Simplify FR28 orientation enforcement to a static "Handle on Right" visual guide

**Accuracy trade-off:** ~0–5% degradation. Accepted.

---

## 1. Issue Summary

### Problem Statement

The camera viewfinder implements a 3-stage automatic capture pipeline:
1. **Detect** — local detection model identifies the bottle in the live frame
2. **Align** — overlay scores alignment (red/amber/green state machine)
3. **Auto-capture** — progress ring fills over 1000ms, then fires capture

This pipeline fails continuously because:

- **Geometry mismatch:** The model's learned bottle silhouette does not match actual registered bottle dimensions, causing the overlay to never reach "green" or to incorrectly lock on non-bottle shapes
- **Cascade fragility:** A drift in the local detection model (e.g., after retraining) simultaneously breaks the overlay color logic, the lock threshold, and the auto-capture timing
- **FR28 coupling:** The orientation enforcement requirement ("handle on right") was implemented as a detection-based check layered on top of the above, adding a fourth failure mode
- **Bug cycle:** Each fix to the detection geometry ripples into the alignment scoring, which ripples into auto-capture timing, creating a perpetual regression cycle

### Discovery Context

Identified during active development (Epic 10, Story 10-1). The orientation guide work revealed that the underlying auto-capture pipeline is the instability source, not the orientation check itself.

### Evidence

- UX spec Screen 3: three dependent state variables (detected, aligned, stable) — any one failing breaks the capture flow
- Sprint Change Proposal 2026-04-17: Story 10-1 added specifically because detection-based orientation was already failing data quality goals
- Known Issues doc: low-confidence LLM results (the user-visible symptom) traceable to blurry/misframed auto-captures
- Ahmed's assessment: accuracy delta from removing auto-capture is ~0–5% — within the existing ±15% LLM margin

---

## 2. Impact Analysis

### Epic Impact

| Epic | Impact | Change Required |
|------|--------|-----------------|
| Epic 1 (Core Scan) | Story 1.5 — retroactive AC revision | Remove detection-based overlay from acceptance criteria |
| Epic 10 (Launch Readiness) | Story 10-1 — retroactive scope clarification | Static guide only, no detection-based enforcement |
| Epic FC (Fill Confirm) | None | Downstream of capture, unaffected |
| Epics 2–9, 7–9 | None | No dependency on capture pipeline |
| **New Story 10-3** | Client-Side Quality Gate | Added to Epic 10 |

### Story Impact

**Stories requiring retroactive revision (already DONE):**

| Story | Change |
|-------|--------|
| 1.5 — Camera Activation & Viewfinder | Remove detection-based AC; add static guide + manual capture AC |
| 10-1 — Camera Orientation Guide | Clarify: static text/icon overlay, not detection-based enforcement |

**New story required:**

| Story | Effort | Status |
|-------|--------|--------|
| 10-3 — Client-Side Image Quality Gate | 0.5 weeks | backlog |

### Artifact Conflicts

| Artifact | Sections Requiring Update | Severity |
|----------|--------------------------|----------|
| PRD | FR6 (framing guide), FR28 (orientation enforce), FR15 (quality detection) | Moderate |
| UX Design Spec | Screen 3 (Camera Viewfinder), State Machine Flow | Moderate |
| Architecture | Component tree (CameraCapture/CameraGuide/useCamera), new imageQualityGate utility | Moderate |
| docs/epics.md | Epic 10 — add Story 10-3 | Minor |
| sprint-status.yaml | Epic 10 — add story 10-3: backlog | Minor |

### Technical Impact

- `CameraCapture.tsx`: remove detection listener, progress ring state, auto-capture logic
- `CameraGuide.tsx`: replace dynamic color state machine with static rectangle + text overlay
- `useCamera.ts`: remove alignment scoring and lock detection methods
- New: `src/utils/imageQualityGate.ts` with 3 checks (blur, exposure, resolution)
- No Worker changes, no API changes, no infrastructure changes
- Stage 2 local model (Epic 7): unaffected — training data quality _improves_ with client-side gate vs. random auto-captures

---

## 3. Recommended Approach

**Selected path: Option 1 (Direct Adjustment) + Option 3 (PRD MVP Scope Update) — Hybrid**

### Rationale

| Factor | Assessment |
|--------|-----------|
| Implementation effort | Low — comment out / simplify existing code, add ~100-line utility |
| Timeline impact | +0.5 weeks (Story 10-3); no disruption to deployed features |
| Technical risk | **Reduces** risk vs. current state — fewer moving parts |
| Accuracy impact | 0–5% degradation, within LLM ±15% margin, accepted by Ahmed |
| Training data quality | Improves — quality gate produces cleaner images than brittle auto-capture |
| Maintainability | Significantly higher — eliminates 3 compounding failure modes |
| Stakeholder expectation | No change to end-user value proposition; scan flow same from user perspective |

### Trade-offs Acknowledged

- Users lose the "guided alignment" UX (amber/green framing) — mitigated by static frame rectangle and caption
- Auto-capture convenience lost — now 1 manual tap required
- 0–5% potential accuracy decrease — accepted given ±15% inherent LLM ceiling

---

## 4. Detailed Change Proposals

### A — PRD: Update FR6

**Section:** Functional Requirements → Camera Capture

```
OLD:
FR6: User can see a live camera viewfinder with a framing guide overlay
     to align the bottle

NEW:
FR6: User can see a live camera viewfinder with a static bottle-shaped
     framing rectangle to assist manual alignment. No real-time bottle
     detection or auto-capture is implemented.
```

**Rationale:** Detection-based overlay creates a cascading failure surface. Static guide achieves the alignment intent at zero runtime cost.

---

### B — PRD: Update FR28

**Section:** Functional Requirements → User Feedback Collection

```
OLD:
FR28: The system must enforce that the bottle is captured from the frontside
      with the handle on the right for valid analysis.

NEW:
FR28: The app displays a static "Handle on Right" icon and caption in the
      camera viewfinder to guide consistent bottle orientation. Enforcement
      is by user guidance, not by detection-based logic.
```

**Rationale:** Detection-based "enforcement" of FR28 was the proximate cause of Story 10-1's instability. Static guidance achieves the same training data consistency goal.

---

### C — PRD: Update FR15 (supplement with client-side gate)

**Section:** Functional Requirements → AI Vision Analysis

```
OLD:
FR15: The app can surface image quality issues (blur, poor lighting) to the
      user when the AI detects them.

NEW:
FR15: The app surfaces image quality issues via two mechanisms:
      (a) Client-side quality gate: runs immediately after manual capture,
          before the image is sent to the LLM. Checks:
            1. Minimum resolution (shortest dimension ≥ 400px)
            2. Laplacian blur score (variance ≥ 50)
            3. Histogram exposure (rejects overexposed / underexposed frames)
          Any failing check surfaces a specific retake prompt without
          consuming an LLM API call.
      (b) LLM-reported quality issues (blur, poor_lighting, obstruction,
          reflection) remain active as a second-pass check on the result
          screen (unchanged from current behavior).
```

**Rationale:** Client-side gate saves API cost and latency; catches bad captures the auto-trigger system would previously have submitted silently.

---

### D — UX Design Spec: Screen 3 (Camera Viewfinder) Revision

**Section:** Screen-by-Screen Layouts → Screen 3

```
OLD behavior (to remove):
- Color-coded framing guide: Red (no bottle) → Amber (detected, misaligned) → Green (aligned)
- Alignment detection progress ring (fills over 1000ms)
- Auto-capture fires at 100% progress ring
- [Capture manually] as text-button fallback only

NEW behavior:
- Static bottle-shaped framing rectangle (no detection, no color changes)
- Static "Handle on Right" icon at bottom-right of viewfinder frame
- Caption below frame: "Hold bottle still, handle on the right"
- Primary [● Capture] circular button (64px, white border, centered bottom)
  — Manual tap required; no auto-capture
- Remove: progress ring, color-coded overlay states, auto-capture countdown
```

**State machine change:**
```
OLD: CAMERA_ACTIVE → (alignment stable 1000ms) → AUTO_CAPTURE
NEW: CAMERA_ACTIVE → [user taps Capture] → PHOTO_PREVIEW
```

---

### E — Architecture: Component Changes

**Section:** Component Architecture

```
CameraGuide.tsx:
  OLD: Dynamic stroke color based on alignment state (red/amber/green)
  NEW: Static rectangle overlay, fixed stroke color, no props for detection state

useCamera.ts hook:
  OLD: Alignment scoring, lock detection, countdown trigger
  NEW: getUserMedia, capture-to-canvas, JPEG compression only
       (remove: alignmentScore, isLocked, startCountdown, cancelCountdown)

CameraCapture.tsx:
  OLD: Detection listener, progress ring state, auto-capture dispatch
  NEW: Manual capture button only; no detection event listener

New utility — src/utils/imageQualityGate.ts:
  export function checkMinResolution(canvas: HTMLCanvasElement): QualityResult
  export function checkLaplacianBlur(canvas: HTMLCanvasElement): QualityResult
  export function checkHistogramExposure(canvas: HTMLCanvasElement): QualityResult
  export function runQualityGate(canvas: HTMLCanvasElement): QualityGateResult
    // Returns: { passed: boolean, issues: QualityIssue[], processingMs: number }
```

---

### F — New Story 10-3: Client-Side Image Quality Gate

**Epic:** Epic 10 (Stage 1 Launch Readiness)

**User Story:**
As a user, I want the app to check my photo quality immediately after capture, so that I get instant feedback to retake before waiting for AI analysis.

**Acceptance Criteria:**

```
GIVEN a photo has been manually captured (canvas available)
WHEN the quality gate runs (before POST /analyze)
THEN the gate checks three criteria in order:

  Check 1 — Minimum Resolution:
    PASS: shortest dimension ≥ 400px
    FAIL: show "Move closer to the bottle" + Retake button

  Check 2 — Laplacian Blur:
    PASS: pixel variance ≥ 50 (tunable constant)
    FAIL: show "Image too blurry — hold the phone steady" + Retake button

  Check 3 — Histogram Exposure:
    PASS: top-5% pixel intensity ≤ 240 AND bottom-5% ≥ 15
    FAIL (overexposed): "Too bright — move away from direct light" + Retake
    FAIL (underexposed): "Too dark — move near a light source" + Retake

AND gate processing completes in < 100ms
AND if all checks pass, image proceeds to existing LLM flow unchanged
AND quality gate result is included in scan metadata:
    { qualityGatePassed: boolean, qualityGateFlags: string[] }
AND failing quality gate returns user to PHOTO_PREVIEW state (not CAMERA_ACTIVE)
    to allow retake without re-running getUserMedia

TECHNICAL NOTES:
- Laplacian blur: compute via convolution kernel [0,1,0 / 1,-4,1 / 0,1,0] on
  grayscale canvas data; variance of result = blur score
- Histogram: sample ImageData pixel array, bucket into 0-255 intensity bins,
  check percentile thresholds
- All processing runs synchronously on the captured canvas — no Worker needed
```

**Estimated Effort:** 0.5 weeks
**Dependencies:** Story 1.6 (Photo Capture — DONE), Story 1.5 (revised)

---

### G — Story 1.5 Retroactive AC Revision

```
Story: 1.5 — Camera Activation & Viewfinder (Status: DONE — retroactive revision)

REMOVE from AC:
"And I see a bottle-shaped framing guide overlay to help align the bottle"
[implicit: color-coded detection states]

ADD to AC:
"And I see a static bottle-shaped framing rectangle (no detection-based color changes)"
"And I see a static 'Handle on Right' orientation guide"
"And capture is manual — user taps the Capture button; no auto-capture occurs"
```

---

### H — Story 10-1 Retroactive Scope Clarification

```
Story: 10-1 — Camera Orientation Guide (Status: DONE — retroactive scope clarification)

CLARIFY:
The "Handle on Right" indicator is a static text/icon overlay rendered as an
absolutely-positioned element in the viewfinder. It does not respond to bottle
position or detection state. No orientation detection logic is implemented.

This clarification resolves the detection-enforcement interpretation of FR28
that caused the auto-lock brittleness.
```

---

## 5. Implementation Handoff

### Change Scope Classification: **Moderate**

Rationale: Requires retroactive revision of completed stories, updates to 3 planning artifacts (PRD, UX, Architecture), and 1 new story. No architectural restructuring, no infrastructure changes, no new dependencies.

### Handoff Plan

| Role | Responsibility |
|------|---------------|
| Developer | Implement Story 10-3 (quality gate utility + integration) |
| Developer | Comment out detection/auto-capture code in CameraCapture, CameraGuide, useCamera |
| Developer | Update Story 1.5 and 10-1 docs retroactively |
| Product Owner (Ahmed) | Approve PRD changes (FR6, FR28, FR15) |
| UX | Review Screen 3 revised spec (static guide layout) |

### Implementation Sequence

1. Retroactively update AC docs for Story 1.5 and Story 10-1
2. Comment out detection/auto-capture code (preserve in comments for reference)
3. Implement `src/utils/imageQualityGate.ts` with 3 checks + tests
4. Integrate quality gate into post-capture flow (between PHOTO_CAPTURED and API_PENDING states)
5. Update metadata schema to include `qualityGatePassed` + `qualityGateFlags`
6. Update PRD (FR6, FR28, FR15) and UX spec (Screen 3)
7. Update architecture doc (component changes + new utility)

### Success Criteria

- [ ] Auto-capture / detection code commented out with `// VIEWFINDER-SIMPLIFICATION-2026-04-24` marker
- [ ] `imageQualityGate.ts` implemented with ≥ 90% test coverage for all 3 checks
- [ ] Quality gate integrated: post-capture, pre-LLM
- [ ] Scan metadata includes `qualityGatePassed` field
- [ ] All existing tests still passing (no regressions)
- [ ] Screen 3 static overlay renders correctly on iOS Safari + Android Chrome
- [ ] "Handle on Right" static indicator visible throughout capture session
- [ ] Story 10-3 story file created in `_bmad-output/implementation-artifacts/`

---

## 6. PRD MVP Impact

**MVP is not affected.** The core value proposition — QR scan → camera → LLM estimate → result — is completely unchanged. The modification is purely to the capture assistance mechanism (auto vs. manual), not to any user-visible output.

### What changes for users

| Before | After |
|--------|-------|
| App attempts to auto-capture after alignment lock | User taps Capture button manually |
| Color-coded overlay (red/amber/green) | Static framing rectangle |
| Capture sometimes fires unexpectedly | Capture only on user intent |
| Quality issues discovered post-LLM (costly) | Quality issues caught pre-LLM (fast, free) |

### What stays the same

- QR deep-link entry
- LLM fill-level estimation (Stage 1)
- Gemini → Groq fallback chain
- Fill Confirmation Screen (Screen 4b)
- Result display, nutrition facts, feedback collection
- Training data pipeline, admin dashboard, local model (Stage 2)
- All deployed infrastructure

---

*Sprint Change Proposal — Afia Oil Tracker | 2026-04-24 | Facilitated by BMAD Correct Course Workflow*
*Change scope: Moderate | Handoff: Developer + Product Owner*
