---
stepsCompleted: [1, 2, 3, 4]
inputDocuments: []
workflowType: 'research'
lastStep: 4
research_type: 'domain'
research_topic: 'Real-time live camera guidance UX for product capture'
research_goals: 'Understand UX patterns, industry standards, and user experience approaches for guiding users in real-time while shooting with a camera — covering lighting feedback, angle/orientation guidance, and AR silhouette overlays — specifically for the Afia 1.5L olive oil bottle capture context'
user_name: 'Ahmed'
date: '2026-04-09'
web_research_enabled: true
source_verification: true
status: 'completed'
---

# Domain Research: Real-time Live Camera Guidance UX

## Executive Summary

- **Silhouette-plus-color-state** is the dominant industry pattern: a shaped outline (matching the target object) turns red when misaligned, amber/yellow when sub-optimal, and green when capture conditions are met — used across ID scanners (Onfido, BlinkID/Microblink), document scanners (Apple VisionKit, Scanbot), and barcode scanners (Scandit, Material Design spec).
- **Feedback priority order matters critically**: industry leaders consistently gate in this sequence — object presence first, then distance/framing, then lighting, then blur — because this matches the user's natural fix sequence and avoids cognitive overload.
- **Auto-capture on condition met** (no tap required) is the leading pattern for high-stakes captures; it reduces user error and rejection rates by up to 70% (Onfido SmartCapture data).
- **Simultaneous multi-channel feedback** (visual overlay + concise text label + haptic/audio) dramatically increases success in loud or distracted environments; purely visual cues fail users in bright sunlight or for colorblind users.
- **PWA/browser camera is capable but constrained**: `getUserMedia` + `<canvas>` enables real-time video analysis, TensorFlow.js/WebGL runs ML inference at 15–30 fps on mid-range phones, but iOS Safari gaps (no MediaRecorder, inconsistent ImageCapture/torch API) must be designed around.

---

## 1. Industry Landscape

### Industries Using Live Camera Guidance

**Identity Verification / KYC** is the most mature and researched domain. Onfido, Innovatrics, Microblink (BlinkID), ID.me, and Jumio all ship production SDKs with documented real-time guidance layers. They have the strongest incentive: a failed capture means a failed onboarding, with direct revenue impact.

**Document Scanning** (CamScanner, Adobe Scan, Microsoft Lens, Apple Notes, Google Drive) pioneered automatic edge/corner detection overlays. Google's ML Kit Document Scanner API (2023) provides a standardized high-quality scanning UI flow across Android apps, removing the need for developers to build from scratch.

**Barcode / QR Scanning** (Scandit, Scanbot, ZXing, Google ML Kit Barcode) established the viewfinder rectangle paradigm — a framing box that constrains focus, with animated corner marks and color state transitions.

**Visual Product Recognition** (Vivino for wine labels, Google Lens for general objects, PictureThis/Seek by iNaturalist for plants, FoodVisor/Calorie Mama for food) rely primarily on "point and shoot" UX with minimal real-time spatial guidance, trusting AI accuracy over positioning constraints.

**eCommerce Product Photography** (DoMyShoot, Shopify's camera guidance recommendations) is an emerging space providing framing guides for product shots, but mobile-specific live guidance remains thin.

**AR/Spatial Computing** (Apple Vision Pro, IKEA Place, Google Lens AR overlays) represents the frontier — overlaying digital geometry on physical scenes in real-time. Relevant for architecture but currently overkill for single-product capture UX.

### Market Context (2024–2026)

The identity verification SDK market has standardized real-time guidance to the point where basic blur/glare/distance feedback is table stakes. The frontier is moving toward predictive guidance (anticipating user errors before they happen) and seamless auto-capture. Consumer-facing product recognition apps lag in real-time guidance sophistication relative to ID/document SDKs.

---

## 2. UX Patterns — Silhouette & Overlay Guidance

### The Shaped Silhouette Overlay

The dominant pattern across document, ID, face, and product capture is a **translucent shape overlay** placed over the live camera feed that communicates:

1. **What the target shape should look like** (rectangle for documents/IDs, oval for faces, custom bottle outline for products)
2. **Whether the user has achieved correct alignment** via color state

**Color state machine (canonical pattern):**
- **Red / orange border**: object not detected, or condition unacceptable (blocking state)
- **Yellow / amber border**: object partially in frame or sub-optimal (corrective state)
- **Green border**: all conditions met, capture imminent (success/ready state)

This red/green system is documented in Material Design's barcode scanning guidelines, implemented by Scanbot SDK (configurable overlay color and frame style), Onfido SmartCapture (live feedback changing from red to green when document detected and stable), and Microblink BlinkID (real-time outline transitions).

### Corner Marks and Bracket Animations

Corner bracket marks (L-shaped corners at four corners of a rectangle) are a widely recognized convention dating back to physical photography. In mobile UX they serve as:
- Alignment targets the user matches to the object's corners
- Animation anchors that animate inward/outward to communicate "scanning" state
- Progress indicators that fill in (clockwise or cross-corner) as quality improves

Scanbot SDK documents a `PolygonView` that begins animation when `scanning status OK` is reached and stops on capture trigger. The pulsing animation during the "seeking" phase tells users the app is active and looking.

### Overlay Density and Occlusion

Material Design camera UI guidelines specify:
- Non-actionable elements over the live feed must be **translucent** to minimize obstruction
- UI elements should hug the **top and bottom edges** of the screen to maximize visible camera area
- **Gradient scrims** (rather than solid bars) maintain text/icon legibility over variable backgrounds

Snapchat's camera icon approach — white icons with black outline shadows — ensures legibility on both dark and light backgrounds without a solid scrim. An adaptive approach samples the camera feed in real-time and flips UI element color from dark to light based on background luminance.

### Guide Sizing and the "Fill the Frame" Instruction

The optimal guidance metaphor studied in barcode/document scanning is the **fill-the-frame target**: users understand intuitively to move until the object fills the outline. This is more effective than abstract distance instructions ("move 30cm closer"). The guide shape should be:
- **Sized to the expected target** at optimal capture distance
- **Fixed on screen** (not floating/moving), giving users a stable reference
- **Slightly smaller than full-screen** so users see background context confirming they're holding the device correctly

For the Afia bottle specifically, a portrait-oriented rectangular guide (approximately matching the 1.5L bottle's aspect ratio) serves this function.

---

## 3. Lighting Feedback Patterns

### How Industry Apps Communicate Lighting Issues

**Text label above the viewfinder** is the primary channel. Apple VisionKit's `DataScannerViewController`, when `isGuidanceEnabled = true`, shows small contextual hints at the top of the screen. Onfido evolved from a **post-capture dialog warning** (showing "too much glare" after the photo was taken) to **real-time bubble notification** — a documented UX upgrade that increased first-attempt success rates.

**Icon patterns observed across apps:**
- Sun icon with an X or down-arrow: "too bright / overexposed"
- Moon icon or low-brightness sun: "too dark / underexposed"
- Flash bolt: "torch available to help"
- Eye with slash: "glare detected"

**Background overlay tinting**: Some implementations tint the overlay itself to signal lighting state — a red-tinted semi-transparent scrim over the viewfinder for too-dark, a washed-out/white-tinted overlay for overexposed.

**Zebra stripe pattern** (from professional video production): Animated diagonal lines overlaid on overexposed regions — highlights clipped areas without hiding them.

### Lighting Assessment Triggers and Thresholds

Onfido SmartCapture monitors: blur, glare, lighting quality, and positioning simultaneously. The documented sequence is:
1. Live feedback icon/text changes within ~300ms of condition change
2. If correctable, user gets actionable instruction ("move to a brighter area")
3. If uncorrectable, a fallback suggestion appears ("tap to use flash")

The Afia app's existing `assessLighting()` (brightness thresholds at 40 and 220 on 0–255 scale, contrast threshold at 30) is broadly consistent with industry implementations. The key missing pattern is **torch/flash suggestion** when `too-dark` is detected — the WebRTC `ImageCapture` API supports torch control in Chrome/Android via `MediaStreamTrack.applyConstraints({ advanced: [{ torch: true }] })`, though iOS Safari support is incomplete.

### Lighting Feedback Priority

Industry consensus: **lighting feedback should be secondary to object detection**. If the bottle isn't in frame, lighting advice is irrelevant. The Afia codebase already implements this priority ordering correctly in `generateGuidanceMessage()`.

---

## 4. Orientation & Angle Guidance

### Tilt and Level Detection

**Device accelerometer/gyroscope** is the standard method for detecting camera tilt:
- Vivino's Level Guide (crosshair calibrated to accelerometer, documented to reduce tilt-related error by 22% at 15° tilt)
- Professional camera apps providing a bubble level or horizon line overlay
- iOS Camera native horizon indicator (appears when tilt exceeds ~5°)

The visual convention for tilt correction:
- A **horizon line** overlaid on the viewfinder that tilts with the device — user adjusts until it's level
- Or a **bubble level indicator** in a corner
- Or the **outline guide itself** drawn at the corrected angle, making misalignment obvious

In browser PWAs, the DeviceOrientation API (`deviceorientation` event) provides `alpha`, `beta`, `gamma` Euler angles. However iOS requires explicit user permission (since iOS 13) via `DeviceOrientationEvent.requestPermission()`.

### Front / Back / Side Label Detection

Industry solutions:

**Industrial systems** (Antares Vision IE6000, Cognex): Use multiple fixed cameras (2–6) to capture all faces simultaneously — not applicable to consumer mobile.

**Consumer approaches:**
- **OCR-based**: Detect text or logo patterns specific to each face (front label has brand name, back has nutritional table). Vivino uses OCR to read the label and implicitly determines which face is shown.
- **Keypoint/feature matching**: Match distinctive visual features to a reference image of each face.
- **Color/texture region classification**: Train a lightweight classifier (MobileNet-level) to output "front", "back", or "side" labels. Viable in-browser with TensorFlow.js.

**UX guidance for multi-view capture**: The "card flip" animation pattern — showing a 3D card rotating from one face to another — is the established way to instruct users to flip a physical object (used universally in ID verification flows). For a bottle, a rotating bottle illustration in the instruction step would serve the same function.

### Critical Insight for Afia

For Afia's **oil level estimation**, the critical view is the **side profile** (where oil height is visible against the bottle's translucent or graduated markings). The front face is often opaque (label covers the oil column). The app should detect whether it's looking at the side profile (transparent, oil visible) vs. the front (opaque label obscuring oil column):

- If green >> amber: user is likely pointing at the front label → guidance: "Rotate bottle to show the side / oil level"
- If amber is prominent in a tall column: user is at the correct side profile

---

## 5. User Psychology & Behavior

### Cognitive Load and the Single-Message Rule

UX cognitive load research consistently finds: **showing multiple simultaneous error messages causes paralysis, not action**. Users abandon tasks when presented with more than one correction at a time.

Industry implementations converge on **single-message priority queuing** — only the most critical issue is displayed at any moment. The Afia app's `generateGuidanceMessage()` already implements this pattern (waterfall: presence → distance → lighting → blur).

### The "Busy vs. Lost" User State

Camera UX research distinguishes two failure modes:
1. **Lost**: User doesn't understand what the app wants. Solution: clearer instruction copy, illustrated guide before camera opens.
2. **Busy**: User understands but environmental conditions prevent success (dark room, shaky hands). Solution: torch suggestion, countdown timer, haptic confirmation.

Onfido's research: after launching selfie video verification, users were "not performing the right actions, retrying multiple times, and eventually giving up" — caused by going too fast. Their fix: **add a small delay** after condition is met before auto-capture, giving users time to understand what succeeded.

### Auto-Capture Timing

Standard pattern:
1. All quality conditions met → outline turns green
2. **500ms–1500ms hold** (conditions must remain met) → progress indicator (ring fills, countdown)
3. Capture fires automatically
4. Shutter sound + haptic confirm success

The hold delay filters out momentary false-positives and gives users psychological confirmation they did something right.

### Frustration Triggers (Failure Modes)

Based on industry UX research (Scandit, Onfido, Material Design guidelines):

1. **Silent failure**: App rejects without explanation
2. **Flickering messages**: Guidance oscillates rapidly (<200ms), causing incoherent flash — fix with message debounce (~500ms hold before switching)
3. **Impossible instruction**: App asks "move to brighter area" when the real issue is glare
4. **Over-restriction**: Thresholds set too tight block legitimate captures — need "allow anyway" escape hatch after N seconds
5. **Cognitive overload**: Multiple simultaneous overlays changing at once
6. **No confirmation**: Capture fires but user doesn't know if it succeeded
7. **Delayed feedback**: Guidance lagging >500ms behind camera movement

### What Users Respond Well To

- **Progress feedback**: A filling ring that shows "you're almost there" sustains effort
- **Positive reinforcement**: "Perfect! Hold steady…" before auto-capture fires
- **Instant response**: <100ms lag between camera movement and overlay color change feels live; >300ms feels broken
- **Escape hatches**: A "capture manually" button always visible reduces anxiety

---

## 6. PWA/Browser-Specific Constraints & Patterns

### What Is Achievable

| Capability | Browser Support | Notes |
|---|---|---|
| `getUserMedia()` camera stream | Universal (HTTPS) | Requires explicit permission |
| `<canvas>` pixel analysis | Universal | Core of all browser-based quality checks |
| TensorFlow.js / ONNX.js inference | Chrome/Firefox/Safari | WebGL backend, 15–30fps on mid-range devices |
| `ImageCapture` API (torch, zoom) | Chrome/Android | iOS Safari: limited/inconsistent |
| `DeviceOrientation` (gyro) | Universal | iOS 13+ requires `requestPermission()` |
| `MediaRecorder` (video capture) | Chrome/Firefox; NOT iOS Safari | Cannot record video stream on iOS Safari |
| `BarcodeDetector` API | Chrome Android | Not in Safari/Firefox |
| WebAssembly (Wasm) | Universal | OpenCV.js runs in browser via Wasm |

### Key Constraints

**iOS Safari** is the most restrictive environment:
- No `MediaRecorder` support → can only capture still frames
- `torch` via `applyConstraints` is unreliable
- `deviceorientation` permission must be triggered by a user gesture
- Recurring permission prompts on SPA route transitions (WebKit bug #215884)

**Frame rate**: `requestAnimationFrame` runs at 60fps max; canvas analysis at every frame is expensive. The Afia debounced approach (500ms interval) matches industry practice. Scanbot and Onfido SDKs similarly analyze every 200–500ms.

### PWA-Specific UX Patterns

**Camera permission UX**: Show an in-app explanation screen before triggering `getUserMedia()`, so the browser's native prompt doesn't arrive unexpectedly.

**Offline inference**: Pixel-based analysis (the Afia approach) requires no model and is fully offline-capable.

---

## 7. Accessibility Considerations

### Color Blindness

The red/green color state pattern is directly inaccessible to users with deuteranopia or protanopia (~8% of males). Industry-compliant approaches:

- **Pair color with shape**: Red outline alone fails; red outline + "⚠ Not detected" text passes
- **Pair color with motion**: A pulsing outline that stops pulsing when conditions are met conveys state without relying solely on hue
- **WCAG 1.4.1** (Color): Information must not be conveyed by color alone — the text message is the primary channel and must accompany the colored outline

The Afia app's current pattern (color-coded border + text guidance message) satisfies WCAG 1.4.1 if implemented correctly.

### Low Vision

- All text overlaid on the camera feed must meet **WCAG 1.4.3** contrast ratio (4.5:1)
- Use a semi-opaque pill/badge background behind the text rather than bare text on video
- Minimum 16px text, ideally 18–20px

### Motor Impairment

- **Auto-capture is the primary accessibility benefit**: users who cannot precisely tap benefit from auto-capture
- **Countdown timer with cancel**: 1.5s countdown + visible cancel accommodates users needing more time
- `aria-live` on guidance message element for VoiceOver/TalkBack

### Audio Environment Awareness

"Scan feedback should be obvious and delivered through visual, sound and haptic feedback since users' environments are often busy and loud." — Scandit UX research. In a kitchen (typical Afia use context), background noise is likely. Shutter sound + haptic together are more reliable than either alone.

---

## 8. Key Insights for Afia App

### Validated Patterns Already in the Codebase

- Priority-ordered guidance message waterfall (presence → distance → lighting → blur) ✅
- Debounced assessment (500ms interval) ✅
- Single-message UX ✅
- Three-state guidance type (`success` / `warning` / `error`) → green/amber/red ✅
- Specific HSV detection for green label + amber oil ✅
- Shape-aware gates (ROI, aspect ratio, neck sparsity) ✅ (just shipped)

### Gaps Relative to Industry Best Practices

**1. No animated progress indicator before auto-capture**
Industry pattern: hold green for 1–1.5s with a visible progress ring, then fire. Adding a 1000ms hold with a `<progress>`-style ring around the capture button reduces false captures and builds user confidence.

**2. No torch/flashlight suggestion for `too-dark`**
When `lighting.status === 'too-dark'`, add a torch icon button. In browser, attempt `applyConstraints({ advanced: [{ torch: true }] })` with graceful fallback.

**3. No view-face guidance (side profile vs. front label)** ← **Highest priority**
For oil level estimation, the side profile is the informative view. The front label face is opaque and obscures the oil column:
- If green >> amber → pointing at front label → "Rotate bottle to show the side / oil level"
- If amber prominent in tall column → correct side profile

**4. No haptic/audio confirmation on capture**
Web Vibration API (`navigator.vibrate(200)`) works on Android Chrome. Synthetic shutter sound via Web Audio API + vibrate provides multi-sensory confirmation.

**5. Message debounce/hysteresis not confirmed**
Add hysteresis: only upgrade `warning` → `success` after 2 consecutive `success` assessments; downgrade immediately on `error`. Prevents flickering at the 500ms boundary.

**6. No pre-camera instruction screen with bottle illustration**
Highest-ROI UX investment for first-time users: a single illustrated instruction screen before camera opens showing the bottle shape and the correct side-profile orientation.

**7. Arabic RTL guidance text**
All guidance messages must be provided in both EN + AR with RTL layout. Priority strings: "Point camera at the bottle", "Move closer", "Move camera back slightly", "Reduce glare", "Move to a brighter location", "Hold steady", "Rotate bottle to show the side".

**8. Accessibility: aria-live for guidance messages**
Add `aria-live="polite"` (or `aria-live="assertive"` for `error`) to the guidance text DOM element. Zero additional engineering cost; full VoiceOver/TalkBack support.

### Recommended Implementation Priority

1. **Side-profile view detection** — highest impact on accuracy (wrong face = wrong oil level estimate)
2. **Progress hold ring** — highest impact on user confidence and false-capture reduction
3. **Guidance message debounce/hysteresis** — eliminates flickering
4. **Pre-camera instruction screen** — reduces first-time user abandonment
5. **Arabic guidance strings** — bilingual compliance
6. **Haptic + audio confirmation** — multi-sensory success feedback
7. **Torch suggestion** — edge case, complex iOS support

---

## Sources

- [Augmented Reality App Development: A Comprehensive 2024 Guide — Lampa.dev](https://lampa.dev/blog/augmented-reality-app-development-a-comprehensive-2024-guide)
- [Design Apps with Beautiful Camera Control — LeewayHertz](https://www.leewayhertz.com/design-apps-with-a-great-camera-user-experience/)
- [Document Scanner — ML Kit (Google)](https://developers.google.com/ml-kit/vision/doc-scanner)
- [Barcode Scanning — Material Design M2](https://m2.material.io/design/machine-learning/barcode-scanning.html)
- [Scanning at Scale: Insights from our UX Director — Scandit](https://www.scandit.com/blog/scanning-at-scale-ux-insights/)
- [Rectangular Frame on Barcode Camera Preview — Scanbot SDK](https://scanbot.io/techblog/implementing-a-barcode-scanner-viewfinder/)
- [VisionKit — Apple Developer Documentation](https://developer.apple.com/documentation/visionkit)
- [User Guidance: How to Provide Meaningful Feedback — Onfido/Medium](https://medium.com/onfido-tech/user-guidance-how-to-provide-meaningful-feedback-to-users-212378fefb32)
- [Accelerating Customer Acquisition with Smart Capture — Onfido](https://onfido.com/blog/accelerating-customer-acquisition-smart-capture/)
- [Building BlinkID Capture: Even Better UX — Microblink](https://microblink.com/resources/blog/building-blinkid-capture-even-better-ux-and-data-extraction/)
- [Document Auto-Capture for Web and Mobile — Innovatrics](https://developers.innovatrics.com/digital-onboarding/docs/functionalities/document/auto-capture/)
- [Vivino Wine Scanner](https://www.vivino.com/en/wine-news/vivino-wine-scanner)
- [Automatic Bottle Orienter with Computer Vision — Roboflow Blog](https://blog.roboflow.com/estimate-bottle-orientation/)
- [Cognitive Load in UX Design — Tallwave](https://tallwave.com/blog/cognitive-load-in-ux/)
- [Reducing Cognitive Overload For A Better User Experience — Smashing Magazine](https://www.smashingmagazine.com/2016/09/reducing-cognitive-overload-for-a-better-user-experience/)
- [How to Access the Camera in a PWA — SimiCart](https://simicart.com/blog/pwa-camera-access/)
- [Take Photos and Control Camera Settings (ImageCapture) — Chrome for Developers](https://developer.chrome.com/blog/imagecapture)
- [Fix Bad Lighting with JavaScript Webcam Exposure Controls — webrtcHacks](https://webrtchacks.com/bad-lighting-fix-with-javascript-webcam-exposure/)
- [Haptic Feedback — Android Developers](https://developer.android.com/develop/ui/views/haptics/haptics-principles)
- [Designing for Color Blind Users — Color Blind Simulator](https://colorblindsimulator.app/blog/design-for-color-blind-users)
- [Machine Vision for Liquid Level Detection — Vision Systems Design](https://www.vision-systems.com/cameras-accessories/article/16737636/integration-insights-embedded-machine-vision-system-detects-liquid-level)
- [MediaDevices: getUserMedia() — MDN Web Docs](https://developer.mozilla.org/en-US/docs/Web/API/MediaDevices/getUserMedia)
