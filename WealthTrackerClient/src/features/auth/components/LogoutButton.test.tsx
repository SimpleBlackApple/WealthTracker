import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { LogoutButton } from './LogoutButton'
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

// Mock Button component
vi.mock('@/components/ui/button', () => ({
  Button: ({
    onClick,
    children,
    variant,
  }: {
    onClick?: () => void
    children?: React.ReactNode
    variant?: string
  }) => (
    <button onClick={onClick} className={variant}>
      {children}
    </button>
  ),
}))

describe('LogoutButton', () => {
  const mockLogout = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    mockLocation.href = ''
    mockLogout.mockResolvedValue(undefined)
  })

  it('should render user name and logout button when user is logged in', () => {
    // Arrange
    const testUser = { id: 1, name: 'Test User', email: 'test@example.com' }
    vi.mocked(useAuthStore).mockReturnValue({
      logout: mockLogout,
      user: testUser,
    } as ReturnType<typeof useAuthStore>)

    // Act
    render(<LogoutButton />)

    // Assert
    expect(screen.getByText('Test User')).toBeInTheDocument()
    expect(screen.getByText('Logout')).toBeInTheDocument()
  })

  it('should not render when user is not logged in', () => {
    // Arrange
    vi.mocked(useAuthStore).mockReturnValue({
      logout: mockLogout,
      user: null,
    } as ReturnType<typeof useAuthStore>)

    // Act
    const { container } = render(<LogoutButton />)

    // Assert
    expect(container).toBeEmptyDOMElement()
  })

  it('should call logout and redirect when logout button is clicked', async () => {
    // Arrange
    const testUser = { id: 1, name: 'Test User', email: 'test@example.com' }
    vi.mocked(useAuthStore).mockReturnValue({
      logout: mockLogout,
      user: testUser,
    } as ReturnType<typeof useAuthStore>)

    // Act
    render(<LogoutButton />)
    const logoutButton = screen.getByText('Logout')
    await userEvent.click(logoutButton)

    // Assert
    expect(mockLogout).toHaveBeenCalled()
    expect(mockLocation.href).toBe('/')
  })
})
