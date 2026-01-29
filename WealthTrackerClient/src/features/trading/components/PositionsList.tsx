import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
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
              <TableHead className="text-right">Unrealized PnL</TableHead>
              <TableHead className="text-right">Realized PnL</TableHead>
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
                      ? 'text-gain'
                      : unrealized < 0
                        ? 'text-loss'
                        : 'text-muted-foreground'

                const realizedColor =
                  realized > 0
                    ? 'text-gain font-bold'
                    : realized < 0
                      ? 'text-loss font-bold'
                      : 'text-muted-foreground'

                return (
                  <TableRow
                    key={`${p.positionId}-${p.symbol}`}
                    className={cn(
                      "transition-colors",
                      p.isShort ? "hover:bg-orange-500/[0.03]" : "hover:bg-primary/[0.03]"
                    )}
                  >
                    <TableCell className="font-bold">
                      <div className="flex items-center gap-2">
                        <span className="text-sm tracking-tight">{p.symbol}</span>
                        {p.isShort && (
                          <span className="rounded bg-orange-500/10 px-1.5 py-0.5 text-[9px] font-black uppercase tracking-tighter text-orange-600 border border-orange-500/20">
                            SHORT
                          </span>
                        )}
                        {!p.isShort && (
                          <span className="rounded bg-primary/10 px-1.5 py-0.5 text-[9px] font-black uppercase tracking-tighter text-primary border border-primary/20">
                            LONG
                          </span>
                        )}
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
                      className={cn("text-right tabular-nums font-bold", unrealizedColor)}
                    >
                      <div className="flex flex-col items-end">
                        <span>{unrealized == null ? '—' : money(unrealized)}</span>
                        {p.unrealizedPLPercentage != null && (
                          <span className="text-[10px] opacity-80">
                            {p.unrealizedPLPercentage > 0 ? '+' : ''}{(p.unrealizedPLPercentage * 100).toFixed(2)}%
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell
                      className={cn("text-right tabular-nums", realizedColor)}
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
