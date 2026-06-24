import express from "express";
import { protectedRoute, adminRoute } from '../middlewares/auth.middleware.js';
import { getAnalyticsData, getDailySalesData } from "../controllers/analytics.controller.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from '../utils/ApiResponse.js';
import asyncHandler from "../utils/AsyncHandler.js";

const router = express.Router();



router.get('/', protectedRoute, adminRoute, asyncHandler(async (req, res) => {
    
        const analyticData = await getAnalyticsData();
        const endDate = new Date();
        const startDate = new Date(endDate.getTime()-7*24*60*60*1000);
        const dailySalesData = await getDailySalesData(startDate,endDate);
        return res.status(200).json(
          new ApiResponse(200, "Analitics data fetched successfully", {
            analyticData,
            dailySalesData,
          }),
        );
    
}))


export default router;