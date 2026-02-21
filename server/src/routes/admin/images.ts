import { Router, Request, Response, NextFunction } from 'express';
import { adminAuth } from '../../middleware/admin-auth.js';
import { uploadSingle } from '../../middleware/upload.js';
import * as imageService from '../../services/image.service.js';

const router = Router();

router.use(adminAuth);

// POST /api/admin/images/upload
router.post(
  '/upload',
  uploadSingle,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.file) {
        return res.status(400).json({ success: false, error: 'No image file provided' });
      }

      const imageUrl = await imageService.processAndSave(
        req.file.buffer,
        req.store_id!,
        req.file.mimetype,
      );

      res.status(200).json({
        success: true,
        data: { image_url: imageUrl },
      });
    } catch (err) {
      next(err);
    }
  },
);

// POST /api/admin/images/generate
router.post(
  '/generate',
  async (req: Request, res: Response, _next: NextFunction) => {
    try {
      const { prompt } = req.body;
      if (!prompt || typeof prompt !== 'string') {
        return res.status(400).json({ success: false, error: 'Prompt is required' });
      }

      const imageUrl = await imageService.generateWithAI(prompt, req.store_id!);

      res.status(200).json({
        success: true,
        data: { image_url: imageUrl },
      });
    } catch (err: unknown) {
      console.error('[AI Image Generate]', err);
      const message =
        err instanceof Error ? err.message : 'Image generation failed';
      res.status(502).json({ success: false, error: message });
    }
  },
);

export default router;
