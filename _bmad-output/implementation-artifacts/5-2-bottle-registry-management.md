---
story_id: "5.2"
story_key: "5-2-bottle-registry-management"
epic: 5
status: ready-for-dev
created: "2026-03-06"
author: "Ahmed"
---

# Story 5.2: Bottle Registry Management

## Story Information

| Field | Value |
|-------|-------|
| **Epic** | Epic 5: Admin Dashboard |
| **Story ID** | 5.2 |
| **Story Key** | 5-2-bottle-registry-management |
| **Status** | ready-for-dev |
| **Priority** | High - Content Management |
| **Estimation** | 3-4 hours |
| **Dependencies** | Story 5.1 (✅ Dashboard Layout) |

## User Story

**As an** admin,
**I want** to add, edit, and delete bottles from the registry,
**So that** I can keep the bottle database up-to-date.

## Acceptance Criteria

### Primary AC

**Given** I'm on the dashboard Bottle Registry section
**When** I manage bottles
**Then** I can:
1. Add new bottle with: SKU, name, oil type, volume, geometry
2. Edit existing bottle details
3. Delete bottles (with confirmation)
4. Search/filter bottles by SKU or name
5. Export registry as JSON

### Bottle Form Fields

**Required:**
- SKU (unique identifier, e.g., "filippo-berio-500ml")
- Name (e.g., "Filippo Berio Extra Virgin Olive Oil")
- Oil Type (dropdown: extra_virgin_olive, pure_olive, sunflower, etc.)
- Total Volume (ml)
- Shape (cylinder/frustum)

**Conditional:**
- If cylinder: Height (mm), Diameter (mm)
- If frustum: Height (mm), Top Diameter (mm), Bottom Diameter (mm)

**Optional:**
- Image URL (for bottle preview)
- Notes (internal admin notes)

### Implementation

**Bottle Form:**
```tsx
interface BottleForm {
  sku: string;
  name: string;
  oilType: string;
  totalVolumeMl: number;
  geometry: {
    shape: "cylinder" | "frustum";
    heightMm: number;
    diameterMm?: number;
    topDiameterMm?: number;
    bottomDiameterMm?: number;
  };
  imageUrl?: string;
}
```

**Validation:**
- SKU must be unique
- All required fields must be filled
- Dimensions must be positive numbers
- Volume must be > 0

## Status

**Status**: ready-for-dev
**Created**: 2026-03-06

**Bottle registry management ready for implementation**
