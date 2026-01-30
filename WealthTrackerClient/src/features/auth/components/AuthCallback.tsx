import { useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useAuthStore } from '@/stores/authStore'

export function AuthCallback() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { loginWithGoogle, isAuthenticated } = useAuthStore()

  useEffect(() => {
    const handleCallback = async () => {
      // If already authenticated (e.g., from restoreAuth on refresh), skip callback processing
      if (isAuthenticated) {
        console.log('Already authenticated, redirecting to home')
        navigate('/', { replace: true })
        return
      }

      const code = searchParams.get('code')
      const state = searchParams.get('state')
      const error = searchParams.get('error')

      console.log('AuthCallback - code:', code ? 'present' : 'missing')
      console.log('AuthCallback - state:', state)
      console.log(
        'AuthCallback - stored state:',
        sessionStorage.getItem('oauth_state')
      )

      // Verify state for CSRF protection
      const storedState = sessionStorage.getItem('oauth_state')
      if (state && storedState && state !== storedState) {
        console.error(
          'Invalid OAuth state - got:',
          state,
          'expected:',
          storedState
        )
        sessionStorage.removeItem('oauth_state')
        navigate('/login')
        return
      }

      sessionStorage.removeItem('oauth_state')

      if (error) {
        console.error('OAuth error:', error)
        navigate('/login')
        return
      }

      if (!code) {
        console.error('No code in callback')
        navigate('/login')
        return
      }

      try {
        const redirectUri = import.meta.env.VITE_GOOGLE_REDIRECT_URI
        console.log('Calling loginWithGoogle with redirectUri:', redirectUri)
        await loginWithGoogle(code, redirectUri)
        console.log('Login successful')
        navigate('/', { replace: true })
      } catch (err) {
        console.error('Login failed:', err)
        navigate('/login')
      }
    }

    handleCallback()
  }, [searchParams, loginWithGoogle, navigate, isAuthenticated])

  return (
    <div className="flex min-h-screen items-center justify-center bg-background text-foreground">
      <div className="w-full max-w-sm rounded-2xl border border-border/70 bg-card p-6 text-center shadow-lg shadow-black/5">
        <div className="mx-auto h-10 w-10 animate-spin rounded-full border-2 border-primary/25 border-t-primary" />
        <p className="mt-4 text-sm font-semibold">Completing sign in…</p>
        <p className="mt-1 text-xs text-muted-foreground">
          Redirecting you back to the app.
        </p>
      </div>
    </div>
  )
}
