import { describe, it, expect, vi, beforeEach } from 'vitest'
import { fireEvent, render, screen, within } from '@testing-library/react'
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

  it('submits marketable default limit orders at cent precision', async () => {
    const user = userEvent.setup()
    render(
      <ToastProvider>
        <OrderForm
          portfolioId={1}
          symbol="AAPL"
          exchange="NASDAQ"
          currentPrice={100.001}
        />
      </ToastProvider>
    )

    fireEvent.change(screen.getByLabelText(/quantity/i), {
      target: { value: '10' },
    })

    await user.click(screen.getByRole('combobox', { name: /type/i }))
    const listbox = screen.getByRole('listbox')
    await user.click(within(listbox).getByText('Limit'))

    await user.click(screen.getByRole('button', { name: /execute/i }))

    expect(mutate).toHaveBeenCalledWith(
      {
        portfolioId: 1,
        request: {
          symbol: 'AAPL',
          exchange: 'NASDAQ',
          type: 'buy',
          quantity: 10,
          price: 100.001,
          orderType: 'limit',
          limitPrice: 100.01,
          stopPrice: undefined,
        },
      },
      expect.objectContaining({ onSuccess: expect.any(Function) })
    )
  })

  it('uses updated default limit price after symbol change', async () => {
    const user = userEvent.setup()
    const view = render(
      <ToastProvider>
        <OrderForm
          key="AAPL"
          portfolioId={1}
          symbol="AAPL"
          exchange="NASDAQ"
          currentPrice={100}
        />
      </ToastProvider>
    )

    fireEvent.change(screen.getByLabelText(/quantity/i), {
      target: { value: '10' },
    })

    await user.click(screen.getByRole('combobox', { name: /type/i }))
    const listbox = screen.getByRole('listbox')
    await user.click(within(listbox).getByText('Limit'))

    view.rerender(
      <ToastProvider>
        <OrderForm
          key="MSFT"
          portfolioId={1}
          symbol="MSFT"
          exchange="NASDAQ"
          currentPrice={200}
        />
      </ToastProvider>
    )

    await user.click(screen.getByRole('combobox', { name: /type/i }))
    const nextListbox = screen.getByRole('listbox')
    await user.click(within(nextListbox).getByText('Limit'))

    await user.click(screen.getByRole('button', { name: /execute/i }))

    expect(mutate).toHaveBeenCalledWith(
      {
        portfolioId: 1,
        request: {
          symbol: 'MSFT',
          exchange: 'NASDAQ',
          type: 'buy',
          quantity: 100,
          price: 200,
          orderType: 'limit',
          limitPrice: 200,
          stopPrice: undefined,
        },
      },
      expect.objectContaining({ onSuccess: expect.any(Function) })
    )
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

    fireEvent.change(screen.getByLabelText(/quantity/i), {
      target: { value: '5' },
    })
    await user.click(screen.getByRole('button', { name: /execute/i }))

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
