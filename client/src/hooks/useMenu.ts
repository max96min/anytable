import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import api from '@/lib/api';
import type { MenuDTO, CategoryDTO } from '@anytable/shared';
import i18n from '@/i18n';

interface MenuWithCategories {
  categories: CategoryDTO[];
  menus: MenuDTO[];
}

export function useMenu(storeId: string | null | undefined) {
  const query = useQuery<MenuWithCategories>({
    queryKey: ['menu', storeId],
    queryFn: () => api.get<MenuWithCategories>(`/api/public/stores/${storeId}/menu`),
    enabled: Boolean(storeId),
  });

  const filterMenu = useMemo(() => {
    return (options: {
      categoryId?: string | null;
      search?: string;
      excludeAllergens?: string[];
      dietaryTags?: string[];
    }) => {
      if (!query.data) return [];

      let items = query.data.menus.filter((m) => !m.is_hidden);
      const lang = i18n.language;

      if (options.categoryId) {
        items = items.filter((m) => m.category_id === options.categoryId);
      }

      if (options.search) {
        const term = options.search.toLowerCase();
        items = items.filter((m) => {
          const locale = m.locales[lang] || m.locales['en'];
          if (!locale) return false;
          const nameMatch = locale.name.toLowerCase().includes(term);
          const descMatch = locale.description?.toLowerCase().includes(term) ?? false;
          // Also search in all locale names for cross-language search
          const anyLocaleMatch = Object.values(m.locales).some(
            (l) =>
              l.name.toLowerCase().includes(term) ||
              (l.description?.toLowerCase().includes(term) ?? false),
          );
          return nameMatch || descMatch || anyLocaleMatch;
        });
      }

      if (options.excludeAllergens && options.excludeAllergens.length > 0) {
        items = items.filter(
          (m) => !m.allergens.some((a) => options.excludeAllergens!.includes(a)),
        );
      }

      if (options.dietaryTags && options.dietaryTags.length > 0) {
        items = items.filter((m) =>
          options.dietaryTags!.every((tag) => m.dietary_tags.includes(tag)),
        );
      }

      return items;
    };
  }, [query.data]);

  return {
    categories: query.data?.categories ?? [],
    menus: query.data?.menus.filter((m) => !m.is_hidden) ?? [],
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
    filterMenu,
  };
}

export function useMenuDetail(storeId: string | null | undefined, menuId: string | null | undefined) {
  return useQuery<MenuDTO>({
    queryKey: ['menu-detail', storeId, menuId],
    queryFn: () => api.get<MenuDTO>(`/api/public/stores/${storeId}/menu/${menuId}`),
    enabled: Boolean(storeId) && Boolean(menuId),
  });
}
