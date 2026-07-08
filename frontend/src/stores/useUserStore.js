import { create } from "zustand";
import axios from "../lib/axios";
import { toast } from "react-hot-toast";

export const useUserStore = create((set, get) => ({
	user: null,
	loading: false,
	checkingAuth: true,

	signup: async ({ name, email, password, confirmPassword }) => {
		set({ loading: true });

		if (password !== confirmPassword) {
			set({ loading: false });
			return toast.error("Passwords do not match");
		}

		try {
			const res = await axios.post("/auth/signup", { name, email, password });
			set({ user: res.data.data, loading: false });
		} catch (error) {
			set({ loading: false });
			toast.error(error.response?.data?.message || error.message);
		}
	},

	login: async (email, password) => {
		set({ loading: true });

		try {
			const res = await axios.post("/auth/login", { email, password });
			// console.log("Res data:-",res.data);
			// console.log("Res.data.data",res.data.data);

			set({ user: res.data.data, loading: false });
		} catch (error) {
			set({ loading: false });
			toast.error(error.response.data.message || "An error occurred");
		}
	},

	logout: async () => {
		try {
			await axios.post("/auth/logout");
			set({ user: null });
		} catch (error) {
			toast.error(
				error.response?.data?.message || "An error occurred during logout",
			);
		}
	},

	checkAuth: async () => {
		set({ checkingAuth: true });
		try {
			const response = await axios.get("/auth/getProfile");
			// console.log("User profile:", response.data.data);
			set({ user: response.data.data, checkingAuth: false });
		} catch (error) {
			console.log(error.message);
			set({ checkingAuth: false, user: null });
		}
	},

	refreshToken: async () => {
		set({ checkingAuth: true });

		try {
			const response = await axios.post("/auth/refresh-token");

			return response.data;
		} finally {
			set({ checkingAuth: false });
		}
	},

	clearUser: () => {
		set({ user: null });
	},
}));

// TODO:- Implement the axios interceptor to handle token refresh automatically on 401 responses.

let refreshPromise = null;

axios.interceptors.response.use(
  (response) => response,

  async (error) => {
    const originalRequest = error.config;

    // Safety check
    if (!originalRequest) {
      return Promise.reject(error);
    }

    // Don't try to refresh if the refresh endpoint itself fails
    if (originalRequest.url?.includes("/auth/refresh-token")) {
      return Promise.reject(error);
    }

    // Handle expired access token
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        // If a refresh is already running, wait for it
        if (!refreshPromise) {
          refreshPromise = useUserStore.getState().refreshToken();
        }

        await refreshPromise;

        // Retry the original request with the new access token
        return axios(originalRequest);
      } catch (refreshError) {
        // Refresh token invalid/expired
        useUserStore.getState().clearUser();

        return Promise.reject(refreshError);
      } finally {
        // Always reset
        refreshPromise = null;
      }
    }

    return Promise.reject(error);
  },
);