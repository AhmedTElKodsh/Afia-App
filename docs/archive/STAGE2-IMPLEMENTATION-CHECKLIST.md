# Stage 2 Implementation Checklist

**Status:** ⏳ NOT STARTED  
**Target:** Local Model + LLM Fallback  
**Branch:** `local-model` (to be created)

---

## Prerequisites

- [ ] Stage 1 is stable and deployed to production
- [ ] ONNX model is trained and exported
- [ ] Model performance meets accuracy targets (>85%)
- [ ] `local-model` branch created from `master`

---

## Implementation Tasks

### 1. Local Model Infrastructure

- [ ] Create `src/services/localModel/` directory
- [ ] Implement `modelLoader.ts` - Load ONNX model in browser
- [ ] Implement `inference.ts` - Run inference on captured images
- [ ] Add model files to `public/models/` directory
- [ ] Test model loading in development environment

**Files to create:**
```
src/services/localModel/
├── README.md
├── modelLoader.ts
├── inference.ts
├── types.ts
└── __tests__/
    ├── modelLoader.test.ts
    └── inference.test.ts
```

### 2. Fallback Logic

- [ ] Implement `fallback.ts` - Detect when to fallback to LLM
- [ ] Add confidence threshold configuration
- [ ] Add error handling for model failures
- [ ] Add timeout handling (max 5s for local inference)
- [ ] Test fallback triggers (low confidence, errors, timeouts)

**Fallback Triggers:**
- Local model confidence < 60%
- Local model inference error
- Local model timeout (>5s)
- Model not loaded/available

### 3. Integration

- [ ] Update `src/App.tsx` to use local model when enabled
- [ ] Add `VITE_ENABLE_LOCAL_MODEL` environment variable check
- [ ] Integrate local model with existing camera flow
- [ ] Add loading states for model initialization
- [ ] Update UI to show "Local Model" vs "AI Analysis" badge

### 4. Monitoring & Metrics

- [ ] Implement `monitoring.ts` - Track local model performance
- [ ] Log inference time (local vs LLM)
- [ ] Log confidence scores
- [ ] Log fallback trigger reasons
- [ ] Send metrics to worker for analysis

**Metrics to track:**
- Local model inference count
- Local model average latency
- Fallback trigger rate
- Accuracy comparison (local vs LLM)
- Cost savings (API calls avoided)

### 5. Testing

- [ ] Unit tests for model loading
- [ ] Unit tests for inference
- [ ] Unit tests for fallback logic
- [ ] E2E tests with local model enabled
- [ ] E2E tests for fallback scenarios
- [ ] Performance tests (latency benchmarks)
- [ ] Accuracy comparison tests

**Test Scenarios:**
- ✅ Local model loads successfully
- ✅ Local model runs inference
- ✅ High confidence → use local result
- ✅ Low confidence → fallback to LLM
- ✅ Model error → fallback to LLM
- ✅ Model timeout → fallback to LLM
- ✅ Model not available → fallback to LLM

### 6. Configuration

- [ ] Add Stage 2 environment variables to `.env.stage2.example`
- [ ] Update `vite.config.ts` for local model builds
- [ ] Add model path configuration
- [ ] Add confidence threshold configuration
- [ ] Document all new environment variables

**New Environment Variables:**
```bash
VITE_ENABLE_LOCAL_MODEL=true
VITE_LOCAL_MODEL_PATH=/models/afia-model.onnx
VITE_LOCAL_MODEL_THRESHOLD=0.6
VITE_FALLBACK_ENABLED=true
VITE_FALLBACK_CONFIDENCE_THRESHOLD=0.6
```

### 7. Documentation

- [ ] Update `README.md` with Stage 2 instructions
- [ ] Document local model architecture
- [ ] Document fallback logic
- [ ] Add troubleshooting guide
- [ ] Update API documentation

### 8. Deployment

- [ ] Push `local-model` branch to remote
- [ ] Verify GitHub Actions workflow runs
- [ ] Deploy worker to Stage 2 environment
- [ ] Deploy pages to Stage 2 environment
- [ ] Verify deployments are accessible
- [ ] Test end-to-end in Stage 2 environment

---

## Acceptance Criteria

### Functional Requirements

- ✅ Local model loads in browser without errors
- ✅ Local model inference completes in <5 seconds
- ✅ High confidence results (>60%) use local model
- ✅ Low confidence results fallback to LLM
- ✅ Errors and timeouts fallback to LLM gracefully
- ✅ UI shows which model was used (local vs LLM)

### Performance Requirements

- ✅ Local model inference: <3 seconds average
- ✅ Fallback to LLM: <7 seconds total
- ✅ Model loading: <2 seconds on first use
- ✅ Memory usage: <100MB for model

### Quality Requirements

- ✅ Local model accuracy: >85% (compared to LLM)
- ✅ Fallback trigger rate: <20% of scans
- ✅ Zero crashes or unhandled errors
- ✅ All tests passing (unit + E2E)

---

## Rollout Plan

### Phase 1: Development (Week 1)
1. Create `local-model` branch
2. Implement local model infrastructure
3. Add fallback logic
4. Write unit tests

### Phase 2: Testing (Week 2)
1. Deploy to Stage 2 environment
2. Run E2E tests
3. Performance testing
4. Accuracy comparison testing

### Phase 3: Monitoring (Week 3)
1. Monitor metrics in Stage 2
2. Collect user feedback
3. Iterate on confidence thresholds
4. Fix bugs and edge cases

### Phase 4: Production (Week 4)
1. If metrics are good → merge to `master`
2. Update Stage 1 to use local model
3. Deprecate Stage 2 environment
4. Full production launch

---

## Risk Mitigation

### Risk: Local model accuracy is too low
**Mitigation:** Keep LLM fallback, increase confidence threshold

### Risk: Local model is too slow
**Mitigation:** Optimize model, reduce timeout, fallback faster

### Risk: Model doesn't load in some browsers
**Mitigation:** Feature detection, graceful fallback to LLM

### Risk: Model file is too large (slow download)
**Mitigation:** Compress model, lazy load, cache aggressively

---

## Success Metrics

**Stage 2 is ready for production when:**
- Local model handles >80% of scans without fallback
- Average inference time <3 seconds
- Accuracy matches LLM (>85%)
- Zero critical bugs in 1 week of testing
- Cost savings >50% (fewer API calls)

---

## Questions?

Contact the development team or refer to:
- `DEPLOYMENT_STRATEGY.md` - Overall strategy
- `src/services/localModel/README.md` - Implementation guide
- `.github/workflows/deploy-stage2.yml` - CI/CD workflow
