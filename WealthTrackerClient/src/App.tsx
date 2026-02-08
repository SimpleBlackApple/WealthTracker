import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from '@/features/auth/hooks/useAuth'
import { AuthCallback } from '@/features/auth/components/AuthCallback'
import { AppShell } from '@/components/layout/AppShell'
import { ScannersPage } from '@/features/scanners/pages/ScannersPage'
import { TradingProvider } from '@/features/trading/contexts/TradingContext'
import { PortfolioPage } from '@/features/trading/pages/PortfolioPage'
import { LoginPage } from '@/features/auth/pages/LoginPage'

function App() {
  const { isAuthenticated } = useAuth()

  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/auth/callback" element={<AuthCallback />} />
      <Route
        path="/"
        element={
          isAuthenticated ? (
            <TradingProvider>
              <AppShell />
            </TradingProvider>
          ) : (
            <Navigate to="/login" replace />
          )
        }
      >
        <Route index element={<Navigate to="/scanners" replace />} />
        <Route
          path="scanners"
          element={<Navigate to="/scanners/day-gainers" replace />}
        />
        <Route path="scanners/:scannerId" element={<ScannersPage />} />
        <Route path="portfolio" element={<PortfolioPage />} />
      </Route>
    </Routes>
  )
}

export default App
