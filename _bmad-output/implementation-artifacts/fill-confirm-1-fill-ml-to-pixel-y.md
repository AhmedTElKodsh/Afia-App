---
story_id: "FC.1"
story_key: "fill-confirm-1-fill-ml-to-pixel-y"
epic: "FC - Fill Confirmation Screen"
status: ready-for-dev
created: "2026-04-10"
author: "Ahmed"
---

# Story FC.1: `fillMlToPixelY` Coordinate Mapping Utility

## Story Information

| Field | Value |
|---|---|
| **Epic** | Epic FC: Fill Confirmation Screen |
| **Story ID** | FC.1 |
| **Story Key** | fill-confirm-1-fill-ml-to-pixel-y |
| **Status** | ready-for-dev |
| **Priority** | Critical — all other FC stories depend on this |
| **Dependencies** | None — pure TypeScript, no React |

## User Story

**As a** developer,
**I want** a pure TypeScript utility function `fillMlToPixelY` that maps a water volume (ml) to a CSS pixel Y-coordinate within an `<img>` container,
**So that** the annotation line on the fill confirmation screen is always positioned at the exact correct pixel — regardless of the image's display size, device pixel ratio, or CSS layout — and all other FC components can use this single, tested function.

## Acceptance Criteria

**AC1 — Basic mapping, full bottle**
Given a loaded `<img>` element with `naturalWidth=1280`, `naturalHeight=720`, displayed at `rect={width:320, height:180}` (scale=0.25), `bottleTopPct=0.1`, `bottleBottomPct=0.9`, `bottleCapacityMl=1500`
When `fillMlToPixelY(1500, 1500, imgEl, 0.1, 0.9)` is called (100% full)
Then the result equals `bottleTopPx = 0 + 0.1 * 180 = 18.0` (no letterbox because aspect ratios match)

**AC2 — Letterbox (portrait image in landscape container)**
Given `naturalWidth=720, naturalHeight=1280` (portrait), container `rect={width:320, height:240}` (`scaleX=320/720=0.444, scaleY=240/1280=0.1875`, min=0.1875)
When `fillMlToPixelY(0, 1500, imgEl, 0.05, 0.95)` is called (0% fill = empty)
Then `renderedH = 1280 * 0.1875 = 240`, `renderedW = 720 * 0.1875 = 135`, `offsetX = (320-135)/2 = 92.5`, `offsetY = 0`
And the result equals `bottleBottomPx = 0 + 0.95 * 240 = 228.0` (line at bottom of bottle = empty)

**AC3 — 50% fill midpoint**
Given bottle fills full frame (`bottleTopPct=0`, `bottleBottomPct=1`), no letterbox (perfect aspect match), `renderedH=300`
When `fillMlToPixelY(750, 1500, imgEl, 0, 1)` is called (50% fill)
Then the result equals `150.0` (exact vertical midpoint of rendered image)

**AC4 — Unloaded image guard**
Given `imgEl.naturalWidth=0` or `imgEl.naturalHeight=0` (image not yet loaded)
When `fillMlToPixelY(...)` is called
Then it returns `0` without throwing

**AC5 — Empty rect guard**
Given `getBoundingClientRect()` returns `{width:0, height:0}` (element not yet painted)
When `fillMlToPixelY(...)` is called
Then it returns `0` without throwing

**AC6 — Clamped fill fraction**
Given `waterMl` passed exceeds `bottleCapacityMl` (e.g., `waterMl=2000`, `capacity=1500`)
When the function is called
Then the fill fraction is clamped to 1.0 — the line does not go above `bottleTopPx`

**AC7 — Minimum fill (55 ml)**
Given `waterMl=55`, `bottleCapacityMl=1500`
When the function is called with valid image and container
Then the result is within `[bottleTopPx, bottleBottomPx]` (not above top, not below bottom)

## Tasks / Subtasks

- [ ] **Task 1**: Create `src/utils/fillMlToPixelY.ts` (AC1–AC7)
  - [ ] 1.1 Implement `fillMlToPixelY` with full parameter signature
  - [ ] 1.2 Add guard: return 0 if `naturalWidth/Height` is 0
  - [ ] 1.3 Add guard: return 0 if `rect.width/height` is 0
  - [ ] 1.4 Compute `scale = Math.min(rect.width / natW, rect.height / natH)` (object-fit: contain)
  - [ ] 1.5 Compute `renderedH`, `offsetY` (letterbox offset)
  - [ ] 1.6 Compute `bottleTopPx`, `bottleBottomPx`
  - [ ] 1.7 Clamp `fillFraction = Math.max(0, Math.min(1, waterMl / bottleCapacityMl))`
  - [ ] 1.8 Return `bottleBottomPx - fillFraction * (bottleBottomPx - bottleTopPx)`
  - [ ] 1.9 Export as named function (no default export — matches codebase convention)

- [ ] **Task 2**: Create `src/test/fillMlToPixelY.test.ts` (covers all ACs)
  - [ ] 2.1 Write `describe('fillMlToPixelY', ...)` block
  - [ ] 2.2 Write helper `makeImg(natW, natH, renderedW, renderedH)` that returns a stubbed `HTMLImageElement`-like object with mocked `naturalWidth`, `naturalHeight`, and `getBoundingClientRect`
  - [ ] 2.3 Write test for AC1 (basic no-letterbox, 100% fill)
  - [ ] 2.4 Write test for AC2 (letterbox, 0% fill)
  - [ ] 2.5 Write test for AC3 (50% midpoint)
  - [ ] 2.6 Write test for AC4 (naturalWidth=0 → returns 0)
  - [ ] 2.7 Write test for AC5 (rect.width=0 → returns 0)
  - [ ] 2.8 Write test for AC6 (clamped at 100%)
  - [ ] 2.9 Write test for AC7 (55ml minimum stays within bottle bounds)
  - [ ] 2.10 Run `npm test` and confirm all tests pass

- [ ] **Task 3**: Verify no existing utility conflicts
  - [ ] 3.1 `grep -r "fillMlToPixelY\|fillPercentToPixel\|annotationY"` in `src/` — confirm no prior implementation exists
  - [ ] 3.2 Confirm `shared/` folder should NOT contain this function (it uses `getBoundingClientRect`, a browser DOM API — keep in `src/utils/`, not `shared/`)

## Dev Notes

### Function Signature (exact)

```typescript
// src/utils/fillMlToPixelY.ts

/**
 * Maps a water volume (ml) to a CSS pixel Y-coordinate within an image container.
 *
 * The image must be displayed with object-fit: contain.
 * Y=0 is the TOP of the container. Higher Y = lower on screen.
 * 100% full → line at bottleTopPx (near top of bottle).
 * 0% full   → line at bottleBottomPx (near bottom of bottle).
 *
 * Returns 0 if the image is not yet loaded or the container has no size.
 */
export function fillMlToPixelY(
  waterMl: number,
  bottleCapacityMl: number,
  imgEl: HTMLImageElement,
  bottleTopPct: number,    // 0–1: fraction of natural image height for bottle top edge
  bottleBottomPct: number  // 0–1: fraction of natural image height for bottle bottom edge
): number {
  const rect = imgEl.getBoundingClientRect();
  const natW = imgEl.naturalWidth;
  const natH = imgEl.naturalHeight;

  if (!natW || !natH || !rect.width || !rect.height) return 0;

  // object-fit: contain → minimum scale factor (letterbox the unconstrained axis)
  const scale = Math.min(rect.width / natW, rect.height / natH);

  const renderedH = natH * scale;
  const offsetY = (rect.height - renderedH) / 2; // letterbox bar height (top and bottom)

  const bottleTopPx    = offsetY + bottleTopPct    * renderedH;
  const bottleBottomPx = offsetY + bottleBottomPct * renderedH;

  const fillFraction = Math.max(0, Math.min(1, waterMl / bottleCapacityMl));
  return bottleBottomPx - fillFraction * (bottleBottomPx - bottleTopPx);
}
```

### Test Helper Pattern (exact — match existing test style)

```typescript
// src/test/fillMlToPixelY.test.ts
import { describe, it, expect } from "vitest";
import { fillMlToPixelY } from "../utils/fillMlToPixelY.ts";

function makeImg(natW: number, natH: number, renderedW: number, renderedH: number) {
  return {
    naturalWidth: natW,
    naturalHeight: natH,
    getBoundingClientRect: () => ({
      width: renderedW,
      height: renderedH,
      top: 0, left: 0, right: renderedW, bottom: renderedH,
      x: 0, y: 0,
      toJSON: () => {},
    } as DOMRect),
  } as HTMLImageElement;
}
```

### Critical Invariants

| Invariant | Rule |
|---|---|
| `bottleTopPct < bottleBottomPct` | Top of bottle is above bottom in image Y coordinates (top < bottom) |
| Full frame default | If bottle fills the full frame: `bottleTopPct=0.05`, `bottleBottomPct=0.95` (safe margin) |
| `object-fit: contain` only | Formula uses `Math.min(scaleX, scaleY)`. If `object-fit: cover` is ever needed, use `Math.max` and negative offset |
| No DOM side effects | Function is pure — never call `setState`, never write to the DOM |
| `getBoundingClientRect` timing | Must only be called after the `<img>` has been painted; guard with `imgEl.complete` in the React hook |

### Why NOT in `shared/`

The `shared/` folder (`shared/volumeCalculator.ts`, `shared/bottleRegistry.ts`) contains code shared between the browser client AND the Cloudflare Worker. `fillMlToPixelY` uses `getBoundingClientRect()` — a browser DOM API that does not exist in a Worker context. Place it in `src/utils/fillMlToPixelY.ts` only.

### Existing Pattern Reference

- `src/utils/volumeCalculator.ts` — re-exports from `shared/`. `fillMlToPixelY` does NOT follow this pattern.
- `src/utils/nutritionCalculator.ts` — direct utility, no re-export. **Use this as the model.**
- `src/test/volumeCalculator.test.ts` — test style to match (describe/it/expect, no vi.mock needed for pure functions)
- `src/test/nutritionCalculator.test.ts` — another pure-function test to match style

### Project Structure Notes

```
src/
  utils/
    fillMlToPixelY.ts       ← NEW (this story)
    volumeCalculator.ts     ← existing re-export, do NOT modify
    nutritionCalculator.ts  ← existing, use as style reference
  test/
    fillMlToPixelY.test.ts  ← NEW (this story)
    volumeCalculator.test.ts ← existing, use as style reference
```

### References

- [Architecture FC §6 — Coordinate Mapping Formula](../planning-artifacts/architecture-fill-confirm-screen.md#6-coordinate-mapping-formula)
- [Technical Research §Area 3 — Coordinate Mapping](../planning-artifacts/research/technical-vite-react-pwa-image-annotation-slider-research-2026-04-10.md)
- [Source: MDN — getBoundingClientRect](https://developer.mozilla.org/en-US/docs/Web/API/Element/getBoundingClientRect)
- [Existing test style — src/test/volumeCalculator.test.ts]

## Dev Agent Record

### Agent Model Used

_To be filled by dev agent_

### Debug Log References

_None yet_

### Completion Notes List

_None yet_

### File List

**Files to CREATE:**
- `src/utils/fillMlToPixelY.ts`
- `src/test/fillMlToPixelY.test.ts`

**Files to MODIFY:**
- None — this is a net-new pure utility; no existing files need changes
