---
title: 'Bottle Detection Shape-Aware ROI Validation'
slug: 'bottle-detection-shape-aware-roi'
created: '2026-04-09'
status: 'completed'
stepsCompleted: [1, 2, 3, 4]
tech_stack: ['TypeScript', 'Vitest', 'jsdom', 'Canvas API (mocked in tests)']
files_to_modify:
  - 'src/utils/cameraQualityAssessment.ts'
  - 'src/test/cameraQualityAssessment.test.ts (new)'
code_patterns:
  - 'Named inline consts at top of function (no config object)'
  - 'Single loop pass — track minRow/maxRow/minCol/maxCol + rowCounts[]'
  - 'Early-return CompositionAssessment on gate failure'
test_patterns:
  - 'vi.spyOn(HTMLCanvasElement.prototype, getContext) → mock ctx with drawImage + getImageData'
  - 'Synthetic Uint8ClampedArray pixel data (60x100x4 = 24000 bytes)'
  - 'describe/it blocks matching volumeCalculator.test.ts style'
---

# Tech-Spec: Bottle Detection Shape-Aware ROI Validation

**Created:** 2026-04-09

## Overview

### Problem Statement

`analyzeComposition` samples the center 60% of the video frame horizontally (full height). Any green+amber object anywhere in that zone triggers "Ready" — the bottle doesn't need to be inside the overlay silhouette, and non-Afia bottle shapes are never rejected. Screenshots confirm: the overlay outline is over empty space but the system shows green because the bottle's colors are nearby in the zone.

### Solution

Three-layer fix, all inside `src/utils/cameraQualityAssessment.ts`:
1. **ROI tightening** — narrow horizontal crop from 60% to 40% (x: 30%–70%) and add vertical crop (y: 10%–90%), matching the overlay footprint more closely.
2. **Aspect-ratio gate** — matched-pixel bounding box width/height must be ≤ 0.75 (bottle is taller than wide; ratio ≈ 0.62). Rejects wide/squat shapes.
3. **Neck-sparsity gate** — matched pixels in top 25% of bounding box must be less than 40% of pixels in bottom 60%. Rejects rectangular containers that lack a narrow neck.

### Scope

**In Scope:**
- `analyzeComposition` function in `src/utils/cameraQualityAssessment.ts` — ROI crop, aspect ratio check, neck-sparsity check
- Tracking `minCol`/`maxCol` in the pixel loop (currently only `minRow`/`maxRow` are tracked)

**Out of Scope:**
- ML/AI shape detection or new npm dependencies
- Dynamic overlay coordinate wiring (Option B rejected — DOM coupling in a pixel utility)
- Changes to blur/lighting logic
- Changes to `isReady` state machine in `useCameraGuidance.ts`
- Changes to `CameraViewfinder.tsx`

## Context for Development

### Codebase Patterns

- `analyzeComposition` is a pure pixel utility — no React imports, no DOM refs. Keep it that way.
- `getProcessingCanvas()` is a module-level singleton that calls `document.createElement('canvas')` then `getContext('2d', {willReadFrequently:true})`. It throws if context is null (which the caller's try/catch catches).
- Processing canvas stays W=60, H=100. The ROI change only affects the `drawImage` **source rect** — destination stays `(0, 0, W, H)`.
- Current loop tracks only `minRow`/`maxRow`. Party mode confirmed: extend to also track `minCol`, `maxCol`, and `rowCounts[y]` (match count per row) **in the same single pass** — zero extra iterations.
- Existing guard pattern: early-return `{ bottleDetected:false, distance:'not-detected', ... }` on failed checks. Maintain this pattern for new gates.
- All thresholds are inline named `const`s at the top of the function — no config object, no separate file.
- No existing tests for `analyzeComposition` (confirmed by grep). New test file needed.

### Files to Reference

| File | Purpose |
| ---- | ------- |
| `src/utils/cameraQualityAssessment.ts:318–426` | `analyzeComposition` — only file to modify |
| `src/utils/cameraQualityAssessment.ts:80–96` | `getProcessingCanvas` — module singleton, intercept point for tests |
| `src/utils/cameraQualityAssessment.ts:50–67` | `CompositionAssessment` interface — no changes needed |
| `src/components/CameraViewfinder.tsx:74–119` | Overlay SVG — viewBox 0 0 130 210, body x=26–104 (60% of 130), cap y=2 base y=190 |
| `src/components/CameraViewfinder.css:449–456` | `bottle-guide-wrapper` = 52% viewport width, centered |
| `src/test/setup.ts` | jsdom canvas mock — `getContext` returns original or null; tests must `vi.spyOn` the prototype |
| `src/test/volumeCalculator.test.ts` | Test style reference — `describe/it/expect`, no React, pure utility |

### Technical Decisions

| Decision | Choice | Rationale |
| -------- | ------ | --------- |
| ROI approach | Fixed crop percentages (Option A) | Keeps pure utility free of DOM coupling; simpler scope |
| Horizontal crop | 30%–70% of source frame (was 20%–80%) | Matches ~bottle-body footprint within the 52%-wide overlay |
| Vertical crop | 10%–90% of source frame (new) | Excludes floor/ceiling that can carry stray color pixels |
| Aspect ratio gate | `bboxW / bboxH ≤ 0.75` (bottle ≈ 0.62) | Rejects wide/squat shapes; ±20% tolerance on 0.62 |
| Neck sparsity gate | topDensity < 40% × bodyDensity | Rejects rectangular containers lacking a neck |
| Neck zones | Top 25% vs bottom 60% of matched bbox rows | Leaves 15% mid-zone as neutral buffer |
| Canvas size | Keep W=60, H=100 | No impact on blur or lighting callers |
| Test approach | `vi.spyOn(HTMLCanvasElement.prototype, 'getContext')` | jsdom has no canvas package; spy returns mock ctx |
| Test isolation | `vi.resetModules()` + dynamic import in `beforeEach` | Module-level singleton (`processingCanvas/processingContext`) must be reset between tests |
| Named constants | Inline at top of `analyzeComposition` | Consistent with existing code style; discoverable |
| Gate ordering | color threshold → bbox min-size → aspect ratio → neck sparsity | Each gate is an early return; cheaper gates first |
| Bbox min-size guard | bbox height ≥ 8 rows before neck/aspect checks | Prevents division-by-zero in density calc; replaces ambiguous `spanFraction < 0.30` |

## Implementation Plan

### Tasks

- [x] Task 1: Add named constants block to `analyzeComposition`
  - File: `src/utils/cameraQualityAssessment.ts`
  - Action: Insert the following named `const`s immediately after the `try {` opening on line 322, before any variable declarations:
    ```typescript
    // ── ROI: tighter crop matching the overlay's ~52%-wide footprint ──────────
    const CROP_X_START = 0.30;   // horizontal start (was 0.20)
    const CROP_X_END   = 0.70;   // horizontal end   (was 0.80)
    const CROP_Y_START = 0.10;   // vertical start   (was 0)
    const CROP_Y_END   = 0.90;   // vertical end     (was 1.0)
    // ── Shape gates ───────────────────────────────────────────────────────────
    const BOTTLE_ASPECT_MAX      = 0.75;  // bboxW/bboxH must be ≤ this (bottle ≈ 0.62)
    const BBOX_MIN_HEIGHT        = 8;     // minimum bbox height in canvas rows
    const NECK_TOP_FRACTION      = 0.25;  // top 25% of bbox = neck zone
    const NECK_BODY_FRACTION     = 0.60;  // bottom 60% of bbox = body zone
    const NECK_MAX_DENSITY_RATIO = 0.40;  // neck pixel density < 40% of body density
    ```
  - Notes: Keep consistent with existing style (inline consts, no separate config object).

- [x] Task 2: Update `drawImage` source rectangle for the new ROI
  - File: `src/utils/cameraQualityAssessment.ts`
  - Action: Replace lines 334–336 (the `cropX`/`cropW`/`drawImage` block):
    ```typescript
    // Before:
    const cropX = srcW * 0.20;
    const cropW = srcW * 0.60;
    ctx.drawImage(imageSource, cropX, 0, cropW, srcH, 0, 0, W, H);

    // After:
    const cropX = srcW * CROP_X_START;
    const cropW = srcW * (CROP_X_END - CROP_X_START);
    const cropY = srcH * CROP_Y_START;
    const cropH = srcH * (CROP_Y_END - CROP_Y_START);
    ctx.drawImage(imageSource, cropX, cropY, cropW, cropH, 0, 0, W, H);
    ```
  - Notes: Destination rect stays `(0, 0, W, H)` — only source rect changes.

- [x] Task 3: Extend pixel loop to track `minCol`, `maxCol`, and `rowCounts[]`
  - File: `src/utils/cameraQualityAssessment.ts`
  - Action: In the declarations before the loop (around line 341), add:
    ```typescript
    let minCol = W;
    let maxCol = -1;
    const rowCounts = new Array<number>(H).fill(0);
    ```
    Inside the loop body, within the `if (isGreen || isAmber)` block (after `matchCount++`), add:
    ```typescript
    if (x < minCol) minCol = x;
    if (x > maxCol) maxCol = x;
    rowCounts[y]++;
    ```
  - Notes: Zero extra iterations — same single pass. `rowCounts[y]` is the count of matched pixels in canvas row `y`. **Important:** `rowCounts` is indexed by absolute canvas row `y` (0–99), not by bbox-relative row. The neck slice `rowCounts.slice(minRow, minRow + neckRows)` uses absolute indices — do not reindex from 0.

- [x] Task 4: Insert gate chain after the existing `bottleDetected` early-return (line ~383)
  - File: `src/utils/cameraQualityAssessment.ts`
  - Action: After the existing `if (!bottleDetected) { return { ... } }` block, insert before the `spanFraction` calculation:
    ```typescript
    // Gate 1b: bounding box too small for reliable shape checks
    const bboxHeight = maxRow - minRow;
    const bboxWidth  = maxCol - minCol;
    if (bboxHeight < BBOX_MIN_HEIGHT || bboxWidth < 2) {
      return { isCentered: false, isLevel: true, distance: 'not-detected', visibility: 0, bottleDetected: false };
    }
    // Note: bboxWidth > 0 guaranteed by bottleDetected check above, but < 2 guard
    // prevents division-by-zero in density calc when a single pixel column matches.

    // Gate 2: aspect ratio — bottle must be taller than wide
    const aspectRatio = bboxWidth / bboxHeight;
    if (aspectRatio > BOTTLE_ASPECT_MAX) {
      return { isCentered: true, isLevel: true, distance: 'not-detected', visibility: 0, bottleDetected: false };
    }

    // Gate 3: neck sparsity — top 25% of bbox must be sparser than bottom 60%
    const neckRows  = Math.max(1, Math.floor(bboxHeight * NECK_TOP_FRACTION));
    const bodyRows  = Math.max(1, Math.floor(bboxHeight * NECK_BODY_FRACTION));
    const neckTotal = rowCounts.slice(minRow, minRow + neckRows).reduce((a, b) => a + b, 0);
    const bodyTotal = rowCounts.slice(maxRow - bodyRows, maxRow).reduce((a, b) => a + b, 0);
    const neckDensity = neckTotal / (neckRows * bboxWidth);
    const bodyDensity = bodyTotal / (bodyRows * bboxWidth);
    if (bodyDensity > 0 && neckDensity >= NECK_MAX_DENSITY_RATIO * bodyDensity) {
      return { isCentered: true, isLevel: true, distance: 'not-detected', visibility: 0, bottleDetected: false };
    }
    ```
  - Notes:
    - Gate 1b uses `bboxWidth < 2` (not just `< 1`) to prevent division-by-zero in the density denominators (`neckRows * bboxWidth`). A single matched column gives `bboxWidth = maxCol - minCol = 0`.
    - Shape-gate rejections (Gates 2 and 3) return `isCentered: true` — the object IS centred in the frame, it's just the wrong shape. The size gate (Gate 1b) returns `isCentered: false` since the blob is too small to determine centering.
    - Density is normalized by `bboxWidth` so the ratio is meaningful regardless of bottle width in frame.
    - **Replace** the existing `spanFraction` line — **delete** `const spanFraction = (maxRow - minRow) / H;` and write `const spanFraction = bboxHeight / H;` in its place. Do not leave both declarations — TypeScript will error on duplicate `const` in strict mode.
    - **Do not change the `matchRatio` denominator.** It remains `matchCount / (W * H)` — the full canvas area (6000 pixels), not the ROI area. Changing it would silently alter the 4% detection threshold semantics.

- [x] Task 5: Create `src/test/cameraQualityAssessment.test.ts` with 6 test cases
  - File: `src/test/cameraQualityAssessment.test.ts` (new)
  - Action: Create the file with the following content:
    ```typescript
    import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

    // RGB values for Afia bottle colours (verified against HSV thresholds in analyzeComposition)
    // Green label: H≈120°, S≈80%, V≈60% → RGB(30,153,30)   passes isGreen (H 80–170, S≥0.25, V≥0.18)
    // Amber oil:   H≈40°,  S≈80%, V≈80% → RGB(204,153,41)  passes isAmber (H 25–65, S≥0.28, V≥0.38)
    const GREEN: [number, number, number] = [30, 153, 30];
    const AMBER: [number, number, number] = [204, 153, 41];
    const BLACK: [number, number, number] = [0, 0, 0];
    const W = 60, H = 100; // processing canvas dimensions

    function makePixels(fn: (x: number, y: number) => [number, number, number]): Uint8ClampedArray {
      const data = new Uint8ClampedArray(W * H * 4);
      for (let y = 0; y < H; y++) {
        for (let x = 0; x < W; x++) {
          const [r, g, b] = fn(x, y);
          const i = (y * W + x) * 4;
          data[i] = r; data[i + 1] = g; data[i + 2] = b; data[i + 3] = 255;
        }
      }
      return data;
    }

    describe('analyzeComposition', () => {
      let analyzeComposition!: (typeof import('../utils/cameraQualityAssessment'))['analyzeComposition'];
      // The `!` definite-assignment assertion is required — TypeScript strict mode cannot
      // infer that `beforeEach` always runs before each `it` block.

      beforeEach(async () => {
        vi.resetModules(); // resets module-level processingCanvas singleton
        ({ analyzeComposition } = await import('../utils/cameraQualityAssessment'));
      });

      afterEach(() => {
        vi.restoreAllMocks();
      });

      function mockCanvas(pixels: Uint8ClampedArray) {
        const mockCtx = {
          drawImage: vi.fn(),
          getImageData: vi.fn().mockReturnValue({ data: pixels }),
        };
        vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(
          mockCtx as unknown as CanvasRenderingContext2D
        );
        return mockCtx;
      }

      it('TC1: bottle-shaped region (narrow neck, wide body) → distance good', () => {
        // bbox: x=20–40 (bboxWidth=20), y=10–90 (bboxHeight=80) → aspectRatio=20/80=0.25 ≤ 0.75 ✓
        // Density measurement zones (NOT the pixel placement regions):
        //   neck zone = top 25% of bbox = rows 10–30 (neckRows=20); pixels at x=28–32 (4 wide)
        //     neckTotal = 20×4 = 80;  neckDensity = 80/(20×20) = 0.20
        //   body zone = bottom 60% of bbox = rows 42–90 (bodyRows=48); pixels at x=20–40 (20 wide)
        //     bodyTotal = 48×20 = 960; bodyDensity = 960/(48×20) = 1.0
        // 0.20 < 0.40×1.0 → neck sparsity gate passes ✓
        // spanFraction = bboxHeight/H = 80/100 = 0.80 → distance 'good' ✓
        const pixels = makePixels((x, y) => {
          if (y >= 10 && y < 30 && x >= 28 && x < 32) return GREEN; // narrow neck
          if (y >= 30 && y < 90 && x >= 20 && x < 40) return AMBER; // wide body
          return BLACK;
        });
        mockCanvas(pixels);
        const result = analyzeComposition(document.createElement('canvas') as unknown as HTMLVideoElement);
        expect(result.bottleDetected).toBe(true);
        expect(result.distance).toBe('good');
      });

      it('TC2: wide squat shape → not-detected (aspect gate)', () => {
        // bbox: x=5–55 (w=50), y=40–60 (h=20) → aspectRatio=2.5 > 0.75 ✗
        const pixels = makePixels((x, y) => {
          if (y >= 40 && y < 60 && x >= 5 && x < 55) return AMBER;
          return BLACK;
        });
        mockCanvas(pixels);
        const result = analyzeComposition(document.createElement('canvas') as unknown as HTMLVideoElement);
        expect(result.bottleDetected).toBe(false);
        expect(result.distance).toBe('not-detected');
      });

      it('TC3: tall rectangle, uniform density (no neck) → not-detected (neck gate)', () => {
        // bbox: x=20–40 (w=20), y=10–90 (h=80) → aspect OK
        // neck density = body density → ratio = 1.0 ≥ 0.40 ✗
        const pixels = makePixels((x, y) => {
          if (y >= 10 && y < 90 && x >= 20 && x < 40) return AMBER;
          return BLACK;
        });
        mockCanvas(pixels);
        const result = analyzeComposition(document.createElement('canvas') as unknown as HTMLVideoElement);
        expect(result.bottleDetected).toBe(false);
        expect(result.distance).toBe('not-detected');
      });

      it('TC4: matched region < 8 rows tall → not-detected (bbox-size gate)', () => {
        // bbox height = 5 rows < BBOX_MIN_HEIGHT (8) ✗
        const pixels = makePixels((x, y) => {
          if (y >= 48 && y < 53 && x >= 20 && x < 40) return AMBER;
          return BLACK;
        });
        mockCanvas(pixels);
        const result = analyzeComposition(document.createElement('canvas') as unknown as HTMLVideoElement);
        expect(result.bottleDetected).toBe(false);
        expect(result.distance).toBe('not-detected');
      });

      it('TC5: drawImage called with correct ROI source rect (30–70% x, 10–90% y)', () => {
        const pixels = new Uint8ClampedArray(W * H * 4); // all black → not-detected
        const mockCtx = mockCanvas(pixels);

        const fakeVideo = document.createElement('video');
        Object.defineProperty(fakeVideo, 'videoWidth',  { value: 800, configurable: true });
        Object.defineProperty(fakeVideo, 'videoHeight', { value: 600, configurable: true });

        analyzeComposition(fakeVideo);

        const [, srcX, srcY, srcW, srcH] = mockCtx.drawImage.mock.calls[0] as number[];
        expect(srcX).toBeCloseTo(800 * 0.30);  // 240
        expect(srcY).toBeCloseTo(600 * 0.10);  // 60
        expect(srcW).toBeCloseTo(800 * 0.40);  // 320  (CROP_X_END - CROP_X_START)
        expect(srcH).toBeCloseTo(600 * 0.80);  // 480  (CROP_Y_END - CROP_Y_START)
      });

      it('TC6: no matching pixels → bottleDetected false, distance not-detected (AC6 regression)', () => {
        // All-black canvas — zero green or amber pixels. bottleDetected stays false.
        // Verifies no gate refactor accidentally breaks the base no-detection path.
        const pixels = new Uint8ClampedArray(W * H * 4); // all zeros (RGBA black)
        mockCanvas(pixels);
        const result = analyzeComposition(document.createElement('canvas') as unknown as HTMLVideoElement);
        expect(result.bottleDetected).toBe(false);
        expect(result.distance).toBe('not-detected');
      });
    });
    ```
  - Notes: `vi.resetModules()` in `beforeEach` resets the `processingCanvas` singleton to `null` so each test gets a fresh spy intercept. Pass a `canvas` element as the source in TC1–TC4 and TC6 (satisfies the union type; videoWidth falls back to 0, but `getImageData` returns our synthetic pixels regardless). TC5 uses a real video element with mocked dimensions to verify source rect math.

### Acceptance Criteria

- [x] AC1: Given a video frame where Afia bottle colors appear in a region with narrow neck (neck pixel density < 40% of body density) and correct aspect ratio (w/h ≤ 0.75) spanning 45–90% of canvas height, when `analyzeComposition` runs, then `bottleDetected` is `true` and `distance` is `'good'`.

- [x] AC2: Given a frame where matching colors appear in a region wider than it is tall (bboxW/bboxH > 0.75), when `analyzeComposition` runs, then `bottleDetected` is `false` and `distance` is `'not-detected'`.

- [x] AC3: Given a frame where matching colors fill a tall rectangle uniformly top-to-bottom (neck density ≥ 40% of body density), when `analyzeComposition` runs, then `bottleDetected` is `false` and `distance` is `'not-detected'`.

- [x] AC4: Given a frame where fewer than 8 canvas rows contain matching pixels, when `analyzeComposition` runs, then `bottleDetected` is `false` and `distance` is `'not-detected'`.

- [x] AC5: Given a video element with `videoWidth=800` and `videoHeight=600`, when `analyzeComposition` runs, then `ctx.drawImage` is called with source x=240 (±1), y=60 (±1), w=320 (±1), h=480 (±1).

- [x] AC6: Given no matching pixels in the sampled canvas region, when `analyzeComposition` runs, then `bottleDetected` is `false` and `distance` is `'not-detected'` (existing behaviour preserved — no regression).

- [x] AC7: Given all 6 new test cases in `src/test/cameraQualityAssessment.test.ts`, when `npm test` runs, then all tests pass with no failures. `npx tsc --noEmit` also passes with zero errors.

## Review Notes
- Adversarial review completed
- Findings: 12 total, 3 fixed, 9 skipped (noise)
- Resolution approach: auto-fix
- Fixed: F3 (body zone slice end-exclusive), F7 (TC5 destination rect assertion), F11 (misleading bboxWidth comment)

## Additional Context

### Dependencies

None — no new packages. All changes are in existing TypeScript utility and a new Vitest test file.

### Testing Strategy

**Unit tests (new):** `src/test/cameraQualityAssessment.test.ts` — 5 cases covering each gate (ROI, bbox-size, aspect, neck) plus the happy path. File lives in `src/test/` alongside all other test files — confirmed correct glob location for Vitest.

**Module isolation:** `vi.resetModules()` in `beforeEach` + dynamic `import()` resets the `processingCanvas`/`processingContext` singleton to `null` so canvas spy intercepts cleanly in every test. **`beforeEach` must be declared `async`** — the dynamic `await import(...)` is a promise and will silently skip the import if not awaited.

**Canvas mock pattern:** `vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(mockCtx)` where `mockCtx` exposes `drawImage: vi.fn()` and `getImageData: vi.fn().mockReturnValue({ data: pixels })`. Restored in `afterEach` via `vi.restoreAllMocks()`.

**Automated tests:** Run `npm test` — all 5 new cases plus existing suite must pass. Then run `npx tsc --noEmit` — TypeScript errors in the gate code (wrong property names, type mismatches on return objects) won't surface in Vitest since esbuild transpiles without type-checking. The typecheck step is required separately.

**Manual real-device validation (UX):** Developer runs on a physical device after `npm test` and `npx tsc --noEmit` pass. Pass criteria:
1. Good indoor light, Afia 1.5L bottle centered in overlay → "Ready" (green) within 3 seconds
2. Dim light (lamp off, window only), same bottle → "Ready" within 3 seconds
3. Close range (bottle fills >80% of overlay height) → "Ready" within 3 seconds
4. Different-shaped bottle (e.g. Zahra/Baraka cooking oil), centered → stays orange (`not-detected`) for at least 5 seconds

Fail = "Ready" not triggered within 3 seconds in cases 1–3, or "Ready" triggers in case 4.

### Notes

**Risk — neck threshold tuning:** The `NECK_MAX_DENSITY_RATIO = 0.40` is derived from the Afia 1.5L bottle's physical neck-to-body width ratio. The bottle neck spans ~36 SVG units wide (x=50–86 at narrowest) against a body of ~78 units (x=26–104), giving a width ratio of ~0.46. A density threshold of 0.40 gives a 6-point margin below that ratio. If the threshold needs adjustment after device testing, move it in 0.05 increments and re-run the manual validation above.

**Risk — fill level:** A nearly-empty bottle has very little amber oil, relying primarily on the green label. The green label runs the full height of the body area, so the neck check (which looks at the top 25%) may still see label pixels. If the bottle label extends into the neck region, the gate could false-reject. Monitor with real test scans.

**Future UX improvement (out of scope):** When the new gates reject a frame, the user still sees only a generic red outline with no hint of *why* — wrong shape? wrong distance? wrong object entirely? A follow-up story should differentiate guidance messages: e.g. "Make sure this is the Afia bottle" when aspect/neck gates fire, vs "Move closer" when distance is too-far.

**Future (out of scope):** Dynamic ROI from overlay `getBoundingClientRect()` (Option B) would give sub-pixel accuracy but requires React → utility coupling. Revisit if fixed-percentage ROI proves insufficient after real-device validation.
