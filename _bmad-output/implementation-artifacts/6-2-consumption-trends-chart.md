---
story_id: "6.2"
story_key: "6-2-consumption-trends-chart"
epic: 6
status: ready-for-dev
created: "2026-03-06"
author: "Ahmed"
---

# Story 6.2: Consumption Trends Chart

## Story Information

| Field | Value |
|-------|-------|
| **Epic** | Epic 6: Historical Tracking & Trends |
| **Story ID** | 6.2 |
| **Story Key** | 6-2-consumption-trends-chart |
| **Status** | ready-for-dev |
| **Priority** | Medium - Insights |
| **Estimation** | 3-4 hours |
| **Dependencies** | Story 6.1 (✅ Scan History) |

## User Story

**As a** user,
**I want** to see a chart of my oil consumption over time,
**So that** I can understand my usage patterns.

## Acceptance Criteria

### Primary AC

**Given** I have at least 3 scans in history
**When** I view the Trends tab
**Then** I see:
1. Line chart showing consumption over time
2. X-axis: dates (last 30 days by default)
3. Y-axis: cumulative consumption (ml or cups)
4. Toggle between units (ml, tbsp, cups)
5. Show total consumed this period

### Implementation

**Chart Library:**
- Use Chart.js or Recharts (lightweight, React-compatible)
- Responsive design for mobile
- Touch-friendly interactions

**Data Aggregation:**
```typescript
interface DailyConsumption {
  date: string;  // YYYY-MM-DD
  totalConsumedMl: number;
  scanCount: number;
}

function aggregateByDay(scans: StoredScan[]): DailyConsumption[] {
  // Group scans by date
  // Sum consumedMl for each day
  // Return sorted array
}
```

**Chart View:**
```tsx
<div className="trends-chart">
  <header>
    <h3>Consumption Trends</h3>
    <UnitToggle value={unit} onChange={setUnit} />
  </header>
  
  <LineChart
    data={chartData}
    xKey="date"
    yKey="consumed"
    height={300}
    showTooltip
    showLegend
  />
  
  <Summary>
    <p>Total consumed: {total} {unit}</p>
    <p>Average per day: {average} {unit}/day</p>
  </Summary>
</div>
```

## Status

**Status**: ready-for-dev
**Created**: 2026-03-06

**Consumption trends chart ready for implementation**
