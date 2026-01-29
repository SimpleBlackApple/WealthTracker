import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

import { OrderForm } from './OrderForm'
import { ToastProvider } from '@/components/ui/toast'

const mutate = vi.fn()

vi.mock('../hooks/useTrades', () => ({
  useExecuteTrade: () => ({
    mutate,
    isPending: false,
    error: null,
  }),
}))

describe('OrderForm', () => {
  beforeEach(() => {
    mutate.mockReset()
  })

  it('requires limit price for limit orders', async () => {
    const user = userEvent.setup()
    render(
      <ToastProvider>
        <OrderForm
          portfolioId={1}
          symbol="AAPL"
          exchange="NASDAQ"
          currentPrice={100}
        />
      </ToastProvider>
    )

    await user.type(screen.getByLabelText(/quantity/i), '10')

    await user.click(screen.getByRole('combobox'))
    const listbox = screen.getByRole('listbox')
    await user.click(within(listbox).getByText('Limit'))

    await user.click(screen.getByRole('button', { name: 'Execute' }))

    expect(
      screen.getByText('Limit price is required for limit orders.')
    ).toBeInTheDocument()
    expect(mutate).not.toHaveBeenCalled()
  })

  it('submits market orders with required fields', async () => {
    const user = userEvent.setup()
    render(
      <ToastProvider>
        <OrderForm
          portfolioId={42}
          symbol="AAPL"
          exchange={null}
          currentPrice={123.45}
        />
      </ToastProvider>
    )

    await user.type(screen.getByLabelText(/quantity/i), '5')
    await user.click(screen.getByRole('button', { name: 'Execute' }))

    expect(mutate).toHaveBeenCalledWith(
      {
        portfolioId: 42,
        request: {
          symbol: 'AAPL',
          exchange: undefined,
          type: 'buy',
          quantity: 5,
          price: 123.45,
          orderType: 'market',
          limitPrice: undefined,
          stopPrice: undefined,
        },
      },
      expect.objectContaining({ onSuccess: expect.any(Function) })
    )
  })
})
