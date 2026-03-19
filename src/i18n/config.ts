import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import translationEN from './locales/en/translation.json';
import translationAR from './locales/ar/translation.json';

const resources = {
  en: {
    translation: translationEN,
  },
  ar: {
    translation: translationAR,
  },
};

// One-time migration: remove the old auto-detection key that may have cached 'ar'
// from the system browser locale, causing unwanted RTL flipping.
localStorage.removeItem('afia_language');

// Only honour a language that the USER explicitly chose via the toggle.
// Never let the browser/system locale silently flip into RTL.
const USER_LANG_KEY = 'afia_user_language';
const userChosenLang = localStorage.getItem(USER_LANG_KEY);
const initialLang = userChosenLang === 'ar' ? 'ar' : 'en';

i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: initialLang,
    fallbackLng: 'en',
    supportedLngs: ['en', 'ar'],
    interpolation: {
      escapeValue: false,
    },
  });

// Detect and set RTL/LTR direction
export const setDirection = (lng: string) => {
  const dir = lng === 'ar' ? 'rtl' : 'ltr';
  document.documentElement.dir = dir;
  document.documentElement.lang = lng;

  if (lng === 'ar') {
    document.documentElement.classList.add('rtl');
  } else {
    document.documentElement.classList.remove('rtl');
  }
};

// Listen for language changes (only fired by the explicit toggle button)
i18n.on('languageChanged', (lng) => {
  setDirection(lng);
  // Save only when user explicitly toggles
  localStorage.setItem(USER_LANG_KEY, lng);
});

// Apply direction on load based on the resolved initial language
setDirection(initialLang);

export default i18n;
