import type {
  ApiResponse,
  SystemLoginResponse,
  SystemStoreDTO,
  SystemStoreDetailDTO,
  SystemOwnerDTO,
  PlatformStatsDTO,
  PaginationMeta,
} from '@anytable/shared';

const BASE = '/api/system';

function getAccessToken(): string | null {
  return localStorage.getItem('system_access_token');
}

async function systemFetch<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const token = getAccessToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(`${BASE}${path}`, {
    ...options,
    headers,
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(body.error || body.message || `Request failed: ${res.status}`);
  }

  const json = await res.json();
  if (!json.success) {
    throw new Error(json.error || 'Unknown error');
  }
  return json.data as T;
}

// Helper for list endpoints that return data + meta
async function systemFetchList<T>(
  path: string,
  options: RequestInit = {},
): Promise<{ data: T; meta: PaginationMeta }> {
  const token = getAccessToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(`${BASE}${path}`, {
    ...options,
    headers,
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(body.error || body.message || `Request failed: ${res.status}`);
  }

  const json = await res.json();
  if (!json.success) {
    throw new Error(json.error || 'Unknown error');
  }
  return { data: json.data as T, meta: json.meta };
}

// ============ Auth ============

export interface SystemAdmin {
  id: string;
  email: string;
  name: string;
}

export interface SystemLoginResult {
  access_token: string;
  refresh_token: string;
  admin: SystemAdmin;
}

export async function loginSystem(email: string, password: string): Promise<SystemLoginResult> {
  const res = await fetch(`${BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(body.error || body.message || 'Login failed');
  }
  const json: ApiResponse<SystemLoginResult> = await res.json();
  if (!json.success) throw new Error(json.error || 'Login failed');
  return json.data as SystemLoginResult;
}

export async function refreshSystemToken(refreshToken: string): Promise<SystemLoginResult> {
  const res = await fetch(`${BASE}/auth/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refresh_token: refreshToken }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(body.error || body.message || 'Token refresh failed');
  }
  const json: ApiResponse<SystemLoginResult> = await res.json();
  if (!json.success) throw new Error(json.error || 'Token refresh failed');
  return json.data as SystemLoginResult;
}

// ============ Stats ============

export async function getStats(): Promise<PlatformStatsDTO> {
  return systemFetch<PlatformStatsDTO>('/stats');
}

// ============ Stores ============

export async function getStores(params?: {
  search?: string;
  is_active?: boolean;
  limit?: number;
  offset?: number;
}): Promise<{ data: SystemStoreDTO[]; meta: PaginationMeta }> {
  const qs = new URLSearchParams();
  if (params?.search) qs.set('search', params.search);
  if (params?.is_active !== undefined) qs.set('is_active', String(params.is_active));
  if (params?.limit) qs.set('limit', String(params.limit));
  if (params?.offset) qs.set('offset', String(params.offset));
  const query = qs.toString();
  return systemFetchList<SystemStoreDTO[]>(`/stores${query ? `?${query}` : ''}`);
}

export async function getStoreDetail(id: string): Promise<SystemStoreDetailDTO> {
  return systemFetch<SystemStoreDetailDTO>(`/stores/${id}`);
}

export async function toggleStoreActive(id: string): Promise<{ is_active: boolean }> {
  return systemFetch<{ is_active: boolean }>(`/stores/${id}/toggle`, { method: 'PATCH' });
}

// ============ Owners ============

export async function getOwners(params?: {
  search?: string;
  is_active?: boolean;
  limit?: number;
  offset?: number;
}): Promise<{ data: SystemOwnerDTO[]; meta: PaginationMeta }> {
  const qs = new URLSearchParams();
  if (params?.search) qs.set('search', params.search);
  if (params?.is_active !== undefined) qs.set('is_active', String(params.is_active));
  if (params?.limit) qs.set('limit', String(params.limit));
  if (params?.offset) qs.set('offset', String(params.offset));
  const query = qs.toString();
  return systemFetchList<SystemOwnerDTO[]>(`/owners${query ? `?${query}` : ''}`);
}

export async function createOwner(data: {
  email: string;
  password: string;
  name: string;
  store_name: string;
}): Promise<SystemOwnerDTO> {
  return systemFetch<SystemOwnerDTO>('/owners', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function toggleOwnerActive(id: string): Promise<{ is_active: boolean }> {
  return systemFetch<{ is_active: boolean }>(`/owners/${id}/toggle`, { method: 'PATCH' });
}
