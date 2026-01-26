import { useEffect, useRef } from 'react'

declare global {
  interface Window {
    TradingView: {
      widget: new (config: Record<string, unknown>) => void
    }
  }
}

interface TradingViewChartProps {
  symbol: string
  exchange?: string | null
}

/**
 * Maps Yahoo Finance exchange codes to TradingView exchange prefixes.
 * @param exchange - The exchange code from Yahoo Finance (e.g., 'NMS', 'NYQ', 'NCM', 'NGM', 'ASE')
 * @returns The TradingView exchange prefix (e.g., 'NASDAQ', 'NYSE', 'AMEX')
 */
function mapExchangeToTradingView(exchange?: string | null): string | null {
  if (!exchange) return null

  const exchangeUpper = exchange.toUpperCase().trim()
  const exchangeNormalized = exchangeUpper.replace(/\s+/g, ' ')

  // Yahoo Finance exchange codes mapped to TradingView prefixes
  const exchangeMap: Record<string, string> = {
    NMS: 'NASDAQ', // NASDAQ Global Select Market
    NCM: 'NASDAQ', // NASDAQ Capital Market
    NGM: 'NASDAQ', // NASDAQ Global Market
    NASDAQ: 'NASDAQ',
    NASDAQGS: 'NASDAQ',
    NASDAQGM: 'NASDAQ',
    NASDAQCM: 'NASDAQ',
    NYQ: 'NYSE', // NYSE
    NYS: 'NYSE',
    NYSE: 'NYSE',
    NYE: 'NYSE',
    ASE: 'AMEX', // NYSE American (formerly AMEX)
    AMEX: 'AMEX',
    NYSEARCA: 'NYSEARCA',
    ARCA: 'NYSEARCA',
    'NYSE ARCA': 'NYSEARCA',
    'NYSE AMERICAN': 'AMEX',
    'NYSE MKT': 'AMEX',
  }

  // Check direct mapping first
  if (exchangeMap[exchangeNormalized]) {
    return exchangeMap[exchangeNormalized]
  }
  if (exchangeMap[exchangeUpper]) {
    return exchangeMap[exchangeUpper]
  }

  // Check if exchange string contains common keywords
  if (exchangeNormalized.includes('ARCA')) return 'NYSEARCA'
  if (exchangeNormalized.includes('AMERICAN')) return 'AMEX'
  if (exchangeNormalized.includes('AMEX')) return 'AMEX'
  if (exchangeNormalized.includes('NEW YORK')) return 'NYSE'
  if (exchangeNormalized.includes('NYSE')) return 'NYSE'
  if (exchangeNormalized.includes('NASDAQ')) return 'NASDAQ'
  if (exchangeNormalized.includes('BATS')) return 'BATS'

  return null
}

const THEME_COLORS = {
  light: {
    up: '#10b981', // Emerald 500 (Matches --gain)
    down: '#ef4444', // Red 500 (Matches --loss)
    bg: '#ffffff', // Card background (approx)
    toolbar: '#f1f3f6',
    border: '#e5e7eb',
  },
  dark: {
    up: '#34d399', // Emerald 400 (Matches --gain in dark mode)
    down: '#f87171', // Red 400 (Matches --loss in dark mode)
    bg: '#1e1e2e', // Dark card background (approx)
    toolbar: '#1e1e2e',
    border: '#374151',
  },
}

export function TradingViewChart({
  symbol,
  exchange,
}: TradingViewChartProps) {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    // Check if the script is already loaded
    const scriptId = 'tradingview-widget-script'
    let script = document.getElementById(scriptId) as HTMLScriptElement

    const initWidget = () => {
      if (containerRef.current && window.TradingView) {
        // Clear container first to avoid multiple widgets
        containerRef.current.innerHTML = ''
        const widgetContainer = document.createElement('div')
        widgetContainer.id = `tv_chart_${Math.random().toString(36).substring(7)}`
        widgetContainer.className = 'h-full w-full'
        containerRef.current.appendChild(widgetContainer)

        // Format symbol for TradingView
        const mappedExchange = mapExchangeToTradingView(exchange)
        const tvSymbol = symbol.includes(':')
          ? symbol
          : mappedExchange
            ? `${mappedExchange}:${symbol}`
            : symbol

        const isDark = document.documentElement.classList.contains('dark')
        const colors = isDark ? THEME_COLORS.dark : THEME_COLORS.light

        new window.TradingView.widget({
          autosize: true,
          symbol: tvSymbol,
          interval: 'D',
          timezone: 'Etc/UTC',
          theme: isDark ? 'dark' : 'light',
          style: '1',
          locale: 'en',
          toolbar_bg: colors.toolbar,
          enable_publishing: false,
          hide_side_toolbar: true,
          allow_symbol_change: true,
          container_id: widgetContainer.id,
          overrides: {
            // Candles
            'mainSeriesProperties.candleStyle.upColor': colors.up,
            'mainSeriesProperties.candleStyle.downColor': colors.down,
            'mainSeriesProperties.candleStyle.borderUpColor': colors.up,
            'mainSeriesProperties.candleStyle.borderDownColor': colors.down,
            'mainSeriesProperties.candleStyle.wickUpColor': colors.up,
            'mainSeriesProperties.candleStyle.wickDownColor': colors.down,
            // Volume
            'volume.volume.color.0': colors.down,
            'volume.volume.color.1': colors.up,
            // Pane background
            'paneProperties.background': colors.bg,
            'paneProperties.vertGridProperties.color': isDark
              ? '#2B2B43'
              : '#E6E6E6',
            'paneProperties.horzGridProperties.color': isDark
              ? '#2B2B43'
              : '#E6E6E6',
            // Font
            'paneProperties.legendProperties.fontFamily':
              "'IBM Plex Sans', sans-serif",
          },
        })
      }
    }

    if (!script) {
      script = document.createElement('script')
      script.id = scriptId
      script.src = 'https://s3.tradingview.com/tv.js'
      script.async = true
      script.onload = initWidget
      document.head.appendChild(script)
    } else if (window.TradingView) {
      initWidget()
    } else {
      script.addEventListener('load', initWidget)
    }

    return () => {
      if (script) {
        script.removeEventListener('load', initWidget)
      }
    }
  }, [symbol, exchange])

  return (
    <div
      ref={containerRef}
      className="h-full w-full overflow-hidden rounded-md border border-border/60 bg-card/50"
    />
  )
}
