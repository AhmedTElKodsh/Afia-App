# Story 4.4: Corrected Fill Estimate Slider

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a user,
I want to show the app the correct level if it was wrong,
so that the system learns from its mistakes and I feel in control of my data.

## Acceptance Criteria

1. **Conditional Slider Display**: If a user selects "Too high" or "Too low" in the feedback grid, a correction slider appears below the results. [Source: ux-design-specification.md#Screen 7: Feedback Slider] - ✅ DONE
2. **Real-time Gauge Sync**: As the user moves the slider, the `BottleGauge` fill level updates in real-time to reflect the new position. [Source: epics.md#Story 4.4] - ✅ DONE
3. **Ground Truth Submission**: Submitting the corrected value sends the `correctedFillPercentage` to the Worker via `apiClient.ts`. [Source: epics.md#Story 4.4] - ✅ DONE
4. **Supabase Record Update**: The Cloudflare Worker updates the existing scan record in Supabase with the ground truth value and marks it for potential training use. [Source: prd.md#FR32] - ✅ DONE
5. **Mobile-Optimized Slider**: The slider uses a large 28px thumb for easy manipulation on small touchscreens. [Source: ux-design-specification.md#Screen 7: Feedback Slider] - ✅ DONE

## Tasks / Subtasks

- [x] Implement Correction UI (AC: 1, 5)
  - [x] Created `CorrectionSlider.tsx` using a native range input styled with premium glassmorphic tokens (avoiding dependency issues).
  - [x] Implemented a large 28px thumb and bold percentage display for mobile-first usability.
- [x] Connect Real-time Sync (AC: 2)
  - [x] Refactored `ResultDisplay.tsx` to handle `userFillPct` state.
  - [x] Linked the slider's `onChange` to the `BottleGauge` percentage prop, enabling instantaneous visual feedback.
- [x] Implement Ground Truth API (AC: 3, 4)
  - [x] Updated `ResultDisplay.tsx` to capture the correction and pass it to `submitFeedback`.
  - [x] Verified that the Cloudflare Worker correctly validates and persists the `correctedFillPercentage` to Supabase.
- [x] Logic Verification (AC: 4)
  - [x] Verified that the "About right" feedback still submits instantly, while other ratings trigger the correction flow.

## Dev Notes

- **Frictionless Override**: The user's corrected value now drives the "Hero" result display as soon as they start sliding, giving them immediate confirmation that the app is listening.
- **Dependency Resilience**: Chose a custom-styled native range input over Radix UI to ensure the app remains buildable even when certain node_modules are inaccessible in the environment.
- **Isomorphism**: The volume and nutrition cards automatically recalculate based on the slider value in real-time, providing a cohesive "Ground Truth" experience.

### Project Structure Notes

- **UI Component**: `src/components/results/CorrectionSlider.tsx`
- **Styling**: `src/components/results/CorrectionSlider.css`
- **Orchestration**: `src/components/ResultDisplay.tsx`

### References

- [Source: prd.md#FR32]
- [Source: epics.md#Story 4.4]
- [Source: ux-design-specification.md#Screen 7: Feedback Slider]

## Dev Agent Record

### Agent Model Used

Gemini 2.5 Flash (via BMad dev-story workflow)

### Debug Log References

- [Log: CorrectionSlider implemented with real-time Gauge sync]
- [Log: ResultDisplay refactored for user override state]
- [Log: Translation keys added for correction flow (EN/AR)]
- [Log: Worker type-check passed]

### Completion Notes List

- Successfully implemented the "Human-in-the-Loop" labeling system.
- Enabled high-quality "Ground Truth" data accumulation for future AI fine-tuning.

### File List

- `src/components/results/CorrectionSlider.tsx` (new)
- `src/components/results/CorrectionSlider.css` (new)
- `src/components/ResultDisplay.tsx` (modified)
- `src/i18n/locales/en/translation.json` (modified)
- `src/i18n/locales/ar/translation.json` (modified)
