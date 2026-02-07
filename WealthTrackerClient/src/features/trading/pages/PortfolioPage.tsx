import { useMemo } from 'react'
import { Clock, LayoutGrid } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useTradingContext } from '../contexts/TradingContext'
import { usePortfolios } from '../hooks/usePortfolios'
import { usePortfolioSummary } from '../hooks/usePortfolio'
import { PortfolioSummary } from '../components/PortfolioSummary'
import { PositionsList } from '../components/PositionsList'
import { TransactionHistory } from '../components/TransactionHistory'
import { OpenOrdersList } from '../components/OpenOrdersList'

export function PortfolioPage() {
  const { activePortfolioId } = useTradingContext()
  const portfoliosQuery = usePortfolios()
  const portfolios = portfoliosQuery.data

  const resolvedPortfolioId = activePortfolioId ?? portfolios?.[0]?.id ?? null

  const activePortfolio = useMemo(
    () => portfolios?.find(p => p.id === resolvedPortfolioId) ?? null,
    [portfolios, resolvedPortfolioId]
  )

  const summaryQuery = usePortfolioSummary(resolvedPortfolioId)

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="font-display text-2xl font-semibold tracking-tight">
          Portfolio
        </h1>
        <p className="text-sm text-muted-foreground">
          Track positions, open orders, and a full transaction ledger.
        </p>
      </div>

      <PortfolioSummary
        portfolio={activePortfolio}
        summary={summaryQuery.data ?? null}
        isLoading={summaryQuery.isLoading}
        error={summaryQuery.error as Error | null}
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="flex flex-col">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 border-b border-border/70 p-4 shrink-0">
            <div className="flex items-center gap-2">
              <LayoutGrid className="h-4 w-4 text-primary" />
              <CardTitle className="text-sm">Positions</CardTitle>
            </div>
            <Badge variant="secondary" className="text-xs">
              {(summaryQuery.data?.positions.length ?? 0).toLocaleString()}
            </Badge>
          </CardHeader>
          <CardContent className="flex-1 p-0 overflow-auto">
            <PositionsList
              positions={summaryQuery.data?.positions ?? []}
              portfolioId={resolvedPortfolioId}
              showContainer={false}
              showHeader={false}
            />
          </CardContent>
        </Card>

        <Card className="flex flex-col">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 border-b border-border/70 p-4 shrink-0">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-primary" />
              <CardTitle className="text-sm">Open orders</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="flex-1 p-0 overflow-auto">
            <OpenOrdersList
              portfolioId={resolvedPortfolioId}
              onGoToPortfolio={() => {}}
              showContainer={false}
              showHeader={false}
            />
          </CardContent>
        </Card>

        <Card className="lg:col-span-3">
          <CardContent className="p-0">
            <TransactionHistory
              portfolioId={resolvedPortfolioId}
              showContainer={false}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
