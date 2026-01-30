import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

import type { PositionWithPL } from '../types/trading'

function money(value: number | null | undefined) {
  if (value == null || Number.isNaN(value)) return '—'
  return value.toLocaleString(undefined, {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 2,
  })
}

export function PositionsList({
  positions,
  showContainer = true,
  showHeader = true,
}: {
  positions: PositionWithPL[]
  showContainer?: boolean
  showHeader?: boolean
}) {
  const content = (
    <>
      {showHeader && (
        <div className="border-b border-border/70 px-4 py-3 text-sm font-semibold">
          Positions ({positions.length})
        </div>
      )}
      <div className="overflow-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Symbol</TableHead>
              <TableHead className="text-right">Qty</TableHead>
              <TableHead className="text-right">Avg</TableHead>
              <TableHead className="text-right">Last</TableHead>
              <TableHead className="text-right">Unrealized PnL</TableHead>
              <TableHead className="text-right">Realized PnL</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {positions.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={6}
                  className="py-8 text-center text-sm text-muted-foreground"
                >
                  No positions yet.
                </TableCell>
              </TableRow>
            ) : (
              positions.map(p => {
                const unrealized =
                  p.unrealizedPL == null ? null : Number(p.unrealizedPL)
                const realized = Number(p.realizedPL)
                const unrealizedColor =
                  unrealized == null
                    ? 'text-muted-foreground'
                    : unrealized > 0
                      ? 'text-gain'
                      : unrealized < 0
                        ? 'text-loss'
                        : 'text-muted-foreground'

                const realizedColor =
                  realized > 0
                    ? 'text-gain font-semibold'
                    : realized < 0
                      ? 'text-loss font-semibold'
                      : 'text-muted-foreground'

                return (
                  <TableRow
                    key={`${p.positionId}-${p.symbol}`}
                    className={cn(
                      'transition-colors',
                      p.isShort ? 'hover:bg-loss/5' : 'hover:bg-primary/5'
                    )}
                  >
                    <TableCell className="font-semibold">
                      <div className="flex items-center gap-2">
                        <span className="tracking-tight">{p.symbol}</span>
                        <Badge
                          variant={p.isShort ? 'destructive' : 'default'}
                          className="h-5 px-2 text-[10px]"
                        >
                          {p.isShort ? 'Short' : 'Long'}
                        </Badge>
                      </div>
                    </TableCell>
                    <TableCell className="text-right tabular-nums font-medium">
                      {p.quantity}
                    </TableCell>
                    <TableCell className="text-right tabular-nums text-muted-foreground">
                      {money(p.averageCost)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums font-semibold">
                      {money(p.currentPrice)}
                    </TableCell>
                    <TableCell
                      className={cn(
                        'text-right tabular-nums font-semibold',
                        unrealizedColor
                      )}
                    >
                      <div className="flex flex-col items-end">
                        <span>
                          {unrealized == null ? '—' : money(unrealized)}
                        </span>
                        {p.unrealizedPLPercentage != null && (
                          <span className="text-[11px] opacity-80">
                            {p.unrealizedPLPercentage > 0 ? '+' : ''}
                            {(p.unrealizedPLPercentage * 100).toFixed(2)}%
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell
                      className={cn('text-right tabular-nums', realizedColor)}
                    >
                      {money(realized)}
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
