import { useMemo, useState } from 'react'

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
import { useTransactions } from '../hooks/useTrades'

function money(value: number) {
  return value.toLocaleString(undefined, {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 2,
  })
}

export function TransactionHistory({
  portfolioId,
  showContainer = true,
  showHeader = true,
}: {
  portfolioId: number | null
  showContainer?: boolean
  showHeader?: boolean
}) {
  const [page, setPage] = useState(1)
  const pageSize = 25

  const query = useTransactions(portfolioId, page, pageSize)
  const rows = useMemo(() => query.data ?? [], [query.data])

  const content = (
    <>
      {showHeader && (
        <div className="flex items-center justify-between border-b border-border/70 px-4 py-3">
          <div className="text-sm font-semibold">Transaction history</div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="h-8"
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1 || query.isLoading}
            >
              Prev
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-8"
              onClick={() => setPage(p => p + 1)}
              disabled={rows.length < pageSize || query.isLoading}
            >
              Next
            </Button>
          </div>
        </div>
      )}

      <div className="overflow-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Symbol</TableHead>
              <TableHead className="text-right">Qty</TableHead>
              <TableHead className="text-right">Price</TableHead>
              <TableHead className="text-right">Fees</TableHead>
              <TableHead className="text-right">Amount</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody striped={false}>
            {query.isLoading ? (
              <TableRow>
                <TableCell
                  colSpan={8}
                  className="py-8 text-center text-sm text-muted-foreground"
                >
                  Loading…
                </TableCell>
              </TableRow>
            ) : rows.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={8}
                  className="py-8 text-center text-sm text-muted-foreground"
                >
                  No transactions yet.
                </TableCell>
              </TableRow>
            ) : (
              rows.map(t => {
                const type = String(t.type ?? '')
                  .trim()
                  .toLowerCase()
                const isBuy = type === 'buy' || type === 'cover'
                const isSell = type === 'sell' || type === 'short'

                return (
                  <TableRow
                    key={t.id}
                    className={cn(
                      'transition-colors',
                      isBuy && 'bg-gain/5 hover:bg-gain/10',
                      isSell && 'bg-loss/5 hover:bg-loss/10'
                    )}
                  >
                    <TableCell className="whitespace-nowrap text-xs tabular-nums text-muted-foreground">
                      {new Date(t.createdAt).toLocaleString()}
                    </TableCell>
                    <TableCell>
                      <span
                        className={cn(
                          'inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-semibold',
                          isBuy && 'border-gain/25 bg-gain/10 text-gain',
                          isSell && 'border-loss/25 bg-loss/10 text-loss',
                          !isBuy &&
                            !isSell &&
                            'border-border/70 bg-secondary/60'
                        )}
                      >
                        {t.type}
                      </span>
                    </TableCell>
                    <TableCell className="whitespace-nowrap font-semibold">
                      {t.symbol}
                    </TableCell>
                    <TableCell className="text-right tabular-nums font-medium">
                      {t.quantity}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {money(t.price)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums text-muted-foreground">
                      {money(t.fee)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums font-semibold">
                      {money(t.totalAmount)}
                    </TableCell>
                    <TableCell>
                      <span
                        className={cn(
                          'mr-2 inline-flex h-2 w-2 rounded-full',
                          t.status === 'executed'
                            ? 'bg-gain'
                            : 'bg-muted-foreground/40'
                        )}
                      />
                      <span className="text-xs text-muted-foreground">
                        {t.status}
                      </span>
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
