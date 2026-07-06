import express from 'express';
import { getCoupon, validateCoupon } from '../controllers/coupon.controller.js';
import { protectedRoute } from "../middlewares/auth.middleware.js";
import { createNewCoupon } from '../controllers/payment.controller.js';

const router = express.Router();

router.post('/createCoupon', protectedRoute, createNewCoupon);
router.get('/', protectedRoute, getCoupon);
router.post('/validate', protectedRoute, validateCoupon);

export default router;