# Component Inventory — Afia Oil Tracker

**Generated:** 2026-04-20 | **Scan Level:** Quick | **Mode:** Full Rescan

## Overview

This document catalogs all React components, hooks, utilities, and services in the Afia Oil Tracker application. Components are organized by category and include their purpose, props, and key behaviors.

**Total Components:** 60+ React components  
**Total Hooks:** 9 custom hooks  
**Total Utilities:** 18 utility modules  
**Total Services:** 8 service modules

---

## React Components

### Core Application Components

#### App.tsx
**Purpose:** Root component and finite state machine router  
**State Management:** React useState for FSM  
**States:** IDLE → CAMERA_ACTIVE → API_PENDING → FILL_CONFIRM → API_SUCCESS  
**Key Behaviors:**
- Routes between screens based on app state
- Manages bottle context from URL parameter
- Handles iOS in-app browser detection
- Coordinates camera capture and API analysis flow

#### ErrorBoundary.tsx
**Purpose:** Top-level error boundary for graceful error handling  
**Props:** `children: ReactNode`  
**Key Behaviors:**
- Catches React component errors
- Displays user-friendly error message
- Provides "Try Again" action
- Logs errors to console

---

### Landing & Onboarding Components

#### QrLanding.tsx
**Purpose:** Initial landing screen with bottle information  
**State:** IDLE  
**Props:** `bottle: BottleEntry, onStartScan: () => void`  
**Key Behaviors:**
- Displays bottle image and details
- Shows "Start Scan" button
- Triggers privacy notice on first visit
- Handles language selection

#### PrivacyNotice.tsx
**Purpose:** First-visit privacy consent overlay  
**Props:** `onAccept: () => void`  
**Key Behaviors:**
- Shows on first app visit (localStorage check)
- Explains data collection and storage
- Requires explicit acceptance
- Stores consent in localStorage

#### PrivacyInline.tsx
**Purpose:** Inline privacy notice for subsequent visits  
**Props:** `onAccept: () => void, visible: boolean`  
**Key Behaviors:**
- Compact version of privacy notice
- Appears inline in UI flow
- Same consent mechanism as full notice

#### IosWarning.tsx
**Purpose:** Warning for iOS in-app browsers  
**Props:** None  
**Key Behaviors:**
- Detects iOS in-app browser (Instagram, Facebook, etc.)
- Warns that camera may not work
- Suggests opening in Safari
- Dismissible overlay

#### UnknownBottle.tsx
**Purpose:** Fallback screen for unsupported SKUs  
**Props:** `sku: string`  
**Key Behaviors:**
- Displays when SKU is not in registry
- Shows "Not Supported" message
- Provides link to supported bottles

---

### Camera & Capture Components

#### CameraCapture.tsx
**Purpose:** Camera viewfinder and photo capture  
**State:** CAMERA_ACTIVE  
**Props:** `onCapture: (imageBase64: string) => void, onCancel: () => void`  
**Key Behaviors:**
- Activates rear camera via getUserMedia
- Shows live camera feed
- Capture button with haptic feedback
- Handles camera permissions and errors

#### CameraViewfinder.tsx
**Purpose:** Camera preview with overlay guidance  
**Props:** `stream: MediaStream, onCapture: () => void`  
**Key Behaviors:**
- Displays live camera stream
- Overlay guides for bottle alignment
- Capture button with animation
- Orientation guidance

#### OrientationGuide.tsx
**Purpose:** Visual guide for proper bottle orientation  
**Props:** `visible: boolean`  
**Key Behaviors:**
- Shows bottle outline overlay
- Alignment indicators
- "Hold steady" message
- Auto-dismisses after capture

---

### Analysis & Results Components

#### AnalyzingOverlay.tsx
**Purpose:** Loading state during AI analysis  
**State:** API_PENDING  
**Props:** `provider: string, progress?: number`  
**Key Behaviors:**
- Animated loading indicator
- Shows AI provider (Gemini/Groq/Local)
- Progress bar (if available)
- "Analyzing..." message

#### ApiStatus.tsx
**Purpose:** API error state display  
**State:** API_ERROR  
**Props:** `error: string, onRetry: () => void`  
**Key Behaviors:**
- Displays error message
- "Try Again" button
- Offline detection
- Error categorization

#### FillConfirm.tsx
**Purpose:** Intermediate confirmation screen with red line overlay  
**State:** FILL_CONFIRM  
**Props:** `imageBase64: string, result: AnalysisResult, onConfirm: () => void, onAdjust: () => void`  
**Key Behaviors:**
- Shows captured image with red line overlay
- Displays estimated fill level
- "Looks Good" and "Adjust" buttons
- Allows user to fine-tune estimate

#### InlineConfirm.tsx
**Purpose:** Compact inline confirmation UI  
**Props:** `result: AnalysisResult, onConfirm: () => void, onAdjust: () => void`  
**Key Behaviors:**
- Minimal confirmation interface
- Quick accept/adjust actions
- Used in mobile-optimized flow

#### ResultDisplay.tsx
**Purpose:** Main results screen with fill gauge and insights  
**State:** API_SUCCESS  
**Props:** `result: AnalysisResult, bottle: BottleEntry, onNewScan: () => void`  
**Key Behaviors:**
- Displays fill gauge visualization
- Shows volume breakdown (ml, tbsp, cups)
- Nutrition facts for consumed oil
- Feedback prompt
- "Scan Again" button

---

### Visualization Components

#### FillGauge.tsx
**Purpose:** SVG bottle fill visualization  
**Props:** `fillPercentage: number, animated?: boolean`  
**Key Behaviors:**
- SVG bottle outline
- Animated fill level
- Color gradient based on fill level
- Smooth transitions

#### BottleFillGauge.tsx
**Purpose:** Enhanced bottle gauge with labels  
**Props:** `fillPercentage: number, totalVolumeMl: number, remainingMl: number`  
**Key Behaviors:**
- Bottle visualization with fill level
- Percentage label
- Volume labels (remaining/total)
- Responsive sizing

#### LiquidGauge.tsx
**Purpose:** Animated liquid fill gauge  
**Props:** `fillPercentage: number, color?: string`  
**Key Behaviors:**
- Circular liquid gauge
- Wave animation
- Percentage display
- Customizable colors

#### CupVisualization.tsx
**Purpose:** Visual representation of volume in cups  
**Props:** `volumeMl: number`  
**Key Behaviors:**
- Shows filled/empty cup icons
- Converts ml to cups
- Visual quantity indicator

#### ConfidenceBadge.tsx
**Purpose:** AI confidence indicator  
**Props:** `confidence: 'high' | 'medium' | 'low', provider: string`  
**Key Behaviors:**
- Color-coded badge (green/yellow/red)
- Shows AI provider
- Tooltip with confidence explanation

---

### Feedback & Interaction Components

#### FeedbackPrompt.tsx
**Purpose:** User accuracy rating and correction  
**Props:** `result: AnalysisResult, onSubmit: (feedback: Feedback) => void`  
**Key Behaviors:**
- Accuracy rating grid (Too Low, Just Right, Too High)
- Correction slider (if not "Just Right")
- Validation before submission
- Stores feedback for training

#### FeedbackGrid.tsx
**Purpose:** 3-button accuracy rating grid  
**Props:** `onSelect: (rating: 'too_low' | 'just_right' | 'too_high') => void`  
**Key Behaviors:**
- Three-button layout
- Visual feedback on selection
- Haptic feedback
- Accessible labels

---

### Admin & Testing Components

#### AdminDashboard.tsx
**Purpose:** Admin panel for reviewing scans and corrections  
**Props:** None (protected route)  
**Key Behaviors:**
- Lists all scans from Supabase
- Shows AI predictions vs user corrections
- Allows manual corrections
- Exports training data

#### AdminOnboarding.tsx
**Purpose:** Admin authentication and setup  
**Props:** `onAuthenticated: () => void`  
**Key Behaviors:**
- Password authentication
- Admin role verification
- Session management

#### AdminUpload.tsx
**Purpose:** Manual image upload for testing  
**Props:** `onUpload: (file: File) => void`  
**Key Behaviors:**
- File input for images
- Image preview
- Validation (size, format)
- Triggers analysis

#### AdminToolsOverlay.tsx
**Purpose:** Developer tools overlay  
**Props:** `visible: boolean, onClose: () => void`  
**Key Behaviors:**
- Mock API controls
- Test harness access
- Debug information
- Feature flags

#### TestHarness.tsx
**Purpose:** Automated testing interface  
**Props:** None  
**Key Behaviors:**
- Runs test scenarios
- Validates analysis results
- Performance benchmarking
- Visual regression testing

#### TestLab.tsx
**Purpose:** Interactive testing environment  
**Props:** None  
**Key Behaviors:**
- Manual test controls
- State inspection
- API mocking
- Component isolation

#### MockApiPanel.tsx
**Purpose:** Mock API response controls  
**Props:** `onMockResponse: (response: AnalysisResult) => void`  
**Key Behaviors:**
- Predefined mock responses
- Custom response builder
- Latency simulation
- Error injection

#### ApiInspector.tsx
**Purpose:** API request/response inspector  
**Props:** `requests: ApiRequest[]`  
**Key Behaviors:**
- Lists all API calls
- Shows request/response details
- Timing information
- Error details

#### VisualRegressionHarness.tsx
**Purpose:** Visual regression testing tool  
**Props:** `components: ComponentTest[]`  
**Key Behaviors:**
- Renders components in isolation
- Captures screenshots
- Compares against baselines
- Reports visual differences

---

### Utility & UI Components

#### Toast.tsx
**Purpose:** Temporary notification messages  
**Props:** `message: string, type: 'success' | 'error' | 'info', duration?: number`  
**Key Behaviors:**
- Auto-dismissing notifications
- Color-coded by type
- Slide-in animation
- Queue management

#### OfflineBanner.tsx
**Purpose:** Offline status indicator  
**Props:** None  
**Key Behaviors:**
- Detects offline state
- Shows banner at top of screen
- Auto-hides when online
- Persistent during offline

#### LoadingShell.tsx
**Purpose:** Skeleton loading state  
**Props:** `type: 'card' | 'list' | 'gauge'`  
**Key Behaviors:**
- Animated skeleton UI
- Matches content layout
- Smooth transition to content

#### Skeleton.tsx
**Purpose:** Generic skeleton loader  
**Props:** `width?: string, height?: string, variant?: 'text' | 'circular' | 'rectangular'`  
**Key Behaviors:**
- Customizable dimensions
- Multiple variants
- Pulse animation

#### EmptyState.tsx
**Purpose:** Empty state placeholder  
**Props:** `icon: ReactNode, title: string, description: string, action?: ReactNode`  
**Key Behaviors:**
- Centered layout
- Icon + text + optional action
- Used for empty lists/history

#### MetricCard.tsx
**Purpose:** Metric display card  
**Props:** `label: string, value: string | number, unit?: string, icon?: ReactNode`  
**Key Behaviors:**
- Card layout with label/value
- Optional icon and unit
- Responsive sizing

#### AfiaLogo.tsx
**Purpose:** Afia brand logo component  
**Props:** `size?: 'small' | 'medium' | 'large'`  
**Key Behaviors:**
- SVG logo
- Responsive sizing
- Brand colors

---

### Navigation & Layout Components

#### Navigation.tsx
**Purpose:** App navigation bar  
**Props:** `currentScreen: string, onNavigate: (screen: string) => void`  
**Key Behaviors:**
- Bottom navigation bar
- Active state indicators
- Icon + label layout

#### AdminTabNav.tsx
**Purpose:** Admin panel tab navigation  
**Props:** `activeTab: string, onTabChange: (tab: string) => void`  
**Key Behaviors:**
- Tab bar for admin sections
- Active tab highlighting
- Responsive layout

#### LanguageSelector.tsx
**Purpose:** Language selection dropdown  
**Props:** `currentLanguage: string, onLanguageChange: (lang: string) => void`  
**Key Behaviors:**
- Dropdown with language options
- Flag icons
- Persists to localStorage
- Triggers i18n update

---

### Bottle Management Components

#### BottleSelector.tsx
**Purpose:** Bottle selection interface  
**Props:** `bottles: BottleEntry[], onSelect: (sku: string) => void`  
**Key Behaviors:**
- Grid of available bottles
- Image + name + details
- Selection state
- Filters by availability

#### BottleManager.tsx
**Purpose:** Admin bottle registry management  
**Props:** None  
**Key Behaviors:**
- CRUD operations on bottles
- Edit geometry and calibration
- Upload bottle images
- Validate bottle data

#### BottleOverlay.tsx
**Purpose:** Bottle information overlay  
**Props:** `bottle: BottleEntry, onClose: () => void`  
**Key Behaviors:**
- Modal with bottle details
- Geometry specifications
- Calibration points
- Close button

---

### History & Tracking Components

#### ScanHistory.tsx
**Purpose:** User's scan history list  
**Props:** `scans: AnalysisResult[], onSelectScan: (scanId: string) => void`  
**Key Behaviors:**
- Lists past scans
- Shows date, fill level, bottle
- Tap to view details
- Stored in IndexedDB

#### ScanReview.tsx
**Purpose:** Detailed view of a single scan  
**Props:** `scan: AnalysisResult, bottle: BottleEntry`  
**Key Behaviors:**
- Shows scan image
- Analysis details
- Feedback submitted
- Export options

#### ConsumptionTrends.tsx
**Purpose:** Consumption analytics over time  
**Props:** `scans: AnalysisResult[]`  
**Key Behaviors:**
- Chart of consumption over time
- Average daily usage
- Trends and insights
- Date range selector

#### TimelineGroup.tsx
**Purpose:** Grouped timeline of scans  
**Props:** `scans: AnalysisResult[], groupBy: 'day' | 'week' | 'month'`  
**Key Behaviors:**
- Groups scans by time period
- Collapsible sections
- Summary statistics per group

---

### Quality & Guidance Components

#### UploadQualityWarning.tsx
**Purpose:** Warning for low-quality images  
**Props:** `issues: string[], onProceed: () => void, onRetake: () => void`  
**Key Behaviors:**
- Lists detected quality issues
- "Proceed Anyway" option
- "Retake Photo" option
- Prevents poor training data

#### ImageUpload.tsx
**Purpose:** File upload component  
**Props:** `onUpload: (file: File) => void, accept?: string`  
**Key Behaviors:**
- Drag-and-drop support
- File input fallback
- Image preview
- Validation

---

### QR & Testing Components

#### QrMockGenerator.tsx
**Purpose:** Generate QR codes for testing  
**Props:** `sku: string`  
**Key Behaviors:**
- Generates QR code for SKU
- Downloadable image
- Copy URL to clipboard
- Used for physical bottle testing

---

### App Control Components

#### AppControls.tsx
**Purpose:** Global app controls and settings  
**Props:** None  
**Key Behaviors:**
- Settings menu
- Theme toggle
- Language selector
- Clear cache option

---

## Custom Hooks

### useCamera.ts
**Purpose:** Camera access and photo capture  
**Returns:** `{ stream, error, capturePhoto, stopCamera }`  
**Key Behaviors:**
- Requests camera permissions
- Activates rear camera
- Captures photo to canvas
- Compresses image to base64

### useOnlineStatus.ts
**Purpose:** Network connectivity detection  
**Returns:** `{ isOnline: boolean }`  
**Key Behaviors:**
- Monitors navigator.onLine
- Listens to online/offline events
- Updates state reactively

### useIosInAppBrowser.ts
**Purpose:** Detects iOS in-app browsers  
**Returns:** `{ isIosInAppBrowser: boolean, browserName: string }`  
**Key Behaviors:**
- Parses user agent
- Detects Instagram, Facebook, etc.
- Returns browser name

### useCameraGuidance.ts
**Purpose:** Camera quality assessment and guidance  
**Returns:** `{ guidance: string[], quality: 'good' | 'poor' }`  
**Key Behaviors:**
- Analyzes image quality
- Provides guidance messages
- Detects lighting issues
- Checks bottle visibility

### useLocalAnalysis.ts
**Purpose:** Local ONNX model inference (Stage 2)  
**Returns:** `{ analyze, loading, error }`  
**Key Behaviors:**
- Loads ONNX model from cache
- Runs inference in browser
- Returns fill percentage + confidence
- Handles model errors

### useScanHistory.ts
**Purpose:** Manages scan history in IndexedDB  
**Returns:** `{ scans, addScan, deleteScan, clearHistory }`  
**Key Behaviors:**
- CRUD operations on scan history
- Stores in IndexedDB
- Reactive updates
- Pagination support

### useGlobalScans.ts
**Purpose:** Global scan state management  
**Returns:** `{ scans, addScan, updateScan }`  
**Key Behaviors:**
- Shared scan state across components
- Syncs with IndexedDB
- Real-time updates

### useTheme.ts
**Purpose:** Theme management (light/dark mode)  
**Returns:** `{ theme, toggleTheme }`  
**Key Behaviors:**
- Reads system preference
- Persists to localStorage
- Applies CSS classes
- Reactive updates

### useToast.ts
**Purpose:** Toast notification management  
**Returns:** `{ showToast, hideToast }`  
**Key Behaviors:**
- Queue management
- Auto-dismiss timers
- Multiple toast support

---

## Utility Modules

### volumeCalculator.ts
**Purpose:** Volume calculations from fill percentage  
**Functions:**
- `calculateVolumes(fillPct, totalMl, geometry)` → `{remaining, consumed}`
- `cylinderVolume(diameter, height, fillPct)`
- `frustumVolume(topD, bottomD, height, fillPct)`
- `calibratedVolume(calibrationPoints, fillPct)`
- `mlToTablespoons(ml)`, `mlToCups(ml)`

### nutritionCalculator.ts
**Purpose:** USDA-based nutrition facts  
**Functions:**
- `calculateNutrition(consumedMl, oilType)` → `{calories, totalFatG, saturatedFatG}`
- Uses USDA data per 100g
- Converts ml to grams (density 0.92 g/ml)

### feedbackValidator.ts
**Purpose:** Client-side feedback validation  
**Functions:**
- `validateFeedback(feedback)` → `{flags, confidenceWeight, trainingEligible}`
- Flags: `too_fast`, `boundary_value`, `contradictory`, `extreme_delta`
- Mirrors worker validation logic

### imageCompressor.ts
**Purpose:** Image compression before upload  
**Functions:**
- `compressImage(base64, maxWidth, quality)` → `compressedBase64`
- Resizes to 800px max dimension
- JPEG quality 0.78
- Reduces upload size

### cameraQualityAssessment.ts
**Purpose:** Image quality analysis  
**Functions:**
- `assessImageQuality(imageBase64)` → `{quality, issues[]}`
- Detects: blur, low light, overexposure
- Provides guidance messages

### fillMlToPixelY.ts
**Purpose:** Maps ml volume to pixel Y coordinate  
**Functions:**
- `fillMlToPixelY(ml, bottle, imageHeight)` → `pixelY`
- Used for red line overlay
- Accounts for bottle geometry

### coordinateMapping.ts
**Purpose:** Coordinate transformations  
**Functions:**
- `normalizedToPixel(normalized, imageHeight)` → `pixelY`
- `pixelToNormalized(pixelY, imageHeight)` → `normalized`

### formatters.ts
**Purpose:** Number and text formatting  
**Functions:**
- `formatVolume(ml)` → `"1,500 ml"`
- `formatPercentage(pct)` → `"75%"`
- `formatNutrition(value)` → `"120 kcal"`

### platformDetect.ts
**Purpose:** Platform and browser detection  
**Functions:**
- `isIOS()`, `isAndroid()`, `isSafari()`, `isChrome()`
- `getDeviceType()` → `'mobile' | 'tablet' | 'desktop'`

### haptics.ts
**Purpose:** Haptic feedback  
**Functions:**
- `vibrate(pattern)` - Vibration API wrapper
- `lightImpact()`, `mediumImpact()`, `heavyImpact()`

### audioFeedback.ts
**Purpose:** Audio feedback  
**Functions:**
- `playSound(type)` - Plays UI sounds
- `playSuccess()`, `playError()`, `playCapture()`

### analytics.ts
**Purpose:** Analytics event tracking  
**Functions:**
- `trackEvent(name, properties)`
- `trackScan(result)`
- `trackFeedback(feedback)`

### exportResults.ts
**Purpose:** Export scan results  
**Functions:**
- `exportToCSV(scans)` → CSV file
- `exportToJSON(scans)` → JSON file
- `exportToPDF(scan)` → PDF report

### trainingExporter.ts
**Purpose:** Export training data  
**Functions:**
- `exportTrainingData(scans)` → formatted dataset
- Includes images, labels, metadata
- JSONL format for ML training

### db.ts
**Purpose:** IndexedDB wrapper  
**Functions:**
- `openDB()`, `closeDB()`
- `addScan(scan)`, `getScan(id)`, `getAllScans()`
- `deleteScan(id)`, `clearAllScans()`

### modelCache.ts
**Purpose:** ONNX model caching  
**Functions:**
- `cacheModel(modelUrl)` → cached blob
- `getCachedModel()` → model blob
- `clearModelCache()`

---

## Service Modules

### analysisRouter.ts
**Purpose:** Routes analysis to local or cloud  
**Functions:**
- `analyzeImage(imageBase64, bottle)` → `AnalysisResult`
- Decides: local ONNX vs cloud LLM
- Implements confidence threshold logic

### inferenceRouter.ts
**Purpose:** Inference routing for Stage 2  
**Functions:**
- `routeInference(image, bottle)` → `{source, result}`
- Local first, cloud fallback
- Tracks routing decisions

### localInference.ts
**Purpose:** Local ONNX model inference  
**Functions:**
- `runLocalInference(imageBase64)` → `{fillPct, confidence}`
- Preprocesses image
- Runs ONNX model
- Postprocesses output

### modelLoader.ts
**Purpose:** ONNX model loading and management  
**Functions:**
- `loadModel(modelUrl)` → ONNX session
- Caches model in IndexedDB
- Checks for updates
- Handles loading errors

### syncQueue.ts
**Purpose:** Background sync queue (Stage 3)  
**Functions:**
- `queueScan(scan)` - Add to sync queue
- `processSyncQueue()` - Sync when online
- `clearSyncQueue()` - Clear queue

### uploadFilter.ts
**Purpose:** Filters uploads for quality  
**Functions:**
- `shouldUpload(scan)` → boolean
- Checks quality thresholds
- Prevents poor training data

### errorTelemetry.ts
**Purpose:** Error tracking and reporting  
**Functions:**
- `logError(error, context)`
- `reportToSentry(error)`
- `trackErrorMetrics()`

---

## Worker Modules (Backend)

### index.ts
**Purpose:** Hono router and middleware  
**Endpoints:**
- `POST /analyze` - Image analysis
- `POST /feedback` - Feedback submission
- `GET /health` - Health check
- `POST /admin/*` - Admin endpoints

### analyze.ts
**Purpose:** POST /analyze handler  
**Functions:**
- `handleAnalyze(c)` → Response
- Validates input
- Calls LLM provider
- Stores to R2 (non-blocking)

### feedback.ts
**Purpose:** POST /feedback handler  
**Functions:**
- `handleFeedback(c)` → Response
- Validates feedback
- Updates R2 metadata
- Stores to Supabase

### providers/gemini.ts
**Purpose:** Gemini 2.5 Flash integration  
**Functions:**
- `callGemini(imageBase64, bottle)` → LLMResponse
- Builds prompt with few-shot examples
- Parses JSON response
- Handles errors

### providers/groq.ts
**Purpose:** Groq Llama 4 Scout fallback  
**Functions:**
- `callGroq(imageBase64, bottle)` → LLMResponse
- OpenAI-compatible API
- Fallback provider

### providers/mistral.ts
**Purpose:** Mistral AI provider  
**Functions:**
- `callMistral(imageBase64, bottle)` → LLMResponse
- Alternative LLM provider

### providers/openrouter.ts
**Purpose:** OpenRouter multi-model provider  
**Functions:**
- `callOpenRouter(imageBase64, bottle, model)` → LLMResponse
- Access to multiple models

### validation/feedbackValidator.ts
**Purpose:** Server-side feedback validation  
**Functions:**
- `validateFeedback(feedback)` → ValidationResult
- Same logic as client-side validator
- 4-flag system

### storage/r2Client.ts
**Purpose:** Cloudflare R2 storage client  
**Functions:**
- `storeImage(scanId, imageBase64)` → R2 URL
- `updateMetadata(scanId, metadata)`
- `getImage(scanId)` → image blob

### storage/supabaseClient.ts
**Purpose:** Supabase client for training data  
**Functions:**
- `storeTrainingData(scan, feedback)`
- `getTrainingData(filters)` → scans[]
- `updateCorrection(scanId, correction)`

### monitoring/logger.ts
**Purpose:** Structured logging  
**Functions:**
- `log(level, message, context)`
- `logRequest(request)`
- `logError(error)`

### monitoring/quotaMonitor.ts
**Purpose:** API quota monitoring  
**Functions:**
- `trackApiCall(provider, tokens)`
- `checkQuota(provider)` → remaining
- `alertOnQuotaThreshold()`

---

## Component Categories Summary

| Category | Count | Examples |
|----------|-------|----------|
| Core Application | 2 | App, ErrorBoundary |
| Landing & Onboarding | 5 | QrLanding, PrivacyNotice, IosWarning |
| Camera & Capture | 3 | CameraCapture, CameraViewfinder, OrientationGuide |
| Analysis & Results | 5 | AnalyzingOverlay, ApiStatus, FillConfirm, ResultDisplay |
| Visualization | 5 | FillGauge, BottleFillGauge, LiquidGauge, ConfidenceBadge |
| Feedback & Interaction | 2 | FeedbackPrompt, FeedbackGrid |
| Admin & Testing | 9 | AdminDashboard, TestHarness, MockApiPanel |
| Utility & UI | 7 | Toast, OfflineBanner, LoadingShell, EmptyState |
| Navigation & Layout | 3 | Navigation, AdminTabNav, LanguageSelector |
| Bottle Management | 3 | BottleSelector, BottleManager, BottleOverlay |
| History & Tracking | 4 | ScanHistory, ScanReview, ConsumptionTrends |
| Quality & Guidance | 2 | UploadQualityWarning, ImageUpload |
| QR & Testing | 1 | QrMockGenerator |
| App Controls | 1 | AppControls |

---

## Design Patterns

### Component Patterns

1. **Container/Presentational Pattern**
   - Containers: Handle logic and state
   - Presentational: Pure UI components
   - Example: `CameraCapture` (container) + `CameraViewfinder` (presentational)

2. **Compound Components**
   - Parent component with child components
   - Example: `FeedbackPrompt` + `FeedbackGrid`

3. **Render Props**
   - Components that accept render functions
   - Example: `ErrorBoundary` with fallback render

4. **Custom Hooks**
   - Reusable stateful logic
   - Example: `useCamera`, `useOnlineStatus`

### State Management Patterns

1. **Finite State Machine (FSM)**
   - App.tsx uses explicit states
   - Predictable state transitions
   - No invalid states possible

2. **Local State**
   - Component-level useState
   - For UI-only state

3. **Shared State**
   - Custom hooks for shared state
   - Example: `useGlobalScans`

4. **Persistent State**
   - IndexedDB for scan history
   - localStorage for preferences

---

## Testing Coverage

### Unit Tests
- **volumeCalculator.ts:** 16 tests
- **nutritionCalculator.ts:** 7 tests
- **feedbackValidator.ts:** 11 tests
- **Component tests:** 8 components tested

### Integration Tests
- **API client:** Mock responses
- **Camera flow:** End-to-end capture
- **Feedback submission:** Validation + storage

### E2E Tests (Playwright)
- Camera capture flow
- Scan and result display
- Feedback submission
- Offline functionality

---

## Accessibility Features

### ARIA Labels
- All interactive elements have aria-labels
- Screen reader support
- Keyboard navigation

### Color Contrast
- WCAG AA compliant
- High contrast mode support
- Color-blind friendly palettes

### Focus Management
- Logical tab order
- Focus indicators
- Skip links

### Responsive Design
- Mobile-first approach
- Touch-friendly targets (44px minimum)
- Responsive typography

---

## Performance Optimizations

### Code Splitting
- Lazy loading for admin components
- Route-based splitting
- Dynamic imports

### Memoization
- React.memo for expensive components
- useMemo for calculations
- useCallback for event handlers

### Image Optimization
- Compression before upload
- Lazy loading for images
- WebP format support

### Bundle Size
- Tree shaking
- Minification
- Gzip compression

---

## Next Steps

### Stage 2 Components (In Progress)
- `ModelLoader` - ONNX model loading
- `LocalInferenceStatus` - Local inference indicator
- `ConfidenceThresholdSettings` - Adjust threshold
- `ModelUpdateNotification` - Model update alerts

### Stage 3 Components (Planned)
- `OfflineQueueManager` - Manage sync queue
- `BackgroundSyncStatus` - Sync status indicator
- `ModelVersionSelector` - Switch model versions
- `FullOfflineMode` - Complete offline UI

---

**For detailed architecture, see [Architecture](./architecture.md).**

**For API contracts, see [API Contracts](./api-contracts.md).**

**For data models, see [Data Models](./data-models.md).**
