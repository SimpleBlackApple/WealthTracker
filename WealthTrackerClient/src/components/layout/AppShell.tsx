import { useState } from 'react'
import { Link, NavLink, Outlet } from 'react-router-dom'
import {
  Check,
  Edit2,
  LogOut,
  Mail,
  Shield,
  User,
  Volume2,
  VolumeX,
  X,
} from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { cn } from '@/lib/utils'
import { authService } from '@/features/auth/services/authService'
import { useToast } from '@/components/ui/toast'
import { useTradingContext } from '@/features/trading/contexts/TradingContext'
import { usePortfolios } from '@/features/trading/hooks/usePortfolios'
import { useAuthStore } from '@/stores/authStore'

export function AppShell() {
  const { soundEnabled, setSoundEnabled } = useToast()
  const { activePortfolioId, setActivePortfolioId } = useTradingContext()
  const portfoliosQuery = usePortfolios()
  const portfolios = portfoliosQuery.data ?? []

  const { logout, user, updateUser } = useAuthStore()
  const [isEditingName, setIsEditingName] = useState(false)
  const [newName, setNewName] = useState(user?.name || '')
  const [isUpdating, setIsUpdating] = useState(false)

  const resolvedPortfolioId =
    activePortfolioId ?? (portfolios.length > 0 ? portfolios[0].id : null)

  const handleLogout = async () => {
    await logout()
    window.location.href = '/'
  }

  const handleUpdateName = async () => {
    if (!user || !newName.trim() || newName === user.name) {
      setIsEditingName(false)
      return
    }

    setIsUpdating(true)
    try {
      await authService.updateUserName(user.id, newName)
      updateUser({ ...user, name: newName })
      setIsEditingName(false)
    } catch (error) {
      console.error('Failed to update name:', error)
    } finally {
      setIsUpdating(false)
    }
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-40 border-b border-border/70 bg-header">
        <div className="mx-auto flex h-14 max-w-screen-2xl items-center justify-between gap-4 px-4">
          <div className="flex items-center gap-3">
            <Link
              to="/scanners/day-gainers"
              className="flex items-center gap-2 rounded-lg px-1.5 py-1 hover:bg-secondary/50"
              aria-label="WealthTracker home"
            >
              <div className="grid h-8 w-8 place-items-center rounded-lg bg-primary-light text-primary-foreground shadow-sm shadow-primary/20">
                <span className="text-xs font-bold">WT</span>
              </div>
              <div className="hidden sm:flex flex-col leading-tight">
                <span className="font-display text-sm font-semibold tracking-tight">
                  WealthTracker
                </span>
                <span className="text-[11px] text-muted-foreground">
                  Trading desk
                </span>
              </div>
            </Link>

            <nav className="hidden items-center gap-1 md:flex">
              <NavLink
                to="/scanners"
                className={({ isActive }) =>
                  cn(
                    'rounded-lg px-3 py-2 text-sm font-semibold text-muted-foreground transition-colors hover:bg-secondary/60 hover:text-foreground',
                    isActive && 'bg-secondary text-foreground'
                  )
                }
              >
                Scanners
              </NavLink>
              <NavLink
                to="/portfolio"
                className={({ isActive }) =>
                  cn(
                    'rounded-lg px-3 py-2 text-sm font-semibold text-muted-foreground transition-colors hover:bg-secondary/60 hover:text-foreground',
                    isActive && 'bg-secondary text-foreground'
                  )
                }
              >
                Portfolio
              </NavLink>
            </nav>
          </div>

          <div className="flex items-center gap-2">
            <div className="hidden lg:flex items-center gap-2 rounded-lg border border-border/70 bg-background px-3 py-1.5">
              <span className="text-[11px] font-semibold text-muted-foreground">
                Portfolio
              </span>
              <Select
                value={
                  resolvedPortfolioId != null ? String(resolvedPortfolioId) : ''
                }
                onValueChange={v => setActivePortfolioId(Number(v))}
                disabled={portfoliosQuery.isLoading || portfolios.length === 0}
              >
                <SelectTrigger className="h-8 w-[220px] border-0 bg-transparent shadow-none focus:ring-0">
                  <SelectValue placeholder="Select portfolio" />
                </SelectTrigger>
                <SelectContent align="end">
                  {portfolios.map(p => (
                    <SelectItem key={p.id} value={String(p.id)}>
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-9 w-9 rounded-full"
              onClick={() => setSoundEnabled(!soundEnabled)}
              title={soundEnabled ? 'Disable sound' : 'Enable sound'}
              aria-label={soundEnabled ? 'Disable sound' : 'Enable sound'}
            >
              {soundEnabled ? (
                <Volume2 className="h-4 w-4" />
              ) : (
                <VolumeX className="h-4 w-4" />
              )}
            </Button>

            <Popover>
              <PopoverTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="h-9 w-9 rounded-full bg-card"
                  aria-label="Open account menu"
                >
                  <User className="h-4 w-4" />
                </Button>
              </PopoverTrigger>
              <PopoverContent align="end" className="w-80 p-0">
                <div className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                        Account
                      </div>
                      <div className="mt-1 truncate text-sm font-semibold">
                        {user?.name}
                      </div>
                      <div className="mt-0.5 flex items-center gap-1.5 text-xs text-muted-foreground">
                        <Mail className="h-3.5 w-3.5 opacity-60" />
                        <span className="truncate">{user?.email}</span>
                      </div>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 rounded-full"
                      onClick={() => {
                        setNewName(user?.name || '')
                        setIsEditingName(true)
                      }}
                      aria-label="Edit display name"
                    >
                      <Edit2 className="h-4 w-4" />
                    </Button>
                  </div>

                  <div className="mt-4 rounded-lg border border-border/70 bg-secondary/50 p-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
                        <Shield className="h-4 w-4 text-gain" />
                        Google verified
                      </div>
                      <div className="h-2 w-2 rounded-full bg-gain" />
                    </div>
                  </div>
                </div>

                <div className="h-px bg-border/70" />

                <div className="p-3">
                  <Button
                    size="sm"
                    className="h-9 w-full gap-2 bg-secondary hover:bg-secondary/80 text-foreground"
                    onClick={handleLogout}
                  >
                    <LogOut className="h-4 w-4" />
                    Log out
                  </Button>
                </div>
              </PopoverContent>
            </Popover>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-screen-2xl px-4 py-6">
        <Outlet />
      </main>

      {isEditingName && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/35 p-4">
          <div className="w-full max-w-md rounded-2xl border border-border/70 bg-card p-6 shadow-xl shadow-black/15">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="font-display text-lg font-semibold tracking-tight">
                  Update name
                </h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  This will update the display name shown across the app.
                </p>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-9 w-9 rounded-full"
                onClick={() => setIsEditingName(false)}
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            <div className="mt-6 grid gap-2">
              <Label htmlFor="name" className="text-xs font-semibold">
                Preferred name
              </Label>
              <div className="relative">
                <User className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground/70" />
                <Input
                  id="name"
                  value={newName}
                  onChange={e => setNewName(e.target.value)}
                  placeholder="Your name"
                  className="h-11 pl-10"
                  autoFocus
                />
              </div>
            </div>

            <div className="mt-6 flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                className="h-10 flex-1"
                onClick={() => setIsEditingName(false)}
                disabled={isUpdating}
              >
                Cancel
              </Button>
              <Button
                type="button"
                className="h-10 flex-1 bg-primary-light hover:bg-primary-lighter text-primary-foreground shadow-sm shadow-primary/20"
                onClick={handleUpdateName}
                disabled={
                  isUpdating || !newName.trim() || newName === user?.name
                }
              >
                {isUpdating ? (
                  <span className="inline-flex items-center gap-2">
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground/70 border-t-transparent" />
                    Saving
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-2">
                    <Check className="h-4 w-4" />
                    Save
                  </span>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
