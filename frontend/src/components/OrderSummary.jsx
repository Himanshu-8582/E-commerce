import { useState } from "react";
import { motion } from "framer-motion";
import { useNavigate, Link } from "react-router-dom";
import { MoveRight } from "lucide-react";
import toast from "react-hot-toast"; // swap for your actual toast lib if different
import { useCartStore } from "../stores/useCartStore";
import { useUserStore } from "../stores/useUserStore"; // adjust to wherever your logged-in user lives
import axios from "../lib/axios";

const loadRazorpayScript = () => {
  return new Promise((resolve, reject) => {
    if (window.Razorpay) return resolve(true);

    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload = () => resolve(true);
    script.onerror = () => reject(new Error("Failed to load Razorpay SDK"));
    document.body.appendChild(script);
  });
};

const OrderSummary = () => {
  const navigate = useNavigate();
  const { total, subtotal, coupon, isCouponApplied, cart, clearCart } =
    useCartStore();
  const { user } = useUserStore(); // { name, email, phone } — adjust field names to your schema

  const [loading, setLoading] = useState(false);

  const savings = subtotal - total;
  const formattedSubtotal = subtotal.toFixed(2);
  const formattedTotal = total.toFixed(2);
  const formattedSavings = savings.toFixed(2);

  const handlePayment = async () => {
    if (loading) return;
    setLoading(true);

    try {
      await loadRazorpayScript();
    } catch {
      toast.error("Unable to load payment gateway.");
      setLoading(false);
      return;
    }

    try {
      const { data } = await axios.post("/payments/create-checkout-order", {
        products: cart,
        couponCode: coupon && isCouponApplied ? coupon.code : null,
      });

      const { orderId, amount, currency, dbOrderId, key } = data.data;

      const options = {
        key, // now comes from the backend, guaranteed to match the account that created the order
        amount,
        currency,
        name: "Your Store Name",
        description: "Order Payment",
        order_id: orderId,

        prefill: {
          name: user?.name,
          email: user?.email,
          ...(user?.phone ? { contact: user.phone } : {}),
        },

        handler: async (response) => {
          try {
            await axios.post("/payments/verify", {
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
            });

            clearCart();
            window.alert("Payment Success");
          } catch (err) {
            toast.error(
              err.response?.data?.message || "Payment verification failed.",
            );
            navigate("/purchase-cancel", { replace: true });
          }
        },

        modal: {
          ondismiss: () => {
            setLoading(false);
          },
        },

        theme: {
          color: "#10b981",
        },

        notes: {
          dbOrderId,
        },
      };

      const razorpayInstance = new window.Razorpay(options);

      razorpayInstance.on("payment.failed", (response) => {
        toast.error(response.error.description);
        setLoading(false);
      });

      razorpayInstance.open();
    } catch (err) {
      toast.error(err.response?.data?.message || "Unable to initiate payment.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div
      className="space-y-4 rounded-lg border border-gray-700 bg-gray-800 p-4 shadow-sm sm:p-6"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <p className="text-xl font-semibold text-emerald-400">Order summary</p>

      <div className="space-y-4">
        <div className="space-y-2">
          <dl className="flex items-center justify-between gap-4">
            <dt className="text-base font-normal text-gray-300">
              Original price
            </dt>
            <dd className="text-base font-medium text-white">
              ₹{formattedSubtotal}
            </dd>
          </dl>

          {savings > 0 && (
            <dl className="flex items-center justify-between gap-4">
              <dt className="text-base font-normal text-gray-300">Savings</dt>
              <dd className="text-base font-medium text-emerald-400">
                -₹{formattedSavings}
              </dd>
            </dl>
          )}

          {coupon && isCouponApplied && (
            <dl className="flex items-center justify-between gap-4">
              <dt className="text-base font-normal text-gray-300">
                Coupon ({coupon.code})
              </dt>
              <dd className="text-base font-medium text-emerald-400">
                -{coupon.discountPercentage}%
              </dd>
            </dl>
          )}
          <dl className="flex items-center justify-between gap-4 border-t border-gray-600 pt-2">
            <dt className="text-base font-bold text-white">Total</dt>
            <dd className="text-base font-bold text-emerald-400">
              ₹{formattedTotal}
            </dd>
          </dl>
        </div>

        <motion.button
          className="flex w-full items-center justify-center rounded-lg bg-emerald-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-emerald-700 focus:outline-none focus:ring-4 focus:ring-emerald-300 disabled:cursor-not-allowed disabled:opacity-60"
          whileHover={{ scale: loading ? 1 : 1.05 }}
          whileTap={{ scale: loading ? 1 : 0.95 }}
          onClick={handlePayment}
          disabled={loading}
        >
          {loading ? "Processing..." : "Proceed to Checkout"}
        </motion.button>

        <div className="flex items-center justify-center gap-2">
          <span className="text-sm font-normal text-gray-400">or</span>
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-sm font-medium text-emerald-400 underline hover:text-emerald-300 hover:no-underline"
          >
            Continue Shopping
            <MoveRight size={16} />
          </Link>
        </div>
      </div>
    </motion.div>
  );
};

export default OrderSummary;
