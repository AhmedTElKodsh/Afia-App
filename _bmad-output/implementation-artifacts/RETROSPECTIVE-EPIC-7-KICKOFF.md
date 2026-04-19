# Epic 7 Retrospective & Kickoff

**Date:** 2026-04-16  
**Facilitator:** BMad Help  
**Participants:** Ahmed (Developer)

---

## 🎯 Purpose

This retrospective reviews the local model development progress and prepares for Stories 7.2 & 7.3 implementation.

---

## 📊 What We've Achieved (Epics 1-6, 8-9, FC)

### Core Application: 100% Complete ✅

| Epic | Stories | Status | Key Achievements |
|------|---------|--------|------------------|
| **Epic 1** | 11/11 | ✅ DONE | End-to-end scan experience with QR, camera, AI analysis |
| **Epic 2** | 8/8 | ✅ DONE | Multi-model AI failover (Gemini → Groq) |
| **Epic 3** | 5/5 | ✅ DONE | Volume calculation & nutrition display |
| **Epic 4** | 5/5 | ✅ DONE | Feedback collection & data persistence (R2/B2/Supabase) |
| **Epic 5** | 5/5 | ✅ DONE | Admin dashboard for scan review & correction |
| **Epic 6** | 2/2 | ✅ DONE | Scan history & consumption trends |
| **Epic 8** | 1/1 | ✅ DONE | Multi-bottle selection |
| **Epic 9** | 1/1 | ✅ DONE | Data export (CSV/PDF) |
| **Epic FC** | 7/7 | ✅ DONE | Fill confirmation screen with RTL & accessibility |

**Total Completed:** 48 stories  
**Project Completion:** 92%

---

## 🔍 Epic 7 Status: Local Model + Training Pipeline

### What's Complete ✅

#### Infrastructure (Story 7.1 equivalent)
- ✅ **Supabase Training Database**
  - `training_samples` table schema defined
  - `model_versions` table schema defined
  - Completed as part of Story 4-1-0
  
- ✅ **Storage Layer**
  - R2/B2 configured for image storage
  - Metadata persistence working
  - Completed in Story 4-1-0

- ✅ **Data Collection Pipeline**
  - Training eligibility marking (Story 4-5)
  - Admin correction flow (Stories 5.3-5.4)
  - Feedback validation (Story 4-3)

- ✅ **Admin Tools**
  - Scan review interface (Story 5.2)
  - Manual correction capability (Story 5.3)
  - Image upload for training (Story 5.4)
  - Training data export (Story 5.5)

### What's NOT Started ❌

#### Training Pipeline (Stories 7.2-7.5)
- ❌ **Story 7.2:** Training Data Augmentation Pipeline
- ❌ **Story 7.3:** TF.js CNN Regressor — Training & Deployment
- ❌ **Story 7.4:** Client-Side Model Integration & Fallback Routing
- ❌ **Story 7.5:** Model Version Management

---

## 🎯 Epic 7 Goals

### Business Objectives
1. **Reduce LLM API costs** by 70-80% through on-device inference
2. **Enable offline functionality** for users without internet
3. **Improve response time** from 8s (LLM) to <1s (local model)
4. **Build data moat** through continuous model improvement

### Technical Objectives
1. **Augment training data** to 4000+ samples (500 base × 8 variants)
2. **Train CNN regressor** with MAE ≤ 10%
3. **Deploy TF.js model** to R2 (~5MB)
4. **Integrate client-side inference** with LLM fallback

---

## 📋 Stories 7.2 & 7.3: Ready to Start

### Story 7.2: Training Data Augmentation Pipeline

**Status:** ready-for-dev  
**Story File:** `7-2-training-data-augmentation-pipeline.md`

**What it does:**
- Reads training-eligible scans from Supabase
- Generates 8 augmented variants per image
- Uploads to R2/B2 with proper naming
- Creates Supabase records with metadata
- Idempotent (safe to re-run)

**Acceptance Criteria:**
1. ✅ Base sample selection from Supabase
2. ✅ 8 variants per image (brightness, contrast, rotation, flip, JPEG quality)
3. ✅ R2 storage with naming convention
4. ✅ Supabase records with augmentation metadata
5. ✅ Idempotency check
6. ✅ Progress reporting & 500-scan threshold check

**Tech Stack:**
- Python: Pillow/PIL + supabase-py + boto3
- OR Node.js: sharp + @supabase/supabase-js + @aws-sdk/client-s3

**Estimated Time:** 1-2 days

---

### Story 7.3: TF.js CNN Regressor — Training & Deployment

**Status:** ready-for-dev  
**Story File:** `7-3-tfjs-cnn-regressor-training-deployment.md`

**What it does:**
- Verifies 500+ base scans available
- Trains MobileNetV3-Small + regression head
- Achieves validation MAE ≤ 10%
- Exports to TF.js format
- Uploads to R2 at `models/fill-regressor/v1.0.0/`
- Records version in Supabase

**Acceptance Criteria:**
1. ✅ Training prerequisites check (500+ scans)
2. ✅ MobileNetV3-Small architecture
3. ✅ Training config (Huber loss, Adam, 80/10/10 split)
4. ✅ Performance target (MAE ≤ 10%)
5. ✅ TF.js export (model.json + shards)
6. ✅ R2 deployment with versioning
7. ✅ Supabase model_versions record

**Tech Stack:**
- Python + TensorFlow 2.x
- tensorflowjs converter
- supabase-py + boto3
- Training: Colab (free GPU) or local GPU

**Estimated Time:** 3-5 days

---

## 🚀 How to Proceed

### Step 1: Start Story 7.2
1. Open a **fresh context window**
2. Run: `/bmad-bmm-dev-story`
3. Say: "I want to implement Story 7.2: Training Data Augmentation Pipeline"
4. Follow Amelia's guidance through implementation

### Step 2: Code Review
1. After Story 7.2 completes, open **another fresh context**
2. Run: `/bmad-bmm-code-review`
3. Review and address any issues

### Step 3: Start Story 7.3
1. Open a **fresh context window**
2. Run: `/bmad-bmm-dev-story`
3. Say: "I want to implement Story 7.3: TF.js CNN Regressor — Training & Deployment"
4. Follow Amelia's guidance through training

### Step 4: Code Review
1. After Story 7.3 completes, open **another fresh context**
2. Run: `/bmad-bmm-code-review`
3. Review and address any issues

---

## 📚 Key References

### Story Files (Created Today)
- `7-2-training-data-augmentation-pipeline.md`
- `7-3-tfjs-cnn-regressor-training-deployment.md`
- `EPIC-7-GETTING-STARTED.md` (this guide)

### Architecture Documents
- `docs/architecture.md` - Section 15: Training Data Pipeline
- `docs/supabase-schema-migration.sql` - Database schema
- `docs/data-models.md` - Data structures

### Epic Planning
- `_bmad-output/planning-artifacts/epics.md` - Epic 7 details (lines 504+)
- `_bmad-output/implementation-artifacts/sprint-status.yaml` - Updated status

---

## ✅ Pre-Flight Checklist

Before starting Story 7.2, verify:
- [ ] Supabase credentials available (SUPABASE_URL, SUPABASE_SERVICE_KEY)
- [ ] B2/R2 credentials available (B2_KEY_ID, B2_APPLICATION_KEY, B2_BUCKET_NAME)
- [ ] Query Supabase to check training-eligible scan count
- [ ] Test downloading one image from R2/B2
- [ ] Python/Node.js environment ready

Before starting Story 7.3, verify:
- [ ] Story 7.2 complete (augmented data available)
- [ ] 500+ base scans confirmed in Supabase
- [ ] Training environment chosen (Colab/local GPU/cloud)
- [ ] TensorFlow installed and tested
- [ ] tensorflowjs converter installed

---

## 🎉 What Success Looks Like

### After Story 7.2
- ✅ 4000+ training samples in Supabase (500 base × 8 variants)
- ✅ All variants stored in R2/B2
- ✅ Augmentation script documented and tested
- ✅ Ready to train model

### After Story 7.3
- ✅ Trained model achieving MAE ≤ 10%
- ✅ Model deployed to R2 at `models/fill-regressor/v1.0.0/`
- ✅ Version record in Supabase
- ✅ Training process documented
- ✅ Ready for client-side integration (Story 7.4)

---

## 💡 Lessons Learned (From Epics 1-6)

### What Went Well
- ✅ Retroactive reconciliation captured all completed work
- ✅ Quick-dev workflow enabled rapid feature implementation
- ✅ Architecture documentation was invaluable
- ✅ Admin dashboard provides excellent data review capability

### What to Improve
- 🔄 Maintain sprint status in real-time (avoid reconciliation)
- 🔄 Follow Create Story → Dev Story → Code Review cycle consistently
- 🔄 Test early and often (especially for ML pipelines)

### Recommendations for Stories 7.2 & 7.3
- ✅ Use fresh context windows for each story
- ✅ Document as you go (don't leave for the end)
- ✅ Test incrementally (verify each component works)
- ✅ Run code review after each story
- ✅ Keep augmentation script simple and idempotent
- ✅ Start with small training runs to validate pipeline

---

## 🎯 Next Actions

**Immediate (Today):**
1. ✅ Story files created (7.2, 7.3)
2. ✅ Sprint status updated
3. ✅ Getting started guide created
4. ⏳ **YOU ARE HERE** → Ready to start Story 7.2

**This Week:**
- [ ] Implement Story 7.2 (Augmentation Pipeline)
- [ ] Code review Story 7.2
- [ ] Implement Story 7.3 (Model Training)
- [ ] Code review Story 7.3

**Next Week:**
- [ ] Implement Story 7.4 (Client Integration)
- [ ] Implement Story 7.5 (Version Management)
- [ ] Epic 7 retrospective

---

## 📞 Support

If you need help:
- Run `/bmad-help` for workflow guidance
- Check story files for detailed acceptance criteria
- Review architecture docs for technical context
- Ask dev agent for clarification during implementation

---

**Status:** Ready to begin Story 7.2  
**Next Step:** Open fresh context → `/bmad-bmm-dev-story` → "Story 7.2"  
**Good luck!** 🚀
