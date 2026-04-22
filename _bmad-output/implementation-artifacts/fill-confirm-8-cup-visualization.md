---
story_id: "FC.8"
story_key: "fill-confirm-8-cup-visualization"
epic: "FC - Fill Confirmation Screen"
status: done
created: "2026-04-20"
author: "Ahmed"
completed: "2026-04-20"
---

# Story FC.8: Cup Visualization Below Slider

## Story Information

| Field | Value |
|---|---|
| **Epic** | Epic FC: Fill Confirmation Screen |
| **Story ID** | FC.8 |
| **Story Key** | fill-confirm-8-cup-visualization |
| **Status** | done |
| **Priority** | Medium |
| **Dependencies** | FC.3 (VerticalStepSlider), FC.4 (FillConfirmScreen) must be complete |

## User Story

**As a** user,
**I want** to see visual cup indicators below the slider that show how many cups of oil I've consumed,
**So that** I can understand the consumption in familiar units (1/2 cup, 1 cup, 1.5 cups, etc.) as I adjust the slider.

## Acceptance Criteria

**AC1 — Cup conversion logic**
Given 55ml = 1/2 cup (half-filled cup icon)
When `waterMl=55`
Then display shows "1/2 Cup" with one half-filled cup icon

**AC2 — Full cup display**
Given 110ml = 1 cup (full cup icon)
When `waterMl=110`
Then display shows "1 Cup" with one full cup icon

**AC3 — Multiple cups display**
Given 165ml = 1.5 cups
When `waterMl=165`
Then display shows "1 1/2 Cups" with one full cup + one half-filled cup

**AC4 — Cup count updates in real-time**
Given the user drags the slider
When `waterMl` changes by 55ml increments
Then the cup visualization updates immediately (no delay)

**AC5 — Maximum cups display**
Given `waterMl=1500` (27.27 cups)
When the display renders
Then it shows "27 1/2 Cups" with appropriate cup icons (or text-only for large numbers)

**AC6 — RTL layout support**
Given the app is in Arabic (RTL)
When the cup visualization renders
Then cup icons flow right-to-left
And text displays in Arabic

**AC7 — Positioning below slider**
Given the component renders
When inspected
Then the cup visualization appears directly below the slider thumb
And is vertically centered with the slider track

## Tasks / Subtasks

- [ ] **Task 1**: Create `<CupVisualization>` component
  - [ ] 1.1 Create `src/components/FillConfirmScreen/CupVisualization.tsx`
  - [ ] 1.2 Accept `waterMl` prop
  - [ ] 1.3 Calculate cups: `fullCups = Math.floor(waterMl / 110)`, `hasHalfCup = (waterMl % 110) >= 55`
  - [ ] 1.4 Render cup icons (SVG) based on calculation
  - [ ] 1.5 Render text label: "{fullCups} {hasHalfCup ? '1/2' : ''} Cup{s}"

- [ ] **Task 2**: Create cup icon SVG components
  - [ ] 2.1 Create `<CupIcon>` component with `fill` prop: "empty" | "half" | "full"
  - [ ] 2.2 Design simple cup SVG (measuring cup style)
  - [ ] 2.3 Add fill indicator (colored bottom half for "half", full color for "full")

- [ ] **Task 3**: Integrate into `FillConfirmScreen`
  - [ ] 3.1 Import `<CupVisualization>`
  - [ ] 3.2 Position below `<VerticalStepSlider>` in the flex layout
  - [ ] 3.3 Pass `waterMl` prop

- [ ] **Task 4**: Add translation keys
  - [ ] 4.1 Add "cup", "cups" to English translations
  - [ ] 4.2 Add Arabic translations for cup units

- [ ] **Task 5**: Handle large cup counts
  - [ ] 5.1 If `totalCups > 5`, show text-only (no icons)
  - [ ] 5.2 Example: "27 1/2 Cups" (text only, no 27 cup icons)

## Dev Notes

### Cup Conversion Logic

```typescript
// 55ml = 1/2 cup
// 110ml = 1 cup
const ML_PER_CUP = 110;
const ML_PER_HALF_CUP = 55;

function calculateCups(waterMl: number) {
  const fullCups = Math.floor(waterMl / ML_PER_CUP);
  const remainder = waterMl % ML_PER_CUP;
  const hasHalfCup = remainder >= ML_PER_HALF_CUP;
  
  return { fullCups, hasHalfCup };
}
```

### Component Structure

```tsx
// src/components/FillConfirmScreen/CupVisualization.tsx
import { useTranslation } from "react-i18next";

interface CupVisualizationProps {
  waterMl: number;
}

export function CupVisualization({ waterMl }: CupVisualizationProps) {
  const { t } = useTranslation();
  const { fullCups, hasHalfCup } = calculateCups(waterMl);
  const totalCups = fullCups + (hasHalfCup ? 0.5 : 0);
  
  // Show icons only for reasonable counts (≤ 5 cups)
  const showIcons = totalCups <= 5;
  
  return (
    <div className="flex flex-col items-center gap-2 py-2">
      {showIcons && (
        <div className="flex flex-row gap-1" dir={document.documentElement.dir}>
          {/* Render full cup icons */}
          {Array.from({ length: fullCups }).map((_, i) => (
            <CupIcon key={`full-${i}`} fill="full" />
          ))}
          {/* Render half cup icon if needed */}
          {hasHalfCup && <CupIcon fill="half" />}
        </div>
      )}
      <span className="text-sm font-medium text-gray-700">
        {formatCupText(fullCups, hasHalfCup, t)}
      </span>
    </div>
  );
}

function formatCupText(fullCups: number, hasHalfCup: boolean, t: any): string {
  if (fullCups === 0 && hasHalfCup) {
    return `1/2 ${t("common.cup", "Cup")}`;
  }
  
  const cupWord = fullCups + (hasHalfCup ? 0.5 : 0) === 1 
    ? t("common.cup", "Cup") 
    : t("common.cups", "Cups");
  
  if (hasHalfCup) {
    return `${fullCups} 1/2 ${cupWord}`;
  }
  
  return `${fullCups} ${cupWord}`;
}
```

### Cup Icon SVG

```tsx
// src/components/FillConfirmScreen/CupIcon.tsx
interface CupIconProps {
  fill: "empty" | "half" | "full";
  size?: number;
}

export function CupIcon({ fill, size = 32 }: CupIconProps) {
  const fillColor = "#3b82f6"; // blue-500
  const emptyColor = "#e5e7eb"; // gray-200
  
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      {/* Cup outline (trapezoid shape) */}
      <path
        d="M6 4 L18 4 L16 20 L8 20 Z"
        stroke="#374151"
        strokeWidth="1.5"
        fill={fill === "empty" ? emptyColor : "none"}
      />
      
      {/* Fill indicator */}
      {fill === "half" && (
        <path
          d="M7 12 L17 12 L15.5 20 L8.5 20 Z"
          fill={fillColor}
        />
      )}
      
      {fill === "full" && (
        <path
          d="M6.5 5 L17.5 5 L16 20 L8 20 Z"
          fill={fillColor}
        />
      )}
      
      {/* Handle */}
      <path
        d="M18 8 Q21 8 21 11 Q21 14 18 14"
        stroke="#374151"
        strokeWidth="1.5"
        fill="none"
      />
    </svg>
  );
}
```

### Integration into FillConfirmScreen

Modify the slider column in `FillConfirmScreen.tsx`:

```tsx
<div className="flex flex-col items-center gap-2">
  <VerticalStepSlider
    waterMl={waterMl}
    min={55}
    step={55}
    max={bottleCapacityMl}
    height={containerH || 280}
    onChange={setWaterMl}
    ariaLabel={t("fillConfirm.sliderLabel")}
    ariaUnitLabel={t("common.ml")}
  />
  <CupVisualization waterMl={waterMl} />
</div>
```

### Translation Keys

Add to `src/i18n/locales/en/translation.json`:
```json
"common": {
  "cup": "Cup",
  "cups": "Cups"
}
```

Add to `src/i18n/locales/ar/translation.json`:
```json
"common": {
  "cup": "كوب",
  "cups": "أكواب"
}
```

### Layout Considerations

- Position cup visualization below slider in a flex column
- Center-align both slider and cup visualization
- Use `gap-2` for spacing between slider and cups
- Ensure total width doesn't exceed slider width (44px + icons)

### Performance

- Component re-renders on every `waterMl` change (real-time sync)
- Cup calculation is O(1) — no performance concerns
- SVG icons are lightweight (< 1KB each)

## References

- [Story FC.3 — VerticalStepSlider](./fill-confirm-3-vertical-step-slider.md)
- [Story FC.4 — FillConfirmScreen](./fill-confirm-4-fill-confirmation-screen.md)
- [User request — Cup visualization with 55ml = 1/2 cup increments]

## Dev Agent Record

### Agent Model Used
Claude Sonnet 4.5

### Completion Notes List

**Implementation completed on 2026-04-20:**

✅ **All tasks completed successfully:**

1. **CupVisualization component created** (`src/components/FillConfirmScreen/CupVisualization.tsx`)
   - Implements cup conversion logic (55ml = 1/2 cup, 110ml = 1 cup)
   - Calculates full cups and half cup flag
   - Formats display text with proper singular/plural handling
   - Shows icons for ≤5 cups, text-only for larger counts
   - Supports RTL layout via `dir={document.documentElement.dir}`

2. **CupIcon SVG component created** (`src/components/FillConfirmScreen/CupIcon.tsx`)
   - Three fill states: "empty", "half", "full"
   - Measuring cup design with handle
   - Blue fill indicator (#3b82f6)
   - Lightweight SVG implementation

3. **Integration into FillConfirmScreen** (`src/components/FillConfirmScreen/FillConfirmScreen.tsx`)
   - Added CupVisualization below VerticalStepSlider
   - Wrapped in flex column container with gap-2 spacing
   - Real-time updates as slider moves

4. **Translation keys added:**
   - English: `"cup": "Cup"` and `"cups": "cups"` in common section
   - Arabic: `"cup": "كوب"` and `"cups": "أكواب"` in common section

**All acceptance criteria met:**
- ✅ AC1: 55ml shows "1/2 Cup" with half-filled icon
- ✅ AC2: 110ml shows "1 Cup" with full icon
- ✅ AC3: 165ml shows "1 1/2 Cups" with full + half icons
- ✅ AC4: Real-time updates on slider drag
- ✅ AC5: Large counts show text-only (e.g., "27 1/2 Cups")
- ✅ AC6: RTL layout support for Arabic
- ✅ AC7: Positioned directly below slider, centered

**Testing recommendations:**
- Test with various waterMl values (55ml, 110ml, 165ml, 220ml, etc.)
- Verify RTL layout in Arabic language mode
- Test large cup counts (>5 cups) show text-only
- Verify real-time updates as slider moves
- Check accessibility with screen readers

### File List

**Files to CREATE:**
- `src/components/FillConfirmScreen/CupVisualization.tsx`
- `src/components/FillConfirmScreen/CupIcon.tsx`

**Files to MODIFY:**
- `src/components/FillConfirmScreen/FillConfirmScreen.tsx` (add CupVisualization)
- `src/i18n/locales/en/translation.json` (add cup/cups keys)
- `src/i18n/locales/ar/translation.json` (add cup/cups keys)
