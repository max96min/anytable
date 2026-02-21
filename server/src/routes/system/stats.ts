import { Router, Request, Response, NextFunction } from 'express';
import { systemAuth } from '../../middleware/system-auth.js';
import * as systemAdminService from '../../services/system-admin.service.js';

const router = Router();

router.use(systemAuth);

// GET /api/system/stats
router.get(
  '/',
  async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const [stats, recentOrders] = await Promise.all([
        systemAdminService.getPlatformStats(),
        systemAdminService.getRecentOrders(10),
      ]);
      res.status(200).json({
        success: true,
        data: { ...stats, recent_orders: recentOrders },
      });
    } catch (err) {
      next(err);
    }
  },
);

export default router;
