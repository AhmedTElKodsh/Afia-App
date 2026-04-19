import { XCircle } from "lucide-react";
import { useTranslation } from "react-i18next";
import "./ApiStatus.css"; /* reuse .analyzing-animation / .bottle-outline / .fill-wave */
import "./AnalyzingOverlay.css";

interface AnalyzingOverlayProps {
  /** Base-64 captured image to show dimmed behind the animation */
  capturedImage: string | null;
  /** Called when the user taps Cancel — should reset to CAMERA_ACTIVE */
  onCancel: () => void;
  /** Progress message to display (Story 7.4) */
  progressMessage?: string;
}

/**
 * AnalyzingOverlay
 *
 * Shown while the API is processing the captured image (API_PENDING state).
 * H1 fix: Removes ~8 hardcoded inline styles from App.tsx.
 * H2 fix: Provides an accessible Cancel ghost button.
 * Story 7.4: Shows dynamic progress messages during local/cloud analysis.
 */
export function AnalyzingOverlay({ capturedImage, onCancel, progressMessage }: AnalyzingOverlayProps) {
  const { t } = useTranslation();
  return (
    <div className="analyzing-overlay" role="status" aria-live="polite" aria-label={t('camera.analyzingAriaLabel')}>
      {/* Dimmed captured image as background */}
      {capturedImage && (
        <img
          src={`data:image/jpeg;base64,${capturedImage}`}
          alt=""
          className="analyzing-bg-image"
          aria-hidden="true"
        />
      )}

      {/* Scrim */}
      <div className="analyzing-scrim" aria-hidden="true" />

      {/* Content */}
      <div className="analyzing-content">
        {/* Animated bottle — reuses ApiStatus.css classes */}
        <div className="analyzing-animation" aria-hidden="true">
          <div className="bottle-outline">
            <div className="fill-wave" />
          </div>
        </div>

        <p className="analyzing-title">{progressMessage || t('analysis.analyzing')}</p>
        <p className="analyzing-sub">{t('analysis.timeEstimate')}</p>

        {/* H2 fix: Cancel button */}
        <button
          type="button"
          className="btn btn-ghost analyzing-cancel-btn"
          onClick={onCancel}
          aria-label={t('analysis.cancelAriaLabel')}
        >
          <XCircle size={16} strokeWidth={2} aria-hidden="true" />
          {t('common.cancel')}
        </button>
      </div>
    </div>
  );
}
