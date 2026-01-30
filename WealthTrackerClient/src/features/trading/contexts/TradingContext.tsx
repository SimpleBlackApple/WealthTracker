import { createContext, useContext, useState, type ReactNode } from 'react'

interface TradingContextValue {
  activePortfolioId: number | null
  setActivePortfolioId: (id: number | null) => void
  activeView: 'trade' | 'portfolio' | 'history'
  setActiveView: (view: 'trade' | 'portfolio' | 'history') => void
}

const TradingContext = createContext<TradingContextValue | undefined>(undefined)

export function TradingProvider({ children }: { children: ReactNode }) {
  const [activePortfolioId, setActivePortfolioId] = useState<number | null>(
    null
  )
  const [activeView, setActiveView] = useState<
    'trade' | 'portfolio' | 'history'
  >('trade')

  return (
    <TradingContext.Provider
      value={{
        activePortfolioId,
        setActivePortfolioId,
        activeView,
        setActiveView,
      }}
    >
      {children}
    </TradingContext.Provider>
  )
}

export function useTradingContext() {
  const context = useContext(TradingContext)
  if (context === undefined) {
    throw new Error('useTradingContext must be used within a TradingProvider')
  }
  return context
}
