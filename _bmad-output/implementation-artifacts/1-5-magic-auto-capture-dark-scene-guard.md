# Story 1.5: Magic Auto-Capture & Dark Scene Guard

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a user,
I want the app to take the photo for me automatically,
so that I have a frictionless "magic" experience without pressing buttons.

## Acceptance Criteria

1. **Autonomous Shutter**: The system automatically triggers the high-resolution photo capture once all alignment conditions are met. [Source: epics.md#Story 1.5] - ✅ DONE
2. **Stability Buffer**: Capture only triggers after 300ms of continuous "Ready" state to ensure image sharpness and user intent. [Source: architecture.md#4-core-architectural-decisions] - ✅ DONE
3. **Luminance Guard**: The system blocks the auto-capture if the scene brightness is < 20% (Luminance value < 51). [Source: prd.md#Functional Requirements] - ✅ DONE
4. **Visual Shutter Feedback**: A visual "flash" or immediate freeze-frame occurs upon capture to confirm success to the user. [Source: ux-design-specification.md#Performance UX] - ✅ DONE
5. **Dark Scene UI**: Displays a specific "Too Dark" prompt if the luminance guard is active. [Source: ux-design-specification.md#Screen 9: Error States] - ✅ DONE

## Tasks / Subtasks

- [x] Implement Shutter Logic (AC: 1, 2)
  - [x] Added an `useEffect` in `CameraViewfinder.tsx` to monitor `guidance.state.isReady`.
  - [x] Implemented a 300ms stability timer using `setTimeout` and `useRef`.
  - [x] Integrated `triggerCapture()` into the guidance loop.
- [x] Refine Luminance Guard (AC: 3, 5)
  - [x] Updated `assessLighting` in `src/utils/cameraQualityAssessment.ts` to use the 20% threshold (51/255).
  - [x] Updated the `generateGuidanceMessage` to prioritize "Too Dark" warnings.
- [x] Implement Shutter UI (AC: 4)
  - [x] Triggered a white overlay `shutter-flash` animation upon successful capture.
  - [x] Added haptic feedback (vibration) to the capture event.
- [x] Logic Verification (AC: 2)
  - [x] Verified that moving the camera resets the stability timer.

## Dev Notes

- **Cascaded Logic**: The auto-capture is the "Stage 0" trigger. It only fires if the local perception layer confirms Stage 0.5 (Afia Signature) and verticality.
- **Failover UX**: The "delayed reveal" of the manual button (3s) ensures that even if auto-capture struggles, the user is never blocked.
- **Haptics**: Successfully implemented a "Double-Click" haptic pattern: one for "Ready" and one for "Capture."

### Project Structure Notes

- **UI/Logic**: `src/components/CameraViewfinder.tsx`
- **Quality Engine**: `src/utils/cameraQualityAssessment.ts`
- **Styles**: `src/components/CameraViewfinder.css`

### References

- [Source: architecture.md#4-core-architectural-decisions]
- [Source: prd.md#Functional Requirements]
- [Source: ux-design-specification.md#Performance UX]

## Dev Agent Record

### Agent Model Used

Gemini 2.5 Flash (via BMad dev-story workflow)

### Debug Log References

- [Log: stabilityTimer implemented with 300ms debounce]
- [Log: assessLighting threshold updated to 51/255]
- [Log: shutter-flash CSS animation added to viewfinder]
- [Log: unit tests passed (13/13)]

### Completion Notes List

- Successfully delivered the "Magic" auto-capture interaction.
- Protected the backend from low-quality/dark images via the local Luminance Guard.

### File List

- `src/utils/cameraQualityAssessment.ts` (modified)
- `src/components/CameraViewfinder.tsx` (modified)
- `src/components/CameraViewfinder.css` (modified)
