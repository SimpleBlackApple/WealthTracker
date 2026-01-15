import { describe, it, expect, beforeEach, vi } from 'vitest'
import { renderHook } from '@testing-library/react'
import { useAuthGuard } from './useAuthGuard'
import { useAuthStore } from '@/stores/authStore'
import { MemoryRouter, useNavigate } from 'react-router-dom'

// Mock the auth store
vi.mock('@/stores/authStore', () => ({
  useAuthStore: vi.fn(),
}))

// Mock react-router-dom
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return {
    ...actual,
    useNavigate: vi.fn(),
  }
})

describe('useAuthGuard', () => {
  const mockNavigate = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(useNavigate).mockReturnValue(mockNavigate)
  })

  it('should navigate to login when not authenticated and auth is required', () => {
    // Arrange
    vi.mocked(useAuthStore).mockReturnValue({
      isAuthenticated: false,
      user: null,
    } as ReturnType<typeof useAuthStore>)

    // Act
    const { result } = renderHook(() => useAuthGuard(true), {
      wrapper: MemoryRouter,
    })

    // Assert
    expect(mockNavigate).toHaveBeenCalledWith('/login')
    expect(result.current.isAuthenticated).toBe(false)
    expect(result.current.user).toBe(null)
  })

  it('should not navigate when authenticated and auth is required', () => {
    // Arrange
    const testUser = { id: 1, name: 'Test User', email: 'test@example.com' }
    vi.mocked(useAuthStore).mockReturnValue({
      isAuthenticated: true,
      user: testUser,
    } as ReturnType<typeof useAuthStore>)

    // Act
    const { result } = renderHook(() => useAuthGuard(true), {
      wrapper: MemoryRouter,
    })

    // Assert
    expect(mockNavigate).not.toHaveBeenCalled()
    expect(result.current.isAuthenticated).toBe(true)
    expect(result.current.user).toEqual(testUser)
  })

  it('should navigate to home when authenticated and auth is not required', () => {
    // Arrange
    const testUser = { id: 1, name: 'Test User', email: 'test@example.com' }
    vi.mocked(useAuthStore).mockReturnValue({
      isAuthenticated: true,
      user: testUser,
    } as ReturnType<typeof useAuthStore>)

    // Act
    const { result } = renderHook(() => useAuthGuard(false), {
      wrapper: MemoryRouter,
    })

    // Assert
    expect(mockNavigate).toHaveBeenCalledWith('/')
    expect(result.current.isAuthenticated).toBe(true)
    expect(result.current.user).toEqual(testUser)
  })
})
