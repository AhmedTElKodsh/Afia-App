---
story_id: "FC.6"
story_key: "fill-confirm-6-rtl-bilingual-layout"
epic: "FC - Fill Confirmation Screen"
status: ready-for-dev
created: "2026-04-10"
author: "Ahmed"
---

# Story FC.6: RTL / Bilingual Layout

## Story Information

| Field | Value |
|---|---|
| **Epic** | Epic FC: Fill Confirmation Screen |
| **Story ID** | FC.6 |
| **Story Key** | fill-confirm-6-rtl-bilingual-layout |
| **Status** | ready-for-dev |
| **Dependencies** | FC.4 (`FillConfirmScreen`) must be complete |

## User Story

**As an** Arabic-speaking user,
**I want** the fill confirmation screen to display correctly in right-to-left layout with Arabic labels,
**So that** the slider is on the correct reading-start side and all text is in Arabic.

## Acceptance Criteria

**AC1 — Slider position flips automatically in RTL**
Given the app language is set to Arabic
When I view the fill confirmation screen
Then the slider appears on the RIGHT side of the image panel
And the image appears on the LEFT side
(Flexbox reverses automatically via `dir="rtl"` — no conditional class switching)

**AC2 — Slider position in LTR**
Given the app language is set to English
When I view the fill confirmation screen
Then the slider appears on the LEFT side of the image panel
And the image appears on the RIGHT side

**AC3 — Slider value semantics unchanged in RTL**
Given the app is in Arabic and the slider is at 825 ml
When the user drags the slider upward
Then the value increases (top = full = max ml)
And the annotation line moves upward on the photo
(Value semantics are NOT inverted in RTL — Radix uses pointer coords, not CSS direction)

**AC4 — All labels in Arabic when language is Arabic**
Given the app is in Arabic
When the fill confirmation screen renders
Then the Confirm button text is in Arabic
And the Retake button text is in Arabic
And the ml display value is in Arabic numerals (or Arabic-indic, per locale setting)

**AC5 — All labels in English when language is English**
Given the app is in English
When the fill confirmation screen renders
Then the Confirm button text is "Confirm"
And the Retake button text is "Retake"

**AC6 — Language switch updates layout without page reload**
Given the user switches language from English to Arabic via the language toggle
When the screen re-renders
Then the slider moves from left to right automatically
And all text updates to Arabic
And no page reload is required

**AC7 — Spacing uses logical CSS properties**
Given the layout renders in either language
When inspected
Then the gap between slider and image uses `gap` (Tailwind `gap-3`) not `margin-left`/`margin-right`
(Logical properties handle RTL automatically)

## Tasks / Subtasks

- [ ] **Task 1**: Add Arabic translation keys to `src/i18n/locales/ar/translation.json`
  - [ ] 1.1 Add `fillConfirm` section (see Dev Notes for exact keys and values)

- [ ] **Task 2**: Add English translation keys to `src/i18n/locales/en/translation.json`
  - [ ] 2.1 Add `fillConfirm` section (see Dev Notes for exact keys and values)

- [ ] **Task 3**: Verify `FillConfirmScreen.tsx` uses `dir={document.documentElement.dir}` on the flex row
  - [ ] 3.1 Confirm the flex container already uses `dir={document.documentElement.dir}` (implemented in FC.4)
  - [ ] 3.2 If not, add it now: `<div className="flex flex-row ..." dir={document.documentElement.dir}>`

- [ ] **Task 4**: Verify translation keys are used in `FillConfirmScreen.tsx`
  - [ ] 4.1 Confirm `t("fillConfirm.confirmButton")` is used on the Confirm button
  - [ ] 4.2 Confirm `t("fillConfirm.retakeButton")` is used on the Retake button
  - [ ] 4.3 Confirm `t("common.ml")` is used for the unit label (already exists in translation files)

- [ ] **Task 5**: Manual RTL test
  - [ ] 5.1 Switch app to Arabic via language toggle
  - [ ] 5.2 Navigate to fill confirmation screen (via a test scan or TestLab)
  - [ ] 5.3 Confirm slider is on the right, image on the left
  - [ ] 5.4 Confirm slider drag upward still increases value (not inverted)
  - [ ] 5.5 Confirm annotation line moves in sync with slider in RTL
  - [ ] 5.6 Switch back to English — confirm layout flips back

## Dev Notes

### English Translation Keys

Add to `src/i18n/locales/en/translation.json` inside the root object:

```json
"fillConfirm": {
  "title": "Confirm Fill Level",
  "confirmButton": "Confirm",
  "retakeButton": "Retake",
  "sliderLabel": "Adjust fill level",
  "mlValue": "{{value}} ml"
}
```

### Arabic Translation Keys

Add to `src/i18n/locales/ar/translation.json` inside the root object:

```json
"fillConfirm": {
  "title": "تأكيد مستوى الزيت",
  "confirmButton": "تأكيد",
  "retakeButton": "إعادة التصوير",
  "sliderLabel": "اضبط مستوى الزيت",
  "mlValue": "{{value}} مل"
}
```

### How RTL Layout Works (No Code Change Needed)

The RTL flip is handled entirely by the `dir` attribute on the flex row container in `FillConfirmScreen.tsx`:

```tsx
<div
  className="flex flex-row flex-1 items-stretch gap-3 p-3"
  dir={document.documentElement.dir}
>
  <VerticalStepSlider ... />   {/* First in DOM = start side */}
  <div ref={containerRef} ...> {/* Second in DOM = end side */}
    <AnnotatedImagePanel ... />
  </div>
</div>
```

- **LTR** (`dir="ltr"`): start = left → slider on LEFT, image on RIGHT ✓
- **RTL** (`dir="rtl"`): start = right → slider on RIGHT, image on LEFT ✓

No conditional class switching, no `if (isRtl)` branching, no separate layout components.

### How `document.documentElement.dir` Is Set

`src/i18n/config.ts` already calls `setDirection(lng)` which sets `document.documentElement.dir = dir`. This fires:
1. On initial page load (line 59: `setDirection(initialLang)`)
2. On every language change (line 52: `i18n.on('languageChanged', ...)`)

The `FillConfirmScreen` reads `document.documentElement.dir` synchronously in render — this is always up to date because the language toggle triggers a re-render of the entire React tree.

### Slider Value Direction in RTL

Radix `<Slider orientation="vertical">` uses **pointer event coordinates** (physical screen pixels) to compute value changes — it does NOT use CSS `direction`. Therefore:

- Dragging UP → value increases (more ml) in both LTR and RTL ✓
- Dragging DOWN → value decreases (less ml) in both LTR and RTL ✓
- No value inversion code is needed

This is in contrast to native `<input type="range">` with `writing-mode: vertical-lr` where `direction: rtl` **does** affect value direction. Radix avoids this problem entirely.

**Explicit test required:** After implementation, manually verify that dragging up increases value in RTL. If Radix ever changes this behaviour in a future version, this test will catch it.

### Arabic Numeral Display

The existing `t("common.ml")` key and standard JavaScript `toLocaleString()` handle numeral formatting. The `waterMl` value in the Confirm button (`{waterMl} ml`) displays Western Arabic numerals in the current implementation. If Arabic-Indic numerals (٨٢٥) are needed, use `waterMl.toLocaleString('ar-EG')`. For the POC, Western Arabic numerals are acceptable.

### Existing RTL Patterns in Codebase

The app already uses `document.documentElement.dir` for global RTL (set in `src/i18n/config.ts`). Other components that handle RTL:
- `src/components/AdminDashboard.tsx` — uses `document.documentElement.dir`
- `src/components/LanguageSelector.tsx` — triggers `i18n.changeLanguage()`

Follow the same pattern. Do not introduce a new RTL detection mechanism.

### Project Structure Notes

```
src/
  i18n/
    locales/
      en/
        translation.json    ← MODIFY: add fillConfirm section
      ar/
        translation.json    ← MODIFY: add fillConfirm section
  components/
    FillConfirmScreen/
      FillConfirmScreen.tsx  ← VERIFY: dir attribute already present from FC.4
```

### References

- [Architecture FC §8 — RTL/Bilingual Layout](../planning-artifacts/architecture-fill-confirm-screen.md#8-rtl--bilingual-layout)
- [Technical Research §Area 4 — RTL layout](../planning-artifacts/research/technical-vite-react-pwa-image-annotation-slider-research-2026-04-10.md)
- [src/i18n/config.ts] — setDirection(), language change listener
- [src/i18n/locales/en/translation.json] — existing translation structure

## Dev Agent Record

### Agent Model Used
_To be filled_

### Debug Log References
_None yet_

### Completion Notes List
_None yet_

### File List

**Files to MODIFY:**
- `src/i18n/locales/en/translation.json` (add `fillConfirm` section)
- `src/i18n/locales/ar/translation.json` (add `fillConfirm` section)
- `src/components/FillConfirmScreen/FillConfirmScreen.tsx` (verify `dir` attr; use `t()` for labels)

**Files to CREATE:**
- None
