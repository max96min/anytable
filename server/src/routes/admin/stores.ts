import { Router, Request, Response, NextFunction } from 'express';
import { adminAuth } from '../../middleware/admin-auth.js';
import { validate } from '../../middleware/validate.js';
import { updateStoreSchema } from '../../schemas/index.js';
import * as storeService from '../../services/store.service.js';

const router = Router();

router.use(adminAuth);

// GET /api/admin/stores
router.get(
  '/',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const store = await storeService.getStore(req.store_id!);

      res.status(200).json({
        success: true,
        data: store,
      });
    } catch (err) {
      next(err);
    }
  }
);

// PATCH /api/admin/stores
router.patch(
  '/',
  validate(updateStoreSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const store = await storeService.updateStore(req.store_id!, req.body);

      res.status(200).json({
        success: true,
        data: store,
      });
    } catch (err) {
      next(err);
    }
  }
);

export default router;
