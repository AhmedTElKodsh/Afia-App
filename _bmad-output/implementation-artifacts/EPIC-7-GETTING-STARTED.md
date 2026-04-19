# Epic 7: Local Model + Training Pipeline - Getting Started

**Created:** 2026-04-16  
**Status:** Ready to begin Stories 7.2 & 7.3

---

## 📋 Overview

Epic 7 enables **on-device AI inference** to reduce LLM API costs and enable offline functionality. The training pipeline will:

1. **Augment training data** (Story 7.2) - Multiply existing scans by ~8x through image transformations
2. **Train a CNN model** (Story 7.3) - MobileNetV3-based regressor for fill level estimation
3. **Integrate into PWA** (Story 7.4) - Client-side TF.js inference with LLM fallback
4. **Version management** (Story 7.5) - Auto-update mechanism for model improvements

---

## ✅ What's Already Complete

### Infrastructure (Story 7.1 equivalent)
- ✅ **Supabase `training_samples` table** - Schema defined in `docs/supabase-schema-migration.sql`
- ✅ **R2/B2 storage** - Configured in Story 4-1-0
- ✅ **Metadata tracking** - `inference` block schema in place
- ✅ **Training eligibility marking** - Story 4-5 completed
- ✅ **Admin dashboard** - Stories 5.1-5.5 for data review and correction

### Data Collection
You should have training-eligible scans accumulating in Supabase. Check current count:

```sql
SELECT COUNT(*) FROM training_samples WHERE training_eligible = true AND augmented = false;
```

**Target:** 500+ base scans before training (Story 7.3)

---

## 🚀 Story 7.2: Training Data Augmentation Pipeline

### Story File
📄 `_bmad-output/implementation-artifacts/7-2-training-data-augmentation-pipeline.md`

### What You'll Build
A Python or Node.js script that:
- Reads training-eligible scans from Supabase
- Generates 8 augmented variants per image (brightness, contrast, rotation, flip, JPEG quality)
- Uploads variants to R2/B2
- Creates Supabase records with `augmented: true`
- Is idempotent (safe to re-run)

### Tech Stack Options
**Python (Recommended):**
- Pillow/PIL for image processing
- supabase-py for database
- boto3 for R2/B2 uploads

**Node.js (Alternative):**
- sharp for image processing
- @supabase/supabase-js for database
- @aws-sdk/client-s3 for R2/B2 uploads

### Key Files to Create
```
scripts/
  augment-training-data.py (or .js)
  requirements.txt (or package.json)
docs/
  training-pipeline.md
```

### How to Start
Open a **fresh context window** and run:
```
/bmad-bmm-dev-story
```

Then say:
> "I want to implement Story 7.2: Training Data Augmentation Pipeline. The story file is at `_bmad-output/implementation-artifacts/7-2-training-data-augmentation-pipeline.md`"

### Estimated Time
1-2 days

---

## 🚀 Story 7.3: TF.js CNN Regressor — Training & Deployment

### Story File
📄 `_bmad-output/implementation-artifacts/7-3-tfjs-cnn-regressor-training-deployment.md`

### What You'll Build
A Python training script that:
- Loads training data from Supabase (requires Story 7.2 complete)
- Trains MobileNetV3-Small + regression head
- Achieves validation MAE ≤ 10%
- Exports to TF.js format
- Uploads to R2 at `models/fill-regressor/v1.0.0/`
- Records version in Supabase `model_versions` table

### Tech Stack
**Python + TensorFlow:**
- tensorflow 2.x
- tensorflowjs converter
- supabase-py
- boto3 for R2 uploads

### Training Environment
- **Local GPU:** NVIDIA GPU with CUDA (faster)
- **Google Colab:** Free GPU tier (easier setup)
- **Cloud VM:** AWS/GCP with GPU (production)

### Key Files to Create
```
scripts/
  train-fill-regressor.py
  requirements.txt
  utils/
    data_loader.py
    model_builder.py
    evaluation.py
docs/
  model-training.md
  model-architecture.png
```

### How to Start
Open a **fresh context window** and run:
```
/bmad-bmm-dev-story
```

Then say:
> "I want to implement Story 7.3: TF.js CNN Regressor — Training & Deployment. The story file is at `_bmad-output/implementation-artifacts/7-3-tfjs-cnn-regressor-training-deployment.md`"

### Estimated Time
3-5 days (includes experimentation)

---

## 📊 Success Criteria

### Story 7.2 Complete When:
- [ ] Script runs without errors
- [ ] 8 variants generated per base image
- [ ] All variants uploaded to R2/B2
- [ ] Supabase records created with proper metadata
- [ ] Re-running script doesn't create duplicates
- [ ] Documentation in `docs/training-pipeline.md`

### Story 7.3 Complete When:
- [ ] Model trains successfully
- [ ] Validation MAE ≤ 10%
- [ ] Model exported to TF.js format
- [ ] Files uploaded to R2 at `models/fill-regressor/v1.0.0/`
- [ ] Version record in Supabase `model_versions` table
- [ ] Documentation in `docs/model-training.md`

---

## 🔗 Key References

### Architecture Documents
- `docs/architecture.md` - Section 15: Training Data Pipeline
- `docs/supabase-schema-migration.sql` - Database schema
- `docs/data-models.md` - Data structures

### Epic Planning
- `_bmad-output/planning-artifacts/epics.md` - Epic 7 stories (lines 504+)
- `_bmad-output/implementation-artifacts/sprint-status.yaml` - Current status

### Related Stories
- Story 4-1-0: Infrastructure setup (R2/B2/Supabase)
- Story 4-5: Training eligibility marking
- Stories 5.1-5.5: Admin dashboard for data review

---

## 💡 Tips for Success

### Before Starting Story 7.2
1. **Check data availability:** Query Supabase to see how many training-eligible scans you have
2. **Set up credentials:** Ensure you have SUPABASE_URL, SUPABASE_SERVICE_KEY, B2 credentials
3. **Test image download:** Verify you can download one image from R2/B2 before batch processing

### Before Starting Story 7.3
1. **Verify Story 7.2 complete:** Should have 500+ base scans × 8 variants = 4000+ total samples
2. **Choose training environment:** Colab is easiest for getting started
3. **Review model architecture:** Understand MobileNetV3-Small + regression head design
4. **Set up TensorFlow:** Install tensorflow and tensorflowjs converter

### General Advice
- **Use fresh context windows** for each story (as recommended by BMad workflow)
- **Run code review** after each story completes
- **Document as you go** - Don't leave docs for the end
- **Test incrementally** - Don't wait until everything is built to test

---

## 🎯 Next Steps After 7.2 & 7.3

Once Stories 7.2 and 7.3 are complete, you'll move to:

### Story 7.4: Client-Side Model Integration
- Load TF.js model in PWA
- Run inference on-device
- Fall back to LLM when confidence < 0.75
- Cache model in IndexedDB

### Story 7.5: Model Version Management
- Auto-update mechanism
- Version checking endpoint
- Admin dashboard model metrics
- Rollback capability

---

## 📞 Need Help?

If you get stuck:
1. Check the story file acceptance criteria
2. Review referenced architecture docs
3. Run `/bmad-help` to get guidance
4. Ask the dev agent for clarification during implementation

---

**Ready to start?** Open a fresh context and run `/bmad-bmm-dev-story` for Story 7.2! 🚀
