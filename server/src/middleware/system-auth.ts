import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { AppError } from '../lib/errors.js';

interface SystemJwtPayload {
  system_admin_id: string;
  type: 'system_access' | 'system_refresh';
}

export function systemAuth(req: Request, _res: Response, next: NextFunction): void {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw AppError.unauthorized('Missing or invalid authorization header');
    }

    const token = authHeader.slice(7);
    const secret = process.env.JWT_SECRET;
    if (!secret) {
      throw AppError.internal('JWT_SECRET is not configured');
    }

    const decoded = jwt.verify(token, secret) as SystemJwtPayload;

    if (decoded.type !== 'system_access') {
      throw AppError.unauthorized('Invalid token type');
    }

    req.system_admin_id = decoded.system_admin_id;

    next();
  } catch (err) {
    if (err instanceof AppError) {
      next(err);
      return;
    }
    if (err instanceof jwt.JsonWebTokenError) {
      next(AppError.unauthorized('Invalid or expired token'));
      return;
    }
    next(err);
  }
}
