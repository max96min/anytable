export interface ApiError {
  status: number;
  message: string;
  error?: string;
}

function getSessionToken(): string | null {
  return sessionStorage.getItem('anytable_session_token');
}

function getAdminToken(): string | null {
  return localStorage.getItem('anytable_admin_token');
}

async function request<T>(
  url: string,
  options: RequestInit = {},
): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  const sessionToken = getSessionToken();
  if (sessionToken) {
    headers['X-Session-Token'] = sessionToken;
  }

  const adminToken = getAdminToken();
  if (adminToken) {
    headers['Authorization'] = `Bearer ${adminToken}`;
  }

  const response = await fetch(url, {
    ...options,
    headers,
  });

  if (!response.ok) {
    let errorBody: { error?: string; message?: string } = {};
    try {
      errorBody = await response.json();
    } catch {
      // non-JSON error response
    }

    const apiError: ApiError = {
      status: response.status,
      message: errorBody.message || errorBody.error || response.statusText,
      error: errorBody.error,
    };

    throw apiError;
  }

  if (response.status === 204) {
    return undefined as T;
  }

  const json = await response.json();
  return json.data !== undefined ? json.data : json;
}

export const api = {
  get<T>(url: string): Promise<T> {
    return request<T>(url, { method: 'GET' });
  },

  post<T>(url: string, body?: unknown): Promise<T> {
    return request<T>(url, {
      method: 'POST',
      body: body ? JSON.stringify(body) : undefined,
    });
  },

  put<T>(url: string, body?: unknown): Promise<T> {
    return request<T>(url, {
      method: 'PUT',
      body: body ? JSON.stringify(body) : undefined,
    });
  },

  patch<T>(url: string, body?: unknown): Promise<T> {
    return request<T>(url, {
      method: 'PATCH',
      body: body ? JSON.stringify(body) : undefined,
    });
  },

  delete<T>(url: string): Promise<T> {
    return request<T>(url, { method: 'DELETE' });
  },
};

export default api;
