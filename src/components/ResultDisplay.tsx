import { useState, useEffect } from "react";
import { X } from "lucide-react";
import type { AnalysisResult } from "../state/appState.ts";
import type { BottleEntry } from "../data/bottleRegistry.ts";
import { calculateVolumes } from "../utils/volumeCalculator.ts";
import { calculateNutrition } from "../utils/nutritionCalculator.ts";
import { ConfidenceBadge } from "./ConfidenceBadge.tsx";
import { FeedbackGrid } from "./FeedbackGrid.tsx";
import { BottleOverlay } from "./BottleOverlay.tsx";
import { hapticFeedback } from "../utils/haptics.ts";
import "./ResultDisplay.css";

interface ResultDisplayProps {
  result: AnalysisResult;
  bottle: BottleEntry;
  capturedImage?: string;
  onRetake: () => void;
}

export function ResultDisplay({ result, bottle, capturedImage, onRetake }: ResultDisplayProps) {
  const [feedbackSubmitted, setFeedbackSubmitted] = useState(false);

  // Trigger success haptics on result display
  useEffect(() => {
    if (result.confidence === "high") {
      hapticFeedback.success();
    } else {
      hapticFeedback.scan();
    }
  }, [result.confidence]);

  const volumes = calculateVolumes(
    result.fillPercentage,
    bottle.totalVolumeMl,
    bottle.geometry
  );

  const nutrition = calculateNutrition(volumes.consumed.ml, bottle.oilType);

  const qualityMessages: Record<string, string> = {
    blur: "Image too blurry — hold the phone steady",
    poor_lighting: "Poor lighting — try near a window",
    obstruction: "Bottle partially obscured — show full bottle",
    reflection: "Strong reflection — try a different angle",
  };

  const hasQualityIssues = result.imageQualityIssues && result.imageQualityIssues.length > 0;

  const confidenceColor =
    result.confidence === "high"
      ? "var(--color-fill-high)"
      : result.confidence === "medium"
      ? "var(--color-fill-medium)"
      : "var(--color-fill-low)";

  return (
    <div className="result-display" data-confidence={result.confidence} aria-live="assertive">

      {/* ── Quality / Confidence alerts ── */}
      {result.confidence === "low" && (
        <div className="result-alert result-alert--warning card card-compact">
          <div className="result-alert__body">
            <ConfidenceBadge level="low" reason="Consider retaking" />
          </div>
          <button className="btn btn-outline btn-sm" onClick={onRetake}>
            Retake
          </button>
        </div>
      )}

      {hasQualityIssues && (
        <div className="result-alert result-alert--warning card card-compact" role="alert">
          <div className="result-alert__body">
            <p className="result-alert__title">Image quality issues:</p>
            <ul className="result-alert__list">
              {result.imageQualityIssues!.map((issue) => (
                <li key={issue}>{qualityMessages[issue] ?? issue}</li>
              ))}
            </ul>
          </div>
          <button className="btn btn-outline btn-sm" onClick={onRetake}>
            Retake
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

        {capturedImage ? (
          <BottleOverlay
            capturedImage={capturedImage}
            fillPercentage={result.fillPercentage}
            bottleHeightMm={bottle.geometry.heightMm}
            bottleName={bottle.name}
            totalVolumeMl={bottle.totalVolumeMl}
          />
        ) : (
          <div className="result-hero__info" style={{ padding: 'var(--space-xl)' }}>
            <h2 className="result-hero__ml">
              {volumes.remaining.ml}
              <span className="result-hero__ml-unit"> ml left</span>
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
                ? "Very accurate reading" 
                : result.confidence === "medium"
                ? "Moderately accurate reading"
                : "Low accuracy - consider retaking for better results"}
            </span>
          </div>
          </div>
        )}
      </div>

      {/* ── 2-column metrics grid ── */}
      <div className="result-metrics">
        <div className="card card-compact result-metric">
          <p className="result-metric__label">Consumed</p>
          <p className="result-metric__value">{volumes.consumed.ml} ml</p>
          <p className="result-metric__sub">
            {volumes.consumed.tablespoons} tbsp &middot; {volumes.consumed.cups} cups
          </p>
        </div>
        {nutrition && (
          <div className="card card-compact result-metric">
            <p className="result-metric__label">Calories</p>
            <p className="result-metric__value">{nutrition.calories}</p>
            <p className="result-metric__sub">kcal consumed</p>
          </div>
        )}
      </div>

      {/* ── Remaining breakdown ── */}
      <div className="card card-compact result-breakdown">
        <p className="result-breakdown__heading">Remaining</p>
        <div className="result-breakdown__row">
          <span>Volume</span>
          <span className="result-breakdown__val">{volumes.remaining.ml} ml</span>
        </div>
        <div className="result-breakdown__row">
          <span>Tablespoons</span>
          <span className="result-breakdown__val">{volumes.remaining.tablespoons} tbsp</span>
        </div>
        <div className="result-breakdown__row">
          <span>Cups</span>
          <span className="result-breakdown__val">{volumes.remaining.cups} cups</span>
        </div>
      </div>

      {/* ── Nutrition ── */}
      {nutrition && (
        <div className="card card-compact result-nutrition">
          <p className="result-breakdown__heading">Nutrition (consumed)</p>
          <div className="result-breakdown__row">
            <span>Total Fat</span>
            <span className="result-breakdown__val">{nutrition.totalFatG} g</span>
          </div>
          <div className="result-breakdown__row">
            <span>Saturated Fat</span>
            <span className="result-breakdown__val">{nutrition.saturatedFatG} g</span>
          </div>
        </div>
      )}



      {/* ── Disclaimer ── */}
      <p className="result-disclaimer text-caption text-secondary">
        Results are estimates (±15%). Not certified nutritional analysis.
      </p>

      {/* ── Feedback ── */}
      {!feedbackSubmitted ? (
        <FeedbackGrid
          onSubmit={() => setFeedbackSubmitted(true)}
          hasSubmitted={feedbackSubmitted}
        />
      ) : (
        <div className="card card-compact result-feedback-thanks">
          <p className="result-feedback-thanks__title">Thank you! 🙏</p>
          <p className="text-caption text-secondary">Your feedback improves future estimates.</p>
        </div>
      )}

      {/* ── Scan again ── */}
      <button className="btn btn-outline btn-full result-scan-again" onClick={onRetake}>
        Scan Another Bottle
      </button>
    </div>
  );
}
