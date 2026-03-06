---
story_id: "8.1"
story_key: "8-1-export-data-csv-pdf"
epic: 8
status: ready-for-dev
created: "2026-03-06"
author: "Ahmed"
---

# Story 8.1: Export Data (CSV, PDF)

## Story Information

| Field | Value |
|-------|-------|
| **Epic** | Epic 8: Data Export |
| **Story ID** | 8.1 |
| **Story Key** | 8-1-export-data-csv-pdf |
| **Status** | ready-for-dev |
| **Priority** | Low - Nice to Have |
| **Estimation** | 2-3 hours |
| **Dependencies** | Story 6.1 (✅ Scan History) |

## User Story

**As a** user,
**I want** to export my consumption data,
**So that** I can analyze it externally or share with my nutritionist.

## Acceptance Criteria

### Primary AC

**Given** I have scan history
**When** I go to Settings > Export Data
**Then** I can:
1. Export as CSV (spreadsheet-compatible)
2. Export as PDF (formatted report)
3. Select date range for export
4. Choose what data to include (scans, trends, summary)

### CSV Export Format

**Columns:**
```
Date,Time,Bottle SKU,Bottle Name,Fill %,Remaining (ml),Consumed (ml),
Consumed (tbsp),Consumed (cups),Calories,Total Fat (g),Confidence
```

**Example:**
```csv
2026-03-06,14:30,filippo-berio-500ml,Filippo Berio EVOO,75,375,125,8.5,0.5,110,12.3,high
```

### PDF Export Format

**Sections:**
1. Header: "Afia Oil Tracker - Consumption Report"
2. Date range
3. Summary statistics
4. Scan history table
5. Trends chart (if available)

### Implementation

**Export Function:**
```typescript
async function exportToPDF(scans: StoredScan[], options: ExportOptions) {
  const doc = new jsPDF();
  
  // Add title
  doc.setFontSize(18);
  doc.text("Afia Oil Tracker - Consumption Report", 10, 20);
  
  // Add date range
  doc.setFontSize(12);
  doc.text(`Period: ${options.startDate} to ${options.endDate}`, 10, 30);
  
  // Add summary
  const summary = calculateSummary(scans);
  doc.text(`Total Consumed: ${summary.totalMl} ml`, 10, 40);
  
  // Add table
  const tableData = scans.map(s => [
    formatDate(s.timestamp),
    s.bottleName,
    `${s.fillPercentage}%`,
    `${s.consumedMl} ml`,
  ]);
  
  autoTable(doc, {
    head: [['Date', 'Bottle', 'Fill', 'Consumed']],
    body: tableData,
    startY: 50,
  });
  
  doc.save(`afia-report-${Date.now()}.pdf`);
}
```

**Dependencies:**
- `jspdf` - PDF generation
- `jspdf-autotable` - Table formatting
- Built-in CSV generation (already exists in exportResults.ts)

## Status

**Status**: ready-for-dev
**Created**: 2026-03-06

**Data export ready for implementation**
