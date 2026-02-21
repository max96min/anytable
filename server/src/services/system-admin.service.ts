import bcrypt from 'bcryptjs';
import { prisma } from '../lib/prisma.js';
import { AppError } from '../lib/errors.js';

const SALT_ROUNDS = 12;

// ============ Stats ============

export async function getPlatformStats() {
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const [
    totalStores,
    activeStores,
    totalOwners,
    ordersToday,
    revenueResult,
  ] = await Promise.all([
    prisma.store.count(),
    prisma.store.count({ where: { is_active: true } }),
    prisma.owner.count(),
    prisma.order.count({ where: { placed_at: { gte: todayStart } } }),
    prisma.order.aggregate({
      _sum: { grand_total: true },
      where: { placed_at: { gte: todayStart } },
    }),
  ]);

  return {
    total_stores: totalStores,
    active_stores: activeStores,
    total_owners: totalOwners,
    orders_today: ordersToday,
    revenue_today: revenueResult._sum.grand_total ?? 0,
  };
}

export async function getRecentOrders(limit = 10) {
  const orders = await prisma.order.findMany({
    orderBy: { placed_at: 'desc' },
    take: limit,
    include: {
      store: { select: { name: true } },
      table: { select: { table_number: true } },
    },
  });

  return orders.map((o) => ({
    id: o.id,
    store_name: o.store.name,
    table_number: o.table.table_number,
    status: o.status,
    grand_total: o.grand_total,
    placed_at: o.placed_at.toISOString(),
  }));
}

// ============ Stores ============

export async function getStores(params: {
  search?: string;
  is_active?: boolean;
  limit: number;
  offset: number;
}) {
  const where: Record<string, unknown> = {};

  if (params.is_active !== undefined) {
    where.is_active = params.is_active;
  }

  if (params.search) {
    where.OR = [
      { name: { contains: params.search, mode: 'insensitive' } },
      { owner: { name: { contains: params.search, mode: 'insensitive' } } },
      { owner: { email: { contains: params.search, mode: 'insensitive' } } },
    ];
  }

  const [stores, total] = await Promise.all([
    prisma.store.findMany({
      where,
      include: {
        owner: { select: { id: true, name: true, email: true, is_active: true } },
      },
      orderBy: { created_at: 'desc' },
      take: params.limit,
      skip: params.offset,
    }),
    prisma.store.count({ where }),
  ]);

  return {
    items: stores.map((s) => ({
      id: s.id,
      name: s.name,
      is_active: s.is_active,
      created_at: s.created_at.toISOString(),
      owner: s.owner,
    })),
    meta: { total, limit: params.limit, offset: params.offset },
  };
}

export async function getStoreDetail(storeId: string) {
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const store = await prisma.store.findUnique({
    where: { id: storeId },
    include: {
      owner: { select: { id: true, name: true, email: true, is_active: true } },
    },
  });

  if (!store) {
    throw AppError.notFound('Store not found');
  }

  const [tableCount, menuCount, ordersToday, revenueResult] = await Promise.all([
    prisma.table.count({ where: { store_id: storeId } }),
    prisma.menu.count({ where: { store_id: storeId } }),
    prisma.order.count({ where: { store_id: storeId, placed_at: { gte: todayStart } } }),
    prisma.order.aggregate({
      _sum: { grand_total: true },
      where: { store_id: storeId, placed_at: { gte: todayStart } },
    }),
  ]);

  return {
    id: store.id,
    name: store.name,
    address: store.address,
    phone: store.phone,
    is_active: store.is_active,
    default_language: store.default_language,
    supported_languages: store.supported_languages,
    created_at: store.created_at.toISOString(),
    owner: store.owner,
    table_count: tableCount,
    menu_count: menuCount,
    orders_today: ordersToday,
    revenue_today: revenueResult._sum.grand_total ?? 0,
  };
}

export async function toggleStoreActive(storeId: string) {
  const store = await prisma.store.findUnique({ where: { id: storeId } });
  if (!store) {
    throw AppError.notFound('Store not found');
  }

  const updated = await prisma.store.update({
    where: { id: storeId },
    data: { is_active: !store.is_active },
  });

  return { is_active: updated.is_active };
}

// ============ Owners ============

export async function getOwners(params: {
  search?: string;
  is_active?: boolean;
  limit: number;
  offset: number;
}) {
  const where: Record<string, unknown> = {};

  if (params.is_active !== undefined) {
    where.is_active = params.is_active;
  }

  if (params.search) {
    where.OR = [
      { name: { contains: params.search, mode: 'insensitive' } },
      { email: { contains: params.search, mode: 'insensitive' } },
    ];
  }

  const [owners, total] = await Promise.all([
    prisma.owner.findMany({
      where,
      include: {
        stores: { select: { id: true, name: true, is_active: true } },
      },
      orderBy: { created_at: 'desc' },
      take: params.limit,
      skip: params.offset,
    }),
    prisma.owner.count({ where }),
  ]);

  return {
    items: owners.map((o) => ({
      id: o.id,
      name: o.name,
      email: o.email,
      is_active: o.is_active,
      created_at: o.created_at.toISOString(),
      stores: o.stores,
    })),
    meta: { total, limit: params.limit, offset: params.offset },
  };
}

export async function createOwnerWithStore(data: {
  email: string;
  password: string;
  name: string;
  store_name: string;
}) {
  const existing = await prisma.owner.findUnique({ where: { email: data.email } });
  if (existing) {
    throw AppError.conflict('Email already registered', 'EMAIL_TAKEN');
  }

  const passwordHash = await bcrypt.hash(data.password, SALT_ROUNDS);

  const owner = await prisma.owner.create({
    data: {
      email: data.email,
      password_hash: passwordHash,
      name: data.name,
      stores: {
        create: {
          name: data.store_name,
          settings: {
            order_confirm_mode: 'ANYONE',
            session_ttl_minutes: 120,
            allow_additional_orders: true,
            tax_rate: 0.1,
            service_charge_rate: 0,
            tax_included: true,
          },
        },
      },
    },
    include: {
      stores: { select: { id: true, name: true, is_active: true } },
    },
  });

  return {
    id: owner.id,
    name: owner.name,
    email: owner.email,
    is_active: owner.is_active,
    created_at: owner.created_at.toISOString(),
    stores: owner.stores,
  };
}

export async function toggleOwnerActive(ownerId: string) {
  const owner = await prisma.owner.findUnique({ where: { id: ownerId } });
  if (!owner) {
    throw AppError.notFound('Owner not found');
  }

  const updated = await prisma.owner.update({
    where: { id: ownerId },
    data: { is_active: !owner.is_active },
  });

  return { is_active: updated.is_active };
}
