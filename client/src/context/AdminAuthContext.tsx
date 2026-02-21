import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import { loginAdmin, refreshAdminToken, type AdminOwner, type LoginResult } from '@/lib/admin-api';

interface AdminAuthState {
  accessToken: string | null;
  refreshToken: string | null;
  owner: AdminOwner | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

interface AdminAuthContextValue extends AdminAuthState {
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  refreshAuth: () => Promise<void>;
}

const AdminAuthContext = createContext<AdminAuthContextValue | null>(null);

const ACCESS_TOKEN_KEY = 'admin_access_token';
const REFRESH_TOKEN_KEY = 'admin_refresh_token';
const OWNER_KEY = 'admin_owner';

function persistTokens(result: LoginResult) {
  localStorage.setItem(ACCESS_TOKEN_KEY, result.access_token);
  localStorage.setItem(REFRESH_TOKEN_KEY, result.refresh_token);
  localStorage.setItem(OWNER_KEY, JSON.stringify(result.owner));
}

function clearTokens() {
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
  localStorage.removeItem(OWNER_KEY);
}

function loadOwner(): AdminOwner | null {
  const raw = localStorage.getItem(OWNER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as AdminOwner;
  } catch {
    return null;
  }
}

export const AdminAuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [accessToken, setAccessToken] = useState<string | null>(
    () => localStorage.getItem(ACCESS_TOKEN_KEY),
  );
  const [refreshTokenState, setRefreshToken] = useState<string | null>(
    () => localStorage.getItem(REFRESH_TOKEN_KEY),
  );
  const [owner, setOwner] = useState<AdminOwner | null>(() => loadOwner());
  const [isLoading, setIsLoading] = useState<boolean>(!!localStorage.getItem(REFRESH_TOKEN_KEY));
  const refreshAttempted = useRef(false);

  const applyResult = useCallback((result: LoginResult) => {
    persistTokens(result);
    setAccessToken(result.access_token);
    setRefreshToken(result.refresh_token);
    setOwner(result.owner);
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const result = await loginAdmin(email, password);
    applyResult(result);
  }, [applyResult]);

  const logout = useCallback(() => {
    clearTokens();
    setAccessToken(null);
    setRefreshToken(null);
    setOwner(null);
  }, []);

  const refreshAuth = useCallback(async () => {
    const storedRefresh = localStorage.getItem(REFRESH_TOKEN_KEY);
    if (!storedRefresh) {
      logout();
      return;
    }
    try {
      const result = await refreshAdminToken(storedRefresh);
      applyResult(result);
    } catch {
      logout();
    }
  }, [applyResult, logout]);

  // Auto-refresh on mount if we have a refresh token
  useEffect(() => {
    if (refreshAttempted.current) return;
    refreshAttempted.current = true;

    const storedRefresh = localStorage.getItem(REFRESH_TOKEN_KEY);
    if (!storedRefresh) {
      setIsLoading(false);
      return;
    }

    refreshAdminToken(storedRefresh)
      .then((result) => {
        applyResult(result);
      })
      .catch(() => {
        clearTokens();
        setAccessToken(null);
        setRefreshToken(null);
        setOwner(null);
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [applyResult]);

  const value: AdminAuthContextValue = {
    accessToken,
    refreshToken: refreshTokenState,
    owner,
    isAuthenticated: !!accessToken && !!owner,
    isLoading,
    login,
    logout,
    refreshAuth,
  };

  return (
    <AdminAuthContext.Provider value={value}>
      {children}
    </AdminAuthContext.Provider>
  );
};

export function useAdminAuth(): AdminAuthContextValue {
  const ctx = useContext(AdminAuthContext);
  if (!ctx) {
    throw new Error('useAdminAuth must be used within AdminAuthProvider');
  }
  return ctx;
}

export default AdminAuthContext;
