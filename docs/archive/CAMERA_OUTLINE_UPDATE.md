# Camera Outline Update - Match Reference Images

## Changes Made

### 1. Updated SVG Stroke Opacity
**File:** `src/components/CameraViewfinder.tsx`

Changed stroke opacity from `0.75` to `0.85` for better visibility to match the reference images:
```tsx
stroke="rgba(255,255,255,0.85)"  // Previously 0.75
```

### 2. Simplified CSS - Removed All Animations
**File:** `src/components/CameraViewfinder.css`

**Removed:**
- ❌ `bottleGuidePulse` animation (pulsing when not ready)
- ❌ `bottleGuideReadyPulse` animation (glowing when ready)
- ❌ Color transitions on stroke, stroke-width, and opacity
- ❌ Filter transitions
- ❌ Green glow effects for "ready" state

**Updated:**
- ✅ Static drop-shadow: `drop-shadow(0 2px 4px rgba(0, 0, 0, 0.3))`
- ✅ No animations or transitions
- ✅ Legacy classes kept for compatibility but disabled

### 3. Static Display Only

The bottle outline now displays as a **pure static visual reference** matching the reference images:
- Clean white outline (`rgba(255,255,255,0.85)`)
- Simple drop shadow for depth
- No color changes, animations, or effects
- Consistent appearance at all times

## Reference Images

The implementation now matches:
- `oil-bottle-frames/bottle-camera-outline.png` - White outline on dark background
- `oil-bottle-frames/bottle-camera-outline2.png` - Same outline, reference version

## SVG Structure

The bottle outline consists of 6 path elements:
1. **Cap** - Top screw cap
2. **Neck** - Narrow neck section
3. **Shoulder** - Transition from neck to body
4. **Body** - Main bottle body with slight curves
5. **Base** - Bottom section
6. **Handle** - Side handle

All paths use:
- `vectorEffect="non-scaling-stroke"` - Maintains consistent stroke width
- `strokeLinejoin="round"` - Smooth corners
- `strokeLinecap="round"` - Rounded line ends
- `strokeWidth="2.5"` - Consistent line thickness

## Visual Appearance

The static outline provides:
- Clear visual guidance for bottle positioning
- Consistent white outline that stands out against camera feed
- Simple, clean design matching the reference images
- No distracting animations or color changes
