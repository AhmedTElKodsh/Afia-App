import { useTranslation } from 'react-i18next';
import { Sun, Moon, Globe, ShieldCheck } from 'lucide-react';
import { useTheme } from '../hooks/useTheme';
import './AppControls.css';

interface AppControlsProps {
  /** Optionally hide on camera screen */
  hidden?: boolean;
  /** Pass admin mode state to show the shield */
  isAdminMode?: boolean;
}

export function AppControls({ hidden = false, isAdminMode = false }: AppControlsProps) {
  const { t, i18n } = useTranslation();
  const [theme, toggleTheme] = useTheme();

  const currentLang = i18n.language || 'en';
  const isArabic = currentLang === 'ar';

  const toggleLanguage = () => {
    i18n.changeLanguage(isArabic ? 'en' : 'ar');
  };

  if (hidden) return null;

  return (
    <div className="app-controls-wrapper" dir={isArabic ? 'rtl' : 'ltr'}>
      <div className="app-controls" aria-label="App settings">
        {/* Admin Mode Toggle */}
      {isAdminMode && (
        <>
          <div className="app-ctrl-admin" aria-label="Admin Mode Active">
            <ShieldCheck size={16} strokeWidth={2} />
            <span className="app-ctrl-admin-label">{t('common.adminMode')}</span>
          </div>
          <div className="app-ctrl-divider" aria-hidden="true" />
        </>
      )}

      {/* Language Toggle */}
      <button
        className="app-ctrl-btn"
        onClick={toggleLanguage}
        aria-label={isArabic ? 'Switch to English' : 'التبديل للعربية'}
        title={isArabic ? 'Switch to English' : 'التبديل للعربية'}
      >
        <Globe size={16} strokeWidth={2} />
        <span className="app-ctrl-label">{isArabic ? 'EN' : 'عربي'}</span>
      </button>

      {/* Divider */}
      <div className="app-ctrl-divider" aria-hidden="true" />

      {/* Theme Toggle */}
      <button
        className="app-ctrl-btn"
        onClick={toggleTheme}
        aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
        title={theme === 'dark' ? 'Light mode' : 'Dark mode'}
      >
        <span className={`app-ctrl-icon-wrap ${theme === 'dark' ? 'show-moon' : 'show-sun'}`}>
          <Sun size={16} strokeWidth={2} className="icon-sun" />
          <Moon size={16} strokeWidth={2} className="icon-moon" />
        </span>
        <span className="app-ctrl-label">{theme === 'dark' ? 'Dark' : 'Light'}</span>
      </button>
    </div>
    </div>
  );
}
