import { Router, Request, Response, NextFunction } from 'express';
import { validate } from '../../middleware/validate.js';
import {
  systemOwnersQuerySchema,
  systemOwnerIdParamSchema,
  createOwnerStoreSchema,
} from '../../schemas/system.js';
import { systemAuth } from '../../middleware/system-auth.js';
import * as systemAdminService from '../../services/system-admin.service.js';

const router = Router();

router.use(systemAuth);

// GET /api/system/owners
router.get(
  '/',
  validate(systemOwnersQuerySchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await systemAdminService.getOwners(req.query as any);
      res.status(200).json({ success: true, data: result.items, meta: result.meta });
    } catch (err) {
      next(err);
    }
  },
);

// POST /api/system/owners
router.post(
  '/',
  validate(createOwnerStoreSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await systemAdminService.createOwnerWithStore(req.body);
      res.status(201).json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  },
);

// PATCH /api/system/owners/:id/toggle
router.patch(
  '/:id/toggle',
  validate(systemOwnerIdParamSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await systemAdminService.toggleOwnerActive(req.params.id);
      res.status(200).json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  },
);

export default router;
