---
stepsCompleted: [1, 2, 3, 4, 5, 6]
inputDocuments:
  - prd.md
  - architecture.md
  - product-brief-Safi-Image-Analysis-2026-02-26.md
---

# UX Design Specification — Safi Oil Tracker

**Author:** Ahmed
**Date:** 2026-02-27
**Status:** Complete — POC v1

---

## Executive Summary

### Project Vision

Safi Oil Tracker delivers a single, frictionless interaction: QR scan on a physical oil bottle → phone camera → AI-estimated oil level → volume and nutritional insight in under 8 seconds. The UX is optimized for one user in one context: standing in a kitchen right after cooking, wanting a fast answer without setup friction.

### Target Users

**Primary:** Health-conscious home cooks tracking calorie/fat intake. Aged 25–50, comfortable with smartphones, not tech enthusiasts. Access is incidental (QR on a product they already bought). Motivation is dietary awareness, not app engagement.

**Secondary:** The oil company — UX must reflect product quality and brand trust.

### Key Design Challenges

1. **Speed vs. capture quality:** Deliver value in ≤8 seconds while guiding users to take a photo good enough for AI analysis — without friction that causes abandonment.
2. **Trust calibration:** Communicate ±15% accuracy clearly enough to be honest, but not so prominently that it undermines perceived usefulness or suppresses feedback.
3. **Feedback volume:** Achieve ≥30% feedback submission rate with a UI completable in 1–2 taps for the satisfied-user case.
4. **iOS browser chrome:** `display: "browser"` means the Safari UI chrome is always visible. Camera viewfinder and result display must work within browser viewport, not full screen.

### Design Opportunities

1. **Result as hero moment:** Bold, immediate fill gauge + volume numbers + nutrition panel can feel genuinely novel — this result display is the entire product.
2. **Camera overlay as precision signal:** A bottle-shaped framing guide makes capture feel like intentional measurement, not just a photo upload.
3. **Feedback as natural flow completion:** Positioning feedback as the closing step (not an interrupt) maximizes submission rate while maintaining momentum.

---

## Design System

### Color Palette

| Token | Hex | Usage |
|-------|-----|-------|
| `--color-primary` | `#2D6A4F` | Primary actions, headers, brand identity (deep olive green) |
| `--color-primary-light` | `#40916C` | Hover states, secondary emphasis |
| `--color-surface` | `#FFFFFF` | Card backgrounds, main surface |
| `--color-background` | `#F8F9FA` | Page background |
| `--color-text-primary` | `#1A1A2E` | Headings, primary text |
| `--color-text-secondary` | `#6C757D` | Captions, secondary info |
| `--color-text-on-primary` | `#FFFFFF` | Text on primary-colored backgrounds |
| `--color-success` | `#2D6A4F` | High confidence, positive states |
| `--color-warning` | `#E9A820` | Medium confidence, caution states |
| `--color-danger` | `#D64045` | Low confidence, errors |
| `--color-fill-high` | `#40916C` | Fill gauge > 50% |
| `--color-fill-medium` | `#E9A820` | Fill gauge 25–50% |
| `--color-fill-low` | `#D64045` | Fill gauge < 25% |
| `--color-overlay` | `rgba(0, 0, 0, 0.5)` | Camera overlay background |

**Rationale:** Olive green primary reflects the oil product category. Warm, food-adjacent palette builds trust for a kitchen-context app. All foreground/background combinations meet WCAG 2.1 AA contrast ratio ≥ 4.5:1.

### Typography

| Token | Value | Usage |
|-------|-------|-------|
| `--font-family` | `'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif` | All text |
| `--font-size-hero` | `48px` / `3rem` | Fill percentage number |
| `--font-size-h1` | `24px` / `1.5rem` | Screen titles |
| `--font-size-h2` | `20px` / `1.25rem` | Section headers |
| `--font-size-body` | `16px` / `1rem` | Body text, labels |
| `--font-size-caption` | `14px` / `0.875rem` | Disclaimers, secondary info |
| `--font-size-small` | `12px` / `0.75rem` | Fine print |
| `--font-weight-bold` | `700` | Headings, key values |
| `--font-weight-semibold` | `600` | Sub-headings, emphasis |
| `--font-weight-regular` | `400` | Body text |
| `--line-height-tight` | `1.2` | Headings |
| `--line-height-normal` | `1.5` | Body text |

### Spacing

| Token | Value | Usage |
|-------|-------|-------|
| `--space-xs` | `4px` | Tight internal padding |
| `--space-sm` | `8px` | Component internal spacing |
| `--space-md` | `16px` | Standard gap between elements |
| `--space-lg` | `24px` | Section spacing |
| `--space-xl` | `32px` | Major section separators |
| `--space-2xl` | `48px` | Page-level padding top/bottom |

### Border Radius

| Token | Value | Usage |
|-------|-------|-------|
| `--radius-sm` | `8px` | Buttons, small cards |
| `--radius-md` | `12px` | Cards, panels |
| `--radius-lg` | `16px` | Major containers |
| `--radius-full` | `9999px` | Circular elements (capture button) |

### Shadows

| Token | Value | Usage |
|-------|-------|-------|
| `--shadow-card` | `0 2px 8px rgba(0, 0, 0, 0.08)` | Card elevation |
| `--shadow-button` | `0 2px 4px rgba(0, 0, 0, 0.12)` | Button depth |

### Touch Targets

All interactive elements: minimum **44 × 44px** tap area (WCAG 2.1 AA). Actual visual size may be smaller; padding extends the tap area.

---

## Screen-by-Screen Layouts

### Screen 1: QR Landing Page

```
┌──────────────────────────────┐
│  [Safi Logo/Brand Mark]      │
│                              │
│  ┌────────────────────────┐  │
│  │  [Bottle Reference     │  │
│  │   Image]               │  │
│  │   150 × 200px          │  │
│  └────────────────────────┘  │
│                              │
│  Filippo Berio Extra Virgin  │
│  Olive Oil · 500ml           │
│                              │
│  ┌────────────────────────┐  │
│  │                        │  │
│  │     Start Scan         │  │
│  │                        │  │
│  └────────────────────────┘  │
│  Full-width primary button   │
│  48px height, radius-sm      │
│                              │
│  ────────────────────────    │
│  For accurate tracking,      │
│  scan when bottle is new.    │
│  caption, text-secondary     │
└──────────────────────────────┘
```

**Layout:** Single column, vertically centered content. Max-width 430px, centered.
**Bottle image:** Loaded from `/bottles/{sku}.png`. Falls back to generic bottle icon if missing.
**Start Scan button:** Primary color, white text, full container width minus horizontal padding.

### Screen 2: Privacy Notice (First Scan Only)

```
┌──────────────────────────────┐
│                              │
│  (dimmed background)         │
│                              │
│  ┌────────────────────────┐  │
│  │  Scan images are stored│  │
│  │  to improve AI         │  │
│  │  accuracy.             │  │
│  │                        │  │
│  │  No personal           │  │
│  │  information is        │  │
│  │  collected.            │  │
│  │                        │  │
│  │  [I Understand]  btn   │  │
│  │  [Learn More]   link   │  │
│  └────────────────────────┘  │
│  Card: surface bg,           │
│  radius-lg, shadow-card,     │
│  centered vertically         │
└──────────────────────────────┘
```

**Behavior:** Modal overlay with dimmed backdrop. Only appears once per device (localStorage). "I Understand" is the primary action (full-width button). "Learn More" is a text link below that expands inline details.

### Screen 3: Camera Viewfinder

```
┌──────────────────────────────┐
│                              │
│  ┌────────────────────────┐  │
│  │                        │  │
│  │   Live camera feed     │  │
│  │   fills available      │  │
│  │   viewport height      │  │
│  │                        │  │
│  │   ┌──────────────┐    │  │
│  │   │              │    │  │
│  │   │  Bottle      │    │  │
│  │   │  framing     │    │  │
│  │   │  guide       │    │  │
│  │   │  (dashed     │    │  │
│  │   │   border,    │    │  │
│  │   │   50% white) │    │  │
│  │   │              │    │  │
│  │   └──────────────┘    │  │
│  │                        │  │
│  │  "Align bottle in frame" │
│  │  caption, white text     │
│  │                        │  │
│  │      ( O )             │  │
│  │   Capture button       │  │
│  │   64px circle, white   │  │
│  │   border, centered     │  │
│  └────────────────────────┘  │
└──────────────────────────────┘
```

**Camera feed:** Fills viewport width. Height adapts to aspect ratio (typically 4:3 on mobile).
**Framing guide:** Dashed rounded rectangle, `2px dashed rgba(255,255,255,0.5)`, centered. Approximately 60% viewport width, 70% viewport height. Bottle-shaped (tall rectangle with slight taper at neck).
**Capture button:** Centered bottom, 64px diameter circle, white border `3px solid white`, semi-transparent white fill `rgba(255,255,255,0.3)`. Inner circle `48px solid white` on tap.
**"Align bottle" text:** White, `font-size-caption`, centered above capture button. Text shadow for readability over camera feed.

### Screen 4: Photo Preview

```
┌──────────────────────────────┐
│                              │
│  ┌────────────────────────┐  │
│  │                        │  │
│  │   Captured image       │  │
│  │   (frozen frame)       │  │
│  │   Same dimensions as   │  │
│  │   viewfinder           │  │
│  │                        │  │
│  └────────────────────────┘  │
│                              │
│  ┌──────────┐ ┌──────────┐  │
│  │ Retake   │ │Use Photo │  │
│  │ (outline)│ │(primary) │  │
│  └──────────┘ └──────────┘  │
│  Two buttons, equal width    │
│  gap-md between them         │
└──────────────────────────────┘
```

**Retake button:** Outlined style (border: primary, text: primary, background: transparent).
**Use Photo button:** Filled primary style.
Both buttons: 48px height, `radius-sm`.

### Screen 5: Analyzing State

```
┌──────────────────────────────┐
│                              │
│                              │
│                              │
│      ┌──────────────┐       │
│      │              │       │
│      │  [Animated   │       │
│      │   bottle     │       │
│      │   filling    │       │
│      │   up/down]   │       │
│      │              │       │
│      └──────────────┘       │
│                              │
│    Analyzing your bottle...  │
│    body, text-primary        │
│                              │
│    This usually takes        │
│    3–8 seconds               │
│    caption, text-secondary   │
│                              │
│                              │
└──────────────────────────────┘
```

**Animation:** A simple bottle silhouette with a fill level that animates up and down (CSS animation, `ease-in-out`, 2s cycle). Uses `--color-primary` for the fill.
**Layout:** Centered vertically and horizontally.

### Screen 6: Result Display

```
┌──────────────────────────────┐
│                              │
│  ┌────────────────────────┐  │
│  │     ┌────────┐         │  │
│  │     │ BOTTLE │  68%    │  │
│  │     │ FILL   │  hero   │  │
│  │     │ GAUGE  │  font   │  │
│  │     │ (vis)  │         │  │
│  │     └────────┘         │  │
│  │  [Confidence badge]     │  │
│  │  "High confidence"      │  │
│  └────────────────────────┘  │
│  Fill gauge card             │
│                              │
│  ┌────────────────────────┐  │
│  │  Remaining    Consumed │  │
│  │  340 ml       160 ml   │  │
│  │  23.0 tbsp    10.8 tbsp│  │
│  │  1.4 cups     0.7 cups │  │
│  └────────────────────────┘  │
│  Volume card                 │
│                              │
│  ┌────────────────────────┐  │
│  │  Nutrition (consumed)  │  │
│  │  ─────────────────     │  │
│  │  Calories    1,325 cal │  │
│  │  Total Fat   149.8 g   │  │
│  │  Sat. Fat    20.7 g    │  │
│  └────────────────────────┘  │
│  Nutrition card              │
│                              │
│  Results are estimates       │
│  (±15%). Not certified       │
│  nutritional analysis.       │
│  caption, text-secondary     │
│                              │
│  ── Was this accurate? ──    │
│                              │
│  [About right] [Too high]    │
│  [Too low]     [Way off]     │
│  4 buttons, 2×2 grid         │
│                              │
└──────────────────────────────┘
```

**Fill Gauge Card:** White card, `radius-md`, `shadow-card`. Contains a bottle-shaped SVG gauge on the left (120px tall) filled to the estimated percentage with color based on level. The hero percentage number (`font-size-hero`, `font-weight-bold`) sits to the right. Confidence badge below as a small pill (colored dot + text).

**Volume Card:** Two-column layout. "Remaining" header left, "Consumed" header right. Three rows below each (ml, tbsp, cups). Values in `font-weight-semibold`, units in `text-secondary`.

**Nutrition Card:** Single card with "Nutrition (consumed)" header. Three rows: Calories, Total Fat, Saturated Fat. Label left-aligned, value right-aligned.

**Disclaimer:** Below cards, `font-size-caption`, `text-secondary`.

**Feedback section:** Below disclaimer. "Was this accurate?" as a section header. Four buttons in a 2x2 grid, `gap-sm` between. Each button is outlined style, `radius-sm`, 44px min-height.

### Screen 7: Feedback Slider (Conditional)

```
┌──────────────────────────────┐
│  (Result display above,      │
│   scrolled up)               │
│                              │
│  You said "Too low"          │
│                              │
│  What would you estimate?    │
│                              │
│  [────────●──────────] 75%   │
│  Slider: 1–99%               │
│  Thumb: 28px circle          │
│  Track: 4px height           │
│                              │
│  ┌────────────────────────┐  │
│  │   Submit Feedback      │  │
│  └────────────────────────┘  │
│  Full-width primary button   │
│                              │
└──────────────────────────────┘
```

**Appears when:** User taps "Too high", "Too low", or "Way off".
**Slider:** Range input styled with large thumb (28px) for mobile usability. Track uses `--color-primary`. Current value displayed to the right of the slider.
**Submit button:** Full-width primary.

### Screen 8: Feedback Confirmation

```
┌──────────────────────────────┐
│                              │
│        ✓                     │
│  Thank you for your          │
│  feedback!                   │
│                              │
│  Your input helps improve    │
│  future estimates.           │
│  caption, text-secondary     │
│                              │
│  [Scan Again]                │
│  Outlined button, optional   │
│                              │
└──────────────────────────────┘
```

**Replaces** the feedback section (not the entire result screen). User can still scroll up to see their results.

### Screen 9: Error States

**9a — Network Offline:**
```
┌──────────────────────────────┐
│  [WiFi-off icon]             │
│                              │
│  Network connection          │
│  required for scanning       │
│                              │
│  Connect to WiFi or          │
│  cellular data to scan       │
│  your bottle.                │
│                              │
│  [Start Scan] (disabled)     │
└──────────────────────────────┘
```

**9b — Camera Denied:**
```
┌──────────────────────────────┐
│  [Camera-off icon]           │
│                              │
│  Camera access required      │
│                              │
│  iOS: Go to Settings →       │
│  Safari → Camera → Allow     │
│                              │
│  [Try Again]                 │
└──────────────────────────────┘
```

**9c — AI Analysis Failed:**
```
┌──────────────────────────────┐
│  [Alert icon]                │
│                              │
│  Unable to analyze image     │
│                              │
│  [Retry]      [Retake Photo] │
└──────────────────────────────┘
```

**9d — Unknown Bottle:**
```
┌──────────────────────────────┐
│  [Info icon]                 │
│                              │
│  This bottle is not yet      │
│  supported                   │
│                              │
│  SKU: unknown-brand-1L       │
│                              │
│  We may support this bottle  │
│  in the future.              │
└──────────────────────────────┘
```

**9e — iOS Browser Compatibility:**
```
┌──────────────────────────────┐
│  [Safari icon]               │
│                              │
│  For best experience,        │
│  open in Safari              │
│                              │
│  Tap the share icon (□↑)     │
│  and select "Open in Safari" │
└──────────────────────────────┘
```

---

## Component Interaction Patterns

### State Machine Flow

```
QR_LANDING → [Start Scan]
  ├── (first visit) → PRIVACY_NOTICE → [I Understand] → CAMERA_ACTIVE
  └── (repeat visit) → CAMERA_ACTIVE

CAMERA_ACTIVE → [Capture] → PHOTO_PREVIEW
  ├── [Retake] → CAMERA_ACTIVE
  └── [Use Photo] → ANALYZING

ANALYZING
  ├── (success) → RESULT_DISPLAY
  ├── (low confidence) → RESULT_DISPLAY + LOW_CONFIDENCE_BANNER
  ├── (quality issues) → QUALITY_WARNING
  └── (error) → ERROR_STATE

RESULT_DISPLAY → [feedback button]
  ├── [About right] → FEEDBACK_SUBMITTING → FEEDBACK_CONFIRMED
  └── [Too high/low/Way off] → SLIDER_VISIBLE → [Submit] → FEEDBACK_SUBMITTING → FEEDBACK_CONFIRMED

ERROR_STATE
  ├── [Retry] → ANALYZING (same photo)
  └── [Retake Photo] → CAMERA_ACTIVE

QUALITY_WARNING
  └── [Retake Photo] → CAMERA_ACTIVE
```

### Navigation

Single-page flow with no back navigation. The app is a linear funnel:

1. Landing → 2. Camera → 3. Preview → 4. Analyzing → 5. Result → 6. Feedback

The user does not navigate "back" through screens. "Retake" returns to camera but conceptually is a "try again" action, not browser back navigation. Browser back from any state returns to the QR landing.

### Transitions

| Transition | Animation | Duration |
|------------|-----------|----------|
| Landing → Camera | Slide up | 300ms ease-out |
| Camera → Preview | Instant (freeze frame) | 0ms |
| Preview → Analyzing | Cross-fade | 200ms ease-in |
| Analyzing → Result | Fade in with slide up | 400ms ease-out |
| Result → Feedback slider | Expand height | 200ms ease-out |
| Feedback → Confirmation | Cross-fade | 200ms |
| Any → Error | Fade in | 200ms |

All transitions use `prefers-reduced-motion: reduce` media query to disable animations when the user has system-level motion reduction enabled.

---

## Responsive Behavior

### Viewport Strategy

- **Primary target:** Mobile portrait, 375–430px width
- **Min supported width:** 320px (iPhone SE)
- **Max content width:** 430px centered on larger screens
- **Orientation:** Portrait only. No landscape-specific layouts.

### Breakpoints

| Range | Behavior |
|-------|----------|
| 320–374px | Compact layout. Fill gauge shrinks. Hero font reduces to 36px. |
| 375–430px | Primary layout. All specs as documented above. |
| 431–768px | Content centered at max-width 430px. Background visible on sides. |
| 769px+ | Desktop dev/QA mode. Same centered layout. No desktop-specific adjustments. |

### Camera Viewfinder Sizing

The viewfinder fills available viewport height between the top (browser chrome / status bar) and the capture button row at the bottom. On iOS Safari, this accounts for the URL bar and toolbar (~88px combined). The framing guide scales proportionally within the viewfinder.

---

## Fill Gauge Design

### Shape

An SVG bottle silhouette: rounded rectangle body with a narrow neck. Proportions approximately:

- Body: 80px wide × 120px tall, `radius-md` corners
- Neck: 30px wide × 20px tall, centered above body
- Cap: 36px wide × 8px tall, centered above neck

### Fill Behavior

- The fill is a colored rectangle (`clip-path` to bottle shape) that rises from the bottom
- Fill percentage maps linearly to fill height within the body
- Fill color transitions: `--color-fill-high` above 50%, `--color-fill-medium` 25–50%, `--color-fill-low` below 25%
- A subtle horizontal line at the fill level represents the meniscus
- The hero percentage text sits to the right of the bottle, vertically centered

### Animation

On result display, the fill animates from 0% to the target percentage over 600ms with `ease-out` timing. Respects `prefers-reduced-motion`.

---

## Camera Framing Guide Design

### Shape

A rounded rectangle outline centered in the viewfinder, sized to frame a typical oil bottle:

- Width: ~55% of viewfinder width
- Height: ~65% of viewfinder height
- Border: `2px dashed rgba(255, 255, 255, 0.5)`
- Corner radius: `16px`
- Slight taper at top (neck area) achieved with an SVG path or CSS clip

### Helper Text

"Align bottle in frame" — centered below the guide outline, white text with subtle text shadow (`0 1px 3px rgba(0,0,0,0.6)`) for readability over varied backgrounds.

### Behavior

- Guide is purely visual — no detection logic
- Does not move or track the bottle
- Disappears instantly on capture (replaced by frozen preview)

---

## Accessibility Specifications

### Color Contrast

All text/background combinations verified at WCAG 2.1 AA (4.5:1 for normal text, 3:1 for large text):

| Combination | Ratio | Pass |
|-------------|-------|------|
| `text-primary` on `surface` | 13.5:1 | AA |
| `text-secondary` on `surface` | 4.6:1 | AA |
| `text-on-primary` on `primary` | 8.5:1 | AA |
| `danger` on `surface` | 4.5:1 | AA |
| `warning` on `surface` | 3.2:1 | AA Large only |

**Note:** Warning text (`--color-warning`) should always be accompanied by icon or label text in `text-primary` for AA compliance on normal-size text.

### Screen Reader Support

- All images have descriptive `alt` text
- Fill gauge percentage is rendered as text (not image-only)
- Volume and nutrition values are real text elements, not canvas/SVG-only
- Loading state announces "Analyzing your bottle" via `aria-live="polite"`
- Result arrival announces "Analysis complete" via `aria-live="assertive"`
- Error states use `role="alert"`
- Feedback buttons have descriptive labels: `aria-label="Rate estimate as about right"`

### Keyboard Navigation

- Tab order follows visual flow: Landing → Start Scan → (Camera controls) → Retake/Use Photo → Feedback buttons
- All buttons are keyboard-focusable
- Enter/Space activates buttons
- Slider is operable via arrow keys

### Motion

All animations respect `prefers-reduced-motion: reduce`. When enabled:
- Fill gauge shows immediately at target without animation
- Screen transitions are instant (no slides or fades)
- Loading animation is replaced by a static spinner

---

## Performance UX

### Perceived Speed

1. **Optimistic UI during upload:** Show "Analyzing..." immediately on "Use Photo" tap — don't wait for upload confirmation.
2. **Fill gauge animation:** The 600ms fill animation on result display makes the result feel deliberate and measured, even though the actual data is already available.
3. **Time estimate:** Display "This usually takes 3–8 seconds" under the analyzing spinner to set expectations.

### Loading Budget

| Phase | Time Budget | User Sees |
|-------|-------------|-----------|
| Image compression | < 500ms | Analyzing state begins |
| Upload to Worker | 1–2s | Analyzing animation |
| LLM inference | 3–5s | Analyzing animation + time estimate |
| Response parse + render | < 500ms | Result with fill animation |
| **Total** | **5–8s** | Smooth transition to result |

If total exceeds 8 seconds, the analyzing state remains until response or 10-second timeout. No intermediate "still working" message — the animation and time estimate suffice.

---

_UX Design Specification produced: 2026-02-27_
_Based on: PRD, Architecture, Product Brief_
_Author: Ahmed_
_Status: POC v1 UX complete — ready for implementation_
