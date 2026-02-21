import http from 'http';
import { Server as SocketIOServer } from 'socket.io';
import jwt from 'jsonwebtoken';
import { prisma } from '../lib/prisma.js';
import { registerHandlers, type SocketData } from './handlers.js';
import { PARTICIPANT_JOINED, PARTICIPANT_LEFT } from './events.js';

// ---------------------------------------------------------------------------
// Module-level IO instance
// ---------------------------------------------------------------------------

let io: SocketIOServer | null = null;

/**
 * Return the Socket.io server instance.
 * Throws if called before `setupSocket()`.
 */
export function getIO(): SocketIOServer {
  if (!io) {
    throw new Error('Socket.io has not been initialized. Call setupSocket() first.');
  }
  return io;
}

// ---------------------------------------------------------------------------
// Emit helpers for use in service / route layers
// ---------------------------------------------------------------------------

/**
 * Emit an event to every socket in a session room.
 */
export function emitToSession(sessionId: string, event: string, data: unknown): void {
  getIO().to(`session:${sessionId}`).emit(event, data);
}

/**
 * Emit an event to every socket in a store room (admin dashboard).
 */
export function emitToStore(storeId: string, event: string, data: unknown): void {
  getIO().to(`store:${storeId}`).emit(event, data);
}

// ---------------------------------------------------------------------------
// Auth middleware
// ---------------------------------------------------------------------------

/**
 * Authenticate the handshake by inspecting `socket.handshake.auth`.
 *
 * Two auth flows are supported:
 *  1. Customer / participant: provides `session_token` (a signed JWT containing
 *     session_id and participant_id).
 *  2. Admin / store owner: provides `admin_token` (a signed JWT containing
 *     owner_id and store_id).
 *
 * On success the decoded claims are attached to `socket.data`.
 */
async function authMiddleware(
  socket: import('socket.io').Socket,
  next: (err?: Error) => void,
): Promise<void> {
  const { session_token, admin_token } = socket.handshake.auth as {
    session_token?: string;
    admin_token?: string;
  };

  const jwtSecret = process.env.JWT_SECRET;
  if (!jwtSecret) {
    return next(new Error('Server misconfiguration: JWT_SECRET not set'));
  }

  try {
    // ----- Admin auth path -----
    if (admin_token) {
      const payload = jwt.verify(admin_token, jwtSecret) as {
        owner_id: string;
        store_id: string;
      };

      (socket.data as SocketData).owner_id = payload.owner_id;
      (socket.data as SocketData).store_id = payload.store_id;

      return next();
    }

    // ----- Session / participant auth path -----
    if (session_token) {
      const sessionSecret = process.env.SESSION_SECRET || jwtSecret;
      const payload = jwt.verify(session_token, sessionSecret) as {
        session_id: string;
        participant_id: string;
      };

      // Verify the session is still open
      const session = await prisma.tableSession.findUnique({
        where: { id: payload.session_id },
        select: { id: true, status: true, store_id: true },
      });

      if (!session || session.status !== 'OPEN') {
        return next(new Error('Session is not active'));
      }

      // Verify the participant exists in this session
      const participant = await prisma.participant.findUnique({
        where: { id: payload.participant_id },
        select: { id: true, nickname: true, session_id: true },
      });

      if (!participant || participant.session_id !== session.id) {
        return next(new Error('Participant not found in session'));
      }

      (socket.data as SocketData).session_id = session.id;
      (socket.data as SocketData).participant_id = participant.id;
      (socket.data as SocketData).nickname = participant.nickname;
      (socket.data as SocketData).store_id = session.store_id;

      return next();
    }

    // No recognised token provided
    return next(new Error('Authentication required'));
  } catch (err) {
    if (err instanceof jwt.JsonWebTokenError) {
      return next(new Error('Invalid token'));
    }
    return next(err instanceof Error ? err : new Error('Authentication failed'));
  }
}

// ---------------------------------------------------------------------------
// Setup
// ---------------------------------------------------------------------------

/**
 * Attach Socket.io to the given HTTP server.
 * Called once from `server/src/index.ts`.
 */
export function setupSocket(server: http.Server): SocketIOServer {
  io = new SocketIOServer(server, {
    cors: {
      origin: process.env.CLIENT_URL || 'http://localhost:5173',
      credentials: true,
    },
    // Avoid overwhelming the server with large payloads
    maxHttpBufferSize: 1e6, // 1 MB
  });

  // Register auth middleware
  io.use(authMiddleware);

  // ---------------------------------------------------------------------------
  // Connection handler
  // ---------------------------------------------------------------------------

  io.on('connection', (socket) => {
    const data = socket.data as SocketData;

    // ----- Customer / participant -----
    if (data.session_id && data.participant_id) {
      const sessionRoom = `session:${data.session_id}`;

      // Join the session room
      socket.join(sessionRoom);

      // Notify other participants that someone joined
      socket.to(sessionRoom).emit(PARTICIPANT_JOINED, {
        participant_id: data.participant_id,
        nickname: data.nickname ?? 'Guest',
      });

      console.log(
        `[Socket] Participant ${data.participant_id} (${data.nickname}) joined session ${data.session_id}`,
      );
    }

    // ----- Admin -----
    if (data.owner_id && data.store_id) {
      // Automatically join the store room for this admin
      socket.join(`store:${data.store_id}`);

      console.log(
        `[Socket] Admin ${data.owner_id} joined store ${data.store_id}`,
      );
    }

    // Register event handlers (cart:editing, session:leave, admin:join-store)
    registerHandlers(socket);

    // ----- Disconnect -----
    socket.on('disconnect', (reason) => {
      if (data.session_id && data.participant_id) {
        // Notify the session room that this participant disconnected
        socket.to(`session:${data.session_id}`).emit(PARTICIPANT_LEFT, {
          participant_id: data.participant_id,
        });

        console.log(
          `[Socket] Participant ${data.participant_id} disconnected from session ${data.session_id} (${reason})`,
        );
      }

      if (data.owner_id) {
        console.log(`[Socket] Admin ${data.owner_id} disconnected (${reason})`);
      }
    });
  });

  console.log('[Socket] Socket.io server initialized');
  return io;
}

// Re-export events and handler types for convenience
export * from './events.js';
export type { SocketData } from './handlers.js';
