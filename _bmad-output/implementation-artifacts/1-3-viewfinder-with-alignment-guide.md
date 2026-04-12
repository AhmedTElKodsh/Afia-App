# Story 1.3: Viewfinder with Alignment Guide

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a user,
I want to see a clear guide on my camera screen,
so that I know exactly how to position the bottle for a successful scan.

## Acceptance Criteria

1. **Camera Activation**: The rear-facing camera activates immediately upon entering the scan state. [Source: epics.md#Story 1.3] - ✅ DONE
2. **Alignment Guide**: A bottle-shaped dashed outline is centered over the viewfinder. [Source: ux-design-specification.md#Screen 3: Camera Viewfinder] - ✅ DONE
3. **Default Appearance**: The outline is white (`rgba(255, 255, 255, 0.5)`) and dashed by default. [Source: ux-design-specification.md#Camera Framing Guide Design] - ✅ DONE
4. **Instructional Text**: "Align bottle in frame" text is displayed clearly below the guide. [Source: ux-design-specification.md#Camera Framing Guide Design] - ✅ DONE
5. **Responsiveness**: The guide scales proportionally to the viewfinder size across different mobile devices. [Source: ux-design-specification.md#Responsive Behavior] - ✅ DONE

## Tasks / Subtasks

- [x] Update Viewfinder UI (AC: 2, 3, 4)
  - [x] Refactored `BottleGuide` component in `src/components/CameraViewfinder.tsx` to use white dashed strokes.
  - [x] Centered the guide within the `guidance-center` container.
  - [x] Added instructional text below the guide.
- [x] Refine CSS (AC: 3, 5)
  - [x] Updated `CameraViewfinder.css` with standard white coloring and high-precision centering.
  - [x] Ensured the guide uses relative units for scaling.
- [x] Logic Verification (AC: 1)
  - [x] Verified camera stream initialization on mount.

## Dev Notes

- **Naming Pattern**: Maintained `PascalCase.tsx` for components.
- **UX Alignment**: The guide outline is now neutral white by default, ready for the "Green Glow" logic in Story 1.4.
- **Performance**: Preservation of SVG-based guides ensures zero impact on frame rate.

### Project Structure Notes

- **Component**: `src/components/CameraViewfinder.tsx`
- **Styles**: `src/components/CameraViewfinder.css`

### References

- [Source: ux-design-specification.md#Screen 3: Camera Viewfinder]
- [Source: ux-design-specification.md#Camera Framing Guide Design]
- [Source: epics.md#Story 1.3]

## Dev Agent Record

### Agent Model Used

Gemini 2.5 Flash (via BMad dev-story workflow)

### Debug Log References

- [Log: BottleGuide refactored with white dashed stroke and instructional text]
- [Log: CameraViewfinder.css updated for centering and text shadow]
- [Log: Unit tests passed (13/13)]

### Completion Notes List

- Successfully aligned the camera viewfinder with the 2026 UX Spec.
- Established the visual foundation for the auto-capture perception layer.

### File List

- `src/components/CameraViewfinder.tsx` (modified)
- `src/components/CameraViewfinder.css` (modified)
