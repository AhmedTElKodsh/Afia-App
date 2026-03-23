import { useState, type FormEvent } from "react";
import { useTranslation } from "react-i18next";
import { Camera, Database, Star, Lock, Search, Check } from "lucide-react";
import "./PrivacyInline.css";
import { PRIVACY_CONFIG, PRIVACY_DETAILS } from "../config/privacy";

/**
 * PrivacyInline Component
 * 
 * Inline privacy acceptance component with checkbox.
 * Following Direction 1 (Spitfire Minimal) + Direction 5 (Swiss Precision) design system.
 * 
 * Features:
 * - Inline checkbox (not modal)
 * - Expandable details
 * - WCAG 2.1 AA compliant
 * - Premium dark theme
 * - Smooth animations
 */
interface PrivacyInlineProps {
  /** Callback when privacy is accepted */
  onAccepted: () => void;
  /** Optional callback when "Learn More" is clicked */
  onLearnMore?: () => void;
  /** Whether to show error state (must accept to proceed) */
  showError?: boolean;
  /** Optional custom CTA text instead of 'Continue' */
  ctaText?: string;
}

export function PrivacyInline({
  onAccepted,
  onLearnMore,
  showError = false,
  ctaText,
}: PrivacyInlineProps) {
  const { t } = useTranslation();
  const [checked, setChecked] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [shakeError, setShakeError] = useState(false);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();

    if (!checked) {
      // Use React state for shake animation
      setShakeError(true);
      setTimeout(() => setShakeError(false), PRIVACY_CONFIG.shakeDuration);
      return;
    }

    handleAccept();
  };

  const handleAccept = () => {
    localStorage.setItem(PRIVACY_CONFIG.storageKey, "true");
    onAccepted();
  };

  return (
    <form onSubmit={handleSubmit} className="privacy-inline-container">
      <div
        className={`privacy-inline-card ${showError ? 'error' : ''} ${shakeError ? 'shake' : ''}`}
      >
        {/* Checkbox + Label */}
        <div className="privacy-checkbox-wrapper">
          <label className="privacy-checkbox">
            <input
              type="checkbox"
              checked={checked}
              onChange={(e) => setChecked(e.target.checked)}
              className="privacy-checkbox-input"
              aria-describedby="privacy-description"
            />
            <span className="privacy-checkbox-custom" aria-hidden="true">
              {checked && (
                <Check size={12} strokeWidth={3} />
              )}
            </span>
            <span className="privacy-checkbox-label">
              {t('privacy.checkboxLabel')}
            </span>
          </label>
        </div>

        {/* Description */}
        <p id="privacy-description" className="privacy-description">
          {t('privacy.storedMessage')}
          <br />
          <span className="privacy-subtle">{t('privacy.noPersonalData')}</span>
        </p>

        {/* Expandable Details */}
        {expanded && (
          <div className="privacy-details" role="region" aria-label="Privacy details">
            <ul className="privacy-list">
              {PRIVACY_DETAILS.map((detail, index) => (
                <li key={index} className="privacy-list-item">
                  <span className="privacy-list-icon" aria-hidden="true">
                    {detail.icon === 'Camera' && <Camera size={14} strokeWidth={2.5} />}
                    {detail.icon === 'Database' && <Database size={14} strokeWidth={2.5} />}
                    {detail.icon === 'Star' && <Star size={14} strokeWidth={2.5} />}
                    {detail.icon === 'Lock' && <Lock size={14} strokeWidth={2.5} />}
                    {detail.icon === 'Search' && <Search size={14} strokeWidth={2.5} />}
                  </span>
                  <span>{t(detail.key)}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Actions */}
        <div className="privacy-actions">
          <button
            type="button"
            className="privacy-learn-more"
            onClick={() => setExpanded((e) => !e)}
            aria-expanded={expanded}
          >
            {expanded ? t('privacy.showLess') : t('privacy.showMore')}
          </button>

          <button
            type="submit"
            className="privacy-accept-btn"
            disabled={!checked}
            aria-disabled={!checked}
            title={!checked ? t('privacy.mustAccept') : undefined}
          >
            {ctaText ?? t('common.ok')}
          </button>
        </div>
      </div>
    </form>
  );
}
