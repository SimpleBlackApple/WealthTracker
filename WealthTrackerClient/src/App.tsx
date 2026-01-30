import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from '@/features/auth/hooks/useAuth'
import { LoginButton } from '@/features/auth/components/LoginButton'
import { AuthCallback } from '@/features/auth/components/AuthCallback'
import { AppShell } from '@/components/layout/AppShell'
import { ScannersPage } from '@/features/scanners/pages/ScannersPage'
import { TradingProvider } from '@/features/trading/contexts/TradingContext'
import { PortfolioPage } from '@/features/trading/pages/PortfolioPage'

function LoginPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="mx-auto flex min-h-screen max-w-6xl items-center px-6 py-12">
        <div className="grid w-full items-center gap-10 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="space-y-8">
            <div className="inline-flex items-center gap-2 rounded-full border border-border/70 bg-card px-4 py-2 text-xs font-semibold text-muted-foreground">
              <span className="h-2 w-2 rounded-full bg-primary" />
              Market scanners + paper trading
            </div>
            <div className="space-y-4">
              <h1 className="font-display text-4xl leading-tight tracking-tight sm:text-5xl">
                WealthTracker
              </h1>
              <p className="max-w-xl text-base text-muted-foreground sm:text-lg">
                A clean, fast terminal for scanning momentum and simulating
                trades with a portfolio ledger.
              </p>
            </div>
            <div className="grid gap-4 text-sm text-muted-foreground sm:grid-cols-2">
              <div className="rounded-xl border border-border/70 bg-card p-4">
                <div className="text-xs font-semibold text-muted-foreground">
                  Live scanners
                </div>
                <div className="mt-2 text-base font-semibold text-foreground">
                  Intraday + premarket
                </div>
              </div>
              <div className="rounded-xl border border-border/70 bg-card p-4">
                <div className="text-xs font-semibold text-muted-foreground">
                  Trade simulator
                </div>
                <div className="mt-2 text-base font-semibold text-foreground">
                  Orders and fills
                </div>
              </div>
              <div className="rounded-xl border border-border/70 bg-card p-4 sm:col-span-2">
                <div className="text-xs font-semibold text-muted-foreground">
                  Portfolio
                </div>
                <div className="mt-2 text-base font-semibold text-foreground">
                  P&L, positions, and history
                </div>
              </div>
            </div>
          </div>
          <div className="rounded-2xl border border-border/70 bg-card p-6 shadow-lg shadow-black/5">
            <div className="space-y-3">
              <div className="text-xs font-semibold text-muted-foreground">
                Sign in
              </div>
              <h2 className="font-display text-2xl tracking-tight">
                Welcome back
              </h2>
              <p className="text-sm text-muted-foreground">
                Use your Google account to access your scanners.
              </p>
            </div>
            <div className="mt-6">
              <LoginButton />
            </div>
            <div className="mt-4 text-xs text-muted-foreground">
              Secure OAuth sign-in keeps your portfolio data protected.
            </div>
          </div>
        </div>
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
