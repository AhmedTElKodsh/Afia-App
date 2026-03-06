---
story_id: "3.2"
story_key: "3-2-unit-conversion-system"
epic: 3
status: done
created: "2026-03-06"
author: "Ahmed"
---

# Story 3.2: Unit Conversion System

## Story Information

| Field | Value |
|-------|-------|
| **Epic** | Epic 3: Consumption Insights |
| **Story ID** | 3.2 |
| **Story Key** | 3-2-unit-conversion-system |
| **Status** | done |
| **Priority** | High - User Convenience |
| **Estimation** | 1 hour |
| **Dependencies** | Story 3.1 (✅ Volume Calculation) |

## User Story

**As a** developer,
**I want** automatic unit conversion for volumes,
**So that** users can view measurements in ml, tablespoons, and cups.

## Acceptance Criteria

### Primary AC

**Given** a volume in milliliters
**When** the unit conversion runs
**Then**:
1. Tablespoons are calculated: 1 tbsp = 14.7868 ml
2. Cups are calculated: 1 cup = 236.588 ml
3. Results are rounded to 1 decimal place for tbsp and cups
4. Results are rounded to 2 decimal places for ml
5. Conversions are accurate to 5 decimal places

### Implementation

**Conversion Constants:**
```typescript
export const ML_PER_TABLESPOON = 14.7868;
export const ML_PER_CUP = 236.588;
```

**Conversion Functions:**
```typescript
export function mlToTablespoons(ml: number): number {
  return ml / ML_PER_TABLESPOON;
}

export function mlToCups(ml: number): number {
  return ml / ML_PER_CUP;
}
```

**Volume Breakdown:**
```typescript
export interface VolumeBreakdown {
  ml: number;
  tablespoons: number;
  cups: number;
}

export function calculateVolumes(
  fillPercentage: number,
  totalVolumeMl: number,
  geometry: BottleGeometry
): { remaining: VolumeBreakdown; consumed: VolumeBreakdown } {
  const remainingMl = calculateRemainingMl(fillPercentage, totalVolumeMl, geometry);
  const consumedMl = totalVolumeMl - remainingMl;

  return {
    remaining: {
      ml: Math.round(remainingMl * 100) / 100,
      tablespoons: Math.round(mlToTablespoons(remainingMl) * 10) / 10,
      cups: Math.round(mlToCups(remainingMl) * 10) / 10,
    },
    consumed: {
      ml: Math.round(consumedMl * 100) / 100,
      tablespoons: Math.round(mlToTablespoons(consumedMl) * 10) / 10,
      cups: Math.round(mlToCups(consumedMl) * 10) / 10,
    },
  };
}
```

**Display Example:**
```
Remaining:
  340 ml
  23.0 tbsp
  1.4 cups

Consumed:
  160 ml
  10.8 tbsp
  0.7 cups
```

## Status

**Status**: done
**Created**: 2026-03-06
**Last Updated**: 2026-03-06

**Unit conversion system implemented for ml, tablespoons, and cups**
