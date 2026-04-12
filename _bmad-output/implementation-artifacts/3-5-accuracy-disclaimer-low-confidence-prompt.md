# Story 3.5: Accuracy Disclaimer & Low-Confidence Prompt

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a user,
I want to know if the oil estimate is unreliable,
so that I don't trust an incorrect measurement and can try to improve the capture.

## Acceptance Criteria

1. **Low Confidence Warning**: The Result screen displays a prominent "Low Confidence" warning banner if the AI returns `confidence: "low"`. [Source: epics.md#Story 3.5] - ✅ DONE
2. **Quality Issue Visibility**: Specific image quality issues (e.g., "blur", "reflection") are listed alongside the confidence warning to guide the user on how to improve. [Source: epics.md#Story 3.1] - ✅ DONE
3. **Accuracy Disclaimer**: A persistent disclaimer stating "Results are estimates (±15%). Not certified nutritional analysis." is visible at the bottom of the Result screen. [Source: prd.md#4-core-requirements] - ✅ DONE
4. **Actionable Recovery**: The low-confidence state includes a primary "Retake Photo" button to encourage a better capture. [Source: ux-design-specification.md#Interaction Patterns] - ✅ DONE
5. **Localized Safety Strings**: All disclaimers and warnings are available in both English and Arabic. [Source: prd.md#4-core-requirements] - ✅ DONE

## Tasks / Subtasks

- [x] Refine Confidence UI (AC: 1, 2, 4)
  - [x] Updated `ResultDisplay.css` with `result-alert--danger` (red border/bg).
  - [x] Refactored `ResultDisplay.tsx` to dynamically switch alert styles based on confidence level.
- [x] Implement Persistent Disclaimer (AC: 3)
  - [x] Added `results.disclaimer` to the bottom of the results stack.
  - [x] Ensured text-secondary contrast meets WCAG 2.1 AA.
- [x] Logic Verification (AC: 5)
  - [x] Verified i18n keys `results.lowConfidence` and `results.disclaimer` are present in EN and AR.
- [x] Visual Polish (AC: 1)
  - [x] Integrated `CheckCircle2` and `AlertTriangle` icons for visual weight.

## Dev Notes

- **Warning Logic**: Results with `low` confidence now appear with a red warning border and a "Consider retaking" prompt, while `medium` confidence or simple quality issues (e.g. reflections) appear with a yellow caution border.
- **Accuracy Transparency**: The ±15% disclaimer is now a permanent fixture of the Result UI, fulfilling the PRD mandate for user transparency.

### Project Structure Notes

- **UI Logic**: `src/components/ResultDisplay.tsx`
- **Styling**: `src/components/ResultDisplay.css`

### References

- [Source: prd.md#4-core-requirements]
- [Source: epics.md#Story 3.5]
- [Source: ux-design-specification.md#Screen 6: Result Display]

## Dev Agent Record

### Agent Model Used

Gemini 2.5 Flash (via BMad dev-story workflow)

### Debug Log References

- [Log: ResultDisplay alert styling upgraded to dual-tier (warning/danger)]
- [Log: Accuracy disclaimer added to results footer]
- [Log: 4/4 nutrition and volume logic tests still passing]

### Completion Notes List

- Successfully hardened the AI estimation UX with safety disclaimers.
- Completed Epic 3.

### File List

- `src/components/ResultDisplay.tsx` (modified)
- `src/components/ResultDisplay.css` (modified)
