import { create } from 'zustand'
import type { User } from '@/features/auth/types/auth'
import { authService } from '@/features/auth/services/authService'

interface AuthState {
  user: User | null
  accessToken: string | null
  refreshToken: string | null
  isAuthenticated: boolean
  isLoading: boolean
  error: string | null

  // Actions
  setAuth: (accessToken: string, refreshToken: string, user: User) => void
  clearAuth: () => void
  loginWithGoogle: (code: string, redirectUri: string) => Promise<void>
  logout: () => Promise<void>
  loginAsDemo: () => Promise<void>
  restoreAuth: () => void
  updateUser: (user: User) => void
}

// Helper function to get initial auth state from localStorage synchronously
// This runs when the store is created, before the first render
const getInitialAuthState = () => {
  try {
    const accessToken = localStorage.getItem('accessToken')
    const refreshToken = localStorage.getItem('refreshToken')
    const userStr = localStorage.getItem('user')

    if (accessToken && refreshToken && userStr) {
      const user = JSON.parse(userStr) as User
      return {
        user,
        accessToken,
        refreshToken,
        isAuthenticated: true,
      }
    }
  } catch (error) {
    // If there's an error parsing stored data, clear it
    console.error('Error restoring auth state:', error)
    localStorage.removeItem('accessToken')
    localStorage.removeItem('refreshToken')
    localStorage.removeItem('user')
  }

  return {
    user: null,
    accessToken: null,
    refreshToken: null,
    isAuthenticated: false,
  }
}

export const useAuthStore = create<AuthState>(set => ({
  // Initialize with stored auth state (synchronous)
  ...getInitialAuthState(),
  isLoading: false,
  error: null,

  // Actions
  setAuth: (accessToken, refreshToken, user) => {
    localStorage.setItem('accessToken', accessToken)
    localStorage.setItem('refreshToken', refreshToken)
    localStorage.setItem('user', JSON.stringify(user))

    set({
      accessToken,
      refreshToken,
      user,
      isAuthenticated: true,
      error: null,
    })
  },

  clearAuth: () => {
    localStorage.removeItem('accessToken')
    localStorage.removeItem('refreshToken')
    localStorage.removeItem('user')

    set({
      user: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,
      error: null,
    })
  },

  loginWithGoogle: async (code, redirectUri) => {
    set({ isLoading: true, error: null })

    try {
      const response = await authService.loginWithGoogle(code, redirectUri)

      const { accessToken, refreshToken, user } = response

      set({
        user,
        accessToken,
        refreshToken,
        isAuthenticated: true,
        isLoading: false,
        error: null,
      })

      localStorage.setItem('accessToken', accessToken)
      localStorage.setItem('refreshToken', refreshToken)
      localStorage.setItem('user', JSON.stringify(user))
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Login failed',
        isLoading: false,
      })
      throw error
    }
  },

  loginAsDemo: async () => {
    set({ isLoading: true, error: null })

    try {
      const response = await authService.loginAsDemo()

      const { accessToken, refreshToken, user } = response

      set({
        user,
        accessToken,
        refreshToken,
        isAuthenticated: true,
        isLoading: false,
        error: null,
      })

      localStorage.setItem('accessToken', accessToken)
      localStorage.setItem('refreshToken', refreshToken)
      localStorage.setItem('user', JSON.stringify(user))
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Demo login failed',
        isLoading: false,
      })
      throw error
    }
  },

  logout: async () => {
    const { refreshToken } = useAuthStore.getState()

    try {
      if (refreshToken) {
        await authService.logout(refreshToken)
      }
    } catch (error) {
      console.error('Logout error:', error)
    } finally {
      useAuthStore.getState().clearAuth()
    }
  },

  restoreAuth: () => {
    const accessToken = localStorage.getItem('accessToken')
    const refreshToken = localStorage.getItem('refreshToken')
    const userStr = localStorage.getItem('user')

    if (accessToken && refreshToken && userStr) {
      try {
        const user = JSON.parse(userStr) as User
        set({
          user,
          accessToken,
          refreshToken,
          isAuthenticated: true,
        })
      } catch {
        useAuthStore.getState().clearAuth()
      }
    }
  },
  updateUser: user => {
    localStorage.setItem('user', JSON.stringify(user))
    set({ user })
  },
}))
