import { Router, Request, Response, NextFunction } from 'express';
import { validate } from '../../middleware/validate.js';
import { loginSchema, registerSchema, refreshTokenSchema } from '../../schemas/index.js';
import * as authService from '../../services/auth.service.js';

const router = Router();

// POST /api/admin/auth/login
router.post(
  '/login',
  validate(loginSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { email, password } = req.body;
      const result = await authService.login(email, password);

      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (err) {
      next(err);
    }
  }
);

// POST /api/admin/auth/refresh
router.post(
  '/refresh',
  validate(refreshTokenSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { refresh_token } = req.body;
      const result = await authService.refreshToken(refresh_token);

      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (err) {
      next(err);
    }
  }
);

// POST /api/admin/auth/register
router.post(
  '/register',
  validate(registerSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { email, password, name, store_name } = req.body;
      const result = await authService.register(email, password, name, store_name);

      res.status(201).json({
        success: true,
        data: result,
      });
    } catch (err) {
      next(err);
    }
  }
);

export default router;
