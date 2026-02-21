import React, { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import Icon from './Icon';
import { LANGUAGE_LABELS, LANGUAGE_FLAGS, SUPPORTED_LANGUAGES } from '@anytable/shared';

interface Language {
  code: string;
  flag: string;
  label: string;
}

const languages: Language[] = SUPPORTED_LANGUAGES.map((code) => ({
  code,
  flag: LANGUAGE_FLAGS[code] || '',
  label: LANGUAGE_LABELS[code] || code,
}));

export interface LanguageSwitcherProps {
  className?: string;
}

const LanguageSwitcher: React.FC<LanguageSwitcherProps> = ({ className = '' }) => {
  const { i18n } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const currentLang =
    languages.find((l) => l.code === i18n.language) ??
    languages.find((l) => i18n.language.startsWith(l.code)) ??
    languages[0];

  // Close on outside click
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [isOpen]);

  const selectLanguage = (code: string) => {
    i18n.changeLanguage(code);
    setIsOpen(false);
  };

  return (
    <div ref={containerRef} className={`relative inline-block ${className}`.trim()}>
      <button
        type="button"
        onClick={() => setIsOpen((v) => !v)}
        className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-gray-200 bg-white text-sm font-medium hover:bg-gray-50 transition-colors"
        aria-haspopup="listbox"
        aria-expanded={isOpen}
      >
        <span>{currentLang.flag}</span>
        <span className="uppercase">{currentLang.code}</span>
        <Icon name="expand_more" size={18} className={`transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <ul
          role="listbox"
          aria-label="Select language"
          className="absolute right-0 mt-1 w-44 bg-white rounded-xl shadow-lg border border-gray-100 py-1 z-50 animate-[fadeIn_150ms_ease-out]"
        >
          {languages.map((lang) => (
            <li key={lang.code}>
              <button
                type="button"
                role="option"
                aria-selected={lang.code === currentLang.code}
                onClick={() => selectLanguage(lang.code)}
                className={`w-full flex items-center gap-2.5 px-3 py-2 text-sm hover:bg-gray-50 transition-colors ${lang.code === currentLang.code ? 'text-primary-500 font-medium' : 'text-gray-700'}`}
              >
                <span>{lang.flag}</span>
                <span>{lang.label}</span>
                <span className="ml-auto uppercase text-xs text-gray-400">{lang.code}</span>
              </button>
            </li>
          ))}
        </ul>
      )}

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(-4px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
};

export default LanguageSwitcher;
