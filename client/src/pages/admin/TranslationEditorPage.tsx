import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { MenuLocale, SupportedLanguage } from '@anytable/shared';
import { SUPPORTED_LANGUAGES, LANGUAGE_LABELS } from '@anytable/shared';
import { getMenu, getMenuTranslations, saveMenuTranslation, autoTranslateMenu } from '@/lib/admin-api';
import Button from '@/components/ui/Button';
import Icon from '@/components/ui/Icon';
import Spinner from '@/components/ui/Spinner';
import RatingDots from '@/components/ui/RatingDots';

interface TranslationForm {
  name: string;
  description: string;
  cultural_note: string;
}

const emptyForm: TranslationForm = { name: '', description: '', cultural_note: '' };

const TranslationEditorPage: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { menuId: id } = useParams<{ menuId: string }>();
  const queryClient = useQueryClient();

  const [activeLang, setActiveLang] = useState<SupportedLanguage>('en');
  const [baseLang, setBaseLang] = useState<SupportedLanguage>('en');
  const [forms, setForms] = useState<Record<string, TranslationForm>>({});
  const [savedLangs, setSavedLangs] = useState<Set<string>>(new Set());

  // Fetch menu
  const { data: menu, isLoading: menuLoading } = useQuery({
    queryKey: ['admin-menu', id],
    queryFn: () => getMenu(id!),
    enabled: !!id,
  });

  // Fetch translations
  const { data: translations, isLoading: translationsLoading } = useQuery({
    queryKey: ['admin-menu-translations', id],
    queryFn: () => getMenuTranslations(id!),
    enabled: !!id,
  });

  // Initialize forms from fetched data
  useEffect(() => {
    if (!menu) return;
    const initial: Record<string, TranslationForm> = {};
    const saved = new Set<string>();
    for (const lang of SUPPORTED_LANGUAGES) {
      const locale = translations?.[lang] || menu.locales[lang];
      if (locale?.name) {
        initial[lang] = {
          name: locale.name,
          description: locale.description || '',
          cultural_note: locale.cultural_note || '',
        };
        saved.add(lang);
      } else {
        initial[lang] = { ...emptyForm };
      }
    }
    setForms(initial);
    setSavedLangs(saved);
  }, [menu, translations]);

  // Save mutation
  const saveMutation = useMutation({
    mutationFn: ({
      language,
      data,
    }: {
      language: SupportedLanguage;
      data: MenuLocale;
    }) => saveMenuTranslation(id!, language, data),
    onSuccess: (_data, variables) => {
      setSavedLangs((prev) => new Set([...prev, variables.language]));
      queryClient.invalidateQueries({ queryKey: ['admin-menu-translations', id] });
      queryClient.invalidateQueries({ queryKey: ['admin-menus'] });
    },
  });

  // Auto-translate mutation
  const translateMutation = useMutation({
    mutationFn: ({ fromLang, toLang }: { fromLang: string; toLang: string }) =>
      autoTranslateMenu(id!, fromLang, toLang),
    onSuccess: (data) => {
      setForms((prev) => ({
        ...prev,
        [activeLang]: {
          name: data.name,
          description: data.description || '',
          cultural_note: data.cultural_note || '',
        },
      }));
    },
  });

  const updateForm = useCallback(
    (lang: string, field: keyof TranslationForm, value: string) => {
      setForms((prev) => ({
        ...prev,
        [lang]: { ...(prev[lang] || emptyForm), [field]: value },
      }));
    },
    [],
  );

  const handleSave = (lang: SupportedLanguage) => {
    const form = forms[lang];
    if (!form || !form.name.trim()) return;
    saveMutation.mutate({
      language: lang,
      data: {
        name: form.name.trim(),
        description: form.description.trim() || undefined,
        cultural_note: form.cultural_note.trim() || undefined,
      },
    });
  };

  const handleAutoTranslate = () => {
    translateMutation.mutate({ fromLang: baseLang, toLang: activeLang });
  };

  // Available base languages (those with content)
  const availableBaseLangs = SUPPORTED_LANGUAGES.filter(
    (lang: SupportedLanguage) => lang !== activeLang && forms[lang]?.name?.trim(),
  );

  const completedCount = savedLangs.size;
  const totalLangs = SUPPORTED_LANGUAGES.length;

  if (!id) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-sm text-gray-500">{t('admin.no_menu_specified')}</p>
      </div>
    );
  }

  if (menuLoading || translationsLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Spinner size="lg" />
      </div>
    );
  }

  if (!menu) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-sm text-gray-500">{t('admin.menu_not_found')}</p>
      </div>
    );
  }

  const menuName = menu.locales['en']?.name || Object.values(menu.locales)[0]?.name || 'Untitled';
  const currentForm = forms[activeLang] || emptyForm;
  const baseForm = forms[baseLang] || emptyForm;

  return (
    <div className="flex flex-col min-h-full">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 py-4 md:px-6">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/admin/menu')}
            className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <Icon name="arrow_back" size={22} className="text-gray-600" />
          </button>
          <div>
            <h1 className="text-lg font-bold text-surface-dark">{t('admin.translate_menu')}</h1>
            <p className="text-sm text-gray-500">{menuName}</p>
          </div>
        </div>

        {/* Progress indicator */}
        <div className="flex items-center gap-3 mt-3">
          <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${
                completedCount === totalLangs ? 'bg-green-500' : 'bg-primary-400'
              }`}
              style={{ width: `${(completedCount / totalLangs) * 100}%` }}
            />
          </div>
          <span className="text-xs text-gray-500 shrink-0">
            {t('admin.translation_complete', { count: completedCount, total: totalLangs })}
          </span>
        </div>
      </div>

      {/* Language tabs */}
      <div className="bg-white border-b border-gray-200 px-4 md:px-6">
        <div className="flex overflow-x-auto no-scrollbar" role="tablist">
          {SUPPORTED_LANGUAGES.map((lang: SupportedLanguage) => {
            const isActive = activeLang === lang;
            const isComplete = savedLangs.has(lang);
            return (
              <button
                key={lang}
                role="tab"
                aria-selected={isActive}
                onClick={() => setActiveLang(lang)}
                className={`relative shrink-0 px-4 py-3 text-sm font-medium transition-colors whitespace-nowrap flex items-center gap-1.5 ${
                  isActive
                    ? 'text-primary-500'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                {LANGUAGE_LABELS[lang] || lang.toUpperCase()}
                {isComplete && (
                  <Icon name="check_circle" size={14} className="text-green-500" />
                )}
                {isActive && (
                  <span className="absolute bottom-0 left-2 right-2 h-0.5 rounded-full bg-primary-500" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Translation form */}
      <div className="flex-1 px-4 md:px-6 py-4 max-w-2xl">
        <div className="flex flex-col gap-5">
          {/* Auto-translate with base language selector */}
          {availableBaseLangs.length > 0 && (
            <div className="flex flex-col gap-2 p-3 bg-blue-50 rounded-xl border border-blue-100">
              <div className="flex items-center gap-2">
                <Icon name="auto_awesome" size={18} className="text-blue-500" />
                <span className="text-sm font-medium text-blue-700">
                  {t('admin.ai_translate_title')}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <label className="text-xs text-blue-600 shrink-0">
                  {t('admin.base_language')}
                </label>
                <select
                  value={baseLang}
                  onChange={(e) => setBaseLang(e.target.value as SupportedLanguage)}
                  className="flex-1 px-2 py-1.5 rounded-lg border border-blue-200 bg-white text-sm text-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-300"
                >
                  {availableBaseLangs.map((lang: SupportedLanguage) => (
                    <option key={lang} value={lang}>
                      {LANGUAGE_LABELS[lang] || lang}
                    </option>
                  ))}
                </select>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleAutoTranslate}
                  loading={translateMutation.isPending}
                  disabled={!baseForm.name?.trim()}
                  icon="translate"
                >
                  {t('admin.auto_translate')}
                </Button>
              </div>
              {translateMutation.isPending && (
                <div className="flex items-center gap-2 mt-1">
                  <Spinner size="sm" />
                  <span className="text-xs text-blue-600">{t('admin.translating')}</span>
                </div>
              )}
              {translateMutation.isError && (
                <p className="text-xs text-red-500 mt-1">
                  {translateMutation.error instanceof Error
                    ? translateMutation.error.message
                    : t('admin.translate_failed')}
                </p>
              )}
            </div>
          )}

          {/* Source reference (collapsed preview of base language) */}
          {availableBaseLangs.length > 0 && baseForm.name && (
            <div className="p-3 bg-gray-50 rounded-xl border border-gray-200">
              <p className="text-xs text-gray-500 mb-1">
                {t('admin.source_reference', { language: LANGUAGE_LABELS[baseLang] || baseLang })}
              </p>
              <p className="text-sm font-medium text-gray-700">{baseForm.name}</p>
              {baseForm.description && (
                <p className="text-xs text-gray-500 mt-1">{baseForm.description}</p>
              )}
            </div>
          )}

          {/* Name */}
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-gray-700">
              {t('admin.name_in_lang', { language: LANGUAGE_LABELS[activeLang] || activeLang })}
            </label>
            <input
              type="text"
              placeholder={t('admin.menu_name_in_lang', { language: LANGUAGE_LABELS[activeLang] || activeLang })}
              value={currentForm.name}
              onChange={(e) => updateForm(activeLang, 'name', e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent placeholder:text-gray-400"
            />
          </div>

          {/* Description */}
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-gray-700">
              {t('admin.description_in_lang', { language: LANGUAGE_LABELS[activeLang] || activeLang })}
            </label>
            <textarea
              placeholder={t('admin.description_placeholder_lang', { language: LANGUAGE_LABELS[activeLang] || activeLang })}
              value={currentForm.description}
              onChange={(e) => updateForm(activeLang, 'description', e.target.value)}
              rows={3}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none placeholder:text-gray-400"
            />
          </div>

          {/* Cultural Note */}
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-gray-700">
              {t('admin.cultural_note_label', { language: LANGUAGE_LABELS[activeLang] || activeLang })}
            </label>
            <textarea
              placeholder={t('admin.cultural_note_placeholder')}
              value={currentForm.cultural_note}
              onChange={(e) => updateForm(activeLang, 'cultural_note', e.target.value)}
              rows={2}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none placeholder:text-gray-400"
            />
          </div>

          {/* Spiciness & Challenge display */}
          <div className="flex gap-6">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs text-gray-500">{t('admin.spiciness_level_label')}</label>
              <RatingDots level={menu.spiciness_level} color="#ef4444" />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs text-gray-500">{t('admin.challenge_level_label')}</label>
              <RatingDots level={menu.challenge_level} color="#e68119" />
            </div>
          </div>

          {/* Error */}
          {saveMutation.isError && (
            <div className="flex items-center gap-2 p-3 rounded-xl bg-red-50 border border-red-100">
              <Icon name="error" size={18} className="text-red-500" />
              <p className="text-sm text-red-600">
                {saveMutation.error instanceof Error
                  ? saveMutation.error.message
                  : t('admin.failed_save_translation')}
              </p>
            </div>
          )}

          {/* Success feedback */}
          {saveMutation.isSuccess && (
            <div className="flex items-center gap-2 p-3 rounded-xl bg-green-50 border border-green-100">
              <Icon name="check_circle" size={18} className="text-green-500" />
              <p className="text-sm text-green-600">{t('admin.translation_saved')}</p>
            </div>
          )}

          {/* Save button */}
          <div className="flex items-center gap-3 pt-2 pb-8">
            <Button
              variant="ghost"
              size="lg"
              onClick={() => navigate('/admin/menu')}
            >
              {t('common.back')}
            </Button>
            <Button
              variant="primary"
              size="lg"
              fullWidth
              loading={saveMutation.isPending}
              onClick={() => handleSave(activeLang)}
              disabled={!currentForm.name.trim()}
            >
              {t('admin.save_translation', { language: LANGUAGE_LABELS[activeLang] || activeLang })}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TranslationEditorPage;
