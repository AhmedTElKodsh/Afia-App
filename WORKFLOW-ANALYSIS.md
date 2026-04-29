# Afia App Workflow Analysis & Implementation Status

**Date:** 2026-04-29
**Branch:** stage-1-llm-only
**Stage:** Stage 1 (LLM-only analysis)

---

## Overview

This document analyzes the complete Afia App workflow from QR code scanning to oil level measurement, tracking implementation status and identifying next steps.

---

## Workflow Stages

### Stage 1: QR Code Scanning & Bottle Detection

#### 1.1 QR Code Entry Point
**Status:** ✅ Implemented

**Current Implementation:**
- User scans QR code on Afia oil bottle
- QR code contains URL to Cloudflare-deployed web app
- App opens in mobile browser

**Files:**
- `src/components/QrLanding.tsx` - QR landing page
- `src/App.tsx` - Main app routing

**Requirements from workflow.txt:**
- ✅ Different mock QR codes for 1.5L and 2.5L bottles
- ✅ Focus on 1.5L bottles for MVP
- ✅ Same shape but different sizes/geometries

**Next Steps:**
- [ ] Create distinct QR codes for different bottle sizes
- [ ] Add bottle size detection from QR data
- [ ] Update bottle registry with size-specific parameters

---

#### 1.2 Camera Activation
**Status:** ✅ Implemented

**Current Implementation:**
- Camera opens automatically after QR scan
- User sees static bottle outline as guidance
- Simplified from auto-detect/auto-capture to manual capture

**Files:**
- `src/components/CameraViewfinder.tsx` - Main camera component
- `src/assets/BottleOutline.tsx` - Static SVG outline
- `src/config/camera.ts` - Camera configuration

**Requirements from workflow.txt:**
- ✅ Camera opens to frontside of bottle
- ✅ General message directing user to shoot frontside (not backside/sides)
- ✅ Exact shape outline appears on screen
- ⚠️ **CHANGED:** No longer auto-lock/auto-capture - now manual capture with static guidance

**Implementation Changes:**
According to workflow.txt, the system was simplified:
- **Old approach:** Auto-detect outline matching, auto-lock, auto-capture
- **New approach:** Static outline as visual guidance only, manual capture

**Current Status:**
- ✅ Static bottle outline displayed (100mm × 301mm viewBox matching engineering specs)
- ✅ Manual capture button
- ✅ Quality gate checks (brightness, blur, contrast)
- ✅ Orientation guide for proper positioning

---

#### 1.3 Logo Detection (Afia Brand Verification)
**Status:** ⚠️ Partially Implemented (Local verification planned)

**Requirements from workflow.txt:**
> "we also need the camera after it confirms the outline matching the shape, it also confirms the 'Afia' (for now using the easiest way to detect the Afia either the whole logo or specifically the Afia Arabic and English word if technically possible and easy now)"

**Proposed Implementation:**
- **Method:** Template Matching (OpenCV.js) or lightweight MobileNetV2 (TensorFlow.js)
- **Logic:** Look for "Afia" branding (Arabic/English) within locked frame
- **Fail-safe:** If logo detection fails but geometry is perfect, proceed but flag as "Low Logo Confidence" in Admin Dashboard

**Current Status:**
- ❌ Logo detection not yet implemented
- ❌ Template matching not integrated
- ❌ Confidence flagging not in place

**Next Steps:**
- [ ] Implement local logo detection using OpenCV.js or TensorFlow.js
- [ ] Create Afia logo templates (Arabic + English)
- [ ] Add confidence scoring to analysis results
- [ ] Flag low-confidence detections in Admin Dashboard

---

### Stage 2: Image Analysis & Oil Level Detection

#### 2.1 Image Quality & Capture Conditions
**Status:** ✅ Implemented

**Requirements from workflow.txt:**
> "if the customer is shooting in a bad conditions and the camera won't take a 'bad' photo, it will direct the user to enhance the lightening or position"

**Current Implementation:**
- `src/utils/imageQualityGate.ts` - Quality checks
- Checks: brightness, blur, contrast
- User feedback for poor quality images

**Files:**
- `src/utils/imageQualityGate.ts`
- `src/components/CameraViewfinder.tsx` (quality gate integration)

**Next Steps:**
- [ ] Add specific lighting guidance messages
- [ ] Add position adjustment guidance
- [ ] Improve quality threshold tuning

---

#### 2.2 Analysis Strategy (3-Stage Approach)
**Status:** ✅ Stage 1 Implemented, Stage 2 & 3 In Progress

**From workflow.txt:**
> "I'm thinking about dividing the project into 2 levels/stages, 1st level/stage calls the LLM APIs directly for the analysis, refine, enhance the prompt to enhance the accuracy of the PI response from the first take, then test, debug and deploy. meanwhile, use the images database to train, develop, refine the local model, so for the 2nd level/stage is to use the local model as the primary model and the LLMs APIs as fallback"

**Current 3-Stage Strategy:**

##### **Stage 1: LLM-Only (Current)**
- ✅ Direct LLM API calls for analysis
- ✅ Multiple Gemini keys with Groq fallback
- ✅ Prompt engineering for accuracy
- ✅ Free-tier API usage
- ✅ Results saved to Admin Dashboard

**Implementation:**
- `worker/src/analyze.ts` - Main analysis handler
- `worker/src/providers/gemini.ts` - Gemini provider
- `worker/src/providers/groq.ts` - Groq fallback
- `worker/src/storage/supabaseClient.ts` - Result storage

##### **Stage 2: Local Model Primary + LLM Fallback**
- ⏳ Local lightweight model trained on real + augmented images
- ⏳ Runs on mobile browser
- ⏳ LLM API as fallback if local analysis fails
- ⏳ Both results saved for comparison

**Status:**
- ⏳ Training data collection in progress
- ⏳ Model architecture being developed
- ⏳ Browser deployment strategy planned

##### **Stage 3: Production (Future)**
- 🔮 Refined local model with acceptable accuracy
- 🔮 LLM fallback for edge cases
- 🔮 Continuous improvement from production data

---

#### 2.3 LLM Analysis Implementation
**Status:** ✅ Implemented

**Current Implementation:**
- Multiple LLM providers with fallback chain
- Gemini (3 keys) → Groq → OpenRouter → Mistral
- Prompt includes:
  - Text directions
  - Bottle image (base64)
  - Reference/guiding data
  - Engineering specifications
  - Few-shot examples (optimized for size/tokens)

**Files:**
- `worker/src/analyze.ts` - Analysis orchestration
- `worker/src/providers/gemini.ts` - Gemini integration
- `worker/src/providers/groq.ts` - Groq integration
- `worker/src/providers/openrouter.ts` - OpenRouter integration
- `worker/src/providers/mistral.ts` - Mistral integration

**API Keys Configuration:**
- ✅ GEMINI_API_KEY (primary)
- ✅ GEMINI_API_KEY2 (fallback 1)
- ✅ GEMINI_API_KEY3 (fallback 2)
- ✅ GROQ_API_KEY (fallback 3)
- ✅ Secrets synced via GitHub Actions on deploy

**Rate Limits (Free Tier):**
- Gemini: 15 req/min, 1,500 req/day per key (4,500/day total with 3 keys)
- Groq: 30 req/min, 14,400 req/day

---

#### 2.4 Training Data Collection
**Status:** ⏳ In Progress

**Requirements from workflow.txt:**
> "use the real images (extracted from video frames) as well as the AI-Augmented images (based on the real images) creating a Supabase database to train a local lightweight model"

**Current Implementation:**
- ✅ Supabase database for image storage
- ✅ Admin upload functionality
- ✅ Metadata tracking (SKU, fill percentage, augmentation type)
- ⏳ Video frame extraction scripts
- ⏳ AI augmentation pipeline

**Files:**
- `worker/src/adminUpload.ts` - Admin image upload
- `worker/src/storage/supabaseClient.ts` - Database integration
- `scripts/load-frames-to-supabase.py` - Frame loading script
- `scripts/merge-augmented-images.py` - Augmentation script

**Database Schema:**
```sql
training_images (
  id, scan_id, image_url, sku,
  fill_percentage, augmentation_type,
  created_at, metadata
)
```

**Next Steps:**
- [ ] Complete video frame extraction pipeline
- [ ] Implement AI augmentation (lighting, angles, backgrounds)
- [ ] Bulk upload training data
- [ ] Label verification workflow

---

### Stage 3: Result Display & User Interaction

#### 3.1 Oil Level Visualization
**Status:** ✅ Implemented

**Requirements from workflow.txt:**
> "the result shows the user or Admin should the imaged oil bottle with the oil level marked with red line and the consumed & remaining oil mentioned as text below"

**Current Implementation:**
- ✅ Bottle image displayed with red line marking oil level
- ✅ Consumed and remaining oil shown as text
- ✅ Visual feedback for analysis result

**Files:**
- `src/components/ResultDisplay.tsx` - Result visualization
- `src/components/FillConfirmScreen/` - Confirmation UI

---

#### 3.2 Interactive Slider (55ml increments)
**Status:** ⚠️ Needs Implementation

**Requirements from workflow.txt:**
> "on the left side of the bottle, a slider should appear starting at exactly the red line on the remaining oil level, with an inner circle/shape which the user can control and move by his thumb across the slider upper or lower where each shape move across the slider represents 55ml on the bottle"

**Detailed Requirements:**
- Slider starts at detected oil level (red line)
- Each increment = 55ml (1/4 tea cup)
- If remaining < 55ml, slider stops at last 55ml level
- Visual cup indicator below slider:
  - 55ml = 1/4 cup filled
  - 110ml = 1/2 cup filled
  - 220ml = 1 cup filled
  - 275ml = 1 1/4 cups filled
  - And so on...

**Current Status:**
- ❌ Interactive slider not implemented
- ❌ Cup visualization not implemented
- ❌ 55ml increment logic not implemented

**Next Steps:**
- [ ] Design slider UI component
- [ ] Implement 55ml increment snapping
- [ ] Create cup fill visualization
- [ ] Add touch/drag interaction
- [ ] Integrate with result display

---

### Stage 4: Admin Dashboard & Model Training

#### 4.1 Admin Dashboard Features
**Status:** ✅ Implemented

**Current Implementation:**
- ✅ Admin authentication
- ✅ Scan history viewing
- ✅ Export functionality (JSON/CSV)
- ✅ Image upload with metadata
- ✅ Manual correction capability
- ✅ LLM re-analysis trigger

**Files:**
- `src/components/AdminDashboard.tsx` - Main dashboard
- `worker/src/admin.ts` - Admin API endpoints
- `worker/src/adminUpload.ts` - Upload handler
- `worker/src/adminCorrect.ts` - Correction handler
- `worker/src/adminRerunLlm.ts` - Re-analysis handler

**Requirements from workflow.txt:**
> "the admin can click in the same time, on one of the buttons denoting that the measure is not accurate (too big or too small) and either add the correct result manually or also send the LLM API fallback"

**Current Features:**
- ✅ View all scans with metadata
- ✅ Mark results as inaccurate
- ✅ Manual correction input
- ✅ Trigger LLM re-analysis
- ✅ Upload training images
- ✅ Export data for analysis

---

#### 4.2 Training Data Management
**Status:** ⏳ In Progress

**Requirements from workflow.txt:**
> "the Admin to be able to upload an image along with the metadata and oil level, the should make use of all these results and data in training, refining and enhancing the local model"

**Current Implementation:**
- ✅ Admin upload endpoint
- ✅ Metadata capture (SKU, fill %, augmentation type)
- ✅ Image storage in R2 + Supabase
- ⏳ Training pipeline integration
- ⏳ Model refinement workflow

**Files:**
- `worker/src/adminUpload.ts`
- `TRAINING-DATA-UPLOAD-GUIDE.md`
- `UPLOAD-STATUS.md`

**Next Steps:**
- [ ] Complete training data pipeline
- [ ] Implement model training scripts
- [ ] Add data quality validation
- [ ] Create model versioning system

---

## Error Handling & Logging

### Error Scenarios
**Status:** ✅ Implemented

**Requirements from workflow.txt:**
> "even if the local mode for any reasons failed to analyze the photo, the direct action will be to direct the user to retake the photo (but such errors should be logged and saved on the admin side to review later)"

**Current Implementation:**
- ✅ Client-side error logging
- ✅ Server-side error tracking
- ✅ Admin error review dashboard
- ✅ Retry mechanism for failed analyses
- ✅ User-friendly error messages

**Files:**
- `worker/src/telemetry.ts` - Error logging
- `src/components/CameraViewfinder.tsx` - Client error handling
- `worker/src/analyze.ts` - Analysis error handling

---

## Testing Status

### E2E Tests
**Status:** ✅ Mostly Passing

**Test Suites:**
1. ✅ Camera Outline Matching (19/21 passing)
2. ✅ Epic 5-6 Features (Export functionality)
3. ✅ Epic 7-8 Features (History view)
4. ⏳ Additional test coverage needed

**Files:**
- `tests/e2e/camera-outline-matching.spec.ts`
- `tests/e2e/epic-5-6-features.spec.ts`
- `tests/e2e/epic-7-8-features.spec.ts`

---

## Deployment Status

### Current Deployment
**Branch:** stage-1-llm-only
**Environment:** Production (Stage 1)
**Status:** ✅ Deployed

**URLs:**
- Worker: https://afia-worker.savola.workers.dev
- Pages: https://afia-app.pages.dev

**CI/CD Pipeline:**
- ✅ Automated testing
- ✅ Linting & code quality
- ✅ Security scanning
- ✅ Worker deployment
- ✅ Pages deployment
- ✅ Secret synchronization

---

## Priority Next Steps

### High Priority (Stage 1 Completion)
1. [ ] **Implement Interactive Slider** (55ml increments + cup visualization)
2. [ ] **Add Logo Detection** (Afia brand verification)
3. [ ] **Create Distinct QR Codes** (1.5L vs 2.5L bottles)
4. [ ] **Enhance Quality Guidance** (lighting/position messages)

### Medium Priority (Stage 2 Preparation)
5. [ ] **Complete Training Data Pipeline** (video frames + augmentation)
6. [ ] **Develop Local Model Architecture** (browser-compatible)
7. [ ] **Implement Model Training Scripts**
8. [ ] **Create Model Versioning System**

### Low Priority (Future Enhancements)
9. [ ] **Add Advanced Analytics** (usage patterns, accuracy trends)
10. [ ] **Implement A/B Testing** (model comparison)
11. [ ] **Add Multi-language Support** (beyond current i18n)
12. [ ] **Optimize Performance** (reduce bundle size, improve load times)

---

## Technical Debt & Improvements

### Code Quality
- [ ] Refactor large components (CameraViewfinder, AdminDashboard)
- [ ] Add more unit test coverage
- [ ] Improve TypeScript type safety
- [ ] Document complex algorithms

### Performance
- [ ] Optimize image processing pipeline
- [ ] Reduce bundle size (code splitting)
- [ ] Implement service worker for offline support
- [ ] Add image caching strategy

### Security
- [ ] Implement rate limiting on client side
- [ ] Add CSRF protection
- [ ] Enhance input validation
- [ ] Regular dependency updates

---

## Conclusion

The Afia App is currently in **Stage 1** with core functionality implemented and deployed. The main workflow from QR scanning to LLM analysis is operational. Key remaining tasks focus on:

1. **User Experience:** Interactive slider for oil measurement
2. **Brand Verification:** Logo detection for authenticity
3. **Stage 2 Preparation:** Training data collection and local model development

The transition to Stage 2 (local model primary + LLM fallback) requires completing the training data pipeline and developing a browser-compatible lightweight model.

---

**Last Updated:** 2026-04-29
**Next Review:** After Stage 1 completion
