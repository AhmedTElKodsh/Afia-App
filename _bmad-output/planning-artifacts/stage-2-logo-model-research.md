# Stage 2: Local Logo Model Training Research Report

**Goal:** Implement a lightweight, zero-cost on-device model to verify the "Afia" brand before calling expensive cloud LLMs.

## 1. Technical Approach: MediaPipe Object Detector
We recommend using **MediaPipe** over TensorFlow.js for the following reasons:
- **Performance:** Native-like speed on mobile browsers (iOS/Android).
- **Size:** Very small runtime (~1MB).
- **Workflow:** Seamless integration with TFLite models.

## 2. Proposed Model Architecture
- **Base Model:** SSD MobileNet V2 (quantized).
- **Classes:**
  1. `afia_logo_heart` (The red heart symbol).
  2. `afia_text_ar` (Arabic "عافية").
  3. `afia_text_en` (English "Afia").

## 3. Data Collection Strategy (Call to Action)
To train this model, we need real-world samples. Ahmed, we can use the existing **"Training Upload"** tab in your Admin Dashboard to collect these:
- **Quantity:** ~20-30 high-quality photos of the 1.5L bottle from different angles.
- **Diversity:** Include photos in different lighting (dim, bright, kitchen lights).
- **Negatives:** Also upload 5-10 photos of other oil brands or empty bottles to teach the model what *isn't* Afia.

## 4. Training Pipeline
1. **Annotation:** We will use **CVAT** or **Roboflow** to draw boxes around the logo and text in your uploaded images.
2. **Training:** Use **MediaPipe Model Maker** (Python) to fine-tune the MobileNet model on this specific dataset.
3. **Export:** Export as `.tflite` and convert to a web-friendly format.
4. **Integration:** Update `src/hooks/useLocalAnalysis.ts` to load this model and run it in the `CAMERA_ACTIVE` state.

## 5. Cost Savings Impact
- **Current:** 100% of scans call Gemini API ($$$).
- **Stage 2:** Local model rejects ~30% of "bad" scans (unrelated objects, wrong brands) for $0.
- **Long-term:** Local model handles 95% of standard scans, only falling back to LLM for edge cases or extreme low-light.

---
*Prepared by Winston (Architect) & Mary (Analyst)*
