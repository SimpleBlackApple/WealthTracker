import { useState } from 'react'

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
import { StockSymbolBadge } from '@/features/scanners/components/StockSymbolBadge'
import { useToast } from '@/components/ui/toast'
import { useExecuteTrade } from '../hooks/useTrades'

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
  portfolioId = null,
  showContainer = true,
  showHeader = true,
}: {
  positions: PositionWithPL[]
  portfolioId?: number | null
  showContainer?: boolean
  showHeader?: boolean
}) {
  const { toast } = useToast()
  const executeTrade = useExecuteTrade()
  const [closingPositionId, setClosingPositionId] = useState<number | null>(
    null
  )
  const showCloseAction = portfolioId != null

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
            <TableRow className="hover:bg-transparent">
              <TableHead className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground/80">
                Symbol
              </TableHead>
              <TableHead className="text-right text-[11px] font-bold uppercase tracking-wider text-muted-foreground/80">
                Qty
              </TableHead>
              <TableHead className="text-right text-[11px] font-bold uppercase tracking-wider text-muted-foreground/80">
                Avg
              </TableHead>
              <TableHead className="text-right text-[11px] font-bold uppercase tracking-wider text-muted-foreground/80">
                Last
              </TableHead>
              <TableHead className="text-right text-[11px] font-bold uppercase tracking-wider text-muted-foreground/80">
                Unrealized PnL
              </TableHead>
              <TableHead className="text-right text-[11px] font-bold uppercase tracking-wider text-muted-foreground/80">
                Realized PnL
              </TableHead>
              {showCloseAction && (
                <TableHead className="text-right text-[11px] font-bold uppercase tracking-wider text-muted-foreground/80">
                  Action
                </TableHead>
              )}
            </TableRow>
          </TableHeader>
          <TableBody>
            {positions.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={showCloseAction ? 7 : 6}
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
                    className="group border-none hover:bg-muted/30"
                  >
                    <TableCell className="py-2.5 pl-0">
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-1 rounded-r-full bg-primary/60" />
                        <StockSymbolBadge symbol={p.symbol} />
                        <div className="flex flex-col">
                          <span className="text-[13px] font-semibold leading-none">
                            {p.symbol}
                          </span>
                          <span
                            className={cn(
                              'mt-1 w-fit rounded-sm px-1.5 py-0.5 text-[9px] font-black uppercase tracking-tighter text-white',
                              p.isShort ? 'bg-loss' : 'bg-gain'
                            )}
                          >
                            {p.isShort ? 'Short' : 'Long'}
                          </span>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="py-2.5 border-l border-border/50 text-right tabular-nums text-[12px] font-medium">
                      {p.quantity}
                    </TableCell>
                    <TableCell className="py-2.5 border-l border-border/50 text-right tabular-nums text-[12px] text-muted-foreground">
                      {money(p.averageCost)}
                    </TableCell>
                    <TableCell className="py-2.5 border-l border-border/50 text-right tabular-nums text-[12px] font-semibold">
                      {money(p.currentPrice)}
                    </TableCell>
                    <TableCell
                      className={cn(
                        'py-2.5 border-l border-border/50 text-right tabular-nums text-[12px] font-semibold',
                        unrealizedColor
                      )}
                    >
                      <div className="flex flex-col items-end leading-none">
                        <span>
                          {unrealized == null ? '—' : money(unrealized)}
                        </span>
                        {p.unrealizedPLPercentage != null && (
                          <span className="mt-1 text-[10px] opacity-80">
                            {p.unrealizedPLPercentage > 0 ? '+' : ''}
                            {(p.unrealizedPLPercentage * 100).toFixed(2)}%
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell
                      className={cn(
                        'py-2.5 border-l border-border/50 text-right tabular-nums text-[12px]',
                        realizedColor
                      )}
                    >
                      {money(realized)}
                    </TableCell>
                    {showCloseAction && (
                      <TableCell className="border-l border-border/50 py-2.5 text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 px-3 text-xs"
                          disabled={
                            portfolioId == null ||
                            p.currentPrice == null ||
                            !Number.isFinite(Number(p.currentPrice)) ||
                            executeTrade.isPending
                          }
                          onClick={() => {
                            if (portfolioId == null) return
                            if (
                              p.currentPrice == null ||
                              !Number.isFinite(Number(p.currentPrice))
                            ) {
                              toast({
                                title: 'Cannot close position',
                                description:
                                  'Current price is unavailable for this symbol.',
                                variant: 'warning',
                                sound: 'warning',
                              })
                              return
                            }

                            const closeType = p.isShort ? 'cover' : 'sell'
                            setClosingPositionId(p.positionId)

                            executeTrade.mutate(
                              {
                                portfolioId,
                                request: {
                                  symbol: p.symbol,
                                  exchange: p.exchange,
                                  type: closeType,
                                  quantity: p.quantity,
                                  price: Number(p.currentPrice),
                                  orderType: 'market',
                                },
                              },
                              {
                                onSuccess: tx => {
                                  toast({
                                    title:
                                      tx.status === 'executed'
                                        ? 'Position closed'
                                        : 'Close order placed',
                                    description: `${tx.type.toUpperCase()} ${tx.quantity} ${tx.symbol} @ ${money(tx.price)}`,
                                    variant:
                                      tx.status === 'executed'
                                        ? 'success'
                                        : 'default',
                                    sound:
                                      tx.status === 'executed'
                                        ? 'success'
                                        : 'none',
                                  })
                                },
                                onError: error => {
                                  const message =
                                    (
                                      error as {
                                        response?: {
                                          data?: { error?: string }
                                        }
                                      }
                                    )?.response?.data?.error ??
                                    'Failed to close the position.'

                                  toast({
                                    title: 'Close failed',
                                    description: message,
                                    variant: 'destructive',
                                    sound: 'error',
                                  })
                                },
                                onSettled: () => {
                                  setClosingPositionId(null)
                                },
                              }
                            )
                          }}
                        >
                          {executeTrade.isPending &&
                          closingPositionId === p.positionId
                            ? 'Closing...'
                            : 'Close'}
                        </Button>
                      </TableCell>
                    )}
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
