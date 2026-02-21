import type {
  ApiResponse,
  OrderDTO,
  OrderStatus,
  TableDTO,
  CategoryDTO,
  MenuDTO,
  SessionDTO,
  SupportedLanguage,
  MenuLocale,
  StoreDTO,
} from '@anytable/shared';

const BASE = '/api/admin';

function getAccessToken(): string | null {
  return localStorage.getItem('admin_access_token');
}

function getRefreshToken(): string | null {
  return localStorage.getItem('admin_refresh_token');
}

let isRefreshing = false;
let refreshPromise: Promise<void> | null = null;

async function tryRefreshToken(): Promise<boolean> {
  const refreshToken = getRefreshToken();
  if (!refreshToken) return false;

  if (isRefreshing && refreshPromise) {
    await refreshPromise;
    return !!getAccessToken();
  }

  isRefreshing = true;
  refreshPromise = (async () => {
    try {
      const res = await fetch(`${BASE}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refresh_token: refreshToken }),
      });
      if (!res.ok) throw new Error('Refresh failed');
      const json: ApiResponse<{ access_token: string; refresh_token: string; owner: unknown }> = await res.json();
      if (!json.success || !json.data) throw new Error('Refresh failed');
      localStorage.setItem('admin_access_token', json.data.access_token);
      localStorage.setItem('admin_refresh_token', json.data.refresh_token);
      localStorage.setItem('admin_owner', JSON.stringify(json.data.owner));
    } catch {
      localStorage.removeItem('admin_access_token');
      localStorage.removeItem('admin_refresh_token');
      localStorage.removeItem('admin_owner');
    } finally {
      isRefreshing = false;
      refreshPromise = null;
    }
  })();
  await refreshPromise;
  return !!getAccessToken();
}

async function adminFetch<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const doFetch = (token: string | null) => {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string>),
    };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    return fetch(`${BASE}${path}`, { ...options, headers });
  };

  let res = await doFetch(getAccessToken());

  // Auto-refresh on 401
  if (res.status === 401) {
    const refreshed = await tryRefreshToken();
    if (refreshed) {
      res = await doFetch(getAccessToken());
    }
  }

  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(body.error || body.message || `Request failed: ${res.status}`);
  }

  const json: ApiResponse<T> = await res.json();
  if (!json.success) {
    throw new Error(json.error || 'Unknown error');
  }
  return json.data as T;
}

// ============ Store ============

export async function getStore(): Promise<StoreDTO> {
  return adminFetch<StoreDTO>('/stores');
}

export async function updateStore(data: Partial<Omit<StoreDTO, 'id'>>): Promise<StoreDTO> {
  return adminFetch<StoreDTO>('/stores', {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

// ============ Auth ============

export interface AdminOwner {
  id: string;
  email: string;
  name: string;
  store_id: string;
}

export interface LoginResult {
  access_token: string;
  refresh_token: string;
  owner: AdminOwner;
}

export async function loginAdmin(email: string, password: string): Promise<LoginResult> {
  const res = await fetch(`${BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(body.error || body.message || 'Login failed');
  }
  const json: ApiResponse<LoginResult> = await res.json();
  if (!json.success) throw new Error(json.error || 'Login failed');
  return json.data as LoginResult;
}

export async function refreshAdminToken(refreshToken: string): Promise<LoginResult> {
  const res = await fetch(`${BASE}/auth/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refresh_token: refreshToken }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(body.error || body.message || 'Token refresh failed');
  }
  const json: ApiResponse<LoginResult> = await res.json();
  if (!json.success) throw new Error(json.error || 'Token refresh failed');
  return json.data as LoginResult;
}

// ============ Orders ============

export interface OrderFilters {
  status?: OrderStatus | OrderStatus[];
  table_number?: number;
  search?: string;
}

export async function getOrders(filters?: OrderFilters): Promise<OrderDTO[]> {
  const params = new URLSearchParams();
  if (filters?.status) {
    const statuses = Array.isArray(filters.status) ? filters.status : [filters.status];
    statuses.forEach((s) => params.append('status', s));
  }
  if (filters?.table_number) params.set('table_number', String(filters.table_number));
  if (filters?.search) params.set('search', filters.search);
  const qs = params.toString();
  return adminFetch<OrderDTO[]>(`/orders${qs ? `?${qs}` : ''}`);
}

export async function updateOrderStatus(
  orderId: string,
  status: OrderStatus,
): Promise<OrderDTO> {
  return adminFetch<OrderDTO>(`/orders/${orderId}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status }),
  });
}

// ============ Tables ============

export async function getTables(): Promise<TableDTO[]> {
  return adminFetch<TableDTO[]>('/tables');
}

export interface CreateTablesData {
  start_number: number;
  end_number: number;
  seats: number;
}

export async function createTables(data: CreateTablesData): Promise<TableDTO[]> {
  return adminFetch<TableDTO[]>('/tables', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export interface UpdateTableData {
  label?: string;
  seats?: number;
  status?: 'ACTIVE' | 'INACTIVE';
}

export async function updateTable(
  id: string,
  data: UpdateTableData,
): Promise<TableDTO> {
  return adminFetch<TableDTO>(`/tables/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

export interface QrResult {
  qr_url: string;
  qr_token: string;
  short_code?: string;
}

export async function regenerateQr(tableId: string): Promise<QrResult> {
  return adminFetch<QrResult>(`/tables/${tableId}/qr`, {
    method: 'POST',
  });
}

// ============ Sessions ============

export async function getActiveSessions(): Promise<SessionDTO[]> {
  return adminFetch<SessionDTO[]>('/sessions?status=OPEN');
}

export async function closeSession(sessionId: string): Promise<void> {
  await adminFetch<void>(`/sessions/${sessionId}/close`, {
    method: 'POST',
  });
}

// ============ Categories ============

export async function getCategories(): Promise<CategoryDTO[]> {
  return adminFetch<CategoryDTO[]>('/categories');
}

export interface CreateCategoryData {
  sort_order: number;
  locales: Record<string, { name: string }>;
}

export async function createCategory(data: CreateCategoryData): Promise<CategoryDTO> {
  return adminFetch<CategoryDTO>('/categories', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function updateCategory(
  id: string,
  data: Partial<CreateCategoryData>,
): Promise<CategoryDTO> {
  return adminFetch<CategoryDTO>(`/categories/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

// ============ Menus ============

export async function getMenus(): Promise<MenuDTO[]> {
  return adminFetch<MenuDTO[]>('/menus');
}

export async function getMenu(id: string): Promise<MenuDTO> {
  return adminFetch<MenuDTO>(`/menus/${id}`);
}

export interface CreateMenuData {
  category_id: string;
  base_price: number;
  image_url?: string;
  is_recommended: boolean;
  dietary_tags: string[];
  allergens: string[];
  spiciness_level: number;
  challenge_level: number;
  locales: Record<string, MenuLocale>;
  options: {
    locales: Record<string, { group_name: string }>;
    is_required: boolean;
    max_select: number;
    values: {
      locales: Record<string, { label: string }>;
      price_delta: number;
    }[];
  }[];
}

export async function createMenu(data: CreateMenuData): Promise<MenuDTO> {
  return adminFetch<MenuDTO>('/menus', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export interface UpdateMenuData extends Partial<CreateMenuData> {
  is_sold_out?: boolean;
  is_hidden?: boolean;
}

export async function updateMenu(
  id: string,
  data: UpdateMenuData,
): Promise<MenuDTO> {
  return adminFetch<MenuDTO>(`/menus/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

export async function deleteMenu(id: string): Promise<void> {
  await adminFetch<void>(`/menus/${id}`, {
    method: 'DELETE',
  });
}

// ============ Translations ============

export interface TranslationData {
  language: SupportedLanguage;
  name: string;
  description?: string;
  cultural_note?: string;
}

export async function getMenuTranslations(
  menuId: string,
): Promise<Record<string, MenuLocale>> {
  return adminFetch<Record<string, MenuLocale>>(`/menus/${menuId}/translations`);
}

export async function saveMenuTranslation(
  menuId: string,
  language: SupportedLanguage,
  data: MenuLocale,
): Promise<void> {
  await adminFetch<void>(`/menus/${menuId}/translations/${language}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export interface AutoTranslateResult {
  name: string;
  description?: string;
  cultural_note?: string;
}

export async function autoTranslateMenu(
  menuId: string,
  fromLang: string,
  toLang: string,
): Promise<AutoTranslateResult> {
  return adminFetch<AutoTranslateResult>(`/menus/${menuId}/auto-translate`, {
    method: 'POST',
    body: JSON.stringify({ from_lang: fromLang, to_lang: toLang }),
  });
}

export interface BulkTranslateResult {
  translations: Record<string, AutoTranslateResult>;
  errors: Record<string, string>;
}

export async function bulkTranslateMenu(
  menuId: string,
  fromLang: string,
  toLangs: string[],
): Promise<BulkTranslateResult> {
  return adminFetch<BulkTranslateResult>(`/menus/${menuId}/bulk-translate`, {
    method: 'POST',
    body: JSON.stringify({ from_lang: fromLang, to_langs: toLangs }),
  });
}

export async function generateCulturalNote(
  menuId: string,
  language: string,
): Promise<string> {
  const data = await adminFetch<{ cultural_note: string }>(
    `/menus/${menuId}/generate-cultural-note`,
    {
      method: 'POST',
      body: JSON.stringify({ language }),
    },
  );
  return data.cultural_note;
}

// ============ Images ============

export async function uploadMenuImage(file: File): Promise<string> {
  const token = getAccessToken();
  const formData = new FormData();
  formData.append('image', file);

  const res = await fetch(`${BASE}/images/upload`, {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: formData,
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(body.error || body.message || `Upload failed: ${res.status}`);
  }

  const json = await res.json();
  if (!json.success) throw new Error(json.error || 'Upload failed');
  return json.data.image_url;
}

export async function generateMenuImage(prompt: string): Promise<string> {
  const data = await adminFetch<{ image_url: string }>('/images/generate', {
    method: 'POST',
    body: JSON.stringify({ prompt }),
  });
  return data.image_url;
}

// ============ Analytics ============

export interface AnalyticsData {
  today_orders: number;
  today_revenue: number;
  active_tables: number;
  avg_order_value: number;
  language_distribution: Record<string, number>;
  popular_items: {
    menu_id: string;
    name: string;
    order_count: number;
  }[];
}

export async function getAnalytics(): Promise<AnalyticsData> {
  return adminFetch<AnalyticsData>('/analytics');
}
