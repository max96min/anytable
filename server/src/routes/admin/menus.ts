import { Router, Request, Response, NextFunction } from 'express';
import { adminAuth } from '../../middleware/admin-auth.js';
import { validate } from '../../middleware/validate.js';
import { createMenuSchema, updateMenuSchema, menuQuerySchema } from '../../schemas/index.js';
import * as menuService from '../../services/menu.service.js';

const router = Router();

router.use(adminAuth);

// GET /api/admin/menus
router.get(
  '/',
  validate(menuQuerySchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const filters = req.query as {
        category_id?: string;
        is_recommended?: boolean;
        search?: string;
      };
      const menus = await menuService.getByStore(req.store_id!, filters);

      res.status(200).json({
        success: true,
        data: menus,
      });
    } catch (err) {
      next(err);
    }
  }
);

// POST /api/admin/menus
router.post(
  '/',
  validate(createMenuSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const menu = await menuService.create(req.store_id!, req.body);

      res.status(201).json({
        success: true,
        data: menu,
      });
    } catch (err) {
      next(err);
    }
  }
);

// GET /api/admin/menus/:id
router.get(
  '/:id',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const menu = await menuService.getByIdForAdmin(req.params.id, req.store_id!);

      res.status(200).json({
        success: true,
        data: menu,
      });
    } catch (err) {
      next(err);
    }
  }
);

// PATCH /api/admin/menus/:id
router.patch(
  '/:id',
  validate(updateMenuSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const menu = await menuService.update(req.params.id, req.store_id!, req.body);

      res.status(200).json({
        success: true,
        data: menu,
      });
    } catch (err) {
      next(err);
    }
  }
);

// DELETE /api/admin/menus/:id
router.delete(
  '/:id',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      await menuService.remove(req.params.id, req.store_id!);

      res.status(200).json({
        success: true,
        message: 'Menu item deleted',
      });
    } catch (err) {
      next(err);
    }
  }
);

export default router;
