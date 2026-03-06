---
story_id: "6.1"
story_key: "6-1-scan-history-tracking"
epic: 6
status: ready-for-dev
created: "2026-03-06"
author: "Ahmed"
---

# Story 6.1: Scan History Tracking

## Story Information

| Field | Value |
|-------|-------|
| **Epic** | Epic 6: Historical Tracking & Trends |
| **Story ID** | 6.1 |
| **Story Key** | 6-1-scan-history-tracking |
| **Status** | ready-for-dev |
| **Priority** | High - User Value |
| **Estimation** | 3-4 hours |
| **Dependencies** | Story 4.2 (✅ Feedback Collection) |

## User Story

**As a** user,
**I want** to see my scan history,
**So that** I can track my oil consumption over time.

## Acceptance Criteria

### Primary AC

**Given** I've completed multiple scans
**When** I navigate to "History" tab
**Then** I see:
1. List of all scans (newest first)
2. Each scan shows: date, bottle name, fill %, remaining ml
3. Filter by date range (last 7 days, 30 days, all time)
4. Search by bottle name
5. Tap any scan to see full details

### Implementation

**Local Storage Schema:**
```typescript
interface ScanHistory {
  scans: StoredScan[];
}

interface StoredScan {
  id: string;          // scanId from Worker
  timestamp: string;   // ISO 8601
  sku: string;
  bottleName: string;
  fillPercentage: number;
  remainingMl: number;
  consumedMl: number;
  confidence: "high" | "medium" | "low";
  feedbackRating?: string;  // If provided
}
```

**Storage Strategy:**
- Store in localStorage (max 500 scans)
- Auto-prune oldest when limit reached
- Sync to cloud (future enhancement)

**History View:**
```tsx
<div className="scan-history">
  <header>
    <h2>Scan History</h2>
    <DateRangeFilter onChange={handleFilter} />
  </header>
  
  <SearchBar placeholder="Search bottles..." />
  
  <ScanList scans={filteredScans}>
    {scans.map(scan => (
      <ScanCard
        key={scan.id}
        scan={scan}
        onClick={() => viewScanDetails(scan)}
      />
    ))}
  </ScanList>
</div>
```

## Status

**Status**: ready-for-dev
**Created**: 2026-03-06

**Scan history tracking ready for implementation**
