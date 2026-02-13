/**
 * Authentication store using Zustand with persistence
 */
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { User } from '@/types';

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isInitialized: boolean;
  setAuth: (token: string, user: User) => void;
  login: (token: string, user: User) => void;
  logout: () => void;
  setUser: (user: User) => void;
  updateUser: (user: User) => void;
  setInitialized: (initialized: boolean) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      isInitialized: false,
      setAuth: (token, user) => {
        set({ token, user, isAuthenticated: true });
      },
      login: (token, user) => {
        set({ token, user, isAuthenticated: true });
      },
      logout: () => {
        set({ token: null, user: null, isAuthenticated: false });
      },
      setUser: (user) => set({ user, isAuthenticated: true }),
      updateUser: (user) => set({ user }),
      setInitialized: (initialized) => set({ isInitialized: initialized }),
    }),
    {
      name: 'auth-storage', // unique name for localStorage key
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        user: state.user,
        token: state.token,
        isAuthenticated: state.isAuthenticated,
        // Don't persist isInitialized - it should reset on page reload
      }),
    }
  )
);
