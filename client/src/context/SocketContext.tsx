import React, {
  createContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { io, type Socket } from 'socket.io-client';

// ---------------------------------------------------------------------------
// Context value
// ---------------------------------------------------------------------------

export interface SocketContextValue {
  /** The Socket.io client instance, or `null` if not yet connected. */
  socket: Socket | null;
  /** Whether the socket is currently connected. */
  connected: boolean;
}

export const SocketContext = createContext<SocketContextValue>({
  socket: null,
  connected: false,
});

// ---------------------------------------------------------------------------
// Provider props
// ---------------------------------------------------------------------------

export interface SocketProviderProps {
  children: ReactNode;
  /**
   * Customer session token.  When provided the socket connects with
   * `{ session_token }` in the auth payload.
   */
  sessionToken?: string | null;
  /**
   * Admin JWT.  When provided the socket connects with
   * `{ admin_token }` in the auth payload.
   */
  adminToken?: string | null;
}

// ---------------------------------------------------------------------------
// Provider component
// ---------------------------------------------------------------------------

export function SocketProvider({
  children,
  sessionToken,
  adminToken,
}: SocketProviderProps) {
  const [connected, setConnected] = useState(false);
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    // We need at least one token to authenticate
    const token = sessionToken || adminToken;
    if (!token) {
      // If there was a previous connection, disconnect it
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
        setConnected(false);
      }
      return;
    }

    // Build the auth payload based on which token is available
    const auth: Record<string, string> = {};
    if (sessionToken) auth.session_token = sessionToken;
    if (adminToken) auth.admin_token = adminToken;

    // Connect using a relative path so Vite's proxy handles routing to the
    // backend server during development.  In production the client and server
    // are served from the same origin so a relative path also works.
    const socket = io({
      // Omitting the URL makes socket.io-client connect to the same origin.
      // Combined with the Vite proxy config for `/socket.io` this routes
      // transparently to the backend.
      auth,
      // Reconnect automatically with exponential backoff
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 10000,
      // Wait up to 20s for the initial connection
      timeout: 20000,
      // Use websocket first for lower latency; fall back to polling
      transports: ['websocket', 'polling'],
    });

    socketRef.current = socket;

    // ----- Lifecycle events -----

    socket.on('connect', () => {
      console.log('[Socket] Connected:', socket.id);
      setConnected(true);
    });

    socket.on('disconnect', (reason) => {
      console.log('[Socket] Disconnected:', reason);
      setConnected(false);
    });

    socket.on('connect_error', (err) => {
      console.warn('[Socket] Connection error:', err.message);
      setConnected(false);
    });

    // ----- Cleanup on unmount or when tokens change -----

    return () => {
      socket.off('connect');
      socket.off('disconnect');
      socket.off('connect_error');
      socket.disconnect();
      socketRef.current = null;
      setConnected(false);
    };
  }, [sessionToken, adminToken]);

  return (
    <SocketContext.Provider value={{ socket: socketRef.current, connected }}>
      {children}
    </SocketContext.Provider>
  );
}
