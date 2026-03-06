---
story_id: "5.1"
story_key: "5-1-admin-dashboard-layout"
epic: 5
status: ready-for-dev
created: "2026-03-06"
author: "Ahmed"
---

# Story 5.1: Admin Dashboard Layout

## Story Information

| Field | Value |
|-------|-------|
| **Epic** | Epic 5: Admin Dashboard |
| **Story ID** | 5.1 |
| **Story Key** | 5-1-admin-dashboard-layout |
| **Status** | ready-for-dev |
| **Priority** | Medium - Admin Tools |
| **Estimation** | 2-3 hours |
| **Dependencies** | Story 4.2 (✅ Feedback Collection) |

## User Story

**As an** admin,
**I want** a dashboard to view system metrics and manage bottles,
**So that** I can monitor the app's performance and update the bottle registry.

## Acceptance Criteria

### Primary AC

**Given** I navigate to /admin (password-protected route)
**When** the dashboard loads
**Then** I see:
1. System metrics panel (total scans, active users, feedback count)
2. Recent scans table (last 50 scans with pagination)
3. Bottle registry management (add/edit/delete bottles)
4. Feedback summary (accuracy ratings distribution)
5. Export data buttons (JSON, CSV)

### Implementation Notes

**Route Protection:**
- Simple password prompt (env variable: ADMIN_PASSWORD)
- Store session in sessionStorage
- Auto-logout after 30 minutes

**Dashboard Sections:**
```tsx
<div className="admin-dashboard">
  <header>
    <h1>Admin Dashboard</h1>
    <button onClick={handleLogout}>Logout</button>
  </header>
  
  <MetricsPanel metrics={systemMetrics} />
  
  <div className="dashboard-grid">
    <RecentScansTable scans={recentScans} />
    <BottleRegistryManager bottles={bottleRegistry} />
    <FeedbackSummary feedback={feedbackStats} />
    <DataExportPanel onExport={handleExport} />
  </div>
</div>
```

**Metrics to Display:**
- Total scans (all time)
- Scans today
- Average accuracy rating
- Feedback submission rate
- Active bottles count

## Status

**Status**: ready-for-dev
**Created**: 2026-03-06

**Admin dashboard layout ready for implementation**
