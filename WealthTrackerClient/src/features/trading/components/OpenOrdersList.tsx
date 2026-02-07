import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { cn } from '@/lib/utils'
import { useToast } from '@/components/ui/toast'
import { useCancelOrder, useOpenOrders } from '../hooks/useOrders'
import { StockSymbolBadge } from '@/features/scanners/components/StockSymbolBadge'

function money(value: number | null | undefined) {
  if (value == null || Number.isNaN(value)) return '—'
  return value.toLocaleString(undefined, {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 2,
  })
}

export function OpenOrdersList({
  portfolioId,
  onGoToPortfolio,
  showContainer = true,
  showHeader = true,
}: {
  portfolioId: number | null
  onGoToPortfolio?: () => void
  showContainer?: boolean
  showHeader?: boolean
}) {
  const query = useOpenOrders(portfolioId, { refetchInterval: 5000 })
  const cancel = useCancelOrder()
  const { toast } = useToast()

  const orders = query.data ?? []

  const content = (
    <>
      {showHeader && (
        <div className="border-b border-border/70 px-4 py-3 text-sm font-semibold">
          Open orders ({orders.length})
        </div>
      )}

      <div className="overflow-auto">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground/80">
                Symbol
              </TableHead>
              <TableHead className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground/80">
                Type
              </TableHead>
              <TableHead className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground/80">
                Order
              </TableHead>
              <TableHead className="text-right text-[11px] font-bold uppercase tracking-wider text-muted-foreground/80">
                Qty
              </TableHead>
              <TableHead className="text-right text-[11px] font-bold uppercase tracking-wider text-muted-foreground/80">
                Limit
              </TableHead>
              <TableHead className="text-right text-[11px] font-bold uppercase tracking-wider text-muted-foreground/80">
                Stop
              </TableHead>
              <TableHead className="text-right text-[11px] font-bold uppercase tracking-wider text-muted-foreground/80">
                Action
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody striped={false}>
            {query.isLoading ? (
              <TableRow>
                <TableCell
                  colSpan={7}
                  className="py-8 text-center text-sm text-muted-foreground"
                >
                  Loading…
                </TableCell>
              </TableRow>
            ) : orders.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={7}
                  className="py-8 text-center text-sm text-muted-foreground"
                >
                  No open orders.
                </TableCell>
              </TableRow>
            ) : (
              orders.map(o => {
                const type = String(o.type ?? '')
                  .trim()
                  .toLowerCase()
                const isBuy = type === 'buy' || type === 'cover'
                const isSell = type === 'sell' || type === 'short'

                return (
                  <TableRow
                    key={o.id}
                    className="group border-none hover:bg-muted/30"
                  >
                    <TableCell className="py-2.5 pl-0">
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-1 rounded-r-full bg-primary/60" />
                        <StockSymbolBadge symbol={o.symbol} />
                        <span className="text-[12px] font-semibold">
                          {o.symbol}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="py-2.5 border-l border-border/50">
                      <span
                        className={cn(
                          'inline-flex min-w-[50px] justify-center rounded-sm px-1.5 py-0.5 text-[9px] font-black uppercase tracking-tight text-white',
                          isBuy
                            ? 'bg-gain'
                            : isSell
                              ? 'bg-loss'
                              : 'bg-muted-foreground/60'
                        )}
                      >
                        {o.type}
                      </span>
                    </TableCell>
                    <TableCell className="py-2.5 border-l border-border/50 text-[11px] font-medium uppercase tracking-tight text-muted-foreground">
                      {o.orderType}
                    </TableCell>
                    <TableCell className="py-2.5 border-l border-border/50 text-right tabular-nums text-[12px] font-medium">
                      {o.quantity}
                    </TableCell>
                    <TableCell className="py-2.5 border-l border-border/50 text-right tabular-nums text-[12px] text-muted-foreground">
                      {money(o.limitPrice)}
                    </TableCell>
                    <TableCell className="py-2.5 border-l border-border/50 text-right tabular-nums text-[12px] text-muted-foreground">
                      {money(o.stopPrice)}
                    </TableCell>
                    <TableCell className="text-right border-l border-border/50">
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-8 px-3 text-xs font-semibold border-loss/40 text-loss hover:border-loss/60 hover:bg-loss/10 hover:text-loss focus-visible:ring-loss/20"
                        disabled={portfolioId == null || cancel.isPending}
                        title="Cancel this order"
                        aria-label={`Cancel ${o.symbol} order`}
                        onClick={() => {
                          if (!portfolioId) return
                          cancel.mutate(
                            { orderId: o.id, portfolioId },
                            {
                              onSuccess: () => {
                                toast({
                                  title: 'Order cancelled',
                                  description: `${o.type.toUpperCase()} ${o.quantity} ${o.symbol} — ${o.orderType}`,
                                  variant: 'warning',
                                  sound: 'warning',
                                  actionLabel: 'View portfolio',
                                  onClick: () => onGoToPortfolio?.(),
                                })
                              },
                            }
                          )
                        }}
                      >
                        Cancel Order
                      </Button>
                    </TableCell>
                  </TableRow>
                )
              })
            )}
          </TableBody>
        </Table>
      </div>
    </>
  )

  if (!showContainer) return content

  return (
    <div className="overflow-hidden rounded-xl border border-border/70 bg-card">
      {content}
    </div>
  )
}
