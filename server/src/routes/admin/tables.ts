import { Router, Request, Response, NextFunction } from 'express';
import { adminAuth } from '../../middleware/admin-auth.js';
import { validate } from '../../middleware/validate.js';
import { createTableSchema, updateTableSchema } from '../../schemas/index.js';
import { prisma } from '../../lib/prisma.js';
import { AppError } from '../../lib/errors.js';
import { generateQrToken } from '../../services/qr.service.js';

const router = Router();

router.use(adminAuth);

// GET /api/admin/tables
router.get(
  '/',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const tables = await prisma.table.findMany({
        where: { store_id: req.store_id! },
        orderBy: { table_number: 'asc' },
        select: {
          id: true,
          store_id: true,
          table_number: true,
          label: true,
          seats: true,
          status: true,
          qr_token: true,
          qr_token_version: true,
          created_at: true,
          sessions: {
            where: { status: 'OPEN' },
            select: { id: true },
            take: 1,
          },
        },
      });

      const result = tables.map((t) => ({
        id: t.id,
        store_id: t.store_id,
        table_number: t.table_number,
        label: t.label,
        seats: t.seats,
        status: t.status,
        qr_token: t.qr_token,
        qr_token_version: t.qr_token_version,
        current_session_id: t.sessions[0]?.id ?? null,
      }));

      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (err) {
      next(err);
    }
  }
);

// POST /api/admin/tables (bulk create)
router.post(
  '/',
  validate(createTableSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const storeId = req.store_id!;
      const { tables: tableInputs } = req.body as {
        tables: Array<{ table_number: number; label?: string; seats: number }>;
      };

      const created = await prisma.$transaction(
        tableInputs.map((t) => {
          const qrToken = generateQrToken(
            // We don't have the ID yet, so we use a placeholder flow:
            // Actually, we need to create then update. Instead, use a two-step:
            `placeholder-${t.table_number}`,
            storeId,
            1
          );

          return prisma.table.create({
            data: {
              store_id: storeId,
              table_number: t.table_number,
              label: t.label ?? null,
              seats: t.seats,
              qr_token: qrToken,
              qr_token_version: 1,
            },
          });
        })
      );

      // Now regenerate QR tokens with actual table IDs
      const updated = await prisma.$transaction(
        created.map((table) => {
          const qrToken = generateQrToken(table.id, storeId, 1);
          return prisma.table.update({
            where: { id: table.id },
            data: { qr_token: qrToken },
          });
        })
      );

      res.status(201).json({
        success: true,
        data: updated.map((t) => ({
          id: t.id,
          store_id: t.store_id,
          table_number: t.table_number,
          label: t.label,
          seats: t.seats,
          status: t.status,
          qr_token: t.qr_token,
          qr_token_version: t.qr_token_version,
        })),
      });
    } catch (err) {
      next(err);
    }
  }
);

// PATCH /api/admin/tables/:id
router.patch(
  '/:id',
  validate(updateTableSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const table = await prisma.table.findUnique({
        where: { id: req.params.id },
        select: { store_id: true },
      });

      if (!table) {
        throw AppError.notFound('Table not found');
      }

      if (table.store_id !== req.store_id!) {
        throw AppError.forbidden('Table does not belong to your store');
      }

      const updated = await prisma.table.update({
        where: { id: req.params.id },
        data: req.body,
      });

      res.status(200).json({
        success: true,
        data: {
          id: updated.id,
          store_id: updated.store_id,
          table_number: updated.table_number,
          label: updated.label,
          seats: updated.seats,
          status: updated.status,
          qr_token: updated.qr_token,
          qr_token_version: updated.qr_token_version,
        },
      });
    } catch (err) {
      next(err);
    }
  }
);

// POST /api/admin/tables/:id/regenerate-qr
router.post(
  '/:id/regenerate-qr',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const table = await prisma.table.findUnique({
        where: { id: req.params.id },
        select: { id: true, store_id: true, qr_token_version: true },
      });

      if (!table) {
        throw AppError.notFound('Table not found');
      }

      if (table.store_id !== req.store_id!) {
        throw AppError.forbidden('Table does not belong to your store');
      }

      const newVersion = table.qr_token_version + 1;
      const newQrToken = generateQrToken(table.id, table.store_id, newVersion);

      const updated = await prisma.table.update({
        where: { id: req.params.id },
        data: {
          qr_token: newQrToken,
          qr_token_version: newVersion,
        },
      });

      res.status(200).json({
        success: true,
        data: {
          id: updated.id,
          qr_token: updated.qr_token,
          qr_token_version: updated.qr_token_version,
        },
      });
    } catch (err) {
      next(err);
    }
  }
);

// GET /api/admin/tables/:id/qr-url
router.get(
  '/:id/qr-url',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const table = await prisma.table.findUnique({
        where: { id: req.params.id },
        select: { id: true, store_id: true, qr_token: true, table_number: true },
      });

      if (!table) {
        throw AppError.notFound('Table not found');
      }

      if (table.store_id !== req.store_id!) {
        throw AppError.forbidden('Table does not belong to your store');
      }

      const clientUrl = process.env.CLIENT_URL || 'http://localhost:3000';
      const qrUrl = `${clientUrl}/join?token=${encodeURIComponent(table.qr_token)}`;

      res.status(200).json({
        success: true,
        data: {
          table_id: table.id,
          table_number: table.table_number,
          qr_token: table.qr_token,
          qr_url: qrUrl,
        },
      });
    } catch (err) {
      next(err);
    }
  }
);

// DELETE /api/admin/tables/:id
router.delete(
  '/:id',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const table = await prisma.table.findUnique({
        where: { id: req.params.id },
        select: { store_id: true },
      });

      if (!table) {
        throw AppError.notFound('Table not found');
      }

      if (table.store_id !== req.store_id!) {
        throw AppError.forbidden('Table does not belong to your store');
      }

      // Check for active sessions
      const activeSessions = await prisma.tableSession.count({
        where: { table_id: req.params.id, status: 'OPEN' },
      });

      if (activeSessions > 0) {
        throw AppError.conflict(
          'Cannot delete table with active sessions. Close sessions first.',
          'TABLE_HAS_ACTIVE_SESSIONS'
        );
      }

      await prisma.table.delete({ where: { id: req.params.id } });

      res.status(200).json({
        success: true,
        message: 'Table deleted',
      });
    } catch (err) {
      next(err);
    }
  }
);

export default router;
