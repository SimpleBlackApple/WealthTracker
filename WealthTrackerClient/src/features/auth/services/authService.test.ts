import { describe, it, expect, beforeEach, vi } from 'vitest'
import { authService } from './authService'
import axios from 'axios'
import type { AxiosInstance } from 'axios'

// Mock axios
vi.mock('axios', () => ({
  default: {
    create: vi.fn(() => ({
      post: vi.fn(),
      interceptors: {
        request: { use: vi.fn() },
        response: { use: vi.fn() },
      },
    })),
  },
}))

describe('authService', () => {
  beforeEach(() => {
    // Clear all mocks before each test
    vi.clearAllMocks()
  })

  describe('loginWithGoogle', () => {
    it('should call the correct endpoint with correct payload', async () => {
      // Arrange
      const mockAxiosInstance = {
        post: vi.fn().mockResolvedValue({
          data: {
            accessToken: 'test_access_token',
            refreshToken: 'test_refresh_token',
            user: { id: 1, name: 'Test User', email: 'test@example.com' },
          },
        }),
        interceptors: {
          request: { use: vi.fn() },
          response: { use: vi.fn() },
        },
      }

      vi.mocked(axios.create).mockReturnValue(
        mockAxiosInstance as unknown as AxiosInstance
      )

      // Create a new instance to get the mocked one
      const testService =
        new (authService.constructor as new () => typeof authService)()

      // Act
      const result = await testService.loginWithGoogle(
        'test_code',
        'http://localhost:5173/callback'
      )

      // Assert
      expect(mockAxiosInstance.post).toHaveBeenCalledWith(
        '/auth/google/callback',
        {
          code: 'test_code',
          redirectUri: 'http://localhost:5173/callback',
        }
      )
      expect(result).toEqual({
        accessToken: 'test_access_token',
        refreshToken: 'test_refresh_token',
        user: { id: 1, name: 'Test User', email: 'test@example.com' },
      })
    })
  })

  describe('refreshToken', () => {
    it('should call the correct endpoint with refresh token', async () => {
      // Arrange
      const mockAxiosInstance = {
        post: vi.fn().mockResolvedValue({
          data: { accessToken: 'new_access_token' },
        }),
        interceptors: {
          request: { use: vi.fn() },
          response: { use: vi.fn() },
        },
      }

      vi.mocked(axios.create).mockReturnValue(
        mockAxiosInstance as unknown as AxiosInstance
      )
      const testService =
        new (authService.constructor as new () => typeof authService)()

      // Act
      const result = await testService.refreshToken('test_refresh_token')

      // Assert
      expect(mockAxiosInstance.post).toHaveBeenCalledWith('/auth/refresh', {
        refreshToken: 'test_refresh_token',
      })
      expect(result.data).toEqual({ accessToken: 'new_access_token' })
    })
  })

  describe('logout', () => {
    it('should call the correct endpoint with refresh token', async () => {
      // Arrange
      const mockAxiosInstance = {
        post: vi.fn().mockResolvedValue({}),
        interceptors: {
          request: { use: vi.fn() },
          response: { use: vi.fn() },
        },
      }

      vi.mocked(axios.create).mockReturnValue(
        mockAxiosInstance as unknown as AxiosInstance
      )
      const testService =
        new (authService.constructor as new () => typeof authService)()

      // Act
      await testService.logout('test_refresh_token')

      // Assert
      expect(mockAxiosInstance.post).toHaveBeenCalledWith('/auth/logout', {
        refreshToken: 'test_refresh_token',
      })
    })
  })

  describe('getAxiosInstance', () => {
    it('should return the axios instance', () => {
      // Arrange
      const mockAxiosInstance = {
        post: vi.fn(),
        interceptors: {
          request: { use: vi.fn() },
          response: { use: vi.fn() },
        },
      }

      vi.mocked(axios.create).mockReturnValue(
        mockAxiosInstance as unknown as AxiosInstance
      )
      const testService =
        new (authService.constructor as new () => typeof authService)()

      // Act
      const instance = testService.getAxiosInstance()

      // Assert
      expect(instance).toBe(mockAxiosInstance)
    })
  })
})
