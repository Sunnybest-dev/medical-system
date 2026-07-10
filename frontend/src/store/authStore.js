import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export const useAuthStore = create(
  persist(
    (set, get) => ({
      user: null,
      tokens: null,
      isAuthenticated: false,

      setAuth: (user, tokens) => set({ user, tokens, isAuthenticated: true }),

      updateUser: (userData) => set((state) => ({
        user: { ...state.user, ...userData },
      })),

      logout: () => set({ user: null, tokens: null, isAuthenticated: false }),

      getAccessToken: () => get().tokens?.access,
      getRefreshToken: () => get().tokens?.refresh,
      setTokens: (newTokens) => set((state) => ({
        tokens: { ...state.tokens, ...newTokens },
      })),
    }),
    {
      name: 'mxta-auth',
      partialize: (state) => ({
        user: state.user,
        tokens: state.tokens,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
)
