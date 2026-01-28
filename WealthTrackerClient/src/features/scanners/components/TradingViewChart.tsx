import { useEffect, useRef, useState, memo } from 'react'
import { formatHex, parse } from 'culori'

interface TradingViewChartProps {
  symbol: string
  exchange?: string | null
}

/**
 * Maps Yahoo Finance exchange codes to TradingView exchange prefixes.
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

// Helper to resolve CSS variable to RGB string
const resolveThemeColor = (variable: string): string => {
  if (typeof window === 'undefined') return '#ffffff'
  const el = document.createElement('div')
  el.style.color = `var(${variable})`
  el.style.display = 'none'
  document.body.appendChild(el)
  const styles = window.getComputedStyle(el)
  const color = styles.color
  document.body.removeChild(el)

  // Convert color to hex format using culori
  // Parse the color (handles oklch, rgb, etc.) and convert to hex
  const parsedColor = parse(color)
  if (parsedColor) {
    const hexColor = formatHex(parsedColor)
    return hexColor
  }

  // Fallback to white if parsing fails
  return '#ffffff'
}

const THEME_COLORS = {
  light: {
    up: '#10b981', // Emerald 500
    down: '#ef4444', // Red 500
  },
  dark: {
    up: '#34d399', // Emerald 400
    down: '#f87171', // Red 400
  },
}

function TradingViewChartComponent({
  symbol,
  exchange,
}: TradingViewChartProps) {
  const containerRef = useRef<HTMLDivElement>(null)

  // Initialize theme config once on mount
  const getInitialConfig = () => {
    const isDark = document.documentElement.classList.contains('dark')
    const bg = resolveThemeColor('--background')
    return { bg, isDark }
  }

  const [config, setConfig] = useState(getInitialConfig)

  // Watch for theme changes and resolve background color dynamically
  useEffect(() => {
    const updateTheme = () => {
      const isDark = document.documentElement.classList.contains('dark')
      const bg = resolveThemeColor('--background')

      setConfig(prev => {
        // Only update if theme actually changed
        if (prev.bg === bg && prev.isDark === isDark) return prev
        return { bg, isDark }
      })
    }

    const observer = new MutationObserver(updateTheme)
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class'],
    })

    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    if (!containerRef.current) return

    const container = containerRef.current

    // Clear container completely (synchronous)
    container.innerHTML = ''

    // Use setTimeout to defer widget creation to next event loop
    // This ensures cleanup is complete before creating new widget
    const timeoutId = setTimeout(() => {
      // Create wrapper structure required for the widget
      const wrapper = document.createElement('div')
      wrapper.className = 'tradingview-widget-container'
      wrapper.style.height = '100%'
      wrapper.style.width = '100%'

      const widgetContainer = document.createElement('div')
      widgetContainer.className = 'tradingview-widget-container__widget'
      widgetContainer.style.height = 'calc(100% - 32px)'
      widgetContainer.style.width = '100%'

      const copyright = document.createElement('div')
      copyright.className = 'tradingview-widget-copyright'
      copyright.innerHTML = `<a href="https://www.tradingview.com/symbols/${symbol}/" rel="noopener nofollow" target="_blank"><span class="blue-text">${symbol} stock chart</span></a><span class="trademark"> by TradingView</span>`

      wrapper.appendChild(widgetContainer)
      wrapper.appendChild(copyright)
      container.appendChild(wrapper)

      // Script injection
      const script = document.createElement('script')
      script.src =
        'https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js'
      script.type = 'text/javascript'
      script.async = true

      // Format symbol
      const mappedExchange = mapExchangeToTradingView(exchange)
      const tvSymbol = symbol.includes(':')
        ? symbol
        : mappedExchange
          ? `${mappedExchange}:${symbol}`
          : symbol

      const { bg, isDark } = config
      const colors = isDark ? THEME_COLORS.dark : THEME_COLORS.light

      script.innerHTML = JSON.stringify({
        autosize: true,
        symbol: tvSymbol,
        interval: 'D',
        timezone: 'Etc/UTC',
        theme: isDark ? 'dark' : 'light',
        style: '1',
        locale: 'en',
        enable_publishing: false,
        hide_side_toolbar: true,
        hide_top_toolbar: true,
        allow_symbol_change: true,
        backgroundColor: bg,
        save_image: false,
        support_host: 'https://www.tradingview.com',
        overrides: {
          'mainSeriesProperties.candleStyle.upColor': colors.up,
          'mainSeriesProperties.candleStyle.downColor': colors.down,
          'mainSeriesProperties.candleStyle.borderUpColor': colors.up,
          'mainSeriesProperties.candleStyle.borderDownColor': colors.down,
          'mainSeriesProperties.candleStyle.wickUpColor': colors.up,
          'mainSeriesProperties.candleStyle.wickDownColor': colors.down,
          'volume.volume.color.0': colors.down,
          'volume.volume.color.1': colors.up,
          'paneProperties.vertGridProperties.color': isDark
            ? '#2B2B43'
            : '#E6E6E6',
          'paneProperties.horzGridProperties.color': isDark
            ? '#2B2B43'
            : '#E6E6E6',
        },
      })

      widgetContainer.appendChild(script)
    }, 0)

    return () => clearTimeout(timeoutId)
  }, [symbol, exchange, config])

  return (
    <div
      ref={containerRef}
      style={{ backgroundColor: config.bg }}
      className="h-full w-full overflow-hidden rounded-md border border-border/60 bg-card/50"
    />
  )
}

export const TradingViewChart = memo(TradingViewChartComponent)
