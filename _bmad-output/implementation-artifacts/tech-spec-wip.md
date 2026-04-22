---
title: 'FillConfirmScreen: Consumed/Remaining Labels + Slider-Line Alignment'
slug: 'fill-confirm-labels-slider-align'
created: '2026-04-21'
status: 'in-progress'
stepsCompleted: [1, 2]
tech_stack: ['React 19', 'TypeScript strict', 'Tailwind', 'Radix UI Slider', 'i18next', 'Vitest']
files_to_modify:
  - 'src/utils/fillMlToPixelY.ts'
  - 'src/components/FillConfirmScreen/FillConfirmScreen.tsx'
  - 'src/i18n/locales/en/translation.json'
  - 'src/i18n/locales/ar/translation.json'
  - 'src/test/fillMlToPixelY.test.ts'
code_patterns:
  - 'useMemo for derived geometry (linePx pattern)'
  - 'ResizeObserver for container size tracking'
  - 'Tailwind utility classes (95% of styling)'
  - 'i18next t("key", "fallback") for all user strings'
  - 'Named exports for utilities'
test_patterns:
  - 'Vitest describe/it/expect (vi.fn() not jest.fn())'
  - 'makeImg() helper in fillMlToPixelY.test.ts for mocking HTMLImageElement'
  - 'Pure function unit tests with numeric assertions'
---

# Tech-Spec: FillConfirmScreen: Consumed/Remaining Labels + Slider-Line Alignment

**Created:** 2026-04-21

## Overview

### Problem Statement

1. **No consumed/remaining readout:** After adjusting the fill slider, users see the ml value only inside the confirm button. There is no at-a-glance view showing both consumed ml and remaining ml — users must calculate mentally.
2. **Slider thumb misaligns with red line:** `VerticalStepSlider` root height = `containerH` (full image container height), so Radix maps `[min=55ml, max=capacity]` across the full height. But `linePx` (the red line Y) is computed by `fillMlToPixelY` which maps fill level to `[bottleTopPx, bottleBottomPx]` — a narrower range offset from the container top by letterboxing + `bottleTopPct/bottleBottomPct`. The thumb and line diverge visually whenever the bottle doesn't fill the full image container.

### Solution

1. Add a full-width consumed/remaining label row between the image row and the action buttons, with i18n keys.
2. Extract a `bottleGeometry()` helper from `fillMlToPixelY.ts`. Call it in `FillConfirmScreen` to derive `bottleTopPx` / `bottleBottomPx`, then constrain the slider by wrapping it in a `div` with `paddingTop = bottleTopPx` and setting slider root `height = bottleBottomPx - bottleTopPx`. This aligns the slider's rendered range with the bottle's pixel region in the image.

### Scope

**In Scope:**
- Add `fillConfirm.consumed` and `fillConfirm.remaining` i18n keys (EN + AR)
- Add full-width label row in `FillConfirmScreen.tsx` (between flex row and action buttons)
- Extract `bottleGeometry()` named export from `src/utils/fillMlToPixelY.ts`
- Refactor `fillMlToPixelY` to call `bottleGeometry()` internally (no breaking API change)
- Add `bottleGeometry` useMemo in `FillConfirmScreen.tsx`
- Wrap `VerticalStepSlider` in an offset div using those values

**Out of Scope:**
- Radix fraction mismatch correction `(value-min)/(max-min)` vs `value/max` — difference is imperceptible (<4% at min=55ml/cap=1500ml), defer
- `SliderGeometryAdapter` wrapper component — inline div is sufficient for now

## Context for Development

### Codebase Patterns

- **Tailwind-first:** 95% styling via Tailwind utility classes. CSS modules only for complex animations/pseudo-selectors.
- **i18next:** All user-visible strings use `t("key", "fallback")`. New keys added to both `src/i18n/locales/en/translation.json` and `src/i18n/locales/ar/translation.json`.
- **useMemo for derived geometry:** `linePx` is already a `useMemo` in `FillConfirmScreen`. Follow the same pattern for `bottleTopPx`/`bottleBottomPx`.
- **ResizeObserver for container size:** `containerSize` is tracked via `ResizeObserver` in `FillConfirmScreen`. `bottleGeometry` depends on `imageLoaded`, `containerW`, `containerH` — add those as deps.
- **imgRef usage:** `imgEl.getBoundingClientRect()` is called inside `fillMlToPixelY`. `bottleGeometry()` will need the same imgEl ref — it's available as `imgRef.current` in FillConfirmScreen.
- **TypeScript strict:** All new functions need explicit parameter + return types. `bottleGeometry` returns `{ bottleTopPx: number; bottleBottomPx: number }`.
- **RTL support:** Label row uses logical Tailwind properties or inherits `dir` from parent.

### Files to Reference

| File | Purpose |
| ---- | ------- |
| `src/components/FillConfirmScreen/FillConfirmScreen.tsx` | **MODIFY** — add label row, bottleGeometry memo, slider wrapper offset |
| `src/utils/fillMlToPixelY.ts` | **MODIFY** — extract `bottleGeometry()` export, refactor function to use it |
| `src/components/FillConfirmScreen/VerticalStepSlider.tsx` | **READ ONLY** — no changes needed; height/position handled by wrapper div |
| `src/i18n/locales/en/translation.json` | **MODIFY** — add `consumed`, `remaining` under `fillConfirm` key |
| `src/i18n/locales/ar/translation.json` | **MODIFY** — add Arabic translations for same keys |
| `src/test/fillMlToPixelY.test.ts` | **MODIFY** — add `bottleGeometry()` unit tests using existing `makeImg()` helper |
| `src/components/FillConfirm.tsx` | **REFERENCE ONLY** (legacy, not used in App.tsx) — see footer label format pattern |
| `src/utils/coordinateMapping.ts` | **REFERENCE ONLY** (legacy) — parallel implementation, no changes needed |

### Technical Decisions

- **`bottleGeometry()` signature:** `(imgEl: HTMLImageElement, bottleTopPct: number, bottleBottomPct: number): { bottleTopPx: number; bottleBottomPx: number }`. Guard: return `{ bottleTopPx: 0, bottleBottomPx: 0 }` when `!natW || !natH || !rect.width || !rect.height` (matches existing guard in `fillMlToPixelY`).
- **`fillMlToPixelY` refactor:** Internal implementation calls `bottleGeometry()`. Public signature is UNCHANGED — no callers break.
- **Two separate useMemos in FillConfirmScreen:**
  - `geometry` = `bottleGeometry(imgRef.current, bottleTopPct, bottleBottomPct)` — deps: `[imageLoaded, containerW, containerH, bottleTopPct, bottleBottomPct]` — runs only on resize/load, not on every slider tick
  - `linePx` = existing computation using `geometry.bottleTopPx` / `geometry.bottleBottomPx` inline — deps: `[waterMl, ...]`
- **Slider wrapper approach:** Plain `div` with `style={{ height: containerH || 280, display: 'flex', flexDirection: 'column', paddingTop: geometry.bottleTopPx }}` wrapping `VerticalStepSlider`. Slider `height` prop = `Math.max(1, geometry.bottleBottomPx - geometry.bottleTopPx) || containerH || 280`.
- **Label row placement:** Full-width `div` between the flex row closing tag and the action buttons div. `flex flex-row justify-around px-4 py-2`.
- **Consumed / remaining:** `consumed = waterMl`, `remaining = bottleCapacityMl - waterMl`. Format: `t("fillConfirm.consumed", "Consumed") + ": " + waterMl + " " + t("common.ml", "ml")`.
- **Arabic translations:** `consumed` → `"المستهلك"`, `remaining` → `"المتبقي"`.
- **Performance note:** Extracting `bottleGeometry` into its own memo is a net improvement — geometry calc (involving `getBoundingClientRect`) no longer runs on every slider tick, only on resize/load.

## Implementation Plan

### Tasks

> To be filled in Step 3 (Generate Spec)

### Acceptance Criteria

> To be filled in Step 3 (Generate Spec)

## Additional Context

### Dependencies

- No new packages required. `bottleGeometry` is pure TypeScript, no imports.

### Testing Strategy

- **`bottleGeometry()` unit tests** in `src/test/fillMlToPixelY.test.ts`: reuse `makeImg()` helper. Test: no-letterbox case, portrait letterbox case, unloaded guard, empty rect guard.
- **Existing `fillMlToPixelY` tests:** All 9 tests must continue passing without modification — refactor is internal only.
- **No FillConfirmScreen unit test file exists** — label row changes don't require new tests (pure render, no logic). If a test file is created in future, label text would be verified there.

### Notes

- The `bottleGeometry` guard (return zeros when image not loaded) must match the existing guard in `fillMlToPixelY` — check `!natW || !natH || !rect.width || !rect.height`.
- When `bottleTopPx` and `bottleBottomPx` are both 0 (image not yet loaded), the slider wrapper falls back to the current behavior (`height = containerH || 280`, no padding) — no visual regression on initial render.
