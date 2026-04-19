# Sprint Change Proposal — Afia-App Scope Expansion
**Date:** 2026-04-14
**Prepared by:** BMad Master (Correct Course Workflow)
**Status:** Approved by Ahmed — Pending artifact implementation
**Scope Classification:** Moderate

---

## Section 1: Issue Summary

### Problem Statement

During planning review on 2026-04-14, five scope gaps were identified between the original POC planning artifacts (PRD, Architecture, Epics) and Ahmed's full product vision. None of the five epics have been implemented yet — this is a purely planning-phase correction.

### Gaps Identified

| ID | Gap | Severity |
|----|-----|----------|
| A | Story 1.7 missing multi-Gemini-key rotation + few-shot prompting | Major |
| B | No consumption tracking slider or cup visualization on result screen | Major |
| C | Admin dashboard entirely absent from all planning artifacts | Major |
| D | Local TF.js model pipeline entirely absent from all planning artifacts | Major |
| E | Supabase training database not in architecture | Major |

### Context

- All 5 existing epics (18 stories) are unimplemented — zero rollback risk
- FR-14 (Admin dashboard) and FR-15 (Model fine-tuning) are explicitly "Out of Scope" in architecture.md — must be promoted to in-scope
- Research artifacts (obs 212, obs 314) fully approve the local model architecture — TF.js MobileNetV3-Small CNN regressor, 5–10% MAE vs LLM's 12–20%, <50ms inference
- Ahmed's stated intent: LLM prompt testing and local model development begin **in parallel** with POC epic delivery

---

## Section 2: Impact Analysis

### Epic Impact

| Epic | Impact | Details |
|------|--------|---------|
| Epic 1 (Basic Scan MVP) | Story update | Story 1.7 AC additions: multi-key pool + few-shot images |
| Epic 2 (Fill Verification) | None | Unchanged |
| Epic 3 (Consumption Insights) | New story | Add Story 3.3: consumption tracking slider + cup visualization |
| Epic 4 (Feedback Loop) | Schema update | Story 4.1: metadata schema adds `inference` block |
| Epic 5 (Resilience/Privacy/Edge) | None | Unchanged |
| **Epic 6 (Admin Dashboard)** | **NEW** | 5 new stories: auth, scan review, correction, upload, export |
| **Epic 7 (Local Model Pipeline)** | **NEW** | 5 new stories: Supabase, augmentation, training, client integration, versioning |

### Artifact Conflicts

| Artifact | Changes Required |
|----------|-----------------|
| `prd.md` | FR-40–48 added; FR-14/15 removed from Out of Scope; 3 NFRs added |
| `architecture.md` | Multi-key pool, Supabase box, local model routing, admin section, metadata schema |
| `ux-design-specification.md` | Screen 6 consumption slider addition; Screen 8 admin dashboard (3 sub-screens) |
| `llm-prompts.md` | Multi-key rotation logic + few-shot reference images section |
| `api-spec.md` | /admin/* endpoint specs (list, correct, upload, export, version) |
| `data-schemas.md` | Updated metadata `inference` block + Supabase table definitions |
| `deployment-guide.md` | Supabase setup + GEMINI_KEY_1..N Worker secrets config |

### Technical Impact

- **Worker**: key pool rotation logic, Supabase JS client write, /admin/* routes, ADMIN_SECRET validation
- **PWA**: TF.js model loading/inference, IndexedDB caching, /admin route, consumption slider component
- **Infrastructure**: Supabase project (free tier, 500MB), additional Cloudflare Worker secrets
- **Training pipeline**: Node.js augmentation script, Python training script (Colab/local GPU), TF.js export + R2 upload

---

## Section 3: Recommended Approach

**Selected: Option 1 — Direct Adjustment**

Rationale:
- Nothing implemented → zero rollback cost
- All changes additive: new FRs, 2 new epics, story AC updates
- POC delivery (Epics 1–5) unblocked — proceeds on Track A unchanged
- Parallel tracks align with Ahmed's stated intent

### Execution Tracks

```
Track A — POC delivery (sequential, existing team):
  Epic 1 (Story 1.7 updated) → Epic 2 → Epic 3 (+ Story 3.3)
  → Epic 4 (Story 4.1 updated) → Epic 5

Track B — Parallel development (starts immediately):
  Story 1.7 LLM prompt testing + multi-key rotation prototyping
  + Epic 7.1 Supabase schema setup
  + Epic 7.2 augmentation pipeline scaffolding

Track C — Follows Track A Epic 4 completion:
  Epic 6 Admin Dashboard
  (requires real scan data flowing through R2 + Supabase)

Track D — Gated on 500 training-eligible scans (~Month 4–6):
  Epic 7.3 CNN training
  Epic 7.4 client-side model integration
  Epic 7.5 version management
```

**Effort estimate:** Medium (1–2 days artifact updates; parallel dev tracks ongoing)
**Risk:** Low (planning phase; no code changes yet)
**Timeline impact on POC:** None

---

## Section 4: Detailed Change Proposals

All proposals approved by Ahmed on 2026-04-14.

---

### Proposal A — Story 1.7: Multi-Key Rotation + Few-Shot Prompting ✅

**Story:** 1.7 — Worker API Proxy (AI Integration)
**Section:** Acceptance Criteria — additions

```
OLD:
- Worker calls Gemini 2.5 Flash with structured JSON prompt
- On 429/5xx → auto-fallback to Groq Llama 4 Scout
- Single GEMINI_API_KEY Worker secret

NEW (additions):
- Worker holds GEMINI_KEY_1..GEMINI_KEY_N secrets (min 2, max 10)
- Key rotation: round-robin per request; on 429 → next key → exhaust
  pool → fall through to Groq
- LLM prompt includes 2 base64-encoded reference images:
    - reference_100pct.jpg (full bottle, ~5KB low-res)
    - reference_25pct.jpg  (quarter bottle, ~5KB low-res)
  with annotated fill line positions as few-shot context
- Reference images stored as Worker environment assets (not per-request
  upload); total prompt overhead < 15KB
- Response parsing unchanged: { fillPercentage, confidence, notes }
```

---

### Proposal B — Story 3.3: Consumption Tracking Slider (NEW) ✅

**Epic:** 3 — Consumption Insights
**Position:** New story after Story 3.2

```
Story 3.3: Consumption Measurement Slider

Goal: After viewing oil level result, user can measure how much
oil they intend to use, expressed in 55ml steps and tea cup units.

Acceptance Criteria:

Given: User is on Result screen (RESULT_DISPLAY state)
When: Screen renders
Then:
  - Vertical slider appears beside bottle image
  - Slider anchored at confirmed fill level (top = current oil level)
  - Slider minimum position = 0ml consumed (no movement)
  - Slider maximum position = remaining oil (bottom of bottle)
  - If remaining oil < 55ml → slider disabled with message
    "Less than ½ cup remaining"

Given: User moves slider thumb
When: Thumb crosses each 55ml increment
Then:
  - Each 55ml step emits haptic feedback (if device supports)
  - Cup display updates below slider:
      55ml  → "½ Cup"
      110ml → "1 Cup"
      165ml → "1½ Cups"
      220ml → "2 Cups"
      (pattern: n × 55ml = n/2 Cups)
  - If remaining < next 55ml step, slider stops at last full step
  - Cup icon shown: half-filled SVG at odd steps, full SVG at even steps

Given: Remaining oil is e.g. 840ml and user moves to 3 steps (165ml)
Then:
  - Slider shows "1½ Cups"
  - Bottle image fill line does NOT change (slider is read-only
    measurement tool, not a new fill confirmation)
  - "Remaining after use: 675ml" shown as secondary text

Component: <ConsumptionSlider /> (new)
State: RESULT_DISPLAY (no new app state needed)
Dependencies: Story 2.3 confirmedFillMl, Story 3.1 volumeCalculator
AR: Radix UI Slider (vertical, consistent with Epic 2 slider)
```

---

### Proposal C — Story 4.1: Metadata Schema Update ✅

**Story:** 4.1 — R2 Storage
**Section:** Data Schema

```
OLD metadata/{scanId}.json — llm block:
{
  "llm": {
    "provider": "gemini-2.5-flash",
    "fillPercentage": 42,
    "confidence": "high",
    "latencyMs": 2340
  },
  "trainingEligible": false
}

NEW — replace "llm" block with "inference" block:
{
  "inference": {
    "localModelResult": null,
    "localModelConfidence": null,
    "localModelVersion": null,
    "llmFallbackUsed": true,
    "llmProvider": "gemini-2.5-flash",
    "llmKeyIndex": 2,
    "llmFillPercentage": 42,
    "llmConfidence": "high",
    "llmLatencyMs": 2340
  },
  "trainingEligible": false
}

AC addition:
- Worker stores llmKeyIndex (integer)
- localModel* fields always written as null in POC phase
- Schema forward-compatible: Epic 7 fills localModel* fields
  without breaking existing records
```

---

### Proposal D — Epic 6: Admin Dashboard (NEW) ✅

```
Epic 6: Admin Dashboard

Story 6.1: Admin Authentication
- Worker validates ADMIN_SECRET header on all /admin/* routes
- PWA: /admin route behind password prompt (localStorage token)
- Timeout: 24h session

Story 6.2: Scan Review Dashboard
- Paginated list of all scans (newest first)
- Each row: thumbnail + SKU + date + llmFillPercentage +
  localModelResult (null → "—") + trainingEligible badge
- Click row → scan detail view (full image, LLM vs local model,
  user feedback, trainingEligible status)

Story 6.3: Admin Correction Flow
- On scan detail: [Too Big] [Too Small] [Correct] [Way Off] buttons
- On non-Correct: manual fill % input OR [Run LLM Again]
- [Run LLM Again]: Worker re-calls LLM (key rotation), stores in
  adminLlmResult field
- Save → updates metadata + sets trainingEligible: true

Story 6.4: Admin Image Upload
- Upload form: image + SKU selector + fill level % input + notes
- Worker stores to R2 as images/admin-{uuid}.jpg
- source: "admin_upload", trainingEligible: true (always)

Story 6.5: Training Data Export
- "Export training-eligible scans (CSV)" button
- Returns: scanId, imageUrl, confirmedFillPct, source,
           correctionMethod, sku, timestamp

Deployment: same Cloudflare Pages app, /admin path
Auth: ADMIN_SECRET Worker secret + localStorage session token
```

---

### Proposal E — Epic 7: Local Model + Training Pipeline (NEW) ✅

```
Epic 7: Local Model + Training Pipeline

Story 7.1: Supabase Training Database
- Tables: training_samples, model_versions
- Worker writes to Supabase on trainingEligible=true
- Label confidence weighting:
    admin_correction/upload → 1.0
    user_feedback (validated) → 0.85
    llm_only (high conf) → 0.60

Story 7.2: Training Data Augmentation Pipeline
- Node.js script: reads training_samples where augmented=false
- Per image: ~8 variants (brightness, contrast, flip, rotation, JPEG quality)
- 48× multiplier → 500 base → ~24,000 samples
- Training threshold: 500 base training-eligible scans

Story 7.3: TF.js CNN Regressor — Training + Deployment
- Architecture: MobileNetV3-Small backbone + single sigmoid head
- Loss: Huber loss
- Training: Python (Colab/local GPU) → TF.js LayersModel export
- Upload to R2: models/fill-regressor/v{semver}/model.json + shards
- Target MAE: ≤10%

Story 7.4: Client-Side Model Integration + Fallback Routing
- PWA: lazy-load model from R2, cache IndexedDB
- Routing:
    localConf >= 0.75 → use local result, skip LLM
    localConf < 0.75  → call Worker /analyze (LLM path)
- Worker /analyze: accepts optional localModelResult in body

Story 7.5: Model Version Management
- GET /model/version → current deployed version from Supabase
- PWA: checks version on load, re-downloads if newer
- Admin dashboard: shows version + MAE + sample count
- Rollback: set active version in model_versions table

Dependencies: 7.1 → 7.2 → 7.3 → 7.4 → 7.5
Gated on: 500 training-eligible scans (~Month 4–6 post-POC)
```

---

### Proposal F — Architecture Document Updates ✅

```
Sections to update in architecture.md:

F1. Section 2: Flip FR-14/15 from Out of Scope to In Scope (✅)
F2. Section 3: Add Supabase box + Local Model box to system diagram
F3. Section 4: Add Supabase, TF.js, Admin auth to tech stack table
F4. Section 8: Update fallback chain diagram (local model → key pool → Groq)
F5. Section 6: Replace "llm" metadata block with "inference" block
F6. Add Section 15: Admin Architecture
    (/admin/* Worker routes, Supabase write path, admin PWA route)
```

---

### Proposal G — PRD Updates ✅

```
Sections to update in prd.md:

G1. Add FR-40 through FR-48 (multi-key, few-shot, consumption slider,
    cup viz, Supabase, local model, LLM fallback routing,
    admin correction, admin upload)
G2. Remove FR-14/15 from Out of Scope section
G3. Add NFR-30/31/32 (local model inference, model load time,
    Supabase write latency)
G4. Update Phase 3 roadmap: Epic 7 activates at 500 scans
```

---

### Proposal H — UX Specification Updates ✅

```
Sections to update in ux-design-specification.md:

H1. Screen 6 (Result Display): add consumption slider section
    - Vertical Radix slider anchored at fill line
    - 55ml steps, cup SVG display below
    - "Remaining after use: Nml" secondary text
    - Edge case: remaining < 55ml → slider hidden

H2. Add Screen 8 (Admin Dashboard):
    - Screen 8a: Scan List (paginated, filter bar, badges)
    - Screen 8b: Scan Detail (full image, inference panel,
                 correction buttons, training toggle)
    - Screen 8c: Image Upload (file picker, SKU, fill %, notes)
    - State: ADMIN_SESSION (isolated from user flow)
```

---

## Section 5: Implementation Handoff

**Scope classification: Moderate**
Requires backlog reorganization across PRD + Architecture + Epics + UX. Two new epics. But no fundamental replan — existing 18 stories remain valid.

### Artifact Update Responsibilities

| Agent | Artifacts to update |
|-------|-------------------|
| PM (`bmad-bmm-edit-prd`) | prd.md — FR-40–48, remove FR-14/15 Out of Scope, NFR-30–32, phase roadmap |
| Architect (`bmad-bmm-create-architecture`) | architecture.md — all F1–F6 changes |
| PM (`bmad-bmm-create-epics-and-stories`) | epics.md — Story 1.7 update, Story 3.3 (new), Story 4.1 update, Epic 6 (5 stories), Epic 7 (5 stories) |
| UX Designer (`bmad-bmm-create-ux-design`) | ux-design-specification.md — H1 Screen 6, H2 Screen 8 |
| Tech Writer (manual or `bmad-agent-tech-writer`) | llm-prompts.md, api-spec.md, data-schemas.md, deployment-guide.md |

### Execution Sequence

```
Step 1 (now):     Edit PRD [EP] — add FRs/NFRs, flip scope
Step 2 (now):     Edit Architecture — F1–F6 additions
Step 3 (now):     Edit Epics — Story 1.7, 3.3, 4.1, Epic 6, Epic 7
Step 4 (now):     Edit UX Spec — Screen 6 slider, Screen 8 admin
Step 5 (parallel): LLM prompt testing begins (Track B)
Step 6 (parallel): Epic 7.1 Supabase setup (Track B)
Step 7 (after EP4 complete): Epic 6 Admin Dashboard dev (Track C)
Step 8 (Month 4–6): Epic 7.3–7.5 model training (Track D)
```

### Success Criteria

- [ ] All 9 new FRs (FR-40–48) present in prd.md
- [ ] FR-14/15 removed from Out of Scope in prd.md and architecture.md
- [ ] Story 1.7 AC includes key pool rotation + few-shot spec
- [ ] Story 3.3 present in epics.md with full Given/When/Then AC
- [ ] Story 4.1 metadata schema shows `inference` block (not `llm`)
- [ ] Epic 6 has 5 stories with testable AC
- [ ] Epic 7 has 5 stories with testable AC
- [ ] Screen 6 in UX spec shows consumption slider wireframe
- [ ] Screen 8 in UX spec shows admin dashboard wireframes (8a/8b/8c)
- [ ] architecture.md Section 3 diagram includes Supabase + local model boxes
- [ ] Implementation readiness check passes after all updates

---

*Sprint Change Proposal — Afia-App | Generated 2026-04-14 | BMad Correct Course Workflow*
