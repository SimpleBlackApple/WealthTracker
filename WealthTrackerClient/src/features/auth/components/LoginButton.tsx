import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { useAuthStore } from '@/stores/authStore'

declare global {
  interface Window {
    google: {
      accounts: {
        id: {
          initialize: (config: unknown) => void
          prompt: () => void
        }
      }
    }
  }
}

export function LoginButton() {
  const [isLoading, setIsLoading] = useState(false)
  const { loginWithGoogle } = useAuthStore()

  const handleLogin = () => {
    setIsLoading(true)

    const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID
    const redirectUri = import.meta.env.VITE_GOOGLE_REDIRECT_URI

    if (!clientId) {
      console.error('Google Client ID is not configured')
      setIsLoading(false)
      return
    }

    // Generate state for CSRF protection
    const state = Math.random().toString(36).substring(2, 15)
    sessionStorage.setItem('oauth_state', state)

    // Construct Google OAuth URL
    const scope = 'openid email profile'
    const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth')
    authUrl.searchParams.set('client_id', clientId)
    authUrl.searchParams.set('redirect_uri', redirectUri)
    authUrl.searchParams.set('response_type', 'code')
    authUrl.searchParams.set('scope', scope)
    authUrl.searchParams.set('state', state)

    // Redirect to Google OAuth
    window.location.href = authUrl.toString()
  }

  return (
    <Button onClick={handleLogin} disabled={isLoading}>
      {isLoading ? 'Connecting...' : 'Sign in with Google'}
    </Button>
  )
}
