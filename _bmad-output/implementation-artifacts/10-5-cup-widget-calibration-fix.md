# Story 10.5: Cup-Unit Calibration Fix & Dead Code Removal

Status: done

## Story

As a **user viewing oil consumption on the result screen**,
I want **cup quantities to show correct values (220ml = 1 cup)**,
so that **I see accurate portion sizes when planning how much oil I'm about to use**.

## Business Context

The canonical cup calibration confirmed by Ahmed 2026-04-25:
- 55ml = ¼ cup (smallest unit, 1 slider step)
- 110ml = ½ cup (2 steps)
- 165ml = ¾ cup (3 steps)
- 220ml = 1 full cup (4 steps)

`FillConfirmScreen/CupVisualization.tsx` already uses the **correct** calibration (220ml = 1 cup).
`ResultDisplay.tsx` (the active post-confirmation result screen, used in App.tsx) uses the **wrong**
calibration: `halfCups = Math.floor(sliderValue/55); fullCups = Math.floor(halfCups/2)` which yields
1 cup = 110ml. This shows users double the correct cup count.

Additionally, two dead code files with wrong calibration exist and should be deleted:
- `src/components/FillConfirm.tsx` (old screen, not imported by App.tsx)
- `src/components/CupVisualization.tsx` (old component with 110ml=1cup logic)

## Acceptance Criteria

### AC1 — ResultDisplay shows correct cup counts

```
GIVEN the user has confirmed 440ml of oil on FillConfirmScreen
WHEN ResultDisplay renders with sliderValue=440ml
THEN the cup display shows 2 full-cup icons (not 4)
AND the summary text shows "2 cups" (not "4 cups")

GIVEN sliderValue=220ml
THEN the cup display shows 1 full-cup icon
AND the summary text shows "1 Cup"

GIVEN sliderValue=110ml
THEN the display shows ½-cup icon + "½ Cup" text
AND no full-cup icon renders

GIVEN sliderValue=55ml
THEN the display shows ¼-cup icon + "¼ Cup" text
```

### AC2 — Dead code removed

```
GIVEN the build runs (npm run build)
WHEN src/components/FillConfirm.tsx and src/components/CupVisualization.tsx are deleted
THEN the build succeeds with zero TypeScript errors
AND no imports reference the deleted files
```

### AC3 — FillConfirmScreen/CupVisualization unit tests

```
GIVEN src/test/CupVisualization.test.tsx exists
WHEN npm run test runs
THEN all ≥ 7 test cases pass:
  - 0ml   → renders "0 cups" text
  - 55ml  → renders "1/4 Cup" text + one icon
  - 110ml → renders "1/2 Cup" text + one icon
  - 165ml → renders "3/4 Cup" text + one icon
  - 220ml → renders "1 Cup" text + one icon
  - 440ml → renders "2 cups" text + two icons
  - 275ml → renders "1 1/4 cups" text + two icons (1 full + 1 partial)
```

### AC4 — No regression

```
GIVEN npm run test runs after all changes
THEN all pre-existing tests pass (zero failures introduced)
```

## Tasks / Subtasks

- [x] Task 1: Fix cup calibration in ResultDisplay.tsx (AC: #1)
  - [x] 1.1: Replace lines 160–163 (wrong calibration block) with correct quarter-cup math:
    ```ts
    const totalQuarters = Math.round(sliderValue / 55);
    const fullCups = Math.floor(totalQuarters / 4);
    const remQuarters = totalQuarters % 4;  // 0–3
    const hasPartialCup = remQuarters > 0;
    const fractionLabel = ['', '¼', '½', '¾'][remQuarters];
    ```
  - [x] 1.2: Add `quarter` and `three-quarters` fill states to the inline `CupIcon` function
    in ResultDisplay.tsx (lines ~30–58). Currently only `full` and `half` are handled.
    Add SVG fill paths for `quarter` (bottom-25%) and `three-quarters` (bottom-75%) states
    matching the pattern used in `FillConfirmScreen/CupIcon.tsx`.
  - [x] 1.3: Update the cup-icon render in the slider area (line ~251):
    - Replace `{hasHalfCup && <CupIcon fill="half" size={28} />}`
    - With: `{hasPartialCup && <CupIcon fill={remQuarters===1 ? "quarter" : remQuarters===2 ? "half" : "three-quarters"} size={28} />}`
  - [x] 1.4: Update the summary text (line ~267):
    - Old: `` `${fullCups} ${hasHalfCup ? '+ 1/2' : ''} ${t('common.cups')}` ``
    - New: `` `${fullCups}${fractionLabel ? ` ${fractionLabel}` : ''} ${(fullCups + (hasPartialCup ? 1 : 0)) === 1 ? t('common.cup') : t('common.cups')}` ``
    - Edge case: 0 cups → `0 ${t('common.cups')}` unchanged

- [x] Task 2: Remove dead code files (AC: #2)
  - [x] 2.1: Delete `src/components/FillConfirm.tsx`
  - [x] 2.2: Delete `src/components/FillConfirm.css` (if it exists)
  - [x] 2.3: Delete `src/components/CupVisualization.tsx`
  - [x] 2.4: Delete `src/components/CupVisualization.css` (if it exists)
  - [x] 2.5: Run `grep -r "from.*FillConfirm[^S]"` and `grep -r "from.*CupVisualization"` to confirm no remaining imports of deleted files
  - [x] 2.6: Run `npm run build` to confirm zero TypeScript errors

- [x] Task 3: Add unit tests for FillConfirmScreen/CupVisualization (AC: #3)
  - [x] 3.1: Create `src/test/CupVisualization.test.tsx`
  - [x] 3.2: Implement the 7 test cases listed in AC3
  - [x] 3.3: Run `npm run test` — all new tests must pass

- [x] Task 4: Confirm no regression (AC: #4)
  - [x] 4.1: Run full `npm run test` suite — zero new failures

## Dev Notes

### Component to touch

| File | Change |
|---|---|
| `src/components/ResultDisplay.tsx` | Fix lines 160–163 + add quarter/three-quarters to inline CupIcon |
| `src/components/FillConfirm.tsx` | **DELETE** (dead code — not imported by App.tsx) |
| `src/components/FillConfirm.css` | **DELETE if exists** |
| `src/components/CupVisualization.tsx` | **DELETE** (old 110ml=1cup version) |
| `src/components/CupVisualization.css` | **DELETE if exists** |
| `src/test/CupVisualization.test.tsx` | **CREATE** (new test file) |

### DO NOT touch these files

- `src/components/FillConfirmScreen/CupVisualization.tsx` — already correct (220ml=1cup), used by App.tsx
- `src/components/FillConfirmScreen/CupIcon.tsx` — already correct, has all 4 fill states
- `src/components/FillConfirmScreen/FillConfirmScreen.tsx` — already correct

### Correct cup math (canonical)

```ts
const ML_PER_STEP = 55;
const STEPS_PER_CUP = 4;

const totalQuarters = Math.round(sliderValue / ML_PER_STEP);
const fullCups      = Math.floor(totalQuarters / STEPS_PER_CUP);
const remQuarters   = totalQuarters % STEPS_PER_CUP;   // 0, 1, 2, or 3
const fractionLabel = ['', '¼', '½', '¾'][remQuarters]; // '' | '¼' | '½' | '¾'
const hasPartialCup = remQuarters > 0;
```

### CupIcon fill states needed in ResultDisplay.tsx

ResultDisplay.tsx has its own inline `CupIcon` (lines ~30–58) that only handles `full` and `half`.
Add `quarter` and `three-quarters` — copy the SVG paths from `FillConfirmScreen/CupIcon.tsx`:

```tsx
// In ResultDisplay.tsx's inline CupIcon function — add these fill cases:
{fill === "quarter" && (
  <path d="M7.5 16 L16.5 16 L16 20 L8 20 Z" fill={fillColor} />
)}
{fill === "three-quarters" && (
  <path d="M6.5 8 L17.5 8 L16 20 L8 20 Z" fill={fillColor} />
)}
```

The inline CupIcon uses identical SVG geometry (`viewBox="0 0 24 24"`, trapezoid body, handle on right),
so the paths from `FillConfirmScreen/CupIcon.tsx` drop in directly.

### Verification table

| sliderValue | totalQuarters | fullCups | remQuarters | fractionLabel | expected display |
|---|---|---|---|---|---|
| 55ml | 1 | 0 | 1 | ¼ | ¼ Cup (1 partial icon) |
| 110ml | 2 | 0 | 2 | ½ | ½ Cup (1 partial icon) |
| 165ml | 3 | 0 | 3 | ¾ | ¾ Cup (1 partial icon) |
| 220ml | 4 | 1 | 0 | (none) | 1 Cup (1 full icon) |
| 275ml | 5 | 1 | 1 | ¼ | 1 ¼ cups (1 full + 1 partial) |
| 440ml | 8 | 2 | 0 | (none) | 2 cups (2 full icons) |

### Test file template (src/test/CupVisualization.test.tsx)

```tsx
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { CupVisualization } from "../components/FillConfirmScreen/CupVisualization";

describe("CupVisualization — cup calibration 220ml = 1 cup", () => {
  it("0ml → '0 cups'", () => {
    render(<CupVisualization waterMl={0} />);
    expect(screen.getByText(/0\s*cups/i)).toBeInTheDocument();
  });

  it("55ml → '1/4 Cup' (one partial icon)", () => {
    render(<CupVisualization waterMl={55} />);
    expect(screen.getByText(/1\/4\s*cup/i)).toBeInTheDocument();
  });

  it("110ml → '1/2 Cup'", () => {
    render(<CupVisualization waterMl={110} />);
    expect(screen.getByText(/1\/2\s*cup/i)).toBeInTheDocument();
  });

  it("165ml → '3/4 Cup'", () => {
    render(<CupVisualization waterMl={165} />);
    expect(screen.getByText(/3\/4\s*cup/i)).toBeInTheDocument();
  });

  it("220ml → '1 Cup' (one full icon)", () => {
    render(<CupVisualization waterMl={220} />);
    expect(screen.getByText(/^1\s*cup$/i)).toBeInTheDocument();
  });

  it("440ml → '2 cups' (two full icons)", () => {
    render(<CupVisualization waterMl={440} />);
    expect(screen.getByText(/2\s*cups/i)).toBeInTheDocument();
    const { container } = render(<CupVisualization waterMl={440} />);
    const svgs = container.querySelectorAll("svg");
    expect(svgs.length).toBe(2);
  });

  it("275ml → '1 1/4 cups' (1 full + 1 partial icon)", () => {
    const { container } = render(<CupVisualization waterMl={275} />);
    expect(screen.getByText(/1\s*1\/4\s*cups/i)).toBeInTheDocument();
    const svgs = container.querySelectorAll("svg");
    expect(svgs.length).toBe(2);
  });
});
```

Note: `useTranslation` is mocked globally in `src/test/setup.ts` — no i18n wrapper needed in tests.

### i18n key verification

Required keys in `src/i18n/locales/en/translation.json`:
- `common.cup` → "Cup" ✅ (confirmed present)
- `common.cups` → "cups" ✅ (confirmed present)

If Arabic translations are missing `common.cup` / `common.cups`, add them in `src/i18n/locales/ar/translation.json`.

### Project Structure Notes

- Tests for FillConfirmScreen components follow the `src/test/` pattern (see `VerticalStepSlider.test.tsx`)
- `src/test/setup.ts` handles i18n mock and canvas mock globally
- No additional vitest config needed

### References

- Correct calibration: `memory/project_cup_unit_calibration.md`
- PRD FR22/FR43 (corrected 2026-04-25): `_bmad-output/planning-artifacts/prd.md`
- FillConfirmScreen cup implementation (reference): `src/components/FillConfirmScreen/CupVisualization.tsx`
- FillConfirmScreen cup icons (reference): `src/components/FillConfirmScreen/CupIcon.tsx`
- Test setup: `src/test/setup.ts`

## Review Findings

- [ ] [Review][Decision] SVG fill paths for quarter/three-quarters may not accurately represent proportional fill heights — The spec prescribed paths `M7.5 16 L16.5 16 L16 20 L8 20 Z` (quarter) and `M6.5 8 L17.5 8 L16 20 L8 20 Z` (three-quarters). The cup body spans y=6–20. Quarter's trapezoid covers only the bottom 4 units (y=16–20, ~29% height). Three-quarters uses y=8 as top edge — not geometrically 75% of the cup. The RTL mirror flips x-coordinates but does not move the handle. Raised by Edge Case Hunter (ECH-4/5/6) and Blind Hunter (BH-3/4). Decision: accept as visual approximation, or fix geometry to match proportional cup height. [`src/components/ResultDisplay.tsx:77-85`]
- [x] [Review][Patch] "0 ¼ cup" displayed when fullCups=0 + fraction — fixed: extracted `cupPrefix` variable that omits the "0" prefix when `fullCups===0`; rendered label now correctly shows `"¼ Cup"`, `"½ Cup"`, `"¾ Cup"` for sub-cup fractions. [`src/components/ResultDisplay.tsx:277`]
- [x] [Review][Patch] 440ml test double-renders CupVisualization — fixed: consolidated to a single `render()` call; `container` destructured from that render so SVG count assertion checks the correct DOM. [`src/test/CupVisualization.test.tsx:32-37`]
- [x] [Review][Defer] Math.round vs Math.floor for totalQuarters [`src/components/ResultDisplay.tsx:169`] — deferred; slider step="55" constrains values to multiples of 55; rounding is safe for all reachable slider values
- [x] [Review][Defer] fractionLabel array lacks explicit bounds guard [`src/components/ResultDisplay.tsx:173`] — deferred; remQuarters = totalQuarters % 4 guarantees values 0–3 for all valid slider inputs
- [x] [Review][Defer] Plural/singular formula fragility (counts fullCups+1 for singularity check) [`src/components/ResultDisplay.tsx:277`] — deferred; produces correct English output for all valid cases; cosmetic only
- [x] [Review][Defer] maxSliderValue=0 when remaining.ml < 55ml forces "0 cups" display [`src/components/ResultDisplay.tsx:166`] — deferred; pre-existing design choice, not introduced by this story

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6 (2026-04-25)

### Debug Log References

None — clean implementation, no issues.

### Completion Notes List

- ✅ Fixed `ResultDisplay.tsx` cup math: replaced `halfCups/fullCups/hasHalfCup` (110ml=1cup) with correct `totalQuarters/fullCups/remQuarters/hasPartialCup/fractionLabel` (220ml=1cup)
- ✅ Extended inline `CupIcon` in `ResultDisplay.tsx` to support all 4 fill states: `quarter`, `half`, `three-quarters`, `full` — both LTR and RTL SVG paths
- ✅ Updated cup icon render to use `remQuarters`-based fill selection for partial cup
- ✅ Updated summary text to use `¼/½/¾` fraction labels and correct singular/plural (`common.cup` / `common.cups`)
- ✅ Deleted 4 dead code files: `FillConfirm.tsx`, `FillConfirm.css`, `CupVisualization.tsx`, `CupVisualization.css`
- ✅ Created `src/test/CupVisualization.test.tsx` with 7 test cases (0ml, 55ml, 110ml, 165ml, 220ml, 440ml, 275ml)
- ✅ Full test suite: 483 tests pass, 31 skipped (integration tests requiring live worker) — zero regressions
- ✅ TypeScript type check: zero errors

### File List

- Modified: `src/components/ResultDisplay.tsx`
- Deleted: `src/components/FillConfirm.tsx`
- Deleted: `src/components/FillConfirm.css`
- Deleted: `src/components/CupVisualization.tsx`
- Deleted: `src/components/CupVisualization.css`
- Created: `src/test/CupVisualization.test.tsx`

### Change Log

- 2026-04-25: Fixed ResultDisplay.tsx cup calibration (220ml=1cup), added quarter/three-quarters CupIcon fill states, deleted dead code (FillConfirm + CupVisualization from src/components/), added CupVisualization unit tests (7 cases). 483/483 tests passing.
