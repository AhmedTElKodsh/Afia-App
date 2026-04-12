---
type: 'tech-spec'
title: 'Camera Auto-Capture + Full-Coverage Outline Detection'
status: 'in-progress'
date: '2026-04-10'
author: 'BMad Master'
affects:
  - 'src/utils/cameraQualityAssessment.ts'
  - 'src/hooks/useCameraGuidance.ts'
  - 'src/components/CameraViewfinder.tsx'
  - 'src/components/CameraViewfinder.css'
priority: 'P0 — blocks sprint kick-off'
---

# Tech Spec: Camera Auto-Capture + Full-Coverage Outline Detection

## 1. What This Spec Defines

Two tightly coupled features:

1. **Full-coverage outline detection** — the bottle guide outline turns **green** only when
   the Afia 1.5L bottle's entire silhouette exactly fills the SVG guide (right face, right
   distance, centered, upright). Not partially — *entirely*.

2. **Auto-capture** — once the outline is green for a continuous 1 000 ms hold, the camera
   fires automatically. The user never taps the shutter button. A circular progress ring
   animates during the hold period so the user knows a capture is imminent.

**Confirmed product direction (2026-04-10):**
- The user points the camera at the **front of the bottle** (green label facing camera).
- The **bottle is stationary**; the user moves the camera until the outline aligns.
- Once alignment is confirmed → auto-capture → no button press required.

---

## 2. Current Codebase State

| File | Relevant existing code | Gap |
|---|---|---|
| `cameraQualityAssessment.ts` | `analyzeComposition()`: HSV green + amber detection; vertical span → distance | No horizontal centering; no fill-ratio check against outline bounds; no coverage score |
| `useCameraGuidance.ts` | `isReady` after 2 consecutive `isGoodQuality` frames; rAF loop | No auto-capture trigger; no hold timer; no progress ring signal |
| `CameraViewfinder.tsx` | `BottleGuide` SVG with cap/body/handle; capture button disabled when not ready | No auto-capture; no progress ring; capture still requires button tap |

The `isReady` state already exists — **auto-capture just needs to listen to it and fire.**

---

## 3. SVG Outline — Accuracy Requirement

The current `BottleGuide` SVG (`viewBox="0 0 130 210"`) has:
- Cap: `<rect x="47" y="2" width="36" height="11" rx="4" />`
- Body + shoulder: cubic Bézier, handle arc
- Dashed label region, midline guide

**Fix first (bug — see addendum C3):**
Change `viewBox`-level `preserveAspectRatio` to `xMidYMid slice` to match the video
element's `object-fit: cover`. Currently the SVG may letterbox on 19:9 devices, causing
the outline to sit inside letterboxed padding that is cropped from the video.

```tsx
// CameraViewfinder.tsx — BottleGuide svg element
// BEFORE (implicit default):
<svg className="bottle-guide-svg" viewBox="0 0 130 210" ...>

// AFTER:
<svg
  className="bottle-guide-svg"
  viewBox="0 0 130 210"
  preserveAspectRatio="xMidYMid slice"   // ← matches object-fit: cover
  ...
>
```

**Shape validation:** The existing hand-authored Bézier path is a reasonable approximation
of the Afia 1.5L front profile. Exact pixel-perfect accuracy is not required for the
detection algorithm (which works on HSV colour regions, not edge matching). The guide
serves as a *framing target*, not a silhouette matcher. Users understand "fill the outline"
intuitively — precision of ±5 px on a 130×210 viewBox is sufficient.

---

## 4. Full-Coverage Detection — Algorithm

### 4.1 What "outline covered" means

The outline is green when **all four** conditions pass simultaneously:

| Condition | Signal | Threshold |
|---|---|---|
| **Bottle detected** | Green label pixels present in centre region | `matchRatio ≥ 0.04` (already implemented) |
| **Vertical fill** | Bottle spans the expected height in frame | `spanFraction 0.55–0.90` of crop height |
| **Horizontal centering** | Bottle centroid within ±15% of frame centre | `|centroidX - 0.5| ≤ 0.15` |
| **Width fill** | Bottle spans expected width (not just a sliver) | `widthFraction ≥ 0.35` of crop width |

All four must be `true` for `distance === 'good'`. Any single failure → amber or red.

### 4.2 Changes to `analyzeComposition()`

The current function measures only vertical span. Add horizontal span and centroid:

```ts
// Additional measurements from the pixel loop in analyzeComposition():
let minCol = W;
let maxCol = -1;
let colSum = 0;       // for centroid X
let rowSum = 0;       // for centroid Y (already implicitly tracked via minRow/maxRow)

for (let y = 0; y < H; y++) {
  for (let x = 0; x < W; x++) {
    // ...existing HSV match...
    if (isGreen || isAmber) {
      matchCount++;
      if (y < minRow) minRow = y;
      if (y > maxRow) maxRow = y;
      if (x < minCol) minCol = x;   // NEW
      if (x > maxCol) maxCol = x;   // NEW
      colSum += x;                   // NEW
    }
  }
}

// After the loop:
const spanFraction  = (maxRow - minRow) / H;
const widthFraction = (maxCol - minCol) / W;             // NEW
const centroidX     = matchCount > 0 ? (colSum / matchCount) / W : 0.5;  // NEW (0–1)
const isCentered    = Math.abs(centroidX - 0.5) <= 0.15; // NEW — within ±15% of centre
```

**Distance/coverage classification (updated):**

```ts
// Must pass ALL four gates for 'good':
const verticalOk  = spanFraction  >= 0.55 && spanFraction  <= 0.90;
const horizontalOk = widthFraction >= 0.35;
const centeredOk  = isCentered;

let distance: 'too-close' | 'too-far' | 'good' | 'not-detected';

if (!bottleDetected || spanFraction < 0.30) {
  distance = 'not-detected';
} else if (spanFraction < 0.55 || widthFraction < 0.20) {
  distance = 'too-far';        // bottle too small → move closer
} else if (spanFraction > 0.90) {
  distance = 'too-close';      // bottle too large → back up
} else if (!centeredOk) {
  distance = 'too-far';        // off-centre, use same amber state with different message
} else {
  distance = 'good';           // all gates pass → green outline
}

// Expose centeredOk for the guidance message generator to differentiate
```

**Add `isCentered` to `CompositionAssessment`:**

```ts
export interface CompositionAssessment {
  isCentered: boolean;   // now actually computed
  isLevel: boolean;
  distance: 'too-close' | 'too-far' | 'good' | 'not-detected';
  visibility: number;
  bottleDetected: boolean;
  widthFraction: number; // NEW — expose for TestLab
  centroidX: number;     // NEW — expose for TestLab
}
```

### 4.3 Guidance message update

Add a new amber state for "off-centre" in `generateGuidanceMessage()`:

```ts
// After the too-close / too-far checks, before lighting:
if (composition.distance === 'too-far' && !composition.isCentered) {
  // Distinguish: off-centre vs. genuinely too far
  // Both map to 'too-far' distance, but different messages
  if (composition.visibility > 30) {
    // Big enough but off-centre
    return { message: 'Centre the bottle in the guide', type: 'warning' };
  }
}
```

**Full updated message priority (guidance waterfall):**

```
1. not-detected      → "Point camera at the bottle"          (error / red)
2. too-far (small)   → "Move closer to the bottle"           (warning / amber)
3. too-close         → "Move camera back slightly"           (warning / amber)
4. too-far (off-ctr) → "Centre the bottle in the guide"      (warning / amber)
5. too-dark          → "Move to a brighter location"         (error / amber)
6. too-bright        → "Reduce glare — avoid direct light"   (warning / amber)
7. low-contrast      → "Improve lighting contrast"           (warning / amber)
8. blur < 30         → "Hold steady — image is blurry"       (error / amber)
9. blur < 45         → "Hold still…"                         (warning / amber)
10. [all pass]       → "Perfect! Hold steady…"               (success / green)
```

---

## 5. Auto-Capture — Specification

### 5.1 State machine

```
SEARCHING → (distance=good, lighting=good, blur≥45) → HOLDING
HOLDING   → (hold for 1 000 ms uninterrupted) → FIRED
HOLDING   → (condition fails for > 150 ms) → SEARCHING   [timer resets]
HOLDING   → (condition fails for ≤ 150 ms) → HOLDING     [grace period — timer continues]
FIRED     → (capture completes) → (component unmounts or resets)
```

**Hold duration:** 1 000 ms is the baseline. Test 750 ms and 1 500 ms variants against real
users in a kitchen environment before locking — kitchen conditions (one-handed grip, noise,
distractions) may make 1 000 ms too short, producing blurry captures. A bad capture sent to
Gemini produces a wrong fill estimate; a 500 ms longer hold is a better trade-off than a
wrong result. Expose `HOLD_DURATION_MS` as a named constant so it is trivial to adjust.

**Grace period (Sally/Winston):** Minor hand trembles cause momentary condition failures
lasting < 150 ms. Without a grace period these reset the hold timer, causing the ring to
flicker and frustrating users. A `lastFailRef` absorbs these micro-failures transparently.

### 5.2 Changes to `useCameraGuidance.ts`

Add hold timer tracking to the hook state:

```ts
// New fields in CameraGuidanceState:
export interface CameraGuidanceState {
  // ... existing fields ...
  holdProgress: number;   // 0–1, fraction of hold timer elapsed
  isHolding: boolean;     // true while in HOLDING state
}
```

Add hold timer logic inside the assessment callback:

```ts
// In the setState() update block inside analyzeFrame():
const HOLD_DURATION_MS = 1000; // named constant — easy to adjust for A/B testing

// Refs needed (add to hook):
// holdStartRef  = useRef<number | null>(null);
// lastFailRef   = useRef<number | null>(null);  ← NEW: grace period tracker

const GRACE_PERIOD_MS = 150; // Sally/Winston: absorb micro-trembles < 150 ms

if (isGood) {
  lastFailRef.current = null; // clear failure tracker on passing frame

  if (!holdStartRef.current) {
    holdStartRef.current = Date.now(); // start hold timer on first good frame
  }
  const elapsed = Date.now() - holdStartRef.current;
  const holdProgress = Math.min(1, elapsed / HOLD_DURATION_MS);
  const isHolding = holdProgress < 1;
  const shouldFire = holdProgress >= 1;

  return {
    ...prev,
    assessment,
    isReady: shouldFire || prev.isReady, // latch true on fire
    isHolding,
    holdProgress,
    goodFramesCount,
    qualityTrend,
    isActive: true,
  };
} else {
  // Grace period: only reset hold timer if failure persists beyond GRACE_PERIOD_MS.
  // This prevents hand-trembles (< 150 ms flickers) from resetting the ring.
  if (!lastFailRef.current) {
    lastFailRef.current = Date.now(); // record first failure moment
  }

  const failDuration = Date.now() - lastFailRef.current;
  if (failDuration <= GRACE_PERIOD_MS) {
    // Still within grace window — hold timer continues, ring does not reset.
    // Return prev state unchanged so holdProgress keeps its value.
    return { ...prev, assessment, isActive: true };
  }

  // Failure sustained beyond grace period — full reset.
  holdStartRef.current = null;
  lastFailRef.current = null;
  return {
    ...prev,
    assessment,
    isReady: false,
    isHolding: false,
    holdProgress: 0,
    goodFramesCount: 0,
    qualityTrend,
    isActive: true,
  };
}
```

**Signal to fire:** The hook returns `isReady: true` when `holdProgress >= 1`. The
`CameraViewfinder` component watches `isReady` and calls `handleCapture` once.

### 5.3 Changes to `CameraViewfinder.tsx`

**Auto-capture effect — add inside the component:**

```tsx
const hasFiredRef = useRef(false);

useEffect(() => {
  if (
    guidance.state.isReady &&
    !hasFiredRef.current &&
    cameraState === 'active' &&
    videoRef.current &&     // Amelia: guard — refs may be null on rapid re-render
    canvasRef.current       // Amelia: guard — silent failure without this
  ) {
    hasFiredRef.current = true;
    // Multi-sensory "lock" confirmation before capture fires
    if (navigator.vibrate) navigator.vibrate([30, 40, 80]);
    handleCapture();
  }
}, [guidance.state.isReady, cameraState, handleCapture]);
```

**Guard:** `hasFiredRef` prevents double-firing if the component re-renders between the
`isReady` transition and the capture call. The `videoRef.current && canvasRef.current`
guards prevent a silent no-op if either ref is null during a brief re-render cycle —
without them, `handleCapture` returns early without error, losing the capture entirely.
Reset `hasFiredRef.current = false` on `guidance.reset()`.

**Shutter flash (Sally):** Immediately after `handleCapture()` fires, trigger a one-frame
white flash to give unmistakable visual confirmation that the photo was taken:

```tsx
// After handleCapture() call in the useEffect above:
setShutterFlash(true);
setTimeout(() => setShutterFlash(false), 200);
```

```tsx
// In the JSX, inside the guidance overlay:
{shutterFlash && (
  <div
    className="shutter-flash"
    aria-hidden="true"
  />
)}
```

```css
/* CameraViewfinder.css */
.shutter-flash {
  position: absolute;
  inset: 0;
  background: white;
  opacity: 0;
  animation: shutter-flash 200ms ease-out forwards;
  pointer-events: none;
  z-index: 100;
}
@keyframes shutter-flash {
  0%   { opacity: 0.9; }
  100% { opacity: 0; }
}
```

The flash communicates capture more reliably than haptic alone — especially important for
users in loud environments (kitchen noise, extractor fans) who may not feel a vibration.

### 5.4 Progress ring — visual spec

Show a circular progress ring **around the BottleGuide** during the HOLDING state.
The ring fills clockwise from 0 to 100% over the 1 000 ms hold.

**SVG implementation inside `BottleGuide`:**

```tsx
// Add at the bottom of the BottleGuide SVG, after all existing paths.
// Two rings: a static backing ring (always visible when holding) +
// a dynamic fill ring (progresses 0→100%). John/Sally: ring must be unmissable.
{isHolding && (
  <>
    {/* Backing ring — semi-transparent white so fill ring is legible on any background */}
    <circle
      cx="65" cy="105"
      r="96"
      fill="none"
      stroke="rgba(255,255,255,0.20)"
      strokeWidth="6"           // John/Sally: strokeWidth ≥ 6 for visibility
      strokeLinecap="round"
    />
    {/* Fill ring — animates clockwise from top as holdProgress goes 0→1 */}
    <circle
      cx="65" cy="105"
      r="96"
      fill="none"
      stroke="#10b981"
      strokeWidth="6"           // matches backing ring width
      strokeLinecap="round"
      strokeDasharray={`${holdProgress * 603} 603`}  // 2π×96 ≈ 603
      transform="rotate(-90 65 105)"                  // start from 12 o'clock
      opacity="0.95"
    />
  </>
)}
```

`holdProgress` (0–1) and `isHolding` are passed as props from `CameraViewfinder` via
`guidance.state.holdProgress` and `guidance.state.isHolding`.

**Text countdown:** Do not show a numeric countdown — it creates anxiety. The filling ring
alone communicates progress clearly. The shutter flash (§5.3) confirms completion.

### 5.5 Capture button — keep but deprioritise

The manual capture button remains in the DOM as an escape hatch for users who cannot
get the auto-capture to fire (unusual lighting conditions, etc.). It should:
- Remain disabled while `!isReady && enableLiveGuidance` (existing behaviour)
- Become visually secondary — smaller, labelled "Capture manually"
- **Not** be removed — it is the user's override escape hatch

---

## 6. Performance — Pipeline Timing Budget

**Winston:** Wrap each assessment phase with `performance.now()` in development builds.
Log a warning when total pipeline time exceeds 6 ms — this is the budget before main-thread
jank becomes noticeable at 60 fps.

```ts
// In assessImageQuality() — dev-only timing guard:
if (import.meta.env.DEV) {
  const t0 = performance.now();
  const result = _runAssessment(imageSource, options);
  const elapsed = performance.now() - t0;
  if (elapsed > 6) {
    console.warn(`[camera] assessment took ${elapsed.toFixed(1)} ms — consider throttling`);
  }
  return result;
}
```

**Blur throttle — if >6 ms is measured on real devices:**
Blur changes slowly relative to composition. Run blur detection every **other** frame;
cache the last result. Composition (distance, centroid, width) must run every frame since
it responds to camera movement.

```ts
// In analyzeFrame() inside useCameraGuidance:
frameCountRef.current = (frameCountRef.current ?? 0) + 1;
const blurScore = frameCountRef.current % 2 === 0
  ? detectBlur(video)           // compute on even frames
  : lastBlurScoreRef.current;   // reuse on odd frames
lastBlurScoreRef.current = blurScore;
```

This halves blur computation cost with no perceptible quality loss — blur threshold
transitions happen over hundreds of milliseconds, far slower than a single skipped frame.

---

## 7. Frame Loop — Upgrade to `requestVideoFrameCallback`

The current `useCameraGuidance` hook uses `requestAnimationFrame` for the analysis loop.
Per web research finding N1, `requestVideoFrameCallback` (Safari 17+) fires at camera
frame delivery rate and is not throttled in Low Power Mode.

**Replace in `useCameraGuidance.ts`:**

```ts
// Upgrade startGuidance() to prefer requestVideoFrameCallback:
const startFrameLoop = (videoEl: HTMLVideoElement, cb: () => void) => {
  if ('requestVideoFrameCallback' in HTMLVideoElement.prototype) {
    const loop = () => { cb(); (videoEl as any).requestVideoFrameCallback(loop); };
    (videoEl as any).requestVideoFrameCallback(loop);
    return () => { /* rVFC has no explicit cancel — unmount stops it via videoRef.current = null */ };
  } else {
    // Fallback: throttled rAF at 200ms
    let last = 0;
    let rafId: number;
    const loop = (ts: number) => {
      if (ts - last >= 200) { last = ts; cb(); }
      rafId = requestAnimationFrame(loop);
    };
    rafId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafId);
  }
};
```

Store the cleanup function in a ref and call it in `stopGuidance()`.

---

## 8. Bilingual Guidance Strings

All guidance messages must exist in both EN and AR. Add these keys to the i18n translation
files (`en.json`, `ar.json`):

| Key | English | Arabic |
|---|---|---|
| `camera.pointAtBottle` | "Point camera at the bottle" | "وجّه الكاميرا نحو الزجاجة" |
| `camera.moveCloser` | "Move closer to the bottle" | "اقترب من الزجاجة" |
| `camera.moveBack` | "Move camera back slightly" | "أبعد الكاميرا قليلاً" |
| `camera.centreBottle` | "Centre the bottle in the guide" | "ضع الزجاجة في منتصف الإطار" |
| `camera.tooBright` | "Reduce glare — avoid direct light" | "قلّل الإضاءة الساطعة" |
| `camera.tooDark` | "Move to a brighter location" | "انتقل إلى مكان أكثر إضاءة" |
| `camera.holdSteady` | "Hold steady — image is blurry" | "أبقِ الهاتف ثابتاً" |
| `camera.holdStill` | "Hold still…" | "لا تتحرك…" |
| `camera.perfect` | "Perfect! Hold steady…" | "ممتاز! أبقِ ثابتاً…" |
| `camera.ready` | "Ready" | "جاهز" |
| `camera.alignBottle` | "Align bottle with guide" | "حاذِ الزجاجة مع الإطار" |

`generateGuidanceMessage()` currently returns raw English strings. Replace with
i18n key lookups: accept a `t` function as a parameter, or return keys and let
`CameraViewfinder` translate.

**Recommended:** Return i18n keys from `generateGuidanceMessage`, translate in the
component. This keeps the utility function dependency-free.

---

## 9. TestLab Inspector Additions

Add these fields to the TestLab inspector panel
(ref: `tech-spec-testlab-mode-refactor-api-inspector.md`):

| Signal | Type | Description |
|---|---|---|
| `widthFraction` | `number` | Detected bottle width as fraction of crop (0–1) |
| `centroidX` | `number` | Horizontal centroid of bottle pixels (0=left, 1=right) |
| `spanFraction` | `number` | Vertical span as fraction of crop (0–1) |
| `holdProgress` | `number` | Hold timer progress (0–1) |
| `isHolding` | `boolean` | Whether hold timer is active |
| `hasFired` | `boolean` | Whether auto-capture has fired |

---

## 10. Acceptance Criteria

1. **Outline turns green** only when: bottle detected + vertical span 55–90% + width ≥ 35%
   of crop + bottle centroid within ±15% of horizontal centre + lighting acceptable + blur ≥ 45.
2. **Outline is amber** for any sub-optimal condition (wrong distance, off-centre, lighting,
   blur).
3. **Outline is red** when no bottle detected.
4. **Progress ring** has two SVG circles (backing + fill), `strokeWidth="6"`, visible on
   any background colour.
5. **Ring animates** from 0% to 100% clockwise from 12 o'clock over `HOLD_DURATION_MS`.
6. **Grace period:** ring does not reset on condition failures ≤ 150 ms duration.
7. **Ring resets** to 0% only when a condition fails for > 150 ms sustained.
8. **Auto-capture fires** at 100% ring completion without any user tap.
9. **Shutter flash:** white fullscreen overlay animates opacity 0.9→0 over 200 ms immediately
   on capture, giving unmistakable visual confirmation.
10. **No double-capture:** `hasFiredRef` + `videoRef.current && canvasRef.current` guards
    prevent re-firing or silent no-ops.
11. **Manual capture button** remains visible and functional as an escape hatch.
12. **All guidance messages** displayed bilingually in EN and AR.
13. **rVFC upgrade** — frame loop uses `requestVideoFrameCallback` on Safari 17+ / iOS 17+,
    falls back to throttled rAF at 200 ms.
14. **Performance:** `performance.now()` timing warns in dev console when pipeline > 6 ms;
    blur detection throttled to every other frame if needed.

---

## 11. Files to Change (summary)

| File | Change |
|---|---|
| `src/utils/cameraQualityAssessment.ts` | Add `widthFraction`, `centroidX` to `analyzeComposition()` and `CompositionAssessment`; update distance classification; add "centre bottle" guidance message; add `performance.now()` timing in dev mode; throttle blur every other frame |
| `src/hooks/useCameraGuidance.ts` | Add `holdProgress`, `isHolding` to state; add `holdStartRef`, `lastFailRef` (grace period), `frameCountRef`, `lastBlurScoreRef`; upgrade frame loop to rVFC with rAF fallback; expose `HOLD_DURATION_MS` as named constant |
| `src/components/CameraViewfinder.tsx` | Add auto-capture `useEffect` with `videoRef`/`canvasRef` guards; add `hasFiredRef`; add `shutterFlash` state + overlay div; pass `holdProgress`/`isHolding` to `BottleGuide`; add dual progress ring SVG (backing + fill, `strokeWidth="6"`); fix `preserveAspectRatio="xMidYMid slice"`; deprioritise manual capture button |
| `src/components/CameraViewfinder.css` | Add `.shutter-flash` + `@keyframes shutter-flash`; style secondary capture button |
| `public/locales/en/translation.json` | Add all camera guidance i18n keys |
| `public/locales/ar/translation.json` | Add Arabic equivalents |

---

*Spec produced by BMad Master — 2026-04-10*
*Implements: FR7b (auto-capture hold), amended FR6 (full coverage detection), FR15b (hysteresis via goodFramesCount)*
*Does NOT implement: FR6b/FR6c (side-profile orientation) — removed per product direction correction*

---

## Review Findings — 2026-04-12

### Decision-Needed
- [ ] [Review][Decision] D1: Worker rename `afia-worker` → `afia-app` may orphan live deployment — confirm rename is intentional and KV bindings/secrets have been migrated before deploying [`worker/wrangler.toml`]
- [ ] [Review][Decision] D2: `isCentered` returned but never influences `distance` or hint — spec §4.2 requires off-center to yield `distance='too-far'` and show `camera.centreBottle` hint; currently a centred bottle and an off-center bottle both show green at the same span threshold
- [ ] [Review][Decision] D3: Spec 1 (shape-aware ROI) Tasks 2–5 absent from diff despite spec.status='completed' — ROI narrowing (30–70% x, 10–90% y), aspect-ratio gate, neck-sparsity gate, minCol/maxCol/rowCounts tracking, widthFraction/centroidX fields, and unit tests are all missing; likely lost in stash incident — re-implement or re-mark spec as in-progress
- [ ] [Review][Decision] D4: Verify whether i18n keys `pointAtBottle`, `tooBright`, `tooDark`, `holdSteady`, `holdStill`, `perfect`, `ready` already exist in translation files; if not, they are required by Spec 2 §8 AC12

### Patches
- [ ] [Review][Patch] P1: Division-by-zero risk — `centreX = totalMatchX / matchCount` has no guard for `matchCount === 0` [`src/utils/cameraQualityAssessment.ts`]
- [ ] [Review][Patch] P2: `not-detected` hint renders when `isReady === true` — old `!isReady &&` guard removed; should guard at minimum the not-detected hint branch [`src/components/CameraViewfinder.tsx`]
- [ ] [Review][Patch] P3: `parseLLMResponse` regex too narrow — only strips ` ```json ` / empty tag; non-json language tags (e.g. ` ```javascript`) and empty-after-stripping not handled [`worker/src/providers/parseLLMResponse.ts`]
- [ ] [Review][Patch] P4: Empty B2/Upstash vars committed as `[vars]` — should use `.dev.vars` or be clearly commented as requiring env-specific setup before deploy [`worker/wrangler.toml`]
- [ ] [Review][Patch] P5: `wrangler secret put` setup instructions deleted — new contributors have no record of required secrets [`worker/wrangler.toml`]
- [ ] [Review][Patch] P6: `Math.round(H * 0.30)` should be a named constant (e.g. `BOTTLE_DETECT_MIN_SPAN_PX = 30`) [`src/utils/cameraQualityAssessment.ts`]
- [ ] [Review][Patch] P7: `isCentered` threshold is `W * 0.25` (25%) — spec §4.2 AC1 requires `≤ 0.15` (15%) [`src/utils/cameraQualityAssessment.ts`]
- [ ] [Review][Patch] P8: `too-far` lower span threshold is `0.45` — spec §4.2 AC1 requires `0.55`; frames at 45–54% span incorrectly show green [`src/utils/cameraQualityAssessment.ts`]
- [ ] [Review][Patch] P9: i18n text values don't match spec §8 — EN "Move closer" → "Move closer to the bottle"; EN "Move back" → "Move camera back slightly"; AR "اقترب أكثر" → "اقترب من الزجاجة"; AR "ابتعد قليلاً" → "أبعد الكاميرا قليلاً" [`src/i18n/locales/*/translation.json`]
- [ ] [Review][Patch] P10: `preserveAspectRatio="xMidYMid slice"` not added to BottleGuide SVG — spec §3 requires this to prevent letterboxing on 19:9 devices [`src/components/CameraViewfinder.tsx`]
- [ ] [Review][Patch] P11: `camera.centreBottle` EN/AR keys missing from translation files (needed once D2 is resolved) [`src/i18n/locales/*/translation.json`]

### Deferred
- [x] [Review][Defer] W1: `isLevel` hardcoded to `true` [`src/utils/cameraQualityAssessment.ts`] — deferred, pre-existing; gyroscope integration out of scope
- [x] [Review][Defer] W2: `thinkingBudget: 0` and `v1beta` endpoint lack actionable tracking tickets [`worker/src/providers/gemini.ts`] — deferred, pre-existing infrastructure debt acknowledged in comments
- [x] [Review][Defer] W3: Missing translation keys for locales beyond EN/AR — deferred, pre-existing scope limitation
- [x] [Review][Defer] W4: Auto-capture, progress ring, shutter flash (Spec 2 §5) not implemented — deferred, Spec 2 is 'ready-for-implementation'; not part of this diff's scope

---

### Review Findings (Round 2 — 2026-04-12)

3 layers: Blind Hunter · Edge Case Hunter · Acceptance Auditor

#### Decision-Needed
- [x] [Review][Decision] D1: `widthFraction` gate threshold — DEFERRED (C): spec §4.1/§4.2 inconsistent; keep 0.20 with TODO comment; tune after device testing [`src/utils/cameraQualityAssessment.ts`]
- [x] [Review][Decision] D2: `generateGuidanceMessage()` not updated — RESOLVED (A): implement §4.3 isCentered branching now → becomes P7 [`src/utils/cameraQualityAssessment.ts`]

#### Patches
- [x] [Review][Patch] P1: Off-by-one in `bodyTotal` slice — fixed: `rowCounts.slice(maxRow - bodyRows, maxRow + 1)` [`src/utils/cameraQualityAssessment.ts`]
- [x] [Review][Patch] P2: `isCentered: true` hardcoded on gate returns — fixed: centroidX/isCentered computed before Gate 2, real value used in all early returns [`src/utils/cameraQualityAssessment.ts`]
- [x] [Review][Patch] P3: `isCentered ?? false` default — fixed: `?? true` [`src/components/CameraViewfinder.tsx`]
- [x] [Review][Patch] P4: `parseLLMResponse` fence regex — fixed: fenceMatch extraction handles prose preamble + double-fence [`worker/src/providers/parseLLMResponse.ts`]
- [x] [Review][Patch] P5: `spanFraction < 0.30 → not-detected` missing — fixed: check added after shape gates with TODO for threshold tuning [`src/utils/cameraQualityAssessment.ts`]
- [x] [Review][Patch] P6: `alignBottle` text wrong — fixed: EN/AR updated to "Point camera at the bottle" [`src/i18n/locales/*/translation.json`]

#### Deferred
- [x] [Review][Defer] W5: thin bbox at BBOX_MIN_HEIGHT=8 can produce bodyDensity=0 due to body zone covering only 4/8 rows — inherent threshold tradeoff, acceptable given gate ordering
- [x] [Review][Defer] W6: `getProcessingCanvas()` dirty canvas if future code skips `canvas.width = W` reset — pre-existing pattern; canvas is reset at start of each call
- [x] [Review][Defer] W7: empty-string B2/Upstash vars in `wrangler.toml` committed to version control — intentional; .dev.vars pattern documented in comments
- [x] [Review][Defer] W8: `centroidX: 0.5` sentinel on not-detected paths — callers check `bottleDetected` first; acceptable
- [x] [Review][Defer] W9: `parseLLMResponse` throws generic `Error` for empty-after-fence case — typed error class would improve caller discrimination; nice-to-have
- [x] [Review][Defer] W10: `.bottle-guide-hint` `bottom: 100%` relies on ancestor `position: relative` — pre-existing CSS architecture; `.bottle-guide-wrapper` already has non-static positioning
