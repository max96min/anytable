import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef } from 'react';
import { io, type Socket } from 'socket.io-client';
import api from '@/lib/api';
import type { OrderDTO, OrderStatus, OrderItemSnapshot } from '@anytable/shared';

export function useOrders(sessionId: string | null | undefined) {
  const queryClient = useQueryClient();
  const socketRef = useRef<Socket | null>(null);

  const query = useQuery<OrderDTO[]>({
    queryKey: ['orders', sessionId],
    queryFn: () => api.get<OrderDTO[]>(`/api/public/sessions/${sessionId}/orders`),
    enabled: Boolean(sessionId),
  });

  useEffect(() => {
    if (!sessionId) return;

    const sessionToken = sessionStorage.getItem('anytable_session_token');
    if (!sessionToken) return;

    const socket = io('/', {
      transports: ['websocket', 'polling'],
      auth: { token: sessionToken },
      query: { session_id: sessionId },
    });

    socket.on('ORDER_PLACED', (data: { order: OrderDTO }) => {
      queryClient.setQueryData<OrderDTO[]>(['orders', sessionId], (old) => {
        if (!old) return [data.order];
        const exists = old.some((o) => o.id === data.order.id);
        if (exists) return old.map((o) => (o.id === data.order.id ? data.order : o));
        return [...old, data.order];
      });
    });

    socket.on(
      'ORDER_STATUS_CHANGED',
      (data: { order_id: string; status: OrderStatus; items?: OrderItemSnapshot[] }) => {
        queryClient.setQueryData<OrderDTO[]>(['orders', sessionId], (old) => {
          if (!old) return old;
          return old.map((o) => {
            if (o.id === data.order_id) {
              return {
                ...o,
                status: data.status,
                items: data.items ?? o.items,
                updated_at: new Date().toISOString(),
              };
            }
            return o;
          });
        });
      },
    );

    socketRef.current = socket;

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [sessionId, queryClient]);

  return {
    orders: query.data ?? [],
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
  };
}

export default useOrders;
