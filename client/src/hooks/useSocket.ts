import { useCallback, useContext, useEffect, useRef } from 'react';
import type { Socket } from 'socket.io-client';
import { SocketContext, type SocketContextValue } from '../context/SocketContext';

// ---------------------------------------------------------------------------
// useSocket
// ---------------------------------------------------------------------------

/**
 * Returns the Socket.io client instance and connection status from context.
 *
 * Must be used within a `<SocketProvider>`.
 */
export function useSocket(): SocketContextValue {
  const ctx = useContext(SocketContext);
  if (ctx === undefined) {
    throw new Error('useSocket must be used within a <SocketProvider>');
  }
  return ctx;
}

// ---------------------------------------------------------------------------
// useSocketEvent
// ---------------------------------------------------------------------------

/**
 * Subscribe to a Socket.io event.  The listener is automatically attached
 * when the socket connects and removed on unmount or when the event/handler
 * changes.
 *
 * @param event   The event name to listen for (e.g. `CART_UPDATED`).
 * @param handler Callback invoked with the event payload.
 *
 * @example
 * ```tsx
 * useSocketEvent<{ cart: SharedCartDTO }>('CART_UPDATED', (data) => {
 *   setCart(data.cart);
 * });
 * ```
 */
export function useSocketEvent<T = unknown>(
  event: string,
  handler: (data: T) => void,
): void {
  const { socket } = useSocket();

  // Keep a stable reference to the latest handler so the effect does not
  // need to re-subscribe every time the handler identity changes (which is
  // common when an inline arrow function is passed).
  const handlerRef = useRef(handler);
  handlerRef.current = handler;

  useEffect(() => {
    if (!socket) return;

    const listener = (data: T) => {
      handlerRef.current(data);
    };

    socket.on(event, listener as (...args: unknown[]) => void);

    return () => {
      socket.off(event, listener as (...args: unknown[]) => void);
    };
  }, [socket, event]);
}

// ---------------------------------------------------------------------------
// useSocketEmit
// ---------------------------------------------------------------------------

/**
 * Returns a stable `emit` function that sends an event through the current
 * socket connection.  If the socket is not connected the call is silently
 * ignored.
 *
 * @example
 * ```tsx
 * const emit = useSocketEmit();
 * emit('cart:editing', { is_editing: true });
 * ```
 */
export function useSocketEmit(): (event: string, ...args: unknown[]) => void {
  const { socket } = useSocket();

  // Keep a ref so the returned function identity is stable across renders
  const socketRef = useRef<Socket | null>(socket);
  socketRef.current = socket;

  return useCallback((event: string, ...args: unknown[]) => {
    if (!socketRef.current?.connected) return;
    socketRef.current.emit(event, ...args);
  }, []);
}
