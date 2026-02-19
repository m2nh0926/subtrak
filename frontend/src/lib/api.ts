import axios from "axios";

function resolveBaseURL(): string {
  const url = import.meta.env.VITE_API_URL || "http://localhost:8000/api/v1";
  if (typeof window !== "undefined" && window.location.protocol === "https:" && url.startsWith("http://")) {
    return url.replace("http://", "https://");
  }
  return url;
}

const api = axios.create({
  baseURL: resolveBaseURL(),
  headers: { "Content-Type": "application/json" },
});

// Attach JWT token to every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("access_token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle 401 → try refresh, else redirect to login
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      const refreshToken = localStorage.getItem("refresh_token");
      if (refreshToken) {
        try {
          const baseURL = resolveBaseURL();
          const res = await axios.post(`${baseURL}/auth/refresh`, {
            refresh_token: refreshToken,
          });
          localStorage.setItem("access_token", res.data.access_token);
          localStorage.setItem("refresh_token", res.data.refresh_token);
          originalRequest.headers.Authorization = `Bearer ${res.data.access_token}`;
          return api(originalRequest);
        } catch {
          // Refresh failed — clear tokens
        }
      }
      localStorage.removeItem("access_token");
      localStorage.removeItem("refresh_token");
      window.location.href = "/login";
    }
    return Promise.reject(error);
  }
);

export default api;
