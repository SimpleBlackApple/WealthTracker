import { useEffect, useMemo, useState } from 'react'
import { Volume2, VolumeX } from 'lucide-react'

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { useToast } from '@/components/ui/toast'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
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
  const [activeTab, setActiveTab] = useState('trade')
  const { soundEnabled, setSoundEnabled } = useToast()
  const portfoliosQuery = usePortfolios()
  const portfolios = portfoliosQuery.data ?? []

  const [activePortfolioId, setActivePortfolioId] = useState<number | null>(
    null
  )
  const resolvedPortfolioId =
    activePortfolioId ?? (portfolios.length > 0 ? portfolios[0].id : null)

  const activePortfolio = useMemo(
    () => portfolios.find(p => p.id === resolvedPortfolioId) ?? null,
    [portfolios, resolvedPortfolioId]
  )

  const summaryQuery = usePortfolioSummary(resolvedPortfolioId)
  const goToPortfolio = () => setActiveTab('portfolio')

  useOrderNotifications({
    portfolioId: resolvedPortfolioId,
    onGoToPortfolio: goToPortfolio,
  })

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
        <div className="flex w-full items-center gap-2 sm:w-auto">
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="h-9 w-9"
            title={soundEnabled ? 'Sound on' : 'Sound off'}
            onClick={() => setSoundEnabled(!soundEnabled)}
          >
            {soundEnabled ? (
              <Volume2 className="h-4 w-4" />
            ) : (
              <VolumeX className="h-4 w-4" />
            )}
          </Button>
          <div className="w-full sm:w-64">
            <Select
              value={
                resolvedPortfolioId != null ? String(resolvedPortfolioId) : ''
              }
              onValueChange={v => setActivePortfolioId(Number(v))}
              disabled={portfoliosQuery.isLoading || portfolios.length === 0}
            >
              <SelectTrigger className="h-9">
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
                  <SelectItem key={p.id} value={String(p.id)}>
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
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
            portfolioId={resolvedPortfolioId}
            symbol={symbol}
            exchange={exchange}
            currentPrice={currentPrice}
            onGoToPortfolio={goToPortfolio}
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
          <OpenOrdersList
            portfolioId={resolvedPortfolioId}
            onGoToPortfolio={goToPortfolio}
          />
        </TabsContent>

        <TabsContent value="history" className="mt-3 space-y-3">
          <TransactionHistory portfolioId={resolvedPortfolioId} />
        </TabsContent>
      </Tabs>
    </div>
  )
}
