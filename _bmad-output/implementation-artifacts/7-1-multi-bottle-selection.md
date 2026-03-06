---
story_id: "7.1"
story_key: "7-1-multi-bottle-selection"
epic: 7
status: ready-for-dev
created: "2026-03-06"
author: "Ahmed"
---

# Story 7.1: Multi-Bottle Selection

## Story Information

| Field | Value |
|-------|-------|
| **Epic** | Epic 7: Multi-Bottle Support |
| **Story ID** | 7.1 |
| **Story Key** | 7-1-multi-bottle-selection |
| **Status** | ready-for-dev |
| **Priority** | Medium - Flexibility |
| **Estimation** | 2-3 hours |
| **Dependencies** | Story 1.3 (✅ Bottle Registry) |

## User Story

**As a** user with multiple oil bottles,
**I want** to switch between bottles easily,
**So that** I can track consumption for each bottle separately.

## Acceptance Criteria

### Primary AC

**Given** I'm on the app
**When** I want to track a different bottle
**Then** I can:
1. See a bottle selector dropdown/icon list
2. Switch to a different registered bottle
3. See current bottle name displayed prominently
4. History is filtered by selected bottle

### Implementation

**Bottle Selector Component:**
```tsx
<div className="bottle-selector">
  <label>Current Bottle:</label>
  <select
    value={selectedSku}
    onChange={(e) => setSelectedSku(e.target.value)}
  >
    {bottleRegistry.map(bottle => (
      <option key={bottle.sku} value={bottle.sku}>
        {bottle.name} ({bottle.totalVolumeMl}ml)
      </option>
    ))}
  </select>
</div>
```

**Visual Design:**
- Show bottle icon/thumbnail if available
- Display bottle name and capacity
- Highlight currently selected bottle
- Quick access from main screen

**State Management:**
```typescript
// Persist selected bottle in localStorage
const [selectedSku, setSelectedSku] = useState(() => {
  return localStorage.getItem('selectedSku') || bottleRegistry[0].sku;
});

useEffect(() => {
  localStorage.setItem('selectedSku', selectedSku);
}, [selectedSku]);
```

## Status

**Status**: ready-for-dev
**Created**: 2026-03-06

**Multi-bottle selection ready for implementation**
