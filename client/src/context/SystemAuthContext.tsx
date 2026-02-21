import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import { loginSystem, refreshSystemToken, type SystemAdmin, type SystemLoginResult } from '@/lib/system-api';

interface SystemAuthState {
  accessToken: string | null;
  refreshToken: string | null;
  admin: SystemAdmin | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

interface SystemAuthContextValue extends SystemAuthState {
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  refreshAuth: () => Promise<void>;
}

const SystemAuthContext = createContext<SystemAuthContextValue | null>(null);

const ACCESS_TOKEN_KEY = 'system_access_token';
const REFRESH_TOKEN_KEY = 'system_refresh_token';
const ADMIN_KEY = 'system_admin';

function persistTokens(result: SystemLoginResult) {
  localStorage.setItem(ACCESS_TOKEN_KEY, result.access_token);
  localStorage.setItem(REFRESH_TOKEN_KEY, result.refresh_token);
  localStorage.setItem(ADMIN_KEY, JSON.stringify(result.admin));
}

function clearTokens() {
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
  localStorage.removeItem(ADMIN_KEY);
}

function loadAdmin(): SystemAdmin | null {
  const raw = localStorage.getItem(ADMIN_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as SystemAdmin;
  } catch {
    return null;
  }
}

export const SystemAuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [accessToken, setAccessToken] = useState<string | null>(
    () => localStorage.getItem(ACCESS_TOKEN_KEY),
  );
  const [refreshTokenState, setRefreshToken] = useState<string | null>(
    () => localStorage.getItem(REFRESH_TOKEN_KEY),
  );
  const [admin, setAdmin] = useState<SystemAdmin | null>(() => loadAdmin());
  const [isLoading, setIsLoading] = useState<boolean>(!!localStorage.getItem(REFRESH_TOKEN_KEY));
  const refreshAttempted = useRef(false);

  const applyResult = useCallback((result: SystemLoginResult) => {
    persistTokens(result);
    setAccessToken(result.access_token);
    setRefreshToken(result.refresh_token);
    setAdmin(result.admin);
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const result = await loginSystem(email, password);
    applyResult(result);
  }, [applyResult]);

  const logout = useCallback(() => {
    clearTokens();
    setAccessToken(null);
    setRefreshToken(null);
    setAdmin(null);
  }, []);

  const refreshAuth = useCallback(async () => {
    const storedRefresh = localStorage.getItem(REFRESH_TOKEN_KEY);
    if (!storedRefresh) {
      logout();
      return;
    }
    try {
      const result = await refreshSystemToken(storedRefresh);
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

    refreshSystemToken(storedRefresh)
      .then((result) => {
        applyResult(result);
      })
      .catch(() => {
        clearTokens();
        setAccessToken(null);
        setRefreshToken(null);
        setAdmin(null);
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [applyResult]);

  const value: SystemAuthContextValue = {
    accessToken,
    refreshToken: refreshTokenState,
    admin,
    isAuthenticated: !!accessToken && !!admin,
    isLoading,
    login,
    logout,
    refreshAuth,
  };

  return (
    <SystemAuthContext.Provider value={value}>
      {children}
    </SystemAuthContext.Provider>
  );
};

export function useSystemAuth(): SystemAuthContextValue {
  const ctx = useContext(SystemAuthContext);
  if (!ctx) {
    throw new Error('useSystemAuth must be used within SystemAuthProvider');
  }
  return ctx;
}

export default SystemAuthContext;
