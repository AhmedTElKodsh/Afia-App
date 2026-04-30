import { useTranslation } from "react-i18next";
import * as Slider from "@radix-ui/react-slider";
import { hapticFeedback } from "../utils/haptics.ts";
import "./ConsumptionSlider.css";

interface ConsumptionSliderProps {
  remainingMl: number;
  onUsageChange: (usageMl: number) => void;
  usageMl: number;
}

/**
 * ConsumptionSlider - Interactive slider for measuring oil usage
 * 
 * Allows users to plan how much oil they'll use in cooking by dragging
 * a slider in 55ml increments (1/4 cup = 55ml based on 220ml tea cup standard).
 * 
 * Features:
 * - Vertical Radix slider with 55ml steps
 * - Cup visualization (half/full icons)
 * - Real-time "Remaining after use" calculation
 * - Haptic feedback at each 55ml milestone
 * - RTL layout support
 * - Hidden if remaining < 55ml
 */
export function ConsumptionSlider({ remainingMl, onUsageChange, usageMl }: ConsumptionSliderProps) {
  const { t, i18n } = useTranslation();
  const isRTL = i18n.dir() === 'rtl';

  // Edge case: Hide slider if remaining < 55ml
  if (remainingMl < 55) {
    return (
      <div className="consumption-slider-disabled">
        <p className="text-caption text-secondary">
          {t('consumption.lessThanQuarterCup', 'Less than ¼ cup remaining ({{ml}}ml)', { ml: Math.round(remainingMl) })}
        </p>
      </div>
    );
  }

  // Calculate max slider value (must be multiple of 55ml)
  const maxUsage = Math.floor(remainingMl / 55) * 55;

  // Calculate cup visualization
  // 55ml = 1/2 cup, 110ml = 1 cup
  const halfCups = Math.floor(usageMl / 55);
  const fullCups = Math.floor(halfCups / 2);
  const hasHalfCup = halfCups % 2 === 1;

  // Calculate remaining after usage
  const remainingAfterUse = remainingMl - usageMl;

  const handleSliderChange = (values: number[]) => {
    const newValue = values[0];
    if (newValue !== usageMl) {
      hapticFeedback.selection(); // Haptic feedback on each change
      onUsageChange(newValue);
    }
  };

  return (
    <div className="consumption-slider-container" dir={isRTL ? 'rtl' : 'ltr'}>
      <h3 className="consumption-slider-title">{t('consumption.title', 'How much are you using?')}</h3>
      
      <div className="consumption-slider-layout">
        {/* Slider */}
        <div className="consumption-slider-track">
          <Slider.Root
            orientation="vertical"
            min={0}
            max={maxUsage}
            step={55}
            value={[usageMl]}
            onValueChange={handleSliderChange}
            className="consumption-slider-root"
            aria-label={t('consumption.sliderLabel', 'Oil usage amount')}
          >
            <Slider.Track className="consumption-slider-track-bg">
              <Slider.Range className="consumption-slider-range" />
            </Slider.Track>
            <Slider.Thumb 
              className="consumption-slider-thumb"
              aria-valuetext={`${usageMl} ${t('common.ml', 'ml')}`}
            />
          </Slider.Root>
        </div>

        {/* Cup Visualization */}
        <div className="consumption-cup-display">
          <div className="consumption-cup-icons">
            {fullCups > 0 && (
              <div className="cup-count">
                {[...Array(fullCups)].map((_, i) => (
                  <CupIcon key={`full-${i}`} fill="full" size={32} />
                ))}
              </div>
            )}
            {hasHalfCup && <CupIcon fill="half" size={32} />}
            {usageMl === 0 && <CupIcon fill="none" size={32} />}
          </div>
          
          {/* Usage Display */}
          <div className="consumption-usage-text">
            <p className="consumption-label">{t('consumption.takingOut', "You're taking out:")}</p>
            <p className="consumption-value">
              {usageMl}{t('common.ml', 'ml')} = {halfCups / 2} {t('common.cups', 'cups')}
            </p>
          </div>

          {/* Remaining Display */}
          <div className="consumption-remaining-text">
            <p className="consumption-label">{t('consumption.willRemain', 'Will remain:')}</p>
            <p className="consumption-value">
              {Math.round(remainingAfterUse)}{t('common.ml', 'ml')} = {(remainingAfterUse / 220).toFixed(1)} {t('common.cups', 'cups')}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

// --- Cup Icon Component ---
interface CupIconProps {
  fill: "half" | "full" | "none";
  size?: number;
}

function CupIcon({ fill, size = 24 }: CupIconProps) {
  const { i18n } = useTranslation();
  const isRTL = i18n.dir() === 'rtl';
  
  return (
    <svg 
      width={size} 
      height={size} 
      viewBox="0 0 24 24" 
      fill="none" 
      xmlns="http://www.w3.org/2000/svg"
      className="cup-icon"
      aria-hidden="true"
    >
      {/* Cup handle */}
      <path 
        d={isRTL ? "M6 8C3.8 8 2 9.8 2 12C2 14.2 3.8 16 6 16" : "M18 8C20.2 8 22 9.8 22 12C22 14.2 20.2 16 18 16"} 
        stroke="currentColor" 
        strokeWidth="2" 
        strokeLinecap="round" 
      />
      {/* Cup body */}
      <path 
        d={isRTL ? "M22 6V16C22 18.2 20.2 20 18 20H10C7.8 20 6 18.2 6 16V6H22Z" : "M2 6V16C2 18.2 3.8 20 6 20H14C16.2 20 18 18.2 18 16V6H2Z"} 
        stroke="currentColor" 
        strokeWidth="2" 
        strokeLinejoin="round" 
      />
      {/* Fill level */}
      {fill !== "none" && (
        <path 
          d={
            fill === "full" 
              ? (isRTL ? "M6 8V16C6 18.2 7.8 20 10 20H18C20.2 20 22 18.2 22 16V8H6Z" : "M2 8V16C2 18.2 3.8 20 6 20H14C16.2 20 18 18.2 18 16V8H2Z")
              : (isRTL ? "M6 14V16C6 18.2 7.8 20 10 20H18C20.2 20 22 18.2 22 16V14H6Z" : "M2 14V16C2 18.2 3.8 20 6 20H14C16.2 20 18 18.2 18 16V14H2Z")
          } 
          fill="var(--color-primary)" 
        />
      )}
    </svg>
  );
}
