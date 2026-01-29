import type { AxiosInstance } from 'axios'

import { authService } from '@/features/auth/services/authService'
import type {
  CreatePortfolioRequest,
  ExecuteTradeRequest,
  PortfolioSummary,
  SimulationOrder,
  SimulationPortfolio,
  SimulationPosition,
  SimulationTransaction,
} from '../types/trading'

class TradingService {
  private axiosInstance: AxiosInstance

  constructor() {
    this.axiosInstance = authService.getAxiosInstance()
  }

  async createPortfolio(request: CreatePortfolioRequest) {
    const response = await this.axiosInstance.post<SimulationPortfolio>(
      '/simulation/portfolios',
      request
    )
    return response.data
  }

  async getUserPortfolios() {
    const response = await this.axiosInstance.get<SimulationPortfolio[]>(
      '/simulation/portfolios'
    )
    return response.data
  }

  async getPortfolio(id: number) {
    const response = await this.axiosInstance.get<{
      portfolio: SimulationPortfolio
      positions: SimulationPosition[]
    }>(`/simulation/portfolios/${id}`)
    return response.data
  }

  async getPortfolioSummary(id: number) {
    const response = await this.axiosInstance.get<PortfolioSummary>(
      `/simulation/portfolios/${id}/summary`
    )
    return response.data
  }

  async executeTrade(portfolioId: number, request: ExecuteTradeRequest) {
    const response = await this.axiosInstance.post<SimulationTransaction>(
      `/simulation/portfolios/${portfolioId}/trades`,
      request
    )
    return response.data
  }

  async getTransactions(portfolioId: number, page = 1, pageSize = 50) {
    const response = await this.axiosInstance.get<SimulationTransaction[]>(
      `/simulation/portfolios/${portfolioId}/transactions`,
      { params: { page, pageSize } }
    )
    return response.data
  }

  async getOpenOrders(portfolioId: number) {
    const response = await this.axiosInstance.get<SimulationOrder[]>(
      `/simulation/portfolios/${portfolioId}/orders`
    )
    return response.data
  }

  async cancelOrder(orderId: number) {
    const response = await this.axiosInstance.delete<{ success: boolean }>(
      `/simulation/orders/${orderId}`
    )
    return response.data
  }
}

export const tradingService = new TradingService()

