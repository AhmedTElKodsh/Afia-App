import * as Slider from "@radix-ui/react-slider";

interface VerticalStepSliderProps {
  waterMl: number;
  min?: number; // default: 55
  step?: number; // default: 55
  max: number; // bottleCapacityMl
  height?: number; // CSS height in px for the track (default: 280)
  onChange: (waterMl: number) => void;
  ariaLabel?: string; // Accessible label for screen readers
  ariaUnitLabel?: string; // Unit label (e.g., "ml") for aria-valuetext
}

/**
 * Vertical slider for adjusting water volume in 55ml increments.
 *
 * CRITICAL iOS Safari fix: touchAction: "pan-x" prevents page scroll during vertical drag.
 * Without this, vertical drag scrolls the page instead of moving the slider thumb.
 *
 * The slider is fully controlled - it holds no internal state.
 * Value semantics: min (55ml) = bottom, max (capacity) = top.
 */
export function VerticalStepSlider({
  waterMl,
  min = 55,
  step = 55,
  max,
  height = 280,
  onChange,
  ariaLabel = "Adjust fill level",
  ariaUnitLabel = "ml",
}: VerticalStepSliderProps) {
  return (
    <Slider.Root
      orientation="vertical"
      min={min}
      max={max}
      step={step}
      value={[waterMl]}
      onValueChange={([v]) => onChange(v)}
      style={{
        position: "relative",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        userSelect: "none",
        touchAction: "pan-x", // ← CRITICAL: prevents page scroll on vertical drag (iOS Safari)
        height: `${height}px`,
        width: "44px",
      }}
    >
      <Slider.Track
        style={{
          backgroundColor: "#e5e7eb", // gray-200
          position: "relative",
          flexGrow: 1,
          borderRadius: "9999px",
          width: "6px",
        }}
      >
        <Slider.Range
          style={{
            position: "absolute",
            backgroundColor: "#3b82f6", // blue-500
            borderRadius: "9999px",
            bottom: 0,
            width: "100%",
          }}
        />
      </Slider.Track>
      <Slider.Thumb
        aria-label={ariaLabel}
        aria-valuetext={`${waterMl} ${ariaUnitLabel}`}
        style={{
          display: "block",
          width: "44px",
          height: "44px",
          backgroundColor: "#fff",
          border: "2px solid #3b82f6", // blue-500
          borderRadius: "50%",
          boxShadow: "0 1px 3px rgba(0,0,0,0.3)",
          cursor: "grab",
          // Radix handles focus ring — do not suppress with outline: none
        }}
      />
    </Slider.Root>
  );
}
