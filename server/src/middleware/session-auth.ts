import { Request, Response, NextFunction } from 'express';
import { prisma } from '../lib/prisma.js';
import { AppError } from '../lib/errors.js';

/**
 * Session token auth for customer routes.
 * Token format: "session:{session_id}:participant:{participant_id}"
 */
export async function sessionAuth(
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw AppError.unauthorized('Missing or invalid session token');
    }

    const token = authHeader.slice(7);
    const match = token.match(
      /^session:([0-9a-f-]{36}):participant:([0-9a-f-]{36})$/
    );
    if (!match) {
      throw AppError.unauthorized('Invalid session token format');
    }

    const [, sessionId, participantId] = match;

    const session = await prisma.tableSession.findUnique({
      where: { id: sessionId },
      select: { id: true, status: true, store_id: true },
    });

    if (!session) {
      throw AppError.unauthorized('Session not found');
    }

    if (session.status !== 'OPEN') {
      throw AppError.unauthorized('Session is no longer active');
    }

    // Verify participant belongs to session
    const participant = await prisma.participant.findFirst({
      where: {
        id: participantId,
        session_id: sessionId,
        is_active: true,
      },
      select: { id: true },
    });

    if (!participant) {
      throw AppError.unauthorized('Participant not found or inactive');
    }

    req.session_id = sessionId;
    req.participant_id = participantId;
    req.store_id = session.store_id;

    next();
  } catch (err) {
    if (err instanceof AppError) {
      next(err);
      return;
    }
    next(err);
  }
}
