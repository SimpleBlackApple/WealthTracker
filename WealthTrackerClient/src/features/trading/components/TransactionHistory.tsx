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
import { StockSymbolBadge } from '@/features/scanners/components/StockSymbolBadge'

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
            <TableRow className="hover:bg-transparent">
              <TableHead className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground/80">
                Date
              </TableHead>
              <TableHead className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground/80">
                Type
              </TableHead>
              <TableHead className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground/80">
                Symbol
              </TableHead>
              <TableHead className="text-right text-[11px] font-bold uppercase tracking-wider text-muted-foreground/80">
                Qty
              </TableHead>
              <TableHead className="text-right text-[11px] font-bold uppercase tracking-wider text-muted-foreground/80">
                Price
              </TableHead>
              <TableHead className="text-right text-[11px] font-bold uppercase tracking-wider text-muted-foreground/80">
                Fees
              </TableHead>
              <TableHead className="text-right text-[11px] font-bold uppercase tracking-wider text-muted-foreground/80">
                Amount
              </TableHead>
              <TableHead className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground/80">
                Status
              </TableHead>
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
                    className="group border-none hover:bg-muted/30"
                  >
                    <TableCell className="py-2 text-[11px] tabular-nums text-muted-foreground">
                      {new Date(t.createdAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="py-2">
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
                        {t.type}
                      </span>
                    </TableCell>
                    <TableCell className="py-2">
                      <div className="flex items-center gap-2">
                        <StockSymbolBadge
                          symbol={t.symbol}
                          className="h-4 w-4 text-[9px]"
                        />
                        <span className="text-[12px] font-semibold">
                          {t.symbol}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="py-2 text-right tabular-nums text-[12px] font-medium">
                      {t.quantity}
                    </TableCell>
                    <TableCell className="py-2 text-right tabular-nums text-[12px] text-muted-foreground">
                      {money(t.price)}
                    </TableCell>
                    <TableCell className="py-2 text-right tabular-nums text-[12px] text-muted-foreground">
                      {money(t.fee)}
                    </TableCell>
                    <TableCell className="py-2 text-right tabular-nums text-[12px] font-semibold text-foreground">
                      {money(t.totalAmount)}
                    </TableCell>
                    <TableCell className="py-2">
                      <div className="flex items-center gap-1.5">
                        <span
                          className={cn(
                            'h-1.5 w-1.5 rounded-full',
                            t.status === 'executed'
                              ? 'bg-gain'
                              : 'bg-muted-foreground/40'
                          )}
                        />
                        <span className="text-[10px] font-medium uppercase tracking-tight text-muted-foreground">
                          {t.status}
                        </span>
                      </div>
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
