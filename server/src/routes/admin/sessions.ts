import { Router, Request, Response, NextFunction } from 'express';
import { adminAuth } from '../../middleware/admin-auth.js';
import { validate } from '../../middleware/validate.js';
import { adminSessionsQuerySchema } from '../../schemas/index.js';
import * as tableSessionService from '../../services/table-session.service.js';
import { z } from 'zod';

const router = Router();

router.use(adminAuth);

const sessionIdParam = z.object({
  params: z.object({
    id: z.string().uuid('Invalid session ID'),
  }),
});

// GET /api/admin/sessions
router.get(
  '/',
  validate(adminSessionsQuerySchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const options = req.query as {
        status?: string;
        limit?: number;
        offset?: number;
      };

      const result = await tableSessionService.getActiveSessions(
        req.store_id!,
        options
      );

      res.status(200).json({
        success: true,
        data: result.sessions,
        meta: {
          total: result.total,
          limit: options.limit ?? 50,
          offset: options.offset ?? 0,
        },
      });
    } catch (err) {
      next(err);
    }
  }
);

// POST /api/admin/sessions/:id/close
router.post(
  '/:id/close',
  validate(sessionIdParam),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const session = await tableSessionService.closeSession(req.params.id);

      res.status(200).json({
        success: true,
        data: {
          id: session.id,
          status: session.status,
          closed_at: session.closed_at?.toISOString(),
        },
      });
    } catch (err) {
      next(err);
    }
  }
);

export default router;
