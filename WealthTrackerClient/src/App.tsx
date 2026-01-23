import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore } from '@/stores/authStore'
import { useAuth } from '@/features/auth/hooks/useAuth'
import { LoginButton } from '@/features/auth/components/LoginButton'
import { AuthCallback } from '@/features/auth/components/AuthCallback'
import { useAuthGuard } from '@/features/auth/hooks/useAuthGuard'
import { AppShell } from '@/components/layout/AppShell'
import { ScannersPage } from '@/features/scanners/pages/ScannersPage'

function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full space-y-8 p-8">
        <div>
          <h1 className="text-3xl font-bold text-center">WealthTracker</h1>
          <p className="mt-2 text-center text-gray-600">
            Track your investments with ease
          </p>
        </div>
        <div className="mt-8 flex justify-center">
          <LoginButton />
        </div>
      </div>
    </div>
  )
}

function ProtectedPage() {
  useAuthGuard(true)
  const { user } = useAuthStore()

  return (
    <div className="rounded-lg border bg-card p-6">
      <h2 className="text-lg font-semibold">
        Welcome, {user?.name || 'User'}!
      </h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Use the Scanners page to explore market opportunities.
      </p>
      <div className="mt-4 text-sm text-muted-foreground">
        <div>Email: {user?.email}</div>
        <div>User ID: {user?.id}</div>
      </div>
    </div>
  )
}

function App() {
  const { isAuthenticated } = useAuth()

  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/auth/callback" element={<AuthCallback />} />
      <Route
        path="/"
        element={
          isAuthenticated ? <AppShell /> : <Navigate to="/login" replace />
        }
      >
        <Route
          index
          element={<Navigate to="/scanners/day-gainers" replace />}
        />
        <Route path="scanners/:scannerId" element={<ScannersPage />} />
        <Route path="account" element={<ProtectedPage />} />
      </Route>
    </Routes>
  )
}

export default App
