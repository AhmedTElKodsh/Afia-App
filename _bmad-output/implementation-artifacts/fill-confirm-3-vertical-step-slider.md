---
story_id: "FC.3"
story_key: "fill-confirm-3-vertical-step-slider"
epic: "FC - Fill Confirmation Screen"
status: ready-for-dev
created: "2026-04-10"
author: "Ahmed"
---

# Story FC.3: `<VerticalStepSlider>` Component

## Story Information

| Field | Value |
|---|---|
| **Epic** | Epic FC: Fill Confirmation Screen |
| **Story ID** | FC.3 |
| **Story Key** | fill-confirm-3-vertical-step-slider |
| **Status** | ready-for-dev |
| **Priority** | High |
| **Dependencies** | None — standalone component (no dep on FC.1 or FC.2) |

## User Story

**As a** user,
**I want** a vertical slider beside the bottle photo that I can drag to adjust the fill level in 55 ml increments,
**So that** I can correct the AI estimate before confirming, and the minimum I can set is 55 ml (I cannot confirm 0 ml).

## Acceptance Criteria

**AC1 — Renders vertically**
Given the component mounts with `waterMl=825`, `min=55`, `step=55`, `max=1500`
When it renders
Then the slider is oriented vertically (track runs top-to-bottom)
And the thumb is positioned at the 55% mark (825/1500)

**AC2 — Step increments**
Given the user drags the slider thumb upward by one step
When the drag resolves
Then `onChange` is called with `waterMl + 55`
And the thumb moves to the new position

**AC3 — Min floor enforced**
Given `waterMl=55` (minimum step)
When the user attempts to drag the thumb further downward
Then `onChange` is NOT called with a value below 55
And the thumb does not move below the bottom stop

**AC4 — Max enforced**
Given `waterMl=bottleCapacityMl`
When the user attempts to drag the thumb further upward
Then `onChange` is NOT called with a value above `bottleCapacityMl`

**AC5 — iOS Safari: no page scroll during drag**
Given the user drags the slider vertically on an iOS Safari touch screen
When the finger moves vertically along the slider track
Then the page does not scroll
And the slider thumb follows the finger

**AC6 — Controlled component**
Given the parent updates `waterMl` prop externally
When the parent re-renders
Then the slider thumb position reflects the new value
(The component holds no internal value state — it is fully controlled)

**AC7 — Touch target size**
Given the slider thumb renders
When measured
Then its touch target is at least 44×44px (NFR22)

## Tasks / Subtasks

- [ ] **Task 1**: Install `@radix-ui/react-slider`
  - [ ] 1.1 Run `npm install @radix-ui/react-slider`
  - [ ] 1.2 Verify it appears in `package.json` dependencies

- [ ] **Task 2**: Create `src/components/FillConfirmScreen/VerticalStepSlider.tsx`
  - [ ] 2.1 Create folder `src/components/FillConfirmScreen/` if it does not exist
  - [ ] 2.2 Implement `VerticalStepSlider` component (see Dev Notes for full code)
  - [ ] 2.3 Apply `touch-action: pan-x` style to the slider root element (critical iOS fix)
  - [ ] 2.4 Set explicit `height` prop via Tailwind (e.g., `h-64` or match image panel height via prop)
  - [ ] 2.5 Set thumb touch target to `w-11 h-11` (44px)
  - [ ] 2.6 Export as named export: `export function VerticalStepSlider(...)`

- [ ] **Task 3**: Manual test on iOS Safari 16+ (or BrowserStack)
  - [ ] 3.1 Confirm vertical drag does not scroll the page
  - [ ] 3.2 Confirm thumb snaps to 55ml steps
  - [ ] 3.3 Confirm slider stops at 55ml (cannot go to 0)

## Dev Notes

### Package to Install

```bash
npm install @radix-ui/react-slider
```

Check if already present: `grep radix-ui package.json`

### Component Implementation (exact)

```tsx
// src/components/FillConfirmScreen/VerticalStepSlider.tsx
import * as Slider from "@radix-ui/react-slider";

interface VerticalStepSliderProps {
  waterMl: number;
  min?: number;        // default: 55
  step?: number;       // default: 55
  max: number;         // bottleCapacityMl
  height?: number;     // CSS height in px for the track (default: 280)
  onChange: (waterMl: number) => void;
}

export function VerticalStepSlider({
  waterMl,
  min = 55,
  step = 55,
  max,
  height = 280,
  onChange,
}: VerticalStepSliderProps) {
  return (
    <Slider.Root
      orientation="vertical"
      min={min}
      max={max}
      step={step}
      value={[waterMl]}
      onValueChange={([v]) => onChange(v)}
      style={{
        position: "relative",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        userSelect: "none",
        touchAction: "pan-x",   // ← CRITICAL: prevents page scroll on vertical drag (iOS Safari)
        height: `${height}px`,
        width: "44px",
      }}
    >
      <Slider.Track
        style={{
          backgroundColor: "#e5e7eb",  // gray-200
          position: "relative",
          flexGrow: 1,
          borderRadius: "9999px",
          width: "6px",
        }}
      >
        <Slider.Range
          style={{
            position: "absolute",
            backgroundColor: "#3b82f6",  // blue-500
            borderRadius: "9999px",
            bottom: 0,
            width: "100%",
          }}
        />
      </Slider.Track>
      <Slider.Thumb
        aria-label="Fill level slider"
        style={{
          display: "block",
          width: "44px",
          height: "44px",
          backgroundColor: "#fff",
          border: "2px solid #3b82f6",  // blue-500
          borderRadius: "50%",
          boxShadow: "0 1px 3px rgba(0,0,0,0.3)",
          cursor: "grab",
          // Radix handles focus ring — do not suppress with outline: none
        }}
      />
    </Slider.Root>
  );
}
```

### Critical iOS Safari Fix

**The `touchAction: "pan-x"` on the Slider.Root is mandatory.** Without it, vertical drag on the slider scrolls the page instead of moving the thumb. This is a known Radix Slider issue ([radix-ui/primitives#570](https://github.com/radix-ui/primitives/issues/570)).

Do NOT use `touch-action: none` — that blocks all scrolling. Use `pan-x` to allow horizontal scrolling (navigation) while capturing vertical drag for the slider.

### Known Radix Vertical Slider Height Issue

Radix `<Slider orientation="vertical">` **requires explicit height** — without it the slider collapses to zero height and is invisible. The `height` prop in this component handles this. Pass the desired px height from the parent (should match the image panel height).

Reference: [radix-ui/primitives#2800](https://github.com/radix-ui/primitives/issues/2800) — confirmed styling issue, not library bug.

### Styling Approach

This component uses **inline styles** (not Tailwind classes) deliberately, because:
1. Radix Slider renders custom DOM elements (`[data-radix-slider-*]`) that Tailwind's class approach requires extra configuration to target
2. Inline styles are explicit and portable across Tailwind config versions

If the project later migrates to Radix's CSS variables approach, this component can be refactored. For now, inline styles are correct.

### Value Semantics

- `value[0] = min (55 ml)` → thumb at BOTTOM of track
- `value[0] = max (bottleCapacityMl)` → thumb at TOP of track
- This matches intuition: more oil = slider higher

Radix handles this correctly for `orientation="vertical"` — no value inversion needed.

### Project Structure Notes

```
src/
  components/
    FillConfirmScreen/        ← NEW FOLDER (this story creates it)
      VerticalStepSlider.tsx  ← NEW (this story)
      AnnotatedImagePanel.tsx ← FC.2
      FillConfirmScreen.tsx   ← FC.4
```

### References

- [Architecture FC §3 Decision 2 — Slider choice](../planning-artifacts/architecture-fill-confirm-screen.md#decision-2-vertical-slider--radixuireact-slider)
- [Technical Research §Area 2 — Vertical slider on iOS Safari](../planning-artifacts/research/technical-vite-react-pwa-image-annotation-slider-research-2026-04-10.md)
- [Radix Slider vertical touch fix — issue #570](https://github.com/radix-ui/primitives/issues/570)

## Dev Agent Record

### Agent Model Used
_To be filled_

### Debug Log References
_None yet_

### Completion Notes List
_None yet_

### File List

**Files to CREATE:**
- `src/components/FillConfirmScreen/` (new folder)
- `src/components/FillConfirmScreen/VerticalStepSlider.tsx`

**Files to MODIFY:**
- `package.json` (add `@radix-ui/react-slider` via npm install)
