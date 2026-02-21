import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { CategoryDTO, MenuOptionGroup } from '@anytable/shared';
import { DIETARY_TAGS, ALLERGEN_LIST } from '@anytable/shared';
import { getMenu, getCategories, createMenu, updateMenu, type CreateMenuData } from '@/lib/admin-api';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Icon from '@/components/ui/Icon';
import Card from '@/components/ui/Card';
import Toggle from '@/components/ui/Toggle';
import Spinner from '@/components/ui/Spinner';
import ImagePicker from '@/components/admin/ImagePicker';

interface OptionValueForm {
  tempId: string;
  label: string;
  price_delta: string;
}

interface OptionGroupForm {
  tempId: string;
  group_name: string;
  is_required: boolean;
  max_select: string;
  values: OptionValueForm[];
}

function generateTempId(): string {
  return `tmp_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

const MenuEditorPage: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { menuId } = useParams<{ menuId: string }>();
  const isEditing = !!menuId && menuId !== 'new';
  const id = isEditing ? menuId : undefined;
  const queryClient = useQueryClient();

  // Form state
  const [categoryId, setCategoryId] = useState('');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [basePrice, setBasePrice] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [dietaryTags, setDietaryTags] = useState<string[]>([]);
  const [allergens, setAllergens] = useState<string[]>([]);
  const [spicinessLevel, setSpicinessLevel] = useState(0);
  const [challengeLevel, setChallengeLevel] = useState(0);
  const [isRecommended, setIsRecommended] = useState(false);
  const [optionGroups, setOptionGroups] = useState<OptionGroupForm[]>([]);

  // Fetch categories
  const { data: categories = [] } = useQuery({
    queryKey: ['admin-categories'],
    queryFn: getCategories,
  });

  // Fetch existing menu if editing
  const { data: existingMenu, isLoading: menuLoading } = useQuery({
    queryKey: ['admin-menu', id],
    queryFn: () => getMenu(id!),
    enabled: isEditing,
  });

  // Populate form when editing
  useEffect(() => {
    if (!existingMenu) return;
    setCategoryId(existingMenu.category_id);
    const locale = existingMenu.locales['en'] || Object.values(existingMenu.locales)[0];
    setName(locale?.name || '');
    setDescription(locale?.description || '');
    setBasePrice(String(existingMenu.base_price));
    setImageUrl(existingMenu.image_url || '');
    setDietaryTags([...existingMenu.dietary_tags]);
    setAllergens([...existingMenu.allergens]);
    setSpicinessLevel(existingMenu.spiciness_level);
    setChallengeLevel(existingMenu.challenge_level);
    setIsRecommended(existingMenu.is_recommended);

    // Map option groups
    const groups: OptionGroupForm[] = existingMenu.options.map((og: MenuOptionGroup) => ({
      tempId: og.id,
      group_name: og.locales['en']?.group_name || Object.values(og.locales)[0]?.group_name || '',
      is_required: og.is_required,
      max_select: String(og.max_select),
      values: og.values.map((v) => ({
        tempId: v.id,
        label: v.locales['en']?.label || Object.values(v.locales)[0]?.label || '',
        price_delta: String(v.price_delta),
      })),
    }));
    setOptionGroups(groups);
  }, [existingMenu]);

  // Set first category as default
  useEffect(() => {
    if (!categoryId && categories.length > 0 && !isEditing) {
      setCategoryId(categories[0].id);
    }
  }, [categories, categoryId, isEditing]);

  // Create / Update mutations
  const saveMutation = useMutation({
    mutationFn: (data: CreateMenuData) => {
      if (isEditing && id) {
        return updateMenu(id, data);
      }
      return createMenu(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-menus'] });
      if (isEditing && id) {
        queryClient.invalidateQueries({ queryKey: ['admin-menu', id] });
      }
      navigate('/admin/menu');
    },
  });

  const toggleTag = (tag: string, current: string[], setter: React.Dispatch<React.SetStateAction<string[]>>) => {
    if (current.includes(tag)) {
      setter(current.filter((t) => t !== tag));
    } else {
      setter([...current, tag]);
    }
  };

  const addOptionGroup = () => {
    setOptionGroups([
      ...optionGroups,
      {
        tempId: generateTempId(),
        group_name: '',
        is_required: false,
        max_select: '1',
        values: [{ tempId: generateTempId(), label: '', price_delta: '0' }],
      },
    ]);
  };

  const removeOptionGroup = (tempId: string) => {
    setOptionGroups(optionGroups.filter((g) => g.tempId !== tempId));
  };

  const updateOptionGroup = (tempId: string, field: keyof OptionGroupForm, value: string | boolean) => {
    setOptionGroups(
      optionGroups.map((g) =>
        g.tempId === tempId ? { ...g, [field]: value } : g,
      ),
    );
  };

  const addOptionValue = (groupTempId: string) => {
    setOptionGroups(
      optionGroups.map((g) =>
        g.tempId === groupTempId
          ? {
              ...g,
              values: [
                ...g.values,
                { tempId: generateTempId(), label: '', price_delta: '0' },
              ],
            }
          : g,
      ),
    );
  };

  const removeOptionValue = (groupTempId: string, valueTempId: string) => {
    setOptionGroups(
      optionGroups.map((g) =>
        g.tempId === groupTempId
          ? { ...g, values: g.values.filter((v) => v.tempId !== valueTempId) }
          : g,
      ),
    );
  };

  const updateOptionValue = (
    groupTempId: string,
    valueTempId: string,
    field: keyof OptionValueForm,
    value: string,
  ) => {
    setOptionGroups(
      optionGroups.map((g) =>
        g.tempId === groupTempId
          ? {
              ...g,
              values: g.values.map((v) =>
                v.tempId === valueTempId ? { ...v, [field]: value } : v,
              ),
            }
          : g,
      ),
    );
  };

  const handleSave = () => {
    const price = parseInt(basePrice, 10);
    if (!categoryId || !name.trim() || isNaN(price)) return;

    const data: CreateMenuData = {
      category_id: categoryId,
      base_price: price,
      image_url: imageUrl.trim() || undefined,
      is_recommended: isRecommended,
      dietary_tags: dietaryTags,
      allergens,
      spiciness_level: spicinessLevel,
      challenge_level: challengeLevel,
      locales: {
        en: {
          name: name.trim(),
          description: description.trim() || undefined,
        },
      },
      options: optionGroups
        .filter((g) => g.group_name.trim() && g.values.some((v) => v.label.trim()))
        .map((g) => ({
          locales: { en: { group_name: g.group_name.trim() } },
          is_required: g.is_required,
          max_select: parseInt(g.max_select, 10) || 1,
          values: g.values
            .filter((v) => v.label.trim())
            .map((v) => ({
              locales: { en: { label: v.label.trim() } },
              price_delta: parseInt(v.price_delta, 10) || 0,
            })),
        })),
    };

    saveMutation.mutate(data);
  };

  if (isEditing && menuLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Spinner size="lg" />
      </div>
    );
  }

  const getCategoryName = (cat: CategoryDTO): string => {
    return cat.locales['en']?.name || Object.values(cat.locales)[0]?.name || 'Unnamed';
  };

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
          <h1 className="text-lg font-bold text-surface-dark">
            {isEditing ? t('admin.edit_menu_item') : t('admin.new_menu_item')}
          </h1>
        </div>
      </div>

      {/* Form content */}
      <div className="flex-1 px-4 md:px-6 py-4 max-w-2xl">
        <div className="flex flex-col gap-5">
          {/* Category */}
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-gray-700">{t('admin.category')}</label>
            <select
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            >
              <option value="">{t('admin.select_category')}</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {getCategoryName(cat)}
                </option>
              ))}
            </select>
          </div>

          {/* Name */}
          <Input
            label={t('admin.menu_name_en')}
            placeholder={t('admin.menu_name_placeholder')}
            value={name}
            onChange={(e) => setName(e.target.value)}
          />

          {/* Description */}
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-gray-700">{t('admin.description_en')}</label>
            <textarea
              placeholder={t('admin.description_placeholder')}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none placeholder:text-gray-400"
            />
          </div>

          {/* Price */}
          <Input
            label={t('admin.base_price')}
            type="number"
            min={0}
            step={1}
            placeholder={t('admin.base_price_placeholder')}
            value={basePrice}
            onChange={(e) => setBasePrice(e.target.value)}
            icon="attach_money"
          />

          {/* Image */}
          <ImagePicker
            value={imageUrl}
            onChange={setImageUrl}
            menuName={name}
            menuDescription={description}
          />

          {/* Dietary tags */}
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium text-gray-700">{t('admin.dietary_tags')}</label>
            <div className="flex flex-wrap gap-2">
              {DIETARY_TAGS.map((tag) => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => toggleTag(tag, dietaryTags, setDietaryTags)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                    dietaryTags.includes(tag)
                      ? 'bg-primary-500 text-white border-primary-500'
                      : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'
                  }`}
                >
                  {tag.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}
                </button>
              ))}
            </div>
          </div>

          {/* Allergens */}
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium text-gray-700">{t('admin.allergens_label')}</label>
            <div className="flex flex-wrap gap-2">
              {ALLERGEN_LIST.map((allergen) => (
                <button
                  key={allergen}
                  type="button"
                  onClick={() => toggleTag(allergen, allergens, setAllergens)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                    allergens.includes(allergen)
                      ? 'bg-red-500 text-white border-red-500'
                      : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'
                  }`}
                >
                  {allergen.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}
                </button>
              ))}
            </div>
          </div>

          {/* Spiciness level */}
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium text-gray-700">
              {t('admin.spiciness_level', { level: spicinessLevel })}
            </label>
            <input
              type="range"
              min={0}
              max={5}
              step={1}
              value={spicinessLevel}
              onChange={(e) => setSpicinessLevel(parseInt(e.target.value, 10))}
              className="w-full accent-primary-500"
            />
            <div className="flex justify-between text-[10px] text-gray-400 px-1">
              <span>{t('admin.spiciness_none')}</span>
              <span>{t('admin.spiciness_mild')}</span>
              <span>{t('admin.spiciness_medium')}</span>
              <span>{t('admin.spiciness_hot')}</span>
              <span>{t('admin.spiciness_very_hot')}</span>
              <span>{t('admin.spiciness_extreme')}</span>
            </div>
          </div>

          {/* Challenge level */}
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium text-gray-700">
              {t('admin.challenge_level', { level: challengeLevel })}
            </label>
            <input
              type="range"
              min={0}
              max={5}
              step={1}
              value={challengeLevel}
              onChange={(e) => setChallengeLevel(parseInt(e.target.value, 10))}
              className="w-full accent-primary-500"
            />
            <div className="flex justify-between text-[10px] text-gray-400 px-1">
              <span>{t('admin.challenge_none')}</span>
              <span>{t('admin.challenge_easy')}</span>
              <span>{t('admin.challenge_moderate')}</span>
              <span>{t('admin.challenge_adventurous')}</span>
              <span>{t('admin.challenge_brave')}</span>
              <span>{t('admin.challenge_expert')}</span>
            </div>
          </div>

          {/* Recommended toggle */}
          <Toggle
            checked={isRecommended}
            onChange={setIsRecommended}
            label={t('admin.is_recommended')}
          />

          {/* Option Groups */}
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-gray-700">{t('admin.option_groups')}</label>
              <Button
                variant="ghost"
                size="sm"
                icon="add"
                onClick={addOptionGroup}
              >
                {t('admin.add_group')}
              </Button>
            </div>

            {optionGroups.map((group) => (
              <Card key={group.tempId} padding="md" className="border-2 border-gray-200">
                <div className="flex flex-col gap-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <Input
                        label={t('admin.group_name')}
                        placeholder={t('admin.group_name_placeholder')}
                        value={group.group_name}
                        onChange={(e) =>
                          updateOptionGroup(group.tempId, 'group_name', e.target.value)
                        }
                      />
                    </div>
                    <button
                      onClick={() => removeOptionGroup(group.tempId)}
                      className="p-2 rounded-lg hover:bg-red-50 text-red-500 transition-colors mt-6"
                    >
                      <Icon name="delete" size={18} />
                    </button>
                  </div>

                  <div className="flex items-center gap-4">
                    <Toggle
                      checked={group.is_required}
                      onChange={(checked) =>
                        updateOptionGroup(group.tempId, 'is_required', checked)
                      }
                      label={t('admin.required_label')}
                    />
                    <div className="flex items-center gap-2">
                      <label className="text-xs text-gray-500">{t('admin.max_select')}</label>
                      <input
                        type="number"
                        min={1}
                        max={10}
                        value={group.max_select}
                        onChange={(e) =>
                          updateOptionGroup(group.tempId, 'max_select', e.target.value)
                        }
                        className="w-16 px-2 py-1.5 rounded-lg border border-gray-200 text-sm text-center focus:outline-none focus:ring-2 focus:ring-primary-500"
                      />
                    </div>
                  </div>

                  {/* Option values */}
                  <div className="flex flex-col gap-2">
                    <span className="text-xs text-gray-500 font-medium">{t('admin.options_label')}</span>
                    {group.values.map((val) => (
                      <div key={val.tempId} className="flex items-center gap-2">
                        <input
                          type="text"
                          placeholder={t('admin.option_label_placeholder')}
                          value={val.label}
                          onChange={(e) =>
                            updateOptionValue(
                              group.tempId,
                              val.tempId,
                              'label',
                              e.target.value,
                            )
                          }
                          className="flex-1 px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                        />
                        <input
                          type="number"
                          placeholder="+0"
                          value={val.price_delta}
                          onChange={(e) =>
                            updateOptionValue(
                              group.tempId,
                              val.tempId,
                              'price_delta',
                              e.target.value,
                            )
                          }
                          className="w-24 px-3 py-2 rounded-lg border border-gray-200 text-sm text-center focus:outline-none focus:ring-2 focus:ring-primary-500"
                          title={t('admin.price_delta_title')}
                        />
                        <button
                          onClick={() =>
                            removeOptionValue(group.tempId, val.tempId)
                          }
                          className="p-1.5 rounded-lg hover:bg-red-50 text-red-400 transition-colors"
                        >
                          <Icon name="close" size={16} />
                        </button>
                      </div>
                    ))}
                    <button
                      onClick={() => addOptionValue(group.tempId)}
                      className="flex items-center gap-1 text-xs text-primary-500 font-medium hover:text-primary-600 transition-colors self-start mt-1"
                    >
                      <Icon name="add" size={14} />
                      {t('admin.add_option')}
                    </button>
                  </div>
                </div>
              </Card>
            ))}
          </div>

          {/* Error */}
          {saveMutation.isError && (
            <div className="flex items-center gap-2 p-3 rounded-xl bg-red-50 border border-red-100">
              <Icon name="error" size={18} className="text-red-500" />
              <p className="text-sm text-red-600">
                {saveMutation.error instanceof Error
                  ? saveMutation.error.message
                  : t('admin.failed_save')}
              </p>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center gap-3 pt-2 pb-8">
            <Button
              variant="ghost"
              size="lg"
              onClick={() => navigate('/admin/menu')}
            >
              {t('common.cancel')}
            </Button>
            <Button
              variant="primary"
              size="lg"
              fullWidth
              loading={saveMutation.isPending}
              onClick={handleSave}
              disabled={!categoryId || !name.trim() || !basePrice}
            >
              {isEditing ? t('admin.save_changes') : t('admin.create_menu_item')}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MenuEditorPage;
