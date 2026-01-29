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
    <div className="relative min-h-screen overflow-hidden bg-background text-foreground">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute inset-0 opacity-70 [background-image:radial-gradient(800px_400px_at_15%_0%,oklch(0.9_0.08_195_/_40%),transparent_70%)]" />
        <div className="absolute inset-0 opacity-50 [background-image:radial-gradient(700px_360px_at_85%_-10%,oklch(0.92_0.1_80_/_35%),transparent_75%)]" />
        <div className="absolute inset-0 opacity-40 [background-image:linear-gradient(to_right,oklch(0.9_0.01_250_/_35%)_1px,transparent_1px),linear-gradient(to_bottom,oklch(0.9_0.01_250_/_35%)_1px,transparent_1px)] [background-size:64px_64px]" />
      </div>
      <div className="relative mx-auto flex min-h-screen max-w-6xl items-center px-6 py-12">
        <div className="grid w-full items-center gap-10 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="space-y-8">
            <div className="inline-flex items-center gap-3 rounded-full border border-border/60 bg-card/60 px-4 py-2 text-[11px] uppercase tracking-[0.32em] text-muted-foreground">
              <span className="h-2 w-2 rounded-full bg-primary/70" />
              Autonomous Trading Desk
            </div>
            <div className="space-y-4">
              <h1 className="font-display text-4xl leading-tight sm:text-5xl">
                FluxTerminal
              </h1>
              <p className="max-w-xl text-base text-muted-foreground sm:text-lg">
                The high-velocity market interface for pro traders.
                Streamlined, precise, and built for the modern edge.
              </p>
            </div>
            <div className="grid gap-4 text-sm text-muted-foreground sm:grid-cols-2">
              <div className="rounded-xl border border-border/60 bg-card/70 p-4">
                <div className="text-[11px] uppercase tracking-[0.2em]">
                  Live Scanners
                </div>
                <div className="mt-2 text-base font-semibold text-foreground">
                  Intraday + premarket
                </div>
              </div>
              <div className="rounded-xl border border-border/60 bg-card/70 p-4">
                <div className="text-[11px] uppercase tracking-[0.2em]">
                  Signals
                </div>
                <div className="mt-2 text-base font-semibold text-foreground">
                  Breakouts and reversals
                </div>
              </div>
              <div className="rounded-xl border border-border/60 bg-card/70 p-4 sm:col-span-2">
                <div className="text-[11px] uppercase tracking-[0.2em]">
                  Insight Layer
                </div>
                <div className="mt-2 text-base font-semibold text-foreground">
                  Clean density, sharper filters
                </div>
              </div>
            </div>
          </div>
          <div className="rounded-2xl border border-border/70 bg-card/80 p-6 shadow-lg shadow-black/5 backdrop-blur">
            <div className="space-y-3">
              <div className="text-[11px] uppercase tracking-[0.3em] text-muted-foreground">
                Sign in
              </div>
              <h2 className="font-display text-2xl">Welcome back</h2>
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
        <Route
          index
          element={<Navigate to="/scanners" replace />}
        />
        <Route path="scanners" element={<Navigate to="/scanners/day-gainers" replace />} />
        <Route path="scanners/:scannerId" element={<ScannersPage />} />
        <Route path="portfolio" element={<PortfolioPage />} />
      </Route>
    </Routes>
  )
}

export default App
