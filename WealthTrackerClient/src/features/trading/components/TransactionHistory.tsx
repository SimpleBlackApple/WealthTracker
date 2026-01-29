import { useMemo, useState } from 'react'

import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { useTransactions } from '../hooks/useTrades'

function money(value: number) {
  return value.toLocaleString(undefined, {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 2,
  })
}

export function TransactionHistory({ portfolioId }: { portfolioId: number | null }) {
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
          <TableBody>
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
              rows.map(t => (
                <TableRow key={t.id}>
                  <TableCell className="whitespace-nowrap text-xs text-muted-foreground">
                    {new Date(t.createdAt).toLocaleString()}
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-xs font-medium uppercase tracking-wide">
                    {t.type}
                  </TableCell>
                  <TableCell className="whitespace-nowrap font-medium">
                    {t.symbol}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {t.quantity}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {money(t.price)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {money(t.fee)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {money(t.totalAmount)}
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-xs text-muted-foreground">
                    {t.status}
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

