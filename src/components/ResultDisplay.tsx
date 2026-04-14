import { useState, useEffect, useCallback, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { X, Droplets } from "lucide-react";
import type { AnalysisResult } from "../state/appState.ts";
import type { BottleEntry } from "../data/bottleRegistry.ts";
import { calculateVolumes } from "../utils/volumeCalculator.ts";
import { calculateNutrition } from "../utils/nutritionCalculator.ts";
import { ConfidenceBadge } from "./ConfidenceBadge.tsx";
import { FeedbackGrid } from "./FeedbackGrid.tsx";
import { BottleOverlay } from "./BottleOverlay.tsx";
import { hapticFeedback } from "../utils/haptics.ts";
import { useScanHistory, type StoredScan } from "../hooks/useScanHistory.ts";
import { submitFeedback } from "../api/apiClient.ts";
import type { FeedbackType } from "../config/feedback.ts";
import "./ResultDisplay.css";

interface ResultDisplayProps {
  result: AnalysisResult;
  bottle: BottleEntry;
  capturedImage?: string;
  onRetake: () => void;
}

const FEEDBACK_RATING_MAP: Record<FeedbackType, StoredScan["feedbackRating"]> = {
  'accurate': 'about_right',
  'too-high': 'too_high',
  'too-low':  'too_low',
  'way-off':  'way_off',
};

// --- Cup Icon Component ---
interface CupIconProps {
  fill: "half" | "full" | "none";
  size?: number;
}

function CupIcon({ fill, size = 24 }: CupIconProps) {
  const isRTL = document.documentElement.dir === 'rtl';
  
  return (
    <svg 
      width={size} 
      height={size} 
      viewBox="0 0 24 24" 
      fill="none" 
      xmlns="http://www.w3.org/2000/svg"
      className="cup-icon"
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

export function ResultDisplay({ result, bottle, capturedImage, onRetake }: ResultDisplayProps) {
  const { t } = useTranslation();
  const [feedbackSubmitted, setFeedbackSubmitted] = useState(false);
  const [sliderValue, setSliderValue] = useState(0); // Value in ml to consume
  const { updateFeedback } = useScanHistory();

  const handleFeedbackSubmit = useCallback((feedback: FeedbackType) => {
    const rating = FEEDBACK_RATING_MAP[feedback];
    if (result.scanId && rating) {
      updateFeedback(result.scanId, rating);
      submitFeedback(result.scanId, rating, result.fillPercentage).catch(() => {});
    }
    setFeedbackSubmitted(true);
  }, [result.scanId, result.fillPercentage, updateFeedback]);

  // Trigger success haptics on result display
  useEffect(() => {
    if (result.confidence === "high") {
      hapticFeedback.success();
    } else {
      hapticFeedback.scan();
    }
  }, [result.confidence]);

  const originalVolumes = useMemo(() => calculateVolumes(
    result.fillPercentage,
    bottle.totalVolumeMl,
    bottle.geometry
  ), [result.fillPercentage, bottle.totalVolumeMl, bottle.geometry]);

  // Update volumes based on slider (planned consumption)
  const volumes = useMemo(() => {
    const adjustedFillPercentage = ((originalVolumes.remaining.ml - sliderValue) / bottle.totalVolumeMl) * 100;
    return calculateVolumes(
      Math.max(0, adjustedFillPercentage),
      bottle.totalVolumeMl,
      bottle.geometry
    );
  }, [originalVolumes.remaining.ml, sliderValue, bottle.totalVolumeMl, bottle.geometry]);

  const nutrition = calculateNutrition(volumes.consumed.ml, bottle.oilType);

  const qualityMessages: Record<string, string> = {
    blur: t('results.blur'),
    poor_lighting: t('results.poorLighting'),
    obstruction: t('results.obstruction'),
    reflection: t('results.reflection'),
  };

  const hasQualityIssues = result.imageQualityIssues && result.imageQualityIssues.length > 0;

  const confidenceColor =
    result.confidence === "high"
      ? "var(--color-fill-high)"
      : result.confidence === "medium"
      ? "var(--color-fill-medium)"
      : "var(--color-fill-low)";

  const maxSliderValue = Math.floor(originalVolumes.remaining.ml / 55) * 55;
  const cupCount = Math.floor(sliderValue / 55) / 2;
  const fullCups = Math.floor(cupCount);
  const hasHalfCup = cupCount % 1 !== 0;

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseInt(e.target.value);
    if (val !== sliderValue) {
      hapticFeedback.selection();
      setSliderValue(val);
    }
  };

  return (
    <div className="result-display" data-confidence={result.confidence} aria-live="assertive">

      {/* ── Quality / Confidence alerts ── */}
      {result.confidence === "low" && (
        <div className="result-alert result-alert--warning card card-compact">
          <div className="result-alert__body">
            <ConfidenceBadge level="low" reason="Consider retaking" />
          </div>
          <button className="btn btn-outline btn-sm" onClick={onRetake}>
            {t('results.retake')}
          </button>
        </div>
      )}

      {hasQualityIssues && (
        <div className="result-alert result-alert--warning card card-compact" role="alert">
          <div className="result-alert__body">
            <p className="result-alert__title">{t('results.qualityIssuesTitle')}</p>
            <ul className="result-alert__list">
              {result.imageQualityIssues!.map((issue) => (
                <li key={issue}>{qualityMessages[issue] ?? issue}</li>
              ))}
            </ul>
          </div>
          <button className="btn btn-outline btn-sm" onClick={onRetake}>
            {t('results.retake')}
          </button>
        </div>
      )}

      {/* ── AR Freeze-Frame Hero: The Bottle Image ── */}
      <div className="result-hero card" style={{ padding: 0, overflow: 'hidden' }}>
        <button
          className="result-close"
          onClick={onRetake}
          aria-label="Close results"
          style={{ zIndex: 10 }}
        >
          <X size={16} strokeWidth={2.5} />
        </button>

        <div className="result-hero-layout">
          <div className="result-image-area">
            {capturedImage ? (
              <BottleOverlay
                capturedImage={capturedImage}
                fillPercentage={((originalVolumes.remaining.ml - sliderValue) / bottle.totalVolumeMl) * 100}
                bottleHeightMm={bottle.geometry.heightMm ?? 0}
                bottleName={bottle.name}
                totalVolumeMl={bottle.totalVolumeMl}
              />
            ) : (
              <div className="result-hero__info" style={{ padding: 'var(--space-xl)' }}>
                <h2 className="result-hero__ml">
                  {volumes.remaining.ml}
                  <span className="result-hero__ml-unit"> {t('results.mlLeft')}</span>
                </h2>
                <div className="result-hero__confidence"
                style={{ color: confidenceColor }}
              >
                <ConfidenceBadge 
                  level={result.confidence} 
                  size="sm"
                  aria-describedby="confidence-explanation"
                />
                <span id="confidence-explanation" className="sr-only">
                  {result.confidence === "high"
                    ? t('results.confidenceHighSr')
                    : result.confidence === "medium"
                    ? t('results.confidenceMediumSr')
                    : t('results.confidenceLowSr')}
                </span>
              </div>
              </div>
            )}
          </div>

          {/* ── Vertical 55ml Consumption Slider ── */}
          <div className="consumption-slider-area">
            <div className="consumption-slider-wrap">
              <input 
                type="range" 
                min="0" 
                max={maxSliderValue} 
                step="55" 
                value={sliderValue} 
                onChange={handleSliderChange}
                className="consumption-vertical-slider"
                aria-label={t('results.plannedConsumption', 'Planned Consumption')}
              />
              
              {/* Floating label that moves with the thumb */}
              <div 
                className="thumb-label-float"
                style={{ 
                  top: `${15 + (sliderValue / maxSliderValue) * 75}%`,
                  opacity: sliderValue > 0 ? 1 : 0.6
                }}
              >
                <div className="thumb-cup-indicator">
                  <CupIcon fill={hasHalfCup ? "half" : sliderValue > 0 ? "full" : "none"} size={18} />
                  <span className="thumb-count">
                    {cupCount > 0 ? `${fullCups > 0 ? fullCups : ""}${hasHalfCup ? " ½" : ""}` : "0"}
                  </span>
                </div>
                <div className="thumb-ml-indicator">-{sliderValue}ml</div>
              </div>

              <div className="consumption-slider-track"></div>
            </div>
            
            <div className="slider-bottom-hint">
              <span className="cup-label">{t('common.cups')}</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── 2-column metrics grid ── */}
      <div className="result-metrics">
        <div className="card card-compact result-metric">
          <p className="result-metric__label">{t('results.consumed')}</p>
          <p className="result-metric__value">{volumes.consumed.ml} {t('common.ml')}</p>
          <p className="result-metric__sub">
            {volumes.consumed.tablespoons} {t('common.tablespoons')} &middot; {volumes.consumed.cups} {t('common.cups')}
          </p>
        </div>
        {nutrition && (
          <div className="card card-compact result-metric">
            <p className="result-metric__label">{t('results.calories')}</p>
            <p className="result-metric__value">{nutrition.calories}</p>
            <p className="result-metric__sub">{t('results.kcalConsumed')}</p>
          </div>
        )}
      </div>

      {/* ── Remaining breakdown ── */}
      <div className="card card-compact result-breakdown">
        <p className="result-breakdown__heading">{t('results.remaining')}</p>
        <div className="result-breakdown__row">
          <span>{t('results.volume')}</span>
          <span className="result-breakdown__val">{volumes.remaining.ml} {t('common.ml')}</span>
        </div>
        <div className="result-breakdown__row">
          <span>{t('results.tablespoons')}</span>
          <span className="result-breakdown__val">{volumes.remaining.tablespoons} {t('common.tablespoons')}</span>
        </div>
        <div className="result-breakdown__row">
          <span>{t('results.cups')}</span>
          <span className="result-breakdown__val">{volumes.remaining.cups} {t('common.cups')}</span>
        </div>
      </div>

      {/* ── Nutrition ── */}
      {nutrition && (
        <div className="card card-compact result-nutrition">
          <p className="result-breakdown__heading">{t('results.nutritionConsumed')}</p>
          <div className="result-breakdown__row">
            <span>{t('results.totalFat')}</span>
            <span className="result-breakdown__val">{nutrition.totalFatG} g</span>
          </div>
          <div className="result-breakdown__row">
            <span>{t('results.saturatedFat')}</span>
            <span className="result-breakdown__val">{nutrition.saturatedFatG} g</span>
          </div>
        </div>
      )}

      {/* ── Disclaimer ── */}
      <p className="result-disclaimer text-caption text-secondary">
        {t('results.disclaimer')}
      </p>

      {/* ── Feedback ── */}
      {!feedbackSubmitted ? (
        <FeedbackGrid
          onSubmit={handleFeedbackSubmit}
          hasSubmitted={feedbackSubmitted}
        />
      ) : (
        <div className="card card-compact result-feedback-thanks">
          <p className="result-feedback-thanks__title">{t('results.thankYouTitle')}</p>
          <p className="text-caption text-secondary">{t('results.feedbackThanksMessage')}</p>
        </div>
      )}

      {/* ── Scan again ── */}
      <button className="btn btn-outline btn-full result-scan-again" onClick={onRetake}>
        {t('results.scanAnother')}
      </button>
    </div>
  );
}
