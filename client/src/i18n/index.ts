import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import en from './locales/en.json';
import ko from './locales/ko.json';
import ja from './locales/ja.json';
import zh from './locales/zh.json';
import es from './locales/es.json';

const resources = {
  en: { translation: en },
  ko: { translation: ko },
  ja: { translation: ja },
  zh: { translation: zh },
  es: { translation: es },
};

function detectBrowserLanguage(): string {
  const nav = navigator.language || (navigator as { userLanguage?: string }).userLanguage || 'en';
  const base = nav.split('-')[0].toLowerCase();
  const supported = ['en', 'ko', 'ja', 'zh', 'es'];
  if (supported.includes(base)) return base;
  return 'en';
}

const savedLanguage = sessionStorage.getItem('anytable_language');

i18n.use(initReactI18next).init({
  resources,
  lng: savedLanguage || detectBrowserLanguage(),
  fallbackLng: 'en',
  supportedLngs: ['en', 'ko', 'ja', 'zh', 'es'],
  interpolation: {
    escapeValue: false,
  },
  react: {
    useSuspense: false,
  },
});

i18n.on('languageChanged', (lng) => {
  sessionStorage.setItem('anytable_language', lng);
  document.documentElement.lang = lng;
});

export default i18n;
