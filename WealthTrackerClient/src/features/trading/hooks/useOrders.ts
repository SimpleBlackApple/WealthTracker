import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { tradingService } from '../services/tradingService'

export function useOpenOrders(
  portfolioId: number | null,
  options?: { refetchInterval?: number | false }
) {
  return useQuery({
    queryKey: ['orders', portfolioId],
    enabled: portfolioId != null,
    queryFn: () => tradingService.getOpenOrders(portfolioId as number),
    staleTime: 5_000,
    refetchInterval: options?.refetchInterval,
    refetchOnWindowFocus: false,
  })
}

export function useCancelOrder() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (payload: { orderId: number; portfolioId: number }) => {
      await tradingService.cancelOrder(payload.orderId)
      return payload
    },
    onSuccess: async payload => {
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: ['orders', payload.portfolioId],
        }),
        queryClient.invalidateQueries({
          queryKey: ['transactions', payload.portfolioId],
        }),
      ])
    },
  })
}
