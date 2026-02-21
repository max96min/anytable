import { Router } from 'express';
import authRoutes from './auth.js';
import storeRoutes from './stores.js';
import categoryRoutes from './categories.js';
import menuRoutes from './menus.js';
import tableRoutes from './tables.js';
import orderRoutes from './orders.js';
import sessionRoutes from './sessions.js';

const router = Router();

router.use('/auth', authRoutes);
router.use('/stores', storeRoutes);
router.use('/categories', categoryRoutes);
router.use('/menus', menuRoutes);
router.use('/tables', tableRoutes);
router.use('/orders', orderRoutes);
router.use('/sessions', sessionRoutes);

export default router;
