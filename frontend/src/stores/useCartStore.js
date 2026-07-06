import { create } from 'zustand';
import axios from '../lib/axios.js';
import { toast } from 'react-hot-toast';

export const useCartStore = create((set, get) => ({
  cart: [],
  coupon: null,
  total: 0,
  subtotal: 0,

  getCartItems: async () => {
    try {
      const res = await axios.get("/carts");
      set({ cart: res.data.data });
      get().calculateTotal();
    } catch (error) {
      set({ cart: [] });
      toast.error(error.response.data.message || "An error Occured");
    }
  },

  addToCart: async (product) => {
    try {
      const res = await axios.post("/carts", { productId: product._id });
      toast.success("Product added to cart");
      set((prevState) => {
        const existingItem = prevState.cart.find(
          (item) => item._id === product._id,
        );
        const newCart = existingItem
          ? prevState.cart.map((item) =>
              item._id === product._id
                ? { ...item, quantity: item.quantity + 1 }
                : item,
            )
          : [...prevState.cart, { ...product, quantity: 1 }];
        return { cart: newCart };
      });
      get().calculateTotal();
    } catch (error) {
      toast.error(error?.response?.data?.message || "An error occured");
    }
  },

  calculateTotal: () => {
    const { cart, coupon } = get();

    const subTotal = cart.reduce(
      (sum, item) => sum + (item.price ?? 0) * (item.quantity ?? 0),
      0,
    );

    const discount = coupon ? subTotal * (coupon.discountPercentage / 100) : 0;

    const total = Math.max(0, subTotal - discount);

    set({ subTotal, total });
  },
}));
