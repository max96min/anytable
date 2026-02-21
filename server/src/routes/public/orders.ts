import { Router, Request, Response, NextFunction } from 'express';
import { validate } from '../../middleware/validate.js';
import { sessionAuth } from '../../middleware/session-auth.js';
import { placeOrderSchema, sessionIdParamSchema } from '../../schemas/index.js';
import * as orderService from '../../services/order.service.js';

const router = Router();

// All order routes require session auth
router.use(sessionAuth);

// POST /api/public/sessions/:sessionId/orders
router.post(
  '/:sessionId/orders',
  validate(sessionIdParamSchema),
  validate(placeOrderSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { sessionId } = req.params;
      const { participant_id, cart_version, idempotency_key } = req.body;

      const order = await orderService.placeOrder(
        sessionId,
        participant_id,
        cart_version,
        idempotency_key
      );

      res.status(201).json({
        success: true,
        data: order,
      });
    } catch (err) {
      next(err);
    }
  }
);

// GET /api/public/sessions/:sessionId/orders
router.get(
  '/:sessionId/orders',
  validate(sessionIdParamSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const orders = await orderService.getOrders(req.params.sessionId);

      res.status(200).json({
        success: true,
        data: orders,
      });
    } catch (err) {
      next(err);
    }
  }
);

export default router;
