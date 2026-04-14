import { useState } from "react";
import { Info } from "lucide-react";
import { useTranslation } from "react-i18next";
import "./UnknownBottle.css";

interface UnknownBottleProps {
  sku: string | null;
  onStartContribution?: () => void;
}

export function UnknownBottle({ sku, onStartContribution }: UnknownBottleProps) {
  const { t } = useTranslation();
  const [contributionCount] = useState(() => {
    try {
      return Number(localStorage.getItem('afia_contributions') || '0');
    } catch { return 0; }
  });

  return (
    <div className="unknown-bottle">
      <div className="unknown-bottle-content">
        <div className="unknown-icon" aria-hidden="true">
          <Info size={44} strokeWidth={1.5} />
        </div>

        <h1>
          {sku ? t('landing.bottleNotSupported') : t('landing.noBottleLinked')}
        </h1>

        {sku && (
          <p className="sku-display text-secondary">{t('landing.skuLabel', { sku })}</p>
        )}

        <p className="text-secondary ub-desc">
          {sku
            ? t('landing.futureSupportMessage')
            : t('landing.noBottleMessage')}
        </p>

        {sku && onStartContribution && (
          <div className="ub-contribution-zone">
            <button 
              className="btn btn-primary btn-full"
              onClick={onStartContribution}
            >
              {t('landing.helpUsLearn')}
            </button>
            {contributionCount > 0 && (
              <p className="contribution-count text-caption text-secondary">
                {t('landing.contributionCount', { count: contributionCount })}
              </p>
            )}
          </div>
        )}

        {/* Step-by-step orientation guide */}
        {!sku && (
          <div className="card card-compact ub-guide" role="list" aria-label={t('landing.howToStart')}>
            <p className="ub-guide-title text-caption text-secondary">{t('landing.howToStart')}</p>
            <ol className="ub-steps">
              <li role="listitem">{t('landing.step1')}</li>
              <li role="listitem">{t('landing.step2')}</li>
              <li role="listitem">{t('landing.step3')}</li>
            </ol>
          </div>
        )}
      </div>
    </div>
  );
}
