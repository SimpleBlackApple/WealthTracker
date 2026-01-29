import { useMemo, useState, useEffect } from 'react'
import { Minus, Plus } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useToast } from '@/components/ui/toast'
import { useExecuteTrade } from '../hooks/useTrades'
import type { OrderType, TransactionType } from '../types/trading'

interface OrderFormProps {
  portfolioId: number | null
  symbol: string
  exchange?: string | null
  currentPrice: number | null
  onGoToPortfolio?: () => void
  onExecuteButton?: (text: string) => void
}

function toMoney(value: number) {
  return value.toLocaleString(undefined, {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 2,
  })
}

export function OrderForm({
  portfolioId,
  symbol,
  exchange,
  currentPrice,
  onGoToPortfolio,
  onExecuteButton,
}: OrderFormProps) {
  const [action, setAction] = useState<TransactionType>('buy')
  const [orderType, setOrderType] = useState<OrderType>('market')
  const [quantity, setQuantity] = useState(100)
  const [limitPrice, setLimitPrice] = useState<number | null>(null)
  const [stopPrice, setStopPrice] = useState<number | null>(null)

  const { toast } = useToast()
  const executeTrade = useExecuteTrade()

  // Auto-set limit price to current price when switching to limit order
  useEffect(() => {
    if (orderType === 'limit' && currentPrice && limitPrice === null) {
      setLimitPrice(currentPrice)
    }
  }, [orderType, currentPrice, limitPrice])

  const feeEstimate = useMemo(() => {
    if (!currentPrice || quantity <= 0) return null

    let commission = 0
    let tafFee = 0
    let secFee = 0
    let locateFee = 0

    // Commission estimate (TradeZero-like): market orders or < 200 shares
    if (orderType === 'market' || orderType === 'stopLoss' || quantity < 200) {
      commission = Math.max(0.99, quantity * 0.005)
      commission = Math.min(commission, 7.95)
    }

    // Regulatory fees (sell/short only)
    if (action === 'sell' || action === 'short') {
      tafFee = quantity * 0.000166
      secFee = quantity * currentPrice * 0.0000278
    }

    // Locate fee for shorts
    if (action === 'short') {
      locateFee = quantity * 0.01
    }

    const totalFees = commission + tafFee + secFee + locateFee

    return {
      commission,
      tafFee,
      secFee,
      locateFee,
      totalFees,
    }
  }, [action, currentPrice, orderType, quantity])

  const totalEstimate = useMemo(() => {
    if (!currentPrice || quantity <= 0) return null
    return quantity * currentPrice + (feeEstimate?.totalFees ?? 0)
  }, [currentPrice, feeEstimate?.totalFees, quantity])

  const canSubmit = portfolioId != null && currentPrice != null && quantity > 0

  const [localError, setLocalError] = useState<string | null>(null)

  const executeButtonText = useMemo(() => {
    const actionText = action.toUpperCase()
    const typeText = orderType === 'market' ? 'MARKET' : orderType === 'limit' ? 'LIMIT' : 'STOP LOSS'
    return `EXECUTE ${actionText} ${typeText}`
  }, [action, orderType])

  // Notify parent of button text
  useEffect(() => {
    onExecuteButton?.(executeButtonText)
  }, [executeButtonText, onExecuteButton])

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setLocalError(null)

    if (!canSubmit) return

    if (orderType === 'limit' && (!limitPrice || !Number.isFinite(limitPrice))) {
      setLocalError('Limit price is required for limit orders.')
      return
    }

    if (orderType === 'stopLoss' && (!stopPrice || !Number.isFinite(stopPrice))) {
      setLocalError('Stop price is required for stop-loss orders.')
      return
    }

    executeTrade.mutate(
      {
        portfolioId: portfolioId as number,
        request: {
          symbol,
          exchange: exchange || undefined,
          type: action,
          quantity,
          price: currentPrice as number,
          orderType,
          limitPrice: limitPrice ?? undefined,
          stopPrice: stopPrice ?? undefined,
        },
      },
      {
        onSuccess: tx => {
          const status = tx.status
          toast({
            title:
              status === 'executed'
                ? 'Order filled'
                : status === 'pending'
                  ? 'Order placed'
                  : status === 'cancelled'
                    ? 'Order cancelled'
                    : status === 'failed'
                      ? 'Order failed'
                      : 'Order updated',
            description: `${tx.type.toUpperCase()} ${tx.quantity} ${tx.symbol} @ ${toMoney(tx.price)} • Fees ${toMoney(tx.fee)}`,
            variant:
              status === 'executed'
                ? 'success'
                : status === 'cancelled'
                  ? 'warning'
                  : status === 'failed'
                    ? 'destructive'
                    : 'default',
            sound:
              status === 'executed'
                ? 'success'
                : status === 'cancelled'
                  ? 'warning'
                  : status === 'failed'
                    ? 'error'
                    : 'none',
            actionLabel: 'View portfolio',
            onClick: () => onGoToPortfolio?.(),
          })
        },
      }
    )
  }

  const errorMessage =
    localError ||
    (executeTrade.error as { response?: { data?: { error?: string } } } | null)
      ?.response?.data?.error ||
    null

  return (
    <form onSubmit={onSubmit} className="flex h-full flex-col">
      <div className="flex-1 space-y-2 overflow-y-auto px-3 pt-2">
        {/* Order Action & Type - Side by side */}
        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-0.5">
            <Label htmlFor="action" className="text-[9px] text-muted-foreground uppercase font-semibold">
              Action
            </Label>
            <Select
              value={action}
              onValueChange={v => setAction(v as TransactionType)}
            >
              <SelectTrigger id="action" className="h-7 text-xs px-2">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="buy">Buy</SelectItem>
                <SelectItem value="sell">Sell</SelectItem>
                <SelectItem value="short">Short</SelectItem>
                <SelectItem value="cover">Cover</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-0.5">
            <Label htmlFor="orderType" className="text-[9px] text-muted-foreground uppercase font-semibold">
              Type
            </Label>
            <Select
              value={orderType}
              onValueChange={v => setOrderType(v as OrderType)}
            >
              <SelectTrigger id="orderType" className="h-7 text-xs px-2">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="market">Market</SelectItem>
                <SelectItem value="limit">Limit</SelectItem>
                <SelectItem value="stopLoss">Stop Loss</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {(action === 'short' || action === 'cover') && (
          <Alert variant="destructive">
            <AlertDescription className="text-[10px]">
              Short selling has unlimited loss potential. Borrow fees apply.
            </AlertDescription>
          </Alert>
        )}

        {/* Quantity & Price - Side by side */}
        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-0.5">
            <Label htmlFor="quantity" className="text-[9px] text-muted-foreground uppercase font-semibold">
              Quantity
            </Label>
            <div className="flex gap-1">
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="h-7 w-7 shrink-0"
                onClick={() => setQuantity(q => Math.max(1, q - 10))}
              >
                <Minus className="h-3 w-3" />
              </Button>
              <Input
                id="quantity"
                type="number"
                min="1"
                value={quantity}
                onChange={e => setQuantity(Math.max(1, Number(e.target.value) || 1))}
                className="h-7 text-center text-[11px] px-1"
              />
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="h-7 w-7 shrink-0"
                onClick={() => setQuantity(q => q + 10)}
              >
                <Plus className="h-3 w-3" />
              </Button>
            </div>
          </div>

          {orderType !== 'market' && (
            <div className="space-y-0.5">
              <Label htmlFor="priceInput" className="text-[9px] text-muted-foreground uppercase font-semibold">
                {orderType === 'limit' ? 'Limit Price' : 'Stop Price'}
              </Label>
              <div className="flex gap-1">
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="h-7 w-7 shrink-0"
                  onClick={() => {
                    if (orderType === 'limit') setLimitPrice(p => Math.max(0.01, (p ?? currentPrice ?? 0) - 0.01))
                    else setStopPrice(p => Math.max(0.01, (p ?? currentPrice ?? 0) - 0.01))
                  }}
                >
                  <Minus className="h-3 w-3" />
                </Button>
                <Input
                  id="priceInput"
                  type="number"
                  step="0.01"
                  value={(orderType === 'limit' ? limitPrice : stopPrice) ?? ''}
                  onChange={e => {
                    const val = e.target.value === '' ? null : Number(e.target.value)
                    if (orderType === 'limit') setLimitPrice(val)
                    else setStopPrice(val)
                  }}
                  className="h-7 text-center text-[11px] px-1"
                  placeholder={currentPrice?.toFixed(2)}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="h-7 w-7 shrink-0"
                  onClick={() => {
                    if (orderType === 'limit') setLimitPrice(p => (p ?? currentPrice ?? 0) + 0.01)
                    else setStopPrice(p => (p ?? currentPrice ?? 0) + 0.01)
                  }}
                >
                  <Plus className="h-3 w-3" />
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Fee & Summary - Combined into one row/area */}
        <div className="grid grid-cols-2 gap-2">
          {feeEstimate && (
            <div className="rounded-md border border-border/40 bg-muted/20 px-2 py-1.5 text-[11px] flex flex-col justify-center">
              <div className="flex justify-between items-center text-muted-foreground">
                <span className="text-[9px] uppercase font-semibold">Fees</span>
                <span className="font-bold text-foreground text-xs">{toMoney(feeEstimate.totalFees)}</span>
              </div>
              <div className="flex justify-between items-center text-[8px] text-muted-foreground/60 leading-tight">
                <span>Comm: {toMoney(feeEstimate.commission)}</span>
                {action === 'short' && <span>Loc: {toMoney(feeEstimate.locateFee)}</span>}
              </div>
            </div>
          )}
          <div className="rounded-md border border-border/40 bg-card/40 px-2 py-1.5 text-[11px] flex flex-col justify-center">
            <div className="flex justify-between items-center text-muted-foreground">
              <span className="text-[9px] uppercase font-semibold">Total</span>
              <span className="font-bold text-foreground text-xs">
                {totalEstimate != null ? toMoney(totalEstimate) : '—'}
              </span>
            </div>
            <div className="text-[8px] text-right text-muted-foreground/60">
              {symbol}
            </div>
          </div>
        </div>

        {errorMessage && (
          <Alert variant="destructive">
            <AlertDescription className="text-[10px]">
              {errorMessage}
            </AlertDescription>
          </Alert>
        )}
      </div>

      {/* Fixed Execute Button at Bottom */}
      <div className="shrink-0 border-t border-border/60 bg-card/60 p-2">
        <Button
          type="submit"
          disabled={!canSubmit || executeTrade.isPending}
          className="h-9 w-full text-xs font-semibold"
        >
          {executeTrade.isPending ? 'Executing...' : executeButtonText}
        </Button>
      </div>
    </form>
  )
}
