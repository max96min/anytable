import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import Card from '@/components/ui/Card';
import Icon from '@/components/ui/Icon';
import Button from '@/components/ui/Button';
import Toggle from '@/components/ui/Toggle';

const STORAGE_KEY = 'anytable_allergen_prefs';

interface AllergenItem {
  key: string;
  icon: string;
}

const ALLERGEN_ITEMS: AllergenItem[] = [
  { key: 'peanuts', icon: 'nutrition' },
  { key: 'dairy', icon: 'water_drop' },
  { key: 'gluten', icon: 'grain' },
  { key: 'shellfish', icon: 'set_meal' },
  { key: 'eggs', icon: 'egg' },
  { key: 'soy', icon: 'spa' },
];

interface DietaryItem {
  key: string;
}

const DIETARY_ITEMS: DietaryItem[] = [
  { key: 'vegan' },
  { key: 'halal' },
  { key: 'kosher' },
  { key: 'pork_free' },
];

function loadPrefs(): { excludeAllergens: string[]; dietaryTags: string[] } {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch { /* ignore */ }
  return { excludeAllergens: [], dietaryTags: [] };
}

const AllergenFilterPage: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const [excludeAllergens, setExcludeAllergens] = useState<string[]>([]);
  const [dietaryTags, setDietaryTags] = useState<string[]>([]);

  useEffect(() => {
    const prefs = loadPrefs();
    setExcludeAllergens(prefs.excludeAllergens);
    setDietaryTags(prefs.dietaryTags);
  }, []);

  const toggleAllergen = (key: string) => {
    setExcludeAllergens((prev) =>
      prev.includes(key) ? prev.filter((a) => a !== key) : [...prev, key],
    );
  };

  const toggleDietary = (key: string) => {
    setDietaryTags((prev) =>
      prev.includes(key) ? prev.filter((d) => d !== key) : [...prev, key],
    );
  };

  const handleReset = () => {
    setExcludeAllergens([]);
    setDietaryTags([]);
  };

  const handleApply = () => {
    sessionStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ excludeAllergens, dietaryTags }),
    );
    navigate('/menu', { replace: true });
  };

  const activeCount = excludeAllergens.length + dietaryTags.length;

  return (
    <div className="min-h-screen bg-surface-light pb-28">
      {/* Header */}
      <div className="sticky top-0 z-30 bg-surface-light px-4 pt-4 pb-2">
        <div className="flex items-center justify-between mb-1">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-1 text-gray-600"
            aria-label={t('common.back')}
          >
            <Icon name="arrow_back" size={22} />
          </button>
          {activeCount > 0 && (
            <button
              onClick={handleReset}
              className="text-sm text-primary-500 font-medium"
            >
              {t('filter.reset')}
            </button>
          )}
        </div>
        <h1 className="text-xl font-bold text-surface-dark">{t('filter.customize_menu')}</h1>
        <p className="text-sm text-gray-500 mt-1">{t('filter.select_to_filter')}</p>
      </div>

      <div className="px-4">
        {/* Allergen section */}
        <div className="mb-6">
          <h2 className="text-sm font-semibold text-gray-700 mb-1">
            {t('filter.exclude_allergens')}
          </h2>
          <p className="text-xs text-gray-500 mb-3">
            {t('filter.allergen_description')}
          </p>

          <div className="grid grid-cols-3 gap-3">
            {ALLERGEN_ITEMS.map((item) => {
              const isActive = excludeAllergens.includes(item.key);
              return (
                <button
                  key={item.key}
                  onClick={() => toggleAllergen(item.key)}
                  className={`flex flex-col items-center gap-2 p-4 rounded-2xl border-2 transition-all ${
                    isActive
                      ? 'border-primary-500 bg-primary-50 shadow-sm'
                      : 'border-gray-200 bg-white'
                  }`}
                >
                  <div
                    className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                      isActive ? 'bg-primary-500' : 'bg-gray-100'
                    }`}
                  >
                    <Icon
                      name={item.icon}
                      size={22}
                      className={isActive ? 'text-white' : 'text-gray-500'}
                    />
                  </div>
                  <span
                    className={`text-xs font-medium ${
                      isActive ? 'text-primary-600' : 'text-gray-600'
                    }`}
                  >
                    {t(`filter.${item.key}`)}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Dietary lifestyle section */}
        <div className="mb-6">
          <h2 className="text-sm font-semibold text-gray-700 mb-3">
            {t('filter.dietary_lifestyle')}
          </h2>

          <Card padding="none">
            {DIETARY_ITEMS.map((item, i) => (
              <div
                key={item.key}
                className={`flex items-center justify-between px-4 py-3.5 ${
                  i < DIETARY_ITEMS.length - 1 ? 'border-b border-gray-100' : ''
                }`}
              >
                <span className="text-sm text-surface-dark font-medium">
                  {t(`filter.${item.key}`)}
                </span>
                <Toggle
                  checked={dietaryTags.includes(item.key)}
                  onChange={() => toggleDietary(item.key)}
                />
              </div>
            ))}
          </Card>
        </div>

        {/* Safety warning */}
        <Card padding="md" className="mb-6 !bg-amber-50 !border-amber-200">
          <div className="flex items-start gap-3">
            <Icon name="info" size={20} className="text-amber-600 shrink-0 mt-0.5" />
            <p className="text-xs text-amber-700 leading-relaxed">
              {t('filter.safety_warning')}
            </p>
          </div>
        </Card>
      </div>

      {/* Sticky bottom button */}
      <div className="fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-gray-100 px-4 py-3 shadow-[0_-2px_10px_rgba(0,0,0,0.05)]">
        <div className="max-w-lg mx-auto">
          <Button
            variant="primary"
            fullWidth
            size="lg"
            icon="check"
            onClick={handleApply}
          >
            {activeCount > 0
              ? `${t('filter.apply_filters')} (${activeCount})`
              : t('filter.apply_filters')}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default AllergenFilterPage;
