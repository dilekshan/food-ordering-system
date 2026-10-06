import axios from "axios";
import { useSyncExternalStore } from "react";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "/api",
  timeout: 15000,
});

export const getUser = () => {
  try {
    const user = JSON.parse(localStorage.getItem("foodie_user"));
    return user?.access_token && ["customer", "admin"].includes(user.role) ? user : null;
  } catch {
    return null;
  }
};
const subscribe = (callback) => {
  window.addEventListener("foodie-auth", callback);
  window.addEventListener("storage", callback);
  return () => {
    window.removeEventListener("foodie-auth", callback);
    window.removeEventListener("storage", callback);
  };
};
export const useUser = () => {
  useSyncExternalStore(subscribe, () => localStorage.getItem("foodie_user"));
  return getUser();
};
export const setUser = (user) => {
  localStorage.setItem("foodie_user", JSON.stringify(user));
  window.dispatchEvent(new Event("foodie-auth"));
};
export const logout = () => {
  localStorage.removeItem("foodie_user");
  localStorage.removeItem("foodie_cart");
  window.dispatchEvent(new Event("foodie-auth"));
};

api.interceptors.request.use((config) => {
  const user = getUser();
  if (user) config.headers.Authorization = `Bearer ${user.access_token}`;
  return config;
});
api.interceptors.response.use((response) => response, (error) => {
  if (error.response?.status === 401 && !error.config?.url?.endsWith("/login")) logout();
  return Promise.reject(error);
});

export const money = (n) => `Rs. ${Number(n || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
export const errorMessage = (e) => {
  const d = e?.response?.data?.detail;
  if (typeof d === "string") return d;
  if (Array.isArray(d)) return d.map((x) => x.msg).join(", ");
  if (!e?.response) return "Unable to reach the server. Please try again shortly.";
  return e?.message || "Something went wrong";
};

export default api;

export const imageUrl = (url) => {
  if (!url || !url.startsWith("/api/uploads/")) return url;
  const base = import.meta.env.VITE_API_URL || "/api";
  return /^https?:\/\//.test(base) ? new URL(url, base).href : url;
};
