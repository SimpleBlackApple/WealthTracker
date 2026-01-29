import { useMemo, useState } from 'react'

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
import { useExecuteTrade } from '../hooks/useTrades'
import type { OrderType, TransactionType } from '../types/trading'

interface OrderFormProps {
  portfolioId: number | null
  symbol: string
  exchange?: string | null
  currentPrice: number | null
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
}: OrderFormProps) {
  const [action, setAction] = useState<TransactionType>('buy')
  const [orderType, setOrderType] = useState<OrderType>('market')
  const [quantity, setQuantity] = useState('')
  const [limitPrice, setLimitPrice] = useState('')
  const [stopPrice, setStopPrice] = useState('')

  const executeTrade = useExecuteTrade()

  const qty = useMemo(() => Math.max(0, Math.trunc(Number(quantity) || 0)), [quantity])

  const feeEstimate = useMemo(() => {
    if (!currentPrice || qty <= 0) return null

    let commission = 0
    let tafFee = 0
    let secFee = 0
    let locateFee = 0

    // Commission estimate (TradeZero-like): market orders or < 200 shares
    if (orderType === 'market' || orderType === 'stopLoss' || qty < 200) {
      commission = Math.max(0.99, qty * 0.005)
      commission = Math.min(commission, 7.95)
    }

    // Regulatory fees (sell/short only)
    if (action === 'sell' || action === 'short') {
      tafFee = qty * 0.000166
      secFee = qty * currentPrice * 0.0000278
    }

    // Locate fee for shorts
    if (action === 'short') {
      locateFee = qty * 0.01
    }

    const totalFees = commission + tafFee + secFee + locateFee

    return {
      commission,
      tafFee,
      secFee,
      locateFee,
      totalFees,
    }
  }, [action, currentPrice, orderType, qty])

  const totalEstimate = useMemo(() => {
    if (!currentPrice || qty <= 0) return null
    return qty * currentPrice + (feeEstimate?.totalFees ?? 0)
  }, [currentPrice, feeEstimate?.totalFees, qty])

  const canSubmit = portfolioId != null && currentPrice != null && qty > 0

  const [localError, setLocalError] = useState<string | null>(null)

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setLocalError(null)

    if (!canSubmit) return

    const limit = limitPrice.trim() === '' ? undefined : Number(limitPrice)
    const stop = stopPrice.trim() === '' ? undefined : Number(stopPrice)

    if (orderType === 'limit' && (!limit || !Number.isFinite(limit))) {
      setLocalError('Limit price is required for limit orders.')
      return
    }

    if (orderType === 'stopLoss' && (!stop || !Number.isFinite(stop))) {
      setLocalError('Stop price is required for stop-loss orders.')
      return
    }

    executeTrade.mutate({
      portfolioId: portfolioId as number,
      request: {
        symbol,
        exchange: exchange || undefined,
        type: action,
        quantity: qty,
        price: currentPrice as number,
        orderType,
        limitPrice: limit,
        stopPrice: stop,
      },
    })
  }

  const errorMessage =
    localError ||
    (executeTrade.error as { response?: { data?: { error?: string } } } | null)
      ?.response?.data?.error ||
    null

  return (
    <form onSubmit={onSubmit} className="grid gap-4">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Button
          type="button"
          variant={action === 'buy' ? 'default' : 'outline'}
          onClick={() => setAction('buy')}
          className={action === 'buy' ? 'bg-emerald-600 hover:bg-emerald-700' : ''}
        >
          Buy
        </Button>
        <Button
          type="button"
          variant={action === 'sell' ? 'default' : 'outline'}
          onClick={() => setAction('sell')}
          className={action === 'sell' ? 'bg-red-600 hover:bg-red-700' : ''}
        >
          Sell
        </Button>
        <Button
          type="button"
          variant={action === 'short' ? 'default' : 'outline'}
          onClick={() => setAction('short')}
          className={action === 'short' ? 'bg-orange-600 hover:bg-orange-700' : ''}
        >
          Short
        </Button>
        <Button
          type="button"
          variant={action === 'cover' ? 'default' : 'outline'}
          onClick={() => setAction('cover')}
          className={action === 'cover' ? 'bg-blue-600 hover:bg-blue-700' : ''}
        >
          Cover
        </Button>
      </div>

      {(action === 'short' || action === 'cover') && (
        <Alert variant="destructive">
          <AlertDescription className="text-xs">
            Short selling has unlimited loss potential. Borrow fees apply.
          </AlertDescription>
        </Alert>
      )}

      <div className="grid gap-2">
        <Label htmlFor="orderType" className="text-xs">
          Order Type
        </Label>
        <Select
          value={orderType}
          onValueChange={v => setOrderType(v as OrderType)}
        >
          <SelectTrigger id="orderType" className="h-9">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="market">Market</SelectItem>
            <SelectItem value="limit">Limit</SelectItem>
            <SelectItem value="stopLoss">Stop Loss</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid gap-2">
        <Label htmlFor="quantity" className="text-xs">
          Quantity (shares)
        </Label>
        <Input
          id="quantity"
          type="number"
          min="1"
          value={quantity}
          onChange={e => setQuantity(e.target.value)}
          className="h-9"
          placeholder="Enter quantity"
        />
      </div>

      {orderType === 'limit' && (
        <div className="grid gap-2">
          <Label htmlFor="limitPrice" className="text-xs">
            Limit Price
          </Label>
          <Input
            id="limitPrice"
            type="number"
            step="0.01"
            value={limitPrice}
            onChange={e => setLimitPrice(e.target.value)}
            className="h-9"
            placeholder={currentPrice?.toFixed(2)}
          />
        </div>
      )}

      {orderType === 'stopLoss' && (
        <div className="grid gap-2">
          <Label htmlFor="stopPrice" className="text-xs">
            Stop Price
          </Label>
          <Input
            id="stopPrice"
            type="number"
            step="0.01"
            value={stopPrice}
            onChange={e => setStopPrice(e.target.value)}
            className="h-9"
            placeholder={currentPrice?.toFixed(2)}
          />
        </div>
      )}

      {feeEstimate && (
        <div className="rounded-md border border-border/60 bg-muted/30 p-3 text-xs">
          <div className="mb-2 font-semibold">Estimated Fees</div>
          <div className="grid gap-1 text-muted-foreground">
            <div className="flex justify-between">
              <span>Commission</span>
              <span>{toMoney(feeEstimate.commission)}</span>
            </div>
            {(action === 'sell' || action === 'short') && (
              <>
                <div className="flex justify-between">
                  <span>TAF</span>
                  <span>{toMoney(feeEstimate.tafFee)}</span>
                </div>
                <div className="flex justify-between">
                  <span>SEC</span>
                  <span>{toMoney(feeEstimate.secFee)}</span>
                </div>
              </>
            )}
            {action === 'short' && (
              <div className="flex justify-between">
                <span>Locate</span>
                <span>{toMoney(feeEstimate.locateFee)}</span>
              </div>
            )}
            <div className="mt-1 flex justify-between border-t border-border/60 pt-2 font-medium text-foreground">
              <span>Total Fees</span>
              <span>{toMoney(feeEstimate.totalFees)}</span>
            </div>
          </div>
        </div>
      )}

      <div className="rounded-md border border-border/60 bg-card/60 p-3 text-xs">
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground">Symbol</span>
          <span className="font-medium">{symbol}</span>
        </div>
        <div className="mt-1 flex items-center justify-between">
          <span className="text-muted-foreground">Price (scanner)</span>
          <span className="font-medium">
            {currentPrice != null ? toMoney(currentPrice) : 'N/A'}
          </span>
        </div>
        <div className="mt-1 flex items-center justify-between">
          <span className="text-muted-foreground">Estimated Total</span>
          <span className="font-medium">
            {totalEstimate != null ? toMoney(totalEstimate) : '—'}
          </span>
        </div>
      </div>

      {errorMessage && (
        <Alert variant="destructive">
          <AlertDescription className="text-xs">{errorMessage}</AlertDescription>
        </Alert>
      )}

      <Button
        type="submit"
        disabled={!canSubmit || executeTrade.isPending}
        className="h-10"
      >
        {executeTrade.isPending ? 'Executing...' : 'Execute'}
      </Button>
    </form>
  )
}
