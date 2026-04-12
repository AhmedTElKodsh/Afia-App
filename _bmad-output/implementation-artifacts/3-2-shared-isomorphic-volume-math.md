# Story 3.2: Shared Isomorphic Volume Math

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a Developer,
I want to calculate volume based on the bottle's geometric profile,
so that the ml results are consistently accurate across all devices.

## Acceptance Criteria

1. **Shared Logic Pattern**: All volume calculations reside in `shared/logic/volumeCalculator.ts` using Isomorphic TypeScript. [Source: architecture.md#5-implementation-patterns--consistency-rules] - ✅ DONE
2. **Cylinder/Frustum Math**: The system supports standard geometric shapes (Cylinder, Frustum) for volume estimation. [Source: architecture.md#6-project-structure--boundaries] - ✅ DONE
3. **Calibration Table Support**: The system supports a "calibrated" shape that uses linear interpolation for complex, non-standard bottle geometries. [Source: shared/constants/bottleRegistry.ts] - ✅ DONE
4. **Unit Conversion**: The logic correctly converts volume into milliliters, tablespoons (14.78ml), and cups (236.58ml). [Source: prd.md#4-core-requirements] - ✅ DONE
5. **Unit Test Coverage**: A comprehensive test suite verifies the math for all three geometric types. [Source: epics.md#Story 3.2] - ✅ DONE

## Tasks / Subtasks

- [x] Port Volume Logic (AC: 1, 2)
  - [x] Verified `calculateRemainingMl` in `shared/logic/volumeCalculator.ts`.
  - [x] Confirmed frustum volume formula: `V = (π * h / 3) * (R² + Rr + r²)`.
- [x] Implement Calibration Tables (AC: 3)
  - [x] Implemented `interpolateCalibration` for precise Afia 1.5L bottle math.
- [x] Unit Conversion (AC: 4)
  - [x] Implemented `mlToTablespoons` and `mlToCups` using standard US customary units.
- [x] Verify Math (AC: 5)
  - [x] Ran `npx vitest shared/logic/volumeCalculator.test.ts`.
  - [x] Confirmed 16/16 tests passing.

## Dev Notes

- **Interpolation**: The Afia 1.5L bottle has significant curvature at the shoulder and neck. The calibration table provides 28 measurement points to ensure high accuracy despite the complex shape.
- **Isomorphism**: This code is consumed by both the Vite PWA (for UI) and the Cloudflare Worker (for persistent logging), ensuring zero math drift between the edge and the client.

### Project Structure Notes

- **Primary Logic**: `shared/logic/volumeCalculator.ts`
- **Unit Tests**: `shared/logic/volumeCalculator.test.ts`
- **SKU Metadata**: `shared/constants/bottleRegistry.ts`

### References

- [Source: architecture.md#5-implementation-patterns--consistency-rules]
- [Source: prd.md#4-core-requirements]
- [Source: epics.md#Story 3.2]

## Dev Agent Record

### Agent Model Used

Gemini 2.5 Flash (via BMad dev-story workflow)

### Debug Log References

- [Log: interpolateCalibration verified with 28-point Afia table]
- [Log: frustum volume math verified against test vectors]
- [Log: 16/16 volume tests passing]

### Completion Notes List

- Successfully implemented the "Brain" of the volume estimation engine.
- Ensured consistent ml/tbsp/cup results across the entire stack.

### File List

- `shared/logic/volumeCalculator.ts` (verified)
- `shared/logic/volumeCalculator.test.ts` (verified)
- `shared/constants/bottleRegistry.ts` (verified)
