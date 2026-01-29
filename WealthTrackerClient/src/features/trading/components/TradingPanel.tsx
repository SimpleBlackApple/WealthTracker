import { useEffect, useMemo, useState } from 'react'
import { cn } from '@/lib/utils'

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
  const { activePortfolioId } = useTradingContext()
  const portfoliosQuery = usePortfolios()
  const portfolios = portfoliosQuery.data ?? []

  const resolvedPortfolioId =
    activePortfolioId ?? (portfolios.length > 0 ? portfolios[0].id : null)

  const summaryQuery = usePortfolioSummary(resolvedPortfolioId)

  useOrderNotifications({
    portfolioId: resolvedPortfolioId,
    onGoToPortfolio: () => { }, // Handled by separate page now
  })

  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(id)
  }, [])

  // Calculate today's P&L from summary
  const todayPnL = useMemo(() => {
    const summary = summaryQuery.data
    if (!summary) return { realized: 0, unrealized: 0 }

    const unrealized = summary.positions.reduce((sum, pos) => {
      return sum + (pos.unrealizedPL ?? 0)
    }, 0)

    const realized = 0 // Mocked for now

    return { realized, unrealized }
  }, [summaryQuery.data])

  return (
    <div className="flex h-full flex-col">
      {/* Header with symbol, price info and P&L - ultra compact */}
      <div className="shrink-0 border-b border-border/60 bg-card/60 px-3 py-2">
        <div className="flex items-center gap-2 mb-2">
          <StockSymbolBadge symbol={symbol} />
          <span className="text-xs font-bold tracking-wider">{symbol}</span>
        </div>

        <div className="rounded-md border border-border/60 bg-muted/30 px-2 py-1.5 text-[11px]">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground">Price</span>
              <span className="font-bold">
                {currentPrice != null ? `$${currentPrice.toFixed(2)}` : 'N/A'}
              </span>
            </div>
            <span className="text-[9px] text-muted-foreground/60 tabular-nums">
              {formatUpdatedAgo(priceTimestamp, now)}
            </span>
          </div>
          <div className="mt-1 flex flex-col gap-0.5 border-t border-border/60 pt-1">
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-muted-foreground">Unrealized P&L</span>
              <span className={cn(
                "font-medium",
                todayPnL.unrealized > 0 ? 'text-gain' : todayPnL.unrealized < 0 ? 'text-loss' : 'text-muted-foreground'
              )}>
                {todayPnL.unrealized >= 0 ? '+' : ''}${Math.abs(todayPnL.unrealized).toFixed(2)}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-muted-foreground">Realized P&L</span>
              <span className={cn(
                "font-medium",
                todayPnL.realized > 0 ? 'text-gain' : todayPnL.realized < 0 ? 'text-loss' : 'text-muted-foreground'
              )}>
                {todayPnL.realized >= 0 ? '+' : ''}${Math.abs(todayPnL.realized).toFixed(2)}
              </span>
            </div>
          </div>
          {summaryQuery.data?.positions?.some(p => p.symbol === symbol) && (
            <div className="mt-1 border-t border-border/40 pt-1 flex items-center justify-between">
              <span className="text-[10px] text-muted-foreground">Position</span>
              {summaryQuery.data.positions
                .filter(p => p.symbol === symbol)
                .map(p => (
                  <span key={p.symbol} className={cn(
                    "font-bold",
                    (p.unrealizedPL ?? 0) > 0 ? 'text-gain' : (p.unrealizedPL ?? 0) < 0 ? 'text-loss' : ''
                  )}>
                    {p.quantity} @ ${p.averageCost.toFixed(2)}
                  </span>
                ))}
            </div>
          )}
        </div>
      </div>

      {/* Order Form (scrollable + fixed execute button) */}
      <div className="flex-1 overflow-hidden">
        <OrderForm
          portfolioId={resolvedPortfolioId}
          symbol={symbol}
          exchange={exchange}
          currentPrice={currentPrice}
          onGoToPortfolio={() => { }} // Handled by navigation now
        />
      </div>
    </div>
  )
}
