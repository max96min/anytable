import { prisma } from '../lib/prisma.js';
import { AppError } from '../lib/errors.js';

export async function getStore(id: string) {
  const store = await prisma.store.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      address: true,
      phone: true,
      default_language: true,
      supported_languages: true,
      settings: true,
      is_active: true,
    },
  });

  if (!store) {
    throw AppError.notFound('Store not found');
  }

  return store;
}

export async function getStoreByOwnerId(ownerId: string) {
  const store = await prisma.store.findFirst({
    where: { owner_id: ownerId },
    select: {
      id: true,
      name: true,
      address: true,
      phone: true,
      default_language: true,
      supported_languages: true,
      settings: true,
      is_active: true,
    },
  });

  if (!store) {
    throw AppError.notFound('Store not found for this owner');
  }

  return store;
}

export async function updateStore(id: string, data: {
  name?: string;
  address?: string | null;
  phone?: string | null;
  default_language?: string;
  supported_languages?: string[];
  settings?: Record<string, unknown>;
}) {
  // If settings are provided, merge with existing
  let updateData: Record<string, unknown> = { ...data };

  if (data.settings) {
    const existing = await prisma.store.findUnique({
      where: { id },
      select: { settings: true },
    });

    if (!existing) {
      throw AppError.notFound('Store not found');
    }

    const currentSettings = (existing.settings as Record<string, unknown>) || {};
    updateData.settings = { ...currentSettings, ...data.settings };
  }

  const store = await prisma.store.update({
    where: { id },
    data: updateData,
    select: {
      id: true,
      name: true,
      address: true,
      phone: true,
      default_language: true,
      supported_languages: true,
      settings: true,
      is_active: true,
    },
  });

  return store;
}
