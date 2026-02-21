import { Router } from 'express';
import sessionRoutes from './sessions.js';
import menuRoutes from './menu.js';
import cartRoutes from './cart.js';
import orderRoutes from './orders.js';

const router = Router();

router.use('/sessions', sessionRoutes);
router.use('/', menuRoutes);
router.use('/carts', cartRoutes);
router.use('/sessions', orderRoutes);

export default router;
