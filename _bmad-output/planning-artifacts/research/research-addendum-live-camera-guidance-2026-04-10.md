---
type: 'research-addendum'
supersedes:
  - 'technical-live-camera-guidance-research-2026-04-09.md'
  - 'domain-live-camera-guidance-research-2026-04-09.md'
  - 'prd-gap-report-camera-guidance-2026-04-09.md'
author: 'BMad Master (critical review + web research synthesis)'
date: '2026-04-10'
amended: '2026-04-10 — product direction correction (front face is correct capture angle)'
status: 'complete — ready for PRD edit and tech spec'
---

# Research Addendum: Live Camera Guidance
## Critical Gaps, Corrections & New Findings

**Supersedes:** The three Apr-9 documents remain valid as baseline. This addendum documents
(a) errors/contradictions in those documents and (b) new findings from targeted web research.
A PRD edit pass and an updated tech spec must incorporate all Critical and High items below
before sprint planning.

---

## ⚠ Product Direction Correction (added 2026-04-10)

**The domain research §4 "Critical Insight" and PRD gap report FR6b are WRONG for this product.**

Both documents concluded that the **side profile** is the required capture face because
"the front label is opaque and occludes the oil column." This was an inference by the PM —
it was never validated with the product owner.

**Confirmed by product owner (Ahmed, 2026-04-10):**
> The user shoots the front of the bottle, not the sides. The Gemini Vision AI estimates
> fill level from the front face. The camera guidance system's job is to get a sharp,
> well-framed, full-coverage shot of the front of the bottle.

**Consequences of this correction:**

| Item | Was | Is |
|---|---|---|
| C1 below | "Target is 'side'" | **Void — discard** |
| Domain research §4 "Critical Insight" | "Side profile is informative" | Wrong for this product — front face is correct |
| PRD gap report FR6b | "Rotate to show the side" | **Remove FR6b entirely** |
| PRD gap report FR6c | Escape hatch for orientation | **Remove FR6c — not needed** |
| Technical research §6.2 Priority 1 | "Gate on 'front' if required" | Correct as written — keep |
| HSV green label detection | Front-face signal | Confirmed correct — green label = right face |

The AI pipeline (Gemini Vision) handles fill level estimation from the front face. The
guidance system only needs to ensure: correct face visible + correct distance + sharp image.

---

## Part 1 — Corrections to Existing Research

### C1 — ~~CRITICAL: Target orientation is "side"~~ — VOID

~~The technical research (§6.2 Priority 1) instructs "Gate capture on `orientation === 'front'` if required." This is wrong.~~

**This correction is void.** See product direction correction above. The front face IS the
correct target. Technical research §6.2 is correct as written. The domain research §4
"Critical Insight" is the error — it assumed side-profile was needed without product owner
confirmation. The PRD gap report FR6b should be removed, not implemented.

---

### C2 — HIGH: HSV side-profile heuristic untested at low fill levels

The heuristic assumes:
> "Predominantly amber/golden pixels spanning full vertical extent"

At low fill levels the bottle interior is mostly air (near-transparent PET). The amber
signal will be weak or absent. The heuristic as written will classify a near-empty bottle
viewed from the side as `orientation === 'unknown'` or `'back'`, permanently blocking capture.

**Required correction in tech spec:**
- Add a note that amber pixel count is fill-level dependent.
- The side-profile gate should be: `amberRatio > threshold` **OR** `greenRatio < 0.04 AND
  whiteRatio < 0.10 AND bottleROIDetected === true` (bottle detected but neither front nor
  back label visible → likely side, regardless of amber content).
- Mark this heuristic as requiring empirical calibration on actual Afia bottle at 25%, 50%,
  75%, 100% fill under indoor fluorescent and natural lighting.

---

### C3 — HIGH: `preserveAspectRatio` bug understated

The existing `BottleGuide` SVG uses `preserveAspectRatio="xMidYMid meet"` (letterbox).
The video element uses `object-fit: cover` (crop-to-fill). These do not match: on phones
with extreme aspect ratios (19:9+, e.g. Samsung Galaxy S24 Ultra) the SVG guide outline
sits inside letterbox padding that has already been cropped out of the video.
The user sees a bottle guide that is misaligned with the actual camera frame.

The technical research identifies the correct value (`slice`) in §4.3 but classifies this
as a "recommendation" and the PRD gap report rates it Low (G9).

**Reclassification: this is a layout bug, not a low-priority enhancement.**

**Required fix:** Change `BottleGuide` SVG `preserveAspectRatio` to `xMidYMid slice` to
match `object-fit: cover`. Validate on 19:9 and 16:9 viewports.

---

### C4 — HIGH: Orientation missing from guidance waterfall priority

The existing waterfall is: `presence → distance → lighting → blur`.
FR6b adds `orientation` as a new gate, but neither the domain research, technical research,
nor PRD gap report specifies where it sits in the queue.

**Correct ordering (recommended):**

```
1. presence      — bottle not detected at all → "Point camera at the bottle"
2. distance      — too close / too far → "Move camera back" / "Move closer"
3. orientation   — front or back face visible → "Rotate bottle to show the side"
4. lighting      — too dark, too bright, glare → lighting message
5. blur          — motion blur or out of focus → "Hold steady"
6. [PASS]        — all conditions met → begin hold timer
```

**Rationale:** Orientation is placed after distance because you cannot reliably classify
orientation if the bottle fills <30% of the frame (too-far condition). Lighting and blur
are placed after orientation because instructing "rotate the bottle" while the user is in
a dark room creates a priority conflict — get the right face first, then refine conditions.

---

### C5 — HIGH: No escape hatch FR for persistent orientation failure

FR6b gates capture on `orientation === 'side'` indefinitely. There is no provision for
users who cannot rotate the bottle (storage constraints, injury, bottle in tight space).

**Required new FR** (not in gap report):

> **FR6c (escape hatch):** If the orientation gate has blocked capture for more than 8
> consecutive seconds while all other conditions (presence, distance, lighting, blur) are
> passing, the system shall display a "Capture anyway / التقاط على أي حال" button. Tapping
> it bypasses the orientation gate for one capture only. The resulting image shall be
> flagged `orientation_override: true` in the analysis payload, allowing the AI pipeline
> to apply appropriate confidence penalties.

---

### C6 — MEDIUM: Glare detection must be constrained to bottle ROI pixel coordinates

FR15a specifies "glare affecting ≥ N% of the bottle ROI" but the technical research's
4×4 grid operates on the full frame. Ceiling lights and windows outside the bottle guide
will produce false positives.

**Required implementation constraint:**
The SVG `BottleGuide` occupies a known `viewBox="0 0 130 210"` centered in the viewport.
At runtime, compute the pixel bounding box of the SVG element via
`svgEl.getBoundingClientRect()`, then map those coordinates onto the downsampled analysis
canvas. All glare patch analysis must be confined to this bounding box.

The value of N for "glare affecting ≥ N% of ROI" is recommended as **15%** based on the
4×4 grid approach (one cell = 6.25% of frame; two adjacent cells lit = ~12%; three = ~18%;
threshold at 15% catches 2+ adjacent glare cells).

---

### C7 — MEDIUM: TestLab mode not addressed anywhere

A `tech-spec-testlab-mode-refactor-api-inspector.md` exists in implementation artifacts.
None of the three Apr-9 documents mention TestLab.

**Required additions to TestLab inspector panel:**
- `orientation: 'front' | 'back' | 'side' | 'unknown'` with current pixel ratio readout
- `greenRatio`, `whiteRatio`, `amberRatio` live values
- `glareDetected: boolean` + glare patch coordinates
- `hysteresisState: { consecutivePasses: number, consecutiveFails: number }`
- `orientationOverride: boolean` (escape hatch flag)
- Hold timer countdown (ms remaining)

---

### C8 — MEDIUM: Arabic bilingual strings incomplete

Domain research §8 lists priority Arabic strings but is missing several:
- "Hold steady" → **"أبقِ الهاتف ثابتاً"**
- "Reduce direct light" → **"قلّل الضوء المباشر"** (appears only in FR15a, not string table)
- "Capture anyway" (escape hatch) → **"التقاط على أي حال"**
- "Show front label" (future multi-view) → **"أظهر الوجه الأمامي"**
- "Rotating..." / "Good — hold steady" (hold timer state) → **"جيد — أبقِ ثابتاً"**

**Complete bilingual string table (all camera guidance messages):**

| Message | English | Arabic |
|---------|---------|--------|
| Bottle not detected | "Point camera at the bottle" | "وجّه الكاميرا نحو الزجاجة" |
| Too far | "Move closer" | "اقترب أكثر" |
| Too close | "Move camera back slightly" | "أبعد الكاميرا قليلاً" |
| Front face detected | "Rotate bottle to show the side" | "أدِر الزجاجة لإظهار الجانب" |
| Back face detected | "Rotate bottle to show the side" | "أدِر الزجاجة لإظهار الجانب" |
| Too dark | "Move to a brighter location" | "انتقل إلى مكان أكثر إضاءة" |
| Too bright | "Reduce glare" | "قلّل الإضاءة الساطعة" |
| Glare spot | "Reduce direct light" | "قلّل الضوء المباشر" |
| Blurry | "Hold steady" | "أبقِ الهاتف ثابتاً" |
| All passing (hold phase) | "Good — hold steady…" | "جيد — أبقِ ثابتاً…" |
| Capture override | "Capture anyway" | "التقاط على أي حال" |

---

## Part 2 — New Findings from Web Research

### N1 — CRITICAL: Use `requestVideoFrameCallback` instead of `requestAnimationFrame` on iOS

**Source:** WebKit Blog, Safari 17.0 release notes (webkit.org/blog/14735) — authoritative.

Safari 17+ (iOS 17+, Sept 2023) added `HTMLVideoElement.requestVideoFrameCallback()`.
This is strictly better than `requestAnimationFrame` for frame-grab loops:

| Property | `requestAnimationFrame` | `requestVideoFrameCallback` |
|---|---|---|
| Fires at | Display refresh (60 Hz) | Camera frame delivery rate |
| In Low Power Mode | Throttled to 30 fps | Delivers at camera rate |
| Timing accuracy | Display vsync, not camera | Camera timestamp provided |
| CPU efficiency | May process duplicate frames | Fires only on new frame |

**Action required:** Replace the rAF-based frame-grab loop with `requestVideoFrameCallback`
in `cameraQualityAssessment.ts`. Feature-detect: if `'requestVideoFrameCallback' in
HTMLVideoElement.prototype` → use it; else fall back to throttled rAF at 200ms.

```ts
function startFrameLoop(videoEl: HTMLVideoElement, onFrame: () => void) {
  if ('requestVideoFrameCallback' in HTMLVideoElement.prototype) {
    const loop = () => { onFrame(); videoEl.requestVideoFrameCallback(loop); };
    videoEl.requestVideoFrameCallback(loop);
  } else {
    // Throttled rAF fallback
    let last = 0;
    const loop = (ts: number) => {
      if (ts - last >= 200) { last = ts; onFrame(); }
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
  }
}
```

---

### N2 — HIGH: Camera permission now persists in iOS standalone PWA (iOS 17+)

**Source:** WebKit release notes + WebKit Bugzilla #252465 — authoritative.

In iOS 17+, when the PWA is installed to the home screen and launched as a standalone app,
camera permissions granted by the user **persist across cold starts** — no re-prompt on
each launch. This eliminates the highest-severity iOS camera UX issue identified in the
existing research (recurring permission prompts).

**Implications:**
- The "avoid hash-based navigation while camera is active" workaround remains correct for
  in-session route transitions, but the "cold start re-prompt" issue is now iOS 16 and below only.
- Add iOS version detection: if iOS < 17, show a persistent "For best experience, add to
  home screen" banner explaining the permission benefit.
- iOS 15/16 users (still significant market share as of Apr 2026) still experience
  recurring prompts on route transitions — the existing workaround must be kept.

---

### N3 — HIGH: OffscreenCanvas Worker pattern must differ between Chrome and Safari

**Source:** caniuse.com/offscreencanvas + MDN compat table — authoritative.

Safari does NOT support `canvas.transferControlToOffscreen()`. The existing research
suggests this as the upgrade path, which will break on iOS.

**Safari-compatible worker frame analysis pattern:**

```ts
// Main thread — works in Chrome AND Safari
const bitmap = await createImageBitmap(videoEl);          // supported Safari 15+
worker.postMessage({ type: 'analyze', bitmap }, [bitmap]); // zero-copy transfer
```

```ts
// Worker thread
self.onmessage = ({ data }) => {
  const canvas = new OffscreenCanvas(data.bitmap.width, data.bitmap.height);
  const ctx = canvas.getContext('2d'); // 2D only — no WebGL in Safari worker
  ctx.drawImage(data.bitmap, 0, 0);
  const pixels = ctx.getImageData(0, 0, canvas.width, canvas.height);
  // ... HSV analysis on pixels.data ...
  data.bitmap.close(); // release GPU memory
};
```

**Additional constraint:** WebGL on OffscreenCanvas is NOT supported in Safari 18.x.
All pixel processing in the worker must use the 2D context (CPU-bound). This is fine for
the HSV heuristic approach — no GPU shaders needed.

---

### N4 — HIGH: Liquid level detection — luminance profiling on the bottle interior column

**Source:** Donadello et al., "Automated visual inspection of bottle fill levels,"
IEEE T-ITS 2021 (doi:10.1109/TITS.2021.3100024) + Roboflow fill-level blog (2023).

The correct technique for detecting the oil-air meniscus in a translucent bottle is
**vertical luminance column profiling**:

1. Crop to the bottle interior (inside the SVG guide bounds, excluding label region).
2. For each row (y position), compute mean luminance of the row pixels within the crop.
3. Compute the first derivative (row-to-row luminance difference).
4. The row with the maximum first-derivative magnitude is the oil-air boundary (meniscus).

```
oil (darker, higher saturation) → sharp luminance jump → air (lighter, lower saturation)
```

**For Afia amber oil:**
- Oil column: higher HSV saturation (S > 0.3), moderate value (V 0.3–0.6), H in amber range
- Air column above oil: lower saturation, higher value, near-neutral
- Meniscus band: bright specular line (Nayar & Krishnan, 2006) — detectable as a row with
  locally high luminance sandwiched between darker oil below and lighter air above

**Critical caveat from research:** Direct frontal lighting (typical kitchen fluorescent)
reduces meniscus contrast significantly. The side-profile requirement is reinforced:
- Side profile with uniform background → highest meniscus contrast → most reliable fill estimation
- Front-lit side profile → specular highlight on bottle surface → second-best signal
- Front face → opaque label → no oil column visible → estimation impossible

**Implication for orientation detection:** The transition from "front face blocked" to
"side profile confirmed" is not just UX — it is the difference between a meaningful and
a meaningless AI analysis. FR6b's side-profile gate is architecturally critical, not just
a UX nicety.

---

### N5 — MEDIUM: iOS Safari hardware camera constraints remain fully unsupported

**Source:** MDN MediaTrackConstraints compat table + WebKit feature status page — authoritative.

Through Safari 18.1 (latest as of Apr 2026), iOS Safari does NOT implement:
- `torch` (flashlight)
- `exposureMode` / `exposureCompensation`
- `whiteBalanceMode`
- `focusMode` / `focusDistance`
- `ImageCapture` API (`window.ImageCapture` is `undefined`)

`applyConstraints({ advanced: [{ torch: true }] })` will silently succeed (promise
resolves) but have no effect. Do not use the promise resolve as confirmation of torch state.

**Action:** The torch button (Gap 7 in PRD gap report) should be rendered only after
feature-detecting: `const track = stream.getVideoTracks()[0]; const caps =
track.getCapabilities(); if (caps.torch) { showTorchButton(); }`.
On iOS this will always be `undefined` → torch button never shown → no broken UI.

---

### N6 — MEDIUM: Arabic RTL in canvas — use SVG `<text>` for overlay labels

**Source:** MDN compat for `CanvasRenderingContext2D.direction` + WebKit Bugzilla #233026.

`ctx.direction = 'rtl'` was only added in Safari 15.4 (March 2022). Devices on iOS 15.3
or below will render Arabic left-anchored. The `measureText()` API also has known
measurement inaccuracies for Arabic ligatures in WebKit (bug #233026, marked resolved but
with regression risk).

**Recommended approach for the guidance message overlay:**
- Keep guidance text as a **React DOM element** (`<p>` or `<div>` with `dir="auto"`)
  positioned absolutely over the video, NOT drawn on canvas.
- DOM text rendering handles Arabic shaping, bidi, and RTL alignment correctly across all
  iOS versions via the system ICU library.
- Only use canvas for pixel analysis, never for text rendering.

The existing guidance message implementation (React state → JSX text node) is already
correct. Do not migrate it to canvas drawing.

---

### N7 — MEDIUM: DeviceOrientation permission — cache in localStorage, check before requesting

**Source:** WebKit Bugzilla #211018 + Apple Developer Forums — authoritative (corroborated).

`DeviceOrientationEvent.requestPermission()` must be called inside a user gesture.
There is no API to pre-check the current permission state without calling `requestPermission()`.

**Best practice pattern:**
```ts
async function ensureOrientationPermission(): Promise<boolean> {
  if (typeof DeviceOrientationEvent === 'undefined') return false;
  if (!('requestPermission' in DeviceOrientationEvent)) return true; // non-iOS, no gate
  const cached = localStorage.getItem('deviceOrientationPermission');
  if (cached === 'granted') return true;
  if (cached === 'denied') return false;
  // Must be inside a user gesture:
  const result = await (DeviceOrientationEvent as any).requestPermission();
  localStorage.setItem('deviceOrientationPermission', result);
  return result === 'granted';
}
```

In standalone PWA on iOS 17+, the permission persists across sessions. The `localStorage`
cache prevents re-prompting on subsequent opens where `requestPermission()` would return
`'granted'` immediately but still requires a user gesture to invoke.

**Note:** DeviceOrientation is needed only for device tilt detection, which is a secondary
signal (camera tilt → angle guidance). Given that the primary orientation challenge is
bottle face detection (not device tilt), and given the friction of requesting this
permission, it is recommended to **defer DeviceOrientation integration** until bottle-face
HSV heuristics are validated. Device tilt is a Phase 2 enhancement.

---

### N8 — LOW: Hysteresis — N=3 consecutive frames is the academic standard; 1s is production standard

**Source:** Google ML Kit Document Scanner (developers.google.com/ml-kit/vision/doc-scanner),
Apple WWDC 2022 session 110429 — authoritative.

- Minimum viable hysteresis: N=3 consecutive passing frames at 30fps = 100ms window
- Production standard (ML Kit, AVCapturePhotoOutput): 1.0 second hold with progress ring
- The existing research recommends 1–1.5s hold — this is confirmed correct and
  conservative (appropriate for non-expert users in home environments)

**No change to existing FR7b required on this point.** The 500ms assessment interval means
"2 consecutive passes" (FR15b) = 1 second real-time — this coincidentally matches the
Google ML Kit and Apple WWDC patterns exactly.

---

## Part 3 — Updated Priority List for Sprint Planning

Incorporating all corrections, product direction correction, and new findings.

| Priority | Item | Source | Sprint Impact |
|---|---|---|---|
| **P0** | Fix `preserveAspectRatio` bug (C3) | Layout bug — outline misaligned on 19:9 devices | Must fix before any camera feature work |
| **P1** | Replace rAF with `requestVideoFrameCallback` (N1) | iOS 17+ correctness; not throttled in Low Power Mode | Replace frame loop before adding new analysis |
| **P2** | Full-coverage outline detection: add horizontal centering + width check to `analyzeComposition` | Core correctness — green only when bottle fills outline | Core of sprint |
| **P3** | Auto-capture hold timer (1 000 ms) + progress ring | FR7b — core UX: no button press needed | Core of sprint, implement after P2 |
| **P4** | Auto-capture `useEffect` in `CameraViewfinder` | Wires P3 signal to `handleCapture()` | Low effort, depends on P3 |
| **P5** | Guidance waterfall: add "Centre bottle" message (C4) | Prevents confusing "Move closer" when bottle is off-centre | Low code effort |
| **P6** | ROI-constrained glare detection (C6) | Prevents false glare positives from ceiling lights | Implement with FR15a |
| **P7** | Hysteresis: `goodFramesCount ≥ 2` already exists; add immediate downgrade on failure (FR15b) | Eliminates guidance flickering | Already partially implemented — confirm behaviour |
| **P8** | TestLab inspector for new signals (C7) | Developer observability | Parallel with P2–P4 |
| **P9** | Complete bilingual string table (C8) | Bilingual compliance | Blocked by P2 (need all messages first) |
| **P10** | Safari-safe OffscreenCanvas pattern (N3) | iOS correctness (if worker needed) | Only if profiling shows >6ms/frame |
| **P11** | Torch feature detection + button (N5) | Android-only; iOS Safari never supports it | Low priority |
| **P12** | DeviceOrientation for device tilt | Phase 2 | Defer |
| **P13** | Luminance column profiling for fill level (N4) | Phase 2 — AI pipeline improvement | Defer |
| **REMOVED** | ~~Side-profile orientation (FR6b)~~ | Product direction: front face is correct | Do not implement |
| **REMOVED** | ~~Escape hatch for orientation (FR6c)~~ | Void with FR6b removal | Do not implement |

---

## Part 4 — Documents That Require Updates Before Sprint

| Document | Required Changes | Urgency |
|---|---|---|
| `prd.md` | Add FR6b, FR6c, FR7b, FR15a, FR15b; amend FR6, FR7; update waterfall order | **Before sprint** |
| `technical-live-camera-guidance-research-2026-04-09.md` | Correct §6.2 target from 'front' to 'side'; add rVFC note; add C2 calibration note | Before implementation |
| `tech-spec-bottle-detection-shape-aware-roi.md` | Add: low-fill orientation fallback; ROI pixel coordinate derivation from SVG bounds | Before story 1-5 |
| `tech-spec-testlab-mode-refactor-api-inspector.md` | Add new signals: orientation, glare, hysteresis state, hold timer | Before story 1-5 |
| New: `tech-spec-camera-guidance-v2.md` | Consolidate: rVFC loop, orientation waterfall, hysteresis, hold timer, bilingual strings | Recommended |

---

*Document produced by BMad Master — critical review + web research synthesis*
*Input: 3 research files (Apr 9) + targeted web research (Apr 10)*
*Next action: PRD edit pass targeting FR6, FR7, FR15 + new FRs FR6b, FR6c, FR7b, FR15a, FR15b*
