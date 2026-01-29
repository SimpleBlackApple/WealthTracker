export type TransactionType = 'buy' | 'sell' | 'short' | 'cover'
export type OrderType = 'market' | 'limit' | 'stopLoss'
export type TransactionStatus = 'pending' | 'executed' | 'cancelled' | 'failed'
export type OrderStatus = 'open' | 'filled' | 'cancelled' | 'expired'

export interface FeeBreakdown {
  commission: number
  tafFee: number
  secFee: number
  locateFee: number
  totalFees: number
}

export interface SimulationPortfolio {
  id: number
  userId: number
  name: string
  initialCash: number
  currentCash: number
  createdAt: string
  lastTradeAt?: string
}

export interface SimulationPosition {
  id: number
  portfolioId: number
  symbol: string
  exchange?: string
  quantity: number
  isShort: boolean
  averageCost: number
  currentPrice?: number
  lastPriceUpdate?: string
  realizedPL: number
  borrowCost: number
  createdAt: string
  updatedAt: string
}

export interface SimulationTransaction {
  id: number
  portfolioId: number
  symbol: string
  exchange?: string
  type: TransactionType
  orderType: OrderType
  quantity: number
  price: number
  fee: number
  totalAmount: number
  status: TransactionStatus
  createdAt: string
  executedAt?: string
  notes?: string
  fees: FeeBreakdown
}

export interface SimulationOrder {
  id: number
  portfolioId: number
  symbol: string
  exchange?: string
  type: TransactionType
  orderType: OrderType
  quantity: number
  limitPrice?: number
  stopPrice?: number
  status: OrderStatus
  createdAt: string
  expiresAt?: string
  filledAt?: string
  transactionId?: number
}

export interface PositionWithPL {
  positionId: number
  symbol: string
  exchange?: string
  quantity: number
  isShort: boolean
  averageCost: number
  currentPrice?: number
  totalCost: number
  currentValue?: number
  unrealizedPL?: number
  unrealizedPLPercentage?: number
  realizedPL: number
  borrowCost: number
}

export interface PortfolioSummary {
  totalValue: number
  cash: number
  equityValue: number
  totalPL: number
  totalPLPercentage: number
  positions: PositionWithPL[]
}

export interface CreatePortfolioRequest {
  name: string
  initialCash: number
}

export interface ExecuteTradeRequest {
  symbol: string
  exchange?: string
  type: TransactionType
  quantity: number
  price: number
  orderType: OrderType
  limitPrice?: number
  stopPrice?: number
}

