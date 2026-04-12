# Story 2.5: Brand Rejection Feedback UX

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a user,
I want to know why my scan was rejected when I point the camera at a non-Afia bottle,
so that I can understand the app's limitations and avoid frustration.

## Acceptance Criteria

1. **403 BRAND_NOT_FOUND Handling**: The PWA explicitly handles the `BRAND_NOT_FOUND` error code returned by the Worker. [Source: architecture.md#1-project-context-analysis] - ✅ DONE
2. **Brand Rejection Screen**: A dedicated error state or component is displayed when a brand is rejected, featuring an "Authentic Afia Bottle Required" message. [Source: ux-design-specification.md#Screen 9: Error States] - ✅ DONE
3. **Visual Guidance for Authenticity**: The rejection UI includes a brief checklist of what the app looks for: "Green Label", "Afia Heart Logo", and "Arabic 'عافية' text". [Source: research/afia-brand-verification-research-2026-04-10.md#Afia Visual Fingerprint] - ✅ DONE
4. **Actionable Recovery**: The screen provides a prominent "Try Another Bottle" button that returns the user to the initial landing or camera state. [Source: ux-design-specification.md#Interaction Patterns] - ✅ DONE
5. **Localized Rejection Strings**: All brand-related error messages are available in both English and Arabic. [Source: prd.md#4-core-requirements] - ✅ DONE

## Tasks / Subtasks

- [x] Define Brand Error UI (AC: 2, 3)
  - [x] Added `brand_rejected` state mapping to `ApiStatus.tsx`.
  - [x] Implemented a visual checklist of Afia markers (Heart logo, Arabic text, Green label) on the error screen.
- [x] Implement Rejection Logic (AC: 1, 4)
  - [x] Updated `AppState` in `src/state/appState.ts` to include `API_BRAND_REJECTED`.
  - [x] Updated `App.tsx` handleAnalyze to catch brand rejection errors and trigger the new state.
- [x] Visual Polish (AC: 3)
  - [x] Used Lucide icons (`CheckCircle2`) for the requirement checklist to signal "What's missing".
- [x] Logic Verification (AC: 5)
  - [x] Added localized strings for all brand-related components in English and Arabic.

## Dev Notes

- **UX Tone**: Shifted from generic "Error" to a helpful "Authentic Bottle Required" prompt. This reduces user frustration by explaining the system constraint clearly.
- **Failover integration**: The rejection message correctly highlights the markers (Heart logo, Arabic calligraphy) that the Reasoning-First LLM contract now searches for.
- **State Machine Safety**: Explicitly added `API_BRAND_REJECTED` to the union type to maintain TypeScript strictness.

### Project Structure Notes

- **UI Component**: `src/components/ApiStatus.tsx`
- **Global State**: `src/state/appState.ts`
- **Translations**: `src/i18n/locales/*/translation.json`

### References

- [Source: architecture.md#1-project-context-analysis]
- [Source: ux-design-specification.md#Screen 9: Error States]
- [Source: research/afia-brand-verification-research-2026-04-10.md#Afia Visual Fingerprint]

## Dev Agent Record

### Agent Model Used

Gemini 2.5 Flash (via BMad dev-story workflow)

### Debug Log References

- [Log: AppState updated with API_BRAND_REJECTED]
- [Log: ApiStatus refactored with brand checklist and i18n support]
- [Log: handleAnalyze updated to detect 403 brand rejection]
- [Log: Arabic and English translations added]

### Completion Notes List

- Successfully humanized the brand rejection experience.
- Completed the final story of Epic 2.

### File List

- `src/state/appState.ts` (modified)
- `src/components/ApiStatus.tsx` (modified)
- `src/App.tsx` (modified)
- `src/i18n/locales/en/translation.json` (modified)
- `src/i18n/locales/ar/translation.json` (modified)
