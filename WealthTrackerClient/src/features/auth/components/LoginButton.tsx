import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { getRuntimeConfig } from '@/config/runtimeConfig'

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

interface LoginButtonProps {
  className?: string
  children?: React.ReactNode
}

export function LoginButton({ className, children }: LoginButtonProps) {
  const [isLoading, setIsLoading] = useState(false)

  const handleLogin = () => {
    setIsLoading(true)

    const { googleClientId, googleRedirectUri } = getRuntimeConfig()
    const clientId = googleClientId
    const redirectUri = googleRedirectUri

    if (!clientId) {
      console.error('Google Client ID is not configured')
      setIsLoading(false)
      return
    }

    if (!redirectUri) {
      console.error('Google Redirect URI is not configured')
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
    <Button
      onClick={handleLogin}
      disabled={isLoading}
      className={`bg-primary-light hover:bg-primary-lighter text-primary-foreground shadow-sm shadow-primary/20 ${className || 'w-full'}`}
    >
      {isLoading ? 'Connecting...' : children || 'Sign in with Google'}
    </Button>
  )
}
