import axios from "axios";

// base URL can be overridden at runtime via localStorage (settings page) or
// build‑time with VITE_API_BASE_URL.
const runtimeBase = localStorage.getItem("gridiq_api_base") || undefined;
export const api = axios.create({
  baseURL: runtimeBase ?? import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8080",
  timeout: 15000,
});

// allow changing baseURL after creation
export function setApiBaseUrl(url: string) {
  api.defaults.baseURL = url;
  localStorage.setItem("gridiq_api_base", url);
}

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("gridiq_token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});
