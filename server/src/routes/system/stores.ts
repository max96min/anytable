import { Router, Request, Response, NextFunction } from 'express';
import { validate } from '../../middleware/validate.js';
import { systemStoresQuerySchema, systemStoreIdParamSchema } from '../../schemas/system.js';
import { systemAuth } from '../../middleware/system-auth.js';
import * as systemAdminService from '../../services/system-admin.service.js';

const router = Router();

router.use(systemAuth);

// GET /api/system/stores
router.get(
  '/',
  validate(systemStoresQuerySchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await systemAdminService.getStores(req.query as any);
      res.status(200).json({ success: true, data: result.items, meta: result.meta });
    } catch (err) {
      next(err);
    }
  },
);

// GET /api/system/stores/:id
router.get(
  '/:id',
  validate(systemStoreIdParamSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await systemAdminService.getStoreDetail(req.params.id);
      res.status(200).json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  },
);

// PATCH /api/system/stores/:id/toggle
router.patch(
  '/:id/toggle',
  validate(systemStoreIdParamSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await systemAdminService.toggleStoreActive(req.params.id);
      res.status(200).json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  },
);

export default router;
