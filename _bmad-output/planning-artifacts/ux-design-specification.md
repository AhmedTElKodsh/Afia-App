---
stepsCompleted: [1, 2, 3, 4, 5, 6, 7]
inputDocuments:
  - prd.md
  - architecture.md
  - architecture-fill-confirm-screen.md
  - product-brief-Safi-Image-Analysis-2026-02-26.md
---

# UX Design Specification — Safi Oil Tracker

**Author:** Ahmed + Sally (UX Designer Agent)
**Date:** 2026-04-13
**Status:** Updated — Includes Auto-Capture and Fill Confirmation Flow

---

## Executive Summary

### Project Vision

Safi Oil Tracker delivers a single, frictionless interaction: QR scan on a physical oil bottle → phone camera → AI-estimated oil level → volume and nutritional insight in under 10 seconds. The UX is optimized for one user in one context: standing in a kitchen right after cooking, wanting a fast answer without setup friction.

### Target Users

**Primary:** Health-conscious home cooks tracking calorie/fat intake. Aged 25–50, comfortable with smartphones, not tech enthusiasts. Access is incidental (QR on a product they already bought). Motivation is dietary awareness, not app engagement.

**Secondary:** The oil company — UX must reflect product quality and brand trust.

### Key Design Challenges

1. **Speed vs. capture quality:** Deliver value in ≤10 seconds while guiding users to take a photo good enough for AI analysis — without friction that causes abandonment.
2. **Trust calibration:** Communicate ±15% accuracy clearly enough to be honest, but not so prominently that it undermines perceived usefulness or suppresses feedback.
3. **Feedback volume:** Achieve ≥30% feedback submission rate with a UI completable in 1–2 taps for the satisfied-user case.
4. **iOS browser chrome:** `display: "browser"` means the Safari UI chrome is always visible. Camera viewfinder and result display must work within browser viewport, not full screen.
5. **Precision vs. Automation**: The AI provides the estimate, but the user provides the truth. The UX must facilitate a fast, visual verification step (Screen 4b) without making the user feel like they are doing the AI's work.
6. **Visual Semantics**: Using high-contrast Red for measurement markers while avoiding "Error" connotations through supportive microcopy and brand-consistent action buttons.

### Design Opportunities

1. **Result as hero moment:** Bold, immediate fill gauge + volume numbers + nutrition panel can feel genuinely novel — this result display is the entire product.
2. **Camera overlay as precision signal:** A color-coded bottle-shaped framing guide that responds to bottle alignment makes capture feel like intentional measurement, not just a photo upload.
3. **Collaborative Measurement**: The confirmation screen turns a technical estimation into a moment of shared precision between the AI and the human.

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
| `--color-success` | `#2D6A4F` | High confidence, positive states, confirmation buttons |
| `--color-warning` | `#E9A820` | Medium confidence, caution states |
| `--color-danger` | `#D64045` | Low confidence, errors |
| `--color-fill-high` | `#40916C` | Fill gauge > 50% |
| `--color-fill-medium` | `#E9A820` | Fill gauge 25–50% |
| `--color-fill-low` | `#D64045` | Fill gauge < 25% |
| `--color-overlay` | `rgba(0, 0, 0, 0.5)` | Camera overlay background |
| `--color-accent-precision` | `#EF4444` | Functional measurement markers (Red dashed line on Fill Confirmation screen) |

**Rationale:** Olive green primary reflects the oil product category. Warm, food-adjacent palette builds trust for a kitchen-context app. High-contrast Red (`--color-accent-precision`) is strictly reserved for precision measurement markers to ensure visibility across varied lighting.

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

All interactive elements: minimum **44 × 44px** tap area (WCAG 2.1 AA).

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

**Behavior:** Modal overlay with dimmed backdrop. Only appears once per device (localStorage). "I Understand" is the primary action (full-width button). "Learn More" is a text link below that expands inline details.

### Screen 3: Camera Viewfinder (Updated)

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
│  │   │  (color-     │    │  │
│  │   │   coded,     │    │  │
│  │   │   dashed)    │    │  │
│  │   │              │    │  │
│  │   └──────────────┘    │  │
│  │                        │  │
│  │  "Align bottle in frame" │
│  │  caption, white text     │
│  │                        │  │
│  │  [●●●●●○○○] progress   │  │
│  │  ring when aligned      │  │
│  │                        │  │
│  │      ( O )             │  │
│  │   Capture button       │  │
│  │   64px circle, white   │  │
│  │   border, centered     │  │
│  │                        │  │
│  │  [Capture manually]    │  │
│  │  text button fallback  │  │
│  └────────────────────────┘  │
└──────────────────────────────┘
```

**Behavior:** Now includes **Auto-Capture**. 
**Framing guide:** Stroke color changes based on alignment state:
- **Red** (`--color-danger`): No bottle detected
- **Amber** (`--color-warning`): Bottle detected but too far, too close, or misaligned
- **Green** (`--color-success`): Well-aligned — ready for capture

**Auto-capture behavior:**
- When the overlay turns green and the bottle remains stable, a circular progress ring animates around the capture button (fills over 1000ms).
- Auto-capture fires when the progress ring reaches 100%. 
- Manual capture fallback triggers immediate capture at any time.

### Screen 4: Photo Preview

**Retake button:** Outlined style (border: primary, text: primary, background: transparent).
**Use Photo button:** Filled primary style.

### Screen 5: Analyzing State

**Animation:** A simple bottle silhouette with a fill level that animates up and down (CSS animation, `ease-in-out`, 2s cycle).
**Layout:** Centered vertically and horizontally. "Analyzing your bottle... This usually takes 3–8 seconds."

### Screen 4b: Fill Confirmation Screen (NEW)

```
┌──────────────────────────────┐
│  Confirm Level               │
│  (screen title, h1)          │
│                              │
│  ┌────────────────────────┐  │
│  │   Captured image       │  │
│  │   (object-fit: contain)│  │
│  │                        │  │
│  │   - - - - - - - - - -  │  │
│  │   [RED DASHED LINE]    │  │
│  │   (#EF4444, 2px dash)  │  │
│  │   - - - - - - - - - -  │  │
│  │                        │  │
│  └────────────────────────┘  │
│  Image panel                 │
│  (right side in RTL)         │
│                              │
│  [SLIDER]                    │
│  Vertical Radix Slider       │
│  (left side in RTL)          │
│  55ml step increments        │
│                              │
│  Adjust the line to match    │
│  your oil level.             │
│  caption, text-secondary     │
│                              │
│  ┌──────────┐ ┌──────────┐  │
│  │ Retake   │ │ Confirm  │  │
│  │ (outline)│ │(success) │  │
│  └──────────┘ └──────────┘  │
└──────────────────────────────┘
```

**Visual Marker:** A dashed horizontal line rendered as an absolutely-positioned SVG overlay. Stroke: `--color-accent-precision` (`#EF4444`).
**Interaction:** Dragging the vertical slider repositions the red line in real-time.
**Constraints:** Slider locked to 55ml increments. Minimum value 55ml.

### Screen 6: Result Display (Updated)

**Visual Alignment:** The Fill Gauge (Screen 6) must align visually with the confirmed level from Screen 4b.
**Accuracy Note:** "Results are estimates (±15%). Not certified nutritional analysis."

### Screen 7: Feedback Slider (Conditional)

**Appears when:** User taps "Too high", "Too low", or "Way off" on the result screen. (Note: Separate from Fill Confirmation).

### Screen 8: Feedback Confirmation

**Replaces** the feedback section. User can still scroll up to see their results.

### Screen 9: Error States

Includes Network Offline, Camera Denied, AI Analysis Failed, and Unknown Bottle states.

---

## Component Interaction Patterns

### State Machine Flow (6-Step)

```
1. QR_LANDING → [Start Scan]
2. CAMERA_ACTIVE → (Auto-Capture) → 3. PHOTO_PREVIEW
3. PHOTO_PREVIEW → [Use Photo] → 4. ANALYZING
4. ANALYZING → (API Result) → 4b. FILL_CONFIRM
4b. FILL_CONFIRM → [Confirm] → 5. RESULT_DISPLAY
5. RESULT_DISPLAY → 6. FEEDBACK_LOOP
```

---

## Performance UX

### Perceived Speed (Updated)

1. **Progressive Disclosure:** By showing the confirmation screen immediately after AI analysis, the user feels the app is "fast" because they are interacting with their own data.
2. **Animation Budget:** 600ms fill gauge animation on Screen 5 provides a "reward" moment.

---

_UX Design Specification produced: 2026-04-13_
_Author: Ahmed + Sally (UX Designer Agent)_
_Status: POC v1.1 — Integrated Fill Confirmation & Auto-Capture_
