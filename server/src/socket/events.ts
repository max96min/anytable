// Socket.io event name constants
// These must match the keys in the shared SocketEvents interface

export const CART_UPDATED = 'CART_UPDATED' as const;
export const ORDER_PLACED = 'ORDER_PLACED' as const;
export const ORDER_STATUS_CHANGED = 'ORDER_STATUS_CHANGED' as const;
export const SESSION_CLOSED = 'SESSION_CLOSED' as const;
export const PARTICIPANT_JOINED = 'PARTICIPANT_JOINED' as const;
export const PARTICIPANT_LEFT = 'PARTICIPANT_LEFT' as const;
export const CART_EDITING = 'CART_EDITING' as const;

export type SocketEventName =
  | typeof CART_UPDATED
  | typeof ORDER_PLACED
  | typeof ORDER_STATUS_CHANGED
  | typeof SESSION_CLOSED
  | typeof PARTICIPANT_JOINED
  | typeof PARTICIPANT_LEFT
  | typeof CART_EDITING;
