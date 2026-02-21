import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { Prisma } from '@prisma/client';
import { AppError } from '../lib/errors.js';

export function errorHandler(
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  // AppError - our custom error class
  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      success: false,
      error: err.message,
      code: err.code,
      ...(err.details !== undefined && { details: err.details }),
    });
    return;
  }

  // Zod validation errors
  if (err instanceof ZodError) {
    const formatted = err.errors.map((e) => ({
      path: e.path.join('.'),
      message: e.message,
    }));
    res.status(400).json({
      success: false,
      error: 'Validation error',
      code: 'VALIDATION_ERROR',
      details: formatted,
    });
    return;
  }

  // Prisma known request errors
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    switch (err.code) {
      case 'P2002': {
        const target = (err.meta?.target as string[]) || [];
        res.status(409).json({
          success: false,
          error: `Unique constraint violation on: ${target.join(', ')}`,
          code: 'DUPLICATE_ENTRY',
        });
        return;
      }
      case 'P2025':
        res.status(404).json({
          success: false,
          error: 'Record not found',
          code: 'NOT_FOUND',
        });
        return;
      case 'P2003':
        res.status(400).json({
          success: false,
          error: 'Foreign key constraint failed',
          code: 'FOREIGN_KEY_ERROR',
        });
        return;
      default:
        res.status(400).json({
          success: false,
          error: `Database error: ${err.code}`,
          code: 'DATABASE_ERROR',
        });
        return;
    }
  }

  // Prisma validation errors
  if (err instanceof Prisma.PrismaClientValidationError) {
    res.status(400).json({
      success: false,
      error: 'Invalid database query',
      code: 'DATABASE_VALIDATION_ERROR',
    });
    return;
  }

  // Generic / unexpected errors
  console.error('[Error]', err);
  res.status(500).json({
    success: false,
    error: 'Internal server error',
    code: 'INTERNAL_ERROR',
  });
}
