import React, { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { MenuDTO, CategoryDTO, SupportedLanguage } from '@anytable/shared';
import { SUPPORTED_LANGUAGES } from '@anytable/shared';
import { getMenus, getCategories, updateMenu, deleteMenu } from '@/lib/admin-api';
import { useAdminCurrency } from '@/hooks/useAdminCurrency';
import Card from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import Icon from '@/components/ui/Icon';
import Spinner from '@/components/ui/Spinner';
import Modal from '@/components/ui/Modal';

type SortKey = 'name' | 'price' | 'category';

const MenuManagementPage: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { format: fp } = useAdminCurrency();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<SortKey>('name');
  const [confirmDelete, setConfirmDelete] = useState<MenuDTO | null>(null);

  // Fetch data
  const { data: menus = [], isLoading: menusLoading } = useQuery({
    queryKey: ['admin-menus'],
    queryFn: getMenus,
  });

  const { data: categories = [] } = useQuery({
    queryKey: ['admin-categories'],
    queryFn: getCategories,
  });

  // Category map
  const categoryMap = useMemo(() => {
    const map: Record<string, CategoryDTO> = {};
    for (const cat of categories) {
      map[cat.id] = cat;
    }
    return map;
  }, [categories]);

  // Toggle sold out
  const soldOutMutation = useMutation({
    mutationFn: ({ id, is_sold_out }: { id: string; is_sold_out: boolean }) =>
      updateMenu(id, { is_sold_out }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-menus'] });
    },
  });

  // Delete menu
  const deleteMutation = useMutation({
    mutationFn: deleteMenu,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-menus'] });
      setConfirmDelete(null);
    },
  });

  // Filter and sort
  const filteredMenus = useMemo(() => {
    let result = [...menus];

    // Category filter
    if (selectedCategory) {
      result = result.filter((m) => m.category_id === selectedCategory);
    }

    // Search
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter((m) => {
        const locales = Object.values(m.locales);
        return locales.some(
          (l) =>
            l.name.toLowerCase().includes(q) ||
            (l.description && l.description.toLowerCase().includes(q)),
        );
      });
    }

    // Sort
    result.sort((a, b) => {
      switch (sortBy) {
        case 'name': {
          const nameA = (a.locales['en']?.name || Object.values(a.locales)[0]?.name || '').toLowerCase();
          const nameB = (b.locales['en']?.name || Object.values(b.locales)[0]?.name || '').toLowerCase();
          return nameA.localeCompare(nameB);
        }
        case 'price':
          return a.base_price - b.base_price;
        case 'category': {
          const catA = categoryMap[a.category_id]?.sort_order ?? 999;
          const catB = categoryMap[b.category_id]?.sort_order ?? 999;
          return catA - catB;
        }
        default:
          return 0;
      }
    });

    return result;
  }, [menus, selectedCategory, searchQuery, sortBy, categoryMap]);

  const getTranslationProgress = (menu: MenuDTO): { count: number; total: number } => {
    const total = SUPPORTED_LANGUAGES.length;
    const count = SUPPORTED_LANGUAGES.filter(
      (lang: SupportedLanguage) => menu.locales[lang]?.name,
    ).length;
    return { count, total };
  };

  const getMenuName = (menu: MenuDTO): string => {
    return menu.locales['en']?.name || Object.values(menu.locales)[0]?.name || 'Untitled';
  };

  const getCategoryName = (categoryId: string): string => {
    const cat = categoryMap[categoryId];
    if (!cat) return 'Uncategorized';
    return cat.locales['en']?.name || Object.values(cat.locales)[0]?.name || 'Uncategorized';
  };

  return (
    <div className="flex flex-col min-h-full">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 py-4 md:px-6">
        <div className="flex items-center justify-between">
          <h1 className="text-lg font-bold text-surface-dark">
            {t('admin.menu_management')}
          </h1>
          <Button
            variant="primary"
            size="sm"
            icon="add"
            onClick={() => navigate('/admin/menu/new')}
          >
            {t('admin.add_menu')}
          </Button>
        </div>

        {/* Search bar */}
        <div className="mt-3 relative">
          <Icon
            name="search"
            size={18}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
          />
          <input
            type="text"
            placeholder={t('admin.search_menu_placeholder')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2"
            >
              <Icon name="close" size={18} className="text-gray-400" />
            </button>
          )}
        </div>

        {/* Category filter chips */}
        <div className="flex gap-2 mt-3 overflow-x-auto no-scrollbar pb-1">
          <button
            onClick={() => setSelectedCategory(null)}
            className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
              !selectedCategory
                ? 'bg-primary-500 text-white border-primary-500'
                : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'
            }`}
          >
            {t('admin.all_categories')}
          </button>
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() =>
                setSelectedCategory(selectedCategory === cat.id ? null : cat.id)
              }
              className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                selectedCategory === cat.id
                  ? 'bg-primary-500 text-white border-primary-500'
                  : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'
              }`}
            >
              {cat.locales['en']?.name || Object.values(cat.locales)[0]?.name}
            </button>
          ))}
        </div>

        {/* Sort */}
        <div className="flex items-center gap-2 mt-3">
          <span className="text-xs text-gray-500">{t('admin.sort_by')}</span>
          {(['name', 'price', 'category'] as SortKey[]).map((key) => (
            <button
              key={key}
              onClick={() => setSortBy(key)}
              className={`text-xs px-2 py-1 rounded-lg transition-colors ${
                sortBy === key
                  ? 'bg-primary-50 text-primary-600 font-medium'
                  : 'text-gray-500 hover:bg-gray-100'
              }`}
            >
              {t(`admin.sort_${key}`)}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 px-4 md:px-6 py-4">
        {menusLoading ? (
          <div className="flex items-center justify-center py-20">
            <Spinner size="lg" />
          </div>
        ) : filteredMenus.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-2">
            <Icon name="restaurant_menu" size={48} className="text-gray-300" />
            <p className="text-sm text-gray-500">
              {searchQuery ? t('admin.no_menus_search') : t('admin.no_menu_items')}
            </p>
            {!searchQuery && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate('/admin/menu/new')}
              >
                {t('admin.create_first_menu')}
              </Button>
            )}
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {filteredMenus.map((menu) => {
              const progress = getTranslationProgress(menu);
              return (
                <Card key={menu.id} padding="none" className="overflow-hidden">
                  {/* Image */}
                  <div className="relative h-36 bg-gray-100">
                    {menu.image_url ? (
                      <img
                        src={menu.image_url}
                        alt={getMenuName(menu)}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="flex items-center justify-center h-full">
                        <Icon name="image" size={40} className="text-gray-300" />
                      </div>
                    )}
                    {/* Status badges overlay */}
                    <div className="absolute top-2 left-2 flex gap-1 flex-wrap">
                      {menu.is_sold_out && (
                        <Badge variant="red" size="sm">{t('admin.sold_out')}</Badge>
                      )}
                      {menu.is_hidden && (
                        <Badge variant="gray" size="sm">{t('admin.hidden')}</Badge>
                      )}
                      {menu.is_recommended && (
                        <Badge variant="orange" size="sm">{t('admin.recommended')}</Badge>
                      )}
                    </div>
                  </div>

                  {/* Info */}
                  <div className="px-4 py-3">
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <h3 className="text-sm font-semibold text-surface-dark truncate">
                          {getMenuName(menu)}
                        </h3>
                        <span className="text-sm font-bold text-primary-500 mt-0.5 block">
                          {fp(menu.base_price)}
                        </span>
                      </div>
                      <Badge variant="gray" size="sm" className="shrink-0 ml-2">
                        {getCategoryName(menu.category_id)}
                      </Badge>
                    </div>

                    {/* Translation progress */}
                    <div className="flex items-center gap-2 mt-2">
                      <Icon name="translate" size={14} className="text-gray-400" />
                      <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${
                            progress.count === progress.total
                              ? 'bg-green-500'
                              : 'bg-primary-400'
                          }`}
                          style={{
                            width: `${(progress.count / progress.total) * 100}%`,
                          }}
                        />
                      </div>
                      <span className="text-[10px] text-gray-400">
                        {t('admin.translation_progress', { count: progress.count, total: progress.total })}
                      </span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1 px-3 py-2 bg-gray-50 border-t border-gray-100">
                    <button
                      onClick={() => {
                        soldOutMutation.mutate({
                          id: menu.id,
                          is_sold_out: !menu.is_sold_out,
                        });
                      }}
                      className={`flex items-center gap-1 px-2 py-1.5 rounded-lg text-xs transition-colors ${
                        menu.is_sold_out
                          ? 'text-green-600 hover:bg-green-50'
                          : 'text-red-600 hover:bg-red-50'
                      }`}
                      title={menu.is_sold_out ? 'Mark Available' : 'Mark Sold Out'}
                    >
                      <Icon
                        name={menu.is_sold_out ? 'check_circle' : 'block'}
                        size={16}
                      />
                      {menu.is_sold_out ? t('admin.mark_available') : t('admin.mark_sold_out')}
                    </button>
                    <button
                      onClick={() => navigate(`/admin/menu/${menu.id}/translations`)}
                      className="flex items-center gap-1 px-2 py-1.5 rounded-lg text-xs text-gray-600 hover:bg-gray-200 transition-colors"
                      title="Translations"
                    >
                      <Icon name="translate" size={16} />
                      {t('admin.translate')}
                    </button>
                    <button
                      onClick={() => navigate(`/admin/menu/${menu.id}`)}
                      className="flex items-center gap-1 px-2 py-1.5 rounded-lg text-xs text-gray-600 hover:bg-gray-200 transition-colors ml-auto"
                      title="Edit"
                    >
                      <Icon name="edit" size={16} />
                      {t('admin.edit')}
                    </button>
                    <button
                      onClick={() => setConfirmDelete(menu)}
                      className="flex items-center gap-1 px-2 py-1.5 rounded-lg text-xs text-red-600 hover:bg-red-50 transition-colors"
                      title="Delete"
                    >
                      <Icon name="delete" size={16} />
                    </button>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Confirm Delete Modal */}
      <Modal
        open={!!confirmDelete}
        onClose={() => setConfirmDelete(null)}
        title={t('admin.delete_menu_title')}
      >
        <div className="flex flex-col gap-4">
          <p className="text-sm text-gray-600">
            {t('admin.delete_menu_confirm', { name: confirmDelete ? getMenuName(confirmDelete) : '' })}
          </p>
          {deleteMutation.isError && (
            <p className="text-sm text-red-500">
              {deleteMutation.error instanceof Error
                ? deleteMutation.error.message
                : t('admin.failed_delete')}
            </p>
          )}
          <div className="flex gap-2 justify-end">
            <Button variant="ghost" size="sm" onClick={() => setConfirmDelete(null)}>
              {t('common.cancel')}
            </Button>
            <Button
              variant="danger"
              size="sm"
              loading={deleteMutation.isPending}
              onClick={() => {
                if (confirmDelete) deleteMutation.mutate(confirmDelete.id);
              }}
            >
              {t('common.delete')}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default MenuManagementPage;
