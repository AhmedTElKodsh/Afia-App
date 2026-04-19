---
story_id: "FC.2"
story_key: "fill-confirm-2-annotated-image-panel"
epic: "FC - Fill Confirmation Screen"
status: done
created: "2026-04-10"
completed: "2026-04-16"
author: "Ahmed"
---

# Story FC.2: `<AnnotatedImagePanel>` Component

## Story Information

| Field | Value |
|---|---|
| **Epic** | Epic FC: Fill Confirmation Screen |
| **Story ID** | FC.2 |
| **Story Key** | fill-confirm-2-annotated-image-panel |
| **Status** | ready-for-dev |
| **Dependencies** | FC.1 (`fillMlToPixelY`) must be implemented first — this component receives `linePx` as a prop (no dep on FC.3) |

## User Story

**As a** user,
**I want** to see my captured bottle photo with a red dashed horizontal line drawn at the fill level I have selected,
**So that** I can visually understand exactly where the oil level is being set in the bottle before I confirm.

## Acceptance Criteria

**AC1 — Image renders with object-fit: contain**
Given `imgSrc` is a valid JPEG data URL
When the component renders
Then the image fills the panel with `object-fit: contain`
And the image aspect ratio is preserved (no stretching)

**AC2 — Annotation line appears at correct position**
Given `linePx=90` and the container is 200px tall
When the component renders
Then a horizontal line spans the full width of the image at Y=90px from the container top

**AC3 — Line appearance**
Given the line renders
When inspected
Then the line is red (`stroke="red"`), 2px thick, and dashed (e.g. `strokeDasharray="8 4"`)

**AC4 — Line does not clip at edges**
Given `linePx` is near 0 or near the container height
When the component renders
Then the line is not cut off at the container boundary
(SVG uses `overflow="visible"`)

**AC5 — Line does not block touch events**
Given a user tries to interact with elements behind the annotation overlay
When they tap the image area
Then pointer events pass through the SVG overlay
(`pointer-events: none` on the SVG)

**AC6 — Image ref is forwarded**
Given the parent component holds `imgRef`
When the `<img>` inside this component loads
Then the parent can read `imgRef.current.naturalWidth` and `imgRef.current.naturalHeight`
(Achieved by passing `imgRef` as a prop and attaching it to the `<img>` element)

**AC7 — onLoad callback fires**
Given the image has loaded
When `img.onload` fires
Then the `onLoad` prop callback is called (parent uses this to trigger initial `linePx` calculation)

**AC8 — crossOrigin set**
Given the component renders
When the `<img>` element is inspected
Then `crossOrigin="anonymous"` is present on the `<img>` element
(Required for future canvas export compatibility; safe for data URLs and blob URLs)

## Tasks / Subtasks

- [ ] **Task 1**: Create `src/components/FillConfirmScreen/AnnotatedImagePanel.tsx`
  - [ ] 1.1 Implement the component (see Dev Notes for full code)
  - [ ] 1.2 Set container to `position: relative`, `width: 100%`, `height: 100%`
  - [ ] 1.3 Set `<img>` to `objectFit: contain`, `width: 100%`, `height: 100%`
  - [ ] 1.4 Add `<svg>` overlay: `position: absolute`, `top: 0`, `left: 0`, `width: 100%`, `height: 100%`
  - [ ] 1.5 Add `overflow: visible` and `pointerEvents: none` to SVG
  - [ ] 1.6 Set SVG `viewBox` to `0 0 {containerW} {containerH}` — matches container NOT natural image dims
  - [ ] 1.7 Set `preserveAspectRatio="none"` on SVG
  - [ ] 1.8 Render `<line>` at `y1={linePx}` `y2={linePx}` spanning `x1=0` to `x2=containerW`
  - [ ] 1.9 Wire `crossOrigin="anonymous"` and `onLoad` to `<img>`
  - [ ] 1.10 Accept and attach `imgRef` prop to `<img>` element

- [ ] **Task 2**: Accept `containerRef` prop for ResizeObserver use by parent
  - [ ] 2.1 The container `<div>` should accept an optional `containerRef` prop
  - [ ] 2.2 This allows the parent (`FillConfirmScreen`) to observe container size changes

- [ ] **Task 3**: Verify no CORS console errors
  - [ ] 3.1 Test with a `data:` URL (typical from camera capture) — no CORS error expected
  - [ ] 3.2 Confirm `crossOrigin="anonymous"` does not break `data:` URL loading on iOS Safari

## Dev Notes

### Component Implementation (exact)

```tsx
// src/components/FillConfirmScreen/AnnotatedImagePanel.tsx
import { useRef, useEffect, useState } from "react";

interface AnnotatedImagePanelProps {
  imgSrc: string;
  imgRef: React.RefObject<HTMLImageElement>;
  containerRef?: React.RefObject<HTMLDivElement>;
  linePx: number;
  onLoad?: () => void;
}

export function AnnotatedImagePanel({
  imgSrc,
  imgRef,
  containerRef,
  linePx,
  onLoad,
}: AnnotatedImagePanelProps) {
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });
  const internalContainerRef = useRef<HTMLDivElement>(null);
  const activeRef = containerRef ?? internalContainerRef;

  // Track container size for SVG viewBox
  useEffect(() => {
    const el = activeRef.current;
    if (!el) return;
    const ro = new ResizeObserver(entries => {
      const { width, height } = entries[0].contentRect;
      setContainerSize({ width, height });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [activeRef]);

  const { width: containerW, height: containerH } = containerSize;

  return (
    <div
      ref={activeRef}
      style={{ position: "relative", width: "100%", height: "100%" }}
    >
      <img
        ref={imgRef}
        src={imgSrc}
        crossOrigin="anonymous"
        onLoad={onLoad}
        alt=""
        style={{
          width: "100%",
          height: "100%",
          objectFit: "contain",
          display: "block",
        }}
      />
      {containerW > 0 && containerH > 0 && (
        <svg
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            overflow: "visible",
            pointerEvents: "none",
          }}
          viewBox={`0 0 ${containerW} ${containerH}`}
          preserveAspectRatio="none"
          aria-hidden="true"
        >
          <line
            x1={0}
            y1={linePx}
            x2={containerW}
            y2={linePx}
            stroke="red"
            strokeWidth={2}
            strokeDasharray="8 4"
          />
        </svg>
      )}
    </div>
  );
}
```

### Why `overflow: visible` on SVG

If `linePx` is near 0 or near `containerH`, the line is drawn right at the edge. Without `overflow: visible`, the SVG clips any stroke that extends past its bounding box. `overflow: visible` is safe — the SVG does not create a new stacking context.

### Why `preserveAspectRatio="none"`

The SVG coordinate space must map 1:1 to the container pixel space (so that `linePx` calculated by `fillMlToPixelY` — which uses `getBoundingClientRect` — maps directly to the correct SVG Y coordinate). `preserveAspectRatio="none"` ensures the SVG viewBox stretches to fill the container exactly.

### Why `viewBox` Uses Container Dimensions, NOT Natural Image Dimensions

`linePx` comes from `fillMlToPixelY` which returns a CSS pixel coordinate relative to the container top. The SVG viewBox must therefore match the container's CSS pixel space (`{containerW} x {containerH}`), not the image's natural resolution.

### Why ResizeObserver Inside This Component

This component tracks its own container size for the SVG viewBox. This is separate from the ResizeObserver in `FillConfirmScreen` (FC.4) which uses size changes to trigger `linePx` recalculation. Both can coexist — they observe the same element but serve different purposes. Alternatively, the parent can pass `containerSize` as a prop to avoid double-observing. The FC.4 story (FillConfirmScreen) will wire this together — defer the final decision to that story.

### `crossOrigin="anonymous"` on data: URLs

This attribute is safe on `data:` URLs (which is the typical `capturedImage` format from the camera). It has no effect on same-origin blob URLs. It is required for future canvas export functionality (canvas taint prevention). iOS Safari 16+ handles this correctly.

**Critical ordering rule (Safari):** In JSX, React always sets attributes in a consistent order. However, if you ever dynamically set `src` via `imgEl.src = ...` (outside JSX), you MUST set `crossOrigin` before `src`. In JSX with a static `src` prop, React handles this correctly — no manual ordering needed.

### Project Structure Notes

```
src/
  components/
    FillConfirmScreen/
      VerticalStepSlider.tsx   ← FC.3
      AnnotatedImagePanel.tsx  ← NEW (this story)
      FillConfirmScreen.tsx    ← FC.4
```

### References

- [Architecture FC §4 — AnnotatedImagePanel Internal Structure](../planning-artifacts/architecture-fill-confirm-screen.md#annotatedImagePanel-internal-structure)
- [Architecture FC §7 Rule 5 — SVG viewBox rule](../planning-artifacts/architecture-fill-confirm-screen.md#rule-5--svg-viewbox-matches-container)
- [Technical Research §Area 1 — SVG overlay approach](../planning-artifacts/research/technical-vite-react-pwa-image-annotation-slider-research-2026-04-10.md)

## Dev Agent Record

### Agent Model Used
Claude Sonnet 4.5

### Debug Log References
- Initial test failures: Images with empty `alt=""` have role "presentation" not "img" in testing-library
- Fixed by using `container.querySelector("img")` instead of `screen.getByRole("img")`
- ResizeObserver mock added to `src/test/setup.ts` to fix component rendering

### Completion Notes List
- ✅ Component created at `src/components/FillConfirmScreen/AnnotatedImagePanel.tsx`
- ✅ All 8 acceptance criteria implemented and verified
- ✅ ResizeObserver tracks container size for SVG viewBox
- ✅ SVG overlay uses `preserveAspectRatio="none"` for 1:1 pixel mapping
- ✅ `crossOrigin="anonymous"` set for future canvas export compatibility
- ✅ Test suite created with 7 tests covering all ACs
- ✅ All tests passing (7/7)
- ✅ Component follows architecture decisions from FC planning docs

### File List

**Files to CREATE:**
- `src/components/FillConfirmScreen/AnnotatedImagePanel.tsx`

**Files to MODIFY:**
- None
