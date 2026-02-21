import type { Socket } from 'socket.io';
import { CART_EDITING, PARTICIPANT_LEFT } from './events.js';

/**
 * Data attached to authenticated sockets via the auth middleware.
 */
export interface SocketData {
  /** Customer session ID (set when auth came from a session token) */
  session_id?: string;
  /** Participant ID within the session */
  participant_id?: string;
  /** Participant display name */
  nickname?: string;
  /** Admin store ID (set when auth came from a JWT) */
  store_id?: string;
  /** Admin owner ID */
  owner_id?: string;
}

// ---------------------------------------------------------------------------
// Handler: cart:editing
// ---------------------------------------------------------------------------
// A client indicates they are currently editing the shared cart.
// Broadcast to the rest of the session room so other participants can see a
// "user X is editing" indicator in real time.

export function handleCartEditing(socket: Socket): void {
  socket.on('cart:editing', (data: { is_editing: boolean }) => {
    const { session_id, participant_id, nickname } = socket.data as SocketData;

    if (!session_id || !participant_id) return;

    // Broadcast to everyone else in the session room (not back to sender)
    socket.to(`session:${session_id}`).emit(CART_EDITING, {
      participant_id,
      nickname: nickname ?? 'Guest',
      is_editing: data.is_editing,
    });
  });
}

// ---------------------------------------------------------------------------
// Handler: session:leave
// ---------------------------------------------------------------------------
// A client explicitly leaves the session (e.g. navigating away).  We remove
// them from the session room and notify other participants.

export function handleSessionLeave(socket: Socket): void {
  socket.on('session:leave', () => {
    const { session_id, participant_id } = socket.data as SocketData;

    if (!session_id || !participant_id) return;

    const room = `session:${session_id}`;
    socket.leave(room);

    // Notify remaining participants
    socket.to(room).emit(PARTICIPANT_LEFT, {
      participant_id,
    });
  });
}

// ---------------------------------------------------------------------------
// Handler: admin:join-store
// ---------------------------------------------------------------------------
// An admin client explicitly requests to join a store room so they can receive
// real-time order updates.  The store_id is verified against the auth data to
// prevent unauthorized room access.

export function handleAdminJoinStore(socket: Socket): void {
  socket.on('admin:join-store', (data: { store_id: string }) => {
    const { owner_id, store_id: authedStoreId } = socket.data as SocketData;

    // Only allow if the socket is an authenticated admin for this store
    if (!owner_id || !authedStoreId) return;
    if (data.store_id !== authedStoreId) return;

    socket.join(`store:${data.store_id}`);
  });
}

// ---------------------------------------------------------------------------
// Register all handlers on a socket
// ---------------------------------------------------------------------------

export function registerHandlers(socket: Socket): void {
  handleCartEditing(socket);
  handleSessionLeave(socket);
  handleAdminJoinStore(socket);
}
