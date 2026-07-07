import { create } from 'zustand';
import toast from 'react-hot-toast';
import axios from '../lib/axios.js';

export const useProductStore = create((set) => ({
    products: [],
    loading: false,

    setProducts: (products) => set({ products }),

    createProduct: async (productData) => {
        set({ loading: true });
        try {
            const res = await axios.post("/products", productData);
            set((prevState) => ({
                products: [...prevState.products, res.data.data],
                loading: false,
            }));
        } catch (error) {
            toast.error(error.response.data.error);
            set({ loading: false });
        }
    },

    fetchAllProducts: async () => {
        set({ loading: true });
        try {
            const res = await axios.get("/products");
            set({ products: res.data.data, loading: false });
        } catch (error) {
            set({ error: "Failed to fetch products", loading: false });
            toast.error(error.response.data.error || "Failed to fetch products");
        }
    },

    deleteProduct: async (id) => {
        set({ loading: true });
        try {
            await axios.delete(`/products/${id}`);
            set((prevState) => ({
                products: prevState.products.filter((product) => product._id !== id),
                loading: false,
            }));
        } catch (error) {
            set({ error: "Failed to delete product", loading: false });
            toast.error(error.response.data.error || "Failed to delete product");
        }
    },

    toggleFeaturedProduct: async (id) => {
        set({ loading: true });
        try {
            const res = await axios.patch(`/products/${id}/toggle-featured`);
            //  this will update the product in the store with the new isFeatured value
            set((prevProducts) => ({
                products: prevProducts.products.map((product) =>
                    product._id === id
                        ? { ...product, isFeatured: res.data.data.isFeatured }
                        : product,
                ),
                loading: false,
            }));
        } catch (error) {
            set({ error: "Failed to toggle featured product", loading: false });
            toast.error(
                error.response.data.error || "Failed to toggle featured product",
            );
        }
    },

    fetchProductsByCategory: async (category) => {
        set({ loading: true });
        try {
            const res = await axios.get(`/products/category/${category}`);
            set({ products: res.data.data, loading: false });
        } catch (error) {
            set({ error: "Failed to fetch products by category", loading: false });
            toast.error(
                error.response.data.error || "Failed to fetch products by category",
            );
        }
    },

    fetchFeaturedProducts: async () => {
        set({ loading: true });
        try {
            const response = await axios.get("/products/featured");
            set({ products: response.data.data, loading: false });
        } catch (error) {
            set({ error: "Failed to fetch products", loading: false });
            console.log("Error fetching featured products:", error);
        }
    },
}));
