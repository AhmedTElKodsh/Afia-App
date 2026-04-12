# Story 3.3: Nutritional Fact Scaling

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a user,
I want to see the nutrition facts for exactly how much oil I've used,
so that I can track my fat and calorie intake accurately.

## Acceptance Criteria

1. **Shared Nutrition Logic**: The scaling logic resides in `shared/logic/nutritionScaling.ts` using Isomorphic TypeScript. [Source: architecture.md#5-implementation-patterns--consistency-rules] - ✅ DONE
2. **Authoritative Reference Data**: The system uses bundled USDA reference data for Corn, Sunflower, and Vegetable oils in `shared/constants/oilNutrition.ts`. [Source: shared/constants/oilNutrition.ts] - ✅ DONE
3. **Volume-to-Mass Scaling**: The system correctly converts consumed volume (ml) to mass (g) using oil-specific density before scaling nutrition facts. [Source: shared/logic/nutritionScaling.ts] - ✅ DONE
4. **Isomorphic Parity**: Results are identical between the PWA display and the backend audit trail (Worker). [Source: architecture.md#5-implementation-patterns--consistency-rules] - ✅ DONE
5. **Unit Test Coverage**: A Vitest suite verifies the scaling math for multiple oil types and volumes. [Source: epics.md#Story 3.3] - ✅ DONE

## Tasks / Subtasks

- [x] Port Nutrition Logic (AC: 1, 3)
  - [x] Moved `nutritionCalculator.ts` to `shared/logic/nutritionScaling.ts`.
  - [x] Implemented volume-to-mass conversion using `densityGPerMl`.
- [x] Port Reference Data (AC: 2)
  - [x] Moved `oilNutrition.ts` to `shared/constants/oilNutrition.ts`.
  - [x] Updated data with authoritative USDA FDC IDs (e.g., 171017 for Corn Oil).
- [x] Verify Math (AC: 5)
  - [x] Created `shared/logic/nutritionScaling.test.ts`.
  - [x] Verified 4/4 tests passing (Corn, Sunflower, Unknown, Zero).

## Dev Notes

- **Density Accuracy**: Different oils have slightly different densities (e.g. 0.92 g/ml). The math now accounts for this before applying the 100g reference scaling.
- **USDA Source**: All data points are mapped to official FoodData Central IDs to ensure scientific accuracy for the POC.
- **Bilingual alignment**: Used generic keys (corn, sunflower, vegetable) to ensure seamless mapping to `src/i18n` strings.

### Project Structure Notes

- **Primary Logic**: `shared/logic/nutritionScaling.ts`
- **Unit Tests**: `shared/logic/nutritionScaling.test.ts`
- **Constants**: `shared/constants/oilNutrition.ts`

### References

- [Source: architecture.md#5-implementation-patterns--consistency-rules]
- [Source: epics.md#Story 3.3]

## Dev Agent Record

### Agent Model Used

Gemini 2.5 Flash (via BMad dev-story workflow)

### Debug Log References

- [Log: nutritionScaling.ts implemented with density logic]
- [Log: oilNutrition.ts updated with USDA FDC IDs]
- [Log: 4/4 nutrition tests passing]

### Completion Notes List

- Successfully centralized nutritional scaling logic.
- Ensured authoritative accuracy for health tracking features.

### File List

- `shared/logic/nutritionScaling.ts` (new location)
- `shared/logic/nutritionScaling.test.ts` (new)
- `shared/constants/oilNutrition.ts` (new location)
- `src/data/oilNutrition.ts` (deleted/moved)
- `src/utils/nutritionCalculator.ts` (deleted/moved)
