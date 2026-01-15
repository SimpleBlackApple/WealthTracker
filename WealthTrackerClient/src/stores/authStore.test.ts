import { describe, it, expect, beforeEach, vi } from 'vitest'
import { useAuthStore } from './authStore'
import type { User } from '@/features/auth/types/auth'

// Mock the authService
vi.mock('@/features/auth/services/authService', () => ({
  authService: {
    loginWithGoogle: vi.fn(),
    logout: vi.fn(),
  },
}))

describe('authStore', () => {
  beforeEach(() => {
    // Reset the store state before each test
    useAuthStore.setState({
      user: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,
    })
    // Clear localStorage
    localStorage.clear()
  })

  describe('setAuth', () => {
    it('should set auth state and save to localStorage', () => {
      // Arrange
      const testUser: User = {
        id: 1,
        name: 'Test User',
        email: 'test@example.com',
      }
      const testAccessToken = 'test_access_token'
      const testRefreshToken = 'test_refresh_token'

      // Act
      useAuthStore
        .getState()
        .setAuth(testAccessToken, testRefreshToken, testUser)

      // Assert
      const state = useAuthStore.getState()
      expect(state.user).toEqual(testUser)
      expect(state.accessToken).toBe(testAccessToken)
      expect(state.refreshToken).toBe(testRefreshToken)
      expect(state.isAuthenticated).toBe(true)
      expect(state.error).toBe(null)
    })
  })

  describe('clearAuth', () => {
    it('should clear auth state and remove from localStorage', () => {
      // Arrange - set up initial state
      const testUser: User = {
        id: 1,
        name: 'Test User',
        email: 'test@example.com',
      }
      useAuthStore.getState().setAuth('token', 'refresh', testUser)

      // Act
      useAuthStore.getState().clearAuth()

      // Assert
      const state = useAuthStore.getState()
      expect(state.user).toBe(null)
      expect(state.accessToken).toBe(null)
      expect(state.refreshToken).toBe(null)
      expect(state.isAuthenticated).toBe(false)
      expect(state.error).toBe(null)
    })
  })

  describe('restoreAuth', () => {
    it('should restore auth state from localStorage', () => {
      // Arrange - set up localStorage
      const testUser: User = {
        id: 1,
        name: 'Test User',
        email: 'test@example.com',
      }
      localStorage.setItem('accessToken', 'stored_token')
      localStorage.setItem('refreshToken', 'stored_refresh')
      localStorage.setItem('user', JSON.stringify(testUser))

      // Act
      useAuthStore.getState().restoreAuth()

      // Assert
      const state = useAuthStore.getState()
      expect(state.user).toEqual(testUser)
      expect(state.accessToken).toBe('stored_token')
      expect(state.refreshToken).toBe('stored_refresh')
      expect(state.isAuthenticated).toBe(true)
    })

    it('should not restore auth state when localStorage is empty', () => {
      // Act
      useAuthStore.getState().restoreAuth()

      // Assert
      const state = useAuthStore.getState()
      expect(state.user).toBe(null)
      expect(state.isAuthenticated).toBe(false)
    })
  })
})
