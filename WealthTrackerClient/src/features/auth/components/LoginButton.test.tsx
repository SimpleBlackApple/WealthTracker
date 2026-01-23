import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { LoginButton } from './LoginButton'

// Mock window.location
const mockLocation = { href: '' }
Object.defineProperty(window, 'location', {
  value: mockLocation,
  writable: true,
})

// Mock import.meta.env
vi.mock('@/components/ui/button', () => ({
  Button: ({
    onClick,
    disabled,
    children,
  }: {
    onClick?: () => void
    disabled?: boolean
    children?: React.ReactNode
  }) => (
    <button onClick={onClick} disabled={disabled}>
      {children}
    </button>
  ),
}))

describe('LoginButton', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockLocation.href = ''
    // Reset environment variables
    vi.stubEnv('VITE_GOOGLE_CLIENT_ID', 'test_client_id')
    vi.stubEnv(
      'VITE_GOOGLE_REDIRECT_URI',
      'http://localhost:5173/auth/callback'
    )
  })

  it('should render the button', () => {
    // Act
    render(<LoginButton />)

    // Assert
    expect(screen.getByText('Sign in with Google')).toBeInTheDocument()
  })

  it('should redirect to Google OAuth with state', async () => {
    const user = userEvent.setup()
    render(<LoginButton />)
    const button = screen.getByRole('button', { name: 'Sign in with Google' })

    await user.click(button)

    const authUrl = new URL(mockLocation.href)
    const state = sessionStorage.getItem('oauth_state')

    expect(authUrl.origin).toBe('https://accounts.google.com')
    expect(authUrl.searchParams.get('client_id')).toBe('test_client_id')
    expect(authUrl.searchParams.get('redirect_uri')).toBe(
      'http://localhost:5173/auth/callback'
    )
    expect(authUrl.searchParams.get('response_type')).toBe('code')
    expect(authUrl.searchParams.get('scope')).toBe('openid email profile')
    expect(authUrl.searchParams.get('state')).toBe(state)
  })

  it('should log error when client id is missing', async () => {
    const user = userEvent.setup()
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    vi.stubEnv('VITE_GOOGLE_CLIENT_ID', '')

    render(<LoginButton />)
    await user.click(
      screen.getByRole('button', { name: 'Sign in with Google' })
    )

    expect(consoleSpy).toHaveBeenCalledWith(
      'Google Client ID is not configured'
    )
    expect(mockLocation.href).toBe('')

    consoleSpy.mockRestore()
  })
})
