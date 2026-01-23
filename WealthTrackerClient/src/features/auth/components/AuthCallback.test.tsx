import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes, useNavigate } from 'react-router-dom'
import { AuthCallback } from './AuthCallback'
import { useAuthStore } from '@/stores/authStore'

vi.mock('@/stores/authStore', () => ({
  useAuthStore: vi.fn(),
}))

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return {
    ...actual,
    useNavigate: vi.fn(),
  }
})

describe('AuthCallback', () => {
  const mockNavigate = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(useNavigate).mockReturnValue(mockNavigate)
    sessionStorage.clear()
    vi.stubEnv(
      'VITE_GOOGLE_REDIRECT_URI',
      'http://localhost:5173/auth/callback'
    )
  })

  it('redirects to home when already authenticated', async () => {
    vi.mocked(useAuthStore).mockReturnValue({
      loginWithGoogle: vi.fn(),
      isAuthenticated: true,
    } as ReturnType<typeof useAuthStore>)

    render(
      <MemoryRouter initialEntries={['/auth/callback?code=123&state=abc']}>
        <Routes>
          <Route path="/auth/callback" element={<AuthCallback />} />
        </Routes>
      </MemoryRouter>
    )

    await waitFor(() =>
      expect(mockNavigate).toHaveBeenCalledWith('/', { replace: true })
    )
  })

  it('handles valid code and state', async () => {
    const loginWithGoogle = vi.fn().mockResolvedValue(undefined)
    sessionStorage.setItem('oauth_state', 'state-123')

    vi.mocked(useAuthStore).mockReturnValue({
      loginWithGoogle,
      isAuthenticated: false,
    } as ReturnType<typeof useAuthStore>)

    render(
      <MemoryRouter
        initialEntries={['/auth/callback?code=code-123&state=state-123']}
      >
        <Routes>
          <Route path="/auth/callback" element={<AuthCallback />} />
        </Routes>
      </MemoryRouter>
    )

    await waitFor(() =>
      expect(loginWithGoogle).toHaveBeenCalledWith(
        'code-123',
        'http://localhost:5173/auth/callback'
      )
    )
    expect(mockNavigate).toHaveBeenCalledWith('/', { replace: true })
  })

  it('rejects mismatched state', async () => {
    const loginWithGoogle = vi.fn().mockResolvedValue(undefined)
    sessionStorage.setItem('oauth_state', 'expected')

    vi.mocked(useAuthStore).mockReturnValue({
      loginWithGoogle,
      isAuthenticated: false,
    } as ReturnType<typeof useAuthStore>)

    render(
      <MemoryRouter
        initialEntries={['/auth/callback?code=code-123&state=actual']}
      >
        <Routes>
          <Route path="/auth/callback" element={<AuthCallback />} />
        </Routes>
      </MemoryRouter>
    )

    await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith('/login'))
    expect(loginWithGoogle).not.toHaveBeenCalled()
    expect(sessionStorage.getItem('oauth_state')).toBe(null)
  })
})
