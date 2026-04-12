---
title: 'Afia 1.5L Bottle: Height-to-Volume Calibration & Smart Quality Detection'
slug: 'afia-calibration-quality-thresholds'
created: '2026-04-08'
status: 'ready-for-dev'
stepsCompleted: [1, 2, 3, 4]
tech_stack: ['TypeScript', 'Cloudflare Workers', 'Gemini API', 'React']
files_to_modify:
  - shared/bottleRegistry.ts
  - shared/volumeCalculator.ts (new)
  - src/utils/volumeCalculator.ts
  - worker/src/analyze.ts
  - worker/src/providers/gemini.ts
  - worker/src/providers/groq.ts
  - worker/src/providers/openrouter.ts
  - worker/src/providers/mistral.ts
  - worker/src/referenceFrames.ts (new)
  - scripts/encode_reference_frames.js (new, run once)
  - src/utils/cameraQualityAssessment.ts
code_patterns: ['linear-interpolation', 'shared-utility', 'calibration-table', 'few-shot-multimodal']
test_patterns: ['unit-test-volume-calc', 'prompt-snapshot']
---

# Tech-Spec: Afia 1.5L Bottle: Height-to-Volume Calibration & Smart Quality Detection

**Created:** 2026-04-08

---

## Overview

### Problem Statement

Two independent bugs cause systematic volume mis-estimation and spurious quality warnings:

**Bug 1 — Linear volume formula applied to a non-cylindrical bottle.**
The AI estimates `fillPercentage = visible liquid height / total bottle height × 100` (a HEIGHT ratio). Both `worker/src/analyze.ts` (lines 70 and 196) and `src/utils/volumeCalculator.ts` treat this as a linear VOLUME ratio (`remainingMl = totalVolumeMl × fillPct/100`). The Afia 1.5L jug has a narrow neck (~35–40 mm diameter) compared to its wide body (~88 mm). In the neck region, the same height change represents far less volume than in the body. This causes systematic overestimation of consumed oil for nearly-full bottles.

Observed errors (actual consumed → AI reported consumed):
- 55 ml → 75 ml (+36%)
- 110 ml → 225 ml (+105%)
- 165 ml → 225 ml (+36%)

Root cause confirmed: for a bottle with 1390 ml remaining (110 ml consumed), the AI correctly reads fill height ≈ 85%, but `1500 × 0.85 = 1275 ml` remaining instead of the correct ~1390 ml. The narrow neck means 85% fill HEIGHT corresponds to ~92.7% fill VOLUME.

**Bug 2 — Overly aggressive quality-detection thresholds.**
`cameraQualityAssessment.ts` flags images as blurry (warning) when `blurScore < 60` using a global Laplacian variance on a 100×100 downsample, and flags poor lighting when global mean brightness < 60. Both thresholds fire on acceptable real-world images (background dark, subject clear), generating false quality warnings shown to the user and returned in `imageQualityIssues[]`.

### Solution

1. **Add a `calibrated` geometry shape** to `shared/bottleRegistry.ts` with a `calibrationPoints` array mapping fill-height-% → remaining-ml for the Afia 1.5L, derived from the 28 reference-frame directories in `oil_images/extracted_frames/`.

2. **Move `calculateRemainingMl()` to `shared/volumeCalculator.ts`** (new file) so both the worker and the frontend use identical, calibration-aware logic. Add linear interpolation for the `calibrated` shape. Update `src/utils/volumeCalculator.ts` to re-export from the shared file. Update both inline linear calculations in `worker/src/analyze.ts` to call `calculateRemainingMl()`.

3. **Enrich the AI system prompt** across all four providers with bottle-specific visual anchors for the Afia 1.5L. Tighten `imageQualityIssues` rules: only report `blur` when the bottle outline is genuinely indistinct; only report `poor_lighting` when the histogram is globally dark (not just a dark background).

4. **Tighten frontend quality thresholds** in `cameraQualityAssessment.ts`: raise blur-error threshold from 40 → 30, raise blur-warning from 60 → 45; lower lighting-dark threshold from brightness < 60 → < 40.

### Scope

**In Scope:**
- `shared/bottleRegistry.ts` — add `calibrated` shape type + calibration table for `afia-corn-1.5l`
- `shared/volumeCalculator.ts` — new file; linear interpolation on calibration table
- `src/utils/volumeCalculator.ts` — re-export from shared; remove duplicate logic
- `worker/src/analyze.ts` — replace inline linear formula with `calculateRemainingMl()` call (two locations: cache-hit branch and fresh-scan branch)
- All 4 AI provider prompts (`gemini.ts`, `groq.ts`, `openrouter.ts`, `mistral.ts`) — add visual anchors + tighten quality-issue rules
- `cameraQualityAssessment.ts` — tighten blur + lighting thresholds

**Out of Scope:**
- Multi-bottle support (intentionally locked to `afia-corn-1.5l`)
- Pixel-level oil surface detection (computer vision rewrite)
- Supabase schema changes
- UI changes beyond quality warning behavior

---

## Context for Development

### Codebase Patterns

- `shared/` is the single source of truth for data types + registries. Both `src/data/bottleRegistry.ts` and `worker/src/bottleRegistry.ts` are thin re-exports from `shared/`.
- Worker cannot import from `src/`. Shared utilities must live in `shared/` to be accessible from both.
- All 4 AI providers (`gemini.ts`, `groq.ts`, `openrouter.ts`, `mistral.ts`) have nearly identical `buildSystemPrompt()` functions — the same change must be applied to all 4.
- `analyze.ts` computes `remainingMl` inline in **two** separate code paths: KV cache hit (line 70) and fresh analysis (line 196). Both must be updated.
- `src/utils/volumeCalculator.ts` currently imports `BottleGeometry` from `"../data/bottleRegistry.ts"` (which re-exports from `shared/`). After this change it re-exports from `"../../shared/volumeCalculator.ts"`.

### Files to Reference

| File | Purpose |
| ---- | ------- |
| [shared/bottleRegistry.ts](shared/bottleRegistry.ts) | Add `calibrated` shape + calibration table |
| [shared/volumeCalculator.ts](shared/volumeCalculator.ts) | New — move `calculateRemainingMl()` here |
| [src/utils/volumeCalculator.ts](src/utils/volumeCalculator.ts) | Become a re-export wrapper |
| [src/data/bottleRegistry.ts](src/data/bottleRegistry.ts) | No change (already re-exports shared) |
| [worker/src/analyze.ts](worker/src/analyze.ts) | Fix lines 70 + 196 |
| [worker/src/bottleRegistry.ts](worker/src/bottleRegistry.ts) | No change (already re-exports shared) |
| [worker/src/providers/gemini.ts](worker/src/providers/gemini.ts) | Update prompt |
| [worker/src/providers/groq.ts](worker/src/providers/groq.ts) | Update prompt |
| [worker/src/providers/openrouter.ts](worker/src/providers/openrouter.ts) | Update prompt |
| [worker/src/providers/mistral.ts](worker/src/providers/mistral.ts) | Update prompt |
| [src/utils/cameraQualityAssessment.ts](src/utils/cameraQualityAssessment.ts) | Tighten thresholds |
| [oil_images/extracted_frames/](oil_images/extracted_frames/) | 27 measurement-level dirs used to derive calibration table (+ 1 synthetic `{0,0}` point = 28 total) |

### Technical Decisions

- **Why `calibrated` shape (not `frustum`):** The Afia jug is not a frustum — it has a distinctly narrow neck, wide body, and curved base. A frustum formula would still be inaccurate at the extremes. A lookup table with linear interpolation is simpler and directly derived from physical measurements (reference frames).
- **Why move to `shared/` (not inline in worker):** Worker needs calibration-aware `calculateRemainingMl()` in two places. Frontend already uses the same function. A shared location avoids drift.
- **Why re-export (not delete) `src/utils/volumeCalculator.ts`:** All existing call sites in `src/` import from this path. Re-exporting avoids a cascade of import updates.
- **Calibration table source:** The 27 measurement-level directories in `oil_images/extracted_frames/` are ground-truth reference frames recorded at known fill levels (folder name = remaining ml). Fill-height % values are estimated by visually measuring oil surface position as % of total bottle height in the reference images. The 28th calibration point `{fillHeightPct: 0, remainingMl: 0}` is a synthetic anchor for the empty-bottle state — no reference frame directory exists for 0 ml.

---

## Implementation Plan

### Tasks

#### Task 1 — Extend `BottleGeometry` type with `calibrated` shape

**File:** [shared/bottleRegistry.ts](shared/bottleRegistry.ts)

Add to the `BottleGeometry` interface:

```typescript
export interface CalibrationPoint {
  /** Oil surface height as % of total bottle height (0 = base, 100 = cap top) */
  fillHeightPct: number;
  /** Remaining oil volume in ml at this fill height */
  remainingMl: number;
}

export interface BottleGeometry {
  shape: "cylinder" | "frustum" | "calibrated";
  heightMm: number;
  diameterMm?: number;
  topDiameterMm?: number;
  bottomDiameterMm?: number;
  /** Required when shape === "calibrated". Must be sorted ascending by fillHeightPct. */
  calibrationPoints?: CalibrationPoint[];
}
```

Then update the `afia-corn-1.5l` entry geometry from:
```typescript
geometry: {
  shape: "cylinder",
  heightMm: 270,
  diameterMm: 88,
},
```
to:
```typescript
geometry: {
  shape: "calibrated",
  heightMm: 270,
  calibrationPoints: [
    { fillHeightPct: 0,  remainingMl: 0    },
    { fillHeightPct: 3,  remainingMl: 55   },
    { fillHeightPct: 6,  remainingMl: 110  },
    { fillHeightPct: 9,  remainingMl: 165  },
    { fillHeightPct: 12, remainingMl: 220  },
    { fillHeightPct: 15, remainingMl: 275  },
    { fillHeightPct: 19, remainingMl: 330  },
    { fillHeightPct: 24, remainingMl: 440  },
    { fillHeightPct: 27, remainingMl: 495  },
    { fillHeightPct: 31, remainingMl: 550  },
    { fillHeightPct: 34, remainingMl: 605  },
    { fillHeightPct: 38, remainingMl: 660  },
    { fillHeightPct: 41, remainingMl: 715  },
    { fillHeightPct: 44, remainingMl: 770  },
    { fillHeightPct: 47, remainingMl: 825  },
    { fillHeightPct: 50, remainingMl: 880  },
    { fillHeightPct: 53, remainingMl: 935  },
    { fillHeightPct: 57, remainingMl: 990  },
    { fillHeightPct: 60, remainingMl: 1045 },
    { fillHeightPct: 63, remainingMl: 1100 },
    { fillHeightPct: 66, remainingMl: 1155 },
    { fillHeightPct: 69, remainingMl: 1210 },
    { fillHeightPct: 72, remainingMl: 1265 },
    { fillHeightPct: 78, remainingMl: 1320 },
    { fillHeightPct: 83, remainingMl: 1375 },
    { fillHeightPct: 88, remainingMl: 1430 },
    { fillHeightPct: 93, remainingMl: 1485 },
    { fillHeightPct: 97, remainingMl: 1500 },
  ],
},
```

> **Calibration methodology:** Each `fillHeightPct` was estimated by visually measuring the oil surface position in the reference frame images at `oil_images/extracted_frames/{N}ml_bottle/`. The oil surface height was measured as a fraction of the total visible bottle height (base to top of cap).
>
> **Important naming note:** The AI returns `fillPercentage` as a height ratio (visible oil height / total bottle height × 100). This value is passed directly as `fillHeightPct` into `interpolateCalibration()` — they are the same quantity. No remapping or conversion step is needed.
>
> **Verification required before shipping:** After implementing the table, run `calculateRemainingMl(85, 1500, geometry)` and confirm the result lands near 1390 ml (the 110 ml-consumed error case). If it does not, the `fillHeightPct` values at the 1320–1485 ml range need tuning. A quick pixel-measurement method: open a reference frame in any image editor, measure the pixel height of the oil surface from the base, divide by total bottle pixel height. Do this for at least the 1375, 1430, and 1485 ml reference frames to validate the neck region entries.
>
> Key non-linearities observed:
> - **Low fill (0–330 ml, 0–19%):** Each 55 ml increment = ~3% height — body narrows at base.
> - **Mid fill (330–1265 ml, 19–72%):** Roughly linear — ~3% height per 55 ml.
> - **High fill (1265–1500 ml, 72–97%):** Each 55 ml = 5–6% height — oil is in the narrow neck (much less volume per mm height).

---

#### Task 2 — Create `shared/volumeCalculator.ts`

**File:** [shared/volumeCalculator.ts](shared/volumeCalculator.ts) *(new file)*

Create with the following content. This is a direct extraction/extension of `src/utils/volumeCalculator.ts` with the `calibrated` case added:

```typescript
import type { BottleGeometry } from "./bottleRegistry.ts";

export const ML_PER_TABLESPOON = 14.7868;
export const ML_PER_CUP = 236.588;

/**
 * Linear interpolation helper for calibration table lookup.
 * Points must be sorted ascending by fillHeightPct.
 */
function interpolateCalibration(
  fillHeightPct: number,
  points: Array<{ fillHeightPct: number; remainingMl: number }>
): number {
  if (fillHeightPct <= points[0].fillHeightPct) return points[0].remainingMl;
  const last = points[points.length - 1];
  if (fillHeightPct >= last.fillHeightPct) return last.remainingMl;

  for (let i = 1; i < points.length; i++) {
    const lo = points[i - 1];
    const hi = points[i];
    if (fillHeightPct <= hi.fillHeightPct) {
      const t = (fillHeightPct - lo.fillHeightPct) / (hi.fillHeightPct - lo.fillHeightPct);
      return lo.remainingMl + t * (hi.remainingMl - lo.remainingMl);
    }
  }
  return last.remainingMl;
}

export function calculateRemainingMl(
  fillPercentage: number,
  totalVolumeMl: number,
  geometry: BottleGeometry
): number {
  if (fillPercentage <= 0) return 0;
  if (fillPercentage >= 100) return totalVolumeMl;

  if (geometry.shape === "calibrated") {
    if (!geometry.calibrationPoints || geometry.calibrationPoints.length < 2) {
      // Fallback to linear if table missing
      return totalVolumeMl * (fillPercentage / 100);
    }
    // fillPercentage from the AI IS the fillHeightPct used in the table — no remapping needed.
    return Math.round(interpolateCalibration(fillPercentage, geometry.calibrationPoints));
  }

  if (geometry.shape === "cylinder") {
    return totalVolumeMl * (fillPercentage / 100);
  }

  if (geometry.shape === "frustum") {
    const { heightMm, topDiameterMm, bottomDiameterMm } = geometry;
    if (!topDiameterMm || !bottomDiameterMm || !heightMm) return 0;
    const fillHeightMm = (fillPercentage / 100) * heightMm;
    const bottomRadiusMm = bottomDiameterMm / 2;
    const topRadiusMm = topDiameterMm / 2;
    const fillRadiusMm =
      bottomRadiusMm + (topRadiusMm - bottomRadiusMm) * (fillHeightMm / heightMm);
    const volumeMm3 =
      ((Math.PI * fillHeightMm) / 3) *
      (bottomRadiusMm ** 2 + bottomRadiusMm * fillRadiusMm + fillRadiusMm ** 2);
    return volumeMm3 / 1000;
  }

  return 0;
}

export function mlToTablespoons(ml: number): number {
  return ml / ML_PER_TABLESPOON;
}

export function mlToCups(ml: number): number {
  return ml / ML_PER_CUP;
}

export interface VolumeBreakdown {
  ml: number;
  tablespoons: number;
  cups: number;
}

export function calculateVolumes(
  fillPercentage: number,
  totalVolumeMl: number,
  geometry: BottleGeometry
): { remaining: VolumeBreakdown; consumed: VolumeBreakdown } {
  const remainingMl = calculateRemainingMl(fillPercentage, totalVolumeMl, geometry);
  const consumedMl = totalVolumeMl - remainingMl;
  return {
    remaining: {
      ml: Math.round(remainingMl * 100) / 100,
      tablespoons: Math.round(mlToTablespoons(remainingMl) * 10) / 10,
      cups: Math.round(mlToCups(remainingMl) * 10) / 10,
    },
    consumed: {
      ml: Math.round(consumedMl * 100) / 100,
      tablespoons: Math.round(mlToTablespoons(consumedMl) * 10) / 10,
      cups: Math.round(mlToCups(consumedMl) * 10) / 10,
    },
  };
}
```

---

#### Task 3 — Make `src/utils/volumeCalculator.ts` a re-export wrapper

**File:** [src/utils/volumeCalculator.ts](src/utils/volumeCalculator.ts)

**First:** verify that the frontend build resolves `../../shared/` correctly. Open `tsconfig.json` (or `tsconfig.app.json`) in the project root and check `paths` or `baseUrl`. Also check `vite.config.ts` for `resolve.alias` entries. If `shared/` is not covered, add an alias:
```typescript
// vite.config.ts
resolve: { alias: { shared: path.resolve(__dirname, 'shared') } }
```
Then the import can be written as `import ... from "shared/volumeCalculator.ts"` instead of `../../shared/`.

Replace entire file content with:

```typescript
// Re-exports from shared — do not add logic here
export {
  ML_PER_TABLESPOON,
  ML_PER_CUP,
  calculateRemainingMl,
  mlToTablespoons,
  mlToCups,
  calculateVolumes,
} from "../../shared/volumeCalculator.ts";
export type { VolumeBreakdown } from "../../shared/volumeCalculator.ts";
```

---

#### Task 4 — Fix `worker/src/analyze.ts` inline linear formulas

**File:** [worker/src/analyze.ts](worker/src/analyze.ts)

**First:** verify `worker/tsconfig.json` includes `../../` as a resolvable path. Open it and check `paths` or `baseUrl`. If `../../shared/` is not in scope, the import will fail at build time. Add a path alias if needed:
```json
{ "paths": { "shared/*": ["../../shared/*"] } }
```

Add import at top of file:
```typescript
import { calculateRemainingMl } from "../../shared/volumeCalculator.ts";
```

Replace inside the **cache-hit branch** (the block that starts `if (cached) {`, immediately after `const { llmResult, aiProvider } = JSON.parse(cached)`):
```typescript
// BEFORE:
const remainingMl = Math.round(bottle.totalVolumeMl * (llmResult.fillPercentage / 100));

// AFTER:
const remainingMl = Math.round(calculateRemainingMl(llmResult.fillPercentage, bottle.totalVolumeMl, bottle.geometry));
```

Replace inside the **fresh-scan branch** (the block after `storeScan(...)`, immediately before `return c.json({`):
```typescript
// BEFORE:
const remainingMl = Math.round(bottle.totalVolumeMl * (llmResult.fillPercentage / 100));

// AFTER:
const remainingMl = calculateRemainingMl(llmResult.fillPercentage, bottle.totalVolumeMl, bottle.geometry);
```

Wrap both branches in `Math.round()` regardless of shape:
```typescript
const remainingMl = Math.round(calculateRemainingMl(llmResult.fillPercentage, bottle.totalVolumeMl, bottle.geometry));
```
Rationale: for `cylinder`/`frustum` shapes, `calculateRemainingMl` returns a float — wrapping preserves the existing integer API contract. For `calibrated` shape, `calculateRemainingMl` already rounds internally, so the outer `Math.round()` is a harmless no-op. Always wrap both branches.

---

#### Task 5 — Update AI system prompt in all 4 providers

**Files:** `worker/src/providers/gemini.ts`, `groq.ts`, `openrouter.ts`, `mistral.ts`

Each provider has an identical `buildSystemPrompt()` function. In each file, replace the `Rules:` section with the updated version below.

**Current Rules (all 4 files):**
```
Rules:
- fillPercentage: visible liquid height / total bottle height × 100. Account for meniscus. Exclude cap and label.
- confidence: "high"=clear+well-lit, "medium"=acceptable, "low"=poor quality
- imageQualityIssues: list any of: blur, poor_lighting, obstruction, reflection
```

**New Rules:**
```
Rules:
- fillPercentage: visible oil surface height / total bottle height × 100 (height ratio, not volume ratio). Account for meniscus. Measure from bottle base to oil surface, excluding cap. Clamp 0–100.
- For the Afia Pure Corn Oil 1.5L jug specifically, use these visual anchors:
    * Oil only covers the base (tiny pool, below label): fillPercentage 0–12
    * Oil at bottom of the green diagonal band on label: fillPercentage ~19
    * Oil at center of label (Afia heart logo): fillPercentage ~38
    * Oil at top of label / top of green diagonal: fillPercentage ~63
    * Oil at bottom of handle arch: fillPercentage ~72
    * Oil at shoulder/neck junction (where body narrows): fillPercentage ~78–83
    * Oil visible in neck (clear region at top, oil in narrow cylinder): fillPercentage ~83–93
    * Neck nearly or completely full (tiny or no air gap below cap): fillPercentage 93–97
- confidence: "high"=clear bottle outline+well-lit, "medium"=acceptable, "low"=poor quality
- imageQualityIssues: only include if the issue would prevent accurate fill estimation:
    * "blur" ONLY if the bottle outline/shape is indistinct (genuinely soft image, not just a dark background)
    * "poor_lighting" ONLY if the entire scene is too dark to distinguish the bottle body and oil level (histogram globally dark — not just a dark background with a lit subject)
    * "obstruction" if bottle body is significantly covered
    * "reflection" if glare obscures the oil level line
```

Also update the user message in each provider (currently `shape=${bottle.geometry.shape}`). Change to avoid leaking the internal shape name:

**Current user message** (all 4 files):
```typescript
`Bottle: ${bottle.name} (${bottle.sku}), ${bottle.totalVolumeMl}ml, shape=${bottle.geometry.shape}. Return JSON fill estimate.`
```

**New user message:**
```typescript
`Bottle: ${bottle.name} (${bottle.sku}), ${bottle.totalVolumeMl}ml total. Return JSON fill estimate.`
```

---

#### Task 5b — Add few-shot reference images to all 4 provider prompts

**Files:** `worker/src/referenceFrames.ts` (new), `worker/src/providers/gemini.ts`, `groq.ts`, `openrouter.ts`, `mistral.ts`

**Why all 4 providers:** The system relies entirely on free-tier APIs. Any provider can be the active one at a given request (Gemini exhausts quota → Groq → OpenRouter → Mistral). All 4 models are vision-capable (Gemini 2.0 Flash, Llama 4 Scout, Pixtral-12b) and support multi-image input. Limiting few-shot to Gemini only means 3 out of 4 fallback paths continue to misestimate near-full levels.

**Format split:** Gemini uses its native `inline_data` format; Groq, OpenRouter, and Mistral use the OpenAI-compatible `image_url` format. A shared helper handles both.

**Why this works better than text anchors alone:** Providing 3 reference images with known fill levels gives each model concrete visual comparisons instead of relying on abstract text descriptions. The reference frames from `oil_images/extracted_frames/` are already ground-truth labeled (folder name = remaining ml).

**Step 1 — Create `worker/src/referenceFrames.ts`**

This file reads the 3 reference images from disk at module load time and exports them as base64 strings. In a Cloudflare Worker, static assets must be bundled at build time (Wrangler bundles files referenced in the module graph). Use `fs/promises` at build time via a Wrangler build script, OR embed the base64 strings directly.

The simplest approach: run a one-time Node script to convert the reference frames to base64 and paste them as string constants. The 3 images are ~50–100 KB each as JPEGs (total ~200 KB added to the Worker bundle — well within the 1 MB script limit).

Reference images to use (pick a clean, well-lit representative frame from each):

| Level | File |
|---|---|
| 165 ml remaining (low fill) | `oil_images/extracted_frames/165ml_bottle/165ml_bottle_t0000.00s_f0000.jpg` |
| 660 ml remaining (mid fill) | `oil_images/extracted_frames/660ml_bottle/660ml_bottle_t0000.00s_f0000.jpg` |
| 1430 ml remaining (near-full) | `oil_images/extracted_frames/1430ml_bottle/1430ml_bottle_t0000.00s_f0000.jpg` |

> **Note:** The `1430ml_bottle_t0000.00s_f0000.jpg` file did not exist — choose the first available file in the `1430ml_bottle/` directory instead (e.g. `1430ml_bottle_t0001.00s_f0002.jpg`).

File content:

```typescript
// worker/src/referenceFrames.ts
// Base64-encoded reference frames for few-shot prompting.
// Generated once from oil_images/extracted_frames/ — do not edit manually.
// To regenerate: node scripts/encode_reference_frames.js

export const REFERENCE_FRAMES: Array<{
  remainingMl: number;
  fillDescription: string;
  base64: string;
}> = [
  {
    remainingMl: 165,
    fillDescription: "165ml remaining — small oil pool at base, bottle mostly empty",
    base64: "<BASE64_165ML>",  // replace with actual base64
  },
  {
    remainingMl: 660,
    fillDescription: "660ml remaining — oil at mid-label (Afia heart logo), roughly half full",
    base64: "<BASE64_660ML>",  // replace with actual base64
  },
  {
    remainingMl: 1430,
    fillDescription: "1430ml remaining — oil fills body and neck, small air gap below cap",
    base64: "<BASE64_1430ML>", // replace with actual base64
  },
];
```

**Step 2 — Create `scripts/encode_reference_frames.js`** (run once to populate the base64 constants)

```javascript
#!/usr/bin/env node
// Reads the 3 reference JPEGs and prints the updated referenceFrames.ts to stdout.
// Usage: node scripts/encode_reference_frames.js > worker/src/referenceFrames.ts

const fs = require('fs');
const path = require('path');

const frames = [
  {
    file: 'oil_images/extracted_frames/165ml_bottle/165ml_bottle_t0000.00s_f0000.jpg',
    remainingMl: 165,
    fillDescription: '165ml remaining — small oil pool at base, bottle mostly empty',
  },
  {
    file: 'oil_images/extracted_frames/660ml_bottle/660ml_bottle_t0000.00s_f0000.jpg',
    remainingMl: 660,
    fillDescription: '660ml remaining — oil at mid-label (Afia heart logo), roughly half full',
  },
  {
    // Use first available file since t0000 may not exist for 1430ml
    file: (() => {
      const dir = 'oil_images/extracted_frames/1430ml_bottle';
      const files = fs.readdirSync(dir).filter(f => f.endsWith('.jpg')).sort();
      if (!files.length) throw new Error(`No .jpg files found in ${dir}`);
      return path.join(dir, files[0]);
    })(),
    remainingMl: 1430,
    fillDescription: '1430ml remaining — oil fills body and neck, small air gap below cap',
  },
];

const entries = frames.map(({ file, remainingMl, fillDescription }) => {
  const b64 = fs.readFileSync(file).toString('base64');
  return `  {\n    remainingMl: ${remainingMl},\n    fillDescription: "${fillDescription}",\n    base64: "${b64}",\n  }`;
});

console.log(`// worker/src/referenceFrames.ts
// Auto-generated — do not edit manually.
// Regenerate: node scripts/encode_reference_frames.js > worker/src/referenceFrames.ts

export const REFERENCE_FRAMES: Array<{
  remainingMl: number;
  fillDescription: string;
  base64: string;
}> = [
${entries.join(',\n')}
];
`);
```

**Step 3 — Add shared few-shot builder helper in `worker/src/referenceFrames.ts`**

Add two exported helper functions — one for each API format:

```typescript
// Append to worker/src/referenceFrames.ts

/** Gemini native format: array of inline_data + text parts */
export function buildGeminiFewShotParts(): Array<
  | { inline_data: { mime_type: string; data: string } }
  | { text: string }
> {
  return REFERENCE_FRAMES.flatMap(ref => [
    { inline_data: { mime_type: "image/jpeg", data: ref.base64 } },
    { text: `Reference: ${ref.fillDescription} (${ref.remainingMl}ml remaining out of 1500ml total).` },
  ]);
}

/** OpenAI-compatible format: array of image_url + text content parts */
export function buildOpenAIFewShotParts(): Array<
  | { type: "image_url"; image_url: { url: string } }
  | { type: "text"; text: string }
> {
  return REFERENCE_FRAMES.flatMap(ref => [
    { type: "image_url" as const, image_url: { url: `data:image/jpeg;base64,${ref.base64}` } },
    { type: "text" as const, text: `Reference: ${ref.fillDescription} (${ref.remainingMl}ml remaining out of 1500ml total).` },
  ]);
}
```

**Step 4 — Update `worker/src/providers/gemini.ts`**

```typescript
import { buildGeminiFewShotParts } from "../referenceFrames.ts";

// Replace the contents array in callGemini():
contents: [
  {
    role: "user",
    parts: [
      ...buildGeminiFewShotParts(),
      { text: "Now estimate the fill level for THIS bottle:" },
      { text: userMessage },
      { inline_data: { mime_type: "image/jpeg" as const, data: imageBase64 } },
    ],
  },
],
```

**Step 5 — Update `worker/src/providers/groq.ts`, `openrouter.ts`, `mistral.ts`**

All three use the same OpenAI-compatible `content` array format. In each file:

```typescript
import { buildOpenAIFewShotParts } from "../referenceFrames.ts";

// Replace the user message content array:
{
  role: "user",
  content: [
    ...buildOpenAIFewShotParts(),
    { type: "text", text: "Now estimate the fill level for THIS bottle:" },
    { type: "text", text: userMessage },
    { type: "image_url", image_url: { url: `data:image/jpeg;base64,${imageBase64}` } },
  ],
},
```

**Bundle size check — do this BEFORE encoding the reference frames:**
```bash
npx wrangler deploy --dry-run --outdir dist-check
du -sh dist-check/*.js
```
Record the current bundle size. 3 reference frames × ~80 KB each = ~240 KB will be added. Cloudflare Workers limits: **1 MB compressed** (free plan) or **10 MB** (paid).

**Decision gate:**
- Current bundle < 760 KB → proceed normally.
- Current bundle 760 KB–900 KB → resize reference frames to 400×500 px before encoding (≈ 30–40 KB each, ~120 KB total added):
  ```bash
  convert input.jpg -resize 400x500\> -quality 85 output.jpg
  ```
- Current bundle > 900 KB → also drop the 660 ml mid-fill reference frame (lowest ROI: near-full accuracy is the primary target, mid-fill is already well-estimated). Proceed with 2 reference frames only (165 ml + 1430 ml).
- Current bundle > 960 KB (resized, 2 frames) → do NOT proceed with few-shot embedding. File a separate task to host reference frames in R2 or reduce the worker bundle size first.

---

#### Task 6 — Tighten frontend quality thresholds in `cameraQualityAssessment.ts`

**File:** [src/utils/cameraQualityAssessment.ts](src/utils/cameraQualityAssessment.ts)

**Change 1 — Blur thresholds** in `generateGuidanceMessage()` (lines 356 and 363):

```typescript
// BEFORE:
if (blurScore < 40) { ... 'error' }
if (blurScore < 60) { ... 'warning' }

// AFTER:
if (blurScore < 30) { ... 'error' }   // only block on very blurry (bottle outline truly indistinct)
if (blurScore < 45) { ... 'warning' } // less aggressive warning
```

**Change 2 — Lighting threshold** in `assessLighting()` (line 256):

```typescript
// BEFORE:
if (brightness < 60) {
  status = 'too-dark';
  isAcceptable = false;
}

// AFTER:
if (brightness < 40) {
  status = 'too-dark';
  isAcceptable = false;
}
```

Rationale: The existing mean-brightness calculation averages the entire frame. A dark background with a well-lit bottle gives a low mean even though the subject is fine. Reducing the threshold to < 40 reserves the flag for truly dark scenes where the bottle itself is unilluminated.

> **Empirical basis note:** The specific values (30/45 for blur, 40 for brightness) are conservative adjustments relative to the reported failure mode (dark-background/clear-subject images). For a more precise calibration, capture the `blurScore` and `brightness` readings from the three failing reference photos by temporarily logging them in `assessImageQuality()`, then set the thresholds just below the lowest clean-image reading. If the clean images score blurScore ≈ 48–55 and brightness ≈ 55–75, the values above are appropriate; adjust if readings differ significantly.

---

### Acceptance Criteria

**AC-1: Calibration table corrects volume for mid-range fill levels**

*Given* a bottle with 1390 ml remaining (110 ml consumed, fill height ≈ 85%),  
*When* the AI returns `fillPercentage: 85`,  
*Then* `calculateRemainingMl(85, 1500, bottle.geometry)` returns a value between **1382–1412 ml**.  
> Derivation: fillHeightPct=85 interpolates between table points 83→1375 and 88→1430. t = (85−83)/(88−83) = 0.4. Expected = 1375 + 0.4×55 = **1397 ml**. Range is ±15 ml around this value.

*Given* a bottle with 1335 ml remaining (165 ml consumed, fill height ≈ 79%),  
*When* the AI returns `fillPercentage: 79`,  
*Then* `calculateRemainingMl(79, 1500, bottle.geometry)` returns a value between **1316–1346 ml**.  
> Derivation: fillHeightPct=79 interpolates between 78→1320 and 83→1375. t = (79−78)/(83−78) = 0.2. Expected = 1320 + 0.2×55 = **1331 ml**. Range is ±15 ml.

**AC-2: Calibration table is monotonically correct at all data points**

*Given* each of the **28** calibration points `{fillHeightPct, remainingMl}` in the table,  
*When* `calculateRemainingMl(fillHeightPct, 1500, bottle.geometry)` is called,  
*Then* the result equals `remainingMl` (exact match, within floating-point rounding).

**AC-3: Interpolation between calibration points is monotonic**

*Given* any two adjacent calibration points `P_i` and `P_{i+1}`,  
*When* `calculateRemainingMl()` is called with a `fillHeightPct` between them,  
*Then* the result is strictly between `P_i.remainingMl` and `P_{i+1}.remainingMl`.

**AC-4: Worker uses calibration-aware formula**

*Given* a scan request with a valid image of the `afia-corn-1.5l` bottle,  
*When* the AI returns `fillPercentage: 85`,  
*Then* the API response `remainingMl` field equals `Math.round(calculateRemainingMl(85, 1500, geometry))` — NOT `Math.round(1500 × 0.85)`.

**AC-5: Cache-hit path also uses calibration**

*Given* a cached scan result with `fillPercentage: 85`,  
*When* the cache-hit branch (inside `if (cached) {`) in `analyze.ts` is executed,  
*Then* `remainingMl` in the response is calibration-corrected (same as AC-4).

*Unit test:* Mock the KV `.get()` to return a cached `{llmResult: {fillPercentage: 85}, aiProvider: "gemini"}`. Assert the response `remainingMl` equals `Math.round(calculateRemainingMl(85, 1500, geometry))` and NOT `Math.round(1500 × 0.85) = 1275`.

**AC-6: Frontend volume calculator unchanged at call sites**

*Given* any existing call to `calculateVolumes()` or `calculateRemainingMl()` in `src/`,  
*When* this change is deployed,  
*Then* the function signatures and return types are identical (re-export is transparent).

**AC-7: AI does not false-positive on quality issues for well-lit clear images**

*Given* the user's three reference photos (bottles with 55/110/165 ml consumed — all nearly full, clearly photographed in reasonable lighting),  
*When* the AI processes them with the updated prompt,  
*Then* `imageQualityIssues` does NOT contain `"blur"` or `"poor_lighting"` for any of these images.

**AC-7b (manual test): Few-shot images improve near-full accuracy**

> This AC is non-deterministic (LLM output varies) and cannot be automated. Execute manually against each active provider after deploying Task 5b.

*Manual test procedure:*
1. Send the reference photo of the bottle with 110 ml consumed to each provider (Gemini, Groq, OpenRouter, Mistral) using the updated prompt with few-shot images.
2. Record the returned `fillPercentage`.
3. Pass condition: `fillPercentage ≥ 89` → `remainingMl ≥ 1335` (within ±55 ml of actual 1390 ml).
4. Repeat with the 165 ml consumed photo. Pass: `fillPercentage ≥ 86` → `remainingMl ≥ 1290`.
5. Compare against baseline (same photos sent with old prompt, no few-shot images) to confirm improvement.

Record results in a comment on the PR.

**AC-8: Frontend does not show blur/lighting warnings for clear images**

*Given* a live camera feed of the Afia bottle in normal indoor lighting (brightness ≈ 80–160, blurScore ≈ 45–80),  
*When* `assessImageQuality()` is called,  
*Then* `guidanceType` is `'success'` or `'warning'` (not `'error'`), and `isGoodQuality` is `true`.

---

## Additional Context

### Dependencies

- No new npm packages required.
- No Supabase schema changes.
- No Cloudflare Worker environment variable changes.
- TypeScript: The new `calibrated` shape is a discriminated union member — existing code that switches on `geometry.shape` will need to handle `"calibrated"` or fall through to default. Check for any exhaustive `switch` on `geometry.shape` outside the files listed above.

### Testing Strategy

1. **Unit test `calculateRemainingMl()` with calibrated geometry** — test all 28 calibration points return exact values; test 5 interpolated mid-points (including fillHeightPct=85 → expect 1397 ml and fillHeightPct=79 → expect 1331 ml from AC-1 derivations); test boundary conditions (0%, 100%, values outside table range).

2. **Regression test the linear formula is preserved** — for `shape: "cylinder"`, existing behavior (`totalVolumeMl × fillPct/100`) unchanged.

3. **Manual prompt test** — send the three reference images (55ml/110ml/165ml consumed) to Gemini with the new prompt. Verify `imageQualityIssues` array is empty or contains only `"reflection"` at most.

4. **Worker integration test** — POST to `/analyze` with a captured JPEG at known fill levels; verify `remainingMl` is within ±55 ml of ground truth.

### Notes

- **Calibration table values are initial estimates — must be validated before merge.** Derived from visual inspection; not yet confirmed against physical pixel measurements. The table correctness is the load-bearing assumption for Bug 1's fix. Validation gate: run `calculateRemainingMl(85, 1500, geometry)` after Task 1 and confirm result lands between 1382–1412 ml. If outside that range, pixel-measure the oil surface in the 1375/1430/1485 ml reference frames (use ImageMagick `convert frame.jpg -format "%[fx:100*h]" info:` or Python PIL to find the yellow-oil top row) and correct the `fillHeightPct` entries at those levels.

- **`encode_reference_frames.js` and CI:** The script is run once locally to generate `worker/src/referenceFrames.ts`. The generated file must be committed to git — it is not regenerated in CI. Source JPEGs must exist at the paths specified in the script (relative to project root). If a collaborator clones the repo without the `oil_images/` directory (e.g., `.gitignore` excludes large files), they must re-run the script after restoring those images. Document this in the project README or `worker/src/referenceFrames.ts` file header comment.

- **Near-full accuracy limitation**: Cases 1 (55 ml consumed) and 3 (165 ml consumed) have the AI misreading fill height itself (not just the conversion). The calibration table (Task 1–4) fixes the conversion error; the few-shot images (Task 5b) attack the misread directly. Together they should resolve all three error cases. If near-full accuracy is still insufficient after deployment, the next step is to add more reference frames at 1375–1500 ml levels (the 5 frames in that range provide a denser anchor).

- **Calibration table is a temporary shim:** The `calibrated` shape and interpolation logic in `shared/volumeCalculator.ts` are permanent infrastructure, but the specific 28-point table for `afia-corn-1.5l` is a stop-gap until a trained CV model replaces the Gemini API. When the local model is deployed, the bottle entry should be updated to `shape: "cylinder"` (the model outputs volume directly) and the `calibrationPoints` array removed. The shared infrastructure stays; only the registry entry changes.

- **Future: replace Gemini with a fine-tuned local model**: `oil_images/augmented_frames/` already contains 8,206 labeled images (300 per class) generated by `scripts/afia_augment.py`. This is sufficient to fine-tune a lightweight regression model (MobileNetV2 / EfficientNet-B0) that directly outputs remaining ml — bypassing Gemini entirely. This maps to the "500+ scans → fine-tune Qwen2.5-VL" milestone in the PRD, but can be accelerated using the existing augmented dataset. When ready, the model would be exported to ONNX and run in the Cloudflare Worker via WASM (ONNX Runtime Web).

- **Bottle shape note**: The Afia 1.5L jug has a distinctive square-ish cross-section at the body (not circular). The neck is roughly circular. The `heightMm: 270` in the bottle registry represents total bottle height including cap — the AI should measure from the base to the oil surface only.

- **Arabic UI strings**: No user-facing copy changes in this spec.
