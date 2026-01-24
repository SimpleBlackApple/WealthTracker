import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { ScannersPage } from './ScannersPage'
import { scannerService } from '@/features/scanners/services/scannerService'

vi.mock('@/features/scanners/services/scannerService', () => ({
  scannerService: {
    runScanner: vi.fn(),
  },
}))

const sampleResponse = {
  scanner: 'day_gainers',
  sorted_by: 'change_pct',
  results: [
    { symbol: 'AAA', price: 10, change_pct: 1.2 },
    { symbol: 'BBB', price: 50, change_pct: 0.5 },
  ],
}

const renderPage = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })

  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/scanners/day-gainers']}>
        <Routes>
          <Route path="/scanners/:scannerId" element={<ScannersPage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>
  )
}

describe('ScannersPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(scannerService.runScanner).mockResolvedValue(sampleResponse)
  })

  it('renders scanner title and results', async () => {
    renderPage()

    expect(
      await screen.findByRole('heading', { name: 'Day Gainers' })
    ).toBeInTheDocument()
    expect(await screen.findByText('AAA')).toBeInTheDocument()
    expect(screen.getByText('BBB')).toBeInTheDocument()
  })

  it('filters results by symbol', async () => {
    const user = userEvent.setup()
    renderPage()

    await screen.findByText('AAA')
    await user.type(screen.getByLabelText('Symbol'), 'BBB')

    await waitFor(() => {
      expect(screen.queryByText('AAA')).not.toBeInTheDocument()
    })
    expect(screen.getByText('BBB')).toBeInTheDocument()
  })

  it('sorts by price when header clicked', async () => {
    const user = userEvent.setup()
    renderPage()

    await screen.findByText('AAA')

    await user.click(screen.getByRole('button', { name: /Price/i }))

    await waitFor(() => {
      const rows = screen.getAllByRole('row')
      const dataRows = rows.slice(1)
      // Symbol is in the second cell (index 1) due to the row number column
      const firstRowSymbolCell = within(dataRows[0]).getAllByRole('cell')[1]
      expect(firstRowSymbolCell).toHaveTextContent('BBB')
    })
  })
})
