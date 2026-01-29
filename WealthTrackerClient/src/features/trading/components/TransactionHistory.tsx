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
}: {
  portfolioId: number | null
}) {
  const [page, setPage] = useState(1)
  const pageSize = 25

  const query = useTransactions(portfolioId, page, pageSize)
  const rows = useMemo(() => query.data ?? [], [query.data])

  return (
    <div className="rounded-md border border-border/60 bg-card/60">
      <div className="flex items-center justify-between border-b border-border/60 px-3 py-2">
        <div className="text-xs font-semibold">Transaction History</div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1 || query.isLoading}
          >
            Prev
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage(p => p + 1)}
            disabled={rows.length < pageSize || query.isLoading}
          >
            Next
          </Button>
        </div>
      </div>

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
                  className="py-6 text-center text-sm text-muted-foreground"
                >
                  Loading...
                </TableCell>
              </TableRow>
            ) : rows.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={8}
                  className="py-6 text-center text-sm text-muted-foreground"
                >
                  No transactions yet.
                </TableCell>
              </TableRow>
            ) : (
              rows.map(t => {
                const type = String(t.type ?? '').trim().toLowerCase()
                const isBuy = type === 'buy' || type === 'cover'
                const isSell = type === 'sell' || type === 'short'

                return (
                  <TableRow
                    key={t.id}
                    className={cn(
                      'transition-colors',
                      isBuy && 'bg-gain/20 hover:bg-gain/30',
                      isSell && 'bg-loss/10 hover:bg-loss/20'
                    )}
                  >
                    <TableCell className="whitespace-nowrap text-[10px] tabular-nums text-muted-foreground">
                      {new Date(t.createdAt).toLocaleString()}
                    </TableCell>
                    <TableCell>
                      <span className={cn(
                        "px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider",
                        isBuy ? "bg-gain/20 text-gain" : "bg-loss/20 text-loss"
                      )}>
                        {t.type}
                      </span>
                    </TableCell>
                    <TableCell className="whitespace-nowrap font-bold">
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
                    <TableCell className="text-right tabular-nums font-bold">
                      {money(t.totalAmount)}
                    </TableCell>
                    <TableCell>
                      <span className={cn(
                        "inline-flex h-2 w-2 rounded-full mr-2",
                        t.status === 'executed' ? "bg-gain" : "bg-muted-foreground/30"
                      )} />
                      <span className="text-[10px] uppercase font-bold tracking-tight text-muted-foreground">
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
    </div>
  )
}
