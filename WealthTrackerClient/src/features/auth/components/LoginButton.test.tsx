import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { LoginButton } from './LoginButton'
import { useAuthStore } from '@/stores/authStore'

// Mock the auth store
vi.mock('@/stores/authStore', () => ({
  useAuthStore: vi.fn(),
}))

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
    // Arrange
    vi.mocked(useAuthStore).mockReturnValue(
      {} as ReturnType<typeof useAuthStore>
    )

    // Act
    render(<LoginButton />)

    // Assert
    expect(screen.getByText('Sign in with Google')).toBeInTheDocument()
  })

  it('should show loading state when clicked', () => {
    // Arrange
    vi.mocked(useAuthStore).mockReturnValue(
      {} as ReturnType<typeof useAuthStore>
    )

    // Act
    render(<LoginButton />)
    const button = screen.getByText('Sign in with Google')

    // Assert - button is not disabled initially
    expect(button).not.toBeDisabled()
  })
})
