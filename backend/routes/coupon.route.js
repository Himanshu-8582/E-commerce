import express from 'express';
import { getCoupon, validateCoupon } from '../controllers/coupon.controller';
import { protectedRoute } from "../middlewares/auth.middleware.js";

const router = express.Router();

router.get('/', protectedRoute, getCoupon);
router.get('/validate', protectedRoute, validateCoupon);

export default router;