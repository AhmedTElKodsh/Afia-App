import { useState, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { Info } from "lucide-react";
import { submitFeedback } from "../api/apiClient.ts";
import "./FeedbackPrompt.css";

type AccuracyRating = "about_right" | "too_high" | "too_low" | "way_off";

interface FeedbackPromptProps {
  scanId: string;
  fillPercentage: number;
  resultTimestamp: number;
  onSubmitted: () => void;
}

/**
 * Employee-only feedback flag checker
 * Uses localStorage to persist employee/tester status
 * Set via query param: ?employee=true or manual toggle in dev
 */
function isEmployeeMode(): boolean {
  // Check URL param first (for easy testing)
  const urlParams = new URLSearchParams(window.location.search);
  const urlEmployee = urlParams.get("employee");
  if (urlEmployee === "true") {
    localStorage.setItem("afia_employee", "true");
    return true;
  }
  // Check persisted state
  return localStorage.getItem("afia_employee") === "true";
}

export function FeedbackPrompt({
  scanId,
  fillPercentage,
  resultTimestamp,
  onSubmitted,
}: FeedbackPromptProps) {
  const { t } = useTranslation();
  const [isEmployee] = useState(() => isEmployeeMode());
  const [rating, setRating] = useState<AccuracyRating | null>(null);
  const [sliderValue, setSliderValue] = useState(fillPercentage);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const showSlider = rating && rating !== "about_right";

  const handleRating = async (selectedRating: AccuracyRating) => {
    if (selectedRating === "about_right") {
      // 1-tap submit for happy path
      setRating(selectedRating);
      await doSubmit(selectedRating);
    } else {
      setRating(selectedRating);
    }
  };

  const doSubmit = useCallback(async (
    ratingToSubmit: AccuracyRating,
    corrected?: number
  ) => {
    setSubmitting(true);
    setError(null);
    const responseTimeMs = Date.now() - resultTimestamp;

    try {
      await submitFeedback(
        scanId,
        ratingToSubmit,
        fillPercentage,
        corrected,
        responseTimeMs
      );
      onSubmitted();
    } catch {
      setError(t('feedback.error'));
      setSubmitting(false);
    }
  }, [scanId, fillPercentage, resultTimestamp, onSubmitted, t]);

  const handleSubmitWithSlider = () => {
    if (rating) {
      doSubmit(rating, sliderValue);
    }
  };

  const ratings: { value: AccuracyRating; label: string }[] = [
    { value: "about_right", label: t('feedback.aboutRight') },
    { value: "too_high", label: t('feedback.tooHigh') },
    { value: "too_low", label: t('feedback.tooLow') },
    { value: "way_off", label: t('feedback.wayOff') },
  ];

  // Employee-only: Don't show feedback prompt to public users
  if (!isEmployee) {
    return null;
  }

  return (
    <div className="feedback-prompt card">
      <div className="feedback-header">
        <h3 className="feedback-question">{t('feedback.title')}</h3>
        <span className="employee-badge">{t('feedback.employeeMode')}</span>
      </div>

      <div className="rating-grid">
        {ratings.map((r) => (
          <button
            key={r.value}
            className={`btn btn-outline rating-btn ${rating === r.value ? "rating-active" : ""}`}
            onClick={() => handleRating(r.value)}
            disabled={submitting}
            aria-label={r.label}
          >
            {r.label}
          </button>
        ))}
      </div>

      {showSlider && (
        <div className="slider-section">
          <p className="slider-label">{t('feedback.yourEstimate')}</p>
          <div className="slider-row">
            <input
              type="range"
              min="1"
              max="99"
              value={sliderValue}
              onChange={(e) => setSliderValue(Number(e.target.value))}
              className="estimate-slider"
              aria-label={t('feedback.yourEstimate')}
            />
            <span className="slider-value">{sliderValue}%</span>
          </div>
          <button
            className="btn btn-primary btn-full"
            onClick={handleSubmitWithSlider}
            disabled={submitting}
          >
            {submitting ? t('feedback.submitting') : t('feedback.submitFeedback')}
          </button>
        </div>
      )}

      {error && <p className="feedback-error">{error}</p>}

      <p className="feedback-note">
        <Info size={14} strokeWidth={2} aria-hidden="true" style={{ display: 'inline', verticalAlign: 'middle', marginInlineEnd: '4px' }} />
        {t('feedback.employeeOnly')}
      </p>
    </div>
  );
}
