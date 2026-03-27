import axios from "axios";

// base URL can be overridden at runtime via localStorage (settings page) or
// build‑time with VITE_API_BASE_URL.
const runtimeBase = localStorage.getItem("gridiq_api_base") || undefined;

// Default to backend local dev default (8000). 8080 is for static assets in some setups.
const defaultBase = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8000";

export const api = axios.create({
  baseURL: runtimeBase ?? defaultBase,
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
