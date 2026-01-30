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
            <TableRow>
              <TableHead>Symbol</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Order</TableHead>
              <TableHead className="text-right">Qty</TableHead>
              <TableHead className="text-right">Limit</TableHead>
              <TableHead className="text-right">Stop</TableHead>
              <TableHead className="text-right">Action</TableHead>
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
                    className={cn(
                      'transition-colors',
                      isBuy && 'bg-gain/5 hover:bg-gain/10',
                      isSell && 'bg-loss/5 hover:bg-loss/10'
                    )}
                  >
                    <TableCell className="font-semibold">{o.symbol}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {o.type}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {o.orderType}
                    </TableCell>
                    <TableCell className="text-right tabular-nums font-medium">
                      {o.quantity}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {money(o.limitPrice)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {money(o.stopPrice)}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 px-3 text-xs"
                        disabled={portfolioId == null || cancel.isPending}
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
                        Cancel
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
