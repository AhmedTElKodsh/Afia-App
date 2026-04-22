# Bottle Guide Visual Summary

**Precision-Calibrated Outline for Afia 1.5L Bottle**

---

## 🎨 Color State System

### Visual Progression

```
┌─────────────────────────────────────────────────────────────┐
│                    USER EXPERIENCE FLOW                      │
└─────────────────────────────────────────────────────────────┘

STATE 1: 🔴 RED - No Bottle Detected
┌──────────────────────────────────┐
│  Camera View                     │
│                                  │
│         ┌────────┐               │
│         │        │  ← RED outline│
│         │ BOTTLE │     (3.0px)   │
│         │ SHAPE  │               │
│         │        │               │
│         └────────┘               │
│                                  │
│  Hint: "Align bottle with        │
│         outline"                 │
└──────────────────────────────────┘
         ↓ User moves bottle into frame


STATE 2: 🟡 YELLOW - Adjust Distance
┌──────────────────────────────────┐
│  Camera View                     │
│                                  │
│         ┌────────┐               │
│         │        │  ← YELLOW     │
│         │ BOTTLE │     outline   │
│         │ SHAPE  │     (3.5px)   │
│         │        │               │
│         └────────┘               │
│                                  │
│  Hint: "Move closer" or          │
│        "Move back"               │
└──────────────────────────────────┘
         ↓ User adjusts distance


STATE 3: 🟢 GREEN - Perfect Alignment
┌──────────────────────────────────┐
│  Camera View                     │
│                                  │
│    ╔════════════╗                │
│    ║            ║  ← GREEN       │
│    ║   BOTTLE   ║     outline    │
│    ║   SHAPE    ║     (4.0px)    │
│    ║            ║     + GLOW     │
│    ╚════════════╝                │
│         ⏱ 1                      │
│                                  │
│  Hint: "✓ Ready"                 │
│  Progress: ████████░░ 80%        │
└──────────────────────────────────┘
         ↓ 1 second countdown


STATE 4: 📸 AUTO-CAPTURE
┌──────────────────────────────────┐
│  ⚡ FLASH ⚡                      │
│                                  │
│         [CAPTURED]               │
│                                  │
│  → Processing...                 │
└──────────────────────────────────┘
```

---

## 📐 SVG Outline Geometry

### Bottle Components (Scale: 1mm = 1 SVG unit)

```
     0   10  20  30  40  50  60  70  80  90  100
     ├───┼───┼───┼───┼───┼───┼───┼───┼───┼───┤
  0  │                                        │
     │           ┌─────────┐                  │  ← Cap (38mm finish)
 10  │           │  CAP    │                  │
     │           └─────────┘                  │
     │              │   │                     │  ← Neck (Ø 37.3mm)
 30  │              │   │                     │
     │             ╱     ╲                    │  ← Shoulder
 50  │            ╱       ╲                   │
     │           │         │                  │
     │           │         │                  │  ← Main Body
100  │           │         │◐                 │     (78.1mm width)
     │           │         │                  │     Handle on right
150  │           │         │                  │
     │           │         │                  │
200  │           │         │                  │
     │           │         │                  │
250  │           │         │                  │
     │           │         │                  │
285  │           └─────────┘                  │  ← Base
301  └──────────────────────────────────────┘

Key Measurements:
- Total Height: 301mm
- Neck Ø: 37.3mm (±0.5mm)
- Body Width: 78.1mm
- Body Depth: 52.5mm
- Handle: Right side, 100-160mm
```

---

## 🎯 Visual Anchors & Fill Levels

### Calibration Points on Bottle

```
     Fill %  |  Remaining ml  |  Visual Anchor
     ────────┼────────────────┼─────────────────────────
       0%    |      0ml       |  Base (empty)
      19%    |    330ml       |  ● Green band (bottom)
      38%    |    660ml       |  ♥ Heart logo (center)
      50%    |    880ml       |  ─ Mid-label line
      63%    |   1100ml       |  ● Green band (top)
      72%    |   1265ml       |  ◐ Handle bottom
      78%    |   1320ml       |  ╱ Shoulder junction
      97%    |   1500ml       |  │ Neck (full)

SVG Markers:
┌────────────────────────────────┐
│  Cap & Neck (0-36mm)           │
│  ┌─────────┐                   │
│  │  38mm   │                   │
│  └─────────┘                   │
│      │ │  ← Ø 37.3mm           │
├────────────────────────────────┤
│  Shoulder (36-52mm)            │
│     ╱   ╲                      │
├────────────────────────────────┤
│  Main Body (52-285mm)          │
│  │       │                     │
│  │ ┄┄┄┄┄ │ ← 50% line (150mm) │
│  │ ████  │ ← Green band       │
│  │  ♥    │ ← Heart logo       │
│  │       │◐ ← Handle           │
├────────────────────────────────┤
│  Base (285-301mm)              │
│  └───────┘                     │
└────────────────────────────────┘
```

---

## 🎬 Animation Timeline

### Color Transition Sequence

```
Time: 0s ──────────────────────────────────────────────> 2s

RED State (Not Detected)
│
│  Pulse: ████░░░░ ████░░░░ ████░░░░
│  Opacity: 1.0 → 0.6 → 1.0 (2s cycle)
│  Stroke: 3.0px
│  Color: #ef4444
│
└─→ Bottle detected
    │
    ▼

YELLOW State (Adjust Distance)
│
│  Pulse: ████░░░░ ████░░░░ ████░░░░
│  Opacity: 1.0 → 0.6 → 1.0 (2s cycle)
│  Stroke: 3.5px
│  Color: #f59e0b
│  Transition: 0.4s ease-in-out
│
└─→ Perfect alignment
    │
    ▼

GREEN State (Ready)
│
│  Pulse: ████████ ████████ (faster)
│  Opacity: 1.0 (full)
│  Stroke: 4.0px (thicker)
│  Color: #10b981
│  Glow: drop-shadow(0 0 12px rgba(16,185,129,0.7))
│  Transition: 0.4s ease-in-out
│
│  Progress Ring:
│  0% ░░░░░░░░░░ → 100% ██████████ (1s)
│  Countdown: 1 → 0
│
└─→ AUTO-CAPTURE 📸
```

---

## 🔄 State Machine Diagram

```
                    ┌─────────────────┐
                    │   CAMERA OPEN   │
                    └────────┬────────┘
                             │
                             ▼
                    ┌─────────────────┐
                    │   🔴 RED STATE  │
                    │  Not Detected   │
                    │  Stroke: 3.0px  │
                    └────────┬────────┘
                             │
                    Bottle enters frame
                             │
                             ▼
                    ┌─────────────────┐
                    │ 🟡 YELLOW STATE │
                    │  Too Far/Close  │
                    │  Stroke: 3.5px  │
                    └────────┬────────┘
                             │
                    Distance optimal
                             │
                             ▼
                    ┌─────────────────┐
                    │  🟢 GREEN STATE │
                    │  Perfect Align  │
                    │  Stroke: 4.0px  │
                    │  + Glow Effect  │
                    └────────┬────────┘
                             │
                    Hold for 1 second
                             │
                    ┌────────┴────────┐
                    │  Progress Ring  │
                    │  ████████░░ 80% │
                    │  Countdown: 1   │
                    └────────┬────────┘
                             │
                             ▼
                    ┌─────────────────┐
                    │  📸 CAPTURE!    │
                    │  Flash Effect   │
                    └─────────────────┘
```

---

## 🎨 CSS Animation Details

### Pulse Animation (Not Ready)
```css
@keyframes bottleGuidePulse {
  0%, 100% { opacity: 1; }
  50%      { opacity: 0.60; }
}
/* Duration: 2s, infinite loop */
```

### Ready Pulse Animation (GREEN)
```css
@keyframes bottleGuideReadyPulse {
  0%, 100% { 
    filter: drop-shadow(0 0 12px rgba(16,185,129,0.7))
            drop-shadow(0 0 20px rgba(16,185,129,0.4));
  }
  50% { 
    filter: drop-shadow(0 0 16px rgba(16,185,129,0.9))
            drop-shadow(0 0 28px rgba(16,185,129,0.6));
  }
}
/* Duration: 1.5s, infinite loop */
```

### Color Transition
```css
.bottle-guide-svg path,
.bottle-guide-svg rect,
.bottle-guide-svg line,
.bottle-guide-svg circle {
  transition: stroke 0.4s ease-in-out,
              stroke-width 0.3s ease-in-out,
              opacity 0.3s ease-in-out;
}
```

---

## 📱 Responsive Behavior

### Mobile Viewport (Portrait)
```
┌─────────────────────┐
│  ┌───────────────┐  │
│  │   Header      │  │
│  └───────────────┘  │
│                     │
│      ┌────────┐     │  ← Outline: 52% width
│      │        │     │     max-width: 190px
│      │ BOTTLE │     │
│      │ GUIDE  │     │
│      │        │     │
│      └────────┘     │
│                     │
│  ┌───────────────┐  │
│  │   Hint Text   │  │
│  └───────────────┘  │
│                     │
│  ┌───────────────┐  │
│  │ Capture Btn   │  │
│  └───────────────┘  │
└─────────────────────┘
```

### Tablet/Desktop (Landscape)
```
┌──────────────────────────────────────┐
│  ┌────────────────────────────────┐  │
│  │         Header                 │  │
│  └────────────────────────────────┘  │
│                                      │
│           ┌────────┐                 │
│           │        │  ← Scales to    │
│           │ BOTTLE │     viewport    │
│           │ GUIDE  │     height      │
│           │        │                 │
│           └────────┘                 │
│                                      │
│  ┌────────────────────────────────┐  │
│  │         Hint Text              │  │
│  └────────────────────────────────┘  │
└──────────────────────────────────────┘
```

---

## 🎯 Brand Marker Detection

### Mock Camera Drawing
```
Canvas: 640 × 480px

Background (Good Lighting)
┌────────────────────────────────────┐
│  #e5e5e5 (neutral gray)            │
│                                    │
│     ┌──────────────┐               │
│     │              │               │
│     │   Bottle     │               │
│     │   Body       │               │
│     │   #f4e4c1    │               │
│     │              │               │
│     │ ████████████ │ ← Green band  │
│     │   #10b981    │   (19% fill)  │
│     │              │               │
│     │      ♥       │ ← Heart logo  │
│     │   #ef4444    │   (38% fill)  │
│     │              │               │
│     │   [Label]    │               │
│     │   #ffffff    │               │
│     │              │               │
│     └──────────────┘               │
│                                    │
└────────────────────────────────────┘

Detection Logic:
1. Green band detected → isBrandMatch = true
2. Heart logo detected → confidence++
3. Stable for 3 frames → brandDetected = true
4. Triggers GREEN state
```

---

## ✨ Key Visual Features

### 1. Directional Hints
```
┌─────────────────────────────┐
│  Hint Position: Above guide │
│  ┌─────────────────────┐    │
│  │  "Move closer"      │    │  ← YELLOW bg
│  └─────────────────────┘    │
│         ┌────────┐          │
│         │ BOTTLE │          │
│         └────────┘          │
└─────────────────────────────┘

Color-Coded Backgrounds:
- RED hint: rgba(239, 68, 68, 0.15)
- YELLOW hint: rgba(245, 158, 11, 0.15)
- GREEN hint: rgba(16, 185, 129, 0.2)
```

### 2. Progress Ring
```
┌─────────────────────────────┐
│         ┌────────┐          │
│      ╱──│────────│──╲       │
│    ╱    │ BOTTLE │    ╲     │
│   │     │ GUIDE  │     │    │
│   │     │        │     │    │
│    ╲    │   ⏱ 1  │    ╱     │  ← Countdown
│      ╲──│────────│──╱       │
│         └────────┘          │
│                             │
│  Ring: 85px radius          │
│  Stroke: 5px                │
│  Color: #10b981 (green)     │
│  Progress: 0-100% (1s)      │
└─────────────────────────────┘
```

### 3. Glow Effect (GREEN State)
```
Filter Stack:
┌─────────────────────────────────┐
│  drop-shadow(                   │
│    0 0 12px rgba(16,185,129,0.7)│  ← Inner glow
│  )                              │
│  drop-shadow(                   │
│    0 0 20px rgba(16,185,129,0.4)│  ← Outer glow
│  )                              │
└─────────────────────────────────┘

Pulse Effect:
Inner: 12px → 16px → 12px
Outer: 20px → 28px → 20px
Duration: 1.5s infinite
```

---

## 🔧 Technical Specifications

### SVG Optimization
- **ViewBox:** `0 0 100 301` (matches real dimensions)
- **Preserve Aspect Ratio:** `xMidYMid meet`
- **Stroke Optimization:** Hardware-accelerated
- **Filter Performance:** GPU-composited drop-shadow

### Animation Performance
- **Frame Rate:** 60fps target
- **Transition Timing:** 0.4s ease-in-out
- **Pulse Cycle:** 2s (not ready), 1.5s (ready)
- **Progress Update:** 60fps (requestAnimationFrame)

### Accessibility
- **Color Contrast:** WCAG AAA compliant
- **ARIA Labels:** Screen reader support
- **Reduced Motion:** Respects prefers-reduced-motion
- **High Contrast:** Enhanced borders in high-contrast mode

---

## 📊 Quality Metrics

### Detection Accuracy
- **Brand Marker Detection:** 3-frame stability threshold
- **Distance Calculation:** Real-time composition analysis
- **Lighting Assessment:** Brightness histogram analysis
- **Blur Detection:** Laplacian variance (every 2 frames)

### User Feedback
- **Visual:** Color + stroke + glow + pulse
- **Textual:** Directional hints
- **Numeric:** Countdown timer
- **Haptic:** Vibration on state change
- **Temporal:** Progress ring animation

---

## 🎉 Summary

The precision-calibrated bottle guide provides:

✅ **Exact Geometry** - Matches engineering drawing (301mm height)
✅ **Clear Guidance** - Color-coded states (RED → YELLOW → GREEN)
✅ **Smooth Transitions** - 0.4s ease-in-out animations
✅ **Auto-Capture** - 1-second countdown with progress ring
✅ **Brand Detection** - Green band + heart logo verification
✅ **Responsive Design** - Scales to all screen sizes
✅ **Accessible** - Multiple feedback channels
✅ **Performant** - 60fps animations, GPU-accelerated

**Status:** Production-ready for Afia 1.5L bottle scanning! 🚀

