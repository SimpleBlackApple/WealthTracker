import { useQuery } from '@tanstack/react-query'

import { tradingService } from '../services/tradingService'

export function usePortfolio(portfolioId: number | null) {
  return useQuery({
    queryKey: ['portfolio', portfolioId],
    enabled: portfolioId != null,
    queryFn: () => tradingService.getPortfolio(portfolioId as number),
    staleTime: 10_000,
    refetchOnWindowFocus: false,
  })
}

export function usePortfolioSummary(portfolioId: number | null) {
  return useQuery({
    queryKey: ['portfolio-summary', portfolioId],
    enabled: portfolioId != null,
    queryFn: () => tradingService.getPortfolioSummary(portfolioId as number),
    staleTime: 3_000,
    refetchOnWindowFocus: false,
  })
}

