---
stepsCompleted: [1, 2, 3, 4]
inputDocuments: []
workflowType: 'research'
lastStep: 4
research_type: 'technical'
research_topic: 'Real-time bottle silhouette overlay and orientation detection for mobile camera'
research_goals: 'Research the technical implementation options for: (1) drawing an accurate bottle silhouette/outline on a live camera feed, (2) detecting bottle orientation (front/back/side), (3) providing real-time lighting and angle feedback, (4) using a pre-existing image dataset (extracted_frames + augmented_frames) to define the exact bottle shape for overlay — all within a browser/PWA context (Vite + React, Cloudflare Workers backend)'
user_name: 'Ahmed'
date: '2026-04-09'
web_research_enabled: true
source_verification: true
status: 'completed'
---

# Technical Research: Real-time Bottle Silhouette Overlay & Orientation Detection

## Executive Summary

**Top 5 findings and recommended approach:**

1. **The Afia app already has a working SVG bottle guide** — `CameraViewfinder.tsx` renders a `BottleGuide` component with an SVG path whose stroke color changes based on `distance` state (green/amber/red). The silhouette overlay problem is largely solved; effort should go toward improving accuracy and adding orientation detection, not rebuilding the overlay from scratch.

2. **Pure pixel/HSV heuristics are sufficient for front vs. back detection** without any ML model. The Afia green label (H 80–170°, S≥25%, V≥18%) is already detected in `analyzeComposition()`. A secondary heuristic scanning for the white/cream label region (H 20–50°, S<20%, V≥70%) and the bottle's aspect ratio can distinguish front/back/side profiles at 60×100px with no external library.

3. **Canvas pixel analysis at a downsampled resolution (50–100px) is the right performance tier** for real-time feedback on mobile. The existing `getProcessingCanvas()` singleton approach at 60×100px is architecturally correct. Do not load OpenCV.js (5–10 MB WASM) or TensorFlow.js for this use case — it adds 2–4 seconds of startup on mobile and provides marginal gain over heuristics for a known-bottle product app.

4. **OffscreenCanvas + Web Worker** is the correct upgrade path if the per-frame analysis budget exceeds ~6ms on the main thread. All pixel math can be moved to a worker with `postMessage` + `transferable` ImageData, keeping the main thread free for 60fps rendering.

5. **iOS Safari PWA camera limitations remain significant** (recurring permission prompts on route transitions, no MediaRecorder, 30fps throttling in low-power mode). These must be accounted for in the guidance loop timing and the `facingMode: 'environment'` constraint handling.

---

## 1. Silhouette Overlay — Implementation Options

### 1.1 SVG vs. Canvas for the bottle outline

The Afia app already uses the correct approach: an SVG element with `viewBox="0 0 130 210"` layered as `position: absolute` over the `<video>` element using CSS. This is the industry-standard pattern for camera guide overlays (barcode scanners, document scanners, identity verification apps).

**SVG (current approach) — preferred:**
- Zero runtime cost: the browser's compositor renders the path; no JS per-frame.
- Stroke color changes are a single `color` prop → React re-render → CSS paint — under 1ms.
- `viewBox` + `preserveAspectRatio="xMidYMid meet"` scales correctly on any viewport.
- `pointer-events: none` on the SVG ensures touch events pass through to underlying controls.

**Canvas overlay — when appropriate:**
- Required only if you need per-pixel effects on the outline (e.g., animated dashed stroke driven by fill level).
- Canvas calls must happen inside `requestAnimationFrame` or a throttled interval.
- Use `ctx.strokeStyle` + `ctx.stroke()` on a `Path2D` object constructed once and cached.

**Key MDN reference:** [Manipulating video using canvas](https://developer.mozilla.org/en-US/docs/Web/API/Canvas_API/Manipulating_video_using_canvas)

### 1.2 Color feedback (green / amber / red)

The current `BottleGuide` component already implements this correctly:

```
green  (#10b981) → distance === 'good' || isReady
amber  (#f59e0b) → distance === 'too-far' || 'too-close'
red    (#ef4444) → distance === 'not-detected'
```

The SVG `stroke` prop is updated on every React render triggered by the guidance loop (currently every 500ms via `createDebouncedAssessment`). This is correct — no animation-frame loop needed for color updates.

**Enhancement option:** add a CSS `transition: stroke 0.3s ease` equivalent via SVG `stroke` animate element or via a CSS variable on the wrapper `div` to smooth color transitions.

### 1.3 Animation frame loop vs. throttled interval

| Approach | Cost | Use case |
|---|---|---|
| `requestAnimationFrame` (every frame, ~16ms) | High CPU/GPU | Continuous canvas drawing, particle effects |
| Throttled rAF (every Nth frame) | Moderate | Video frame analysis at 15–20fps |
| `setInterval` / debounced setTimeout | Low | Quality assessment feedback (current: 500ms) |

**Recommendation for Afia:** Keep the 500ms assessment interval for quality scoring. For the silhouette color update, it is already tied to React state — fast enough. If assessment frequency needs to increase to 200ms (for snappier response), use a throttled `requestAnimationFrame` pattern:

```ts
let lastAnalysis = 0;
const ANALYSIS_INTERVAL = 200; // ms

function tick(timestamp: number) {
  if (timestamp - lastAnalysis >= ANALYSIS_INTERVAL) {
    lastAnalysis = timestamp;
    runAssessment(videoEl);
  }
  rafId = requestAnimationFrame(tick);
}
```

**iOS caveat:** Safari throttles `requestAnimationFrame` to 30fps in Low Power Mode and to 15fps when the PWA is backgrounded.

### 1.4 Responsive scaling of the SVG over video

The `<video>` element uses `object-fit: cover` (typical for full-bleed mobile camera). The SVG overlay must match the same visible crop. Pattern:

```css
.camera-container { position: relative; }
.camera-video     { width: 100%; height: 100%; object-fit: cover; }
.bottle-guide-svg { position: absolute; inset: 0; width: 100%; height: 100%; }
```

With `viewBox="0 0 130 210"` and `preserveAspectRatio="xMidYMid meet"` (default), the SVG scales uniformly and centers itself in the available space, matching video display behavior on any device.

---

## 2. Orientation Detection — Technical Approaches

### 2.1 The problem

The Afia 1.5L bottle has three faces relevant for fill-level estimation:
- **Front label**: green label (already detected via HSV in `analyzeComposition`)
- **Back label**: white/cream label with Arabic text
- **Side profile**: translucent amber/golden oil visible, no label

### 2.2 HSV heuristic approach (recommended — no library required)

The existing `analyzeComposition` function detects green and amber pixels. Extending it to orientation detection:

**Front face signature:**
- Green label pixels: H 80–170°, S≥25%, V≥18% — currently detected
- Label region occupies the center vertical band
- Aspect ratio of the bounding box of green pixels ≈ 0.7–1.3 (wide label)

**Back face signature:**
- White/cream label: H 20–60°, S<15%, V≥75% (near-white, slight warm tint)
- Or: near-neutral region where all RGB channels are high (R>180, G>170, B>160)
- Arabic text will appear as dark pixels within that white region

**Side profile signature:**
- Predominantly amber/golden pixels spanning full vertical extent
- Green pixel count very low (<2% of frame)
- Bounding box aspect ratio: narrow and tall (the bottle profile seen from side)

**Implementation approach at 60×100px:**

```ts
// In analyzeComposition or a new analyzeOrientation():
const isWhite = r > 180 && g > 170 && b > 160 && Math.max(r,g,b) - Math.min(r,g,b) < 30;
const isGreen = h >= 80 && h <= 170 && s >= 0.25 && v >= 0.18;
const isAmber = h >= 25 && h <= 65 && s >= 0.28 && v >= 0.38;
// Count pixels in each category
// orientation = greenRatio > 0.08 ? 'front'
//             : whiteRatio > 0.12 ? 'back'
//             : amberRatio > 0.15 ? 'side'
//             : 'unknown'
```

### 2.3 Aspect ratio heuristic

At 60×100px, if the bounding box of all non-background pixels has:
- Width/height ratio < 0.5 → side profile (tall and narrow)
- Width/height ratio 0.5–0.85 → front or back (wider due to label region)

This is fragile in isolation but combined with color heuristics gives a reasonable signal.

### 2.4 Lightweight CV libraries — feasibility assessment

| Library | Bundle size | Startup (mobile) | Usefulness for this task |
|---|---|---|---|
| **OpenCV.js (WASM)** | 5.3–10 MB | 2–4s | Overkill — not needed at 60×100px |
| **TensorFlow.js (MobileNet)** | 4–8 MB | 3–6s | Wrong tool — pre-trained on ImageNet, not bottle orientation |
| **TF.js custom model** | 1–3 MB | 1–2s | Feasible if you train a custom classifier; 8–15h of data prep |
| **ONNX Runtime Web (YOLOv8n)** | ~30ms inference at 640×640 on M1 | Requires custom model training |
| **Pixel heuristics (no library)** | 0 bytes | 0ms | **Sufficient for known product with fixed colors** |

**Conclusion:** For a single known product (Afia 1.5L), pixel heuristics are the correct tier. No external CV library is justified unless orientation accuracy proves insufficient after real-world testing.

### 2.5 TF.js feasibility for bottle pose — deferred

Training a bottle-specific pose estimator would require:
- 500–2000 labeled training images of the Afia bottle at front/back/side angles
- Export to TF.js SavedModel format
- ~40–80ms inference per frame on mid-range Android (acceptable)

**Verdict:** Defer to Phase 2. The pixel heuristic approach should be validated first.

---

## 3. Lighting Analysis — Pixel Techniques

### 3.1 Current implementation (already in codebase)

`assessLighting()` in `cameraQualityAssessment.ts` already implements:
- **Average luminance** via `0.299R + 0.587G + 0.114B` (BT.601)
- **RMS contrast** via standard deviation of grayscale
- Thresholds: `brightness < 40` → too dark; `brightness > 220` → too bright; `contrast < 30` → low contrast
- All computed on a 50×50px downsampled canvas

### 3.2 Histogram analysis for over/underexposure

```ts
const hist = new Uint32Array(256);
for (let i = 0; i < data.length; i += 4) {
  const lum = Math.round(0.2126*data[i] + 0.7152*data[i+1] + 0.0722*data[i+2]);
  hist[lum]++;
}
const total = 2500;
const darkRatio = hist.slice(0, 50).reduce((a,b) => a+b, 0) / total;
const brightRatio = hist.slice(200, 256).reduce((a,b) => a+b, 0) / total;
// darkRatio > 0.5 → too dark; brightRatio > 0.4 → too bright / glare
```

### 3.3 Glare detection

Specular glare appears as localized bright regions. Detection:
- Divide frame into a 4×4 grid of cells
- Calculate mean luminance per cell
- If any cell > 230 AND global mean < 180: glare in that region

### 3.4 Shadow detection

Shadow (uneven illumination) detectable as high variance in luminance across vertical slices:
- Divide bounding box of detected bottle pixels into horizontal slices
- Compute mean luminance per slice
- If standard deviation of slice means > 40: uneven lighting / shadow present

### 3.5 Recommended threshold table

| Condition | Metric | Threshold | Action |
|---|---|---|---|
| Too dark | Mean luminance | < 40 | "Move to brighter location" |
| Overexposed | Mean luminance | > 220 | "Reduce glare" |
| Low contrast | RMS contrast | < 30 | "Improve lighting" |
| Glare spot | Max cell luminance | > 230 with global < 180 | "Avoid direct light on bottle" |
| Shadow/uneven | Luminance slice StdDev | > 40 | "Even out the lighting" |

---

## 4. Reference Image → Bottle SVG Path

### 4.1 The Afia app's current SVG path

The existing `BottleGuide` SVG in `CameraViewfinder.tsx` uses a hand-authored path:
- Cap: `<rect x="47" y="2" width="36" height="11" rx="4" />`
- Body + shoulder: cubic Bézier path in `viewBox="0 0 130 210"`
- Handle: D-shaped arc
- Dashed label outline and midline guides

### 4.2 Offline workflow to extract an accurate SVG from reference photos

**Step 1 — Background removal:**
```bash
rembg i bottle.jpg bottle_transparent.png
convert bottle_transparent.png -alpha extract bottle_alpha.png
convert bottle_alpha.png -threshold 50% bottle_bw.png
```

**Step 2 — Potrace to SVG:**
```bash
convert bottle_bw.png bottle.pnm
potrace --svg --turdsize 10 --alphamax 1.0 -o bottle.svg bottle.pnm
```

**Step 3 — Inkscape simplification:**
```bash
inkscape --batch-process \
  --actions="select-all;path-simplify;export-filename:bottle_clean.svg;export-do;" \
  bottle.svg
```

### 4.3 Encoding the path as a React component

```tsx
export function BottleSilhouette({ color = '#10b981', opacity = 0.9, className }: Props) {
  return (
    <svg
      className={className}
      viewBox="0 0 130 210"
      preserveAspectRatio="xMidYMid slice"  // match object-fit: cover
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none' }}
    >
      <path
        d="M...extracted from Potrace..."
        stroke={color}
        strokeWidth="3"
        strokeLinejoin="round"
        opacity={opacity}
      />
    </svg>
  );
}
```

**Key:** Use `preserveAspectRatio="xMidYMid slice"` to match the video's `object-fit: cover` behavior.

---

## 5. Browser/PWA Constraints

### 5.1 getUserMedia constraints

```ts
{ video: { facingMode: { ideal: 'environment' }, width: { ideal: 1920 }, height: { ideal: 1080 } } }
```

Use `{ ideal: 'environment' }` not `{ exact: 'environment' }` to avoid `OverconstrainedError`.

### 5.2 iOS Safari PWA — known camera bugs (2024–2026)

| Bug | Status | Workaround |
|---|---|---|
| Recurring permission prompts on SPA route transitions | Active (WebKit #215884) | Avoid hash-based navigation while camera is active |
| `getUserMedia` fails in standalone mode | Patched in iOS 16.4+ | Ensure `<meta name="apple-mobile-web-app-capable">` is set |
| 30fps rAF throttling in Low Power Mode | By design | Detect via `document.hidden`; reduce analysis frequency |
| `enumerateDevices()` returns empty without prior permission | Active | Always call `getUserMedia` before enumerating |

### 5.3 Canvas performance

`willReadFrequently: true` (already set) is critical — keeps canvas in CPU memory, avoiding GPU→CPU round-trips on every `getImageData()`. Without it, `getImageData` at 60fps on mobile can take 10–30ms per call.

### 5.4 OffscreenCanvas + Web Worker

If per-frame analysis exceeds ~6ms, offload via:
```ts
const offscreen = canvas.transferControlToOffscreen();
worker.postMessage({ type: 'init', canvas: offscreen }, [offscreen]);
const bitmap = await createImageBitmap(videoEl);
worker.postMessage({ type: 'analyze', bitmap }, [bitmap]);
```

Only pursue after profiling shows main-thread jank.

---

## 6. Recommended Architecture for Afia App

### 6.1 What is already built (do not rebuild)

- SVG bottle guide overlay — **complete** (`BottleGuide` in `CameraViewfinder.tsx`)
- Color-coded outline (green/amber/red) based on `distance` state — **complete**
- HSV-based bottle detection (green label + amber oil) — **complete** (`analyzeComposition`)
- Shape-aware gates (ROI, aspect ratio, neck sparsity) — **complete** (just implemented)
- Blur detection — **complete** (`detectBlur`)
- Lighting assessment (brightness + RMS contrast) — **complete** (`assessLighting`)

### 6.2 What to build next (prioritized)

**Priority 1 — Front/Back/Side orientation detection (~1–2 days):**
- Extend `analyzeComposition` or add `analyzeOrientation()` in `cameraQualityAssessment.ts`
- Count white/cream pixels (back label signature)
- Return `orientation: 'front' | 'back' | 'side' | 'unknown'`
- Add bilingual guidance: "Show the front label" / "أظهر الوجه الأمامي"
- Gate capture on `orientation === 'front'` if required

**Priority 2 — Glare spot detection (~1 day):**
- 4×4 patch-based luminance analysis in `assessLighting`
- Return `hasGlare: boolean`
- Add bilingual guidance message

**Priority 3 — SVG path accuracy validation (~0.5 day):**
- Run reference frames through Potrace
- Compare with hand-authored `BottleGuide` path
- Replace if proportions differ significantly (shoulder curve, handle size)

**Priority 4 — Performance profiling:**
- Wrap each assessment function with `performance.now()` timing
- Pursue OffscreenCanvas only if total pipeline exceeds 6ms

### 6.3 What to defer

- OpenCV.js / TensorFlow.js / ONNX Runtime — defer indefinitely
- Custom ML model for orientation — revisit if heuristic accuracy < 85%
- Per-frame (60fps) analysis — 200ms throttled rAF if 500ms feels sluggish

---

## 7. Implementation Risks & Mitigations

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| HSV orientation heuristic fails under yellow/indoor lighting | Medium | Medium | Test on device under fluorescent, halogen, natural light; adjust HSV bounds empirically |
| iOS Safari re-prompts for camera permission on route change | High | High | Keep camera active across routes; use `useRef` to persist stream |
| iOS Low Power Mode throttles rAF | Medium | Low | Analysis debounced at 500ms — not frame-rate dependent |
| SVG guide misaligned on tablets or landscape orientation | Medium | Medium | Add CSS media query; test on iPad |
| White back label confused with bright background | Medium | Medium | Sample only center 60% of frame; require minimum green+amber count before orientation check |
| Potrace output too many nodes → large SVG | Low | Low | Apply Inkscape simplify; target <50 nodes |
| OpenCV.js bloat added by another developer | Low | High | Document in CLAUDE.md that CV libraries are prohibited |

---

## Sources

- [MDN — Manipulating video using canvas](https://developer.mozilla.org/en-US/docs/Web/API/Canvas_API/Manipulating_video_using_canvas)
- [MDN — Optimizing canvas](https://developer.mozilla.org/en-US/docs/Web/API/Canvas_API/Tutorial/Optimizing_canvas)
- [MDN — OffscreenCanvas](https://developer.mozilla.org/en-US/docs/Web/API/OffscreenCanvas)
- [web.dev — OffscreenCanvas: speed up your canvas operations with a web worker](https://web.dev/articles/offscreen-canvas)
- [dbushell.com — Offscreen Canvas and Web Workers (2024)](https://dbushell.com/2024/04/02/offscreen-canvas-and-web-workers/)
- [Motion Magazine — When browsers throttle requestAnimationFrame](https://motion.dev/blog/when-browsers-throttle-requestanimationframe)
- [Roboflow — Automatic Bottle Orienter with Computer Vision](https://blog.roboflow.com/estimate-bottle-orientation/)
- [Potrace](https://potrace.sourceforge.net/)
- [Inkscape — Tracing bitmaps tutorial](https://inkscape.org/doc/tutorials/tracing/tutorial-tracing.html)
- [LogRocket — Make any SVG responsive](https://blog.logrocket.com/make-any-svg-responsive-with-this-react-component/)
- [TensorFlow Blog — Custom object detection in the browser](https://blog.tensorflow.org/2021/01/custom-object-detection-in-browser.html)
- [ONNX Runtime Web docs](https://onnxruntime.ai/docs/tutorials/web/)
- [WebKit bug #252465 — getUserMedia in PWA standalone mode](https://bugs.webkit.org/show_bug.cgi?id=252465)
- [WebKit bug #215884 — getUserMedia recurring permission prompts](https://bugs.webkit.org/show_bug.cgi?id=215884)
- [magicbell.com — PWA iOS Limitations 2026](https://www.magicbell.com/blog/pwa-ios-limitations-safari-support-complete-guide)
- [addpipe.com — getUserMedia Video Constraints](https://blog.addpipe.com/getusermedia-video-constraints/)
- [OpenCV Q&A — Determining if overexposed/underexposed](https://answers.opencv.org/question/62479/determining-if-a-color-image-is-overexposed-or-underexposed/)
- [jscanify — JavaScript mobile document scanner](https://colonelparrot.github.io/jscanify/)
- [Dynamsoft — Mobile Document Scanning in HTML5](https://www.dynamsoft.com/codepool/mobile-document-scanning-in-html5.html)
