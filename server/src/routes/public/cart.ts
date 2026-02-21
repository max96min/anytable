import { Router, Request, Response, NextFunction } from 'express';
import { validate } from '../../middleware/validate.js';
import { sessionAuth } from '../../middleware/session-auth.js';
import { cartIdParamSchema, cartMutationSchema } from '../../schemas/index.js';
import * as cartService from '../../services/cart.service.js';

const router = Router();

// All cart routes require session auth
router.use(sessionAuth);

// GET /api/public/carts/:cartId
router.get(
  '/:cartId',
  validate(cartIdParamSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const cart = await cartService.getCartById(req.params.cartId);

      res.status(200).json({
        success: true,
        data: cart,
      });
    } catch (err) {
      next(err);
    }
  }
);

// POST /api/public/carts/:cartId/mutations
router.post(
  '/:cartId/mutations',
  validate(cartIdParamSchema),
  validate(cartMutationSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const cart = await cartService.mutateCart(req.params.cartId, req.body);

      res.status(200).json({
        success: true,
        data: cart,
      });
    } catch (err) {
      next(err);
    }
  }
);

export default router;
