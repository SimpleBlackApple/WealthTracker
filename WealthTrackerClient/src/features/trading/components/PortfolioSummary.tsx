import type { PortfolioSummary as Summary, SimulationPortfolio } from '../types/trading'

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
      <div className="rounded-md border border-border/60 bg-card/60 p-3 text-sm text-muted-foreground">
        Select a portfolio to view summary.
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="rounded-md border border-border/60 bg-card/60 p-3 text-sm text-muted-foreground">
        Loading portfolio summary...
      </div>
    )
  }

  if (error) {
    return (
      <div className="rounded-md border border-border/60 bg-card/60 p-3 text-sm text-red-700 dark:text-red-200">
        {error.message}
      </div>
    )
  }

  if (!summary) return null

  const plColor =
    summary.totalPL > 0
      ? 'text-emerald-600'
      : summary.totalPL < 0
        ? 'text-red-600'
        : 'text-muted-foreground'

  return (
    <div className="rounded-md border border-border/60 bg-card/60 p-3 text-xs">
      <div className="flex items-center justify-between">
        <div className="font-semibold">{portfolio.name}</div>
        <div className="text-muted-foreground">Paper account</div>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div>
          <div className="text-muted-foreground">Total Value</div>
          <div className="mt-1 text-sm font-semibold">{money(summary.totalValue)}</div>
        </div>
        <div>
          <div className="text-muted-foreground">Cash</div>
          <div className="mt-1 text-sm font-semibold">{money(summary.cash)}</div>
        </div>
        <div>
          <div className="text-muted-foreground">Equity</div>
          <div className="mt-1 text-sm font-semibold">{money(summary.equityValue)}</div>
        </div>
        <div>
          <div className="text-muted-foreground">Total P&amp;L</div>
          <div className={`mt-1 text-sm font-semibold ${plColor}`}>
            {money(summary.totalPL)}{' '}
            <span className="text-xs font-medium text-muted-foreground">
              ({pct(summary.totalPLPercentage)})
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}

