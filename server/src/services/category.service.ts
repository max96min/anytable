import { prisma } from '../lib/prisma.js';
import { AppError } from '../lib/errors.js';

export async function getByStore(storeId: string) {
  const categories = await prisma.category.findMany({
    where: { store_id: storeId },
    orderBy: { sort_order: 'asc' },
    select: {
      id: true,
      store_id: true,
      sort_order: true,
      locales: true,
      is_active: true,
    },
  });

  return categories;
}

export async function getById(id: string) {
  const category = await prisma.category.findUnique({
    where: { id },
    select: {
      id: true,
      store_id: true,
      sort_order: true,
      locales: true,
      is_active: true,
    },
  });

  if (!category) {
    throw AppError.notFound('Category not found');
  }

  return category;
}

export async function create(storeId: string, data: {
  locales: Record<string, { name: string }>;
  sort_order?: number;
}) {
  const category = await prisma.category.create({
    data: {
      store_id: storeId,
      locales: data.locales,
      sort_order: data.sort_order ?? 0,
    },
    select: {
      id: true,
      store_id: true,
      sort_order: true,
      locales: true,
      is_active: true,
    },
  });

  return category;
}

export async function update(id: string, storeId: string, data: {
  locales?: Record<string, { name: string }>;
  sort_order?: number;
  is_active?: boolean;
}) {
  // Verify category belongs to store
  const existing = await prisma.category.findUnique({
    where: { id },
    select: { store_id: true },
  });

  if (!existing) {
    throw AppError.notFound('Category not found');
  }

  if (existing.store_id !== storeId) {
    throw AppError.forbidden('Category does not belong to your store');
  }

  const category = await prisma.category.update({
    where: { id },
    data: {
      ...(data.locales !== undefined && { locales: data.locales }),
      ...(data.sort_order !== undefined && { sort_order: data.sort_order }),
      ...(data.is_active !== undefined && { is_active: data.is_active }),
    },
    select: {
      id: true,
      store_id: true,
      sort_order: true,
      locales: true,
      is_active: true,
    },
  });

  return category;
}

export async function remove(id: string, storeId: string) {
  const existing = await prisma.category.findUnique({
    where: { id },
    select: { store_id: true },
  });

  if (!existing) {
    throw AppError.notFound('Category not found');
  }

  if (existing.store_id !== storeId) {
    throw AppError.forbidden('Category does not belong to your store');
  }

  // Check for menus in this category
  const menuCount = await prisma.menu.count({
    where: { category_id: id },
  });

  if (menuCount > 0) {
    throw AppError.conflict(
      'Cannot delete category with existing menu items. Move or delete items first.',
      'CATEGORY_HAS_MENUS'
    );
  }

  await prisma.category.delete({ where: { id } });
}

export async function reorder(storeId: string, order: Array<{ id: string; sort_order: number }>) {
  await prisma.$transaction(
    order.map((item) =>
      prisma.category.updateMany({
        where: { id: item.id, store_id: storeId },
        data: { sort_order: item.sort_order },
      })
    )
  );
}
