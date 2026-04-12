---
stepsCompleted: [1, 2, 3, 4, 5, 6, 7, 8]
workflowType: 'architecture'
status: 'complete'
completedAt: '2026-04-10'
project_name: 'Afia-App'
component_scope: 'Fill Confirmation Screen'
user_name: 'Ahmed'
date: '2026-04-10'
inputDocuments:
  - research/technical-vite-react-pwa-image-annotation-slider-research-2026-04-10.md
  - architecture.md
  - prd.md
  - ux-design-specification.md
---

# Component Architecture: Fill Confirmation Screen — Afia-App

_Scoped component-level architecture for the annotated fill level confirmation screen. Supplements the existing system architecture (`architecture.md`). All decisions are informed by technical research completed 2026-04-10._

---

## Table of Contents

1. [Context & Purpose](#1-context--purpose)
2. [Flow Placement](#2-flow-placement)
3. [Core Architectural Decisions](#3-core-architectural-decisions)
4. [Component Structure & Props](#4-component-structure--props)
5. [State Management](#5-state-management)
6. [Coordinate Mapping Formula](#6-coordinate-mapping-formula)
7. [Implementation Patterns & Consistency Rules](#7-implementation-patterns--consistency-rules)
8. [RTL / Bilingual Layout](#8-rtl--bilingual-layout)
9. [Integration Points](#9-integration-points)
10. [Risk Register](#10-risk-register)

---

## 1. Context & Purpose

### PRD Requirements Addressed

| Requirement | Description |
|---|---|
| FR21 | User can view the estimated fill percentage alongside a visual fill gauge |
| FR26 | User can indicate whether the AI fill estimate was accurate |
| FR27 | User can provide a corrected fill percentage estimate via slider |

### What This Screen Does

After the AI API returns a fill estimate (`fillPercent: number, 0–100`), and **before** the final result screen (volume + nutrition) is displayed, the user sees:

1. Their **captured JPEG** with a **red horizontal line** drawn at the pixel Y-position corresponding to the AI-estimated fill level
2. A **vertical step slider** (55 ml increments) positioned beside the image, initialized at the AI estimate snapped to the nearest 55 ml step
3. The line and slider stay **in sync** — dragging the slider repositions the line in real time
4. A **Confirm** button submits the final `waterMl` value into the volume calculation pipeline

### Design Philosophy

- **What you see is what you confirm:** The annotated photo makes the AI's interpretation visually legible. Users correct with spatial intuition, not abstract numbers.
- **Minimal disruption:** The slider and image are the entire screen — no competing UI elements.
- **Fail-safe floor:** The slider cannot go below 55 ml (1 step), preventing a zero-consumption confirmation.

---

## 2. Flow Placement

```
[Screen 3: Photo Preview] → [Screen 4: Analyzing (API call in progress)]
    ↓ API returns fillPercent
[Screen 4b: Fill Confirmation Screen]   ← NEW
    ↓ user confirms waterMl
[Screen 5: Result Display (volume + nutrition + feedback)]
```

The Fill Confirmation Screen replaces the silent transition from Analyzing → Result. The existing Screen 7 (Feedback Slider) is **retained** as a post-result correction path, but the confirmation screen is the primary correction point.

---

## 3. Core Architectural Decisions

### Decision 1: Annotation Rendering — SVG Overlay (not Canvas)

**Decision:** Use an absolutely-positioned `<svg>` over the `<img>` element for the annotation line.

**Rationale:**
- No redraw loop — a single `<line>` attribute update (`y1`/`y2`) repositions the line; the JPEG is never re-rasterized
- GPU-friendly vector rendering at any device pixel ratio — no blurring on high-DPI displays
- No iOS Safari bugs for a static annotation line
- Simplest export path if needed later: `html2canvas` on the container div

**Rejected alternative — Canvas `drawImage`:**
- Requires a full redraw on every slider tick
- No native pinch-zoom without implementing gesture handling manually
- Two-canvas architecture needed for export quality
- CORS taint risks if image is served from Supabase Storage (would require `crossOrigin="anonymous"` before `src` — Safari-sensitive attribute ordering)

**Rejected alternative — CSS absolute div:**
- Cannot follow native browser pinch-zoom
- Export fidelity via `html2canvas` similar to SVG but with less precise line positioning

**iOS Safari notes (from research):**
- SVG must have an explicit `viewBox` — without it, sizing fails on iOS Safari
- Use `overflow="visible"` to prevent line clipping at edges
- In flex/grid layouts, use `min-width` or explicit px dimensions on the SVG container

### Decision 2: Vertical Slider — `@radix-ui/react-slider`

**Decision:** Use `@radix-ui/react-slider` with `orientation="vertical"`, `min={55}`, `step={55}`, `max={bottleCapacityMl}`.

**Rationale:**
- Best iOS Safari touch support among evaluated options
- `min={55}` enforces the 55 ml floor — slider cannot reach 0
- Fully styleable with Tailwind CSS; no visual constraints from native appearance
- Value semantics (bottom = min, top = max) remain stable in RTL layouts since Radix uses pointer position, not CSS `direction`

**Required CSS fix (open issue #570):**
```css
[data-radix-slider-root] {
  touch-action: pan-x; /* prevent page scroll conflict on vertical drag */
}
```

**iOS 16 vs 17.4+ note:** Radix handles its own gesture math and does not rely on `writing-mode` on form controls, so the iOS 16/17.4 `writing-mode` split does not affect Radix. The native input fallback (`writing-mode: vertical-lr` for iOS 17.4+, `transform: rotate(-90deg)` for iOS 16) is only relevant if Radix is replaced.

**Rejected alternative — `react-slider` (Zillow):**
- Documented open issue: touch events on vertical sliders do not prevent page scroll on mobile Safari/Chrome

**Rejected alternative — native `<input type="range">` vertical:**
- Requires separate CSS strategy per iOS version (writing-mode vs. transform)
- No `step` enforcement as clean as Radix props
- Harder to style with Tailwind

### Decision 3: Coordinate Mapping — `getBoundingClientRect` + `naturalWidth/Height`

**Decision:** Map fill percentage to CSS pixel Y using the formula described in §6. Recompute via `useMemo` keyed on `[waterMl, containerWidth, containerHeight]`. Track container size with `useResizeObserver`.

**Rationale:**
- `getBoundingClientRect()` returns post-CSS-transform rendered size — correct for any CSS scaling, transforms, or DPR
- `Math.min(scaleX, scaleY)` is the standard formula for `object-fit: contain` (letterbox mode)
- `useResizeObserver` is Safari-safe; `window.resize` fires inconsistently during iOS Safari browser chrome hide/show
- Bottle top/bottom bounds (`bottleTopPct`, `bottleBottomPct`) are passed as props from the API response or pre-registered bottle geometry, enabling accurate sub-frame mapping

### Decision 4: State Architecture — Single `waterMl` Source of Truth

**Decision:** One piece of mutable state (`waterMl: number`). The line position (`linePx`) is a derived value computed by `useMemo`.

**Rationale:**
- Prevents state synchronization bugs (slider and line can never be out of sync)
- `useMemo` recalculates `linePx` when `waterMl` changes OR when the container resizes
- The Radix Slider `value` prop accepts `[waterMl]` directly; `onValueChange={([v]) => setWaterMl(v)}`

---

## 4. Component Structure & Props

### Component Tree

```
<FillConfirmScreen>                          // page-level component
  <div dir={isRtl ? "rtl" : "ltr"}          // flex row, controls layout direction
    className="flex flex-row items-stretch">
    
    <VerticalStepSlider                      // LEFT in LTR, RIGHT in RTL (automatic)
      waterMl={waterMl}
      min={55}
      step={55}
      max={bottleCapacityMl}
      onChange={setWaterMl}
    />

    <AnnotatedImagePanel                     // image + SVG overlay
      ref={containerRef}
      imgSrc={imageDataUrl}
      imgRef={imgRef}
      linePx={linePx}
      bottleCapacityMl={bottleCapacityMl}
      waterMl={waterMl}
    />
  </div>

  <ConfirmButton
    onClick={() => onConfirm(waterMl)}
    waterMl={waterMl}
    bottleCapacityMl={bottleCapacityMl}
  />
</FillConfirmScreen>
```

### `FillConfirmScreen` Props

```typescript
interface FillConfirmScreenProps {
  /** Captured JPEG as a data URL (from camera capture step) */
  imageDataUrl: string;

  /** AI-estimated fill level, 0–100 (from API response) */
  aiEstimatePercent: number;

  /** Total bottle capacity in ml (from bottle SKU registry) */
  bottleCapacityMl: number;

  /**
   * Top edge of the bottle within the image frame, expressed as a fraction
   * of the image's natural height (0 = top of image, 1 = bottom of image).
   * From bottle geometry data or API response.
   */
  bottleTopPct: number;

  /**
   * Bottom edge of the bottle within the image frame, expressed as a fraction
   * of the image's natural height.
   */
  bottleBottomPct: number;

  /** Called when user taps Confirm, with their adjusted waterMl value */
  onConfirm: (waterMl: number) => void;

  /** Called when user taps Retake */
  onRetake: () => void;
}
```

### `AnnotatedImagePanel` Internal Structure

```tsx
// position: relative container → img fills it → SVG overlays at 100%x100%
<div ref={containerRef} style={{ position: 'relative' }}>
  <img
    ref={imgRef}
    src={imgSrc}
    style={{ objectFit: 'contain', width: '100%', height: '100%' }}
    onLoad={handleImageLoad}  // triggers initial linePx calculation
    crossOrigin="anonymous"   // required if src is ever served from different origin
    alt=""                    // decorative; content described by adjacent text
  />
  <svg
    style={{
      position: 'absolute', top: 0, left: 0,
      width: '100%', height: '100%',
      overflow: 'visible',
      pointerEvents: 'none',
    }}
    viewBox={`0 0 ${containerWidth} ${containerHeight}`}
    preserveAspectRatio="none"
  >
    <line
      x1={0}
      y1={linePx}
      x2={containerWidth}
      y2={linePx}
      stroke="red"
      strokeWidth={2}
      strokeDasharray="8 4"
    />
  </svg>
</div>
```

---

## 5. State Management

### State Variables

```typescript
// In FillConfirmScreen:
const [waterMl, setWaterMl] = useState<number>(() => {
  // Snap AI estimate to nearest 55ml step
  const estimatedMl = (aiEstimatePercent / 100) * bottleCapacityMl;
  const step = 55;
  const snapped = Math.round(estimatedMl / step) * step;
  // Clamp to [55, bottleCapacityMl]
  return Math.max(step, Math.min(bottleCapacityMl, snapped));
});
```

### Derived Values

```typescript
// Container size tracking
const containerRef = useRef<HTMLDivElement>(null);
const imgRef = useRef<HTMLImageElement>(null);
const { width: containerW = 0, height: containerH = 0 } = useResizeObserver({ ref: containerRef });

// Derived line position — recomputes on waterMl change OR container resize
const linePx = useMemo(() => {
  if (!imgRef.current || !containerW || !containerH) return 0;
  return fillMlToPixelY(waterMl, bottleCapacityMl, imgRef.current, bottleTopPct, bottleBottomPct);
}, [waterMl, bottleCapacityMl, bottleTopPct, bottleBottomPct, containerW, containerH]);
```

### Why No useEffect for linePx

`linePx` is a pure function of `waterMl` + container geometry. There is no async work, no external subscription. `useMemo` is correct; `useEffect` + `setState` would add an unnecessary render cycle.

---

## 6. Coordinate Mapping Formula

```typescript
/**
 * Maps a water volume (in ml) to a CSS pixel Y-coordinate within the
 * image container, accounting for object-fit: contain letterboxing and
 * the bottle's position within the image frame.
 *
 * Y = 0 is the TOP of the container. Higher Y = lower on screen.
 * 100% full → bottleTopPx (line is at top of bottle).
 * 0% full   → bottleBottomPx (line is at bottom of bottle).
 */
export function fillMlToPixelY(
  waterMl: number,
  bottleCapacityMl: number,
  imgEl: HTMLImageElement,
  bottleTopPct: number,    // 0–1, fraction of natural image height
  bottleBottomPct: number  // 0–1, fraction of natural image height
): number {
  const rect = imgEl.getBoundingClientRect();
  const natW = imgEl.naturalWidth;
  const natH = imgEl.naturalHeight;

  if (!natW || !natH || !rect.width || !rect.height) return 0;

  // object-fit: contain → minimum scale factor (letterbox the unconstrained axis)
  const scale = Math.min(rect.width / natW, rect.height / natH);

  const renderedH = natH * scale;
  const offsetY = (rect.height - renderedH) / 2; // letterbox bar height (top and bottom)

  // Bottle extents in CSS px from the container's top
  const bottleTopPx    = offsetY + bottleTopPct    * renderedH;
  const bottleBottomPx = offsetY + bottleBottomPct * renderedH;

  // Map fill fraction: 1.0 (full) = bottleTopPx, 0.0 (empty) = bottleBottomPx
  const fillFraction = Math.max(0, Math.min(1, waterMl / bottleCapacityMl));
  return bottleBottomPx - fillFraction * (bottleBottomPx - bottleTopPx);
}
```

**Key invariants:**
- `bottleTopPct` must be < `bottleBottomPct` (top of bottle is above bottom in image coordinates)
- If the bottle fills the full image frame: `bottleTopPct = 0`, `bottleBottomPct = 1`
- The function returns a value relative to the container's top-left corner (not viewport)

---

## 7. Implementation Patterns & Consistency Rules

These rules exist so that any AI agent implementing this feature produces consistent code:

### Rule 1 — Single waterMl State
`waterMl` is the **only** mutable state. `linePx`, step count, and display strings are all derived. Never create a separate `linePx` state variable.

### Rule 2 — Slider Props are Absolute ml
Pass `value={[waterMl]}`, `min={55}`, `step={55}`, `max={bottleCapacityMl}` to Radix Slider. Do NOT convert to percentage before passing — keep everything in ml throughout.

### Rule 3 — crossOrigin Before src
If `imageDataUrl` could ever be an HTTP URL (not a `data:` URI or `blob:` URI), set `crossOrigin="anonymous"` on the `<img>` element before the `src` attribute is set. In JSX this means always including `crossOrigin="anonymous"` as a prop.

### Rule 4 — ResizeObserver, Not window.resize
Use `useResizeObserver` from `use-resize-observer` on the `containerRef`. Do not use `window.addEventListener('resize', ...)` — Safari fires this event inconsistently when the browser chrome hides/shows.

### Rule 5 — SVG viewBox Matches Container
Set `viewBox={`0 0 ${containerW} ${containerH}`}` and `preserveAspectRatio="none"`. Do not use the image's natural dimensions as the viewBox — the SVG occupies the container box, not the image's natural box.

### Rule 6 — touch-action on Slider Root
Add `touch-action: pan-x` (via Tailwind `touch-pan-x` class or inline style) on the Radix Slider root element to prevent vertical slider drag from triggering page scroll on iOS Safari.

### Rule 7 — onLoad Before linePx
The `fillMlToPixelY` function reads `imgEl.naturalWidth` / `naturalHeight`. These are 0 until the image is loaded. Ensure the initial `linePx` calculation is triggered by the `<img onLoad>` handler (or use `img.complete` in the `useResizeObserver` callback as a guard).

### Rule 8 — No Canvas in This Component
Canvas is not used in this component. If an export/share feature is requested in the future, create a separate `ExportService` that renders a canvas at natural resolution. Do not refactor the display component to use canvas.

---

## 8. RTL / Bilingual Layout

### Layout Behavior

```
LTR (English):                    RTL (Arabic):
┌─────────────────────────────┐   ┌─────────────────────────────┐
│  [Slider]  │   [Image+Line] │   │  [Image+Line]  │  [Slider]  │
└─────────────────────────────┘   └─────────────────────────────┘
```

**Mechanism:** Set `dir` on the flex-row container. Flexbox is a logical layout system — `dir="rtl"` reverses the main axis, moving the slider from left to right automatically. No media queries or conditional class names are needed.

```tsx
<div dir={i18n.dir()} className="flex flex-row items-stretch gap-4">
  <VerticalStepSlider ... />
  <AnnotatedImagePanel ... />
</div>
```

### Slider Value Direction

Radix `<Slider>` uses pointer position (not CSS `direction`) for value calculation. Bottom = min (55 ml), top = max (`bottleCapacityMl`). This semantic is **unchanged** in RTL. No value inversion is needed.

### Spacing

Use CSS logical properties for gap/margin between slider and image panel:

```css
/* Tailwind equivalent: ms-4 / me-4 (margin-inline-start/end) */
margin-inline-end: 1rem; /* on the slider in both LTR and RTL */
```

### Touch Events in RTL

Touch and pointer events return physical viewport coordinates (`clientX`, `clientY`). These are unaffected by `dir="rtl"`. No coordinate compensation needed in touch handlers.

### Labels & Copy

All visible text (ml values, "Confirm" button, slider label) must use the existing i18n system. Arabic translations must be added alongside English in the translation file. Copy follows the bilingual pattern established in the app.

---

## 9. Integration Points

### Upstream (what this screen receives)

| Data | Source | Type |
|---|---|---|
| `imageDataUrl` | Camera capture step (blob URL or data URL) | `string` |
| `aiEstimatePercent` | AI API response (`fillPercentage` field) | `number` (0–100) |
| `bottleCapacityMl` | Bottle SKU registry (pre-loaded with QR scan) | `number` |
| `bottleTopPct` | Bottle geometry data OR API response bounding box | `number` (0–1) |
| `bottleBottomPct` | Same source as bottleTopPct | `number` (0–1) |

**Note on bottleTopPct / bottleBottomPct:** If the AI API does not return bounding box coordinates for the bottle within the frame, these can default to `bottleTopPct = 0.05` and `bottleBottomPct = 0.95` (full frame minus a small margin) as a reasonable fallback. This should be tracked as a known limitation.

### Downstream (what this screen produces)

| Data | Destination | Type |
|---|---|---|
| `waterMl` (confirmed) | Volume calculation pipeline | `number` (multiple of 55, ≥55) |

The confirmed `waterMl` value replaces the raw AI estimate as the input to:
- Remaining volume display (ml / tbsp / cups)
- Consumed volume calculation
- Nutritional facts calculation
- R2 metadata storage (`userFeedback.userEstimate`)

### Existing System Architecture Compatibility

This component integrates with the existing system architecture (`architecture.md`) as follows:

- **Worker API:** No change needed — fill estimate already returned as `fillPercentage: number`
- **Volume calculation:** Already accepts a fill percentage / ml value — no change needed
- **R2 metadata schema:** `userFeedback.userEstimate` already planned for user-corrected estimates — the confirmed value from this screen populates that field even when the user does not change the AI estimate
- **State machine / screen routing:** Add `FILL_CONFIRM` state between `ANALYZING` and `RESULT_DISPLAY`

---

## 10. Risk Register

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| `naturalWidth/Height` = 0 when `fillMlToPixelY` is called | Medium | Line renders at wrong position | Guard: check `img.complete` before computing; re-trigger on `onLoad` |
| Radix Slider scroll conflict on iOS Safari | High | Vertical drag scrolls page instead | Apply `touch-action: pan-x` on slider root (known fix, documented in research) |
| SVG line not visible at image edges | Low | Annotation cut off | `overflow="visible"` on the SVG element |
| `bottleTopPct`/`bottleBottomPct` not available from API | Medium | Line maps to wrong pixel | Default to `0.05`/`0.95`; document as limitation |
| Canvas CORS taint if export feature added later | Low (future) | Export fails silently | Enforce `crossOrigin="anonymous"` on img now; use presigned URLs |
| RTL Radix Slider value inversion | Low | Slider shows wrong direction in Arabic | Radix uses pointer coords, not CSS direction — verified in research; re-test in Arabic layout |
| Image not loaded when ResizeObserver fires | Medium | `linePx = 0` on initial render | Guard with `imgEl.complete` in `useMemo` |

---

**Architecture Completed:** 2026-04-10
**Informed by:** Technical Research Report (`technical-vite-react-pwa-image-annotation-slider-research-2026-04-10.md`)
**System Architecture:** See `architecture.md` for full system context
**Next step:** Epics and user stories — see `epics-fill-confirm-screen.md`
