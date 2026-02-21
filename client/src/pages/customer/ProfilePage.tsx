import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { LANGUAGE_FLAGS, SUPPORTED_CURRENCIES } from '@anytable/shared';
import type { SupportedLanguage } from '@anytable/shared';
import useLanguage from '@/hooks/useLanguage';
import useSession from '@/hooks/useSession';
import { useExchangeRate } from '@/hooks/useExchangeRate';
import Card from '@/components/ui/Card';
import Icon from '@/components/ui/Icon';

const ProfilePage: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { currentLanguage, changeLanguage, supportedLanguages, languageLabels } = useLanguage();
  const { session, participant, store } = useSession();
  const { storeCurrency, displayCurrency, setDisplayCurrency } = useExchangeRate();

  return (
    <div className="min-h-screen bg-surface-light pb-28">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 px-4 pt-4 pb-4">
        <h1 className="text-xl font-bold text-surface-dark">{t('nav.profile')}</h1>
      </div>

      <div className="px-4 pt-4 space-y-4">
        {/* Session info */}
        {session && participant && store && (
          <Card padding="md">
            <div className="flex items-center gap-3">
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-bold"
                style={{ backgroundColor: participant.avatar_color }}
              >
                {participant.nickname.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-surface-dark truncate">
                  {participant.nickname}
                </p>
                <p className="text-xs text-gray-500">
                  {store.name} · {t('session.table_number', { number: session.table_number })}
                </p>
              </div>
            </div>
          </Card>
        )}

        {/* Language selection */}
        <div>
          <h2 className="text-sm font-semibold text-gray-700 mb-1 px-1">
            {t('session.language')}
          </h2>
          <p className="text-xs text-gray-500 mb-3 px-1">
            {t('session.language_description')}
          </p>

          <Card padding="none">
            {supportedLanguages.map((lang, i) => {
              const isActive = currentLanguage === lang;
              return (
                <button
                  key={lang}
                  onClick={() => changeLanguage(lang as SupportedLanguage)}
                  className={`w-full flex items-center justify-between px-4 py-3.5 transition-colors ${
                    i < supportedLanguages.length - 1 ? 'border-b border-gray-100' : ''
                  } ${isActive ? 'bg-primary-50' : 'hover:bg-gray-50'}`}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-lg">{LANGUAGE_FLAGS[lang] || ''}</span>
                    <span className={`text-sm ${isActive ? 'font-semibold text-primary-600' : 'text-surface-dark'}`}>
                      {languageLabels[lang]}
                    </span>
                  </div>
                  {isActive && (
                    <Icon name="check" size={20} className="text-primary-500" />
                  )}
                </button>
              );
            })}
          </Card>
        </div>

        {/* Display currency */}
        <div>
          <h2 className="text-sm font-semibold text-gray-700 mb-1 px-1">
            {t('filter.display_currency')}
          </h2>
          <p className="text-xs text-gray-500 mb-3 px-1">
            {t('filter.display_currency_desc')}
          </p>
          <select
            value={displayCurrency}
            onChange={(e) => setDisplayCurrency(e.target.value)}
            className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          >
            {SUPPORTED_CURRENCIES.filter((c) => c.code !== storeCurrency).map((c) => (
              <option key={c.code} value={c.code}>
                {c.label}
              </option>
            ))}
          </select>
        </div>

        {/* Allergen preferences link */}
        <Card padding="none">
          <button
            onClick={() => navigate('/preferences/allergens')}
            className="w-full flex items-center justify-between px-4 py-4 hover:bg-gray-50 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-amber-100 flex items-center justify-center">
                <Icon name="shield" size={20} className="text-amber-600" />
              </div>
              <div className="text-left">
                <p className="text-sm font-medium text-surface-dark">
                  {t('filter.exclude_allergens')}
                </p>
                <p className="text-xs text-gray-500">
                  {t('filter.dietary_lifestyle')}
                </p>
              </div>
            </div>
            <Icon name="chevron_right" size={20} className="text-gray-400" />
          </button>
        </Card>
      </div>
    </div>
  );
};

export default ProfilePage;
