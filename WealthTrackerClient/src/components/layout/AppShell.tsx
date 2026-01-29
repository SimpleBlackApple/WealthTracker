import { Link, NavLink, Outlet } from 'react-router-dom'
import { Volume2, VolumeX } from 'lucide-react'

import { LogoutButton } from '@/features/auth/components/LogoutButton'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useToast } from '@/components/ui/toast'
import { useTradingContext } from '@/features/trading/contexts/TradingContext'
import { usePortfolios } from '@/features/trading/hooks/usePortfolios'
import { cn } from '@/lib/utils'

export function AppShell() {
  const { soundEnabled, setSoundEnabled } = useToast()
  const { activePortfolioId, setActivePortfolioId, setActiveView } =
    useTradingContext()
  const portfoliosQuery = usePortfolios()
  const portfolios = portfoliosQuery.data ?? []

  const resolvedPortfolioId =
    activePortfolioId ?? (portfolios.length > 0 ? portfolios[0].id : null)

  return (
    <div className="min-h-screen bg-background/80 text-foreground">
      <header className="sticky top-0 z-40 border-b border-border/60 bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="mx-auto flex h-16 max-w-screen-2xl items-center justify-between gap-6 px-4">
          <div className="flex items-center gap-6">
            <Link
              to="/scanners/day-gainers"
              className="flex items-center gap-3"
            >
              <span className="grid h-9 w-9 place-items-center rounded-lg bg-primary/15 text-primary shadow-sm">
                <span className="text-sm font-semibold">WT</span>
              </span>
              <div className="leading-tight">
                <div className="font-display text-sm uppercase tracking-[0.24em] text-foreground">
                  WealthTracker
                </div>
                <div className="text-[11px] text-muted-foreground">
                  Market Intelligence
                </div>
              </div>
            </Link>
            <nav className="hidden items-center rounded-full border border-border/60 bg-card/60 p-1 md:flex">
              <NavLink
                to="/scanners/day-gainers"
                className={({ isActive }) =>
                  cn(
                    'rounded-full px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground transition-colors hover:text-foreground',
                    isActive && 'bg-primary/15 text-foreground shadow-sm'
                  )
                }
              >
                Scanners
              </NavLink>
              <NavLink
                to="/account"
                className={({ isActive }) =>
                  cn(
                    'rounded-full px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground transition-colors hover:text-foreground',
                    isActive && 'bg-primary/15 text-foreground shadow-sm'
                  )
                }
              >
                Account
              </NavLink>
            </nav>
          </div>
          <div className="flex items-center gap-3">
            <Select
              value={
                resolvedPortfolioId != null ? String(resolvedPortfolioId) : ''
              }
              onValueChange={v => setActivePortfolioId(Number(v))}
              disabled={portfoliosQuery.isLoading || portfolios.length === 0}
            >
              <SelectTrigger className="h-8 w-44">
                <SelectValue
                  placeholder={
                    portfoliosQuery.isLoading
                      ? 'Loading...'
                      : 'Select portfolio'
                  }
                />
              </SelectTrigger>
              <SelectContent>
                {portfolios.map(p => (
                  <SelectItem key={p.id} value={String(p.id)}>
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Button
              type="button"
              variant="outline"
              size="icon"
              className="h-8 w-8"
              title={soundEnabled ? 'Sound on' : 'Sound off'}
              onClick={() => setSoundEnabled(!soundEnabled)}
            >
              {soundEnabled ? (
                <Volume2 className="h-4 w-4" />
              ) : (
                <VolumeX className="h-4 w-4" />
              )}
            </Button>

            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-8 text-xs"
              onClick={() => setActiveView('portfolio')}
            >
              Portfolio
            </Button>

            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-8 text-xs"
              onClick={() => setActiveView('history')}
            >
              History
            </Button>

            <LogoutButton />
          </div>
        </div>
      </header>
      <main className="mx-auto w-full max-w-screen-2xl px-4 pb-4 pt-2">
        <Outlet />
      </main>
    </div>
  )
}
