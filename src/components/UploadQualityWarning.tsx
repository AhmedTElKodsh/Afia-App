/**
 * Upload Quality Warning Dialog
 * Story 7.8 - Service Worker Smart Upload Filtering
 * 
 * Warns users when captured image may produce poor analysis results.
 * Offers options to retake photo or continue anyway.
 */

import { AlertTriangle } from "lucide-react";
import { useTranslation } from "react-i18next";
import "./UploadQualityWarning.css";

interface UploadQualityWarningProps {
  reasons: string[];
  onRetake: () => void;
  onContinue: () => void;
}

export function UploadQualityWarning({
  reasons,
  onRetake,
  onContinue,
}: UploadQualityWarningProps) {
  const { t } = useTranslation();

  return (
    <div className="quality-warning-overlay" role="dialog" aria-modal="true" aria-labelledby="quality-warning-title">
      <div className="quality-warning-dialog">
        <div className="quality-warning-icon" aria-hidden="true">
          <AlertTriangle size={48} strokeWidth={1.5} />
        </div>
        
        <h2 id="quality-warning-title" className="quality-warning-title">
          {t("uploadQuality.title", "Photo Quality Warning")}
        </h2>
        
        <p className="quality-warning-message">
          {t("uploadQuality.message", "This photo may not give a good result:")}
        </p>
        
        <ul className="quality-warning-reasons">
          {reasons.map((reason, index) => (
            <li key={index}>{reason}</li>
          ))}
        </ul>
        
        <div className="quality-warning-actions">
          <button
            className="btn btn-primary"
            onClick={onRetake}
            autoFocus
          >
            {t("uploadQuality.retake", "Retake Photo")}
          </button>
          
          <button
            className="btn btn-secondary"
            onClick={onContinue}
          >
            {t("uploadQuality.continue", "Continue Anyway")}
          </button>
        </div>
      </div>
    </div>
  );
}
