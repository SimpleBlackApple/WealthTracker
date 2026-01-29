import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

import type { PositionWithPL } from '../types/trading'

function money(value: number | null | undefined) {
  if (value == null || Number.isNaN(value)) return '—'
  return value.toLocaleString(undefined, {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 2,
  })
}

export function PositionsList({ positions }: { positions: PositionWithPL[] }) {
  return (
    <div className="rounded-md border border-border/60 bg-card/60">
      <div className="border-b border-border/60 px-3 py-2 text-xs font-semibold">
        Positions ({positions.length})
      </div>
      <div className="overflow-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Symbol</TableHead>
              <TableHead className="text-right">Qty</TableHead>
              <TableHead className="text-right">Avg</TableHead>
              <TableHead className="text-right">Last</TableHead>
              <TableHead className="text-right">Unrlzd</TableHead>
              <TableHead className="text-right">Rlzd</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {positions.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={6}
                  className="py-6 text-center text-sm text-muted-foreground"
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
                      ? 'text-emerald-600'
                      : unrealized < 0
                        ? 'text-red-600'
                        : 'text-muted-foreground'

                const realizedColor =
                  realized > 0
                    ? 'text-emerald-600'
                    : realized < 0
                      ? 'text-red-600'
                      : 'text-muted-foreground'

                return (
                  <TableRow key={`${p.positionId}-${p.symbol}`}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        <span>{p.symbol}</span>
                        {p.isShort && (
                          <span className="rounded bg-orange-500/10 px-1.5 py-0.5 text-[10px] font-semibold text-orange-700 dark:text-orange-200">
                            SHORT
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {p.quantity}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {money(p.averageCost)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {money(p.currentPrice)}
                    </TableCell>
                    <TableCell
                      className={`text-right tabular-nums ${unrealizedColor}`}
                    >
                      {unrealized == null ? '—' : money(unrealized)}
                    </TableCell>
                    <TableCell
                      className={`text-right tabular-nums ${realizedColor}`}
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
    </div>
  )
}
