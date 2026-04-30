import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { hapticFeedback } from "../../utils/haptics";
import "./CorrectionSlider.css";

/**
 * CorrectionSlider Component
 * Story 4.4 - Corrected Fill Estimate Slider
 * 
 * Allows users to manually override the AI's fill percentage estimate.
 * Optimized for mobile touch with a large 28px thumb.
 */
interface CorrectionSliderProps {
  /** Initial percentage from AI */
  initialValue: number;
  /** Current value to display */
  value: number;
  /** Callback when slider changes */
  onChange: (value: number) => void;
  /** Label for the slider */
  label?: string;
}

export function CorrectionSlider({
  initialValue,
  value,
  onChange,
  label,
}: CorrectionSliderProps) {
  const { t } = useTranslation();
  const [localValue, setLocalValue] = useState(value);

  // Sync internal state if prop changes externally
  useEffect(() => {
    setLocalValue(value);
  }, [value]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVal = parseInt(e.target.value, 10);
    setLocalValue(newVal);
    onChange(newVal);
    
    // Provide tick haptics if value changed significantly
    if (Math.abs(newVal - localValue) >= 5) {
      hapticFeedback.selection();
    }
  };

  return (
    <div className="correction-slider-container card card-premium">
      <div className="correction-slider-header">
        <span className="correction-slider-label">
          {label || t('feedback.adjustActualLevel', 'Adjust to actual level')}
        </span>
        <span className="correction-slider-value">{localValue}%</span>
      </div>
      
      <div className="correction-slider-track">
        <input
          type="range"
          min="1"
          max="99"
          value={localValue}
          onChange={handleChange}
          className="correction-range-input"
          aria-label={t('feedback.correctionSliderAria', 'Correction slider')}
        />
        
        <div className="correction-slider-markers">
          <span className="marker">0%</span>
          <span className="marker-dot initial-marker" style={{ left: `${initialValue}%` }} title="AI Estimate"></span>
          <span className="marker">100%</span>
        </div>
      </div>
      
      <p className="correction-slider-hint text-caption">
        {t('feedback.sliderHint', 'Slide to match the oil level in the photo')}
      </p>
    </div>
  );
}
