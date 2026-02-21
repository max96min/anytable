import React, { createContext, useState, useCallback, useEffect } from 'react';
import type {
  SessionDTO,
  ParticipantDTO,
  StoreDTO,
  JoinSessionResponse,
  SupportedLanguage,
} from '@anytable/shared';
import api from '@/lib/api';
import i18n from '@/i18n';

export interface SessionState {
  session: SessionDTO | null;
  participant: ParticipantDTO | null;
  sessionToken: string | null;
  store: StoreDTO | null;
  cartId: string | null;
}

export interface SessionContextValue extends SessionState {
  joinSession: (
    qrToken: string,
    nickname: string,
    deviceFingerprint: string,
  ) => Promise<JoinSessionResponse>;
  joinSessionByCode: (
    shortCode: string,
    nickname: string,
    deviceFingerprint: string,
  ) => Promise<JoinSessionResponse>;
  leaveSession: () => void;
  isInSession: boolean;
}

const SESSION_KEY = 'anytable_session';
const TOKEN_KEY = 'anytable_session_token';

function loadPersistedState(): SessionState {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    if (raw) {
      return JSON.parse(raw) as SessionState;
    }
  } catch {
    // corrupted data
  }
  return {
    session: null,
    participant: null,
    sessionToken: null,
    store: null,
    cartId: null,
  };
}

function persistState(state: SessionState): void {
  sessionStorage.setItem(SESSION_KEY, JSON.stringify(state));
  if (state.sessionToken) {
    sessionStorage.setItem(TOKEN_KEY, state.sessionToken);
  } else {
    sessionStorage.removeItem(TOKEN_KEY);
  }
}

export const SessionContext = createContext<SessionContextValue | null>(null);

export const SessionProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, setState] = useState<SessionState>(loadPersistedState);

  useEffect(() => {
    persistState(state);
  }, [state]);

  const joinSession = useCallback(
    async (
      qrToken: string,
      nickname: string,
      deviceFingerprint: string,
    ): Promise<JoinSessionResponse> => {
      const response = await api.post<JoinSessionResponse>(
        '/api/public/table-sessions/join',
        {
          qr_token: qrToken,
          nickname,
          device_fingerprint: deviceFingerprint,
          language: i18n.language as SupportedLanguage,
        },
      );

      const newState: SessionState = {
        session: response.session,
        participant: response.participant,
        sessionToken: response.session_token,
        store: response.store,
        cartId: response.cart_id,
      };

      setState(newState);
      return response;
    },
    [],
  );

  const joinSessionByCode = useCallback(
    async (
      shortCode: string,
      nickname: string,
      deviceFingerprint: string,
    ): Promise<JoinSessionResponse> => {
      const response = await api.post<JoinSessionResponse>(
        '/api/public/table-sessions/join',
        {
          short_code: shortCode,
          nickname,
          device_fingerprint: deviceFingerprint,
          language: i18n.language as SupportedLanguage,
        },
      );

      const newState: SessionState = {
        session: response.session,
        participant: response.participant,
        sessionToken: response.session_token,
        store: response.store,
        cartId: response.cart_id,
      };

      setState(newState);
      return response;
    },
    [],
  );

  const leaveSession = useCallback(() => {
    const emptyState: SessionState = {
      session: null,
      participant: null,
      sessionToken: null,
      store: null,
      cartId: null,
    };
    setState(emptyState);
    sessionStorage.removeItem(SESSION_KEY);
    sessionStorage.removeItem(TOKEN_KEY);
  }, []);

  const isInSession = Boolean(state.session && state.sessionToken);

  return (
    <SessionContext.Provider
      value={{
        ...state,
        joinSession,
        joinSessionByCode,
        leaveSession,
        isInSession,
      }}
    >
      {children}
    </SessionContext.Provider>
  );
};
