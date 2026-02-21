import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { AppError } from '../lib/errors.js';

interface JwtPayload {
  owner_id: string;
  store_id: string;
  type: 'access' | 'refresh';
}

export function adminAuth(req: Request, _res: Response, next: NextFunction): void {
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

    const decoded = jwt.verify(token, secret) as JwtPayload;

    if (decoded.type !== 'access') {
      throw AppError.unauthorized('Invalid token type');
    }

    req.owner_id = decoded.owner_id;
    req.store_id = decoded.store_id;

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
