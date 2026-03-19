import { useTranslation } from 'react-i18next';
import { Globe } from 'lucide-react';
import './LanguageSelector.css';

export function LanguageSelector() {
  const { i18n } = useTranslation();

  const currentLang = i18n.language || 'en';
  const isRTL = currentLang === 'ar';

  const toggleLanguage = () => {
    const newLang = currentLang === 'en' ? 'ar' : 'en';
    i18n.changeLanguage(newLang);
  };

  return (
    <button
      className="language-selector"
      onClick={toggleLanguage}
      aria-label={`Switch to ${isRTL ? 'English' : 'Arabic'}`}
      title={isRTL ? 'Switch to English' : 'التبديل للعربية'}
    >
      <Globe size={20} />
      <span className="language-label">{isRTL ? 'EN' : 'عربي'}</span>
    </button>
  );
}
