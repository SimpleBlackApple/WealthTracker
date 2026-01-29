import { useEffect, useMemo, useState } from 'react'

import { useTradingContext } from '../contexts/TradingContext'
import { usePortfolios } from '../hooks/usePortfolios'
import { usePortfolioSummary } from '../hooks/usePortfolio'
import { useOrderNotifications } from '../hooks/useOrderNotifications'
import { OrderForm } from './OrderForm'
import { PortfolioSummary } from './PortfolioSummary'
import { PositionsList } from './PositionsList'
import { TransactionHistory } from './TransactionHistory'
import { OpenOrdersList } from './OpenOrdersList'

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
  const { activePortfolioId, activeView, setActiveView } = useTradingContext()
  const portfoliosQuery = usePortfolios()
  const portfolios = portfoliosQuery.data ?? []

  const resolvedPortfolioId =
    activePortfolioId ?? (portfolios.length > 0 ? portfolios[0].id : null)

  const activePortfolio = useMemo(
    () => portfolios.find(p => p.id === resolvedPortfolioId) ?? null,
    [portfolios, resolvedPortfolioId]
  )

  const summaryQuery = usePortfolioSummary(resolvedPortfolioId)
  const goToPortfolio = () => setActiveView('portfolio')

  useOrderNotifications({
    portfolioId: resolvedPortfolioId,
    onGoToPortfolio: goToPortfolio,
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

    // Calculate unrealized P&L from positions
    const unrealized = summary.positions.reduce((sum, pos) => {
      return sum + (pos.unrealizedPL ?? 0)
    }, 0)

    // Note: We don't have today's realized P&L separately, so using 0 for now
    const realized = 0

    return { realized, unrealized }
  }, [summaryQuery.data])

  // Show different views based on activeView
  if (activeView === 'portfolio') {
    return (
      <div className="space-y-3 p-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold">Portfolio View</h3>
          <button
            type="button"
            onClick={() => setActiveView('trade')}
            className="text-xs text-muted-foreground hover:text-foreground"
          >
            Back to Trade
          </button>
        </div>
        <PortfolioSummary
          portfolio={activePortfolio}
          summary={summaryQuery.data ?? null}
          isLoading={summaryQuery.isLoading}
          error={summaryQuery.error as Error | null}
        />
        <PositionsList positions={summaryQuery.data?.positions ?? []} />
        <OpenOrdersList
          portfolioId={resolvedPortfolioId}
          onGoToPortfolio={goToPortfolio}
        />
      </div>
    )
  }

  if (activeView === 'history') {
    return (
      <div className="space-y-3 p-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold">Order History</h3>
          <button
            type="button"
            onClick={() => setActiveView('trade')}
            className="text-xs text-muted-foreground hover:text-foreground"
          >
            Back to Trade
          </button>
        </div>
        <TransactionHistory portfolioId={resolvedPortfolioId} />
      </div>
    )
  }

  // Trade view (default)
  return (
    <div className="flex h-full flex-col">
      {/* Header with price info and P&L - ultra compact */}
      <div className="shrink-0 space-y-1.5 border-b border-border/60 bg-card/60 px-3 py-2">
        {/* Price and P&L in one compact box */}
        <div className="rounded-md border border-border/60 bg-muted/30 px-2 py-1.5 text-xs">
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-muted-foreground">Price</span>
            <span className="font-medium">
              {currentPrice != null ? `$${currentPrice.toFixed(2)}` : 'N/A'}
            </span>
            <span className="text-[10px] text-muted-foreground">
              {formatUpdatedAgo(priceTimestamp, now)}
            </span>
          </div>
          <div className="mt-1 flex items-center justify-between border-t border-border/60 pt-1">
            <span className="text-[10px] text-muted-foreground">
              Today's P&L
            </span>
            <div className="flex items-center gap-3">
              <span
                className={
                  todayPnL.realized > 0
                    ? 'text-xs font-medium text-gain'
                    : todayPnL.realized < 0
                      ? 'text-xs font-medium text-loss'
                      : 'text-xs font-medium'
                }
              >
                R: {todayPnL.realized > 0 ? '+' : ''}$
                {todayPnL.realized.toFixed(2)}
              </span>
              <span
                className={
                  todayPnL.unrealized > 0
                    ? 'text-xs font-medium text-gain'
                    : todayPnL.unrealized < 0
                      ? 'text-xs font-medium text-loss'
                      : 'text-xs font-medium'
                }
              >
                U: {todayPnL.unrealized > 0 ? '+' : ''}$
                {todayPnL.unrealized.toFixed(2)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Order Form (scrollable + fixed execute button) */}
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
