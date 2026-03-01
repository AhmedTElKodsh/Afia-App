import { useState } from "react";
import { submitFeedback } from "../api/apiClient.ts";
import "./FeedbackPrompt.css";

type AccuracyRating = "about_right" | "too_high" | "too_low" | "way_off";

interface FeedbackPromptProps {
  scanId: string;
  fillPercentage: number;
  resultTimestamp: number;
  onSubmitted: () => void;
}

export function FeedbackPrompt({
  scanId,
  fillPercentage,
  resultTimestamp,
  onSubmitted,
}: FeedbackPromptProps) {
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

  const doSubmit = async (
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
      setError("Failed to submit feedback. Please try again.");
      setSubmitting(false);
    }
  };

  const handleSubmitWithSlider = () => {
    if (rating) {
      doSubmit(rating, sliderValue);
    }
  };

  const ratings: { value: AccuracyRating; label: string }[] = [
    { value: "about_right", label: "About right" },
    { value: "too_high", label: "Too high" },
    { value: "too_low", label: "Too low" },
    { value: "way_off", label: "Way off" },
  ];

  return (
    <div className="feedback-prompt card">
      <h3 className="feedback-question">Was this estimate accurate?</h3>

      <div className="rating-grid">
        {ratings.map((r) => (
          <button
            key={r.value}
            className={`btn btn-outline rating-btn ${rating === r.value ? "rating-active" : ""}`}
            onClick={() => handleRating(r.value)}
            disabled={submitting}
            aria-label={`Rate estimate as ${r.label.toLowerCase()}`}
          >
            {r.label}
          </button>
        ))}
      </div>

      {showSlider && (
        <div className="slider-section">
          <p className="slider-label">What would you estimate?</p>
          <div className="slider-row">
            <input
              type="range"
              min="1"
              max="99"
              value={sliderValue}
              onChange={(e) => setSliderValue(Number(e.target.value))}
              className="estimate-slider"
              aria-label="Your fill percentage estimate"
            />
            <span className="slider-value">{sliderValue}%</span>
          </div>
          <button
            className="btn btn-primary btn-full"
            onClick={handleSubmitWithSlider}
            disabled={submitting}
          >
            {submitting ? "Submitting..." : "Submit Feedback"}
          </button>
        </div>
      )}

      {error && <p className="feedback-error">{error}</p>}
    </div>
  );
}
