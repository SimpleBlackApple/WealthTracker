import { Link, NavLink, Outlet } from 'react-router-dom'
import { Volume2, VolumeX, User, LogOut, Edit2, Shield, Mail, Check, X } from 'lucide-react'

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
import { useAuthStore } from '@/stores/authStore'
import { authService } from '@/features/auth/services/authService'
import { cn } from '@/lib/utils'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

import { useState } from 'react'

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
    <div className="min-h-screen bg-background/80 text-foreground text-sm font-sans">
      <header className="sticky top-0 z-40 border-b border-border/60 bg-background/80 backdrop-blur-md supports-[backdrop-filter]:bg-background/60 shadow-sm transition-all duration-300">
        <div className="mx-auto flex h-16 max-w-screen-2xl items-center justify-between gap-6 px-4">
          <div className="flex items-center gap-8">
            <Link
              to="/scanners/day-gainers"
              className="flex items-center gap-3 transition-opacity hover:opacity-90"
            >
              <div className="grid h-9 w-9 place-items-center rounded-lg bg-primary/10 text-primary shadow-sm border border-primary/20">
                <span className="text-sm font-bold">FX</span>
              </div>
              <div className="hidden lg:block leading-tight">
                <div className="font-display text-base uppercase tracking-[0.24em] text-foreground">
                  FluxTerminal
                </div>
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground/60 font-medium">
                  Autonomous Trading Desk
                </div>
              </div>
            </Link>
            <nav className="hidden items-center rounded-lg border border-border/40 bg-card/40 p-1 md:flex shadow-inner">
              <NavLink
                to="/scanners"
                className={({ isActive }) =>
                  cn(
                    'rounded-md px-4 py-1.5 text-[11px] font-bold uppercase tracking-[0.12em] text-muted-foreground transition-all duration-200 hover:text-foreground',
                    isActive && 'bg-primary/20 text-primary shadow-sm'
                  )
                }
              >
                Scan & Trade
              </NavLink>
              <NavLink
                to="/portfolio"
                className={({ isActive }) =>
                  cn(
                    'rounded-md px-4 py-1.5 text-[11px] font-bold uppercase tracking-[0.12em] text-muted-foreground transition-all duration-200 hover:text-foreground',
                    isActive && 'bg-primary/20 text-primary shadow-sm'
                  )
                }
              >
                Portfolio
              </NavLink>
            </nav>
          </div>

          <div className="flex items-center gap-4">
            <div className="hidden lg:flex items-center gap-1.5 pr-4 border-r border-border/40">
              <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/30">Desk</span>
              <Select
                value={
                  resolvedPortfolioId != null ? String(resolvedPortfolioId) : ''
                }
                onValueChange={v => setActivePortfolioId(Number(v))}
                disabled={portfoliosQuery.isLoading || portfolios.length === 0}
              >
                <SelectTrigger className="h-8 w-44 text-xs bg-transparent border-none focus:ring-0 text-foreground/80 font-medium hover:bg-muted/30 transition-colors">
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
                    <SelectItem key={p.id} value={String(p.id)} className="text-xs">
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-muted-foreground/50 hover:text-foreground transition-colors"
                title={soundEnabled ? 'Disable alerts sound' : 'Enable alerts sound'}
                onClick={() => setSoundEnabled(!soundEnabled)}
              >
                {soundEnabled ? (
                  <Volume2 className="h-4 w-4" />
                ) : (
                  <VolumeX className="h-4 w-4" />
                )}
              </Button>

              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="ghost" className="h-10 gap-3 pl-2 pr-1.5 rounded-full hover:bg-muted/80 transition-all border border-transparent hover:border-border/40">
                    <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary border border-primary/20 shadow-sm">
                      <User className="h-4 w-4" />
                    </div>
                    <div className="flex flex-col items-start leading-none pr-1">
                      <span className="text-[11px] font-bold tracking-tight">{user?.name}</span>
                      <span className="text-[9px] text-muted-foreground uppercase tracking-widest mt-0.5">Trader</span>
                    </div>
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-72 p-4 shadow-2xl border-border/40 bg-card/95 backdrop-blur-sm" align="end" sideOffset={8}>
                  <div className="grid gap-5">
                    <div className="flex flex-col gap-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">Professional Profile</span>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 rounded-full hover:bg-primary/10 hover:text-primary transition-colors"
                          onClick={() => {
                            setNewName(user?.name || '')
                            setIsEditingName(true)
                          }}
                        >
                          <Edit2 className="h-3 w-3" />
                        </Button>
                      </div>
                      <div className="flex items-center gap-4 py-1">
                        <div className="h-12 w-12 rounded-xl bg-primary/5 flex items-center justify-center border border-primary/20 shadow-inner">
                          <span className="text-lg font-bold text-primary">{user?.name?.[0].toUpperCase()}</span>
                        </div>
                        <div className="flex flex-col overflow-hidden">
                          <span className="text-sm font-bold truncate">{user?.name}</span>
                          <span className="text-[11px] text-muted-foreground flex items-center gap-1.5 mt-0.5">
                            <Mail className="h-3 w-3 opacity-50" />
                            <span className="truncate">{user?.email}</span>
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="h-px bg-border/40" />

                    <div className="grid gap-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">Identity Status</span>
                      </div>
                      <div className="flex items-center justify-between rounded-lg bg-muted/30 p-2 border border-border/40">
                        <span className="flex items-center gap-2 text-[11px] font-medium text-muted-foreground">
                          <Shield className="h-3 w-3 text-gain" />
                          Google Verified
                        </span>
                        <div className="h-1.5 w-1.5 rounded-full bg-gain shadow-[0_0_8px_rgba(34,197,94,0.6)]" />
                      </div>
                    </div>

                    <div className="h-px bg-border/40 mt-1" />

                    <Button
                      variant="destructive"
                      size="sm"
                      className="w-full h-9 gap-2 text-[11px] uppercase tracking-[0.15em] font-bold shadow-sm"
                      onClick={handleLogout}
                    >
                      <LogOut className="h-3.5 w-3.5" />
                      Sign Out Flux
                    </Button>
                  </div>
                </PopoverContent>
              </Popover>
            </div>
          </div>
        </div>

        {/* Edit Name Modal */}
        {isEditingName && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm animate-in fade-in duration-300">
            <div className="w-full max-w-sm rounded-2xl border border-border/40 bg-card p-7 shadow-[0_20px_50px_rgba(0,0,0,0.3)] animate-in zoom-in-95 duration-200">
              <h3 className="text-xl font-display font-bold tracking-tight">Update Name</h3>
              <p className="text-sm text-muted-foreground mt-2 mb-8 leading-relaxed">
                Update your preferred display name across the Flux terminal.
              </p>

              <div className="grid gap-6">
                <div className="grid gap-2.5">
                  <Label htmlFor="name" className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground/70 ml-0.5">Preferred Name</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/40" />
                    <Input
                      id="name"
                      value={newName}
                      onChange={(e) => setNewName(e.target.value)}
                      placeholder="Electronic identity"
                      className="h-11 pl-10 bg-muted/20 border-border/40 focus:border-primary/40 focus:ring-primary/10 transition-all font-medium"
                      autoFocus
                    />
                  </div>
                </div>

                <div className="flex items-center gap-3 mt-2">
                  <Button
                    variant="ghost"
                    className="flex-1 h-10 gap-2 font-bold uppercase tracking-wider text-[11px] hover:bg-muted/80"
                    onClick={() => setIsEditingName(false)}
                    disabled={isUpdating}
                  >
                    <X className="h-4 w-4" />
                    Abort
                  </Button>
                  <Button
                    className="flex-1 h-10 gap-2 font-bold uppercase tracking-wider text-[11px] shadow-lg shadow-primary/20"
                    onClick={handleUpdateName}
                    disabled={isUpdating || !newName.trim() || newName === user?.name}
                  >
                    {isUpdating ? (
                      <span className="animate-spin rounded-full h-4 w-4 border-2 border-background border-t-transparent" />
                    ) : (
                      <Check className="h-4 w-4" />
                    )}
                    Authorize
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}
      </header>
      <main className="mx-auto w-full max-w-screen-2xl px-4 py-6">
        <Outlet />
      </main>
    </div>
  )
}
