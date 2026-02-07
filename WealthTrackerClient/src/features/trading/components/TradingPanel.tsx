import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { cn } from '@/lib/utils'
import { getRuntimeConfig } from '@/config/runtimeConfig'

import { useTradingContext } from '../contexts/TradingContext'
import { usePortfolios } from '../hooks/usePortfolios'
import { usePortfolioSummary } from '../hooks/usePortfolio'
import { useOrderNotifications } from '../hooks/useOrderNotifications'
import { StockSymbolBadge } from '@/features/scanners/components/StockSymbolBadge'
import { OrderForm } from './OrderForm'

interface TradingPanelProps {
  symbol: string
  exchange?: string | null
  currentPrice: number | null
  priceTimestamp: number
}

function formatUpdatedAgo(timestamp: number, now: number) {
  const secondsAgo = Math.max(0, Math.floor((now - timestamp) / 1000))
  if (secondsAgo < 60) return `${secondsAgo}s ago`
  const minutesAgo = Math.floor(secondsAgo / 60)
  if (minutesAgo < 60) return `${minutesAgo}m ago`
  const hoursAgo = Math.floor(minutesAgo / 60)
  return `${hoursAgo}h ago`
}

export function TradingPanel({
  symbol,
  exchange,
  currentPrice,
  priceTimestamp,
}: TradingPanelProps) {
  const navigate = useNavigate()
  const refreshMinutes = Math.max(
    1,
    Math.round(getRuntimeConfig().scannerRefreshSeconds / 60)
  )
  const { activePortfolioId } = useTradingContext()
  const portfoliosQuery = usePortfolios()
  const portfolios = portfoliosQuery.data ?? []

  const resolvedPortfolioId =
    activePortfolioId ?? (portfolios.length > 0 ? portfolios[0].id : null)

  const summaryQuery = usePortfolioSummary(resolvedPortfolioId)

  const goToPortfolio = useCallback(() => {
    navigate('/portfolio')
  }, [navigate])

  useOrderNotifications({
    portfolioId: resolvedPortfolioId,
    onGoToPortfolio: goToPortfolio,
  })

  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(id)
  }, [])

  const todayPnL = useMemo(() => {
    const summary = summaryQuery.data
    if (!summary) return { todayRealized: 0, unrealized: 0 }

    const unrealized = summary.positions.reduce((sum, pos) => {
      return sum + (pos.unrealizedPL ?? 0)
    }, 0)

    const todayRealized = summary.todayRealizedPL ?? 0

    return { todayRealized, unrealized }
  }, [summaryQuery.data])

  return (
    <div className="flex h-full flex-col">
      <div className="shrink-0 border-b border-border/70 bg-card px-4 py-3">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-2">
            <StockSymbolBadge symbol={symbol} className="h-7 w-7" />
            <div className="leading-tight">
              <div className="text-sm font-semibold">{symbol}</div>
              <div className="text-xs text-muted-foreground">
                {exchange ? exchange.toUpperCase() : '—'}
              </div>
            </div>
          </div>

          <div className="text-right">
            <div className="text-[10px] text-muted-foreground/80">
              Paper trading ({refreshMinutes}m refresh)
            </div>
            <div className="text-xs text-muted-foreground tabular-nums">
              {formatUpdatedAgo(priceTimestamp, now)}
            </div>
          </div>
        </div>

        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          <div className="rounded-lg border border-border/70 bg-secondary/40 px-3 py-2">
            <div className="text-xs text-muted-foreground">Price</div>
            <div className="mt-1 text-sm font-semibold tabular-nums">
              {currentPrice != null ? `$${currentPrice.toFixed(2)}` : 'N/A'}
            </div>
          </div>

          <div className="rounded-lg border border-border/70 bg-secondary/40 px-3 py-2">
            <div className="text-xs text-muted-foreground">Today P&L</div>
            <div className="mt-1 flex items-center justify-between">
              <span
                className={cn(
                  'text-sm font-semibold tabular-nums',
                  todayPnL.todayRealized > 0
                    ? 'text-gain'
                    : todayPnL.todayRealized < 0
                      ? 'text-loss'
                      : 'text-muted-foreground'
                )}
              >
                {todayPnL.todayRealized >= 0 ? '+' : '-'}$
                {Math.abs(todayPnL.todayRealized).toFixed(2)}
              </span>
              <span
                className={cn(
                  'text-xs tabular-nums',
                  todayPnL.unrealized > 0
                    ? 'text-gain'
                    : todayPnL.unrealized < 0
                      ? 'text-loss'
                      : 'text-muted-foreground'
                )}
              >
                unrealized {todayPnL.unrealized >= 0 ? '+' : '-'}$
                {Math.abs(todayPnL.unrealized).toFixed(2)}
              </span>
            </div>
          </div>
        </div>

        {summaryQuery.data?.positions?.some(p => p.symbol === symbol) && (
          <div className="mt-2 rounded-lg border border-border/70 bg-card px-3 py-2 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Position</span>
              {summaryQuery.data.positions
                .filter(p => p.symbol === symbol)
                .map(p => (
                  <span
                    key={p.symbol}
                    className={cn(
                      'font-semibold tabular-nums',
                      (p.unrealizedPL ?? 0) > 0
                        ? 'text-gain'
                        : (p.unrealizedPL ?? 0) < 0
                          ? 'text-loss'
                          : 'text-foreground'
                    )}
                  >
                    {p.quantity} @ ${p.averageCost.toFixed(2)}
                  </span>
                ))}
            </div>
          </div>
        )}
      </div>

      <div className="flex-1 overflow-hidden">
        <OrderForm
          portfolioId={resolvedPortfolioId}
          symbol={symbol}
          exchange={exchange}
          currentPrice={currentPrice}
          onGoToPortfolio={goToPortfolio}
        />
      </div>
    </div>
  )
}
