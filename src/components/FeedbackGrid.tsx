import { useState, type FormEvent } from "react";
import { Check, ArrowUp, ArrowDown, X } from "lucide-react";
import "./FeedbackGrid.css";
import { 
  FEEDBACK_CONFIG, 
  FEEDBACK_OPTIONS,
  type FeedbackType 
} from "../config/feedback";

/**
 * FeedbackGrid Component
 * 
 * 4-button feedback collection UI for AI accuracy rating.
 * Following Direction 1 (Spitfire Minimal) + Direction 5 (Swiss Precision) design system.
 * 
 * Features:
 * - 4-button grid layout (2x2)
 * - 1-tap submission for "About right"
 * - WCAG 2.1 AA compliant
 * - Premium dark theme
 * - Smooth animations
 */
interface FeedbackGridProps {
  /** Callback when feedback is submitted */
  onSubmit: (feedback: FeedbackType) => void;
  /** Whether feedback is currently being submitted */
  isSubmitting?: boolean;
  /** Whether feedback has been submitted (shows confirmation) */
  hasSubmitted?: boolean;
}

export function FeedbackGrid({ 
  onSubmit,
  isSubmitting = false,
  hasSubmitted = false
}: FeedbackGridProps) {
  const [selected, setSelected] = useState<FeedbackType | null>(null);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    
    if (!selected || isSubmitting) {
      // Prevent accidental rapid submits
      return;
    }
    
    onSubmit(selected);
  };

  const handleSelect = (type: FeedbackType) => {
    if (isSubmitting || hasSubmitted) return;
    setSelected(type);
    
    // Auto-submit for "accurate" feedback (1-tap)
    if (type === FEEDBACK_CONFIG.types.ACCURATE) {
      setTimeout(() => onSubmit(type), FEEDBACK_CONFIG.autoSubmitDelay);
    }
  };

  if (hasSubmitted) {
    return (
      <div className="feedback-grid-container" role="status" aria-live="polite">
        <div className="feedback-confirmation">
          <div className="feedback-checkmark" aria-hidden="true">
            <Check size={32} strokeWidth={3} />
          </div>
          <h3 className="feedback-confirmation-title">Thank you!</h3>
          <p className="feedback-confirmation-text">
            Your feedback helps improve accuracy.
          </p>
        </div>
      </div>
    );
  }

  return (
    <form 
      className="feedback-grid-container"
      onSubmit={handleSubmit}
      aria-labelledby="feedback-title"
    >
      <h3 id="feedback-title" className="feedback-title">
        Was this accurate?
      </h3>

      <div 
        className="feedback-grid"
        role="group"
        aria-describedby="feedback-title"
      >
        {FEEDBACK_OPTIONS.map((option) => (
          <button
            key={option.type}
            type="button"
            className={`feedback-button ${selected === option.type ? 'selected' : ''}`}
            onClick={() => handleSelect(option.type)}
            disabled={isSubmitting}
            aria-pressed={selected === option.type}
            aria-label={option.ariaLabel}
          >
            <span className="feedback-icon" aria-hidden="true">
              {option.icon === 'Check' && <Check size={32} strokeWidth={2.5} />}
              {option.icon === 'ArrowUp' && <ArrowUp size={32} strokeWidth={2.5} />}
              {option.icon === 'ArrowDown' && <ArrowDown size={32} strokeWidth={2.5} />}
              {option.icon === 'X' && <X size={32} strokeWidth={2.5} />}
            </span>
            <span className="feedback-label">
              {option.label}
            </span>
          </button>
        ))}
      </div>

      {selected && selected !== FEEDBACK_CONFIG.types.ACCURATE && (
        <div className="feedback-actions">
          <button
            type="submit"
            className="feedback-submit-btn"
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Submitting...' : 'Submit Feedback'}
          </button>
        </div>
      )}
    </form>
  );
}
