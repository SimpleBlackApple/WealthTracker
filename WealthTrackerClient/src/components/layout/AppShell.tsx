import { Link, NavLink, Outlet } from 'react-router-dom'

import { LogoutButton } from '@/features/auth/components/LogoutButton'
import { cn } from '@/lib/utils'

export function AppShell() {
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
          <div className="flex items-center gap-2">
            <LogoutButton />
          </div>
        </div>
      </header>
      <main className="mx-auto w-full max-w-screen-2xl px-4 pb-8 pt-6">
        <Outlet />
      </main>
    </div>
  )
}
