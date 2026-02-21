import React, { useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import Icon from '@/components/ui/Icon';
import Badge from '@/components/ui/Badge';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import QuantityStepper from '@/components/ui/QuantityStepper';
import RatingDots from '@/components/ui/RatingDots';
import Spinner from '@/components/ui/Spinner';
import useSession from '@/hooks/useSession';
import useCart from '@/hooks/useCart';
import { useMenuDetail } from '@/hooks/useMenu';
import useLanguage from '@/hooks/useLanguage';
import { useExchangeRate } from '@/hooks/useExchangeRate';
import type { SelectedOption, MenuOptionGroup } from '@anytable/shared';

const SPICY_OPTIONS = ['mild', 'medium', 'hot'] as const;

const MenuDetailPage: React.FC = () => {
  const { menuId } = useParams<{ menuId: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { store } = useSession();
  const { addItem } = useCart();
  const { currentLanguage } = useLanguage();
  const { data: menu, isLoading, isError } = useMenuDetail(store?.id, menuId);
  const { format: fp, formatConverted } = useExchangeRate();

  const [quantity, setQuantity] = useState(1);
  const [spicyLevel, setSpicyLevel] = useState<typeof SPICY_OPTIONS[number]>('medium');
  const [selectedOptions, setSelectedOptions] = useState<Record<string, string[]>>({});
  const [adding, setAdding] = useState(false);

  const locale = useMemo(() => {
    if (!menu) return null;
    return menu.locales[currentLanguage] || menu.locales['en'] || Object.values(menu.locales)[0];
  }, [menu, currentLanguage]);

  const nativeName = useMemo(() => {
    if (!menu) return null;
    const storeDefaultLang = store?.default_language ?? 'ko';
    if (storeDefaultLang === currentLanguage) return null;
    const native = menu.locales[storeDefaultLang];
    return native?.name ?? null;
  }, [menu, currentLanguage, store]);

  const dietaryBadges = useMemo(() => {
    if (!menu) return [];
    return menu.dietary_tags.map((tag) => {
      const keyMap: Record<string, { labelKey: string; variant: 'green' | 'blue' | 'red' | 'orange' }> = {
        vegan: { labelKey: 'menu.vegan_option', variant: 'green' },
        vegetarian: { labelKey: 'menu.vegetarian', variant: 'green' },
        halal: { labelKey: 'menu.halal', variant: 'blue' },
        kosher: { labelKey: 'menu.kosher', variant: 'blue' },
        pork_free: { labelKey: 'menu.pork_free', variant: 'orange' },
        gluten_free: { labelKey: 'menu.gluten_free', variant: 'orange' },
      };
      const info = keyMap[tag] || { labelKey: tag, variant: 'gray' as const };
      return { tag, ...info };
    });
  }, [menu]);

  const optionTotal = useMemo(() => {
    if (!menu) return 0;
    let total = 0;
    for (const group of menu.options) {
      const selected = selectedOptions[group.id] || [];
      for (const valId of selected) {
        const val = group.values.find((v) => v.id === valId);
        if (val) total += val.price_delta;
      }
    }
    return total;
  }, [menu, selectedOptions]);

  const totalPrice = useMemo(() => {
    if (!menu) return 0;
    return (menu.base_price + optionTotal) * quantity;
  }, [menu, optionTotal, quantity]);

  const toggleOption = (groupId: string, valueId: string, maxSelect: number) => {
    setSelectedOptions((prev) => {
      const current = prev[groupId] || [];
      if (current.includes(valueId)) {
        return { ...prev, [groupId]: current.filter((id) => id !== valueId) };
      }
      if (maxSelect === 1) {
        return { ...prev, [groupId]: [valueId] };
      }
      if (current.length >= maxSelect) return prev;
      return { ...prev, [groupId]: [...current, valueId] };
    });
  };

  const buildSelectedOptions = (): SelectedOption[] => {
    if (!menu) return [];
    const result: SelectedOption[] = [];
    for (const group of menu.options) {
      const selected = selectedOptions[group.id] || [];
      for (const valId of selected) {
        const val = group.values.find((v) => v.id === valId);
        if (!val) continue;
        const groupLocale = group.locales[currentLanguage] || group.locales['en'] || Object.values(group.locales)[0];
        const valLocale = val.locales[currentLanguage] || val.locales['en'] || Object.values(val.locales)[0];
        result.push({
          group_id: group.id,
          value_id: val.id,
          group_name: groupLocale?.group_name ?? '',
          value_label: valLocale?.label ?? '',
          price_delta: val.price_delta,
        });
      }
    }
    return result;
  };

  const handleAddToCart = async () => {
    if (!menu || !menuId) return;

    // Validate required option groups
    for (const group of menu.options) {
      if (group.is_required) {
        const selected = selectedOptions[group.id] || [];
        if (selected.length === 0) {
          const groupLocale = group.locales[currentLanguage] || group.locales['en'] || Object.values(group.locales)[0];
          toast.error(`Please select ${groupLocale?.group_name ?? 'an option'}`);
          return;
        }
      }
    }

    setAdding(true);
    try {
      await addItem(menuId, quantity, buildSelectedOptions());
      toast.success(t('menu.add_to_cart'));
      navigate(-1);
    } catch {
      toast.error(t('common.something_went_wrong'));
    } finally {
      setAdding(false);
    }
  };

  const getOptionGroupLocale = (group: MenuOptionGroup) => {
    return group.locales[currentLanguage] || group.locales['en'] || Object.values(group.locales)[0];
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Spinner size="lg" />
      </div>
    );
  }

  if (isError || !menu || !locale) {
    return (
      <div className="flex flex-col items-center justify-center h-screen gap-4 px-6">
        <Icon name="error" size={48} className="text-gray-300" />
        <p className="text-gray-500">{t('common.something_went_wrong')}</p>
        <Button variant="ghost" icon="arrow_back" onClick={() => navigate(-1)}>
          {t('common.back')}
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface-light pb-28">
      {/* Hero image */}
      <div className="relative">
        {menu.image_url ? (
          <img
            src={menu.image_url}
            alt={locale.name}
            className="w-full h-56 object-cover"
          />
        ) : (
          <div className="w-full h-56 bg-gradient-to-br from-primary-200 via-primary-300 to-primary-400 flex items-center justify-center">
            <Icon name="restaurant" size={64} className="text-white/60" />
          </div>
        )}

        {/* Back button */}
        <button
          onClick={() => navigate(-1)}
          className="absolute top-4 left-4 w-10 h-10 rounded-full bg-white/80 backdrop-blur-sm flex items-center justify-center shadow-sm"
          aria-label={t('common.back')}
        >
          <Icon name="arrow_back" size={22} className="text-surface-dark" />
        </button>
      </div>

      {/* Content */}
      <div className="px-4 -mt-4 relative z-10">
        <Card padding="lg" className="mb-4">
          <div className="flex items-start justify-between mb-2">
            <div className="flex-1 min-w-0">
              <h1 className="text-xl font-bold text-surface-dark">{locale.name}</h1>
              {nativeName && (
                <p className="text-sm text-gray-500 mt-0.5">
                  {t('menu.native_name')}: {nativeName}
                </p>
              )}
            </div>
            <div className="shrink-0 ml-3 text-right">
              <span className="text-xl font-bold text-primary-500">
                {fp(menu.base_price)}
              </span>
              {formatConverted(menu.base_price) && (
                <p className="text-[10px] text-gray-400">≈{formatConverted(menu.base_price)}</p>
              )}
            </div>
          </div>

          {locale.description && (
            <p className="text-sm text-gray-600 mt-2">{locale.description}</p>
          )}

          {/* Dietary badges */}
          {dietaryBadges.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-3">
              {dietaryBadges.map(({ tag, labelKey, variant }) => (
                <Badge key={tag} variant={variant} size="sm">
                  {t(labelKey)}
                </Badge>
              ))}
              {menu.spiciness_level > 0 && (
                <Badge variant="red" size="sm">
                  {t('menu.spicy')}
                </Badge>
              )}
            </div>
          )}

          {/* Spiciness & challenge */}
          {(menu.spiciness_level > 0 || menu.challenge_level > 0) && (
            <div className="flex items-center gap-4 mt-3 pt-3 border-t border-gray-100">
              {menu.spiciness_level > 0 && (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-500">{t('menu.spiciness')}</span>
                  <RatingDots level={menu.spiciness_level} maxLevel={3} emoji="🌶️" />
                </div>
              )}
              {menu.challenge_level > 0 && (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-500">{t('menu.challenge')}</span>
                  <RatingDots level={menu.challenge_level} maxLevel={3} emoji="💪" />
                </div>
              )}
            </div>
          )}
        </Card>

        {/* Cultural insight */}
        {locale.cultural_note && (
          <Card padding="md" className="mb-4 !bg-amber-50 !border-amber-200">
            <div className="flex items-start gap-3">
              <Icon name="auto_stories" size={22} className="text-amber-600 shrink-0 mt-0.5" />
              <div>
                <h3 className="text-sm font-semibold text-amber-800 mb-1">
                  {t('menu.cultural_insight')}
                </h3>
                <p className="text-sm text-amber-700 italic leading-relaxed">
                  {locale.cultural_note}
                </p>
              </div>
            </div>
          </Card>
        )}

        {/* Spicy level selector */}
        {menu.spiciness_level > 0 && (
          <Card padding="md" className="mb-4">
            <h3 className="text-sm font-semibold text-surface-dark mb-3">
              {t('menu.spicy_level')}
            </h3>
            <div className="flex gap-2">
              {SPICY_OPTIONS.map((level) => (
                <button
                  key={level}
                  onClick={() => setSpicyLevel(level)}
                  className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                    spicyLevel === level
                      ? 'bg-primary-500 text-white'
                      : 'bg-gray-100 text-gray-600'
                  }`}
                >
                  {t(`menu.${level}`)}
                </button>
              ))}
            </div>
          </Card>
        )}

        {/* Option groups */}
        {menu.options.map((group) => {
          const groupLocale = getOptionGroupLocale(group);
          return (
            <Card key={group.id} padding="md" className="mb-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-surface-dark">
                  {groupLocale?.group_name ?? t('menu.options')}
                </h3>
                {group.is_required && (
                  <Badge variant="red" size="sm">Required</Badge>
                )}
              </div>
              <div className="space-y-2">
                {group.values.map((val) => {
                  const valLocale = val.locales[currentLanguage] || val.locales['en'] || Object.values(val.locales)[0];
                  const isSelected = (selectedOptions[group.id] || []).includes(val.id);
                  return (
                    <button
                      key={val.id}
                      onClick={() => toggleOption(group.id, val.id, group.max_select)}
                      className={`w-full flex items-center justify-between p-3 rounded-xl border transition-colors ${
                        isSelected
                          ? 'border-primary-500 bg-primary-50'
                          : 'border-gray-200 bg-white'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${
                            isSelected
                              ? 'border-primary-500 bg-primary-500'
                              : 'border-gray-300'
                          }`}
                        >
                          {isSelected && (
                            <Icon name="check" size={14} className="text-white" />
                          )}
                        </div>
                        <span className="text-sm text-surface-dark">
                          {valLocale?.label ?? ''}
                        </span>
                      </div>
                      {val.price_delta > 0 && (
                        <span className="text-sm text-gray-500">
                          +{fp(val.price_delta)}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </Card>
          );
        })}

        {/* Allergen info */}
        {menu.allergens.length > 0 && (
          <Card padding="md" className="mb-4">
            <div className="flex items-start gap-3">
              <Icon name="warning" size={20} className="text-amber-500 shrink-0 mt-0.5" />
              <div>
                <h3 className="text-sm font-semibold text-surface-dark mb-1">
                  {t('menu.allergen_info')}
                </h3>
                <div className="flex flex-wrap gap-1.5">
                  {menu.allergens.map((allergen) => (
                    <Badge key={allergen} variant="red" size="sm">
                      {t(`filter.${allergen}`, allergen)}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>
          </Card>
        )}

        {/* Quantity */}
        <Card padding="md" className="mb-4">
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-surface-dark">
              {t('menu.quantity')}
            </span>
            <QuantityStepper value={quantity} onChange={setQuantity} min={1} max={20} />
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
            icon="add_shopping_cart"
            loading={adding}
            disabled={menu.is_sold_out}
            onClick={handleAddToCart}
          >
            {menu.is_sold_out
              ? t('menu.sold_out')
              : `${t('menu.add_to_shared_cart')} - ${fp(totalPrice)}`}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default MenuDetailPage;
