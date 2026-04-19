---
title: 'Refined Afia Scan Experience: Multi-SKU QR, Auto-Capture, and Brand Verification'
slug: 'refined-afia-scan-experience'
created: '2026-04-14'
status: 'ready-for-dev'
stepsCompleted: [1, 2, 3, 4]
tech_stack: ['React 18', 'TypeScript', 'Vite', 'Vitest', 'Cloudflare Workers']
files_to_modify: [
  'shared/bottleRegistry.ts',
  'src/utils/cameraQualityAssessment.ts',
  'src/hooks/useCameraGuidance.ts',
  'src/components/CameraViewfinder.tsx',
  'src/components/QrMockGenerator.tsx',
  'src/i18n/locales/en/translation.json',
  'src/i18n/locales/ar/translation.json'
]
code_patterns: [
  'HSV color segmentation for object detection',
  'SVG-based viewfinder overlays with dynamic stroke colors',
  'requestVideoFrameCallback for low-latency analysis loops',
  'React refs for performance-critical state (timers, frame counters)',
  'i18next for bilingual (EN/AR) guidance messages'
]
test_patterns: [
  'Vitest unit tests in src/test/',
  'Mocking HTMLVideoElement and CanvasRenderingContext2D'
]
---

# Overview

## Problem Statement
The current scan experience is locked to a single 1.5L SKU and lacks automated brand verification. Users need to distinguish between different bottle sizes (1.5L vs 2.5L) at the point of entry (QR scan) and require more precise camera guidance (including tilt/angle) and automated brand confirmation to ensure they are scanning the correct "Afia" product before auto-capture fires.

## Solution
1. **Multi-SKU Entry**: Expand the bottle registry to include 2.5L Afia Corn Oil for QR generation. Disable alignment logic for 2.5L to avoid inaccurate feedback.
2. **Enhanced Guidance**: Implement device orientation (tilt) detection with iOS permission handling. Add a 3-second "Shoot frontside" onboarding message.
3. **Brand Verification**: Upgrade `detectHeartLogo` to use HSV analysis. Integrate into the auto-capture logic with a 3-frame debounce to prevent flicker.
4. **Auto-Capture Lock**: Only trigger `handleCapture` when alignment (distance + centering), angle (tilt), and brand (logo) are all confirmed.

## In Scope
- Adding 2.5L Afia SKU to the shared registry (mock only).
- Updating `useCameraGuidance` hook to track brand detection (debounced) and device tilt.
- Updating `CameraViewfinder` to display tilt guidance and brand verification status.
- Implementing `DeviceOrientationEvent` permission flow for iOS.
- Updating `QrMockGenerator` to show both 1.5L and 2.5L codes.

## Out of Scope
- Full volume calculation math for 2.5L.
- Active alignment/silhouettes for 2.5L (UI will show "Manual Capture Only" for this SKU).

# Context for Development

## Codebase Patterns
- **Detection**: `cameraQualityAssessment.ts` uses HSV ranges.
- **Guidance Loop**: `useCameraGuidance.ts` manages a hold timer (1000ms) with a 150ms grace period.
- **Performance**: Alternate frames for blur and brand detection to save CPU.

## Files to Reference
| File | Role |
|------|------|
| `shared/bottleRegistry.ts` | Single source of truth for bottle SKUs |
| `src/utils/cameraQualityAssessment.ts` | Computer vision logic (HSV segmentation) |
| `src/hooks/useCameraGuidance.ts` | State machine and debouncing |
| `src/components/CameraViewfinder.tsx` | UI and Permission management |

# Implementation Plan

- [ ] Task 1: Add 2.5L Afia SKU to Registry
  - File: `shared/bottleRegistry.ts`
  - Action: Add `afia-corn-2.5l` entry. Update `activeBottleRegistry` filter.
  - Notes: Set a flag or check SKU in UI to disable 1.5L-specific silhouettes when 2.5L is active.

- [ ] Task 2: Robust Brand and Tilt Detection
  - File: `src/utils/cameraQualityAssessment.ts`
  - Action: 
    1. Refactor `detectHeartLogo` to use HSV (Red: 0-10 & 330-360, S>50, V>40; Yellow: 45-65, S>50, V>50).
    2. Add `isBrandMatch: boolean` to `CompositionAssessment`.
  - Notes: Brand check ROI should be center 20% of the frame.

- [ ] Task 3: Permission Flow and Debouncing
  - File: `src/hooks/useCameraGuidance.ts`
  - Action:
    1. Implement 3-frame "stable brand" check before allowing `isReady`.
    2. Add `orientationPermission: 'granted' | 'denied' | 'prompt'` to state.
    3. Export a `requestOrientation()` method that calls `DeviceOrientationEvent.requestPermission()` (if available).
  - Notes: Throttle brand detection to every 3rd frame.

- [ ] Task 4: Viewfinder UI Optimization
  - File: `src/components/CameraViewfinder.tsx`
  - Action:
    1. Layout: Tilt guidance arrows below `BottleGuide`. Brand status icon in the top status pill.
    2. Add "Shoot frontside" toast that auto-hides after 3000ms.
    3. Trigger `requestOrientation()` on the first "Start Camera" tap.
  - Notes: Ensure 2.5L SKU displays "Advanced guidance coming soon" instead of the 1.5L outline.

- [ ] Task 5: i18n Updates
  - Files: `src/i18n/locales/en/translation.json`, `src/i18n/locales/ar/translation.json`
  - Action: Add keys for `shootFrontside`, `tiltUp`, `tiltDown`, `brandVerified`, `ensureLogoVisible`, `afia-corn-2.5l`.

# Acceptance Criteria

- [ ] AC 1: Given a 2.5L QR scan, when the camera opens, then the app shows "Manual capture only" and disables auto-capture.
- [ ] AC 2: Given an iOS device, when the camera starts, then the user is prompted for motion permissions before tilt guidance appears.
- [ ] AC 3: Given an Afia bottle with the logo covered, when aligned, then the app displays "Ensure logo is visible" and blocks capture.
- [ ] AC 4: Given a blurry/shaky alignment, when brand is detected, then the progress ring resets immediately due to lack of stability.
- [ ] AC 5: Given full alignment, correct tilt, and debounced brand detection, when held for 1s, then the shutter fires automatically.

# Dependencies
- `DeviceOrientationEvent` support in mobile browsers.
- Existing `detectHeartLogo` implementation.

# Testing Strategy
- Mock `DeviceOrientationEvent` in Vitest to test tilt logic.
- Verify `isReady` latency: Brand detection must not add > 500ms delay to the hold timer start.
- Manual verification of "Shoot frontside" toast disappearance.
