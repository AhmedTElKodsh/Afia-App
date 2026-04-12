# Story 1.2: QR Landing & Context Loading

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a user,
I want to scan a QR code and see my oil bottle details immediately,
so that I don't have to manually search for or select my bottle SKU.

## Acceptance Criteria

1. **Query Parameter Extraction**: The app correctly extracts the `sku` parameter from the URL (e.g., `?sku=afia-corn-1.5l`). [Source: epics.md#Story 1.2] - ✅ DONE
2. **SKU Validation**: If the SKU exists in `@shared/constants/bottleRegistry.ts`, the app loads the associated metadata (Name, Capacity, Geometry). [Source: architecture.md#6-project-structure--boundaries] - ✅ DONE
3. **Landing Screen UI**: Displays the bottle name, capacity, and reference image as specified in the UX Design (Screen 1). [Source: ux-design-specification.md#Screen 1: QR Landing Page] - ✅ DONE
4. **Error State**: Displays an "Unknown SKU" error (Screen 9d) if the provided SKU is not in the registry. [Source: ux-design-specification.md#Screen 9: Error States] - ✅ DONE
5. **Zero-Friction Entry**: No user login or manual SKU selection is required to reach the "Ready to Scan" state. [Source: prd.md#What Makes This Special] - ✅ DONE

## Tasks / Subtasks

- [x] Implement URL Parsing (AC: 1)
  - [x] Use `URLSearchParams` to extract the `sku` parameter in `src/App.tsx`.
- [x] Context Integration (AC: 2)
  - [x] Import `getBottleBySku` and `ACTIVE_SKU` from `@shared/constants/bottleRegistry.ts`.
  - [x] Updated `BottleContext` interface to include `imageUrl`.
- [x] UI Implementation (AC: 3, 4)
  - [x] Refactored `QrLanding.tsx` to include brand logo and reference image.
  - [x] Verified `UnknownBottle` error boundary matches Screen 9d.
- [x] Logic Verification (AC: 5)
  - [x] Verified zero-friction landing with SKU pre-loading.

## Dev Notes

- **Naming Pattern**: Followed `camelCase` for logic and `PascalCase` for components.
- **Shared Logic**: Used `@shared/constants/bottleRegistry.ts` as the single source of truth.
- **Localization**: Added missing translation keys for `oilTypeLabel` and `consumedMl`.

### Project Structure Notes

- **App Entry**: `src/App.tsx` handles the top-level SKU state.
- **Landing Component**: `src/components/QrLanding.tsx` implements the hero UI.
- **Error Component**: `src/components/UnknownBottle.tsx` handles fallback states.

### References

- [Source: ux-design-specification.md#Screen 1: QR Landing Page]
- [Source: architecture.md#6-project-structure--boundaries]
- [Source: prd.md#What Makes This Special]

## Dev Agent Record

### Agent Model Used

Gemini 2.5 Flash (via BMad dev-story workflow)

### Debug Log References

- [Log: BottleContext updated with imageUrl in src/state/appState.ts]
- [Log: QrLanding.tsx refactored with brand logo and conditional reference image]
- [Log: i18n translation files updated for en/ar locales]

### Completion Notes List

- Successfully aligned the landing page with the 2026 UX Spec.
- Integrated the shared bottle registry for context loading.
- Added support for brand assets (logo/bottle image) in the landing flow.

### File List

- `src/state/appState.ts` (modified)
- `src/App.tsx` (modified)
- `src/components/QrLanding.tsx` (modified)
- `src/components/QrLanding.css` (modified)
- `src/i18n/locales/en/translation.json` (modified)
- `src/i18n/locales/ar/translation.json` (modified)
