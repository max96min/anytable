import { Router, Request, Response, NextFunction } from 'express';
import { validate } from '../../middleware/validate.js';
import { joinSessionSchema, sessionIdParamSchema } from '../../schemas/index.js';
import * as tableSessionService from '../../services/table-session.service.js';

const router = Router();

// POST /api/public/sessions/join
router.post(
  '/join',
  validate(joinSessionSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { qr_token, nickname, device_fingerprint, language } = req.body;
      const result = await tableSessionService.joinSession(
        qr_token,
        nickname,
        device_fingerprint,
        language
      );

      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (err) {
      next(err);
    }
  }
);

// GET /api/public/sessions/:sessionId
router.get(
  '/:sessionId',
  validate(sessionIdParamSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const session = await tableSessionService.getSession(req.params.sessionId);

      res.status(200).json({
        success: true,
        data: session,
      });
    } catch (err) {
      next(err);
    }
  }
);

// GET /api/public/sessions/:sessionId/participants
router.get(
  '/:sessionId/participants',
  validate(sessionIdParamSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const participants = await tableSessionService.getParticipants(
        req.params.sessionId
      );

      res.status(200).json({
        success: true,
        data: participants,
      });
    } catch (err) {
      next(err);
    }
  }
);

export default router;
