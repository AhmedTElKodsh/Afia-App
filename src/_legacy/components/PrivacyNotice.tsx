/* eslint-disable react-refresh/only-export-components */
import { useState } from "react";
import { useTranslation } from "react-i18next";
import "./PrivacyNotice.css";

const STORAGE_KEY = "afia_privacy_accepted";

export function hasAcceptedPrivacy(): boolean {
  return localStorage.getItem(STORAGE_KEY) === "true";
}

interface PrivacyNoticeProps {
  onAccepted: () => void;
}

export function PrivacyNotice({ onAccepted }: PrivacyNoticeProps) {
  const { t, i18n } = useTranslation();
  const [expanded, setExpanded] = useState(false);
  const isRTL = i18n.language === 'ar';

  const handleAccept = () => {
    localStorage.setItem(STORAGE_KEY, "true");
    onAccepted();
  };

  return (
    <div className="privacy-overlay" role="dialog" aria-modal="true" aria-labelledby="privacy-title" dir={isRTL ? 'rtl' : 'ltr'}>
      <div className="privacy-card card">
        <h2 id="privacy-title" className="privacy-title">{t('privacy.beforeFirstScan')}</h2>

        <p className="privacy-body">
          {t('privacy.storageNote')}
        </p>
        <p className="privacy-body">
          {t('privacy.noPersonalNote')}
        </p>

        {expanded && (
          <div className="privacy-details">
            <p>{t('privacy.message')}</p>
            <ul>
              <li>{t('privacy.details.camera')}</li>
              <li>{t('privacy.details.database')}</li>
              <li>{t('privacy.details.star')}</li>
              <li>{t('privacy.details.lock')}</li>
              <li>{t('privacy.details.search')}</li>
            </ul>
          </div>
        )}

        <button
          className="privacy-learn-more text-caption"
          onClick={() => setExpanded((e) => !e)}
          aria-expanded={expanded}
        >
          {expanded ? t('privacy.showLess') : t('privacy.learnMore')}
        </button>

        <button className="btn btn-primary btn-full privacy-accept" onClick={handleAccept}>
          {t('privacy.understand')}
        </button>
      </div>
    </div>
  );
}
