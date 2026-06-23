import express from 'express';
import { checkOutSuccess, createCheckoutOrder } from '../controllers/payment.controller.js';
import { protectedRoute } from '../middlewares/auth.middleware.js';

const router = express.Router();

router.post('/create-checkout-order', protectedRoute, createCheckoutOrder);
router.post('/checkout-success', protectedRoute, checkOutSuccess);

export default router;