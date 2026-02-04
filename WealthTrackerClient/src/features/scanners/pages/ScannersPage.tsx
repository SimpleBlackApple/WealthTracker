import { useEffect, useMemo, useRef, useState } from 'react'
import { NavLink, Navigate, useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import {
  AlertTriangle,
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  ChevronRight,
  Clock,
  RefreshCw,
  Search,
} from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { cn } from '@/lib/utils'
import { ActiveFilters } from '@/features/scanners/components/ActiveFilters'
import { FilterChip } from '@/features/scanners/components/FilterChip'
import { StockSymbolBadge } from '@/features/scanners/components/StockSymbolBadge'
import { Skeleton } from '@/components/ui/skeleton'
import { TableSkeleton } from '@/features/scanners/components/TableSkeleton'
import { TradingViewChart } from '@/features/scanners/components/TradingViewChart'
import { TradingPanel } from '@/features/trading/components/TradingPanel'
import { scannerService } from '@/features/scanners/services/scannerService'
import { getRuntimeConfig } from '@/config/runtimeConfig'
import {
  SCANNERS,
  type ScannerId,
  type ScannerDefinition,
  type ScannerRequestById,
  type SortDirection,
} from '@/features/scanners/types/scanners'

type SortState = { key: string; direction: SortDirection }
type Scanner = ScannerDefinition<ScannerId>

const SCANNER_REFRESH_MS = Math.max(
  1,
  Math.trunc(getRuntimeConfig().scannerRefreshSeconds * 1000)
)

const STALE_REVALIDATE_REFETCH_MS = 15_000
const STALE_REVALIDATE_GIVE_UP_MS = 60_000

function useIsDocumentVisible() {
  const [isVisible, setIsVisible] = useState(() => {
    if (typeof document === 'undefined') return true
    return document.visibilityState !== 'hidden'
  })

  useEffect(() => {
    const onVisibilityChange = () => {
      setIsVisible(document.visibilityState !== 'hidden')
    }

    document.addEventListener('visibilitychange', onVisibilityChange)
    return () => {
      document.removeEventListener('visibilitychange', onVisibilityChange)
    }
  }, [])

  return isVisible
}

function formatNumber(value: number | null | undefined) {
  if (value === null || value === undefined || Number.isNaN(value)) return '-'
  return value.toLocaleString(undefined, { maximumFractionDigits: 2 })
}

function formatPrice(value: number | null | undefined) {
  if (value === null || value === undefined || Number.isNaN(value)) return '-'
  return value.toLocaleString(undefined, {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: value >= 10 ? 2 : 4,
  })
}

function formatCompact(value: number | null | undefined) {
  if (value === null || value === undefined || Number.isNaN(value)) return '-'
  const abs = Math.abs(value)
  if (abs >= 1_000_000_000) return `${(value / 1_000_000_000).toFixed(2)}B`
  if (abs >= 1_000_000) return `${(value / 1_000_000).toFixed(2)}M`
  if (abs >= 1_000) return `${(value / 1_000).toFixed(1)}K`
  return value.toLocaleString()
}

function coerceNumber(value: string, fallback: number) {
  if (value.trim() === '') return fallback
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

function coerceInt(value: string, fallback: number) {
  return Math.trunc(coerceNumber(value, fallback))
}

function ScannerGridSkeleton({
  columns,
  rows,
  isPanelVisible,
}: {
  columns: number
  rows: number
  isPanelVisible: boolean
}) {
  return (
    <div className="flex h-full gap-4 w-full animate-in fade-in duration-500">
      <div className="flex flex-1 flex-col gap-2 overflow-hidden">
        {/* Filters Area Skeleton */}
        <div className="shrink-0 bg-card rounded-xl border border-border/70 p-4">
          <div className="flex items-center justify-between mb-6">
            <div className="space-y-2">
              <Skeleton className="h-7 w-48" />
              <Skeleton className="h-3 w-64" />
            </div>
            <div className="flex gap-2">
              <Skeleton className="h-8 w-16 rounded-md" />
              <Skeleton className="h-8 w-8 rounded-md" />
              <Skeleton className="h-8 w-16 rounded-md" />
            </div>
          </div>
          <div className="flex gap-3">
            <Skeleton className="h-8 w-20 rounded-full" />
            <Skeleton className="h-8 w-24 rounded-full" />
            <Skeleton className="h-8 w-28 rounded-full" />
            <Skeleton className="h-8 w-20 rounded-full" />
          </div>
        </div>

        {/* Results Area Skeleton */}
        <div className="flex-1 flex flex-col overflow-hidden bg-card rounded-xl border border-border/70">
          <div className="p-4 border-b border-border/70 flex items-center justify-between">
            <Skeleton className="h-5 w-32" />
            <Skeleton className="h-6 w-20" />
          </div>
          <TableSkeleton columns={columns} rows={rows} />
        </div>
      </div>

      {isPanelVisible && (
        <div className="w-[450px] lg:w-[600px] flex flex-col gap-4 shrink-0 transition-all">
          <div className="flex-[5] rounded-xl border border-border/70 bg-card overflow-hidden relative">
            <Skeleton className="h-full w-full opacity-40" />
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="flex flex-col items-center gap-2">
                <Skeleton className="h-8 w-32 rounded-md" />
                <Skeleton className="h-4 w-48 rounded-md" />
              </div>
            </div>
          </div>
          <div className="flex-[5] rounded-xl border border-border/70 bg-card overflow-hidden">
            <div className="p-4 space-y-6">
              <div className="flex items-center gap-3">
                <Skeleton className="h-10 w-10 rounded-full" />
                <div className="space-y-2">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-3 w-32" />
                </div>
              </div>
              <div className="space-y-3">
                <Skeleton className="h-20 w-full rounded-md" />
                <Skeleton className="h-48 w-full rounded-md" />
              </div>
              <Skeleton className="h-10 w-full rounded-md mt-auto" />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export function ScannersPage() {
  const params = useParams()
  const scannerId = params.scannerId as ScannerId | undefined
  const definition = SCANNERS.find(s => s.id === scannerId)

  if (!definition) {
    return <Navigate to="/scanners/day-gainers" replace />
  }

  return <ScannersPageInner key={definition.id} definition={definition} />
}

function ScannersPageInner({ definition }: { definition: Scanner }) {
  const [draftRequest, setDraftRequest] = useState<
    ScannerRequestById[ScannerId]
  >(definition.defaultRequest)
  const [appliedRequest, setAppliedRequest] = useState<
    ScannerRequestById[ScannerId]
  >(definition.defaultRequest)

  const isDocumentVisible = useIsDocumentVisible()

  const [sort, setSort] = useState<SortState>(definition.defaultSort)
  const [pageIndex, setPageIndex] = useState(0)
  const [symbolFilter, setSymbolFilter] = useState('')
  const [selectedSymbol, setSelectedSymbol] = useState<{
    symbol: string
    exchange: string | null
  } | null>(null)
  const [isPanelVisible, setIsPanelVisible] = useState(true)

  const [staleRevalidateStartedAtMs, setStaleRevalidateStartedAtMs] = useState<
    number | null
  >(null)
  const [staleRevalidateTimedOut, setStaleRevalidateTimedOut] = useState(false)

  const staleRevalidateGiveUpTimeoutIdRef = useRef<number | null>(null)
  const staleRevalidateRefetchTimeoutIdRef = useRef<number | null>(null)

  const query = useQuery({
    queryKey: ['scanner', definition.id, appliedRequest],
    queryFn: async () =>
      scannerService.runScanner(
        definition.id,
        appliedRequest as ScannerRequestById[typeof definition.id]
      ),
    staleTime: SCANNER_REFRESH_MS,
    refetchOnWindowFocus: true,
  })
  const { dataUpdatedAt, isFetching, refetch } = query

  const asOfMs = useMemo(() => {
    const raw = query.data?.asOf
    if (typeof raw !== 'string') return null
    const parsed = Date.parse(raw)
    return Number.isFinite(parsed) ? parsed : null
  }, [query.data?.asOf])

  const cacheFreshUntilMs = useMemo(() => {
    const raw = query.data?.cache?.freshUntil
    if (typeof raw !== 'string') return null
    const parsed = Date.parse(raw)
    return Number.isFinite(parsed) ? parsed : null
  }, [query.data?.cache?.freshUntil])

  const isStale = query.data?.cache?.isStale === true
  const willRevalidate = query.data?.cache?.willRevalidate === true

  const isAutoRevalidating =
    isStale &&
    willRevalidate &&
    isDocumentVisible &&
    staleRevalidateStartedAtMs !== null &&
    !staleRevalidateTimedOut

  useEffect(() => {
    if (staleRevalidateGiveUpTimeoutIdRef.current !== null) {
      window.clearTimeout(staleRevalidateGiveUpTimeoutIdRef.current)
      staleRevalidateGiveUpTimeoutIdRef.current = null
    }

    if (staleRevalidateRefetchTimeoutIdRef.current !== null) {
      window.clearTimeout(staleRevalidateRefetchTimeoutIdRef.current)
      staleRevalidateRefetchTimeoutIdRef.current = null
    }

    queueMicrotask(() => {
      setStaleRevalidateStartedAtMs(null)
      setStaleRevalidateTimedOut(false)
    })
  }, [definition.id, appliedRequest])

  useEffect(() => {
    const shouldReset = !isStale || !willRevalidate || !isDocumentVisible
    if (shouldReset) {
      if (staleRevalidateGiveUpTimeoutIdRef.current !== null) {
        window.clearTimeout(staleRevalidateGiveUpTimeoutIdRef.current)
        staleRevalidateGiveUpTimeoutIdRef.current = null
      }

      if (staleRevalidateRefetchTimeoutIdRef.current !== null) {
        window.clearTimeout(staleRevalidateRefetchTimeoutIdRef.current)
        staleRevalidateRefetchTimeoutIdRef.current = null
      }

      if (staleRevalidateStartedAtMs !== null || staleRevalidateTimedOut) {
        queueMicrotask(() => {
          setStaleRevalidateStartedAtMs(null)
          setStaleRevalidateTimedOut(false)
        })
      }

      return
    }

    if (!staleRevalidateTimedOut && staleRevalidateStartedAtMs === null) {
      queueMicrotask(() => setStaleRevalidateStartedAtMs(Date.now()))
    }
  }, [
    isStale,
    isDocumentVisible,
    staleRevalidateStartedAtMs,
    staleRevalidateTimedOut,
    willRevalidate,
  ])

  useEffect(() => {
    if (!isStale || !willRevalidate || !isDocumentVisible) return
    if (staleRevalidateTimedOut) return
    if (staleRevalidateStartedAtMs === null) return
    if (staleRevalidateGiveUpTimeoutIdRef.current !== null) return

    const remainingMs = Math.max(
      0,
      staleRevalidateStartedAtMs + STALE_REVALIDATE_GIVE_UP_MS - Date.now()
    )
    if (remainingMs <= 0) return

    staleRevalidateGiveUpTimeoutIdRef.current = window.setTimeout(() => {
      staleRevalidateGiveUpTimeoutIdRef.current = null
      setStaleRevalidateTimedOut(true)
    }, remainingMs)

    return () => {
      if (staleRevalidateGiveUpTimeoutIdRef.current !== null) {
        window.clearTimeout(staleRevalidateGiveUpTimeoutIdRef.current)
        staleRevalidateGiveUpTimeoutIdRef.current = null
      }
    }
  }, [
    isStale,
    isDocumentVisible,
    staleRevalidateStartedAtMs,
    staleRevalidateTimedOut,
    willRevalidate,
  ])

  useEffect(() => {
    if (!isStale || !willRevalidate || !isDocumentVisible) return
    if (staleRevalidateTimedOut) return
    if (staleRevalidateStartedAtMs === null) return
    if (isFetching) return
    if (staleRevalidateRefetchTimeoutIdRef.current !== null) return

    const remainingMs = Math.max(
      0,
      staleRevalidateStartedAtMs + STALE_REVALIDATE_GIVE_UP_MS - Date.now()
    )
    if (remainingMs <= 0) return

    const delayMs = Math.min(STALE_REVALIDATE_REFETCH_MS, remainingMs)
    staleRevalidateRefetchTimeoutIdRef.current = window.setTimeout(() => {
      staleRevalidateRefetchTimeoutIdRef.current = null
      if (document.visibilityState !== 'hidden') {
        refetch()
      }
    }, delayMs)

    return () => {
      if (staleRevalidateRefetchTimeoutIdRef.current !== null) {
        window.clearTimeout(staleRevalidateRefetchTimeoutIdRef.current)
        staleRevalidateRefetchTimeoutIdRef.current = null
      }
    }
  }, [
    isStale,
    isDocumentVisible,
    isFetching,
    refetch,
    staleRevalidateStartedAtMs,
    staleRevalidateTimedOut,
    willRevalidate,
  ])

  useEffect(() => {
    if (!isDocumentVisible) return
    if (isFetching) return

    if (isStale) return

    const baseMs = asOfMs ?? (dataUpdatedAt > 0 ? dataUpdatedAt : 0)
    if (!baseMs) return

    const expiresAt = cacheFreshUntilMs ?? baseMs + SCANNER_REFRESH_MS
    const delayMs = expiresAt - Date.now()

    if (!Number.isFinite(delayMs)) return
    if (delayMs <= 0) {
      refetch()
      return
    }

    const timeout = window.setTimeout(() => {
      if (document.visibilityState !== 'hidden') {
        refetch()
      }
    }, delayMs + 100)

    return () => window.clearTimeout(timeout)
  }, [
    asOfMs,
    cacheFreshUntilMs,
    isStale,
    isDocumentVisible,
    dataUpdatedAt,
    isFetching,
    refetch,
  ])

  const rows = useMemo(
    () => (query.data?.results ?? []) as Record<string, unknown>[],
    [query.data?.results]
  )

  const getCurrentPriceFromScanner = (symbol: string): number | null => {
    const row = rows.find(r => String(r.symbol) === symbol)
    const price = row?.price
    return typeof price === 'number' && Number.isFinite(price) ? price : null
  }

  const filteredRows = useMemo(() => {
    const q = String(symbolFilter || '')
      .trim()
      .toUpperCase()
    if (!q) return rows
    return rows.filter(r =>
      String(r.symbol ?? '')
        .toUpperCase()
        .includes(q)
    )
  }, [rows, symbolFilter])

  const sortedRows = useMemo(() => {
    const col = definition.columns.find(c => c.key === sort.key)
    if (!col) return filteredRows

    const direction = sort.direction === 'asc' ? 1 : -1
    const getSortValue = (row: Record<string, unknown>) => {
      const raw = col.sortValue
        ? col.sortValue(row as never)
        : col.getValue(row as never)
      return raw === undefined ? null : raw
    }

    return [...filteredRows].sort((a, b) => {
      const av = getSortValue(a)
      const bv = getSortValue(b)

      if (av === null && bv === null) return 0
      if (av === null) return 1
      if (bv === null) return -1

      if (typeof av === 'number' && typeof bv === 'number') {
        return (av - bv) * direction
      }

      return String(av).localeCompare(String(bv)) * direction
    })
  }, [definition.columns, filteredRows, sort.direction, sort.key])

  const pageSize = Math.max(1, coerceInt(String(appliedRequest.limit ?? ''), 7))
  const totalRows = sortedRows.length
  const totalPages = Math.max(1, Math.ceil(totalRows / pageSize))
  const currentPageIndex = Math.min(pageIndex, totalPages - 1)

  const pageRows = useMemo(() => {
    const start = currentPageIndex * pageSize
    return sortedRows.slice(start, start + pageSize)
  }, [currentPageIndex, pageSize, sortedRows])

  const defaultSelectedSymbol = useMemo(() => {
    if (sortedRows.length === 0) return null
    const first = sortedRows[0]
    return {
      symbol: String(first.symbol),
      exchange: (first as { exchange?: string }).exchange || null,
    }
  }, [sortedRows])

  const effectiveSelectedSymbol = selectedSymbol ?? defaultSelectedSymbol

  const appliedFilters = useMemo(() => {
    const filters = [
      {
        key: 'minPrice',
        label: 'Min Price',
        value: appliedRequest.minPrice,
        defaultValue: definition.defaultRequest.minPrice,
      },
      {
        key: 'maxPrice',
        label: 'Max Price',
        value: appliedRequest.maxPrice,
        defaultValue: definition.defaultRequest.maxPrice,
      },
      {
        key: 'minAvgVol',
        label: 'Min Avg Vol',
        value: appliedRequest.minAvgVol,
        defaultValue: definition.defaultRequest.minAvgVol,
      },
      {
        key: 'minChangePct',
        label: 'Min Change %',
        value: appliedRequest.minChangePct,
        defaultValue: definition.defaultRequest.minChangePct,
      },
      {
        key: 'interval',
        label: 'Interval',
        value: appliedRequest.interval,
        defaultValue: definition.defaultRequest.interval,
      },
    ]

    if (definition.id === 'day-gainers') {
      const applied = appliedRequest as ScannerRequestById['day-gainers']
      const defaults =
        definition.defaultRequest as ScannerRequestById['day-gainers']
      filters.push({
        key: 'minTodayVolume',
        label: 'Min Today Vol',
        value: applied.minTodayVolume,
        defaultValue: defaults.minTodayVolume,
      })
    }

    return filters
  }, [appliedRequest, definition])

  const appliedFilterCount = appliedFilters.filter(
    filter => filter.value !== filter.defaultValue
  ).length

  const toggleSort = (key: string) => {
    setPageIndex(0)
    setSort(prev => {
      if (prev.key !== key) return { key, direction: 'desc' }
      return { key, direction: prev.direction === 'desc' ? 'asc' : 'desc' }
    })
  }

  const renderCell = (key: string, value: unknown) => {
    if (key === 'symbol') {
      const symbol = String(value ?? '-')
      return (
        <div className="flex items-center gap-2">
          <StockSymbolBadge symbol={symbol} />
          <span className="font-semibold">{symbol}</span>
        </div>
      )
    }

    if (key === 'price' || key === 'prev_close' || key === 'day_high') {
      return formatPrice(value as number | null | undefined)
    }

    if (
      key.endsWith('_pct') ||
      key === 'vwap_distance' ||
      key === 'distance_to_hod'
    ) {
      const numValue = value as number | null | undefined
      if (
        numValue === null ||
        numValue === undefined ||
        Number.isNaN(numValue)
      ) {
        return '-'
      }
      const colorClass =
        numValue > 0 ? 'text-gain' : numValue < 0 ? 'text-loss' : ''
      return (
        <span className={colorClass}>
          {numValue > 0 ? '+' : ''}
          {numValue.toFixed(2)}%
        </span>
      )
    }

    if (
      key === 'volume' ||
      key === 'avg_volume_20d' ||
      key === 'market_cap' ||
      key === 'float_shares'
    ) {
      return formatCompact(value as number | null | undefined)
    }

    if (key === 'relative_volume') {
      return formatNumber(value as number | null | undefined)
    }

    if (typeof value === 'number') return formatNumber(value)
    if (value === null || value === undefined || value === '') return '-'
    return String(value)
  }

  const showSkeleton =
    query.isLoading || (query.isFetching && rows.length === 0)

  return (
    <div
      className={cn(
        'grid h-[calc(100vh-5rem)] gap-2 transition-all duration-300 ease-in-out',
        effectiveSelectedSymbol || showSkeleton
          ? isPanelVisible
            ? 'lg:grid-cols-[240px_1fr_minmax(400px,600px)]'
            : 'lg:grid-cols-[240px_1fr_12px]'
          : 'lg:grid-cols-[240px_1fr]'
      )}
    >
      {/* LEFT SIDEBAR - Scanner List */}
      <div className="grid gap-2 overflow-auto pr-1 bg-sidebar rounded-xl border border-border/70">
        <Card className="overflow-hidden border-none bg-transparent shadow-none">
          <CardHeader className="border-b border-border/70 p-4">
            <CardTitle className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground/80">
              Scanners
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-1 p-2">
            {SCANNERS.map(s => (
              <NavLink
                key={s.id}
                to={`/scanners/${s.id}`}
                className={({ isActive }) =>
                  cn(
                    'relative flex items-start gap-3 rounded-lg px-3 py-2.5 text-sm transition-all hover:bg-white/40',
                    isActive
                      ? 'bg-sidebar-active font-semibold text-foreground'
                      : 'text-muted-foreground'
                  )
                }
              >
                {({ isActive }) => (
                  <>
                    <s.icon
                      className={cn(
                        'h-5 w-5 shrink-0 mt-0.5',
                        isActive ? 'text-primary' : 'text-muted-foreground/60'
                      )}
                    />
                    <div className="flex flex-col gap-0.5 min-w-0">
                      <div className="leading-tight truncate">{s.title}</div>
                      <div className="line-clamp-2 text-[11px] text-muted-foreground/70 font-normal leading-normal">
                        {s.description}
                      </div>
                    </div>
                  </>
                )}
              </NavLink>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* MIDDLE & RIGHT WRAPPER */}
      {showSkeleton ? (
        <div className={cn(isPanelVisible ? 'col-span-2' : 'col-span-1')}>
          <ScannerGridSkeleton
            columns={definition.columns.length + 1}
            rows={pageSize}
            isPanelVisible={isPanelVisible}
          />
        </div>
      ) : (
        <>
          {/* MIDDLE - Scanner Results and Filters */}
          <div className="flex flex-col gap-2 overflow-hidden">
            <Card className="shrink-0">
              <CardHeader className="border-b border-border/70 p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="font-display text-lg">
                      {definition.title}
                    </CardTitle>
                    <p className="mt-0.5 text-[11px] text-muted-foreground">
                      {definition.description}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="mr-2 flex items-center gap-2 border-r border-border/70 pr-4 text-xs text-muted-foreground">
                      <span>{query.isFetching ? 'Refreshing…' : 'Ready'}</span>
                      {(asOfMs !== null || query.dataUpdatedAt > 0) && (
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          <span>
                            As of{' '}
                            {new Date(
                              asOfMs ?? query.dataUpdatedAt
                            ).toLocaleTimeString()}
                          </span>
                        </span>
                      )}
                      {isStale && (
                        <div
                          title="Stale data (showing cached results)"
                          className="flex items-center"
                        >
                          <AlertTriangle
                            className="h-3.5 w-3.5 text-amber-600"
                            aria-label="Stale data"
                          />
                        </div>
                      )}
                    </div>
                    <Button
                      onClick={() => {
                        setPageIndex(0)
                        setSelectedSymbol(null)
                        setIsPanelVisible(true)
                        setAppliedRequest(draftRequest)
                      }}
                      disabled={query.isFetching}
                      size="sm"
                      className="h-8 px-4 bg-primary hover:bg-primary-dark text-primary-foreground shadow-sm shadow-primary/20"
                    >
                      Run
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 w-8 p-0 border-primary/30 text-primary hover:bg-primary/10 hover:text-primary"
                      onClick={() => {
                        if (
                          staleRevalidateGiveUpTimeoutIdRef.current !== null
                        ) {
                          window.clearTimeout(
                            staleRevalidateGiveUpTimeoutIdRef.current
                          )
                          staleRevalidateGiveUpTimeoutIdRef.current = null
                        }

                        if (
                          staleRevalidateRefetchTimeoutIdRef.current !== null
                        ) {
                          window.clearTimeout(
                            staleRevalidateRefetchTimeoutIdRef.current
                          )
                          staleRevalidateRefetchTimeoutIdRef.current = null
                        }

                        setStaleRevalidateTimedOut(false)
                        setStaleRevalidateStartedAtMs(
                          isStale && willRevalidate ? Date.now() : null
                        )
                        query.refetch()
                      }}
                      disabled={query.isFetching}
                    >
                      <RefreshCw
                        className={cn(
                          'h-3.5 w-3.5',
                          (query.isFetching || isAutoRevalidating) &&
                          'animate-spin'
                        )}
                      />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 border-primary/30 text-primary hover:bg-primary/10 hover:text-primary"
                      onClick={() => {
                        setSelectedSymbol(null)
                        setIsPanelVisible(true)
                        setDraftRequest(definition.defaultRequest)
                        setAppliedRequest(definition.defaultRequest)
                        setSort(definition.defaultSort)
                        setPageIndex(0)
                        setSymbolFilter('')
                      }}
                    >
                      Reset
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="px-4 pb-4 pt-3">
                <div className="flex flex-wrap items-center gap-x-4 gap-y-3">
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-semibold text-muted-foreground">
                      Filters
                    </span>
                    <span
                      className={cn(
                        'rounded-full border px-2 py-0.5 text-xs font-semibold',
                        appliedFilterCount > 0
                          ? 'border-primary/40 bg-primary/10 text-primary'
                          : 'border-border/70 bg-card text-muted-foreground'
                      )}
                    >
                      {appliedFilterCount}
                    </span>
                  </div>

                  <div className="relative flex-1 min-w-[200px] max-w-2xl">
                    <div
                      id="filter-scroll-container"
                      className="wt-scrollbar-x flex items-center gap-2 overflow-x-auto pb-2 pr-1 md:pb-0"
                    >
                      <Popover>
                        <PopoverTrigger asChild>
                          <FilterChip
                            label="Price"
                            value={`${draftRequest.minPrice}-${draftRequest.maxPrice}`}
                            defaultValue={`${definition.defaultRequest.minPrice}-${definition.defaultRequest.maxPrice}`}
                          />
                        </PopoverTrigger>
                        <PopoverContent className="w-56 p-3">
                          <div className="grid gap-3">
                            <div className="grid gap-1">
                              <Label htmlFor="minPrice" className="text-xs">
                                Min price
                              </Label>
                              <Input
                                id="minPrice"
                                type="number"
                                step="0.01"
                                value={String(draftRequest.minPrice)}
                                onChange={e =>
                                  setDraftRequest(prev => ({
                                    ...prev,
                                    minPrice: coerceNumber(
                                      e.target.value,
                                      prev.minPrice
                                    ),
                                  }))
                                }
                                className="h-8"
                              />
                            </div>
                            <div className="grid gap-1">
                              <Label htmlFor="maxPrice" className="text-xs">
                                Max price
                              </Label>
                              <Input
                                id="maxPrice"
                                type="number"
                                step="0.01"
                                value={String(draftRequest.maxPrice)}
                                onChange={e =>
                                  setDraftRequest(prev => ({
                                    ...prev,
                                    maxPrice: coerceNumber(
                                      e.target.value,
                                      prev.maxPrice
                                    ),
                                  }))
                                }
                                className="h-8"
                              />
                            </div>
                          </div>
                        </PopoverContent>
                      </Popover>

                      <Popover>
                        <PopoverTrigger asChild>
                          <FilterChip
                            label="Avg Vol"
                            value={formatCompact(draftRequest.minAvgVol)}
                            defaultValue={formatCompact(
                              definition.defaultRequest.minAvgVol
                            )}
                          />
                        </PopoverTrigger>
                        <PopoverContent className="w-48 p-3">
                          <div className="grid gap-2">
                            <Label htmlFor="minAvgVol" className="text-xs">
                              Min avg vol
                            </Label>
                            <Input
                              id="minAvgVol"
                              type="number"
                              min={0}
                              step={10000}
                              value={String(draftRequest.minAvgVol)}
                              onChange={e =>
                                setDraftRequest(prev => ({
                                  ...prev,
                                  minAvgVol: coerceInt(
                                    e.target.value,
                                    prev.minAvgVol
                                  ),
                                }))
                              }
                              className="h-8"
                            />
                          </div>
                        </PopoverContent>
                      </Popover>

                      <Popover>
                        <PopoverTrigger asChild>
                          <FilterChip
                            label="Change %"
                            value={`${draftRequest.minChangePct}%`}
                            defaultValue={`${definition.defaultRequest.minChangePct}%`}
                          />
                        </PopoverTrigger>
                        <PopoverContent className="w-40 p-3">
                          <div className="grid gap-2">
                            <Label htmlFor="minChangePct" className="text-xs">
                              Min change %
                            </Label>
                            <Input
                              id="minChangePct"
                              type="number"
                              step="0.1"
                              value={String(draftRequest.minChangePct)}
                              onChange={e =>
                                setDraftRequest(prev => ({
                                  ...prev,
                                  minChangePct: coerceNumber(
                                    e.target.value,
                                    prev.minChangePct
                                  ),
                                }))
                              }
                              className="h-8"
                            />
                          </div>
                        </PopoverContent>
                      </Popover>

                      <Popover>
                        <PopoverTrigger asChild>
                          <FilterChip
                            label="Interval"
                            value={draftRequest.interval}
                            defaultValue={definition.defaultRequest.interval}
                          />
                        </PopoverTrigger>
                        <PopoverContent className="w-40 p-3">
                          <div className="grid gap-2">
                            <Label className="text-xs">Interval</Label>
                            <Select
                              value={draftRequest.interval}
                              onValueChange={value =>
                                setDraftRequest(prev => ({
                                  ...prev,
                                  interval: value,
                                }))
                              }
                            >
                              <SelectTrigger className="h-8">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {['1m', '2m', '5m', '15m', '30m', '60m'].map(
                                  v => (
                                    <SelectItem key={v} value={v}>
                                      {v}
                                    </SelectItem>
                                  )
                                )}
                              </SelectContent>
                            </Select>
                          </div>
                        </PopoverContent>
                      </Popover>

                      {definition.id === 'day-gainers' && (
                        <Popover>
                          <PopoverTrigger asChild>
                            <FilterChip
                              label="Volume"
                              value={formatCompact(
                                (
                                  draftRequest as ScannerRequestById['day-gainers']
                                ).minTodayVolume
                              )}
                              defaultValue={formatCompact(
                                (
                                  definition.defaultRequest as ScannerRequestById['day-gainers']
                                ).minTodayVolume
                              )}
                            />
                          </PopoverTrigger>
                          <PopoverContent className="w-48 p-3">
                            <div className="grid gap-2">
                              <Label
                                htmlFor="minTodayVolume"
                                className="text-xs"
                              >
                                Min today volume
                              </Label>
                              <Input
                                id="minTodayVolume"
                                type="number"
                                min={0}
                                step={10000}
                                value={String(
                                  (
                                    draftRequest as ScannerRequestById['day-gainers']
                                  ).minTodayVolume
                                )}
                                onChange={e =>
                                  setDraftRequest(prev => ({
                                    ...prev,
                                    minTodayVolume: coerceInt(
                                      e.target.value,
                                      (
                                        prev as ScannerRequestById['day-gainers']
                                      ).minTodayVolume
                                    ),
                                  }))
                                }
                                className="h-8"
                              />
                            </div>
                          </PopoverContent>
                        </Popover>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Label
                      htmlFor="symbolFilter"
                      className="text-xs font-semibold text-muted-foreground"
                    >
                      Symbol
                    </Label>
                    <div className="relative">
                      <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground/50" />
                      <Input
                        id="symbolFilter"
                        placeholder="Search..."
                        value={symbolFilter}
                        onChange={e => {
                          setPageIndex(0)
                          setSelectedSymbol(null)
                          setIsPanelVisible(true)
                          setSymbolFilter(e.target.value)
                        }}
                        className="h-8 w-36 pl-8"
                      />
                    </div>
                  </div>
                </div>

                {appliedFilterCount > 0 && (
                  <div className="mt-3">
                    <ActiveFilters
                      filters={appliedFilters}
                      onRemove={key => {
                        const defaultVal =
                          definition.defaultRequest[
                          key as keyof typeof definition.defaultRequest
                          ]
                        setDraftRequest(prev => ({
                          ...prev,
                          [key]: defaultVal,
                        }))
                        setAppliedRequest(prev => ({
                          ...prev,
                          [key]: defaultVal,
                        }))
                      }}
                    />
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="flex-1 min-h-0">
              <CardHeader className="border-b border-border/70 p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <CardTitle className="text-sm font-semibold">
                      Results
                    </CardTitle>
                    <span className="rounded-full border border-border/70 bg-secondary/60 px-2 py-0.5 text-xs text-muted-foreground">
                      {query.isFetching
                        ? 'Loading...'
                        : `${totalRows.toLocaleString()} symbols`}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Label className="text-xs font-semibold text-muted-foreground">
                      Rows
                    </Label>
                    <Select
                      value={String(pageSize)}
                      onValueChange={value => {
                        const next = Number(value)
                        setPageIndex(0)
                        setSelectedSymbol(null)
                        setIsPanelVisible(true)
                        setDraftRequest(prev => ({ ...prev, limit: next }))
                        setAppliedRequest(prev => ({ ...prev, limit: next }))
                      }}
                    >
                      <SelectTrigger className="h-8 w-[76px] bg-card text-sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {['7', '10', '25', '50', '100'].map(v => (
                          <SelectItem key={v} value={v} className="text-xs">
                            {v}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-0 flex flex-col h-[calc(100%-45px)]">
                {query.isError ? (
                  <div className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm">
                    {query.error instanceof Error
                      ? query.error.message
                      : 'Failed to load scanner results.'}
                  </div>
                ) : query.isFetching && pageRows.length === 0 ? (
                  <TableSkeleton
                    columns={definition.columns.length + 1}
                    rows={pageSize}
                  />
                ) : (
                  <div className="overflow-hidden rounded-xl border border-border/70 bg-card">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-12 text-center text-xs font-medium text-muted-foreground">
                            #
                          </TableHead>
                          {definition.columns.map(col => {
                            const active = sort.key === col.key
                            const Icon = !active
                              ? ArrowUpDown
                              : sort.direction === 'asc'
                                ? ArrowUp
                                : ArrowDown
                            return (
                              <TableHead
                                key={col.key}
                                className={cn(
                                  'whitespace-nowrap',
                                  col.align === 'right' && 'text-right',
                                  col.key === 'symbol' &&
                                  'border-r border-border'
                                )}
                              >
                                <button
                                  type="button"
                                  onClick={() => toggleSort(col.key)}
                                  aria-label={`Sort by ${col.header}`}
                                  className={cn(
                                    'inline-flex items-center gap-1 text-xs font-semibold text-muted-foreground hover:text-foreground',
                                    active && 'text-foreground'
                                  )}
                                >
                                  {col.header}
                                  <Icon className="h-3.5 w-3.5 opacity-70" />
                                </button>
                              </TableHead>
                            )
                          })}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {pageRows.length === 0 ? (
                          <TableRow>
                            <TableCell
                              colSpan={definition.columns.length + 1}
                              className="py-10 text-center text-sm text-muted-foreground"
                            >
                              {query.isFetching
                                ? 'Loading...'
                                : 'No results. Try widening filters or using period 5d outside market hours.'}
                            </TableCell>
                          </TableRow>
                        ) : (
                          pageRows.map((row, idx) => {
                            const symbol = String(row.symbol)
                            const exchange =
                              (row as { exchange?: string }).exchange || null
                            const isSelected =
                              effectiveSelectedSymbol?.symbol === symbol
                            return (
                              <TableRow
                                key={`${symbol}-${idx}`}
                                className={cn(
                                  'cursor-pointer transition-colors hover:bg-secondary/60',
                                  isSelected &&
                                  '!bg-primary/20 hover:!bg-primary/30'
                                )}
                                onClick={() => {
                                  setSelectedSymbol({ symbol, exchange })
                                  setIsPanelVisible(true)
                                }}
                              >
                                <TableCell className="w-12 text-center text-xs text-muted-foreground">
                                  {currentPageIndex * pageSize + idx + 1}
                                </TableCell>
                                {definition.columns.map(col => {
                                  const value = col.getValue(row as never)
                                  return (
                                    <TableCell
                                      key={col.key}
                                      className={cn(
                                        'whitespace-nowrap',
                                        col.align === 'right' &&
                                        'text-right font-variant-numeric tabular-nums',
                                        col.key === 'symbol' &&
                                        'border-r border-border'
                                      )}
                                    >
                                      {renderCell(col.key, value)}
                                    </TableCell>
                                  )
                                })}
                              </TableRow>
                            )
                          })
                        )}
                      </TableBody>
                    </Table>

                    <div className="border-t border-border/70 bg-card px-3 py-2 pr-6">
                      <div className="flex flex-wrap items-center gap-2">
                        <div className="w-full text-xs text-muted-foreground sm:w-auto">
                          {totalRows === 0
                            ? '0 rows'
                            : `${currentPageIndex * pageSize + 1}-${Math.min(
                              (currentPageIndex + 1) * pageSize,
                              totalRows
                            )} of ${totalRows.toLocaleString()}`}
                        </div>
                        <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setPageIndex(0)}
                            disabled={currentPageIndex === 0}
                          >
                            First
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() =>
                              setPageIndex(p => Math.max(0, p - 1))
                            }
                            disabled={currentPageIndex === 0}
                          >
                            Prev
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() =>
                              setPageIndex(p => Math.min(totalPages - 1, p + 1))
                            }
                            disabled={currentPageIndex >= totalPages - 1}
                          >
                            Next
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setPageIndex(totalPages - 1)}
                            disabled={currentPageIndex >= totalPages - 1}
                          >
                            Last
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* RIGHT - Chart + Trading Panel Container */}
          {effectiveSelectedSymbol && (
            <div className="relative flex h-full">
              {/* Floating Toggle Button (Chevron) - Fixed position relative to container */}
              <Button
                variant="outline"
                size="icon"
                className={cn(
                  'absolute -left-3 top-1/2 z-50 h-7 w-7 -translate-y-1/2 rounded-full bg-card shadow-md shadow-black/10 transition-all duration-300 border border-border/70',
                  !isPanelVisible &&
                  'rotate-180 bg-secondary text-foreground hover:bg-secondary/80'
                )}
                onClick={() => setIsPanelVisible(!isPanelVisible)}
                title={isPanelVisible ? 'Hide panel' : 'Show panel'}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>

              <div
                className={cn(
                  'flex h-full flex-col overflow-hidden rounded-xl border border-border/70 bg-card transition-all duration-300 ease-in-out',
                  isPanelVisible
                    ? 'w-full opacity-100'
                    : 'w-0 opacity-0 border-none select-none pointer-events-none'
                )}
              >
                {isPanelVisible && (
                  <div className="flex h-full flex-col overflow-hidden min-w-[300px]">
                    <div className="flex-[5] min-h-0 border-b border-border/70">
                      <TradingViewChart
                        symbol={effectiveSelectedSymbol.symbol}
                        exchange={effectiveSelectedSymbol.exchange}
                      />
                    </div>
                    <div className="flex flex-[5] min-h-0 flex-col bg-card">
                      <TradingPanel
                        symbol={effectiveSelectedSymbol.symbol}
                        exchange={effectiveSelectedSymbol.exchange}
                        currentPrice={getCurrentPriceFromScanner(
                          effectiveSelectedSymbol.symbol
                        )}
                        priceTimestamp={asOfMs ?? query.dataUpdatedAt}
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
