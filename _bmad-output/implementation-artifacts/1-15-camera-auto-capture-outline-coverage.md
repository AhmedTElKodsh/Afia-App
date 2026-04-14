# Story 1.15: Camera Auto-Capture + Full-Coverage Outline Detection

Status: in-progress

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a user scanning an Afia 1.5L oil bottle,
I want the camera to automatically capture the photo once the bottle fills the guide outline,
so that I get a sharp, well-framed shot without having to tap a button.

## Acceptance Criteria

1. **Outline green only on full alignment** — The `BottleGuide` outline is green only when ALL four conditions pass simultaneously: bottle detected (`matchRatio ≥ 0.04`), vertical span 55–90% of crop height, bottle width ≥ 35% of crop width, and bottle centroid within ±15% of horizontal centre.
2. **Outline amber on sub-optimal** — Any single condition failure (wrong distance, off-centre, bad lighting, blur) keeps the outline amber.
3. **Outline red on no-detection** — Outline is red when no bottle is detected at all.
4. **Progress ring visible during hold** — When all alignment conditions pass, a circular SVG ring (`cx=65 cy=105 r=96`) animates clockwise from 0% to 100% over `HOLD_DURATION_MS` (default 1000 ms). Ring has two circles: a semi-transparent white backing ring and a green fill ring, both `strokeWidth="6"`.
5. **Grace period** — The ring does NOT reset when conditions fail for ≤ 150 ms (micro-trembles). Only a sustained failure > 150 ms resets the ring to 0%.
6. **Auto-capture fires at 100%** — When the ring reaches 100%, `handleCapture()` is called automatically — no user tap required.
7. **No double-capture** — `hasFiredRef` prevents firing more than once per session. `videoRef.current && canvasRef.current` guards prevent silent no-ops on rapid re-renders.
8. **Shutter flash** — Immediately after auto-capture, a white fullscreen overlay animates from opacity 0.9→0 over 200 ms (`.shutter-flash` CSS class).
9. **Haptic lock confirmation** — `navigator.vibrate([30, 40, 80])` fires on capture (existing haptic infrastructure).
10. **Manual capture button preserved** — The capture button remains in the DOM as an escape hatch. It is visually secondary (smaller, labelled via `camera.captureManually` i18n key). It is disabled while `!isReady && enableLiveGuidance` (unchanged behaviour).
11. **Bilingual guidance messages** — All nine guidance states display in both EN and AR via i18n keys (see §Dev Notes / i18n).
12. **rVFC frame loop** — The analysis loop uses `requestVideoFrameCallback` on Safari 17+ / iOS 17+ and falls back to throttled `requestAnimationFrame` at 200 ms intervals. Both paths share the same analysis callback.
13. **Performance guard** — In `DEV` mode, `performance.now()` timing wraps `assessImageQuality()`. A `console.warn` fires when the pipeline exceeds 6 ms. Blur detection runs every other frame via `frameCountRef`.
14. **TestLab inspector** — The following signals are exposed on `CameraGuidanceState` (for the TestLab panel): `widthFraction`, `centroidX`, `spanFraction` (via `CompositionAssessment`), `holdProgress`, `isHolding`, `hasFired`.

## Tasks / Subtasks

- [ ] **T1 — `cameraQualityAssessment.ts`: horizontal detection + thresholds** (AC: 1, 2, 3, 11)
  - [ ] T1.1 — Add `minCol`, `maxCol`, `colSum` tracking to the pixel loop in `analyzeComposition()`
  - [ ] T1.2 — Compute `widthFraction = (maxCol - minCol) / W` and `centroidX = colSum / matchCount / W` after the loop
  - [ ] T1.3 — Add `isCentered = Math.abs(centroidX - 0.5) <= 0.15` (replace hardcoded `true`)
  - [ ] T1.4 — Update distance classification: `verticalOk = spanFraction >= 0.55 && <= 0.90`; `horizontalOk = widthFraction >= 0.35`; `centeredOk = isCentered`. All three must pass for `'good'`. Off-centre (`distance='too-far'` with `!isCentered`) gets its own message path.
  - [ ] T1.5 — Add `widthFraction: number` and `centroidX: number` to `CompositionAssessment` interface and return value
  - [ ] T1.6 — Add "Centre the bottle in the guide" / `camera.centreBottle` case in `generateGuidanceMessage()` — fired when `composition.distance === 'too-far' && !composition.isCentered && composition.visibility > 30`
  - [ ] T1.7 — Add `performance.now()` timing guard in `assessImageQuality()` (DEV-only, warns at > 6 ms)
  - [ ] T1.8 — Add `frameCountRef` + `lastBlurScoreRef` pattern: blur runs every other frame; composition runs every frame

- [ ] **T2 — `useCameraGuidance.ts`: hold timer + grace period + rVFC** (AC: 5, 6, 7, 12, 13)
  - [ ] T2.1 — Add `holdProgress: number` and `isHolding: boolean` to `CameraGuidanceState` interface
  - [ ] T2.2 — Add `holdStartRef = useRef<number | null>(null)` and `lastFailRef = useRef<number | null>(null)` to hook body
  - [ ] T2.3 — Add `frameCountRef = useRef<number>(0)` and `lastBlurScoreRef = useRef<number>(50)` for blur throttle
  - [ ] T2.4 — Implement hold timer logic inside `analyzeFrame` setState callback: `HOLD_DURATION_MS = 1000` (named constant), `GRACE_PERIOD_MS = 150`
  - [ ] T2.5 — On `isGood=true`: clear `lastFailRef`, start or continue `holdStartRef`, compute `holdProgress = elapsed / HOLD_DURATION_MS`, set `isHolding = holdProgress < 1`, set `isReady = holdProgress >= 1` (latch)
  - [ ] T2.6 — On `isGood=false` within grace period (< 150 ms): return `{ ...prev }` unchanged — ring does not reset
  - [ ] T2.7 — On `isGood=false` beyond grace period: clear both refs, reset `holdProgress=0`, `isHolding=false`, `isReady=false`, `goodFramesCount=0`
  - [ ] T2.8 — Replace `requestAnimationFrame` loop with `startFrameLoop(videoEl, cb)` helper: prefers `videoEl.requestVideoFrameCallback(loop)` when available; falls back to throttled rAF at 200 ms
  - [ ] T2.9 — Store rVFC/rAF cleanup function in a ref; call it in `stopGuidance()`
  - [ ] T2.10 — Reset `holdStartRef.current = null` and `lastFailRef.current = null` in `reset()` callback

- [ ] **T3 — `CameraViewfinder.tsx`: auto-capture + shutter flash + progress ring** (AC: 6, 7, 8, 9, 10, 14)
  - [ ] T3.1 — Fix `BottleGuide` SVG: add `preserveAspectRatio="xMidYMid slice"` to `<svg>` element
  - [ ] T3.2 — Update `BottleGuide` props: add `holdProgress: number` and `isHolding: boolean`
  - [ ] T3.3 — Add dual progress ring inside `BottleGuide` SVG (conditionally rendered when `isHolding`): backing circle `stroke="rgba(255,255,255,0.20)"` + fill circle `stroke="#10b981"`, both `strokeWidth="6"`, `cx="65" cy="105" r="96"`, fill ring uses `strokeDasharray={${holdProgress * 603} 603}` and `transform="rotate(-90 65 105)"`
  - [ ] T3.4 — Pass `guidance.state.holdProgress` and `guidance.state.isHolding` to `BottleGuide`
  - [ ] T3.5 — Add `hasFiredRef = useRef(false)` to component body
  - [ ] T3.6 — Add auto-capture `useEffect` watching `[guidance.state.isReady, cameraState, handleCapture]`: fires when `isReady && !hasFiredRef.current && cameraState === 'active' && videoRef.current && canvasRef.current`; sets `hasFiredRef.current = true`; calls `navigator.vibrate([30, 40, 80])` then `handleCapture()`
  - [ ] T3.7 — Add shutter flash: add `const [shutterFlash, setShutterFlash] = useState(false)`; in auto-capture effect call `setShutterFlash(true); setTimeout(() => setShutterFlash(false), 200)` after `handleCapture()`
  - [ ] T3.8 — Add `{shutterFlash && <div className="shutter-flash" aria-hidden="true" />}` to JSX inside guidance overlay
  - [ ] T3.9 — Reset `hasFiredRef.current = false` when `guidance.reset()` is called (e.g., on retake)
  - [ ] T3.10 — Deprioritise manual capture button: add secondary class + `t('camera.captureManually')` label; keep `disabled={!guidance.state.isReady && enableLiveGuidance}` logic unchanged

- [ ] **T4 — `CameraViewfinder.css`: shutter flash + secondary button** (AC: 8, 10)
  - [ ] T4.1 — Add `.shutter-flash { position: absolute; inset: 0; background: white; opacity: 0; animation: shutter-flash 200ms ease-out forwards; pointer-events: none; z-index: 100; }`
  - [ ] T4.2 — Add `@keyframes shutter-flash { 0% { opacity: 0.9; } 100% { opacity: 0; } }`
  - [ ] T4.3 — Add secondary capture button style: smaller size, muted color

- [ ] **T5 — i18n: add guidance keys** (AC: 11)
  - [ ] T5.1 — Add to `src/i18n/locales/en/translation.json` under `"camera"`: `pointAtBottle`, `moveCloser`, `moveBack`, `centreBottle`, `tooBright`, `tooDark`, `holdSteady`, `holdStill`, `perfect`, `captureManually`
  - [ ] T5.2 — Add Arabic equivalents to `src/i18n/locales/ar/translation.json` (see §Dev Notes / i18n)
  - [ ] T5.3 — Update `generateGuidanceMessage()` to return i18n keys instead of raw strings; translate in `CameraViewfinder` using `t()`

- [ ] **T6 — Tests** (AC: all)
  - [ ] T6.1 — Unit tests for `analyzeComposition()`: assert `widthFraction`/`centroidX`/`isCentered` present; assert all 4 gates required for `'good'`
  - [ ] T6.2 — Unit tests for hold timer: assert `holdProgress` reaches 1 after 1000 ms of `isGoodQuality=true`; assert grace period (150 ms failure does not reset); assert sustained failure resets
  - [ ] T6.3 — Unit test for `hasFiredRef` guard: confirm `handleCapture` not called twice on multiple `isReady=true` renders
  - [ ] T6.4 — E2E / manual: verify on iOS Safari 17+ and Android Chrome that ring animates, auto-capture fires, shutter flash visible

## Dev Notes

### Critical Architecture Facts

**Codebase state at story creation (2026-04-10, master `3b142be`):**
- `cameraQualityAssessment.ts` — `analyzeComposition()` at line 318 only tracks `minRow`/`maxRow`. `isCentered` is hardcoded `true` (line 410). Current "good" threshold is `spanFraction 0.45–0.90` (line 399–406). **Must change lower bound to 0.55.**
- `useCameraGuidance.ts` — `analyzeFrame` uses `requestAnimationFrame` (line 305). `isReady` requires 2 consecutive good frames (line 282). No `holdProgress`/`isHolding` in `CameraGuidanceState` interface (line 51). `HOLD_DURATION_MS` constant does not exist yet.
- `CameraViewfinder.tsx` — `BottleGuide` at line 48 has no `preserveAspectRatio` on SVG (line 74–80). No auto-capture `useEffect`. `handleCapture` is stable (`useCallback`, line 231). The component already has `videoRef` and `canvasRef` — do NOT add new refs for these, just use existing ones.
- Recent revert: commit `3b142be` reverted camera quality improvements from `6f4feb5`. This story properly implements those improvements using the full spec.

**Do NOT use `CameraCapture.tsx` / `useCamera.ts`** — those are old components from Story 1.5. The active camera component is `CameraViewfinder.tsx` + `useCameraGuidance.ts`.

**Auto-capture signal path:**
```
analyzeComposition() → [4 gates pass] → distance='good'
  → assessImageQuality() → isGoodQuality=true
    → useCameraGuidance analyzeFrame → holdProgress reaches 1
      → CameraGuidanceState.isReady=true
        → CameraViewfinder useEffect → handleCapture()
```

**Hold timer state machine (implement in `useCameraGuidance.ts`):**
```
SEARCHING → (isGoodQuality=true) → HOLDING
HOLDING   → (elapsed >= HOLD_DURATION_MS) → FIRED  (isReady=true latched)
HOLDING   → (failure ≤ 150 ms)            → HOLDING  (grace period — no reset)
HOLDING   → (failure > 150 ms)            → SEARCHING  (full reset)
FIRED     → component unmounts/reset()    → SEARCHING
```

**rVFC implementation note:**
`requestVideoFrameCallback` fires at camera delivery rate, not display rate. On iOS in Low Power Mode, rAF is throttled to 30 fps but rVFC fires at the camera's native 30 fps without throttling. The fallback throttled-rAF at 200 ms (5 fps) is intentional — it's the baseline minimum for responsive guidance.

**HOLD_DURATION_MS = 1000** — Exposed as a named constant at the top of `useCameraGuidance.ts` so A/B testing (750 ms / 1500 ms) requires a single-line change.

### i18n Keys to Add

Add under `"camera"` in both `src/i18n/locales/en/translation.json` and `src/i18n/locales/ar/translation.json`:

| Key | English | Arabic |
|-----|---------|--------|
| `pointAtBottle` | "Point camera at the bottle" | "وجّه الكاميرا نحو الزجاجة" |
| `moveCloser` | "Move closer to the bottle" | "اقترب من الزجاجة" |
| `moveBack` | "Move camera back slightly" | "أبعد الكاميرا قليلاً" |
| `centreBottle` | "Centre the bottle in the guide" | "ضع الزجاجة في منتصف الإطار" |
| `tooBright` | "Reduce glare — avoid direct light" | "قلّل الإضاءة الساطعة" |
| `tooDark` | "Move to a brighter location" | "انتقل إلى مكان أكثر إضاءة" |
| `holdSteady` | "Hold steady — image is blurry" | "أبقِ الهاتف ثابتاً" |
| `holdStill` | "Hold still…" | "لا تتحرك…" |
| `perfect` | "Perfect! Hold steady…" | "ممتاز! أبقِ ثابتاً…" |
| `captureManually` | "Capture manually" | "التقاط يدوي" |

**Existing keys that overlap (do NOT duplicate):** `ready` ("Ready"), `alignBottle` ("Align Bottle") — these already exist at `translation.json:81–82`.

**Guidance waterfall priority** (implement in `generateGuidanceMessage()` — return i18n key, translate in component):
1. `not-detected` → `camera.pointAtBottle` (error)
2. `too-far` (small, `visibility ≤ 30`) → `camera.moveCloser` (warning)
3. `too-close` → `camera.moveBack` (warning)
4. `too-far` (off-centre, `visibility > 30`) → `camera.centreBottle` (warning)
5. `too-dark` → `camera.tooDark` (error)
6. `too-bright` → `camera.tooBright` (warning)
7. `low-contrast` → existing `'Improve lighting contrast'` or new key
8. `blurScore < 30` → `camera.holdSteady` (error)
9. `blurScore < 45` → `camera.holdStill` (warning)
10. all pass → `camera.perfect` (success)

### Blur Throttle Pattern

```ts
// In analyzeFrame() — blur runs every other frame
frameCountRef.current = (frameCountRef.current ?? 0) + 1;
const blurScore = frameCountRef.current % 2 === 0
  ? detectBlur(video)
  : lastBlurScoreRef.current;
lastBlurScoreRef.current = blurScore;
```

This halves blur computation cost (~4 ms on mid-range phones) with no perceptible quality loss.

### Progress Ring Math

Ring circumference = `2π × 96 ≈ 603`. SVG `strokeDasharray`:
```tsx
strokeDasharray={`${holdProgress * 603} 603`}
transform="rotate(-90 65 105)"   // 12 o'clock start
```
`holdProgress` is `0→1` float from `CameraGuidanceState`.

### Project Structure Notes

Files to change (exactly as specified in tech spec §11):

| File | Change type |
|------|-------------|
| [src/utils/cameraQualityAssessment.ts](src/utils/cameraQualityAssessment.ts) | Modify — add horizontal detection, update thresholds, add i18n keys, add perf timing |
| [src/hooks/useCameraGuidance.ts](src/hooks/useCameraGuidance.ts) | Modify — add hold timer, grace period, rVFC upgrade, expose `holdProgress`/`isHolding` |
| [src/components/CameraViewfinder.tsx](src/components/CameraViewfinder.tsx) | Modify — auto-capture effect, progress ring, shutter flash, `preserveAspectRatio` fix |
| [src/components/CameraViewfinder.css](src/components/CameraViewfinder.css) | Modify — add `.shutter-flash` + `@keyframes`, secondary button style |
| [src/i18n/locales/en/translation.json](src/i18n/locales/en/translation.json) | Modify — add 10 camera guidance keys |
| [src/i18n/locales/ar/translation.json](src/i18n/locales/ar/translation.json) | Modify — add Arabic equivalents |

Do NOT touch: `useCamera.ts`, `CameraCapture.tsx`, `App.tsx` (unless required for reset-on-retake), any Worker files.

### References

- Tech spec (primary source): [_bmad-output/implementation-artifacts/tech-spec-camera-auto-capture-outline-coverage-2026-04-10.md](_bmad-output/implementation-artifacts/tech-spec-camera-auto-capture-outline-coverage-2026-04-10.md)
- Current `analyzeComposition()` impl: [src/utils/cameraQualityAssessment.ts#L318](src/utils/cameraQualityAssessment.ts#L318)
- Current `CameraGuidanceState` interface: [src/hooks/useCameraGuidance.ts#L51](src/hooks/useCameraGuidance.ts#L51)
- Current `BottleGuide` SVG: [src/components/CameraViewfinder.tsx#L48](src/components/CameraViewfinder.tsx#L48)
- English i18n camera section: [src/i18n/locales/en/translation.json#L65](src/i18n/locales/en/translation.json#L65)
- Spec: §4 (full-coverage algorithm), §5 (auto-capture), §7 (rVFC), §8 (i18n), §9 (TestLab)

## Definition of Done

- [ ] `analyzeComposition()` computes and returns `widthFraction` and `centroidX`; `isCentered` is actually computed (not hardcoded)
- [ ] All 4 gates (vertical + width + centred + detected) required for `distance='good'`
- [ ] `CameraGuidanceState` has `holdProgress: number` and `isHolding: boolean`
- [ ] `HOLD_DURATION_MS` is a named constant (not a magic number)
- [ ] Grace period: ring does not reset on failures ≤ 150 ms
- [ ] Auto-capture fires exactly once per session (`hasFiredRef` guard)
- [ ] `videoRef.current && canvasRef.current` guards present in auto-capture `useEffect`
- [ ] Shutter flash CSS animation plays on capture
- [ ] Progress ring SVG present: 2 circles, `strokeWidth="6"`, fill ring animates 0→100% clockwise
- [ ] `preserveAspectRatio="xMidYMid slice"` added to `BottleGuide` `<svg>`
- [ ] Manual capture button remains, visually secondary, labelled `camera.captureManually`
- [ ] All 10 i18n keys added to both `en` and `ar` translation files
- [ ] `generateGuidanceMessage()` returns i18n keys, translated in component
- [ ] Frame loop uses `requestVideoFrameCallback` on Safari 17+ with rAF fallback
- [ ] Dev-mode `performance.now()` warning at > 6 ms pipeline time
- [ ] Blur throttled to every other frame
- [ ] All existing camera guidance unit tests pass
- [ ] New unit tests for `widthFraction`/`centroidX`, hold timer, grace period, `hasFiredRef` guard

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Debug Log References

### Completion Notes List

### File List
