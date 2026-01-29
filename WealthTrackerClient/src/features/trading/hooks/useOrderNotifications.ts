import { useEffect, useMemo, useRef } from 'react'

import { useToast } from '@/components/ui/toast'
import { useOpenOrders } from './useOrders'
import { useTransactions } from './useTrades'
import type { SimulationTransaction, TransactionStatus } from '../types/trading'

type TxIndex = Record<number, SimulationTransaction>

function money(value: number) {
  return value.toLocaleString(undefined, {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 2,
  })
}

function toStatusVariant(status: TransactionStatus) {
  if (status === 'executed')
    return { variant: 'success' as const, sound: 'success' as const }
  if (status === 'cancelled')
    return { variant: 'warning' as const, sound: 'warning' as const }
  if (status === 'failed')
    return { variant: 'destructive' as const, sound: 'error' as const }
  return { variant: 'default' as const, sound: 'none' as const }
}

export function useOrderNotifications({
  portfolioId,
  onGoToPortfolio,
}: {
  portfolioId: number | null
  onGoToPortfolio: () => void
}) {
  const { toast } = useToast()

  const txQuery = useTransactions(portfolioId, 1, 25, { refetchInterval: 5000 })
  const ordersQuery = useOpenOrders(portfolioId, { refetchInterval: 5000 })

  const transactions = useMemo(() => txQuery.data ?? [], [txQuery.data])
  const openOrders = useMemo(() => ordersQuery.data ?? [], [ordersQuery.data])

  const prevTransactionsRef = useRef<TxIndex>({})
  const prevOpenOrderIdsRef = useRef<Set<number>>(new Set())

  useEffect(() => {
    if (!portfolioId) return
    if (!txQuery.data) return

    const prev = prevTransactionsRef.current
    const next: TxIndex = {}

    for (const tx of transactions) {
      next[tx.id] = tx
      const prevTx = prev[tx.id]
      if (!prevTx) continue

      if (prevTx.status !== tx.status) {
        const cfg = toStatusVariant(tx.status)
        toast({
          title:
            tx.status === 'executed'
              ? 'Order filled'
              : tx.status === 'cancelled'
                ? 'Order cancelled'
                : tx.status === 'failed'
                  ? 'Order failed'
                  : 'Order updated',
          description: `${tx.type.toUpperCase()} ${tx.quantity} ${tx.symbol} @ ${money(tx.price)} • Fees ${money(tx.fee)}`,
          variant: cfg.variant,
          sound: cfg.sound,
          actionLabel: 'View portfolio',
          onClick: onGoToPortfolio,
        })
      }
    }

    prevTransactionsRef.current = next
  }, [onGoToPortfolio, portfolioId, toast, transactions, txQuery.data])

  useEffect(() => {
    if (!portfolioId) return
    if (!ordersQuery.data) return

    const prevIds = prevOpenOrderIdsRef.current
    const nextIds = new Set(openOrders.map(o => o.id))

    // New open orders (placed)
    for (const o of openOrders) {
      if (prevIds.has(o.id)) continue
      toast({
        title: 'Order placed',
        description: `${o.type.toUpperCase()} ${o.quantity} ${o.symbol} • ${o.orderType}`,
        variant: 'default',
        sound: 'none',
        actionLabel: 'View portfolio',
        onClick: onGoToPortfolio,
      })
    }

    prevOpenOrderIdsRef.current = nextIds
  }, [onGoToPortfolio, openOrders, ordersQuery.data, portfolioId, toast])
}
