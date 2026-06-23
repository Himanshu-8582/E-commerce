import asyncHandler from "../utils/AsyncHandler.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { ApiError } from "../utils/ApiError.js";

import { razorpay } from "../lib/razorpay.js";
import crypto from "crypto";

import Coupon from "../models/coupon.model.js";
import Order from "../models/order.model.js";

const createNewCoupon = async (userId) => {
  const coupon = await Coupon.create({
    code: "GIFT" + Math.random().toString(36).substring(2, 8).toUpperCase(),

    discountPercentage: 10,

    expirationDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),

    userId,
  });

  return coupon;
};

export const createCheckoutOrder = asyncHandler(async (req, res) => {
  const { products, couponCode } = req.body;

  if (!Array.isArray(products) || products.length === 0) {
    throw new ApiError(400, "Invalid or empty product array");
  }

  let totalAmount = 0;

  const orderProducts = products.map((product) => {
    const quantity = product.quantity || 1;

    totalAmount += product.price * quantity;

    return {
      product: product._id,
      quantity,
      price: product.price,
    };
  });

  let coupon = null;

  if (couponCode) {
    coupon = await Coupon.findOne({
      code: couponCode,
      userId: req.user._id,
      isActive: true,
      expirationDate: {
        $gt: new Date(),
      },
    });

    if (!coupon) {
      throw new ApiError(400, "Invalid or expired coupon");
    }

    const discount = Math.round(
      (totalAmount * coupon.discountPercentage) / 100,
    );

    totalAmount -= discount;
  }

  const order = await Order.create({
    user: req.user._id,

    products: orderProducts,

    totalAmount,
  });

  const razorpayOrder = await razorpay.orders.create({
    amount: Math.round(totalAmount * 100),

    currency: "INR",

    receipt: order._id.toString(),

    notes: {
      userId: req.user._id.toString(),
      couponCode: couponCode || "",
    },
  });

  order.razorpayOrderId = razorpayOrder.id;

  await order.save();

  if (totalAmount >= 2000) {
    await createNewCoupon(req.user._id);
  }

  return res.status(200).json(
    new ApiResponse(200, "Order created successfully", {
      orderId: razorpayOrder.id,

      amount: razorpayOrder.amount,

      currency: razorpayOrder.currency,

      dbOrderId: order._id,
    }),
  );
});



export const checkOutSuccess = asyncHandler(async (req, res) => {
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature } =
    req.body;

  if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
    throw new ApiError(400, "Missing payment details");
  }

  const expectedSignature = crypto
    .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
    .update(`${razorpay_order_id}|${razorpay_payment_id}`)
    .digest("hex");

  const isValidSignature = expectedSignature === razorpay_signature;

  if (!isValidSignature) {
    throw new ApiError(400, "Invalid payment signature");
  }

  const order = await Order.findOne({
    razorpayOrderId: razorpay_order_id,
  });

  if (!order) {
    throw new ApiError(404, "Order not found");
  }

  order.paymentStatus = "paid";
  order.razorpayPaymentId = razorpay_payment_id;
  order.paidAt = new Date();

  await order.save();

  return res.status(200).json(
    new ApiResponse(200, "Payment verified successfully", {
      orderId: order._id,
      paymentId: razorpay_payment_id,
    }),
  );
});



// For reference, here is how the Razorpay checkout success handler might look in the frontend:
// handler: async function (response) {

//     await axios.post(
//         "/api/payments/checkout-success",
//         {
//             razorpay_order_id:
//                 response.razorpay_order_id,

//             razorpay_payment_id:
//                 response.razorpay_payment_id,

//             razorpay_signature:
//                 response.razorpay_signature,
//         }
//     );
// }

// {
//   "razorpay_order_id": "...",
//   "razorpay_payment_id": "...",
//   "razorpay_signature": "..."
// }