import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import asyncHandler from "../utils/AsyncHandler.js";
import Coupon from '../models/coupon.model.js';

export const getCoupon = asyncHandler(async (req, res) => {
  const coupon = await Coupon.findOne({
    userId: req.user._id,
    isActive: true,
  }).lean();
  return res
    .status(200)
    .json(new ApiResponse(200, "Coupon fetched successfully", coupon || null));
});

export const validateCoupon = asyncHandler(async (req, res) => {
  const { code } = req.body;
  if (!code?.trim()) {
    throw new ApiError(400, "Coupon code is required");
  }
  const coupon = await Coupon.findOne({
    code: code.trim().toUpperCase(),
    userId: req.user._id,
    isActive: true,
  });

  if (!coupon) {
    throw new ApiError(404, "Coupon not found!");
  }

  if (coupon.expirationDate < new Date()) {
    coupon.isActive = false;
    await coupon.save();
    throw new ApiError(400, "Coupon expired");
  }
  return res.status(200).json(
    new ApiResponse(200, "Coupon is valid", {
      message: "Coupon is Valid",
      code: coupon.code,
      discountPercentage: coupon.discountPercentage,
    }),
  );
});
