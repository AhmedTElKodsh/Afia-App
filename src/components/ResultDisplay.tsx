import { useState, useRef } from "react";
import type { AnalysisResult } from "../state/appState.ts";
import type { BottleEntry } from "../data/bottleRegistry.ts";
import { calculateVolumes } from "../utils/volumeCalculator.ts";
import { calculateNutrition } from "../utils/nutritionCalculator.ts";
import { FillGauge } from "./FillGauge.tsx";
import { FeedbackPrompt } from "./FeedbackPrompt.tsx";
import "./ResultDisplay.css";

interface ResultDisplayProps {
  result: AnalysisResult;
  bottle: BottleEntry;
  onRetake: () => void;
}

export function ResultDisplay({ result, bottle, onRetake }: ResultDisplayProps) {
  const [feedbackSubmitted, setFeedbackSubmitted] = useState(false);
  const resultTimestamp = useRef(Date.now());

  const volumes = calculateVolumes(
    result.fillPercentage,
    bottle.totalVolumeMl,
    bottle.geometry
  );

  const nutrition = calculateNutrition(volumes.consumed.ml, bottle.oilType);

  const confidenceConfig = {
    high: { color: "var(--color-success)", label: "High confidence" },
    medium: {
      color: "var(--color-warning)",
      label: "Estimate may be less accurate",
    },
    low: {
      color: "var(--color-danger)",
      label: "Low confidence — consider retaking",
    },
  }[result.confidence];

  const qualityMessages: Record<string, string> = {
    blur: "Image is too blurry — try holding the phone steady",
    poor_lighting: "Lighting is poor — try near a window or light",
    obstruction: "Bottle is partially obscured — ensure full bottle is visible",
    reflection: "Strong reflection detected — try a different angle",
  };

  const hasQualityIssues =
    result.imageQualityIssues && result.imageQualityIssues.length > 0;

  return (
    <div className="result-display" aria-live="assertive">
      {result.confidence === "low" && (
        <div className="low-confidence-banner">
          <p>Low confidence — consider retaking photo</p>
          <button className="btn btn-outline" onClick={onRetake}>
            Retake Photo
          </button>
        </div>
      )}

      {hasQualityIssues && (
        <div className="quality-issues-banner" role="alert">
          <p className="quality-issues-title">Image quality issues detected:</p>
          <ul className="quality-issues-list">
            {result.imageQualityIssues!.map((issue) => (
              <li key={issue}>
                {qualityMessages[issue] ?? issue}
              </li>
            ))}
          </ul>
          <button className="btn btn-outline" onClick={onRetake}>
            Retake Photo
          </button>
        </div>
      )}

      <div className="fill-section card">
        <div className="fill-row">
          <FillGauge fillPercentage={result.fillPercentage} />
          <div className="fill-text">
            <span className="fill-number">{result.fillPercentage}%</span>
            <span className="fill-label text-secondary">remaining</span>
          </div>
        </div>
        <div
          className="confidence-badge"
          style={{ color: confidenceConfig.color }}
        >
          <span
            className="confidence-dot"
            style={{ backgroundColor: confidenceConfig.color }}
          />
          {confidenceConfig.label}
        </div>
      </div>

      <div className="volume-section card">
        <div className="volume-grid">
          <div className="volume-column">
            <h3 className="volume-header">Remaining</h3>
            <div className="volume-value">{volumes.remaining.ml} ml</div>
            <div className="volume-value">
              {volumes.remaining.tablespoons} tbsp
            </div>
            <div className="volume-value">{volumes.remaining.cups} cups</div>
          </div>
          <div className="volume-divider" />
          <div className="volume-column">
            <h3 className="volume-header">Consumed</h3>
            <div className="volume-value">{volumes.consumed.ml} ml</div>
            <div className="volume-value">
              {volumes.consumed.tablespoons} tbsp
            </div>
            <div className="volume-value">{volumes.consumed.cups} cups</div>
          </div>
        </div>
      </div>

      {nutrition && (
        <div className="nutrition-section card">
          <h3 className="nutrition-header">Nutrition (consumed)</h3>
          <div className="nutrition-row">
            <span>Calories</span>
            <span className="nutrition-value">{nutrition.calories} cal</span>
          </div>
          <div className="nutrition-row">
            <span>Total Fat</span>
            <span className="nutrition-value">{nutrition.totalFatG} g</span>
          </div>
          <div className="nutrition-row">
            <span>Saturated Fat</span>
            <span className="nutrition-value">
              {nutrition.saturatedFatG} g
            </span>
          </div>
        </div>
      )}

      <p className="disclaimer text-caption text-secondary">
        Results are estimates (±15%). Not certified nutritional analysis.
      </p>

      {!feedbackSubmitted ? (
        <FeedbackPrompt
          scanId={result.scanId}
          fillPercentage={result.fillPercentage}
          resultTimestamp={resultTimestamp.current}
          onSubmitted={() => setFeedbackSubmitted(true)}
        />
      ) : (
        <div className="feedback-thanks card">
          <p>Thank you for your feedback!</p>
          <p className="text-caption text-secondary">
            Your input helps improve future estimates.
          </p>
        </div>
      )}
    </div>
  );
}
