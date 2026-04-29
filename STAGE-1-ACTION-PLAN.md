# Stage 1 Completion - Action Plan

**Date:** 2026-04-29
**Branch:** stage-1-llm-only
**Goal:** Complete Stage 1 MVP before transitioning to Stage 2 (local model)

---

## Current Status Summary

✅ **Completed:**
- QR code landing and routing
- Camera activation with static bottle outline
- Image quality gates
- LLM analysis (Gemini + Groq fallback)
- Admin dashboard with scan history
- Export functionality (JSON/CSV)
- Manual correction and LLM re-analysis
- Admin upload for training data
- CI/CD pipeline with automated testing
- Secrets management and deployment

⏳ **In Progress:**
- Training data collection
- E2E test refinement (19/21 passing)

❌ **Not Started:**
- Interactive slider (55ml increments)
- Logo detection (Afia brand verification)
- Distinct QR codes for bottle sizes
- Enhanced quality guidance messages

---

## Priority 1: Critical User Experience Features

### Task 1.1: Interactive Oil Level Slider
**Priority:** 🔴 CRITICAL
**Estimated Time:** 4-6 hours
**Dependencies:** None

**Requirements:**
- Slider positioned on left side of bottle image
- Starts at detected oil level (red line position)
- 55ml increments (1/4 tea cup)
- Touch/drag interaction for mobile
- Snap-to-increment behavior
- Stop at last 55ml level if remaining < 55ml

**Visual Cup Indicator:**
- Display below slider
- Show fill level based on slider position:
  - 55ml = 1/4 cup
  - 110ml = 1/2 cup
  - 165ml = 3/4 cup
  - 220ml = 1 cup
  - 275ml = 1 1/4 cups
  - Continue pattern...

**Implementation Steps:**
1. Create `OilLevelSlider.tsx` component
2. Calculate slider range based on bottle capacity
3. Implement touch/drag handlers
4. Add 55ml snap logic
5. Create cup fill visualization component
6. Integrate with `ResultDisplay.tsx`
7. Add i18n translations
8. Write E2E tests

**Files to Create/Modify:**
- `src/components/OilLevelSlider.tsx` (new)
- `src/components/CupIndicator.tsx` (new)
- `src/components/ResultDisplay.tsx` (modify)
- `src/components/OilLevelSlider.css` (new)
- `tests/e2e/oil-level-slider.spec.ts` (new)

**Acceptance Criteria:**
- [ ] Slider appears on result screen
- [ ] Starts at correct oil level position
- [ ] Moves in 55ml increments only
- [ ] Cup indicator updates correctly
- [ ] Works on touch devices
- [ ] Accessible (keyboard navigation)
- [ ] Passes E2E tests

---

### Task 1.2: Enhanced Quality Guidance Messages
**Priority:** 🟡 HIGH
**Estimated Time:** 2-3 hours
**Dependencies:** None

**Requirements:**
- Specific messages for lighting issues
- Position adjustment guidance
- Real-time feedback during camera view
- Clear, actionable instructions

**Implementation Steps:**
1. Enhance `imageQualityGate.ts` with detailed messages
2. Add real-time quality indicators to camera view
3. Create guidance overlay component
4. Add i18n translations for all messages
5. Update E2E tests

**Message Categories:**
- **Too Dark:** "Move to a brighter area or turn on more lights"
- **Too Bright:** "Reduce direct light or move to a shaded area"
- **Blurry:** "Hold the phone steady and ensure the bottle is in focus"
- **Poor Contrast:** "Ensure good lighting and avoid reflective surfaces"
- **Wrong Angle:** "Position the camera directly in front of the bottle"

**Files to Modify:**
- `src/utils/imageQualityGate.ts`
- `src/components/CameraViewfinder.tsx`
- `src/components/QualityGuidance.tsx` (new)
- `locales/en/translation.json`
- `locales/ar/translation.json`

**Acceptance Criteria:**
- [ ] Real-time quality feedback visible
- [ ] Messages are clear and actionable
- [ ] Translations available in all languages
- [ ] Quality gate thresholds tuned
- [ ] User testing shows improved success rate

---

## Priority 2: Brand Verification & Authentication

### Task 2.1: Afia Logo Detection
**Priority:** 🟡 HIGH
**Estimated Time:** 6-8 hours
**Dependencies:** None

**Requirements:**
- Detect "Afia" logo (Arabic + English text)
- Run locally in browser (no API calls)
- Fast enough for real-time or near-real-time
- Fail-safe: proceed with low confidence flag if geometry is good

**Implementation Options:**

**Option A: Template Matching (OpenCV.js)**
- Pros: Simple, fast, no training needed
- Cons: Sensitive to scale/rotation
- Best for: Controlled conditions

**Option B: TensorFlow.js + MobileNetV2**
- Pros: More robust, handles variations
- Cons: Requires training, larger bundle
- Best for: Production quality

**Recommended Approach: Start with Option A, upgrade to Option B later**

**Implementation Steps (Option A):**
1. Install OpenCV.js
2. Create logo templates (Arabic + English)
3. Implement template matching function
4. Add confidence scoring
5. Integrate with capture flow
6. Add "Low Logo Confidence" flag to results
7. Display in Admin Dashboard
8. Write tests

**Files to Create/Modify:**
- `src/utils/logoDetection.ts` (new)
- `src/assets/logo-templates/` (new directory)
- `src/components/CameraViewfinder.tsx` (modify)
- `worker/src/analyze.ts` (add confidence field)
- `src/components/AdminDashboard.tsx` (show confidence)
- `tests/unit/logoDetection.test.ts` (new)

**Acceptance Criteria:**
- [ ] Logo detection runs in browser
- [ ] Detects Afia Arabic text
- [ ] Detects Afia English text
- [ ] Returns confidence score
- [ ] Flags low confidence in dashboard
- [ ] Doesn't block capture if logo not found
- [ ] Performance < 500ms
- [ ] Passes unit tests

---

## Priority 3: Bottle Size Management

### Task 3.1: Distinct QR Codes for Bottle Sizes
**Priority:** 🟢 MEDIUM
**Estimated Time:** 3-4 hours
**Dependencies:** None

**Requirements:**
- Different QR codes for 1.5L and 2.5L bottles
- QR data includes bottle size/SKU
- App detects size from QR data
- Correct bottle parameters loaded

**Implementation Steps:**
1. Update QR code generation to include size
2. Modify QR landing to parse size
3. Update bottle registry with size-specific params
4. Pass size to camera/analysis components
5. Update tests with size variations
6. Generate new QR codes

**QR Data Format:**
```json
{
  "sku": "afia-corn-1.5l",
  "size": "1.5L",
  "capacity_ml": 1500,
  "url": "https://afia-app.pages.dev"
}
```

**Files to Modify:**
- `src/components/QrLanding.tsx`
- `src/data/bottleRegistry.ts`
- `src/App.tsx`
- `docs/QR-CODE-GENERATION.md` (new)
- `tests/e2e/qr-scanning.spec.ts` (new)

**Acceptance Criteria:**
- [ ] QR codes contain size information
- [ ] App correctly parses QR data
- [ ] Correct bottle parameters loaded
- [ ] Works for 1.5L bottles
- [ ] Works for 2.5L bottles (future)
- [ ] Documentation for QR generation
- [ ] Tests cover both sizes

---

## Priority 4: Testing & Quality Assurance

### Task 4.1: Complete E2E Test Coverage
**Priority:** 🟢 MEDIUM
**Estimated Time:** 4-5 hours
**Dependencies:** Tasks 1.1, 2.1, 3.1

**Current Status:**
- Camera outline matching: 19/21 passing
- Epic 5-6 features: All passing
- Epic 7-8 features: All passing

**Remaining Tests Needed:**
- [ ] Interactive slider tests
- [ ] Logo detection tests
- [ ] QR code size detection tests
- [ ] Quality guidance tests
- [ ] Error recovery tests
- [ ] Admin correction workflow tests

**Implementation Steps:**
1. Fix remaining 2 camera outline tests
2. Add slider interaction tests
3. Add logo detection tests
4. Add QR size detection tests
5. Add quality guidance tests
6. Add error scenario tests
7. Increase coverage to 90%+

**Files to Create/Modify:**
- `tests/e2e/camera-outline-matching.spec.ts` (fix)
- `tests/e2e/oil-level-slider.spec.ts` (new)
- `tests/e2e/logo-detection.spec.ts` (new)
- `tests/e2e/qr-scanning.spec.ts` (new)
- `tests/e2e/quality-guidance.spec.ts` (new)
- `tests/e2e/error-scenarios.spec.ts` (new)

**Acceptance Criteria:**
- [ ] All E2E tests passing
- [ ] Coverage > 90%
- [ ] Tests run in CI/CD
- [ ] Test reports generated
- [ ] No flaky tests

---

### Task 4.2: Performance Optimization
**Priority:** 🟢 MEDIUM
**Estimated Time:** 3-4 hours
**Dependencies:** None

**Areas to Optimize:**
1. **Bundle Size:**
   - Code splitting for admin dashboard
   - Lazy load heavy components
   - Optimize images and assets
   - Remove unused dependencies

2. **Image Processing:**
   - Optimize quality gate algorithms
   - Reduce canvas operations
   - Cache processed images
   - Use Web Workers for heavy tasks

3. **API Calls:**
   - Implement request caching
   - Optimize payload sizes
   - Add request deduplication
   - Implement retry with backoff

**Implementation Steps:**
1. Analyze bundle with webpack-bundle-analyzer
2. Implement code splitting
3. Optimize image processing pipeline
4. Add Web Worker for logo detection
5. Implement API caching
6. Measure and document improvements

**Files to Modify:**
- `vite.config.ts` (code splitting)
- `src/utils/imageQualityGate.ts` (optimize)
- `src/utils/logoDetection.ts` (Web Worker)
- `src/services/analysisRouter.ts` (caching)
- `docs/PERFORMANCE.md` (new)

**Acceptance Criteria:**
- [ ] Bundle size < 500KB (gzipped)
- [ ] First contentful paint < 1.5s
- [ ] Time to interactive < 3s
- [ ] Image processing < 500ms
- [ ] API response time < 2s
- [ ] Performance metrics documented

---

## Priority 5: Documentation & Developer Experience

### Task 5.1: Complete Documentation
**Priority:** 🟢 MEDIUM
**Estimated Time:** 2-3 hours
**Dependencies:** All above tasks

**Documentation Needed:**
- [ ] Interactive slider usage guide
- [ ] Logo detection implementation guide
- [ ] QR code generation guide
- [ ] Quality guidance configuration
- [ ] Performance optimization guide
- [ ] Testing guide
- [ ] Deployment guide updates

**Files to Create:**
- `docs/INTERACTIVE-SLIDER.md`
- `docs/LOGO-DETECTION.md`
- `docs/QR-CODE-GENERATION.md`
- `docs/QUALITY-GUIDANCE.md`
- `docs/PERFORMANCE.md`
- `docs/TESTING-GUIDE.md`
- `README.md` (update)

**Acceptance Criteria:**
- [ ] All features documented
- [ ] Code examples included
- [ ] Architecture diagrams added
- [ ] Troubleshooting guides
- [ ] API documentation complete

---

## Implementation Timeline

### Week 1: Critical Features
**Days 1-2:** Interactive Slider (Task 1.1)
**Days 3-4:** Logo Detection (Task 2.1)
**Day 5:** Enhanced Quality Guidance (Task 1.2)

### Week 2: Integration & Testing
**Days 1-2:** QR Code Size Management (Task 3.1)
**Days 3-4:** Complete E2E Tests (Task 4.1)
**Day 5:** Performance Optimization (Task 4.2)

### Week 3: Polish & Documentation
**Days 1-2:** Bug fixes and refinements
**Days 3-4:** Complete Documentation (Task 5.1)
**Day 5:** Final testing and deployment

---

## Success Criteria for Stage 1 Completion

### Functional Requirements
- ✅ QR code scanning works for all bottle sizes
- ✅ Camera captures high-quality images
- ✅ Logo detection verifies Afia brand
- ✅ LLM analysis returns accurate oil levels
- ✅ Interactive slider allows user adjustment
- ✅ Results display clearly with visual feedback
- ✅ Admin dashboard shows all scans
- ✅ Manual correction and re-analysis work
- ✅ Training data upload functional

### Quality Requirements
- ✅ All E2E tests passing (100%)
- ✅ Unit test coverage > 80%
- ✅ No critical bugs
- ✅ Performance metrics met
- ✅ Accessibility standards met (WCAG 2.1 AA)

### Documentation Requirements
- ✅ All features documented
- ✅ API documentation complete
- ✅ Deployment guide updated
- ✅ Troubleshooting guide available

### Deployment Requirements
- ✅ CI/CD pipeline stable
- ✅ Secrets properly configured
- ✅ Monitoring and logging in place
- ✅ Error tracking functional

---

## Transition to Stage 2

Once Stage 1 is complete, the focus shifts to:

1. **Training Data Collection:**
   - Video frame extraction
   - AI augmentation pipeline
   - Data labeling and verification

2. **Local Model Development:**
   - Model architecture selection
   - Training pipeline setup
   - Browser deployment strategy
   - Performance optimization

3. **Hybrid Analysis System:**
   - Local model primary
   - LLM fallback integration
   - Result comparison and logging
   - Continuous improvement loop

---

## Risk Management

### High Risk Items
1. **Logo Detection Performance:** May need optimization or alternative approach
   - Mitigation: Start with simple template matching, upgrade if needed

2. **Slider UX on Mobile:** Touch interactions can be tricky
   - Mitigation: Extensive mobile testing, consider alternative input methods

3. **Bundle Size Growth:** Adding features increases bundle size
   - Mitigation: Aggressive code splitting and lazy loading

### Medium Risk Items
1. **E2E Test Stability:** Tests may become flaky
   - Mitigation: Proper wait strategies, retry logic

2. **Performance Degradation:** New features may slow down app
   - Mitigation: Continuous performance monitoring

---

## Next Immediate Actions

1. **Start Task 1.1:** Begin implementing interactive slider
2. **Review Workflow:** Ensure all requirements captured
3. **Set Up Monitoring:** Track Stage 1 completion progress
4. **Schedule Reviews:** Weekly progress check-ins

---

**Last Updated:** 2026-04-29
**Status:** Ready to begin implementation
**Next Review:** After Task 1.1 completion
