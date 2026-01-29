import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { tradingService } from '../services/tradingService'
import type { ExecuteTradeRequest } from '../types/trading'

export function useTransactions(
  portfolioId: number | null,
  page = 1,
  pageSize = 50,
  options?: { refetchInterval?: number | false }
) {
  return useQuery({
    queryKey: ['transactions', portfolioId, page, pageSize],
    enabled: portfolioId != null,
    queryFn: () =>
      tradingService.getTransactions(portfolioId as number, page, pageSize),
    staleTime: 5_000,
    refetchInterval: options?.refetchInterval,
    refetchOnWindowFocus: false,
  })
}

export function useExecuteTrade() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (payload: {
      portfolioId: number
      request: ExecuteTradeRequest
    }) => tradingService.executeTrade(payload.portfolioId, payload.request),
    onSuccess: async (_, payload) => {
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: ['portfolio', payload.portfolioId],
        }),
        queryClient.invalidateQueries({
          queryKey: ['portfolio-summary', payload.portfolioId],
        }),
        queryClient.invalidateQueries({
          queryKey: ['transactions', payload.portfolioId],
        }),
        queryClient.invalidateQueries({
          queryKey: ['orders', payload.portfolioId],
        }),
      ])
    },
  })
}
