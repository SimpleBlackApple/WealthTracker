import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore } from '@/stores/authStore'
import { LoginButton } from '@/features/auth/components/LoginButton'
import { LogoutButton } from '@/features/auth/components/LogoutButton'
import { AuthCallback } from '@/features/auth/components/AuthCallback'
import { useAuthGuard } from '@/features/auth/hooks/useAuthGuard'

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
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <h1 className="text-xl font-bold">WealthTracker</h1>
            </div>
            <div className="flex items-center">
              <LogoutButton />
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="border-4 border-dashed border-gray-200 rounded-lg p-12">
            <h2 className="text-2xl font-bold mb-4">
              Welcome, {user?.name || 'User'}!
            </h2>
            <p className="text-gray-600">
              You are now logged in. This is a protected page.
            </p>
            <div className="mt-6">
              <h3 className="text-lg font-semibold mb-2">Your Account Info:</h3>
              <ul className="list-disc list-inside text-gray-600">
                <li>Email: {user?.email}</li>
                <li>User ID: {user?.id}</li>
              </ul>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}

function App() {
  const { isAuthenticated } = useAuthStore()

  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/auth/callback" element={<AuthCallback />} />
      <Route
        path="/"
        element={
          isAuthenticated ? <ProtectedPage /> : <Navigate to="/login" replace />
        }
      />
    </Routes>
  )
}

export default App
