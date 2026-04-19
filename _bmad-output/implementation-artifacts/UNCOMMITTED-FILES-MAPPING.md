# Uncommitted Files Mapping to Stories

**Generated:** 2026-04-16  
**Purpose:** Map the 40 uncommitted files to their appropriate story files for proper tracking

## Overview

After committing Story 1-1 (PWA Foundation), 40 files remain uncommitted. These files belong to various stories across Epic 1-8. This document maps each file to its appropriate story for proper scope tracking.

---

## Epic 1: Core Scan Experience

### Story 1-2: Cloudflare Infrastructure Setup
**Story File:** `1-2-cloudflare-infrastructure-setup.md`

**Files:**
- `worker/src/index.ts` - Main worker entry point
- `worker/src/types.ts` - Worker type definitions

---

### Story 1-3: Bottle Registry & Nutrition Data
**Story File:** `1-3-bottle-registry-nutrition-data.md`

**Files:**
- `shared/bottleRegistry.ts` - Bottle SKU registry
- `shared/volumeCalculator.ts` - Volume calculation utilities

---

### Story 1-4: QR Landing Page
**Story File:** `1-4-qr-landing-page.md`

**Files:**
- `src/App.tsx` - Main app component with QR landing state

---

### Story 1-5: Camera Activation & Viewfinder
**Story File:** `1-5-camera-activation-viewfinder.md`

**Files:**
- `src/components/CameraViewfinder.tsx` - Camera viewfinder component
- `src/hooks/useCameraGuidance.ts` - Camera guidance hook
- `src/utils/cameraQualityAssessment.ts` - Camera quality assessment

---

### Story 1-8: Worker API Proxy & Analyze Endpoint
**Story File:** `1-8-worker-api-proxy-analyze-endpoint.md`

**Files:**
- `src/api/apiClient.ts` - API client for worker communication
- `worker/src/analyze.ts` - Analyze endpoint implementation
- `worker/src/providers/buildAnalysisPrompt.ts` - LLM prompt builder
- `worker/src/providers/parseLLMResponse.ts` - LLM response parser

---

### Story 1-9: Gemini Vision Integration
**Story File:** `1-9-gemini-vision-integration.md`

**Files:**
- `worker/src/providers/gemini.ts` - Gemini API integration

---

### Story 1-10: Groq Fallback Integration
**Story File:** `1-10-groq-fallback-integration.md`

**Files:**
- (Already tracked in 1-9, fallback logic in gemini.ts)

---

### Story 1-11: AI Analysis Loading State
**Story File:** `1-11-ai-analysis-loading-state.md`

**Files:**
- `src/App.tsx` - Loading state management (already in 1-4)

---

## Epic 2: Rich Consumption Insights

### Story 2-7: Confidence Level Handling
**Story File:** `2-7-confidence-level-handling.md`

**Files:**
- `src/hooks/useLocalAnalysis.ts` - Local analysis with confidence scoring

---

## Epic 3: Continuous Improvement Loop

### Story 3-1: Volume Calculation Engine
**Story File:** `3-1-volume-calculation-engine.md`

**Files:**
- `shared/volumeCalculator.ts` - (Already tracked in 1-3)

---

### Story 4-1: Result Display Component
**Story File:** `4-1-result-display-component.md`

**Files:**
- `src/components/ResultDisplay.tsx` - Result display component
- `src/components/ResultDisplay.css` - Result display styles

---

### Story 4-2: Feedback Collection System
**Story File:** `4-2-feedback-collection-system.md`

**Files:**
- `worker/src/feedback.ts` - Feedback endpoint implementation

---

### Story 4-3: Frictionless Accuracy Rating
**Story File:** `4-3-frictionless-accuracy-rating.md`

**Files:**
- (Integrated in ResultDisplay.tsx)

---

### Story 4-4: Corrected Fill Estimate Slider
**Story File:** `4-4-corrected-fill-estimate-slider.md` or `fill-confirm-3-vertical-step-slider.md`

**Files:**
- `src/components/FillConfirm.tsx` - Fill confirmation with slider
- `src/components/FillConfirm.css` - Fill confirm styles

---

## Epic 5: Admin Dashboard

### Story 5-1: Admin Dashboard Layout
**Story File:** `5-1-admin-dashboard-layout.md`

**Files:**
- `src/components/AdminDashboard.tsx` - Admin dashboard component
- `worker/src/admin.ts` - Admin API endpoints
- `worker/src/adminAuth.ts` - Admin authentication
- `worker/src/storage/supabaseClient.ts` - Supabase integration

---

### Story 5-2: Bottle Registry Management
**Story File:** `5-2-bottle-registry-management.md`

**Files:**
- `src/components/BottleOverlay.tsx` - Bottle overlay component

---

## Epic 6: Scan History

### Story 6-1: Scan History Tracking
**Story File:** `6-1-scan-history-tracking.md`

**Files:**
- `src/hooks/useScanHistory.ts` - Scan history hook

---

## Epic 8: Test Lab

### Test Lab Mode
**Story File:** `tech-spec-testlab-mode-refactor-api-inspector.md`

**Files:**
- `src/components/TestLab.tsx` - Test lab component

---

## Internationalization (Cross-Epic)

**Files:**
- `src/i18n/locales/ar/translation.json` - Arabic translations
- `src/i18n/locales/en/translation.json` - English translations

**Recommendation:** Create a dedicated story for i18n setup or track in Story 1-1 as foundation work.

---

## E2E Tests (Cross-Epic)

**Files:**
- `tests/e2e/epic-1-critical-path.spec.ts` - Epic 1 E2E tests
- `tests/e2e/epic-3-feedback.spec.ts` - Epic 3 E2E tests
- `tests/e2e/qr-simulation.spec.ts` - QR simulation tests
- `tests/e2e/test-lab-full-flow.spec.ts` - Test lab E2E tests

**Recommendation:** Track E2E tests in their respective epic's final story or create dedicated QA stories.

---

## Documentation (Cross-Epic)

**Files:**
- `docs/architecture.md` - Architecture documentation
- `docs/data-models.md` - Data models documentation
- `docs/development-guide.md` - Development guide
- `docs/epics.md` - Epics documentation
- `_bmad-output/planning-artifacts/prd.md` - Product requirements

**Recommendation:** Track documentation updates in the story that triggered the change, or create a dedicated documentation story.

---

## Test Results (Ignore)

**Files:**
- `test-results/.last-run.json` - Test run metadata

**Recommendation:** Add to `.gitignore` - this is generated output, not source code.

---

## Summary

| Category | File Count | Recommendation |
|----------|------------|----------------|
| Epic 1 Stories | 12 files | Update stories 1-2, 1-3, 1-4, 1-5, 1-8, 1-9 |
| Epic 2 Stories | 1 file | Update story 2-7 |
| Epic 4 Stories | 4 files | Update stories 4-1, 4-2, 4-4 |
| Epic 5 Stories | 5 files | Update stories 5-1, 5-2 |
| Epic 6 Stories | 1 file | Update story 6-1 |
| Test Lab | 1 file | Update tech spec |
| i18n | 2 files | Create i18n story or add to 1-1 |
| E2E Tests | 4 files | Track in epic stories or create QA stories |
| Documentation | 5 files | Track in triggering stories |
| Test Results | 1 file | Add to .gitignore |

**Total:** 40 files mapped

---

## Next Actions

1. **Update each story file** with its File List section showing which files were modified
2. **Commit files by story** using story-specific commit messages
3. **Add test-results/ to .gitignore** to prevent tracking generated files
4. **Create i18n story** if internationalization wasn't part of original scope
5. **Review E2E test tracking** - decide if tests belong in epic stories or separate QA stories

---

## Commit Strategy

**Option A: Commit by Story (Recommended)**
- Group files by story and commit each story separately
- Use conventional commit messages: `feat(story-id): description`
- Maintains clean git history aligned with story tracking

**Option B: Commit by Epic**
- Group all Epic 1 files, commit together
- Faster but less granular tracking

**Option C: Commit All Remaining**
- Single commit for all 40 files
- Fastest but loses story-level traceability

**Recommendation:** Use Option A for stories with 1-5 files, Option B for epics with many small changes.
