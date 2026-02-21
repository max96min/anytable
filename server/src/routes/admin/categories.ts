import { Router, Request, Response, NextFunction } from 'express';
import { adminAuth } from '../../middleware/admin-auth.js';
import { validate } from '../../middleware/validate.js';
import { createCategorySchema, updateCategorySchema } from '../../schemas/index.js';
import * as categoryService from '../../services/category.service.js';

const router = Router();

router.use(adminAuth);

// GET /api/admin/categories
router.get(
  '/',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const categories = await categoryService.getByStore(req.store_id!);

      res.status(200).json({
        success: true,
        data: categories,
      });
    } catch (err) {
      next(err);
    }
  }
);

// POST /api/admin/categories
router.post(
  '/',
  validate(createCategorySchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const category = await categoryService.create(req.store_id!, req.body);

      res.status(201).json({
        success: true,
        data: category,
      });
    } catch (err) {
      next(err);
    }
  }
);

// PATCH /api/admin/categories/:id
router.patch(
  '/:id',
  validate(updateCategorySchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const category = await categoryService.update(
        req.params.id,
        req.store_id!,
        req.body
      );

      res.status(200).json({
        success: true,
        data: category,
      });
    } catch (err) {
      next(err);
    }
  }
);

// DELETE /api/admin/categories/:id
router.delete(
  '/:id',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      await categoryService.remove(req.params.id, req.store_id!);

      res.status(200).json({
        success: true,
        message: 'Category deleted',
      });
    } catch (err) {
      next(err);
    }
  }
);

export default router;
