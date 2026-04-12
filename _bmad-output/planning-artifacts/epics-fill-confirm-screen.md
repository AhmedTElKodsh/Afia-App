---
stepsCompleted: [step-01-validate-prerequisites, step-02-design-epics, step-03-create-stories]
inputDocuments:
  - prd.md
  - architecture.md
  - architecture-fill-confirm-screen.md
  - ux-design-specification.md
  - research/technical-vite-react-pwa-image-annotation-slider-research-2026-04-10.md
  - epics.md
workflowType: 'epics-and-stories'
project_name: 'Afia-App'
feature_scope: 'Fill Confirmation Screen'
date: '2026-04-10'
---

# Afia-App — Epic 6: Fill Confirmation Screen

## Overview

This document defines **Epic 6** and its stories for the Fill Confirmation Screen feature. It supplements the existing `epics.md` (Epics 1–5) which covers the full app. Epic 6 introduces a new intermediate screen between the AI analysis step and the result display, allowing users to visually verify and adjust the AI-estimated fill level before the volume and nutrition calculations are finalized.

**Existing coverage (do not duplicate):**
- Story 3.4 — Fill Gauge Visual Component (result screen, stylized bottle SVG)
- Story 4.2 — Corrected Estimate Slider (post-result feedback, conditional)

**What this epic adds:** A pre-result confirmation screen showing the actual captured JPEG with an SVG annotation line and a synchronized vertical step slider.

---

## Requirements Inventory (Scoped to This Feature)

### Functional Requirements Addressed

- **FR21**: User can view the estimated fill percentage alongside a visual fill gauge
- **FR26**: User can indicate whether the AI fill estimate was accurate
- **FR27**: User can provide a corrected fill percentage estimate via slider

### New Requirements (from Architecture & Research)

- **ARCH-FC-1**: The annotation line on the captured JPEG must be rendered via SVG overlay (not canvas) to avoid redraw loops and iOS Safari canvas CORS risks
- **ARCH-FC-2**: The vertical slider must use `@radix-ui/react-slider` with `orientation="vertical"`, `min={55}`, `step={55}`, `max={bottleCapacityMl}` — the slider cannot reach 0
- **ARCH-FC-3**: The `waterMl` value (in whole 55ml steps) is the single source of truth; the line position (`linePx`) is a `useMemo` derived value — no separate `linePx` state
- **ARCH-FC-4**: The image container must use `useResizeObserver` (not `window.resize`) to recalculate line position on device orientation change or viewport resize
- **ARCH-FC-5**: The formula `fillMlToPixelY` must handle `object-fit: contain` letterboxing using `Math.min(scaleX, scaleY)` and account for bottle top/bottom bounds within the image frame
- **ARCH-FC-6**: RTL layout (Arabic) must reposition the slider from left-of-image (LTR) to right-of-image using `dir="rtl"` on the flex ancestor — no conditional class switching required
- **ARCH-FC-7**: The screen must be inserted into the app state machine as `FILL_CONFIRM` state between `ANALYZING` and `RESULT_DISPLAY`

### Non-Functional Requirements

- **NFR22**: All touch targets ≥ 44×44px (slider thumb, confirm button, retake button)
- **NFR26**: iOS Safari 16+ (browser mode): full functionality — slider drag, image display, annotation sync
- **NFR27**: Android Chrome 120+: full functionality
- Slider drag on iOS Safari must not trigger page scroll (mitigated by `touch-action: pan-x` on slider root)

---

## FR Coverage Map

| FR / Requirement | Story |
|---|---|
| FR21 | Story 6.2, 6.4 |
| FR26 | Story 6.4, 6.5 |
| FR27 | Story 6.3, 6.4 |
| ARCH-FC-1 | Story 6.2 |
| ARCH-FC-2 | Story 6.3 |
| ARCH-FC-3 | Story 6.4 |
| ARCH-FC-4 | Story 6.4 |
| ARCH-FC-5 | Story 6.1 |
| ARCH-FC-6 | Story 6.6 |
| ARCH-FC-7 | Story 6.5 |
| NFR22 | Story 6.3, 6.7 |
| NFR26/27 | Story 6.3, 6.7 |

---

## Epic 6: Fill Confirmation Screen

**Epic goal:** After AI analysis returns a fill estimate, the user sees their captured bottle photo annotated with a red dashed horizontal line at the AI-estimated fill level. A vertical step slider (55 ml increments) sits beside the image, initialized at the AI estimate snapped to the nearest 55 ml step. Dragging the slider repositions the annotation line in real time. The user taps Confirm to lock in their chosen `waterMl` value, which is then passed to the volume and nutrition calculation pipeline. This screen replaces the silent transition from Analyzing → Result with an interactive, visually grounded confirmation step.

**Stories:**
- 6.1 — `fillMlToPixelY` Coordinate Mapping Utility
- 6.2 — Annotated Image Panel (SVG Overlay)
- 6.3 — Vertical Step Slider (`<VerticalStepSlider>`)
- 6.4 — Fill Confirmation Screen — State & Sync
- 6.5 — App Flow Integration (FILL_CONFIRM State)
- 6.6 — RTL / Bilingual Layout
- 6.7 — Accessibility

---

### Story 6.1: `fillMlToPixelY` Coordinate Mapping Utility

As a **developer**,
I want a pure TypeScript utility function that maps a water volume (in ml) to a CSS pixel Y-coordinate within an image container,
So that the annotation line is always positioned at the correct pixel regardless of the image's display size, device pixel ratio, or CSS layout.

**Context:**
The image is displayed at a CSS size that differs from its natural capture resolution. The bottle occupies a known sub-region of the image frame (`bottleTopPct`, `bottleBottomPct` as fractions of the image's natural height). The formula must account for `object-fit: contain` letterboxing. See `architecture-fill-confirm-screen.md §6` for the full formula.

**Acceptance Criteria:**

**Given** a loaded `<img>` element with known `naturalWidth` and `naturalHeight`
**When** I call `fillMlToPixelY(waterMl, bottleCapacityMl, imgEl, bottleTopPct, bottleBottomPct)`
**Then** it returns a CSS pixel Y-coordinate (number) measured from the top of the image container

**Given** the image is displayed with `object-fit: contain` in a container shorter than the image's natural aspect ratio (letterbox bars on top and bottom)
**When** I call the function with `waterMl = bottleCapacityMl` (100% full)
**Then** the returned Y-coordinate equals `offsetY + bottleTopPct * renderedH` (top of bottle in CSS px)

**Given** `waterMl = 55` (1 step, minimum)
**When** I call the function
**Then** the returned Y-coordinate is within the range `[bottleTopPx, bottleBottomPx]` (never above the bottle top or below the bottle bottom)

**Given** `naturalWidth = 0` or `naturalHeight = 0` (image not yet loaded)
**When** I call the function
**Then** it returns `0` without throwing

**Given** `bottleTopPct = 0` and `bottleBottomPct = 1` (bottle fills the full frame)
**When** I call the function with `waterMl = bottleCapacityMl / 2` (50% fill)
**Then** the returned Y-coordinate equals the vertical midpoint of the rendered image area

**Implementation notes:**
- File: `src/utils/fillMlToPixelY.ts`
- Export as a named function: `export function fillMlToPixelY(...): number`
- Pure function — no DOM side effects, no React hooks
- Use `getBoundingClientRect()` to get rendered size (not `offsetWidth/offsetHeight`)
- Scale = `Math.min(rect.width / natW, rect.height / natH)` for `object-fit: contain`
- Unit tests required with Vitest (no DOM needed — stub `getBoundingClientRect`)

---

### Story 6.2: Annotated Image Panel (SVG Overlay)

As a **user**,
I want to see my captured bottle photo with a red dashed horizontal line drawn at the estimated fill level,
So that I can visually understand where the AI thinks the oil currently is in the bottle.

**Context:**
The `<AnnotatedImagePanel>` component displays the captured JPEG and overlays an SVG `<line>` element. The line Y-position is controlled by the `linePx` prop (derived externally via `fillMlToPixelY`). The SVG overlay sits at `position: absolute` over the `<img>`, covering the full container. See `architecture-fill-confirm-screen.md §4`.

**Acceptance Criteria:**

**Given** I arrive at the fill confirmation screen after AI analysis completes
**When** the screen renders
**Then** I see my captured bottle photo displayed with `object-fit: contain`
**And** a red dashed horizontal line is visible across the full width of the image at the AI-estimated fill position

**Given** the red annotation line is displayed
**When** I examine its appearance
**Then** it is red (`stroke="red"`), 2px wide, with a dashed pattern (e.g. `strokeDasharray="8 4"`)
**And** it extends from the left edge to the right edge of the image display area

**Given** the fill estimate is at the top 10% of the bottle (nearly full)
**When** the screen renders
**Then** the annotation line appears near the top of the bottle in the image (not at the top of the container if there are letterbox bars)

**Given** the fill estimate is at the bottom 10% of the bottle (nearly empty)
**When** the screen renders
**Then** the annotation line appears near the bottom of the bottle in the image

**Given** I rotate my device (portrait ↔ landscape)
**When** the device orientation changes
**Then** the annotation line repositions to the correct pixel Y-coordinate for the new container dimensions within one render cycle
**And** the displayed image does not flicker or show a blank state

**Implementation notes:**
- Component: `src/components/FillConfirmScreen/AnnotatedImagePanel.tsx`
- The SVG must have `viewBox={`0 0 ${containerW} ${containerH}`}` and `preserveAspectRatio="none"` to match the container coordinate space
- SVG must have `overflow="visible"` to prevent edge clipping
- SVG must have `pointer-events="none"` to not block touch events on the image
- Always include `crossOrigin="anonymous"` on the `<img>` element prop (before `src` is ever set)
- Accept `imgRef` as a prop (forwarded ref) so the parent can read `naturalWidth`/`naturalHeight`
- The component does not manage `linePx` state — it receives it as a prop

---

### Story 6.3: Vertical Step Slider (`<VerticalStepSlider>`)

As a **user**,
I want a vertical slider beside the bottle photo that I can drag to adjust the fill level in 55 ml increments,
So that I can correct the AI's estimate before confirming, and the minimum I can set is 55 ml (I cannot confirm 0 ml).

**Context:**
The `<VerticalStepSlider>` wraps `@radix-ui/react-slider` with `orientation="vertical"`. The slider enforces `min={55}`, `step={55}`, `max={bottleCapacityMl}`. The slider cannot be dragged to 0. The parent manages the `value` state; this component is controlled. See `architecture-fill-confirm-screen.md §3 Decision 2`.

**Acceptance Criteria:**

**Given** I am on the fill confirmation screen
**When** the slider renders
**Then** it is oriented vertically (top = full = bottleCapacityMl, bottom = minimum = 55 ml)
**And** the slider thumb is positioned at the AI-estimated fill level, snapped to the nearest 55 ml step

**Given** I drag the slider thumb upward
**When** I release at a new position
**Then** the slider value increases in 55 ml increments
**And** the annotation line on the photo moves upward to the new fill position in real time (not just on release)

**Given** I drag the slider thumb downward to the lowest position
**When** I reach the bottom stop
**Then** the slider value is 55 ml (1 step)
**And** I cannot drag below 55 ml — the thumb does not move below the bottom stop

**Given** I am on iOS Safari 16+
**When** I drag the slider vertically with my finger
**Then** the page does not scroll during the drag gesture
**And** the slider thumb follows my finger smoothly without "sticking" or "jumping"

**Given** I am on Android Chrome 120+
**When** I drag the slider vertically with my finger
**Then** the slider responds to touch drag and updates the value correctly

**Given** I tap the slider track above the current thumb position
**When** the tap registers
**Then** the slider value jumps to the nearest 55 ml step at the tapped position

**Implementation notes:**
- Component: `src/components/FillConfirmScreen/VerticalStepSlider.tsx`
- Library: `@radix-ui/react-slider` — add to `package.json` if not already present
- Props: `<Slider orientation="vertical" min={55} step={55} max={bottleCapacityMl} value={[waterMl]} onValueChange={([v]) => onChange(v)} />`
- Required CSS (Tailwind or global): `[data-radix-slider-root] { touch-action: pan-x; }` — prevents page scroll during vertical drag
- The slider track must have a minimum CSS `height` set (e.g., matching the image panel height) — no explicit height = invisible slider on iOS Safari (Radix issue #2800)
- Thumb touch target must be ≥ 44×44px (NFR22)
- The component is controlled — it does not hold its own `value` state

---

### Story 6.4: Fill Confirmation Screen — State & Sync

As a **user**,
I want the annotation line on the photo and the slider position to stay in perfect sync as I drag,
So that the fill level I am setting is always visually clear from both the line position and the slider position simultaneously.

**Context:**
`<FillConfirmScreen>` is the parent component that composes `<AnnotatedImagePanel>` and `<VerticalStepSlider>`. It holds `waterMl` as the single source of truth, derives `linePx` via `useMemo`, and tracks container size via `useResizeObserver`. See `architecture-fill-confirm-screen.md §4 & §5`.

**Acceptance Criteria:**

**Given** the fill confirmation screen has rendered
**When** I observe the slider position and the annotation line position
**Then** both reflect the same fill level — they are always in sync (cannot be out of sync)

**Given** I drag the slider to a new 55 ml step
**When** my finger is still on the slider (during drag, not just on release)
**Then** the annotation line repositions on the photo in real time, without waiting for my finger to lift

**Given** the AI estimated fill was 73%
**And** the bottle capacity is 1500 ml (so estimated = 1095 ml)
**When** the screen initializes
**Then** the slider is set to 1100 ml (nearest 55 ml step: `Math.round(1095 / 55) * 55 = 1100`)
**And** the annotation line is positioned at the Y-coordinate corresponding to 1100 ml / 1500 ml = 73.3% fill

**Given** I rotate my device from portrait to landscape
**When** the layout reflows
**Then** the annotation line repositions automatically to the correct Y-coordinate for the new container dimensions
**And** the slider value does not change (only the visual line position updates)

**Given** the image has not finished loading (e.g., slow blob URL read)
**When** the component renders before `img.onload`
**Then** the annotation line is not drawn (or drawn at Y=0) until the image is fully loaded
**And** once `onLoad` fires, the line immediately appears at the correct position

**Implementation notes:**
- Component: `src/components/FillConfirmScreen/FillConfirmScreen.tsx`
- State: `const [waterMl, setWaterMl] = useState<number>(() => snapToStep(aiEstimatePercent, bottleCapacityMl, 55))`
- Resize tracking: `const { width: containerW, height: containerH } = useResizeObserver({ ref: containerRef })`
- Derived: `const linePx = useMemo(() => imgRef.current?.complete ? fillMlToPixelY(...) : 0, [waterMl, containerW, containerH, bottleTopPct, bottleBottomPct])`
- `snapToStep` helper: `Math.max(55, Math.min(capacity, Math.round(estimatedMl / 55) * 55))`
- Do NOT add a `linePx` state variable — it must be derived with `useMemo` only
- Pass `imgRef` as a prop to `<AnnotatedImagePanel>` and read it in the `useMemo`

---

### Story 6.5: App Flow Integration (FILL_CONFIRM State)

As a **user**,
I want to be automatically brought to the fill confirmation screen after the AI finishes analyzing my photo,
So that I can verify the estimate before the volume and nutrition results are calculated and displayed.

**Context:**
The app state machine currently transitions `ANALYZING → RESULT_DISPLAY`. A new `FILL_CONFIRM` state must be inserted between them. The confirmed `waterMl` value (not the raw AI `fillPercentage`) is passed to the volume calculation pipeline. The Retake button on the fill confirmation screen returns to `CAMERA`. See `architecture-fill-confirm-screen.md §9`.

**Acceptance Criteria:**

**Given** I have submitted my photo and the AI analysis completes successfully
**When** the API response is received with a `fillPercentage` value
**Then** the app navigates to the fill confirmation screen (not directly to the result screen)
**And** the fill confirmation screen receives the captured image, the AI `fillPercentage`, the bottle `bottleCapacityMl`, `bottleTopPct`, and `bottleBottomPct`

**Given** I am on the fill confirmation screen
**When** I tap the Confirm button
**Then** the app uses my confirmed `waterMl` (not the raw AI `fillPercentage`) for all downstream calculations
**And** the app navigates to the result screen (volume + nutrition display)
**And** the result screen shows values calculated from my confirmed `waterMl`

**Given** I am on the fill confirmation screen
**When** I tap the Retake button
**Then** the app returns to the camera screen
**And** the captured photo and AI estimate are discarded

**Given** the AI analysis returned a low confidence score
**When** I arrive at the fill confirmation screen
**Then** the screen still shows (confidence does not skip the confirmation screen)
**And** a subtle indicator or label communicates the low confidence alongside the annotation (exact UX to be confirmed)

**Given** the confirmed `waterMl` from this screen
**When** passed to the volume and nutrition calculators
**Then** the calculators use `waterMl` directly (no re-conversion from percentage)
**And** the R2 scan metadata record stores both `llm.fillPercentage` (raw AI) and `userFeedback.userEstimate` (confirmed ml)

**Implementation notes:**
- Add `FILL_CONFIRM` to the app state machine / screen enum
- The `onConfirm(waterMl: number)` callback from `<FillConfirmScreen>` triggers the state transition to `RESULT_DISPLAY`
- Pass `waterMl` through to the volume calculator (replace `fillPercent * capacity / 100` with the confirmed `waterMl` directly)
- Store `llm.fillPercentage` (original) separately from `confirmedWaterMl` in the scan metadata so the training label captures both

---

### Story 6.6: RTL / Bilingual Layout

As an **Arabic-speaking user**,
I want the fill confirmation screen to display correctly in a right-to-left layout,
So that the slider is on the correct (reading-start) side and all text is in Arabic.

**Context:**
In LTR (English) the slider sits to the LEFT of the image. In RTL (Arabic) it should appear to the RIGHT. This is achieved by setting `dir="rtl"` on the flex container ancestor — flexbox automatically reverses the main axis. Radix Slider uses pointer position (not CSS `direction`) for value semantics, so no value inversion is needed. See `architecture-fill-confirm-screen.md §8`.

**Acceptance Criteria:**

**Given** the app is displayed in Arabic (RTL)
**When** I arrive at the fill confirmation screen
**Then** the image panel is on the left side of the flex row (from a physical screen perspective)
**And** the slider is on the right side of the flex row
**And** this matches the natural Arabic reading direction (start = right)

**Given** the app is displayed in English (LTR)
**When** I arrive at the fill confirmation screen
**Then** the slider is on the LEFT of the image panel
**And** the image panel is on the RIGHT of the slider

**Given** the slider is displayed in RTL
**When** I drag the slider upward
**Then** the value increases (top = full = max ml) — the value direction is unchanged compared to LTR
**And** the annotation line moves upward on the photo in sync

**Given** the app is in Arabic
**When** I view all text labels on the screen (e.g. "Confirm", "Retake", ml values, slider label)
**Then** all text is in Arabic
**And** text is right-aligned

**Given** I switch the app language from English to Arabic
**When** the fill confirmation screen re-renders
**Then** the slider and image swap sides automatically without a page reload
**And** no CSS class toggling or `if/else` layout code is needed (handled by `dir` attribute)

**Implementation notes:**
- The flex container must use `dir={i18n.dir()}` (or equivalent) — not hardcoded `dir="ltr"` or `dir="rtl"`
- Use `margin-inline-end` (Tailwind: `me-4`) instead of `margin-right` / `margin-left` on the slider container
- Do NOT add conditional CSS classes for RTL — let `dir` + logical properties handle it
- Arabic translation keys required: `fillConfirm.title`, `fillConfirm.confirmButton`, `fillConfirm.retakeButton`, `fillConfirm.sliderLabel`, `fillConfirm.mlValue`
- Test explicitly: verify that "top = full" semantic is preserved in RTL layout (not inverted)

---

### Story 6.7: Accessibility

As a **user with accessibility needs**,
I want the fill confirmation screen to be navigable by keyboard and screen reader,
So that I can use the fill confirmation feature regardless of my input method or assistive technology.

**Acceptance Criteria:**

**Given** I navigate to the fill confirmation screen using a keyboard
**When** I press Tab
**Then** focus moves in order: Retake button → Slider → Confirm button
**And** each element has a visible focus indicator (outline)

**Given** I am on the slider with keyboard focus
**When** I press the Up Arrow key
**Then** the slider value increases by 55 ml
**And** the annotation line repositions upward on the photo

**Given** I am on the slider with keyboard focus
**When** I press the Down Arrow key
**Then** the slider value decreases by 55 ml
**And** the slider does not go below 55 ml (Down Arrow at minimum = no change)

**Given** a screen reader is active
**When** the fill confirmation screen is announced
**Then** the screen reader announces the screen purpose (e.g., "Fill Confirmation: adjust the estimated fill level")

**Given** a screen reader is active
**When** I interact with the slider
**Then** the screen reader announces the current value in ml (e.g., "825 milliliters")
**And** it announces the min and max (e.g., "55 to 1500")

**Given** a screen reader is active
**When** the annotation line repositions (due to slider change)
**Then** the screen reader does NOT repeatedly announce every intermediate value during drag (aria-live on the slider, not the image)

**Given** the Confirm button is in the tab order
**When** I press Enter or Space on the Confirm button
**Then** `onConfirm(waterMl)` is called and the app transitions to the result screen

**Implementation notes:**
- Radix `<Slider>` handles keyboard navigation (arrow keys) natively — verify in iOS Safari VoiceOver
- Add `aria-label="Fill level slider, 55 milliliter steps"` to the Radix Slider root
- Add `aria-valuetext={`${waterMl} milliliters`}` for screen reader value announcement
- The `<svg>` annotation is `aria-hidden="true"` (decorative — the slider conveys the value)
- The `<img>` annotation is `alt=""` (decorative — the meaningful information is in the slider and text labels)
- Confirm and Retake buttons must have minimum 44×44px touch targets (NFR22)
- Add `aria-live="polite"` to a visually-hidden `<span>` that announces the confirmed value when the user taps Confirm

---

## Story Dependency Map

```
6.1 fillMlToPixelY utility
  └── 6.2 AnnotatedImagePanel (uses fillMlToPixelY via prop)
  └── 6.4 FillConfirmScreen (calls fillMlToPixelY in useMemo)

6.3 VerticalStepSlider (independent — only Radix Slider)
  └── 6.4 FillConfirmScreen (composes 6.2 + 6.3)
        └── 6.5 App Flow Integration (mounts FillConfirmScreen in state machine)
              └── 6.6 RTL Layout (language direction on FillConfirmScreen wrapper)
              └── 6.7 Accessibility (ARIA attrs on FillConfirmScreen and children)
```

**Recommended implementation order:** 6.1 → 6.3 → 6.2 → 6.4 → 6.5 → 6.6 → 6.7

---

**Epics Document Completed:** 2026-04-10
**Informed by:** `architecture-fill-confirm-screen.md`, `technical-vite-react-pwa-image-annotation-slider-research-2026-04-10.md`
**Existing Epics:** See `epics.md` for Epics 1–5
**Next step:** Implementation — run `/bmad-mmm-create-story` to generate a context-rich story file for the first story (6.1), then `/bmad-mmm-dev-story` to implement
