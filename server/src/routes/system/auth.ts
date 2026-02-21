import { Router, Request, Response, NextFunction } from 'express';
import { validate } from '../../middleware/validate.js';
import { systemLoginSchema, systemRefreshTokenSchema } from '../../schemas/system.js';
import * as systemAuthService from '../../services/system-auth.service.js';

const router = Router();

// POST /api/system/auth/login
router.post(
  '/login',
  validate(systemLoginSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { email, password } = req.body;
      const result = await systemAuthService.login(email, password);

      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (err) {
      next(err);
    }
  },
);

// POST /api/system/auth/refresh
router.post(
  '/refresh',
  validate(systemRefreshTokenSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { refresh_token } = req.body;
      const result = await systemAuthService.refreshToken(refresh_token);

      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (err) {
      next(err);
    }
  },
);

export default router;
