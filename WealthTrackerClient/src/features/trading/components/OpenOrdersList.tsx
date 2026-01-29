import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
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
}: {
  portfolioId: number | null
  onGoToPortfolio?: () => void
}) {
  const query = useOpenOrders(portfolioId, { refetchInterval: 5000 })
  const cancel = useCancelOrder()
  const { toast } = useToast()

  const orders = query.data ?? []

  return (
    <div className="rounded-md border border-border/60 bg-card/60">
      <div className="border-b border-border/60 px-3 py-2 text-xs font-semibold">
        Open Orders ({orders.length})
      </div>

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
          <TableBody>
            {query.isLoading ? (
              <TableRow>
                <TableCell
                  colSpan={7}
                  className="py-6 text-center text-sm text-muted-foreground"
                >
                  Loading...
                </TableCell>
              </TableRow>
            ) : orders.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={7}
                  className="py-6 text-center text-sm text-muted-foreground"
                >
                  No open orders.
                </TableCell>
              </TableRow>
            ) : (
              orders.map(o => (
                <TableRow key={o.id}>
                  <TableCell className="font-medium">{o.symbol}</TableCell>
                  <TableCell className="text-xs uppercase tracking-wide text-muted-foreground">
                    {o.type}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {o.orderType}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
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
                      variant="outline"
                      size="sm"
                      disabled={portfolioId == null || cancel.isPending}
                      onClick={() => {
                        if (!portfolioId) return
                        cancel.mutate(
                          { orderId: o.id, portfolioId },
                          {
                            onSuccess: () => {
                              toast({
                                title: 'Order cancelled',
                                description: `${o.type.toUpperCase()} ${o.quantity} ${o.symbol} • ${o.orderType}`,
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
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
