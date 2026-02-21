declare namespace Express {
  interface Request {
    /** Set by admin-auth middleware */
    owner_id?: string;
    /** Set by admin-auth or session-auth middleware */
    store_id?: string;
    /** Set by session-auth middleware */
    session_id?: string;
    /** Set by session-auth middleware */
    participant_id?: string;
  }
}
