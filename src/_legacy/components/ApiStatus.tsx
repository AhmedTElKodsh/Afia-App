import { AlertTriangle } from "lucide-react";
import { useTranslation } from "react-i18next";
import "./ApiStatus.css";

interface ApiStatusProps {
  state: "loading" | "error";
  errorMessage?: string;
  onRetry?: () => void;
  onRetake?: () => void;
}

export function ApiStatus({
  state,
  errorMessage,
  onRetry,
  onRetake,
}: ApiStatusProps) {
  const { t } = useTranslation();

  if (state === "loading") {
    return (
      <div className="api-status" role="status" aria-live="polite">
        <div className="analyzing-animation" aria-hidden="true">
          <div className="bottle-outline">
            <div className="fill-wave" />
          </div>
        </div>
        <p className="analyzing-text">{t('analysis.analyzing')}</p>
        <p className="text-caption text-secondary">
          {t('analysis.timeEstimate')}
        </p>
      </div>
    );
  }

  return (
    <div className="api-status" role="alert">
      <div className="error-icon" aria-hidden="true">
        <AlertTriangle size={32} strokeWidth={1.5} />
      </div>
      <h2>{t('analysis.failed')}</h2>
      <p className="text-secondary">{errorMessage || t('common.retry')}</p>
      <div className="error-actions">
        {onRetry && (
          <button className="btn btn-primary" onClick={onRetry}>
            {t('common.retry')}
          </button>
        )}
        {onRetake && (
          <button className="btn btn-outline" onClick={onRetake}>
            {t('camera.retake')}
          </button>
        )}
      </div>
    </div>
  );
}
