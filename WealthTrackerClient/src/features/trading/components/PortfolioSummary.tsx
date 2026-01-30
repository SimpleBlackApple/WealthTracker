import type { ReactNode } from 'react'
import { BarChart3, Coins, Info, TrendingUp, Wallet } from 'lucide-react'

import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'

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

function StatCard({
  label,
  icon,
  value,
  meta,
  accent,
}: {
  label: string
  icon?: ReactNode
  value: ReactNode
  meta?: ReactNode
  accent?: 'primary' | 'gain' | 'loss'
}) {
  const accentClass =
    accent === 'gain'
      ? 'bg-gain'
      : accent === 'loss'
        ? 'bg-loss'
        : accent === 'primary'
          ? 'bg-primary'
          : null

  return (
    <Card className="overflow-hidden">
      <div className="flex">
        {accentClass && <div className={cn('w-1 h-full', accentClass)} />}
        <CardContent className="flex-1 p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="text-xs font-semibold text-muted-foreground">
                {label}
              </div>
              <div className="mt-2 text-xl font-semibold tracking-tight">
                {value}
              </div>
              {meta && (
                <div className="mt-1 text-xs text-muted-foreground">{meta}</div>
              )}
            </div>
            {icon && (
              <div className="mt-0.5 text-muted-foreground/70">{icon}</div>
            )}
          </div>
        </CardContent>
      </div>
    </Card>
  )
}

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
      <Card className="border-dashed">
        <CardContent className="flex items-center justify-center gap-2 p-6 text-sm text-muted-foreground">
          <Info className="h-4 w-4" />
          Select a portfolio to view summary.
        </CardContent>
      </Card>
    )
  }

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[1, 2, 3, 4].map(i => (
          <Card key={i} className="h-24 animate-pulse bg-muted/60" />
        ))}
      </div>
    )
  }

  if (error) {
    return (
      <div className="rounded-xl border border-loss/25 bg-loss/10 p-4 text-sm text-loss">
        {error.message}
      </div>
    )
  }

  if (!summary) return null

  const isGain = summary.totalPL >= 0
  const plColor = isGain ? 'text-gain' : 'text-loss'

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <StatCard
        label="Portfolio value"
        icon={<Wallet className="h-4 w-4" />}
        value={money(summary.totalValue)}
        meta={
          <span
            className={cn(
              'inline-flex items-center gap-1 font-semibold',
              plColor
            )}
          >
            <TrendingUp
              className={cn('h-3.5 w-3.5', !isGain && 'rotate-180')}
            />
            {pct(summary.totalPLPercentage)}
          </span>
        }
        accent={isGain ? 'gain' : 'loss'}
      />

      <StatCard
        label="Cash balance"
        icon={<Coins className="h-4 w-4" />}
        value={money(summary.cash)}
        meta="Available for trade"
        accent="primary"
      />

      <StatCard
        label="Active equity"
        icon={<BarChart3 className="h-4 w-4" />}
        value={money(summary.equityValue)}
        meta="Invested capital"
      />

      <StatCard
        label="Lifetime P&L"
        value={
          <span className={cn(plColor)}>
            {summary.totalPL >= 0 ? '+' : ''}
            {money(summary.totalPL)}
          </span>
        }
        meta="Net performance"
      />
    </div>
  )
}
