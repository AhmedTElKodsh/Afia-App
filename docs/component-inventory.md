# Afia App — Component Inventory

## Frontend Components

### App.tsx — Root State Machine
- **Location**: `src/App.tsx`
- **Role**: Top-level router that renders different screens based on `AppState`
- **State**: `appState`, `capturedImage`, `result`, `error`, `privacyAccepted`
- **Key logic**: Reads `?sku=` from URL, resolves bottle from registry, manages full scan lifecycle
- **Renders**: IosWarning | UnknownBottle | QrLanding | CameraCapture | Photo Preview | ApiStatus | ResultDisplay

### QrLanding.tsx — Landing Screen
- **Location**: `src/components/QrLanding.tsx`
- **Props**: `bottle: BottleContext`, `onStartScan: () => void`
- **Features**: Displays bottle name/type/volume, "Start Scan" button, offline banner via `useOnlineStatus`
- **Behavior**: Disables scan button when offline

### CameraCapture.tsx — Camera Viewfinder
- **Location**: `src/components/CameraCapture.tsx`
- **Props**: `onCapture: (imageBase64: string) => void`
- **Features**: Live video viewfinder, capture button, alignment guide overlay
- **Error states**: `camera_denied` (with platform-specific instructions), generic camera error
- **Hook**: `useCamera` for getUserMedia, canvas capture, compression

### ApiStatus.tsx — Loading & Error States
- **Location**: `src/components/ApiStatus.tsx`
- **Props**: `state: "loading" | "error"`, `errorMessage?`, `onRetry?`, `onRetake?`
- **Loading**: Animated bottle fill wave, "Analyzing your bottle..." text, "3-8 seconds" hint
- **Error**: Warning icon, error message, retry + retake buttons

### ResultDisplay.tsx — Analysis Results
- **Location**: `src/components/ResultDisplay.tsx`
- **Props**: `result: AnalysisResult`, `bottle: BottleEntry`, `onRetake: () => void`
- **Sections**:
  - Low confidence banner (if confidence === "low")
  - Image quality issues banner (blur, poor_lighting, obstruction, reflection)
  - Fill gauge + percentage
  - Volume grid (remaining vs consumed in ml/tbsp/cups)
  - Nutrition facts (calories, total fat, saturated fat)
  - Disclaimer ("±15%, not certified")
  - FeedbackPrompt or thank-you message

### FillGauge.tsx — SVG Bottle Visualization
- **Location**: `src/components/FillGauge.tsx`
- **Props**: `fillPercentage: number`
- **Rendering**: SVG with cap, neck, body outline, color-coded fill rect + meniscus line
- **Colors**: Green (>50%), Yellow (25-50%), Red (<25%)
- **Accessibility**: `aria-label` with percentage

### FeedbackPrompt.tsx — User Feedback Collection
- **Location**: `src/components/FeedbackPrompt.tsx`
- **Props**: `scanId`, `fillPercentage`, `resultTimestamp`, `onSubmitted`
- **Flow**: 4 rating buttons → "about_right" submits immediately; others show correction slider (1-99%) → submit
- **State**: `rating`, `sliderValue`, `submitting`, `error`

### PrivacyNotice.tsx — First-Scan Consent
- **Location**: `src/components/PrivacyNotice.tsx`
- **Props**: `onAccepted: () => void`
- **Persistence**: `localStorage` key `afia_privacy_accepted`
- **Export**: `hasAcceptedPrivacy()` function for initial state check
- **Content**: Expandable details about image storage and AI training

### IosWarning.tsx — iOS In-App Browser Redirect
- **Location**: `src/components/IosWarning.tsx`
- **Props**: None
- **Purpose**: Full-screen instructions to open in Safari when detected in Instagram/Facebook/etc.

### UnknownBottle.tsx — SKU Fallback
- **Location**: `src/components/UnknownBottle.tsx`
- **Props**: `sku: string | null`
- **Behavior**: Shows "not yet supported" if SKU provided but unknown; "no bottle specified" if no SKU

---

## Custom Hooks

### useCamera
- **Location**: `src/hooks/useCamera.ts`
- **Returns**: `{videoRef, isActive, error, startCamera, stopCamera, capturePhoto}`
- **Camera config**: Rear-facing (`environment`), 1280x960 ideal resolution
- **Capture pipeline**: Canvas draw → JPEG 0.95 → `compressImage()` → 800px width, JPEG 0.78
- **Error handling**: `camera_denied`, `camera_not_found`, `camera_error`
- **Cleanup**: Stops all tracks on unmount

### useOnlineStatus
- **Location**: `src/hooks/useOnlineStatus.ts`
- **Returns**: `boolean` (isOnline)
- **Mechanism**: `navigator.onLine` + window `online`/`offline` event listeners

### useIosInAppBrowser
- **Location**: `src/hooks/useIosInAppBrowser.ts`
- **Returns**: `boolean`
- **Detects**: iOS + (standalone PWA mode OR in-app browsers: Facebook, Instagram, LinkedIn, Twitter, Snapchat, TikTok, Google Search App, WeChat)

---

## Utility Modules

### volumeCalculator.ts
- **Location**: `src/utils/volumeCalculator.ts`
- **Exports**: `calculateRemainingMl()`, `calculateVolumes()`, `mlToTablespoons()`, `mlToCups()`
- **Constants**: `ML_PER_TABLESPOON = 14.7868`, `ML_PER_CUP = 236.588`
- **Geometry**: Cylinder (linear), frustum (truncated cone integral formula)

### nutritionCalculator.ts
- **Location**: `src/utils/nutritionCalculator.ts`
- **Exports**: `calculateNutrition(consumedMl, oilType) → NutritionResult | null`
- **Logic**: `consumedMl × density → grams → scale per-100g USDA data`

### feedbackValidator.ts
- **Location**: `src/utils/feedbackValidator.ts`
- **Exports**: `validateFeedback(llmFillPercentage, feedback) → ValidationResult`
- **Flags**: `too_fast`, `boundary_value`, `contradictory`, `extreme_delta`

### imageCompressor.ts
- **Location**: `src/utils/imageCompressor.ts`
- **Exports**: `compressImage(imageDataUrl) → Promise<string>` (base64)
- **Config**: TARGET_WIDTH=800, JPEG_QUALITY=0.78

---

## Data Modules

### bottleRegistry.ts
- **Location**: `src/data/bottleRegistry.ts`
- **Exports**: `bottleRegistry: BottleEntry[]`, `getBottleBySku(sku) → BottleEntry | undefined`
- **Entries**: 3 bottles (Filippo Berio 500ml, Bertolli 750ml, Afia Sunflower 1L)
- **Interfaces**: `BottleEntry`, `BottleGeometry` (cylinder | frustum)

### oilNutrition.ts
- **Location**: `src/data/oilNutrition.ts`
- **Exports**: `oilNutrition: NutritionData[]`, `getNutritionByOilType(oilType) → NutritionData | undefined`
- **Entries**: 3 oils (extra virgin olive, pure olive, sunflower) with USDA FDC IDs

---

## Worker Modules

### index.ts — Router + Middleware
- **CORS**: Dynamic origin allowlist from `ALLOWED_ORIGINS` env
- **Rate limit**: Sliding window, 10/min/IP, KV-backed
- **Routes**: POST /analyze, POST /feedback, GET /health, * → 404

### analyze.ts — Image Analysis Handler
- **Validation**: sku string, imageBase64 string, 4MB max
- **LLM strategy**: Gemini (random key from pool) → Groq fallback
- **Storage**: Non-blocking R2 write via `executionCtx.waitUntil`

### feedback.ts — Feedback Handler
- **Validation**: scanId, accuracyRating enum, responseTimeMs number, llmFillPercentage number
- **Processing**: Server-side `validateFeedback()` → R2 metadata update

### providers/gemini.ts
- **Model**: `gemini-2.5-flash-latest`
- **Config**: temperature 0.1, JSON response mode, thinking budget 0
- **Prompt**: System prompt for fill level estimation + image quality assessment

### providers/groq.ts
- **Model**: `meta-llama/llama-4-scout-17b-16e-instruct`
- **Config**: temperature 0.1, max_tokens 500, JSON object response format
- **API**: OpenAI-compatible endpoint

### storage/r2Client.ts
- **`storeScan()`**: Stores JPEG image + JSON metadata to R2
- **`updateScanWithFeedback()`**: Reads existing metadata, merges feedback, writes back
- **Graceful degradation**: No-op when `TRAINING_BUCKET` is undefined

### validation/feedbackValidator.ts
- Mirror of `src/utils/feedbackValidator.ts` (identical logic)
