# Afia Brand Verification — Research & Decision Record
**Date:** 2026-04-10
**Author:** Ahmed
**Status:** Finalized — approved for implementation

---

## Problem Statement

The 1.5 L cooking oil bottle is a commodity form factor. Dozens of brands (Safi, Zuhair, generic sunflower oil, etc.) share nearly identical silhouettes: tall cylindrical body, green label, amber oil window, plastic handle. The existing `analyzeComposition()` function reliably detects "a green-label bottle with oil" but cannot distinguish Afia from any other green-label brand.

**Goal:** Confirm the scanned bottle is specifically Afia before proceeding to fill-level estimation, without introducing unreasonable latency, bundle size, or per-call API cost.

---

## Afia Visual Fingerprint

The Afia 1.5 L bottle has three brand-specific markers not consistently found on competitor bottles:

| Marker | Location on bottle | HSV signature |
|---|---|---|
| Red + yellow heart logo | Mid-label, rows 25–55 of 60×100 canvas | Red: H 0–12° or 348–360°, S ≥ 0.60; Yellow: H 40–60°, S ≥ 0.55 |
| Red + yellow plastic handle/cap | Top of bottle, rows 0–20 | Red: same dual range, S ≥ 0.55; Yellow: H 38–58° |
| Green label body | Rows 20–80 | H 80–170°, S ≥ 0.25, V ≥ 0.18 — already in production |

**Key discriminating insight:** Most competitor green-label bottles have a red or yellow cap but lack a prominent **red + yellow dual cluster on the label itself**. The heart logo (mid-label red + yellow icon) is the single strongest signal. Competitors with red caps but plain green labels will score low on `heartScore`.

---

## Approaches Evaluated

### 1. Tesseract.js / OCR ("Afia" / "عافية")
- **Accuracy:** 50–70% on natural handheld photos. Curved, glossy labels under variable lighting are the hardest OCR input.
- **Bundle:** ~4 MB core WASM + ~10 MB Arabic traineddata + ~4 MB English = ~18 MB total.
- **Latency:** 3–8 seconds on mid-range mobile. Not viable for real-time.
- **Arabic:** Supported via `ara` lang pack but accuracy on curved surfaces is poor.
- **Verdict:** Rejected. High latency, large payload, unreliable on curved labels.

### 2. Llama 3.2 1B-Vision via WebGPU (On-Device SLM)
- **Concept:** Run a quantized vision-language model inside the browser via WebGPU / WebLLM.
- **Pros:** No API cost, offline-capable, understands brand concept not just pixels.
- **Cons:** ~500 MB model download — a dealbreaker for a mobile PWA over cellular. WebGPU support is inconsistent on older Android and partial on Safari. Inference setup is non-trivial.
- **Verdict:** Rejected for current phase. File as a candidate for v2.0 (2027) when sub-100 MB quantized models become stable. Compelling for a native app; not for a PWA.

### 3. Shape-Based Heart Detection (Pure Canvas / JS)
- **How:** Isolate red pixels in the mid-label band → find connected components → check aspect ratio and convexity for a heart-like blob.
- **Accuracy:** 70–80% in good conditions. Drops with glare, occlusion, or non-Afia objects with red blobs in frame.
- **Bundle:** 0 bytes — same canvas pixel math as existing `analyzeComposition()`.
- **Latency:** <5 ms.
- **Verdict:** Viable as an **enhanced pre-screen gate** layered on the existing HSV check. Not a standalone replacement. Eliminates ~60% of LLM calls cheaply.

### 4. TensorFlow.js + MobileNetV3-Small Binary Classifier
- **How:** Train a binary (Afia / not-Afia) classifier offline in Python using transfer learning from MobileNetV3-Small. Export to TF.js `model.json` + weights. Lazy-load from Cloudflare R2, cache in IndexedDB.
- **Accuracy:** 90–95% with 406 frames + aggressive augmentation (flip, rotate ±15°, brightness jitter, random crop). Drops on unseen backgrounds without diverse negatives.
- **Bundle:** TF.js core ~1.5 MB + WebGL backend ~1 MB + frozen model ~2–3 MB = ~5 MB incremental, lazy-loaded.
- **Latency:** ~50–200 ms inference on mid-range mobile (WebGL backend). Model load is 1–3 s first time, then cached.
- **Verdict:** **Best full replacement for brand confirmation.** Eliminates ~85–90% of brand-check LLM calls. Medium implementation effort.

### 5. ONNX Runtime Web
- **Accuracy:** Same as trained model — it's a runtime, not a model.
- **Bundle:** ONNX Runtime WASM ~6–8 MB + model. WebGL less mature than TF.js.
- **Latency:** WASM: 200–500 ms on mobile. iOS Safari has SharedArrayBuffer restrictions that can stall WASM thread pools.
- **Verdict:** Viable but TF.js WebGL is better-tested on mobile browsers. No advantage over TF.js for this use case.

### 6. MediaPipe
- **Text detection:** Deprecated and removed from the Tasks API. Dead end.
- **Object detection:** Requires custom model — same training effort as TF.js but worse JS tooling.
- **Verdict:** Rejected.

### 7. Purpose-Built JS Logo/Brand Recognition Libraries (2024–2026)
- **Status:** None exist as maintained open-source libraries. "Brand.js" etc. are abandoned. Cloud APIs (Google Vision, AWS Rekognition, Clarifai) all require network calls and cost more than Gemini Flash.
- **Verdict:** Rejected.

---

## Recommended Architecture

A **3-tier pipeline** that progressively raises confidence with zero additional bundle cost for Stages 0–0.5, and a lazy-loaded ~5 MB model for Stage 1:

```
Stage 0 (existing)  — HSV green label + amber oil window check
                      ~2ms | 0 deps | already live
        ↓ bottleDetected = true
Stage 0.5 (new)     — analyzeAfiaSignature(): red-heart blob check
                      heartScore × 0.50 + handleScore × 0.35 + greenDensity × 0.15
                      pixelScore < 30 → reject frame (no LLM call)
                      pixelScore ≥ 30 → proceed
        ↓ passes
Stage 1 (new)       — TF.js MobileNetV3-Small binary classifier
                      Lazy-loaded from R2, cached IndexedDB
                      confidence < 0.90 → pass to LLM with brand-check flag
                      confidence ≥ 0.90 → confirmed Afia, LLM fill-only prompt
        ↓
LLM API             — Fill-level estimation only (brand already confirmed)
                      Stripped-down prompt → lower token cost
```

### Confidence threshold table (Stage 0.5)

| pixelScore | Decision | Rationale |
|---|---|---|
| 0–14 | Hard reject — no LLM call | No Afia-signature pixels |
| 15–29 | Soft reject — request retry | Signal below noise floor |
| 30–69 | Pass to Stage 1 | Sufficient evidence for classifier |
| 70–100 | Pass to Stage 1 (fast-path hint) | Strong pixel match |

### Stage 0.5 Composite weights
`pixelScore = heartScore × 0.50 + handleScore × 0.35 + greenLabelDensityInBand × 0.15`

Heart logo gets the highest weight because competitors rarely have a red+yellow icon on a green label — it is the most discriminating feature.

---

## What Cannot Be Replaced by Client-Side ML

**Fill-level estimation** — measuring oil surface height relative to bottle geometry requires spatial reasoning. This is where the LLM earns its cost. Brand confirmation is the target for elimination; fill estimation stays on the LLM.

---

## Phased Rollout Plan

| Phase | What ships | API cost impact | Dev effort |
|---|---|---|---|
| **Now — Stage 0.5** | `analyzeAfiaSignature()` red-heart blob check | ~60% reduction in calls reaching LLM for brand | ~1 day |
| **v1.5 — Stage 1** | MobileNetV3-Small TF.js classifier | ~85–90% reduction in brand-check LLM calls | 1–2 weeks |
| **v2.0 (future)** | On-device SLM if <100 MB models stabilize | ~100% elimination | Watch 2027 |

---

## Implementation Entry Points

- [src/utils/cameraQualityAssessment.ts](../../../src/utils/cameraQualityAssessment.ts) — add `analyzeAfiaSignature()`, extend `assessImageQuality()` gate
- [worker/src/providers/buildAnalysisPrompt.ts](../../../worker/src/providers/buildAnalysisPrompt.ts) — add brand-confidence routing (full prompt vs. fill-only prompt)
- `scripts/train_afia_classifier.py` — offline training script (new)
- `public/models/afia-classifier/` — TF.js model weights (lazy-loaded from R2)
- `src/test/cameraQualityAssessment.test.ts` — Vitest assertions on synthetic pixel arrays

---

## Reference Frames

406 frames across 28 fill-level directories in `oil_images/extracted_frames/`. These are the training data source for the Stage 1 classifier. Negative examples (non-Afia bottles) need to be sourced or augmented to achieve robust classification.

---

## Sources

- [HSL and HSV — Wikipedia](https://en.wikipedia.org/wiki/HSL_and_HSV)
- [Choosing HSV boundaries for color detection — GeeksforGeeks](https://www.geeksforgeeks.org/computer-vision/choosing-the-correct-upper-and-lower-hsv-boundaries-for-color-detection-with-cv-inrange-opencv/)
- [TF.js MobileNet — GitHub](https://github.com/tensorflow/tfjs-models/tree/master/mobilenet)
- [Color Histograms in Image Retrieval — Pinecone](https://www.pinecone.io/learn/series/image-search/color-histograms/)
- [LLM Applications with Confidence Scoring — Medium](https://medium.com/@teckchuan/llm-applications-with-confidence-scoring-know-what-you-are-evaluating-cf1d58c0c899)
- Internal: `technical-Afia-Logo-Detection-research-2026-04-09.md`
