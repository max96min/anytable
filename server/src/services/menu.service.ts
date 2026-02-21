import { prisma } from '../lib/prisma.js';
import { AppError } from '../lib/errors.js';

export async function getByStore(storeId: string, filters: {
  category_id?: string;
  is_recommended?: boolean;
  search?: string;
} = {}) {
  const where: Record<string, unknown> = {
    store_id: storeId,
    is_hidden: false,
  };

  if (filters.category_id) {
    where.category_id = filters.category_id;
  }

  if (filters.is_recommended !== undefined) {
    where.is_recommended = filters.is_recommended;
  }

  const menus = await prisma.menu.findMany({
    where,
    include: {
      options: {
        orderBy: { sort_order: 'asc' },
      },
    },
    orderBy: [{ sort_order: 'asc' }, { created_at: 'asc' }],
  });

  return menus.map(formatMenu);
}

export async function getById(id: string) {
  const menu = await prisma.menu.findUnique({
    where: { id },
    include: {
      options: {
        orderBy: { sort_order: 'asc' },
      },
    },
  });

  if (!menu) {
    throw AppError.notFound('Menu item not found');
  }

  return formatMenu(menu);
}

export async function getByIdForAdmin(id: string, storeId: string) {
  const menu = await prisma.menu.findUnique({
    where: { id },
    include: {
      options: {
        orderBy: { sort_order: 'asc' },
      },
    },
  });

  if (!menu) {
    throw AppError.notFound('Menu item not found');
  }

  if (menu.store_id !== storeId) {
    throw AppError.forbidden('Menu item does not belong to your store');
  }

  return formatMenu(menu);
}

export async function create(storeId: string, data: {
  category_id: string;
  base_price: number;
  image_url?: string | null;
  is_sold_out?: boolean;
  is_recommended?: boolean;
  is_hidden?: boolean;
  dietary_tags?: string[];
  allergens?: string[];
  spiciness_level?: number;
  challenge_level?: number;
  locales: Record<string, unknown>;
  sort_order?: number;
  options?: Array<{
    locales: Record<string, unknown>;
    is_required?: boolean;
    max_select?: number;
    values: Array<{
      id?: string;
      locales: Record<string, unknown>;
      price_delta?: number;
    }>;
    sort_order?: number;
  }>;
}) {
  // Verify category belongs to store
  const category = await prisma.category.findUnique({
    where: { id: data.category_id },
    select: { store_id: true },
  });

  if (!category) {
    throw AppError.notFound('Category not found');
  }

  if (category.store_id !== storeId) {
    throw AppError.forbidden('Category does not belong to your store');
  }

  const { options, ...menuData } = data;

  const menu = await prisma.menu.create({
    data: {
      store_id: storeId,
      category_id: menuData.category_id,
      base_price: menuData.base_price,
      image_url: menuData.image_url ?? null,
      is_sold_out: menuData.is_sold_out ?? false,
      is_recommended: menuData.is_recommended ?? false,
      is_hidden: menuData.is_hidden ?? false,
      dietary_tags: menuData.dietary_tags ?? [],
      allergens: menuData.allergens ?? [],
      spiciness_level: menuData.spiciness_level ?? 0,
      challenge_level: menuData.challenge_level ?? 0,
      locales: menuData.locales as object,
      sort_order: menuData.sort_order ?? 0,
      options: options && options.length > 0
        ? {
            create: options.map((opt, idx) => ({
              locales: opt.locales as object,
              is_required: opt.is_required ?? false,
              max_select: opt.max_select ?? 1,
              values: opt.values.map((v) => ({
                id: v.id,
                locales: v.locales,
                price_delta: v.price_delta ?? 0,
              })) as unknown as object,
              sort_order: opt.sort_order ?? idx,
            })),
          }
        : undefined,
    },
    include: {
      options: {
        orderBy: { sort_order: 'asc' },
      },
    },
  });

  return formatMenu(menu as Parameters<typeof formatMenu>[0]);
}

export async function update(id: string, storeId: string, data: {
  category_id?: string;
  base_price?: number;
  image_url?: string | null;
  is_sold_out?: boolean;
  is_recommended?: boolean;
  is_hidden?: boolean;
  dietary_tags?: string[];
  allergens?: string[];
  spiciness_level?: number;
  challenge_level?: number;
  locales?: Record<string, unknown>;
  sort_order?: number;
  options?: Array<{
    id?: string;
    locales: Record<string, unknown>;
    is_required?: boolean;
    max_select?: number;
    values: Array<{
      id?: string;
      locales: Record<string, unknown>;
      price_delta?: number;
    }>;
    sort_order?: number;
  }>;
}) {
  const existing = await prisma.menu.findUnique({
    where: { id },
    select: { store_id: true },
  });

  if (!existing) {
    throw AppError.notFound('Menu item not found');
  }

  if (existing.store_id !== storeId) {
    throw AppError.forbidden('Menu item does not belong to your store');
  }

  if (data.category_id) {
    const category = await prisma.category.findUnique({
      where: { id: data.category_id },
      select: { store_id: true },
    });
    if (!category || category.store_id !== storeId) {
      throw AppError.badRequest('Invalid category');
    }
  }

  const { options, ...menuData } = data;

  const menu = await prisma.$transaction(async (tx) => {
    // Update menu fields
    const updatePayload: Record<string, unknown> = {};
    if (menuData.category_id !== undefined) updatePayload.category_id = menuData.category_id;
    if (menuData.base_price !== undefined) updatePayload.base_price = menuData.base_price;
    if (menuData.image_url !== undefined) updatePayload.image_url = menuData.image_url;
    if (menuData.is_sold_out !== undefined) updatePayload.is_sold_out = menuData.is_sold_out;
    if (menuData.is_recommended !== undefined) updatePayload.is_recommended = menuData.is_recommended;
    if (menuData.is_hidden !== undefined) updatePayload.is_hidden = menuData.is_hidden;
    if (menuData.dietary_tags !== undefined) updatePayload.dietary_tags = menuData.dietary_tags;
    if (menuData.allergens !== undefined) updatePayload.allergens = menuData.allergens;
    if (menuData.spiciness_level !== undefined) updatePayload.spiciness_level = menuData.spiciness_level;
    if (menuData.challenge_level !== undefined) updatePayload.challenge_level = menuData.challenge_level;
    if (menuData.locales !== undefined) updatePayload.locales = menuData.locales;
    if (menuData.sort_order !== undefined) updatePayload.sort_order = menuData.sort_order;

    await tx.menu.update({
      where: { id },
      data: updatePayload,
    });

    // Replace options if provided
    if (options !== undefined) {
      await tx.menuOption.deleteMany({ where: { menu_id: id } });

      if (options.length > 0) {
        await tx.menuOption.createMany({
          data: options.map((opt, idx) => ({
            menu_id: id,
            locales: opt.locales as object,
            is_required: opt.is_required ?? false,
            max_select: opt.max_select ?? 1,
            values: opt.values.map((v) => ({
              id: v.id,
              locales: v.locales,
              price_delta: v.price_delta ?? 0,
            })) as unknown as object,
            sort_order: opt.sort_order ?? idx,
          })),
        });
      }
    }

    return tx.menu.findUnique({
      where: { id },
      include: {
        options: { orderBy: { sort_order: 'asc' } },
      },
    });
  });

  if (!menu) {
    throw AppError.internal('Failed to update menu');
  }

  return formatMenu(menu);
}

export async function remove(id: string, storeId: string) {
  const existing = await prisma.menu.findUnique({
    where: { id },
    select: { store_id: true },
  });

  if (!existing) {
    throw AppError.notFound('Menu item not found');
  }

  if (existing.store_id !== storeId) {
    throw AppError.forbidden('Menu item does not belong to your store');
  }

  // Cascade will delete options
  await prisma.menu.delete({ where: { id } });
}

// Format raw Prisma menu into DTO shape
function formatMenu(menu: {
  id: string;
  store_id: string;
  category_id: string;
  base_price: number;
  image_url: string | null;
  is_sold_out: boolean;
  is_recommended: boolean;
  is_hidden: boolean;
  dietary_tags: string[];
  allergens: string[];
  spiciness_level: number;
  challenge_level: number;
  locales: unknown;
  sort_order: number;
  options: Array<{
    id: string;
    locales: unknown;
    is_required: boolean;
    max_select: number;
    values: unknown;
    sort_order: number;
  }>;
}) {
  return {
    id: menu.id,
    store_id: menu.store_id,
    category_id: menu.category_id,
    base_price: menu.base_price,
    image_url: menu.image_url ?? undefined,
    is_sold_out: menu.is_sold_out,
    is_recommended: menu.is_recommended,
    is_hidden: menu.is_hidden,
    dietary_tags: menu.dietary_tags,
    allergens: menu.allergens,
    spiciness_level: menu.spiciness_level,
    challenge_level: menu.challenge_level,
    locales: menu.locales as Record<string, unknown>,
    sort_order: menu.sort_order,
    options: menu.options.map((opt) => ({
      id: opt.id,
      locales: opt.locales as Record<string, unknown>,
      is_required: opt.is_required,
      max_select: opt.max_select,
      values: opt.values as Array<{ id: string; locales: Record<string, unknown>; price_delta: number }>,
      sort_order: opt.sort_order,
    })),
  };
}
