import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { MenuLocale, SupportedLanguage } from '@anytable/shared';
import { SUPPORTED_LANGUAGES, LANGUAGE_LABELS } from '@anytable/shared';
import { getMenu, getMenuTranslations, saveMenuTranslation } from '@/lib/admin-api';
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
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();

  const [activeLang, setActiveLang] = useState<SupportedLanguage>('en');
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

  const handleAutoTranslate = (lang: SupportedLanguage) => {
    const enForm = forms['en'];
    if (!enForm?.name) return;
    setForms((prev) => ({
      ...prev,
      [lang]: {
        name: `[Auto] ${enForm.name}`,
        description: enForm.description ? `[Auto] ${enForm.description}` : '',
        cultural_note: enForm.cultural_note ? `[Auto] ${enForm.cultural_note}` : '',
      },
    }));
  };

  const completedCount = savedLangs.size;
  const totalLangs = SUPPORTED_LANGUAGES.length;

  if (!id) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-sm text-gray-500">No menu item specified.</p>
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
        <p className="text-sm text-gray-500">Menu item not found.</p>
      </div>
    );
  }

  const menuName = menu.locales['en']?.name || Object.values(menu.locales)[0]?.name || 'Untitled';
  const currentForm = forms[activeLang] || emptyForm;

  return (
    <div className="flex flex-col min-h-full">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 py-4 md:px-6">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/admin/menus')}
            className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <Icon name="arrow_back" size={22} className="text-gray-600" />
          </button>
          <div>
            <h1 className="text-lg font-bold text-surface-dark">Translate Menu Item</h1>
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
            {completedCount}/{totalLangs} complete
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
          {/* Auto-translate button (for non-English) */}
          {activeLang !== 'en' && (
            <div className="flex items-center justify-between p-3 bg-blue-50 rounded-xl border border-blue-100">
              <div className="flex items-center gap-2">
                <Icon name="auto_awesome" size={18} className="text-blue-500" />
                <span className="text-sm text-blue-700">
                  Auto-fill from English text
                </span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleAutoTranslate(activeLang)}
                disabled={!forms['en']?.name}
              >
                Auto-translate
              </Button>
            </div>
          )}

          {/* Name */}
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-gray-700">
              Name ({LANGUAGE_LABELS[activeLang] || activeLang})
            </label>
            <input
              type="text"
              placeholder={`Menu name in ${LANGUAGE_LABELS[activeLang] || activeLang}`}
              value={currentForm.name}
              onChange={(e) => updateForm(activeLang, 'name', e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent placeholder:text-gray-400"
            />
          </div>

          {/* Description */}
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-gray-700">
              Description ({LANGUAGE_LABELS[activeLang] || activeLang})
            </label>
            <textarea
              placeholder={`Description in ${LANGUAGE_LABELS[activeLang] || activeLang}`}
              value={currentForm.description}
              onChange={(e) => updateForm(activeLang, 'description', e.target.value)}
              rows={3}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none placeholder:text-gray-400"
            />
          </div>

          {/* Cultural Note */}
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-gray-700">
              Cultural Note ({LANGUAGE_LABELS[activeLang] || activeLang})
            </label>
            <textarea
              placeholder="Add a cultural note for this language..."
              value={currentForm.cultural_note}
              onChange={(e) => updateForm(activeLang, 'cultural_note', e.target.value)}
              rows={2}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none placeholder:text-gray-400"
            />
          </div>

          {/* Spiciness & Challenge display */}
          <div className="flex gap-6">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs text-gray-500">Spiciness Level</label>
              <RatingDots level={menu.spiciness_level} color="#ef4444" />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs text-gray-500">Challenge Level</label>
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
                  : 'Failed to save translation'}
              </p>
            </div>
          )}

          {/* Success feedback */}
          {saveMutation.isSuccess && (
            <div className="flex items-center gap-2 p-3 rounded-xl bg-green-50 border border-green-100">
              <Icon name="check_circle" size={18} className="text-green-500" />
              <p className="text-sm text-green-600">Translation saved successfully.</p>
            </div>
          )}

          {/* Save button */}
          <div className="flex items-center gap-3 pt-2 pb-8">
            <Button
              variant="ghost"
              size="lg"
              onClick={() => navigate('/admin/menus')}
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
              Save {LANGUAGE_LABELS[activeLang] || activeLang} Translation
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TranslationEditorPage;
