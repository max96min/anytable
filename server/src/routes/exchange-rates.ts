import { Router, Request, Response, NextFunction } from 'express';
import * as exchangeRateService from '../services/exchange-rate.service.js';

const router = Router();

// GET /api/exchange-rates?from=KRW
router.get(
  '/',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const from = (req.query.from as string) || 'KRW';
      const rates = await exchangeRateService.getExchangeRates(from);

      res.status(200).json({
        success: true,
        data: {
          base: from,
          rates,
        },
      });
    } catch (err) {
      next(err);
    }
  },
);

export default router;
