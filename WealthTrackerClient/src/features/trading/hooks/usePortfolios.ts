import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { tradingService } from '../services/tradingService'
import type { CreatePortfolioRequest } from '../types/trading'

export function usePortfolios() {
  return useQuery({
    queryKey: ['portfolios'],
    queryFn: () => tradingService.getUserPortfolios(),
    staleTime: 60_000,
    refetchOnWindowFocus: false,
  })
}

export function useCreatePortfolio() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (request: CreatePortfolioRequest) =>
      tradingService.createPortfolio(request),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['portfolios'] })
    },
  })
}

