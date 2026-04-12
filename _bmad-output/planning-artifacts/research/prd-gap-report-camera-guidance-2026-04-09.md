---
type: 'prd-gap-report'
reviewer: 'John (PM)'
date: '2026-04-09'
prd_file: '../prd.md'
research_sources:
  - 'domain-live-camera-guidance-research-2026-04-09.md'
  - 'technical-live-camera-guidance-research-2026-04-09.md'
status: 'ready-for-prd-edit'
---

# PRD Gap Report — Safi Oil Tracker (Camera Guidance Module)

**Review date:** 2026-04-09 | **Reviewer:** John (PM) | **Research vintage:** 2026-04-09

---

## 1. Gap Table

| # | Gap | Severity | Type | Recommended Action |
|---|-----|----------|------|--------------------|
| G1 | No auto-capture with progress hold ring | **High** | New FR | Add FR7b: auto-capture after 1–1.5s hold with visible progress ring |
| G2 | No side-profile view guidance | **Critical** | New FR | Add FR6b: detect bottle orientation; surface "Rotate to side view" instruction |
| G3 | No guidance message hysteresis | **High** | New FR | Add FR15b: 2-consecutive-pass rule before upgrading state; immediate downgrade |
| G4 | No pre-camera instruction screen | **Medium** | New FR | Add FR5b: illustrated onboarding screen showing correct side-profile orientation |
| G5 | Camera guidance strings not bilingual | **High** | Update FR6 | Amend FR6 to require EN + AR for all real-time guidance messages |
| G6 | No haptic + audio confirmation on capture | **High** | Update FR7 | Amend FR7 to require shutter sound + vibration on capture |
| G7 | No `aria-live` on camera guidance | **Medium** | Update FR (Accessibility) | Add `aria-live="assertive"` spec to camera overlay guidance region |
| G8 | FR6/FR15 don't reference implemented quality gates | **Medium** | Update FR6/FR15 | Amend to enumerate aspect ratio, neck sparsity, ROI tightening as named gates |
| G9 | SVG `preserveAspectRatio` not in tech constraints | **Low** | Tech Constraint | Add one-line entry to Technical Constraints section |
| G10 | No glare spot detection sub-FR | **High** | Update FR15 | Add FR15a: glare (localized overexposure) as a distinct condition with distinct instruction |

---

## 2. Recommended New / Updated FR Text (Critical + High)

**G2 — New FR6b (Critical)**
> FR6b: When the camera viewfinder is active, the system shall analyze the bottle's visible orientation at each assessment interval. If the bottle's label face is detected as primary (front-facing), the system shall display the guidance message "Rotate bottle to show the side / أدِر الزجاجة لإظهار الجانب" and suppress the capture gate until a side-profile orientation is confirmed.

---

**G1 — New FR7b (High)**
> FR7b: Once all capture-gate conditions are simultaneously satisfied (framing, focus, lighting, orientation), the system shall initiate a 1–1.5 second auto-capture hold timer, displayed as a circular progress ring on the viewfinder overlay. If conditions remain satisfied for the full hold duration, the system shall capture the image automatically without user interaction. If any condition fails during the hold, the timer shall reset.

---

**G3 — New FR15b (High)**
> FR15b: Camera guidance state transitions shall implement hysteresis. A guidance message indicating a degraded condition (blur, poor lighting, glare, misorientation) shall be displayed immediately upon first detection. A guidance message indicating a passing condition shall not be displayed until the condition has passed for two consecutive assessment intervals. This prevents flickering guidance text when conditions oscillate near threshold boundaries.

---

**G5 — Updated FR6 (High)**
> FR6 (amended): The system shall display a live camera viewfinder with a framing guide overlay. All real-time guidance messages surfaced within the viewfinder (orientation, framing, focus, lighting, glare) shall be presented bilingually in English and Arabic, following the app's established RTL/LTR rendering pattern. Arabic strings shall be right-aligned when displayed in isolation; in overlay contexts they shall follow the device locale direction.

---

**G10 — New FR15a (High)**
> FR15a: The system shall distinguish glare (localized overexposure affecting ≥ N% of the bottle ROI) as a condition separate from global underexposure. When glare is detected, the system shall surface the specific instruction "Reduce direct light / قلّل الضوء المباشر" rather than the generic poor-lighting message. The glare gate shall independently block the capture-gate progression defined in FR7b.

---

**G6 — Updated FR7 (High)**
> FR7 (amended): In addition to capturing a still photo, upon successful capture the system shall trigger: (a) a brief shutter sound using the Web Audio API (respecting device silent-mode state), and (b) a short haptic pulse via the Vibration API where available. Both are non-blocking; failure of either shall not prevent the captured image from proceeding to the analysis pipeline.

---

## 3. PRD Health Assessment

**Verdict: Not sprint-ready as-is. A targeted edit pass is required before sprint planning.**

The PRD is structurally sound for the volume estimation and brand verification flows (FR11b, FR12b, cascaded logic). The gaps are concentrated in the camera guidance UX layer (FR6, FR7, FR15) — exactly the layer that will be built first in the next sprint. Sending developers into that sprint with the current FR6 ("framing guide overlay") will produce implementation variance that requires rework.

**Minimum required before sprint kick-off:**
- G2 (FR6b) and G1 (FR7b) must be merged — these define the core camera interaction contract.
- G5 (bilingual guidance) must be merged — retrofitting RTL into overlay strings mid-sprint is expensive.
- G10 (FR15a glare) must be merged — it changes the image quality assessment API surface.

G3, G6, G7 can be added in the same edit pass with low effort (they don't change architecture, only behavior spec). G4 (instruction screen) and G8/G9 (tech constraints) can follow in a second pass without blocking sprint planning.

**Estimated edit pass scope:** ~8 FR amendments/additions, no architecture change, no success-criteria revision needed.

---

## 4. What NOT to Change

The following areas are confirmed correct by the research and should not be touched:

- **FR11b / FR12b (brand verification)**: The cascaded Stage 1 → Stage 2 logic, the specific brand anchors (Heart logo, bilingual text, red/yellow handle hue), and the 95% identification success criterion are all consistent with the implemented approach. No change needed.

- **FR15 core (blur + poor lighting)**: The two base conditions are correct; the research adds glare as a third, distinct condition (G10), but does not invalidate the existing two. Amend, do not replace.

- **WCAG 2.1 AA accessibility baseline**: The existing accessibility requirement is correct. G7 adds `aria-live` specificity but does not contradict the baseline.

- **500ms assessment interval**: Confirmed correct by research. The hysteresis rule (G3) is defined relative to it — the interval itself is not a gap.

- **Cascaded logic gate (brand blocks volume)**: Architecture is validated. No change.
