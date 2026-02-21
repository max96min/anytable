import { z } from 'zod';

// ============ Auth ============

export const loginSchema = z.object({
  body: z.object({
    email: z.string().email('Invalid email address'),
    password: z.string().min(1, 'Password is required'),
  }),
});

export const registerSchema = z.object({
  body: z.object({
    email: z.string().email('Invalid email address'),
    password: z.string().min(8, 'Password must be at least 8 characters'),
    name: z.string().min(1, 'Name is required').max(100),
    store_name: z.string().min(1, 'Store name is required').max(200),
  }),
});

export const refreshTokenSchema = z.object({
  body: z.object({
    refresh_token: z.string().min(1, 'Refresh token is required'),
  }),
});

// ============ Session ============

export const joinSessionSchema = z.object({
  body: z.object({
    qr_token: z.string().min(1, 'QR token is required'),
    nickname: z.string().min(1, 'Nickname is required').max(30),
    device_fingerprint: z.string().min(1, 'Device fingerprint is required'),
    language: z.enum(['en', 'ko', 'ja', 'zh', 'es']).optional().default('en'),
  }),
});

export const sessionIdParamSchema = z.object({
  params: z.object({
    sessionId: z.string().uuid('Invalid session ID'),
  }),
});

// ============ Cart ============

export const cartMutationSchema = z.object({
  body: z.object({
    action: z.enum(['ADD', 'UPDATE', 'REMOVE']),
    cart_version: z.number().int().min(1, 'Cart version is required'),
    participant_id: z.string().uuid('Invalid participant ID'),
    item_id: z.string().uuid().optional(),
    menu_id: z.string().uuid().optional(),
    quantity: z.number().int().min(1).optional(),
    selected_options: z
      .array(
        z.object({
          group_id: z.string(),
          value_id: z.string(),
          group_name: z.string(),
          value_label: z.string(),
          price_delta: z.number().int(),
        })
      )
      .optional()
      .default([]),
  }),
});

export const cartIdParamSchema = z.object({
  params: z.object({
    cartId: z.string().uuid('Invalid cart ID'),
  }),
});

// ============ Order ============

export const placeOrderSchema = z.object({
  body: z.object({
    participant_id: z.string().uuid('Invalid participant ID'),
    cart_version: z.number().int().min(1),
    idempotency_key: z.string().min(1, 'Idempotency key is required'),
  }),
});

export const updateOrderStatusSchema = z.object({
  body: z.object({
    status: z.enum(['PLACED', 'ACCEPTED', 'PREPARING', 'READY', 'SERVED', 'CANCELLED']),
  }),
  params: z.object({
    id: z.string().uuid('Invalid order ID'),
  }),
});

// ============ Category ============

export const createCategorySchema = z.object({
  body: z.object({
    locales: z.record(z.string(), z.object({ name: z.string().min(1) })),
    sort_order: z.number().int().optional().default(0),
  }),
});

export const updateCategorySchema = z.object({
  body: z.object({
    locales: z.record(z.string(), z.object({ name: z.string().min(1) })).optional(),
    sort_order: z.number().int().optional(),
    is_active: z.boolean().optional(),
  }),
  params: z.object({
    id: z.string().uuid('Invalid category ID'),
  }),
});

export const reorderCategoriesSchema = z.object({
  body: z.object({
    order: z.array(
      z.object({
        id: z.string().uuid(),
        sort_order: z.number().int(),
      })
    ),
  }),
});

// ============ Menu ============

const menuOptionValueSchema = z.object({
  id: z.string().optional(),
  locales: z.record(z.string(), z.object({ label: z.string().min(1) })),
  price_delta: z.number().int().default(0),
});

const menuOptionGroupSchema = z.object({
  id: z.string().optional(),
  locales: z.record(z.string(), z.object({ group_name: z.string().min(1) })),
  is_required: z.boolean().default(false),
  max_select: z.number().int().min(1).default(1),
  values: z.array(menuOptionValueSchema),
  sort_order: z.number().int().default(0),
});

export const createMenuSchema = z.object({
  body: z.object({
    category_id: z.string().uuid('Invalid category ID'),
    base_price: z.number().int().min(0, 'Price must be non-negative'),
    image_url: z.string().url().optional().nullable(),
    is_sold_out: z.boolean().optional().default(false),
    is_recommended: z.boolean().optional().default(false),
    is_hidden: z.boolean().optional().default(false),
    dietary_tags: z.array(z.string()).optional().default([]),
    allergens: z.array(z.string()).optional().default([]),
    spiciness_level: z.number().int().min(0).max(5).optional().default(0),
    challenge_level: z.number().int().min(0).max(5).optional().default(0),
    locales: z.record(z.string(), z.object({ name: z.string().min(1), description: z.string().optional(), cultural_note: z.string().optional() })),
    sort_order: z.number().int().optional().default(0),
    options: z.array(menuOptionGroupSchema).optional().default([]),
  }),
});

export const updateMenuSchema = z.object({
  body: z.object({
    category_id: z.string().uuid().optional(),
    base_price: z.number().int().min(0).optional(),
    image_url: z.string().url().optional().nullable(),
    is_sold_out: z.boolean().optional(),
    is_recommended: z.boolean().optional(),
    is_hidden: z.boolean().optional(),
    dietary_tags: z.array(z.string()).optional(),
    allergens: z.array(z.string()).optional(),
    spiciness_level: z.number().int().min(0).max(5).optional(),
    challenge_level: z.number().int().min(0).max(5).optional(),
    locales: z.record(z.string(), z.object({ name: z.string().min(1), description: z.string().optional(), cultural_note: z.string().optional() })).optional(),
    sort_order: z.number().int().optional(),
    options: z.array(menuOptionGroupSchema).optional(),
  }),
  params: z.object({
    id: z.string().uuid('Invalid menu ID'),
  }),
});

// ============ Table ============

export const createTableSchema = z.object({
  body: z.object({
    tables: z.array(
      z.object({
        table_number: z.number().int().min(1),
        label: z.string().optional(),
        seats: z.number().int().min(1).default(4),
      })
    ).min(1, 'At least one table is required'),
  }),
});

export const updateTableSchema = z.object({
  body: z.object({
    label: z.string().optional(),
    seats: z.number().int().min(1).optional(),
    status: z.enum(['ACTIVE', 'INACTIVE']).optional(),
  }),
  params: z.object({
    id: z.string().uuid('Invalid table ID'),
  }),
});

// ============ Store ============

export const updateStoreSchema = z.object({
  body: z.object({
    name: z.string().min(1).max(200).optional(),
    address: z.string().optional().nullable(),
    phone: z.string().optional().nullable(),
    default_language: z.enum(['en', 'ko', 'ja', 'zh', 'es']).optional(),
    supported_languages: z.array(z.enum(['en', 'ko', 'ja', 'zh', 'es'])).optional(),
    settings: z.object({
      order_confirm_mode: z.enum(['ANYONE', 'HOST_ONLY', 'CONSENSUS']).optional(),
      session_ttl_minutes: z.number().int().min(1).optional(),
      allow_additional_orders: z.boolean().optional(),
      tax_rate: z.number().min(0).max(1).optional(),
      service_charge_rate: z.number().min(0).max(1).optional(),
      tax_included: z.boolean().optional(),
    }).optional(),
  }),
});

// ============ Query Filters ============

export const adminOrdersQuerySchema = z.object({
  query: z.object({
    status: z.enum(['PLACED', 'ACCEPTED', 'PREPARING', 'READY', 'SERVED', 'CANCELLED']).optional(),
    table_id: z.string().uuid().optional(),
    session_id: z.string().uuid().optional(),
    limit: z.coerce.number().int().min(1).max(100).optional().default(50),
    offset: z.coerce.number().int().min(0).optional().default(0),
  }),
});

export const adminSessionsQuerySchema = z.object({
  query: z.object({
    status: z.enum(['OPEN', 'CLOSED', 'EXPIRED']).optional().default('OPEN'),
    limit: z.coerce.number().int().min(1).max(100).optional().default(50),
    offset: z.coerce.number().int().min(0).optional().default(0),
  }),
});

export const menuQuerySchema = z.object({
  query: z.object({
    category_id: z.string().uuid().optional(),
    is_recommended: z.coerce.boolean().optional(),
    search: z.string().optional(),
  }),
});
