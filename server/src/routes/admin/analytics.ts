import { Router, Request, Response, NextFunction } from 'express';
import { adminAuth } from '../../middleware/admin-auth.js';
import { prisma } from '../../lib/prisma.js';

const router = Router();

router.use(adminAuth);

// GET /api/admin/analytics
router.get(
  '/',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const storeId = req.store_id!;

      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);

      // Today's orders
      const todayOrders = await prisma.order.findMany({
        where: {
          store_id: storeId,
          placed_at: { gte: todayStart },
          status: { not: 'CANCELLED' },
        },
        select: {
          id: true,
          grand_total: true,
          items: true,
        },
      });

      const todayRevenue = todayOrders.reduce((sum, o) => sum + o.grand_total, 0);
      const avgOrderValue = todayOrders.length > 0
        ? Math.round(todayRevenue / todayOrders.length)
        : 0;

      // Active tables (tables with OPEN sessions)
      const activeTables = await prisma.tableSession.count({
        where: {
          store_id: storeId,
          status: 'OPEN',
        },
      });

      // Language distribution from active participants
      const participants = await prisma.participant.findMany({
        where: {
          session: {
            store_id: storeId,
            status: 'OPEN',
          },
          is_active: true,
        },
        select: { language: true },
      });

      const languageDistribution: Record<string, number> = {};
      for (const p of participants) {
        languageDistribution[p.language] = (languageDistribution[p.language] || 0) + 1;
      }

      // Popular items from today's orders
      const itemCounts: Record<string, { name: string; count: number }> = {};
      for (const order of todayOrders) {
        const items = order.items as Array<{ menu_id: string; menu_name: string; quantity: number }>;
        if (!Array.isArray(items)) continue;
        for (const item of items) {
          if (!itemCounts[item.menu_id]) {
            itemCounts[item.menu_id] = { name: item.menu_name, count: 0 };
          }
          itemCounts[item.menu_id].count += item.quantity;
        }
      }

      const popularItems = Object.entries(itemCounts)
        .map(([menu_id, { name, count }]) => ({ menu_id, name, order_count: count }))
        .sort((a, b) => b.order_count - a.order_count)
        .slice(0, 10);

      res.status(200).json({
        success: true,
        data: {
          today_orders: todayOrders.length,
          today_revenue: todayRevenue,
          active_tables: activeTables,
          avg_order_value: avgOrderValue,
          language_distribution: languageDistribution,
          popular_items: popularItems,
        },
      });
    } catch (err) {
      next(err);
    }
  }
);

export default router;
