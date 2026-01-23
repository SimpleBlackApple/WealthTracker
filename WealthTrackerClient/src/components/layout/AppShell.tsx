import { Link, NavLink, Outlet } from 'react-router-dom'

import { LogoutButton } from '@/features/auth/components/LogoutButton'
import { cn } from '@/lib/utils'

export function AppShell() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-40 border-b bg-background/90 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="mx-auto flex h-14 max-w-screen-2xl items-center justify-between px-4">
          <div className="flex items-center gap-4">
            <Link to="/scanners/day-gainers" className="font-semibold">
              WealthTracker
            </Link>
            <nav className="hidden items-center gap-1 md:flex">
              <NavLink
                to="/scanners/day-gainers"
                className={({ isActive }) =>
                  cn(
                    'rounded-md px-2 py-1 text-sm text-muted-foreground hover:text-foreground',
                    isActive && 'bg-muted text-foreground'
                  )
                }
              >
                Scanners
              </NavLink>
            </nav>
          </div>
          <div className="flex items-center gap-2">
            <LogoutButton />
          </div>
        </div>
      </header>
      <main className="mx-auto w-full max-w-screen-2xl px-4 py-4">
        <Outlet />
      </main>
    </div>
  )
}
