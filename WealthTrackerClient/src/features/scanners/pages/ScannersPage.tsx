import { useMemo, useState } from 'react'
import { NavLink, Navigate, useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  Clock,
  RefreshCw,
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
import { Separator } from '@/components/ui/separator'
import { cn } from '@/lib/utils'
import { ActiveFilters } from '@/features/scanners/components/ActiveFilters'
import { FilterChip } from '@/features/scanners/components/FilterChip'
import { StockSymbolBadge } from '@/features/scanners/components/StockSymbolBadge'
import { TableSkeleton } from '@/features/scanners/components/TableSkeleton'
import { scannerService } from '@/features/scanners/services/scannerService'
import {
  SCANNERS,
  type ScannerId,
  type ScannerDefinition,
  type ScannerRequestById,
  type SortDirection,
} from '@/features/scanners/types/scanners'

type SortState = { key: string; direction: SortDirection }
type Scanner = ScannerDefinition<ScannerId>

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

  const [sort, setSort] = useState<SortState>(definition.defaultSort)
  const [pageIndex, setPageIndex] = useState(0)
  const [pageSize, setPageSize] = useState(25)
  const [symbolFilter, setSymbolFilter] = useState('')

  const query = useQuery({
    queryKey: ['scanner', definition.id, appliedRequest],
    queryFn: async () =>
      scannerService.runScanner(
        definition.id,
        appliedRequest as ScannerRequestById[typeof definition.id]
      ),
    staleTime: 15_000,
    refetchOnWindowFocus: false,
  })

  const rows = useMemo(
    () => (query.data?.results ?? []) as Record<string, unknown>[],
    [query.data?.results]
  )

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

  const totalRows = sortedRows.length
  const totalPages = Math.max(1, Math.ceil(totalRows / pageSize))
  const currentPageIndex = Math.min(pageIndex, totalPages - 1)

  const pageRows = useMemo(() => {
    const start = currentPageIndex * pageSize
    return sortedRows.slice(start, start + pageSize)
  }, [currentPageIndex, pageSize, sortedRows])

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
      {
        key: 'universeLimit',
        label: 'Universe',
        value: appliedRequest.universeLimit,
        defaultValue: definition.defaultRequest.universeLimit,
      },
      {
        key: 'limit',
        label: 'Limit',
        value: appliedRequest.limit,
        defaultValue: definition.defaultRequest.limit,
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

  return (
    <div className="grid gap-4 lg:grid-cols-[260px_1fr]">
      <Card className="h-fit border-border/60 bg-card/80 shadow-sm animate-in fade-in-50 lg:sticky lg:top-[80px]">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold">Scanners</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-1">
          {SCANNERS.map(s => (
            <NavLink
              key={s.id}
              to={`/scanners/${s.id}`}
              className={({ isActive }) =>
                cn(
                  'rounded-lg px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground',
                  isActive && 'bg-muted/60 font-semibold text-foreground'
                )
              }
            >
              <div className="leading-4">{s.title}</div>
              <div className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                {s.description}
              </div>
            </NavLink>
          ))}
        </CardContent>
      </Card>

      <div className="grid gap-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div className="grid gap-1">
            <h1 className="font-display text-xl">{definition.title}</h1>
            <p className="text-sm text-muted-foreground">
              {definition.description}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={() => query.refetch()}
              disabled={query.isFetching}
            >
              <RefreshCw
                className={cn(
                  'mr-2 h-4 w-4',
                  query.isFetching && 'animate-spin'
                )}
              />
              Refresh
            </Button>
            <Button
              variant="secondary"
              onClick={() => {
                setDraftRequest(definition.defaultRequest)
                setAppliedRequest(definition.defaultRequest)
                setSort(definition.defaultSort)
                setPageIndex(0)
                setSymbolFilter('')
              }}
            >
              Reset
            </Button>
            <Button
              onClick={() => {
                setPageIndex(0)
                setAppliedRequest(draftRequest)
              }}
              disabled={query.isFetching}
            >
              Run
            </Button>
          </div>
        </div>

        <Card className="border-border/60 bg-card/80 shadow-sm animate-in fade-in-50">
          <CardContent className="grid gap-3 p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <span className="text-[11px] font-semibold uppercase tracking-[0.32em] text-muted-foreground">
                  Filters
                </span>
                <span
                  className={cn(
                    'rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.28em]',
                    appliedFilterCount > 0
                      ? 'border-primary/40 bg-primary/10 text-primary'
                      : 'border-border/60 text-muted-foreground'
                  )}
                >
                  {appliedFilterCount} applied
                </span>
              </div>
              <div className="text-xs text-muted-foreground">
                <span className="hidden sm:inline">
                  Scroll to reveal filters
                </span>
                <span className="sm:hidden">Tap to adjust filters</span>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <div className="relative flex-1 min-w-[240px]">
                <div className="pointer-events-none absolute inset-y-0 left-0 hidden w-6 bg-gradient-to-r from-card/90 via-card/60 to-transparent md:block" />
                <div className="pointer-events-none absolute inset-y-0 right-0 hidden w-6 bg-gradient-to-l from-card/90 via-card/60 to-transparent md:block" />
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute -left-2 top-1/2 z-10 hidden h-8 w-8 -translate-y-1/2 rounded-full border bg-card/90 shadow-sm md:flex"
                  onClick={() => {
                    const el = document.getElementById(
                      'filter-scroll-container'
                    )
                    if (el) el.scrollBy({ left: -200, behavior: 'smooth' })
                  }}
                  aria-label="Scroll filters left"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>

                <div
                  id="filter-scroll-container"
                  className="relative flex flex-wrap items-center gap-2 overflow-visible md:flex-nowrap md:overflow-x-auto md:pb-2 md:-mb-2 md:px-8"
                  style={{ scrollbarWidth: 'thin', scrollbarGutter: 'stable' }}
                >
                  <Popover>
                    <PopoverTrigger asChild>
                      <FilterChip
                        label="Universe"
                        value={draftRequest.universeLimit}
                        defaultValue={definition.defaultRequest.universeLimit}
                      />
                    </PopoverTrigger>
                    <PopoverContent className="w-40 p-3">
                      <div className="grid gap-2">
                        <Label htmlFor="universeLimit" className="text-xs">
                          Universe limit
                        </Label>
                        <Input
                          id="universeLimit"
                          type="number"
                          min={1}
                          max={500}
                          value={String(draftRequest.universeLimit)}
                          onChange={e =>
                            setDraftRequest(prev => ({
                              ...prev,
                              universeLimit: coerceInt(
                                e.target.value,
                                prev.universeLimit
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
                        label="Limit"
                        value={draftRequest.limit}
                        defaultValue={definition.defaultRequest.limit}
                      />
                    </PopoverTrigger>
                    <PopoverContent className="w-40 p-3">
                      <div className="grid gap-2">
                        <Label htmlFor="limit" className="text-xs">
                          Result limit
                        </Label>
                        <Input
                          id="limit"
                          type="number"
                          min={1}
                          max={200}
                          value={String(draftRequest.limit)}
                          onChange={e =>
                            setDraftRequest(prev => ({
                              ...prev,
                              limit: coerceInt(e.target.value, prev.limit),
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
                            <SelectItem value="1m">1m</SelectItem>
                            <SelectItem value="2m">2m</SelectItem>
                            <SelectItem value="5m">5m</SelectItem>
                            <SelectItem value="15m">15m</SelectItem>
                            <SelectItem value="30m">30m</SelectItem>
                            <SelectItem value="60m">60m</SelectItem>
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
                            (draftRequest as ScannerRequestById['day-gainers'])
                              .minTodayVolume
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
                          <Label htmlFor="minTodayVolume" className="text-xs">
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
                                  (prev as ScannerRequestById['day-gainers'])
                                    .minTodayVolume
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

                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute -right-2 top-1/2 z-10 hidden h-8 w-8 -translate-y-1/2 rounded-full border bg-card/90 shadow-sm md:flex"
                  onClick={() => {
                    const el = document.getElementById(
                      'filter-scroll-container'
                    )
                    if (el) el.scrollBy({ left: 200, behavior: 'smooth' })
                  }}
                  aria-label="Scroll filters right"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>

              <Separator
                orientation="vertical"
                className="hidden h-8 md:block"
              />

              <div className="flex w-full items-center gap-2 sm:w-auto">
                <Label
                  htmlFor="symbolFilter"
                  className="text-[10px] font-semibold uppercase tracking-[0.28em] text-muted-foreground"
                >
                  Symbol
                </Label>
                <Input
                  id="symbolFilter"
                  placeholder="Filter list..."
                  value={symbolFilter}
                  onChange={e => {
                    setPageIndex(0)
                    setSymbolFilter(e.target.value)
                  }}
                  className="h-9 w-full bg-muted/50 focus:bg-background sm:w-40"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/60 bg-card/80 shadow-sm animate-in fade-in-50">
          <CardHeader className="pb-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <CardTitle className="text-base">Results</CardTitle>
              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                {query.dataUpdatedAt > 0 && (
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {new Date(query.dataUpdatedAt).toLocaleTimeString()}
                  </span>
                )}
                <div className="flex items-center gap-2">
                  <Label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                    Rows / page
                  </Label>
                  <Select
                    value={String(pageSize)}
                    onValueChange={value => {
                      setPageIndex(0)
                      setPageSize(Number(value))
                    }}
                  >
                    <SelectTrigger className="h-7 w-[70px] text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="10">10</SelectItem>
                      <SelectItem value="25">25</SelectItem>
                      <SelectItem value="50">50</SelectItem>
                      <SelectItem value="100">100</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <span>
                  {query.isFetching
                    ? 'Loading...'
                    : query.isError
                      ? 'Error'
                      : `${totalRows.toLocaleString()} rows`}
                </span>
              </div>
            </div>
          </CardHeader>
          <CardContent className="grid gap-3">
            <ActiveFilters
              filters={appliedFilters}
              onRemove={key => {
                setDraftRequest(prev => ({
                  ...prev,
                  [key]:
                    definition.defaultRequest[
                      key as keyof typeof definition.defaultRequest
                    ],
                }))
                setAppliedRequest(prev => ({
                  ...prev,
                  [key]:
                    definition.defaultRequest[
                      key as keyof typeof definition.defaultRequest
                    ],
                }))
              }}
            />
            {query.isError ? (
              <div className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm">
                {query.error instanceof Error
                  ? query.error.message
                  : 'Failed to load scanner results.'}
              </div>
            ) : query.isFetching && pageRows.length === 0 ? (
              <TableSkeleton
                columns={definition.columns.length + 1}
                rows={10}
              />
            ) : (
              <div className="grid gap-3">
                <div className="max-h-[600px] overflow-auto rounded-md border border-border/60 bg-card/60">
                  <Table>
                    <TableHeader className="sticky top-0 z-10 bg-card/90 backdrop-blur">
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
                                col.key === 'symbol' && 'border-r border-border'
                              )}
                            >
                              <button
                                type="button"
                                onClick={() => toggleSort(col.key)}
                                aria-label={`Sort by ${col.header}`}
                                className={cn(
                                  'inline-flex items-center gap-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground hover:text-foreground',
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
                              : 'No results. Try increasing universe limit or using period 5d outside market hours.'}
                          </TableCell>
                        </TableRow>
                      ) : (
                        pageRows.map((row, idx) => (
                          <TableRow key={`${String(row.symbol)}-${idx}`}>
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
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="text-xs text-muted-foreground">
                    {currentPageIndex * pageSize + 1}-
                    {Math.min((currentPageIndex + 1) * pageSize, totalRows)} of{' '}
                    {totalRows.toLocaleString()}
                  </div>
                  <div className="flex items-center gap-2">
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
                      onClick={() => setPageIndex(p => Math.max(0, p - 1))}
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
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
