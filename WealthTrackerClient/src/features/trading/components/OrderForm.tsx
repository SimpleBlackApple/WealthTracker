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
          <div className="space-y-1">
            <Label htmlFor="action" className="text-[10px] text-muted-foreground">
              Action
            </Label>
            <Select
              value={action}
              onValueChange={v => setAction(v as TransactionType)}
            >
              <SelectTrigger id="action" className="h-8 text-xs">
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

          <div className="space-y-1">
            <Label htmlFor="orderType" className="text-[10px] text-muted-foreground">
              Type
            </Label>
            <Select
              value={orderType}
              onValueChange={v => setOrderType(v as OrderType)}
            >
              <SelectTrigger id="orderType" className="h-8 text-xs">
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

        {/* Quantity with +/- buttons */}
        <div className="space-y-1">
          <Label htmlFor="quantity" className="text-[10px] text-muted-foreground">
            Quantity
          </Label>
          <div className="flex gap-1.5">
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="h-8 w-8 shrink-0"
              onClick={() => setQuantity(q => Math.max(1, q - 10))}
            >
              <Minus className="h-3.5 w-3.5" />
            </Button>
            <Input
              id="quantity"
              type="number"
              min="1"
              value={quantity}
              onChange={e => setQuantity(Math.max(1, Number(e.target.value) || 1))}
              className="h-8 text-center text-xs"
            />
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="h-8 w-8 shrink-0"
              onClick={() => setQuantity(q => q + 10)}
            >
              <Plus className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>

        {/* Price with +/- buttons (for limit orders) */}
        {orderType === 'limit' && (
          <div className="space-y-1">
            <Label htmlFor="limitPrice" className="text-[10px] text-muted-foreground">
              Limit Price
            </Label>
            <div className="flex gap-1.5">
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="h-8 w-8 shrink-0"
                onClick={() =>
                  setLimitPrice(p => Math.max(0.01, (p ?? currentPrice ?? 0) - 0.01))
                }
              >
                <Minus className="h-3.5 w-3.5" />
              </Button>
              <Input
                id="limitPrice"
                type="number"
                step="0.01"
                value={limitPrice ?? ''}
                onChange={e =>
                  setLimitPrice(
                    e.target.value === '' ? null : Number(e.target.value)
                  )
                }
                className="h-8 text-center text-xs"
                placeholder={currentPrice?.toFixed(2)}
              />
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="h-8 w-8 shrink-0"
                onClick={() =>
                  setLimitPrice(p => (p ?? currentPrice ?? 0) + 0.01)
                }
              >
                <Plus className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        )}

        {/* Stop Price (for stop loss orders) */}
        {orderType === 'stopLoss' && (
          <div className="space-y-1">
            <Label htmlFor="stopPrice" className="text-[10px] text-muted-foreground">
              Stop Price
            </Label>
            <div className="flex gap-1.5">
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="h-8 w-8 shrink-0"
                onClick={() =>
                  setStopPrice(p => Math.max(0.01, (p ?? currentPrice ?? 0) - 0.01))
                }
              >
                <Minus className="h-3.5 w-3.5" />
              </Button>
              <Input
                id="stopPrice"
                type="number"
                step="0.01"
                value={stopPrice ?? ''}
                onChange={e =>
                  setStopPrice(
                    e.target.value === '' ? null : Number(e.target.value)
                  )
                }
                className="h-8 text-center text-xs"
                placeholder={currentPrice?.toFixed(2)}
              />
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="h-8 w-8 shrink-0"
                onClick={() =>
                  setStopPrice(p => (p ?? currentPrice ?? 0) + 0.01)
                }
              >
                <Plus className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        )}

        {/* Fee Estimate - More compact */}
        {feeEstimate && (
          <div className="rounded-md border border-border/60 bg-muted/30 px-2 py-1.5 text-[10px]">
            <div className="mb-1 font-semibold text-foreground">Fees</div>
            <div className="grid gap-0.5 text-muted-foreground">
              <div className="flex justify-between">
                <span>Commission</span>
                <span>{toMoney(feeEstimate.commission)}</span>
              </div>
              {(action === 'sell' || action === 'short') && (
                <>
                  <div className="flex justify-between">
                    <span>TAF + SEC</span>
                    <span>
                      {toMoney(feeEstimate.tafFee + feeEstimate.secFee)}
                    </span>
                  </div>
                </>
              )}
              {action === 'short' && (
                <div className="flex justify-between">
                  <span>Locate</span>
                  <span>{toMoney(feeEstimate.locateFee)}</span>
                </div>
              )}
              <div className="mt-0.5 flex justify-between border-t border-border/60 pt-1 font-medium text-foreground">
                <span>Total Fees</span>
                <span>{toMoney(feeEstimate.totalFees)}</span>
              </div>
            </div>
          </div>
        )}

        {/* Order Summary - More compact */}
        <div className="rounded-md border border-border/60 bg-card/60 px-2 py-1.5 text-[10px]">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Symbol</span>
            <span className="font-medium">{symbol}</span>
          </div>
          <div className="mt-0.5 flex items-center justify-between">
            <span className="text-muted-foreground">Est. Total</span>
            <span className="font-medium">
              {totalEstimate != null ? toMoney(totalEstimate) : '—'}
            </span>
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
