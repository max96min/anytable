import { Router, Request, Response, NextFunction } from 'express';
import { adminAuth } from '../../middleware/admin-auth.js';
import { validate } from '../../middleware/validate.js';
import { adminOrdersQuerySchema, updateOrderStatusSchema } from '../../schemas/index.js';
import * as orderService from '../../services/order.service.js';

const router = Router();

router.use(adminAuth);

// GET /api/admin/orders
router.get(
  '/',
  validate(adminOrdersQuerySchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const filters = req.query as {
        status?: string;
        table_id?: string;
        session_id?: string;
        limit?: number;
        offset?: number;
      };

      const result = await orderService.getOrdersByStore(req.store_id!, filters);

      res.status(200).json({
        success: true,
        data: result.orders,
        meta: {
          total: result.total,
          limit: filters.limit ?? 50,
          offset: filters.offset ?? 0,
        },
      });
    } catch (err) {
      next(err);
    }
  }
);

// PATCH /api/admin/orders/:id/status
router.patch(
  '/:id/status',
  validate(updateOrderStatusSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const order = await orderService.updateOrderStatus(
        req.params.id,
        req.body.status,
        req.store_id!
      );

      res.status(200).json({
        success: true,
        data: order,
      });
    } catch (err) {
      next(err);
    }
  }
);

export default router;
