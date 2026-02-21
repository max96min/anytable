import { Router, Request, Response, NextFunction } from 'express';
import { validate } from '../../middleware/validate.js';
import { menuQuerySchema } from '../../schemas/index.js';
import * as menuService from '../../services/menu.service.js';
import * as categoryService from '../../services/category.service.js';
import { z } from 'zod';

const router = Router();

const storeIdParamSchema = z.object({
  params: z.object({
    storeId: z.string().uuid('Invalid store ID'),
  }),
});

const menuDetailParamSchema = z.object({
  params: z.object({
    storeId: z.string().uuid('Invalid store ID'),
    menuId: z.string().uuid('Invalid menu ID'),
  }),
});

// GET /api/public/stores/:storeId/menu
router.get(
  '/stores/:storeId/menu',
  validate(storeIdParamSchema),
  validate(menuQuerySchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { storeId } = req.params;
      const filters = req.query as {
        category_id?: string;
        is_recommended?: boolean;
        search?: string;
      };

      const [categories, menus] = await Promise.all([
        categoryService.getByStore(storeId),
        menuService.getByStore(storeId, filters),
      ]);

      res.status(200).json({
        success: true,
        data: {
          categories: categories.filter((c) => c.is_active),
          menus,
        },
      });
    } catch (err) {
      next(err);
    }
  }
);

// GET /api/public/stores/:storeId/menu/:menuId
router.get(
  '/stores/:storeId/menu/:menuId',
  validate(menuDetailParamSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const menu = await menuService.getById(req.params.menuId);

      res.status(200).json({
        success: true,
        data: menu,
      });
    } catch (err) {
      next(err);
    }
  }
);

export default router;
