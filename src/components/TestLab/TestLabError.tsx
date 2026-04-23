import { useTranslation } from "react-i18next";
import { AlertTriangle, RefreshCcw } from "lucide-react";

interface TestLabErrorProps {
  error: string;
  onRetry: () => void;
  onBackToIdle: () => void;
}

export function TestLabError({ error, onRetry, onBackToIdle }: TestLabErrorProps) {
  const { t } = useTranslation();
  return (
    <div className="test-lab-section">
      <div className="test-lab-error-card" role="alert">
        <div className="test-lab-error-icon-wrap" aria-hidden="true">
          <AlertTriangle size={28} strokeWidth={2} className="test-lab-error-icon" />
        </div>
        <div className="test-lab-error-body">
          <h4 className="test-lab-error-title">{t('admin.testLab.errorTitle')}</h4>
          <p className="test-lab-error-msg">{error}</p>
        </div>
        <div className="test-lab-error-actions">
          <button className="error-retry-button" onClick={onRetry} type="button">
            <RefreshCcw size={16} strokeWidth={2} />
            <span>{t('common.retry')}</span>
          </button>
          <button className="test-lab-back-button" onClick={onBackToIdle} type="button">
            <span>{t('admin.testLab.backToTestLab')}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
