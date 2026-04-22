import { useTranslation } from "react-i18next";
import "./IosWarning.css";

export function IosWarning() {
  const { t, i18n } = useTranslation();
  const isRTL = i18n.language === 'ar';

  return (
    <div className="ios-warning-screen" role="main" dir={isRTL ? 'rtl' : 'ltr'}>
      <div className="ios-warning-card card">
        <div className="ios-warning-icon" aria-hidden="true">📱</div>
        <h1 className="ios-warning-title">{t('iosWarning.title')}</h1>
        <p className="ios-warning-body">
          {t('iosWarning.body')}
        </p>
        <ol className="ios-warning-steps">
          <li>{t('iosWarning.step1')}</li>
          <li>{t('iosWarning.step2')}</li>
        </ol>
        <p className="ios-warning-note text-caption text-secondary">
          {t('iosWarning.note')}
        </p>
      </div>
    </div>
  );
}
