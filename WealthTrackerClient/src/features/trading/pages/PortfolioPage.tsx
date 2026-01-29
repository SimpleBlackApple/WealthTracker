import { useMemo } from 'react'
import { useTradingContext } from '../contexts/TradingContext'
import { usePortfolios } from '../hooks/usePortfolios'
import { usePortfolioSummary } from '../hooks/usePortfolio'
import { PortfolioSummary } from '../components/PortfolioSummary'
import { PositionsList } from '../components/PositionsList'
import { TransactionHistory } from '../components/TransactionHistory'
import { OpenOrdersList } from '../components/OpenOrdersList'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { LayoutGrid, ListFilter, History, Clock } from 'lucide-react'

export function PortfolioPage() {
    const { activePortfolioId } = useTradingContext()
    const portfoliosQuery = usePortfolios()
    const portfolios = portfoliosQuery.data ?? []

    const resolvedPortfolioId =
        activePortfolioId ?? (portfolios.length > 0 ? portfolios[0].id : null)

    const activePortfolio = useMemo(
        () => portfolios.find(p => p.id === resolvedPortfolioId) ?? null,
        [portfolios, resolvedPortfolioId]
    )

    const summaryQuery = usePortfolioSummary(resolvedPortfolioId)

    return (
        <div className="flex flex-col gap-6 animate-in fade-in duration-700">
            {/* Page Header */}
            <div className="flex flex-col gap-1">
                <h1 className="font-display text-3xl font-bold tracking-tight">Portfolio Overview</h1>
                <p className="text-sm text-muted-foreground">
                    Real-time position tracking and order lifecycle management.
                </p>
            </div>

            {/* Performance Stats / Summary */}
            <PortfolioSummary
                portfolio={activePortfolio}
                summary={summaryQuery.data ?? null}
                isLoading={summaryQuery.isLoading}
                error={summaryQuery.error as Error | null}
            />

            <div className="grid gap-6 lg:grid-cols-3">
                {/* Positions - Takes 2/3 of space */}
                <Card className="lg:col-span-2 border-border/60 bg-card/80 shadow-sm border-t-2 border-t-primary/40">
                    <CardHeader className="pb-3 border-b border-border/40 flex flex-row items-center justify-between space-y-0">
                        <div className="flex items-center gap-2">
                            <LayoutGrid className="h-4 w-4 text-primary" />
                            <CardTitle className="text-xs font-bold tracking-widest uppercase text-muted-foreground">Active Positions</CardTitle>
                        </div>
                        <span className="text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded-full font-bold">
                            {summaryQuery.data?.positions.length || 0} TOTAL
                        </span>
                    </CardHeader>
                    <CardContent className="p-0">
                        <PositionsList positions={summaryQuery.data?.positions ?? []} />
                    </CardContent>
                </Card>

                {/* Open Orders - Takes 1/3 of space */}
                <Card className="border-border/60 bg-card/80 shadow-sm border-t-2 border-t-amber-500/40">
                    <CardHeader className="pb-3 border-b border-border/40 flex flex-row items-center justify-between space-y-0">
                        <div className="flex items-center gap-2">
                            <Clock className="h-4 w-4 text-amber-500" />
                            <CardTitle className="text-xs font-bold tracking-widest uppercase text-muted-foreground">Open Orders</CardTitle>
                        </div>
                    </CardHeader>
                    <CardContent className="p-0">
                        <OpenOrdersList
                            portfolioId={resolvedPortfolioId}
                            onGoToPortfolio={() => { }}
                        />
                    </CardContent>
                </Card>

                {/* Transaction History - Full Width below the first row */}
                <Card className="lg:col-span-3 border-border/60 bg-card/80 shadow-sm border-t-2 border-t-muted-foreground/40">
                    <CardHeader className="pb-3 border-b border-border/40 flex flex-row items-center justify-between space-y-0">
                        <div className="flex items-center gap-2">
                            <History className="h-4 w-4 text-muted-foreground" />
                            <CardTitle className="text-xs font-bold tracking-widest uppercase text-muted-foreground">Transaction History</CardTitle>
                        </div>
                    </CardHeader>
                    <CardContent className="p-0">
                        <TransactionHistory portfolioId={resolvedPortfolioId} />
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}
