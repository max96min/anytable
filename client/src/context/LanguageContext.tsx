import React, { createContext, useCallback, useState, useEffect } from 'react';
import i18n from '@/i18n';
import type { SupportedLanguage } from '@anytable/shared';
import { SUPPORTED_LANGUAGES, LANGUAGE_LABELS } from '@anytable/shared';

export interface LanguageContextValue {
  currentLanguage: SupportedLanguage;
  changeLanguage: (lang: SupportedLanguage) => void;
  supportedLanguages: readonly SupportedLanguage[];
  languageLabels: Record<string, string>;
}

export const LanguageContext = createContext<LanguageContextValue | null>(null);

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentLanguage, setCurrentLanguage] = useState<SupportedLanguage>(
    i18n.language as SupportedLanguage,
  );

  useEffect(() => {
    const handleChange = (lng: string) => {
      setCurrentLanguage(lng as SupportedLanguage);
    };
    i18n.on('languageChanged', handleChange);
    return () => {
      i18n.off('languageChanged', handleChange);
    };
  }, []);

  const changeLanguage = useCallback((lang: SupportedLanguage) => {
    i18n.changeLanguage(lang);
  }, []);

  return (
    <LanguageContext.Provider
      value={{
        currentLanguage,
        changeLanguage,
        supportedLanguages: SUPPORTED_LANGUAGES as unknown as readonly SupportedLanguage[],
        languageLabels: LANGUAGE_LABELS,
      }}
    >
      {children}
    </LanguageContext.Provider>
  );
};
