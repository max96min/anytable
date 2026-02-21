import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import Card from '@/components/ui/Card';
import Icon from '@/components/ui/Icon';
import Input from '@/components/ui/Input';
import Badge from '@/components/ui/Badge';
import RatingDots from '@/components/ui/RatingDots';
import Spinner from '@/components/ui/Spinner';
import useSession from '@/hooks/useSession';
import { useMenu } from '@/hooks/useMenu';
import useLanguage from '@/hooks/useLanguage';
import { formatPrice } from '@anytable/shared';

const MenuBrowsingPage: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { session, store } = useSession();
  const { currentLanguage } = useLanguage();
  const { categories, isLoading, isError, filterMenu, refetch } = useMenu(store?.id);

  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState<string | null>(null);

  const savedAllergens: string[] = useMemo(() => {
    try {
      const raw = sessionStorage.getItem('anytable_allergen_prefs');
      if (raw) return JSON.parse(raw).excludeAllergens || [];
    } catch { /* ignore */ }
    return [];
  }, []);

  const savedDietary: string[] = useMemo(() => {
    try {
      const raw = sessionStorage.getItem('anytable_allergen_prefs');
      if (raw) return JSON.parse(raw).dietaryTags || [];
    } catch { /* ignore */ }
    return [];
  }, []);

  const filteredMenus = useMemo(() => {
    return filterMenu({
      categoryId: activeCategory,
      search,
      excludeAllergens: savedAllergens,
      dietaryTags: savedDietary,
    });
  }, [filterMenu, activeCategory, search, savedAllergens, savedDietary]);

  const activeFilterCount = savedAllergens.length + savedDietary.length;

  const getCategoryName = (cat: typeof categories[0]) => {
    const locale = cat.locales[currentLanguage] || cat.locales['en'];
    return locale?.name ?? 'Category';
  };

  const getMenuLocale = (menu: typeof filteredMenus[0]) => {
    return menu.locales[currentLanguage] || menu.locales['en'] || Object.values(menu.locales)[0];
  };

  const sortedCategories = useMemo(() => {
    return [...categories].sort((a, b) => a.sort_order - b.sort_order);
  }, [categories]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Spinner size="lg" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4 px-6">
        <Icon name="error" size={48} className="text-gray-300" />
        <p className="text-gray-500">{t('common.something_went_wrong')}</p>
        <button onClick={() => refetch()} className="btn-primary text-sm px-4 py-2">
          {t('common.retry')}
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col">
      {/* Header */}
      <div className="sticky top-0 z-30 bg-surface-light pt-4 pb-2 px-4">
        <div className="flex items-center justify-between mb-3">
          <div>
            <p className="text-xs text-gray-500">{t('menu.your_table')}</p>
            <h1 className="text-lg font-bold text-surface-dark">
              {t('menu.table_number', { number: session?.table_number ?? '' })}
            </h1>
          </div>
          <button
            onClick={() => navigate('/preferences')}
            className="relative flex items-center justify-center w-10 h-10 rounded-xl bg-white border border-gray-200 shadow-sm"
            aria-label={t('filter.preferences')}
          >
            <Icon name="tune" size={20} className="text-gray-600" />
            {activeFilterCount > 0 && (
              <span className="absolute -top-1 -right-1 flex items-center justify-center w-5 h-5 rounded-full bg-primary-500 text-white text-[10px] font-bold">
                {activeFilterCount}
              </span>
            )}
          </button>
        </div>

        {/* Search bar */}
        <Input
          placeholder={t('menu.search_placeholder')}
          icon="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* Category tabs */}
      <div className="flex overflow-x-auto no-scrollbar gap-2 px-4 py-3">
        <button
          onClick={() => setActiveCategory(null)}
          className={`shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-colors ${
            activeCategory === null
              ? 'bg-primary-500 text-white'
              : 'bg-white text-gray-600 border border-gray-200'
          }`}
        >
          {t('menu.recommended')}
        </button>
        {sortedCategories.map((cat) => (
          <button
            key={cat.id}
            onClick={() => setActiveCategory(cat.id)}
            className={`shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-colors ${
              activeCategory === cat.id
                ? 'bg-primary-500 text-white'
                : 'bg-white text-gray-600 border border-gray-200'
            }`}
          >
            {getCategoryName(cat)}
          </button>
        ))}
      </div>

      {/* Menu list */}
      <div className="px-4 pb-4 space-y-3">
        {filteredMenus.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <Icon name="search_off" size={48} className="text-gray-300" />
            <p className="text-gray-500 text-sm">{t('menu.no_results')}</p>
          </div>
        ) : (
          filteredMenus.map((menu) => {
            const locale = getMenuLocale(menu);
            return (
              <Card
                key={menu.id}
                padding="none"
                className="overflow-hidden"
                onClick={() => navigate(`/menu/${menu.id}`)}
              >
                <div className="flex">
                  {/* Image */}
                  <div className="relative w-28 h-28 shrink-0">
                    {menu.image_url ? (
                      <img
                        src={menu.image_url}
                        alt={locale?.name}
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-primary-100 to-primary-200 flex items-center justify-center">
                        <Icon name="restaurant" size={28} className="text-primary-400" />
                      </div>
                    )}

                    {/* Badges */}
                    {menu.is_recommended && (
                      <span className="absolute top-1.5 left-1.5 bg-primary-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-md">
                        {menu.is_recommended && activeCategory === null
                          ? t('menu.chefs_choice')
                          : t('menu.popular')}
                      </span>
                    )}

                    {menu.is_sold_out && (
                      <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                        <span className="bg-white text-gray-700 text-xs font-bold px-3 py-1 rounded-full">
                          {t('menu.sold_out')}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Content */}
                  <div className="flex-1 p-3 flex flex-col justify-between min-w-0">
                    <div>
                      <h3 className="text-sm font-semibold text-surface-dark truncate">
                        {locale?.name}
                      </h3>
                      {locale?.description && (
                        <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">
                          {locale.description}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center gap-2 mt-1">
                      {menu.spiciness_level > 0 && (
                        <RatingDots level={menu.spiciness_level} maxLevel={3} color="#ef4444" />
                      )}
                      {menu.challenge_level > 0 && (
                        <RatingDots level={menu.challenge_level} maxLevel={3} color="#e68119" />
                      )}
                    </div>

                    <div className="flex items-center justify-between mt-2">
                      <span className="text-sm font-bold text-primary-500">
                        {formatPrice(menu.base_price)}
                      </span>
                      {!menu.is_sold_out && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/menu/${menu.id}`);
                          }}
                          className="flex items-center gap-1 bg-primary-500 text-white text-xs font-semibold px-3 py-1.5 rounded-lg hover:bg-primary-600 transition-colors"
                        >
                          <Icon name="add" size={16} />
                          {t('menu.add_to_cart')}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
};

export default MenuBrowsingPage;
