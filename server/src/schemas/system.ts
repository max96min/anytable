import { z } from 'zod';

// ============ Auth ============

export const systemLoginSchema = z.object({
  body: z.object({
    email: z.string().email('Invalid email address'),
    password: z.string().min(1, 'Password is required'),
  }),
});

export const systemRefreshTokenSchema = z.object({
  body: z.object({
    refresh_token: z.string().min(1, 'Refresh token is required'),
  }),
});

// ============ Pagination / Filters ============

export const systemStoresQuerySchema = z.object({
  query: z.object({
    search: z.string().optional(),
    is_active: z.coerce.boolean().optional(),
    limit: z.coerce.number().int().min(1).max(100).optional().default(50),
    offset: z.coerce.number().int().min(0).optional().default(0),
  }),
});

export const systemStoreIdParamSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid store ID'),
  }),
});

export const systemOwnersQuerySchema = z.object({
  query: z.object({
    search: z.string().optional(),
    is_active: z.coerce.boolean().optional(),
    limit: z.coerce.number().int().min(1).max(100).optional().default(50),
    offset: z.coerce.number().int().min(0).optional().default(0),
  }),
});

export const systemOwnerIdParamSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid owner ID'),
  }),
});

// ============ Create Owner + Store ============

export const createOwnerStoreSchema = z.object({
  body: z.object({
    email: z.string().email('Invalid email address'),
    password: z.string().min(8, 'Password must be at least 8 characters'),
    name: z.string().min(1, 'Name is required').max(100),
    store_name: z.string().min(1, 'Store name is required').max(200),
  }),
});
