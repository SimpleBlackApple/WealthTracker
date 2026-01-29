import { useEffect, useMemo, useState } from 'react'

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { usePortfolios } from '../hooks/usePortfolios'
import { usePortfolioSummary } from '../hooks/usePortfolio'
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
  const [activeTab, setActiveTab] = useState('trade')
  const portfoliosQuery = usePortfolios()
  const portfolios = portfoliosQuery.data ?? []

  const [activePortfolioId, setActivePortfolioId] = useState<number | null>(
    null
  )

  useEffect(() => {
    if (activePortfolioId != null) return
    if (portfolios.length === 0) return
    setActivePortfolioId(portfolios[0].id)
  }, [activePortfolioId, portfolios])

  const activePortfolio = useMemo(
    () => portfolios.find(p => p.id === activePortfolioId) ?? null,
    [activePortfolioId, portfolios]
  )

  const summaryQuery = usePortfolioSummary(activePortfolioId)

  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(id)
  }, [])

  return (
    <div className="space-y-3 p-3">
      <div className="rounded-md border border-border/60 bg-muted/30 p-2 text-xs">
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground">
            Simulation Mode - Price from scanner
          </span>
          <span className="font-medium">
            {currentPrice != null ? `$${currentPrice.toFixed(2)}` : 'N/A'}
          </span>
        </div>
        <div className="mt-1 text-muted-foreground">
          Last updated: {formatUpdatedAgo(priceTimestamp, now)}
        </div>
      </div>

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground">
          Portfolio
        </div>
        <div className="w-full sm:w-64">
          <Select
            value={activePortfolioId != null ? String(activePortfolioId) : ''}
            onValueChange={v => setActivePortfolioId(Number(v))}
            disabled={portfoliosQuery.isLoading || portfolios.length === 0}
          >
            <SelectTrigger className="h-9">
              <SelectValue
                placeholder={
                  portfoliosQuery.isLoading ? 'Loading...' : 'Select portfolio'
                }
              />
            </SelectTrigger>
            <SelectContent>
              {portfolios.map(p => (
                <SelectItem key={p.id} value={String(p.id)}>
                  {p.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="trade">Trade</TabsTrigger>
          <TabsTrigger value="portfolio">Portfolio</TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
        </TabsList>

        <TabsContent value="trade" className="mt-3 space-y-3">
          <OrderForm
            portfolioId={activePortfolioId}
            symbol={symbol}
            exchange={exchange}
            currentPrice={currentPrice}
          />
        </TabsContent>

        <TabsContent value="portfolio" className="mt-3 space-y-3">
          <PortfolioSummary
            portfolio={activePortfolio}
            summary={summaryQuery.data ?? null}
            isLoading={summaryQuery.isLoading}
            error={summaryQuery.error as Error | null}
          />
          <PositionsList positions={summaryQuery.data?.positions ?? []} />
          <OpenOrdersList portfolioId={activePortfolioId} />
        </TabsContent>

        <TabsContent value="history" className="mt-3 space-y-3">
          <TransactionHistory portfolioId={activePortfolioId} />
        </TabsContent>
      </Tabs>
    </div>
  )
}
