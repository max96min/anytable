import express from 'express';
import cors from 'cors';
import { errorHandler } from './middleware/error.js';
import { publicRateLimit, adminRateLimit } from './middleware/rate-limit.js';

// Admin routes
import adminAuthRoutes from './routes/admin/auth.js';
import adminStoreRoutes from './routes/admin/stores.js';
import adminCategoryRoutes from './routes/admin/categories.js';
import adminMenuRoutes from './routes/admin/menus.js';
import adminTableRoutes from './routes/admin/tables.js';
import adminOrderRoutes from './routes/admin/orders.js';
import adminSessionRoutes from './routes/admin/sessions.js';

// Public routes
import publicTableSessionRoutes from './routes/public/sessions.js';
import publicMenuRoutes from './routes/public/menu.js';
import publicCartRoutes from './routes/public/cart.js';
import publicOrderRoutes from './routes/public/orders.js';

export function createApp() {
  const app = express();

  // Body parsing
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true }));

  // CORS
  const clientUrl = process.env.CLIENT_URL || 'http://localhost:3000';
  app.use(
    cors({
      origin: clientUrl,
      credentials: true,
      methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization'],
    })
  );

  // Health check
  app.get('/health', (_req, res) => {
    res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // ---------------------------------------------------------------------------
  // Public routes (customer-facing)
  // ---------------------------------------------------------------------------
  // POST /api/public/table-sessions/join
  // GET  /api/public/table-sessions/:sessionId
  // GET  /api/public/table-sessions/:sessionId/participants
  app.use('/api/public/table-sessions', publicRateLimit, publicTableSessionRoutes);

  // GET  /api/public/stores/:storeId/menu
  // GET  /api/public/stores/:storeId/menu/:menuId
  app.use('/api/public', publicRateLimit, publicMenuRoutes);

  // GET  /api/public/carts/:cartId
  // POST /api/public/carts/:cartId/mutations
  app.use('/api/public/carts', publicRateLimit, publicCartRoutes);

  // POST /api/public/sessions/:sessionId/orders
  // GET  /api/public/sessions/:sessionId/orders
  app.use('/api/public/sessions', publicRateLimit, publicOrderRoutes);

  // ---------------------------------------------------------------------------
  // Admin routes (store-owner dashboard)
  // ---------------------------------------------------------------------------
  // POST /api/admin/auth/login
  // POST /api/admin/auth/register
  // POST /api/admin/auth/refresh
  app.use('/api/admin/auth', adminRateLimit, adminAuthRoutes);

  // GET   /api/admin/stores
  // PATCH /api/admin/stores
  app.use('/api/admin/stores', adminRateLimit, adminStoreRoutes);

  // GET    /api/admin/categories
  // POST   /api/admin/categories
  // PATCH  /api/admin/categories/:id
  // DELETE /api/admin/categories/:id
  app.use('/api/admin/categories', adminRateLimit, adminCategoryRoutes);

  // GET    /api/admin/menus
  // POST   /api/admin/menus
  // GET    /api/admin/menus/:id
  // PATCH  /api/admin/menus/:id
  // DELETE /api/admin/menus/:id
  app.use('/api/admin/menus', adminRateLimit, adminMenuRoutes);

  // GET    /api/admin/tables
  // POST   /api/admin/tables
  // PATCH  /api/admin/tables/:id
  // POST   /api/admin/tables/:id/regenerate-qr
  // GET    /api/admin/tables/:id/qr-url
  // DELETE /api/admin/tables/:id
  app.use('/api/admin/tables', adminRateLimit, adminTableRoutes);

  // GET   /api/admin/orders
  // PATCH /api/admin/orders/:id/status
  app.use('/api/admin/orders', adminRateLimit, adminOrderRoutes);

  // GET  /api/admin/sessions
  // POST /api/admin/sessions/:id/close
  app.use('/api/admin/sessions', adminRateLimit, adminSessionRoutes);

  // Global error handler (must be after routes)
  app.use(errorHandler);

  return app;
}
