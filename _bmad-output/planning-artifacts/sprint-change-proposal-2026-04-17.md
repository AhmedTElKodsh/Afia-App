# Sprint Change Proposal — Epic 10: Stage 1 Launch Readiness

**Date:** 2026-04-17  
**Proposed By:** Bob (Scrum Master)  
**Trigger:** Epic 7 Retrospective — 2 critical gaps identified  
**Change Type:** Epic Addition (New Epic 10)  
**Priority:** CRITICAL — Stage 1 Launch Blockers  
**Status:** APPROVED

---

## Executive Summary

Epic 7 retrospective identified 2 critical gaps that block Stage 1 launch readiness:

1. **FR28 (Camera Orientation Guide)** — Missing implementation prevents consistent training data collection
2. **Story 7.5b (Version Management UI)** — Deferred admin capability creates operational risk at scale

Both items are documented in the PRD but were not converted to stories during Epic 7 planning. This proposal creates **Epic 10: Stage 1 Launch Readiness** with 2 stories to resolve these blockers before first real user scans.

**Impact:** +1 week implementation time. Acceptable for launch readiness.

---

## Change Trigger

**Source:** `_bmad-output/implementation-artifacts/epic-7-retro-2026-04-17.md`

**Key Findings:**
- Epic 7 delivered 8/8 stories (100% complete)
- All Stage 2 pipeline code architecturally complete
- **BUT:** 2 pre-launch requirements identified as missing:
  - FR28 camera orientation guide (data quality gate)
  - Version Management UI (operational requirement)

**Retrospective Quote:**
> "FR28 (camera orientation guide) is a data quality gate, not UX polish. Inconsistent bottle orientation in training images degrades model accuracy."

---

## Problem Statement

### Gap 1: FR28 Camera Orientation Guide (Missing)

**PRD Reference:** FR28 — "The system must enforce that the bottle is captured from the frontside with the handle on the right for valid analysis"

**Current State:**
- No viewfinder guidance for bottle orientation
- Users can capture bottles from any angle
- Training data will contain inconsistent orientations

**Risk if Not Addressed:**
- Stage 2 CNN model trains on inconsistent ground truth
- Model learns wrong orientation patterns
- Accuracy degrades when deployed
- 500-scan training gate produces low-quality dataset

**Why Critical:**
Training data quality determines Stage 2 model accuracy. Inconsistent bottle orientation is not a UX polish issue — it's a data quality gate that must be enforced before scan data collection begins.

### Gap 2: Version Management UI (Deferred)

**PRD Reference:** Story 7.5, Task 5 — Admin panel model version activation/rollback

**Current State:**
- Model version management exists in backend (Story 7.5 complete)
- Admin cannot activate/rollback versions from UI
- Requires direct Supabase database access

**Risk if Not Addressed:**
- Model rollback under pressure requires technical database access
- Operational bottleneck when Stage 2 activates at scale
- No self-service admin capability for model management

**Why Critical:**
Acceptable for controlled testing phase, but becomes operational risk when Stage 2 activates at 500-scan gate. Admin needs UI-based version control before production scale.

---

## Proposed Solution

### Create Epic 10: Stage 1 Launch Readiness

**Epic Scope:** 2 stories to resolve pre-launch blockers

**Story 10-1: Camera Orientation Guide (FR28)**
- **Goal:** Enforce consistent bottle orientation during capture
- **Scope:** 
  - Viewfinder overlay indicator showing "Handle on Right"
  - Visual guide (icon or text) positioned in camera frame
  - Persistent during capture session
- **Acceptance Criteria:**
  - Overlay visible in viewfinder before capture
  - Clear visual indicator for handle direction
  - Does not obstruct bottle view
  - Works on iOS Safari and Android Chrome
- **Estimated Effort:** 0.5 weeks
- **Dependencies:** None (standalone UI enhancement)

**Story 10-2: Version Management UI (Story 7.5b)**
- **Goal:** Admin can activate/deactivate model versions from admin panel
- **Scope:**
  - Admin dashboard section for model version management
  - List all versions with status (active/inactive)
  - Toggle to activate/deactivate versions
  - Confirmation dialog for version changes
  - Updates `model_versions` table in Supabase
- **Acceptance Criteria:**
  - Admin can view all model versions
  - Admin can activate a version (sets `is_active=true`)
  - Admin can deactivate a version (sets `is_active=false`)
  - Only one version can be active at a time
  - Changes reflected in `/model/version` endpoint immediately
- **Estimated Effort:** 0.5 weeks
- **Dependencies:** Story 7.5 (Model Version Management backend — DONE)

**Total Effort:** 1 week

---

## Impact Analysis

### Artifacts Requiring Updates

| Artifact | Change Required | Severity |
|---|---|---|
| `sprint-status.yaml` | Add Epic 10 with 2 backlog stories | Minor |
| `docs/epics.md` | Add Epic 10 section with story details | Minor |
| PRD | No change (FR28 already documented) | None |
| Architecture | No change (no new technical decisions) | None |
| UX Design Spec | No change (viewfinder overlay is minor enhancement) | None |

**Conclusion:** Minimal artifact impact. No architectural changes required.

### Timeline Impact

| Milestone | Original Date | New Date | Delta |
|---|---|---|---|
| Epic 7 Complete | 2026-04-17 | 2026-04-17 | No change |
| Epic 10 Complete | N/A | 2026-04-24 | +1 week |
| Stage 1 Launch Ready | 2026-04-17 | 2026-04-24 | +1 week |
| 500-Scan Gate (Stage 2) | TBD | TBD | No change |

**Conclusion:** +1 week delay to Stage 1 launch. Acceptable for launch readiness.

### Resource Impact

- **Development:** 1 week (2 stories × 0.5 weeks each)
- **QA:** Included in story implementation
- **No additional infrastructure costs**

---

## Path Options Considered

### Option 1: Direct Adjustment (Create Epic 10) ✅ SELECTED

**Approach:** Add Epic 10 with 2 stories to backlog

**Pros:**
- Minimal disruption to completed work
- Clear separation of concerns (Epic 7 = Stage 2 pipeline, Epic 10 = Launch readiness)
- Stories can be implemented in parallel if needed
- No rework of existing epics

**Cons:**
- +1 week to Stage 1 launch timeline

**Decision:** Selected. Clean separation and minimal disruption justify the timeline extension.

### Option 2: Rollback Epic 7 (Replan)

**Approach:** Mark Epic 7 incomplete, add stories 7.9 and 7.10

**Pros:**
- Keeps all Stage 2 work in single epic

**Cons:**
- Disrupts completed retrospective
- Confusing numbering (Epic 7 already marked done)
- Requires updating Epic 7 retrospective document
- More artifact churn

**Decision:** Rejected. Epic 7 is legitimately complete — these are pre-launch items, not Stage 2 pipeline work.

### Option 3: Defer to Post-Launch

**Approach:** Launch without FR28 or Version Management UI

**Pros:**
- No timeline impact

**Cons:**
- **FR28:** Training data quality compromised from day 1 — unacceptable
- **Version Management UI:** Operational risk at scale — acceptable for testing, not for production
- Both items are documented in PRD as requirements

**Decision:** Rejected. FR28 is a data quality gate, not optional. Version Management UI is acceptable to defer for testing phase but not for production scale.

---

## Approval & Next Steps

### Approval Status

- [x] **Scrum Master (Bob):** Approved — clean separation, minimal disruption
- [x] **Project Lead (Ahmed):** Approved — +1 week acceptable for launch readiness
- [x] **Product Owner (Alice):** Approved — FR28 is critical for data quality
- [x] **Architect (Winston):** Approved — no architectural changes required

### Implementation Plan

1. **Update `sprint-status.yaml`** ✅ DONE
   - Add Epic 10 with status: backlog
   - Add Story 10-1 and 10-2 with status: backlog

2. **Update `docs/epics.md`** ⏳ IN PROGRESS
   - Add Epic 10 section with full story details

3. **Create Story 10-1** ⏳ NEXT
   - Run `/bmad-bmm-create-story` for Story 10-1 (Camera Orientation Guide)

4. **Implement Story 10-1**
   - Run `/bmad-bmm-dev-story` for Story 10-1

5. **Create Story 10-2**
   - Run `/bmad-bmm-create-story` for Story 10-2 (Version Management UI)

6. **Implement Story 10-2**
   - Run `/bmad-bmm-dev-story` for Story 10-2

7. **Epic 10 Retrospective (Optional)**
   - Run `/bmad-bmm-retrospective` after both stories complete

---

## Success Criteria

Epic 10 is complete when:

- [x] Epic 10 added to `sprint-status.yaml`
- [ ] Epic 10 documented in `docs/epics.md`
- [ ] Story 10-1 implemented and tested
- [ ] Story 10-2 implemented and tested
- [ ] Camera viewfinder shows orientation guide
- [ ] Admin can activate/deactivate model versions from UI
- [ ] All tests passing
- [ ] Stage 1 launch readiness confirmed

---

## Retrospective Notes

**What Went Well:**
- Epic 7 retrospective caught critical gaps before launch
- Correct Course workflow provided structured decision framework
- Team aligned on priority (data quality > timeline)

**What Could Improve:**
- FR → Story coverage check during epic planning (Action Item #1 from Epic 7 retro)
- Earlier identification of "launch blocker" vs "nice to have" requirements

**Lessons Learned:**
- PRD completeness ≠ epic completeness
- Every FR in scope needs explicit story before sprint starts
- Retrospectives are valuable even when epic is "100% complete"

---

**Change Proposal Status:** APPROVED  
**Implementation Status:** IN PROGRESS  
**Next Action:** Update `docs/epics.md` with Epic 10 details

---

*Sprint Change Proposal — Afia Oil Tracker | 2026-04-17 | Facilitated by Bob (Scrum Master)*
