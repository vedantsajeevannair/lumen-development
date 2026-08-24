import axios from "axios";
import { env } from "../config/env";
import { useAuthStore } from "../store/AuthStore";
import { QueryClient } from "@tanstack/react-query";

export const queryClient = new QueryClient();

const API_URL = env.apiUrl;

export const apiClient = axios.create({
  baseURL: API_URL,
  headers: {
    "Content-Type": "application/json",
  },
  timeout: 15000,
});

// Intercept requests to inject the access token
apiClient.interceptors.request.use(
  (config) => {
    const session = useAuthStore.getState().session;
    if (session?.access_token) {
      config.headers.Authorization = `Bearer ${session.access_token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Flag to prevent multiple refresh calls simultaneously
let isRefreshing = false;
let failedQueue: Array<{
  resolve: (token: string) => void;
  reject: (error: any) => void;
}> = [];

const processQueue = (error: any, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else if (token) {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

// Intercept responses to handle 401 Unauthorized and refresh the token
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        return new Promise(function (resolve, reject) {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            originalRequest.headers.Authorization = `Bearer ${token}`;
            return apiClient(originalRequest);
          })
          .catch((err) => {
            return Promise.reject(err);
          });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      const session = useAuthStore.getState().session;
      if (!session?.refresh_token) {
        // No refresh token available, force logout
        useAuthStore.getState().logout();
        return Promise.reject(error);
      }

      try {
        const refreshResponse = await axios.post(`${API_URL}/auth/refresh`, {
          refreshToken: session.refresh_token,
        });

        const data = refreshResponse.data;
        const newAccessToken = data.access_token;
        const newRefreshToken = data.refresh_token;

        // Update the AuthStore using refreshTokens to avoid unintentionally unlocking the device
        useAuthStore.getState().refreshTokens(
          newAccessToken,
          newRefreshToken,
          data.user
        );

        apiClient.defaults.headers.common.Authorization = `Bearer ${newAccessToken}`;
        originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;

        processQueue(null, newAccessToken);
        return apiClient(originalRequest);
      } catch (refreshError: any) {
        processQueue(refreshError, null);
        console.error("Token refresh failed", refreshError.response?.data || refreshError.message);
        useAuthStore.getState().logout();
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    console.error(
      "API Error Response:",
      error.response?.status,
      error.response?.data || error.message
    );
    return Promise.reject(error);
  }
);
