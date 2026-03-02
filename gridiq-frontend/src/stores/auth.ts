import { create } from "zustand";
import type { User } from "../types";
import * as api from "../lib/api/endpoints";

type AuthState = {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  hydrate: () => Promise<void>;
  logout: () => void;
};

export const useAuth = create<AuthState>((set, get) => ({
  user: null,
  token: null,
  isLoading: false,

  async login(email, password) {
    set({ isLoading: true });
    try {
      const { token, user } = await api.login(email, password);
      localStorage.setItem("gridiq_token", token);
      localStorage.setItem("gridiq_user", JSON.stringify(user));
      set({ token, user });
    } finally {
      set({ isLoading: false });
    }
  },

  async hydrate() {
    const token = localStorage.getItem("gridiq_token");
    if (!token) return;
    set({ isLoading: true });
    try {
      const user = await api.me();
      set({ token, user });
    } catch {
      get().logout();
    } finally {
      set({ isLoading: false });
    }
  },

  logout() {
    localStorage.removeItem("gridiq_token");
    localStorage.removeItem("gridiq_user");
    set({ token: null, user: null });
  },
}));
