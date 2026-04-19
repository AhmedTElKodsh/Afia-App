# Local Inference Architecture

## Overview

The Afia Oil Tracker PWA implements client-side AI inference using TensorFlow.js to provide fast, offline-capable fill level estimation. This document describes the architecture, data flow, and key design decisions.

## Architecture Components

### 1. Model Loader (`src/services/modelLoader.ts`)

**Responsibilities:**
- Lazy-load TF.js model from R2 storage
- Cache model in IndexedDB for offline use
- Manage model lifecycle and backend optimization
- Handle download failures with retry logic

**Key Features:**
- **Lazy Loading**: Model downloads only on first analysis attempt
- **IndexedDB Caching**: Persistent storage for offline capability
- **Retry Logic**: 3 attempts with exponential backoff (1s, 2s, 4s)
- **Quota Management**: Automatically clears old model versions when storage quota exceeded
- **Backend Optimization**: Attempts WebGL for GPU acceleration, falls back to CPU
- **Cache Invalidation**: Detects and clears corrupt model data

**Model Location:**
```
https://pub-models.afia.app/models/fill-regressor/v1.0.0/model.json
```

### 2. Local Inference (`src/services/localInference.ts`)

**Responsibilities:**
- Preprocess images for model input
- Run on-device inference
- Calculate confidence scores
- Track performance metrics

**Image Preprocessing Pipeline:**
1. Load image from base64 data URL
2. Resize to 224x224 pixels (model input size)
3. Convert to RGB tensor
4. Normalize pixel values to [0, 1] range
5. Add batch dimension

**Confidence Calculation:**
```typescript
Base confidence: 0.85 (MobileNetV3-Small baseline)
- Reduce 0.15 for boundary values (< 0.05 or > 0.95)
- Reduce 0.20 for blurry images (blur score > 0.3)
- Reduce 0.10 for poor lighting (brightness < 0.4 or > 0.9)
```

**Performance Tracking:**
- Preprocessing time
- Inference time
- Postprocessing time
- Rolling average of last 50 inferences
- Warnings when exceeding targets (50ms inference, 650ms total)

### 3. Analysis Router (`src/services/analysisRouter.ts`)

**Responsibilities:**
- Orchestrate local vs LLM inference
- Implement confidence threshold logic
- Handle offline scenarios
- Manage offline queue

**Decision Flow:**
```
1. Check if model is loaded
   ├─ No → Load model (with retry)
   └─ Yes → Continue

2. Run local inference
   ├─ Success → Check confidence
   │   ├─ >= 0.75 → Return local result
   │   └─ < 0.75 → Fall back to LLM
   └─ Failure → Fall back to LLM

3. LLM Fallback (if needed)
   ├─ Online → Call Worker /analyze
   └─ Offline → Queue for later processing
```

**Confidence Threshold: 0.75**
- High confidence (>= 0.75): Use local result directly
- Low confidence (< 0.75): Fall back to LLM for verification
- Rationale: Balances speed (local) with accuracy (LLM)

### 4. Error Telemetry (`src/services/errorTelemetry.ts`)

**Responsibilities:**
- Log errors with context
- Maintain rolling history (last 100 errors)
- Categorize errors by type

**Error Categories:**
- `model_loading`: Model download/parse failures
- `inference`: Inference execution errors
- `network`: Network connectivity issues
- `storage`: IndexedDB quota/access errors

## Data Flow

### First Analysis (Cold Start)

```
User captures photo
  ↓
analysisRouter.analyze()
  ↓
modelLoader.loadModel()
  ├─ Check IndexedDB cache → MISS
  ├─ Download from R2 (5MB, ~10s on 4G)
  ├─ Cache in IndexedDB
  └─ Return model
  ↓
localInference.runLocalInference()
  ├─ Preprocess image (< 100ms)
  ├─ Run inference (< 50ms)
  └─ Calculate confidence
  ↓
Check confidence >= 0.75
  ├─ Yes → Return local result
  └─ No → Call Worker /analyze with local result
```

### Subsequent Analysis (Warm Start)

```
User captures photo
  ↓
analysisRouter.analyze()
  ↓
modelLoader.getModel()
  ├─ Check IndexedDB cache → HIT
  ├─ Load from cache (< 500ms)
  └─ Return model
  ↓
localInference.runLocalInference()
  ├─ Preprocess image (< 100ms)
  ├─ Run inference (< 50ms)
  └─ Calculate confidence
  ↓
Check confidence >= 0.75
  ├─ Yes → Return local result (total < 650ms)
  └─ No → Call Worker /analyze
```

### Offline Analysis

```
User captures photo (offline)
  ↓
analysisRouter.analyze()
  ├─ Check navigator.onLine → false
  ├─ Check model loaded → true
  └─ Continue
  ↓
localInference.runLocalInference()
  ├─ Run inference
  └─ Calculate confidence
  ↓
Check confidence >= 0.75
  ├─ Yes → Return local result with offlineMode flag
  └─ No → Queue for later LLM verification
```

## Performance Targets

| Metric | Target | Actual (Typical) |
|--------|--------|------------------|
| Model download | < 10s | ~8s on 4G LTE |
| Model load from cache | < 500ms | ~300ms |
| Image preprocessing | < 100ms | ~50ms |
| Inference (WebGL) | < 50ms | ~30ms |
| Inference (CPU) | < 200ms | ~150ms |
| Total (cached, WebGL) | < 650ms | ~400ms |

## Error Handling

### Model Download Failures

**Causes:**
- Network timeout
- HTTP 404/500 errors
- Corrupt download

**Handling:**
1. Retry up to 3 times with exponential backoff
2. Log error to telemetry
3. Fall back to LLM
4. Show user-friendly error message

### IndexedDB Quota Exceeded

**Causes:**
- Storage quota full
- Multiple model versions cached

**Handling:**
1. Detect QuotaExceededError
2. Query all cached models
3. Delete oldest versions (keep current only)
4. Retry cache operation
5. If still fails, continue without caching

### Inference Failures

**Causes:**
- Invalid image format
- Out of memory
- Model not loaded
- Preprocessing timeout

**Handling:**
1. Catch error in try-catch
2. Dispose tensors in finally block
3. Log error to telemetry
4. Fall back to LLM
5. Return error to user if LLM also fails

### Offline Scenarios

**Handling:**
1. Detect `navigator.onLine === false`
2. Check if model is cached
3. If cached: Run local inference
4. If not cached: Show "Model not available offline" error
5. If low confidence: Queue for later LLM verification

## Offline Queue

**Storage:** localStorage (key: `afia-offline-queue`)

**Queue Entry:**
```typescript
{
  sku: string;
  imageBase64: string;
  totalVolumeMl: number;
  localResult: {
    fillPercentage: number;
    confidence: number;
  };
  timestamp: number;
}
```

**Processing:**
- Triggered on `online` event
- Processes up to 10 queued scans
- Calls Worker /analyze for each
- Clears queue after processing

## Security Considerations

1. **Model Integrity**: Model served over HTTPS from trusted R2 bucket
2. **Input Validation**: Image data validated before preprocessing
3. **Memory Safety**: Tensors disposed in finally blocks
4. **Storage Limits**: Quota management prevents storage exhaustion
5. **Error Exposure**: Error messages sanitized before showing to user

## Future Enhancements

1. **Model Versioning**: Automatic updates when new model versions available
2. **A/B Testing**: Compare local vs LLM accuracy in production
3. **Adaptive Confidence**: Adjust threshold based on user feedback
4. **Progressive Loading**: Stream model weights for faster initial load
5. **WebAssembly Backend**: Explore WASM for better CPU performance

## References

- [TensorFlow.js Documentation](https://www.tensorflow.org/js)
- [IndexedDB API](https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API)
- [Model Training Documentation](./model-training.md)
- [Story 7.4 Specification](../_bmad-output/implementation-artifacts/7-4-client-side-model-integration.md)
