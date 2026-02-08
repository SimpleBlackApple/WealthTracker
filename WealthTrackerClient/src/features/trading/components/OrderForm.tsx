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

function roundToCents(value: number) {
  return Math.round(value * 100) / 100
}

function getMarketableDefaultLimitPrice(
  price: number,
  action: TransactionType
) {
  const cents = 100
  const adjusted =
    action === 'buy' || action === 'cover'
      ? Math.ceil(price * cents) / cents
      : Math.floor(price * cents) / cents
  return Math.max(0.01, roundToCents(adjusted))
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
  const [hasManualLimitPrice, setHasManualLimitPrice] = useState(false)

  const { toast } = useToast()
  const executeTrade = useExecuteTrade()

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
    const typeText =
      orderType === 'market'
        ? 'MARKET'
        : orderType === 'limit'
          ? 'LIMIT'
          : 'STOP LOSS'
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

    const effectiveLimitPrice =
      orderType === 'limit'
        ? hasManualLimitPrice
          ? limitPrice == null
            ? null
            : roundToCents(limitPrice)
          : currentPrice == null || !Number.isFinite(currentPrice)
            ? null
            : getMarketableDefaultLimitPrice(currentPrice, action)
        : undefined

    if (
      orderType === 'limit' &&
      (effectiveLimitPrice == null || !Number.isFinite(effectiveLimitPrice))
    ) {
      setLocalError('Limit price is required for limit orders.')
      return
    }

    if (
      orderType === 'stopLoss' &&
      (!stopPrice || !Number.isFinite(stopPrice))
    ) {
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
          limitPrice: effectiveLimitPrice ?? undefined,
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
                ? tx.type === 'sell' || tx.type === 'short'
                  ? 'destructive'
                  : 'success'
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
      <div className="wt-scrollbar flex-1 space-y-3 overflow-y-auto px-4 py-3">
        {/* Order Action & Type - Side by side */}
        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-0.5">
            <Label
              htmlFor="action"
              className="text-xs font-semibold text-muted-foreground"
            >
              Action
            </Label>
            <Select
              value={action}
              onValueChange={v => {
                const nextAction = v as TransactionType
                setAction(nextAction)
                if (
                  orderType === 'limit' &&
                  !hasManualLimitPrice &&
                  currentPrice != null &&
                  Number.isFinite(currentPrice)
                ) {
                  setLimitPrice(
                    getMarketableDefaultLimitPrice(currentPrice, nextAction)
                  )
                }
              }}
            >
              <SelectTrigger id="action" className="h-8 px-2 text-sm">
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
            <Label
              htmlFor="orderType"
              className="text-xs font-semibold text-muted-foreground"
            >
              Type
            </Label>
            <Select
              value={orderType}
              onValueChange={value => {
                const next = value as OrderType
                setOrderType(next)
                if (
                  next === 'limit' &&
                  currentPrice != null &&
                  Number.isFinite(currentPrice)
                ) {
                  setLimitPrice(
                    getMarketableDefaultLimitPrice(currentPrice, action)
                  )
                  setHasManualLimitPrice(false)
                }
              }}
            >
              <SelectTrigger id="orderType" className="h-8 px-2 text-sm">
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
            <AlertDescription className="text-xs">
              Short selling has unlimited loss potential. Borrow fees apply.
            </AlertDescription>
          </Alert>
        )}

        {/* Quantity & Price - Side by side */}
        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-0.5">
            <Label
              htmlFor="quantity"
              className="text-xs font-semibold text-muted-foreground"
            >
              Quantity
            </Label>
            <div className="flex gap-1">
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="h-8 w-8 shrink-0"
                onClick={() => setQuantity(q => Math.max(1, q - 10))}
              >
                <Minus className="h-3 w-3" />
              </Button>
              <Input
                id="quantity"
                type="number"
                min="1"
                value={quantity}
                onChange={e =>
                  setQuantity(Math.max(1, Number(e.target.value) || 1))
                }
                className="h-8 px-1 text-center text-sm"
              />
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="h-8 w-8 shrink-0"
                onClick={() => setQuantity(q => q + 10)}
              >
                <Plus className="h-3 w-3" />
              </Button>
            </div>
          </div>

          {orderType !== 'market' && (
            <div className="space-y-0.5">
              <Label
                htmlFor="priceInput"
                className="text-xs font-semibold text-muted-foreground"
              >
                {orderType === 'limit' ? 'Limit Price' : 'Stop Price'}
              </Label>
              <div className="flex gap-1">
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="h-8 w-8 shrink-0"
                  onClick={() => {
                    if (orderType === 'limit') {
                      setHasManualLimitPrice(true)
                      setLimitPrice(p =>
                        roundToCents(
                          Math.max(0.01, (p ?? currentPrice ?? 0) - 0.01)
                        )
                      )
                    } else {
                      setStopPrice(p =>
                        roundToCents(
                          Math.max(0.01, (p ?? currentPrice ?? 0) - 0.01)
                        )
                      )
                    }
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
                    const val =
                      e.target.value === '' ? null : Number(e.target.value)
                    if (orderType === 'limit') {
                      setHasManualLimitPrice(true)
                      setLimitPrice(val)
                    } else {
                      setStopPrice(val)
                    }
                  }}
                  className="h-8 px-1 text-center text-sm"
                  placeholder={currentPrice?.toFixed(2)}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="h-8 w-8 shrink-0"
                  onClick={() => {
                    if (orderType === 'limit') {
                      setHasManualLimitPrice(true)
                      setLimitPrice(p =>
                        roundToCents((p ?? currentPrice ?? 0) + 0.01)
                      )
                    } else {
                      setStopPrice(p =>
                        roundToCents((p ?? currentPrice ?? 0) + 0.01)
                      )
                    }
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
            <div className="flex flex-col justify-center rounded-lg border border-border/70 bg-secondary/40 px-3 py-2">
              <div className="flex items-center justify-between text-muted-foreground">
                <span className="text-xs font-semibold">Fees</span>
                <span className="text-sm font-semibold text-foreground tabular-nums">
                  {toMoney(feeEstimate.totalFees)}
                </span>
              </div>
              <div className="mt-1 flex justify-between text-[11px] text-muted-foreground">
                <span>Comm: {toMoney(feeEstimate.commission)}</span>
                {action === 'short' && (
                  <span>Loc: {toMoney(feeEstimate.locateFee)}</span>
                )}
              </div>
            </div>
          )}
          <div className="flex flex-col justify-center rounded-lg border border-border/70 bg-card px-3 py-2">
            <div className="flex items-center justify-between text-muted-foreground">
              <span className="text-xs font-semibold">Total</span>
              <span className="text-sm font-semibold text-foreground tabular-nums">
                {totalEstimate != null ? toMoney(totalEstimate) : '—'}
              </span>
            </div>
            <div className="mt-1 text-[11px] text-right text-muted-foreground">
              {symbol}
            </div>
          </div>
        </div>

        {errorMessage && (
          <Alert variant="destructive">
            <AlertDescription className="text-xs">
              {errorMessage}
            </AlertDescription>
          </Alert>
        )}
      </div>

      {/* Fixed Execute Button at Bottom */}
      <div className="shrink-0 border-t border-border/70 bg-card p-3">
        <Button
          type="submit"
          disabled={!canSubmit || executeTrade.isPending}
          className="h-10 w-full text-sm bg-primary hover:bg-primary-dark text-primary-foreground shadow-sm shadow-primary/20"
        >
          {executeTrade.isPending ? 'Executing...' : executeButtonText}
        </Button>
      </div>
    </form>
  )
}
