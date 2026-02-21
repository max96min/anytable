import { Router, Request, Response, NextFunction } from 'express';
import { adminAuth } from '../../middleware/admin-auth.js';
import { validate } from '../../middleware/validate.js';
import { createMenuSchema, updateMenuSchema, menuQuerySchema } from '../../schemas/index.js';
import * as menuService from '../../services/menu.service.js';
import * as translationService from '../../services/translation.service.js';

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

// GET /api/admin/menus/:id/translations
router.get(
  '/:id/translations',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const menu = await menuService.getByIdForAdmin(req.params.id, req.store_id!);

      res.status(200).json({
        success: true,
        data: menu.locales as Record<string, unknown>,
      });
    } catch (err) {
      next(err);
    }
  }
);

// PUT /api/admin/menus/:id/translations/:language
router.put(
  '/:id/translations/:language',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id, language } = req.params;
      const menu = await menuService.getByIdForAdmin(id, req.store_id!);

      const locales = (menu.locales || {}) as Record<string, unknown>;
      locales[language] = req.body;

      await menuService.update(id, req.store_id!, { locales });

      res.status(200).json({
        success: true,
        data: locales,
      });
    } catch (err) {
      next(err);
    }
  }
);

// POST /api/admin/menus/:id/auto-translate
router.post(
  '/:id/auto-translate',
  async (req: Request, res: Response, _next: NextFunction) => {
    try {
      const { from_lang, to_lang } = req.body;
      if (!from_lang || !to_lang || from_lang === to_lang) {
        return res.status(400).json({
          success: false,
          error: 'Valid from_lang and to_lang are required',
        });
      }

      const menu = await menuService.getByIdForAdmin(req.params.id, req.store_id!);
      const locales = menu.locales as Record<string, { name?: string; description?: string; cultural_note?: string }>;
      const sourceLocale = locales[from_lang];

      if (!sourceLocale?.name) {
        return res.status(400).json({
          success: false,
          error: `No translation found for source language: ${from_lang}`,
        });
      }

      const translated = await translationService.translateMenu(
        {
          name: sourceLocale.name,
          description: sourceLocale.description,
          cultural_note: sourceLocale.cultural_note,
        },
        from_lang,
        to_lang,
      );

      // Save translated result to DB
      locales[to_lang] = {
        name: translated.name,
        description: translated.description,
        cultural_note: translated.cultural_note,
      };
      await menuService.update(req.params.id, req.store_id!, { locales });

      res.status(200).json({
        success: true,
        data: translated,
      });
    } catch (err: unknown) {
      console.error('[Auto Translate]', err);
      const message =
        err instanceof Error ? err.message : 'Translation failed';
      res.status(502).json({ success: false, error: message });
    }
  },
);

// POST /api/admin/menus/:id/bulk-translate
router.post(
  '/:id/bulk-translate',
  async (req: Request, res: Response, _next: NextFunction) => {
    try {
      const { from_lang, to_langs } = req.body as { from_lang?: string; to_langs?: string[] };
      if (!from_lang || !Array.isArray(to_langs) || to_langs.length === 0) {
        return res.status(400).json({
          success: false,
          error: 'from_lang and to_langs[] are required',
        });
      }

      const menu = await menuService.getByIdForAdmin(req.params.id, req.store_id!);
      const locales = menu.locales as Record<string, { name?: string; description?: string; cultural_note?: string }>;
      const sourceLocale = locales[from_lang];

      if (!sourceLocale?.name) {
        return res.status(400).json({
          success: false,
          error: `No translation found for source language: ${from_lang}`,
        });
      }

      const source = {
        name: sourceLocale.name,
        description: sourceLocale.description,
        cultural_note: sourceLocale.cultural_note,
      };

      const results = await Promise.allSettled(
        to_langs
          .filter((lang) => lang !== from_lang)
          .map(async (toLang) => {
            const translated = await translationService.translateMenu(source, from_lang, toLang);
            return { lang: toLang, data: translated };
          }),
      );

      const targetLangs = to_langs.filter((lang) => lang !== from_lang);
      const translations: Record<string, { name: string; description?: string; cultural_note?: string }> = {};
      const errors: Record<string, string> = {};

      results.forEach((result, idx) => {
        if (result.status === 'fulfilled') {
          translations[result.value.lang] = result.value.data;
        } else {
          const reason = result.reason instanceof Error ? result.reason.message : 'Translation failed';
          errors[targetLangs[idx]] = reason;
        }
      });

      // Save all successful translations to DB
      if (Object.keys(translations).length > 0) {
        for (const [lang, data] of Object.entries(translations)) {
          locales[lang] = {
            name: data.name,
            description: data.description,
            cultural_note: data.cultural_note,
          };
        }
        await menuService.update(req.params.id, req.store_id!, { locales });
      }

      res.status(200).json({
        success: true,
        data: {
          translations,
          errors,
        },
      });
    } catch (err: unknown) {
      console.error('[Bulk Translate]', err);
      const message =
        err instanceof Error ? err.message : 'Bulk translation failed';
      res.status(502).json({ success: false, error: message });
    }
  },
);

// POST /api/admin/menus/:id/generate-cultural-note
router.post(
  '/:id/generate-cultural-note',
  async (req: Request, res: Response, _next: NextFunction) => {
    try {
      const { language } = req.body;
      if (!language) {
        return res.status(400).json({
          success: false,
          error: 'language is required',
        });
      }

      const menu = await menuService.getByIdForAdmin(req.params.id, req.store_id!);
      const locales = menu.locales as Record<string, { name?: string; description?: string }>;

      // Use the target language's name if available, otherwise fall back to any available name
      const locale = locales[language] || locales['en'] || Object.values(locales)[0];
      const menuName = locale?.name;
      if (!menuName) {
        return res.status(400).json({
          success: false,
          error: 'Menu has no name to generate cultural note from',
        });
      }

      const culturalNote = await translationService.generateCulturalNote(
        menuName,
        locale?.description,
        language,
      );

      res.status(200).json({
        success: true,
        data: { cultural_note: culturalNote },
      });
    } catch (err: unknown) {
      console.error('[Generate Cultural Note]', err);
      const message =
        err instanceof Error ? err.message : 'Cultural note generation failed';
      res.status(502).json({ success: false, error: message });
    }
  },
);

export default router;
