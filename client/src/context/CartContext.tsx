import React, { createContext, useState, useCallback, useEffect, useRef } from 'react';
import type { SharedCartDTO, SelectedOption } from '@anytable/shared';
import api, { type ApiError } from '@/lib/api';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import { io, type Socket } from 'socket.io-client';

export interface CartContextValue {
  cart: SharedCartDTO | null;
  loading: boolean;
  error: string | null;
  fetchCart: () => Promise<void>;
  addItem: (
    menuId: string,
    quantity: number,
    selectedOptions: SelectedOption[],
  ) => Promise<void>;
  updateItem: (itemId: string, quantity: number) => Promise<void>;
  removeItem: (itemId: string) => Promise<void>;
}

export const CartContext = createContext<CartContextValue | null>(null);

export const CartProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { t } = useTranslation();
  const [cart, setCart] = useState<SharedCartDTO | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const socketRef = useRef<Socket | null>(null);

  const getCartId = useCallback((): string | null => {
    try {
      const raw = sessionStorage.getItem('anytable_session');
      if (raw) {
        const parsed = JSON.parse(raw);
        return parsed.cartId || null;
      }
    } catch {
      // ignore
    }
    return null;
  }, []);

  const getParticipantId = useCallback((): string | null => {
    try {
      const raw = sessionStorage.getItem('anytable_session');
      if (raw) {
        const parsed = JSON.parse(raw);
        return parsed.participant?.id || null;
      }
    } catch {
      // ignore
    }
    return null;
  }, []);

  const getSessionId = useCallback((): string | null => {
    try {
      const raw = sessionStorage.getItem('anytable_session');
      if (raw) {
        const parsed = JSON.parse(raw);
        return parsed.session?.id || null;
      }
    } catch {
      // ignore
    }
    return null;
  }, []);

  const fetchCart = useCallback(async () => {
    const cartId = getCartId();
    if (!cartId) return;

    setLoading(true);
    setError(null);

    try {
      const data = await api.get<SharedCartDTO>(`/api/public/carts/${cartId}`);
      setCart(data);
    } catch (err) {
      const apiErr = err as ApiError;
      setError(apiErr.message || t('common.something_went_wrong'));
    } finally {
      setLoading(false);
    }
  }, [getCartId, t]);

  const mutateCart = useCallback(
    async (body: Record<string, unknown>) => {
      const cartId = getCartId();
      const participantId = getParticipantId();
      if (!cartId || !participantId) return;

      setLoading(true);
      setError(null);

      try {
        const data = await api.post<SharedCartDTO>(`/api/public/carts/${cartId}/mutations`, {
          ...body,
          participant_id: participantId,
          cart_version: cart?.version ?? 1,
        });
        setCart(data);
      } catch (err) {
        const apiErr = err as ApiError;
        if (apiErr.status === 409) {
          toast(t('common.error') + ' - refreshing cart', { icon: '🔄' });
          await fetchCart();
        } else {
          setError(apiErr.message || t('common.something_went_wrong'));
          toast.error(apiErr.message || t('common.something_went_wrong'));
        }
      } finally {
        setLoading(false);
      }
    },
    [getCartId, getParticipantId, cart?.version, fetchCart, t],
  );

  const addItem = useCallback(
    async (menuId: string, quantity: number, selectedOptions: SelectedOption[]) => {
      await mutateCart({
        action: 'ADD',
        menu_id: menuId,
        quantity,
        selected_options: selectedOptions,
      });
    },
    [mutateCart],
  );

  const updateItem = useCallback(
    async (itemId: string, quantity: number) => {
      await mutateCart({
        action: 'UPDATE',
        item_id: itemId,
        quantity,
      });
    },
    [mutateCart],
  );

  const removeItem = useCallback(
    async (itemId: string) => {
      await mutateCart({
        action: 'REMOVE',
        item_id: itemId,
      });
    },
    [mutateCart],
  );

  // Auto-fetch cart when session exists
  useEffect(() => {
    const cartId = getCartId();
    if (cartId && !cart) {
      fetchCart();
    }
  }, [getCartId, cart, fetchCart]);

  // Socket connection for real-time cart updates
  useEffect(() => {
    const sessionId = getSessionId();
    const sessionToken = sessionStorage.getItem('anytable_session_token');
    if (!sessionId || !sessionToken) return;

    const socket = io('/', {
      transports: ['websocket', 'polling'],
      auth: { token: sessionToken },
      query: { session_id: sessionId },
    });

    socket.on('CART_UPDATED', (data: { cart: SharedCartDTO }) => {
      setCart(data.cart);
    });

    socketRef.current = socket;

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [getSessionId]);

  return (
    <CartContext.Provider
      value={{
        cart,
        loading,
        error,
        fetchCart,
        addItem,
        updateItem,
        removeItem,
      }}
    >
      {children}
    </CartContext.Provider>
  );
};
