import type {
  PortfolioSummary as Summary,
  SimulationPortfolio,
} from '../types/trading'

function money(value: number) {
  return value.toLocaleString(undefined, {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 2,
  })
}

function pct(value: number) {
  return `${(value * 100).toFixed(2)}%`
}

import { Wallet, BarChart3, TrendingUp, Coins, Info } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Card, CardContent } from '@/components/ui/card'

export function PortfolioSummary({
  portfolio,
  summary,
  isLoading,
  error,
}: {
  portfolio: SimulationPortfolio | null
  summary: Summary | null
  isLoading: boolean
  error: Error | null
}) {
  if (!portfolio) {
    return (
      <Card className="border-dashed border-2">
        <CardContent className="flex items-center justify-center p-6 text-muted-foreground gap-2">
          <Info className="h-4 w-4" />
          Select a portfolio to view summary.
        </CardContent>
      </Card>
    )
  }

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map(i => (
          <Card key={i} className="animate-pulse bg-muted/50 border-none h-24" />
        ))}
      </div>
    )
  }

  if (error) {
    return (
      <div className="rounded-xl border border-loss/20 bg-loss/5 p-4 text-sm text-loss flex items-center gap-3">
        <div className="h-2 w-2 rounded-full bg-loss animate-pulse" />
        {error.message}
      </div>
    )
  }

  if (!summary) return null

  const isGain = summary.totalPL >= 0
  const plColor = isGain ? 'text-gain' : 'text-loss'

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 animate-in fade-in slide-in-from-top-4 duration-500">
      {/* Total Value */}
      <Card className="relative overflow-hidden border-border/60 bg-card/80 shadow-sm transition-all hover:bg-card">
        <div className={cn("absolute top-0 left-0 w-1 h-full", isGain ? "bg-gain" : "bg-loss")} />
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-bold uppercase tracking-[0.15em] text-muted-foreground">Portfolio Value</span>
            <Wallet className="h-4 w-4 text-muted-foreground/40" />
          </div>
          <div className="flex flex-col">
            <span className="text-xl font-black tracking-tight">{money(summary.totalValue)}</span>
            <span className={cn("text-[10px] font-bold mt-1 inline-flex items-center gap-1", plColor)}>
              {isGain ? <TrendingUp className="h-3 w-3" /> : <TrendingUp className="h-3 w-3 rotate-180" />}
              {pct(summary.totalPLPercentage)}
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Cash */}
      <Card className="border-border/60 bg-card/80 shadow-sm transition-all hover:bg-card">
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-bold uppercase tracking-[0.15em] text-muted-foreground">Cash Balance</span>
            <Coins className="h-4 w-4 text-muted-foreground/40" />
          </div>
          <div className="flex flex-col">
            <span className="text-xl font-black tracking-tight">{money(summary.cash)}</span>
            <span className="text-[10px] text-muted-foreground/60 mt-1 font-medium">Available for trade</span>
          </div>
        </CardContent>
      </Card>

      {/* Equity */}
      <Card className="border-border/60 bg-card/80 shadow-sm transition-all hover:bg-card">
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-bold uppercase tracking-[0.15em] text-muted-foreground">Active Equity</span>
            <BarChart3 className="h-4 w-4 text-muted-foreground/40" />
          </div>
          <div className="flex flex-col">
            <span className="text-xl font-black tracking-tight">{money(summary.equityValue)}</span>
            <span className="text-[10px] text-muted-foreground/60 mt-1 font-medium">Invested capital</span>
          </div>
        </CardContent>
      </Card>

      {/* Total PL */}
      <Card className="border-border/60 bg-card/80 shadow-sm transition-all hover:bg-card">
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-bold uppercase tracking-[0.15em] text-muted-foreground">Lifetime P&L</span>
          </div>
          <div className="flex flex-col">
            <span className={cn("text-xl font-black tracking-tight", plColor)}>
              {summary.totalPL >= 0 ? '+' : ''}{money(summary.totalPL)}
            </span>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-[10px] text-muted-foreground/60 font-medium tracking-tight">Net Performance</span>
              <div className={cn("h-1.5 w-1.5 rounded-full", isGain ? "bg-gain animate-pulse" : "bg-loss animate-pulse")} />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
