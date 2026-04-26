import { useState, useEffect, useCallback, useMemo } from "react";
import { useTranslation } from "react-i18next";
import type { AnalysisResult } from "../state/appState.ts";
import type { BottleEntry } from "../data/bottleRegistry.ts";
import { calculateVolumes } from "../../shared/volumeCalculator.ts";
import { calculateNutrition } from "../../shared/nutritionCalculator.ts";
import { ConfidenceBadge } from "./ConfidenceBadge.tsx";
import { FeedbackGrid } from "./FeedbackGrid.tsx";
import { CorrectionSlider } from "./results/CorrectionSlider.tsx";
import { ConsumptionSlider } from "./ConsumptionSlider.tsx";
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
  const [pendingRating, setPendingRating] = useState<FeedbackType | null>(null);
  const [userFillPct, setUserFillPct] = useState(result.fillPercentage);
  const [consumptionUsageMl, setConsumptionUsageMl] = useState(0); // Consumption slider value
  
  // M2 FIX: Add loading state to prevent double-submission
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { updateFeedback } = useScanHistory();

  const handleFeedbackSubmit = useCallback(async (feedback: FeedbackType) => {
    // Keep correction UI state in sync for non-accurate ratings,
    // but do not require a second submit click.
    if (feedback !== 'accurate' && !pendingRating) {
      setPendingRating(feedback);
    }

    if (isSubmitting) return;
    setIsSubmitting(true);
    
    try {
      const rating = FEEDBACK_RATING_MAP[feedback];
      if (result.scanId && rating) {
        const correctedPct = feedback === 'accurate' ? undefined : userFillPct;
        updateFeedback(result.scanId, rating);
        // M1 FIX: Include correctedFillPercentage in API call
        await submitFeedback(result.scanId, rating, result.fillPercentage, correctedPct).catch(() => {});
      }
      setFeedbackSubmitted(true);
      setPendingRating(null);
    } finally {
      setIsSubmitting(false);
    }
  }, [isSubmitting, result.scanId, result.fillPercentage, userFillPct, pendingRating, updateFeedback]);

  // Trigger success haptics on result display
  useEffect(() => {
    if (result.confidence === "high") {
      hapticFeedback.success();
    } else {
      hapticFeedback.scan();
    }
  }, [result.confidence]);

  const volumes = useMemo(() => calculateVolumes(
    userFillPct, // Drives real-time gauge/volume sync (Story 4.4 AC2)
    bottle.totalVolumeMl,
    bottle.geometry
  ), [userFillPct, bottle.totalVolumeMl, bottle.geometry]);

  const nutrition = calculateNutrition(volumes.consumed.ml, bottle.oilType);

  return (
    <div className="result-display" data-confidence={result.confidence} aria-live="assertive">
      <div className="result-header">
        <h2 className="result-title">{t('results.title')}</h2>
        <ConfidenceBadge level={result.confidence} />
      </div>

      {/* Story 7.4: Show inference source */}
      {result.aiProvider === 'local-tfjs' && (
        <div className="card card-compact result-inference-source">
          <p className="text-caption">
            {t('results.inferenceSource')}{result.llmFallbackUsed ? t('results.cloudVerification') : ''}
            {result.offlineMode && t('results.offlineMode')}
          </p>
        </div>
      )}

      {/* Story 7.8 - Background sync indicator */}
      {result.queuedForSync && (
        <div className="card card-compact result-sync-notice" data-testid="sync-pending-icon">
          <p className="text-caption">
            <span className="sync-icon">â†»</span> {t('results.queuedForSync', 'Scan queued. Results will be verified when online.')}
          </p>
        </div>
      )}
      
      {/* Story 7.4 - Task 6: Offline mode indicator */}
      {result.offlineMode && !result.queuedForSync && (
        <div className="card card-compact result-offline-notice">
          <p className="text-caption">
            {t('results.offlineNotice')}
          </p>
        </div>
      )}

      {/* ── Visual Result Card ── */}
      <div className="result-visual-card card">
        <div className="result-hero-layout">
          {/* Left: Image with Red Line */}
          <div className="result-image-container">
            <img
              src={capturedImage?.startsWith('data:') ? capturedImage : `data:image/jpeg;base64,${capturedImage}`}
              alt="Detected Level"
              className="result-captured-img"
            />
            {/* The Red Line Overlay - Synchronized with user correction (AC2) */}
            <div 
              className="result-red-line"
              style={{ 
                // Approximate mapping: 100% fill maps to top of visual area, 0% to bottom
                bottom: `${userFillPct}%`,
              }}
            >
              <div className="red-line-label">
                {Math.round(volumes.remaining.ml)}{t('common.ml', 'ml')}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Consumption Measurement Slider (Story 3.3) ── */}
      <ConsumptionSlider
        remainingMl={volumes.remaining.ml}
        usageMl={consumptionUsageMl}
        onUsageChange={setConsumptionUsageMl}
      />

      {/* ── Correction Mode UI - Story 4.4 ── */}
      {pendingRating && (
        <CorrectionSlider
          initialValue={result.fillPercentage}
          value={userFillPct}
          onChange={setUserFillPct}
        />
      )}

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
          isSubmitting={isSubmitting}
          selectedType={pendingRating || undefined}
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
