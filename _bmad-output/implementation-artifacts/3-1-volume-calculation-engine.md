---
story_id: "3.1"
story_key: "3-1-volume-calculation-engine"
epic: 3
status: done
created: "2026-03-06"
author: "Ahmed"
---

# Story 3.1: Volume Calculation Engine

## Story Information

| Field | Value |
|-------|-------|
| **Epic** | Epic 3: Consumption Insights |
| **Story ID** | 3.1 |
| **Story Key** | 3-1-volume-calculation-engine |
| **Status** | done |
| **Priority** | Critical - Core Calculation |
| **Estimation** | 2-3 hours |
| **Dependencies** | Story 1.3 (✅ Bottle Registry) |

## User Story

**As a** developer,
**I want** a volume calculator that computes remaining and consumed oil,
**So that** users see accurate volume measurements based on fill percentage and bottle geometry.

## Acceptance Criteria

### Primary AC

**Given** I have a fill percentage and bottle geometry data
**When** the volume calculator runs
**Then**:
1. It calculates remaining volume using cylinder formula for cylinder bottles
2. It calculates remaining volume using frustum formula for tapered bottles
3. It calculates consumed volume as (totalVolumeMl - remainingVolumeMl)
4. All calculations are accurate to 2 decimal places
5. The calculator handles 0% fill (empty) and 100% fill (full) correctly

### Implementation

**Cylinder Formula:**
```typescript
// Simple linear proportion
remainingMl = totalVolumeMl * (fillPercentage / 100)
```

**Frustum Formula (Tapered Bottle):**
```typescript
// Volume of frustum (truncated cone)
const fillHeightMm = (fillPercentage / 100) * heightMm;
const bottomRadiusMm = bottomDiameterMm / 2;
const topRadiusMm = topDiameterMm / 2;

// Radius at fill level (linear interpolation)
const fillRadiusMm = bottomRadiusMm + 
  (topRadiusMm - bottomRadiusMm) * (fillHeightMm / heightMm);

// Frustum volume formula
const volumeMm3 = ((Math.PI * fillHeightMm) / 3) * 
  (bottomRadiusMm² + bottomRadiusMm * fillRadiusMm + fillRadiusMm²);

const remainingMl = volumeMm3 / 1000;  // Convert mm³ to ml
```

**Test Results:**
```
✓ calculateRemainingMl - cylinder: returns totalVolumeMl at 100%
✓ calculateRemainingMl - cylinder: returns 0 at 0%
✓ calculateRemainingMl - cylinder: returns half at 50%
✓ calculateRemainingMl - frustum: returns 0 at 0%
✓ calculateRemainingMl - frustum: returns totalVolumeMl at 100%
✓ calculateVolumes: remaining + consumed = total volume
✓ calculateVolumes: at 100% fill all volume is remaining
✓ calculateVolumes: at 0% fill all volume is consumed
```

## Status

**Status**: done
**Created**: 2026-03-06
**Last Updated**: 2026-03-06

**Volume calculation engine implemented with cylinder and frustum formulas**
