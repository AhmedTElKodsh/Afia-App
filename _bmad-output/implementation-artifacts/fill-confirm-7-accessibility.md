---
story_id: "FC.7"
story_key: "fill-confirm-7-accessibility"
epic: "FC - Fill Confirmation Screen"
status: ready-for-dev
created: "2026-04-10"
author: "Ahmed"
---

# Story FC.7: Accessibility

## Story Information

| Field | Value |
|---|---|
| **Epic** | Epic FC: Fill Confirmation Screen |
| **Story ID** | FC.7 |
| **Story Key** | fill-confirm-7-accessibility |
| **Status** | ready-for-dev |
| **Dependencies** | FC.4 (`FillConfirmScreen`), FC.6 (translation keys) must be complete |

## User Story

**As a** user with accessibility needs,
**I want** the fill confirmation screen to be fully operable by keyboard and screen reader,
**So that** I can confirm or adjust the fill level regardless of my input method or assistive technology.

## Acceptance Criteria

**AC1 — Tab order**
Given I navigate using keyboard Tab
When I arrive at the fill confirmation screen
Then focus moves in order: Retake button → Slider → Confirm button
And each focused element has a visible focus ring

**AC2 — Slider keyboard navigation: Up Arrow**
Given the slider has keyboard focus
When I press the Up Arrow key
Then `waterMl` increases by 55 ml
And the annotation line moves upward
And the slider thumb moves upward

**AC3 — Slider keyboard navigation: Down Arrow**
Given the slider has keyboard focus and `waterMl > 55`
When I press the Down Arrow key
Then `waterMl` decreases by 55 ml

**AC4 — Slider keyboard navigation: floor**
Given the slider has keyboard focus and `waterMl === 55`
When I press the Down Arrow key
Then `waterMl` remains at 55 (does not go to 0)

**AC5 — Slider ARIA label**
Given a screen reader is active
When focus lands on the slider
Then the screen reader announces "Adjust fill level" (or Arabic equivalent in RTL)

**AC6 — Slider ARIA value text**
Given a screen reader is active and `waterMl=825`
When the slider is focused or its value changes
Then the screen reader announces "825 ml" (not just "825")

**AC7 — Slider ARIA min/max**
Given a screen reader is active
When the slider is focused
Then the screen reader can announce the min (55 ml) and max (bottleCapacityMl) values

**AC8 — Annotated image is decorative**
Given a screen reader is active
When it encounters the `<img>` element in `AnnotatedImagePanel`
Then it is skipped (alt="" marks it as decorative)
And the SVG overlay is also skipped (aria-hidden="true")

**AC9 — Confirm button activatable by keyboard**
Given the Confirm button has focus
When I press Enter or Space
Then `onConfirm(waterMl)` is called

**AC10 — Retake button activatable by keyboard**
Given the Retake button has focus
When I press Enter or Space
Then `onRetake()` is called

**AC11 — Live region announces confirmed value**
Given I tap or keyboard-activate the Confirm button
When `onConfirm` is called
Then a screen reader announcement is made: "Fill level confirmed: {waterMl} ml"
(Implemented via `aria-live="polite"` on a visually-hidden element)

**AC12 — Touch targets meet minimum size**
Given the component renders on mobile
When the Confirm button, Retake button, and slider thumb are measured
Then each has a minimum touch target of 44×44px (NFR22)

## Tasks / Subtasks

- [ ] **Task 1**: Add ARIA attributes to `VerticalStepSlider`
  - [ ] 1.1 Add `aria-label={t("fillConfirm.sliderLabel")}` to the Radix `<Slider.Root>` (or `<Slider.Thumb>`)
  - [ ] 1.2 Add `aria-valuetext={`${waterMl} ${t("common.ml")}`}` to `<Slider.Thumb>`
  - [ ] 1.3 Confirm Radix Slider automatically provides `aria-valuemin`, `aria-valuemax`, `aria-valuenow` (it does — verify in DOM inspector)

- [ ] **Task 2**: Add ARIA to image elements in `AnnotatedImagePanel`
  - [ ] 2.1 Confirm `<img alt="">` is already set (from FC.2)
  - [ ] 2.2 Confirm `<svg aria-hidden="true">` is already set (from FC.2)

- [ ] **Task 3**: Add live region to `FillConfirmScreen`
  - [ ] 3.1 Add a visually-hidden `<span>` with `aria-live="polite"` and `aria-atomic="true"` near the Confirm button
  - [ ] 3.2 Wire it to announce when user confirms (see Dev Notes for implementation)

- [ ] **Task 4**: Verify tab order
  - [ ] 4.1 Confirm Retake button is first in DOM order (gets focus first with Tab)
  - [ ] 4.2 Confirm Radix Slider is in the natural tab order (it is by default)
  - [ ] 4.3 Confirm Confirm button is last in DOM order

- [ ] **Task 5**: Verify focus rings are visible
  - [ ] 5.1 Check Confirm and Retake buttons have `:focus-visible` styles (Tailwind `focus:ring-2` or CSS)
  - [ ] 5.2 Check Radix Slider thumb has a focus ring (Radix adds `data-[focus-visible]` — add CSS for it)

- [ ] **Task 6**: Manual VoiceOver test on iOS Safari
  - [ ] 6.1 Enable VoiceOver on iPhone
  - [ ] 6.2 Navigate to fill confirmation screen
  - [ ] 6.3 Swipe to slider — confirm it announces "Adjust fill level, 825 ml, adjustable"
  - [ ] 6.4 Swipe up/down on slider — confirm value changes announced
  - [ ] 6.5 Confirm image is skipped
  - [ ] 6.6 Confirm button announces label and activates on double-tap

## Dev Notes

### Radix Slider ARIA — What Radix Provides Automatically

Radix `<Slider>` automatically sets on the thumb element:
- `role="slider"`
- `aria-valuemin` → `min` prop value
- `aria-valuemax` → `max` prop value
- `aria-valuenow` → current `value[0]`
- `aria-orientation="vertical"` (when `orientation="vertical"`)

**What you must add manually:**
- `aria-label` (Radix does not add a label by default)
- `aria-valuetext` (for screen reader to say "825 ml" instead of "825")

### Updated `VerticalStepSlider.tsx` — ARIA additions

Add to the `<Slider.Thumb>` element:

```tsx
<Slider.Thumb
  aria-label={ariaLabel}      // pass as prop from FillConfirmScreen
  aria-valuetext={`${waterMl} ${ariaUnitLabel}`}  // "825 ml"
  style={{ ... }}             // existing styles unchanged
/>
```

Update the `VerticalStepSliderProps` interface:

```typescript
interface VerticalStepSliderProps {
  waterMl: number;
  min?: number;
  step?: number;
  max: number;
  height?: number;
  onChange: (waterMl: number) => void;
  ariaLabel?: string;       // ← ADD
  ariaUnitLabel?: string;   // ← ADD (e.g. "ml")
}
```

In `FillConfirmScreen.tsx`, pass these props:

```tsx
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
```

### Live Region Implementation in `FillConfirmScreen.tsx`

Add state and element for screen reader announcement:

```tsx
const [announcement, setAnnouncement] = useState("");

const handleConfirm = useCallback(() => {
  setAnnouncement(`${t("fillConfirm.confirmed", "Fill level confirmed")}: ${waterMl} ${t("common.ml", "ml")}`);
  onConfirm(waterMl);
}, [onConfirm, waterMl, t]);
```

Add the live region element (visually hidden, after the button row):

```tsx
{/* Screen reader live region — visually hidden */}
<span
  role="status"
  aria-live="polite"
  aria-atomic="true"
  style={{
    position: "absolute",
    width: "1px",
    height: "1px",
    padding: 0,
    margin: "-1px",
    overflow: "hidden",
    clip: "rect(0,0,0,0)",
    whiteSpace: "nowrap",
    border: 0,
  }}
>
  {announcement}
</span>
```

Add English translation key:
```json
"confirmed": "Fill level confirmed"
```

Add Arabic translation key:
```json
"confirmed": "تم تأكيد مستوى الزيت"
```

### Radix Slider Keyboard Navigation — Built In

Radix `<Slider>` handles keyboard navigation natively:
- **Up Arrow / Right Arrow**: increase by `step`
- **Down Arrow / Left Arrow**: decrease by `step`
- **Home**: jump to `min`
- **End**: jump to `max`
- **Page Up / Page Down**: increase/decrease by larger increment

For `orientation="vertical"`, Up Arrow increases and Down Arrow decreases. This matches the visual direction (thumb up = more oil). No custom keyboard handler is needed.

**iOS VoiceOver note:** VoiceOver on iOS uses swipe gestures, not arrow keys. With VoiceOver active, the user swipes up/down on the slider to adjust the value. Radix handles this correctly via the underlying `role="slider"` semantics.

### Focus Rings

Radix Slider thumb adds `data-[focus-visible]` attribute when keyboard-focused. Add CSS to `src/components/FillConfirmScreen/FillConfirmScreen.css` (create if it doesn't exist) or use a global selector:

```css
/* FillConfirmScreen.css — or add to App.css */
[data-radix-slider-thumb][data-focus-visible] {
  outline: 2px solid #3b82f6;  /* blue-500, matching thumb border */
  outline-offset: 2px;
}
```

Confirm and Retake buttons should use Tailwind `focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2` classes.

### Tab Order Verification

The DOM order in `FillConfirmScreen` from FC.4:

```tsx
<div>                          // flex row: slider + image
  <VerticalStepSlider />       // Tab stop 1 (slider thumb)
  <AnnotatedImagePanel />      // no tab stops (image + SVG are both decorative)
</div>
<div>                          // button row
  <button onClick={onRetake}>  // Tab stop 2 — BUT this is after slider in DOM
  <button onClick={handleConfirm}> // Tab stop 3
</div>
```

**Problem:** In RTL (`dir="rtl"`), the visual order puts the slider on the right, but DOM order (and therefore tab order) is still: slider → retake → confirm. Tab order follows DOM order, not visual order. For LTR this is: slider → retake → confirm (reasonable). For RTL the visual order would be: confirm → retake → slider but tab follows DOM which is slider → retake → confirm. This is acceptable — WCAG 2.1 SC 1.3.2 requires logical reading order, not pixel-perfect visual order match.

If the desired tab order is Retake → Slider → Confirm, reorder the DOM:

```tsx
<div className="flex flex-col h-full">
  <div className="flex flex-row ...">
    <VerticalStepSlider />    {/* Tab 2 */}
    <AnnotatedImagePanel />
  </div>
  <div className="flex flex-row gap-3 p-4">
    <button onClick={onRetake}>Retake</button>    {/* Tab 1 — first in DOM */}
    <button onClick={handleConfirm}>Confirm</button> {/* Tab 3 */}
  </div>
</div>
```

Wait — buttons are BELOW the slider in DOM. So tab order is: Retake → Confirm → Slider (if buttons come first in DOM). To get Retake → Slider → Confirm, we need Retake DOM-first, then slider, then confirm button. Use `tabIndex` if needed, or restructure:

**Recommended approach for correct tab order (Retake → Slider → Confirm):**

```tsx
<div className="flex flex-col h-full">
  {/* Retake button first in DOM = Tab 1 */}
  <div className="p-4 pb-2">
    <button onClick={onRetake} ...>Retake</button>
  </div>

  {/* Slider + image = Tab 2 (slider thumb) */}
  <div className="flex flex-row flex-1 ...">
    <VerticalStepSlider ... />
    <AnnotatedImagePanel ... />
  </div>

  {/* Confirm button last = Tab 3 */}
  <div className="p-4 pt-2">
    <button onClick={handleConfirm} ...>Confirm — {waterMl} ml</button>
  </div>
</div>
```

Adjust layout classes to maintain visual design. If this layout change is disruptive, use `tabIndex` as a last resort.

### WCAG Compliance Summary

| Criterion | Implementation |
|---|---|
| 1.1.1 Non-text content | `alt=""` on decorative image, `aria-hidden` on SVG |
| 1.3.1 Info and relationships | `role="slider"`, `aria-valuemin/max/now/text` |
| 1.4.3 Contrast | Buttons use existing app colour tokens (already tested in other components) |
| 2.1.1 Keyboard | Radix handles arrow keys; buttons are native `<button>` elements |
| 2.4.7 Focus visible | Focus rings on slider thumb and buttons |
| 4.1.2 Name, role, value | `aria-label` on slider, `aria-live` on confirmation region |

### Project Structure Notes

```
src/
  components/
    FillConfirmScreen/
      VerticalStepSlider.tsx   ← MODIFY: add ariaLabel, ariaValueText props
      FillConfirmScreen.tsx    ← MODIFY: add live region, pass ARIA props, adjust DOM order
      FillConfirmScreen.css    ← CREATE: focus ring for Radix slider thumb (if needed)
  i18n/
    locales/
      en/translation.json     ← MODIFY: add fillConfirm.confirmed key
      ar/translation.json     ← MODIFY: add fillConfirm.confirmed key
```

### References

- [Architecture FC §7 Rule — no canvas](../planning-artifacts/architecture-fill-confirm-screen.md)
- [epics-fill-confirm-screen.md Story 6.7 — Accessibility AC](../planning-artifacts/epics-fill-confirm-screen.md)
- [Radix Slider accessibility docs](https://www.radix-ui.com/primitives/docs/components/slider#accessibility)
- [WCAG 2.1 SC 1.3.2 — Meaningful Sequence](https://www.w3.org/TR/WCAG21/#meaningful-sequence)
- [NFR22: touch targets ≥ 44×44px]

## Dev Agent Record

### Agent Model Used
_To be filled_

### Debug Log References
_None yet_

### Completion Notes List
_None yet_

### File List

**Files to MODIFY:**
- `src/components/FillConfirmScreen/VerticalStepSlider.tsx` (add `ariaLabel`, `ariaValueText` props to thumb)
- `src/components/FillConfirmScreen/FillConfirmScreen.tsx` (add live region, pass ARIA props, adjust DOM order for tab order)
- `src/i18n/locales/en/translation.json` (add `fillConfirm.confirmed`)
- `src/i18n/locales/ar/translation.json` (add `fillConfirm.confirmed`)

**Files to CREATE:**
- `src/components/FillConfirmScreen/FillConfirmScreen.css` (focus ring styles for Radix slider thumb, if not handled inline)
