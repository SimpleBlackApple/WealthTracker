import { useMemo, useState } from 'react'
import { NavLink, Navigate, useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { ArrowDown, ArrowUp, ArrowUpDown, RefreshCw } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { cn } from '@/lib/utils'
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

function formatPctPoints(value: number | null | undefined) {
  if (value === null || value === undefined || Number.isNaN(value)) return '-'
  return `${value.toFixed(2)}%`
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
    const q = symbolFilter.trim().toUpperCase()
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

  const toggleSort = (key: string) => {
    setPageIndex(0)
    setSort(prev => {
      if (prev.key !== key) return { key, direction: 'desc' }
      return { key, direction: prev.direction === 'desc' ? 'asc' : 'desc' }
    })
  }

  const renderCell = (key: string, value: unknown) => {
    if (key === 'symbol') return String(value ?? '-')

    if (key === 'price' || key === 'prev_close' || key === 'day_high') {
      return formatPrice(value as number | null | undefined)
    }

    if (
      key.endsWith('_pct') ||
      key === 'vwap_distance' ||
      key === 'distance_to_hod'
    ) {
      return formatPctPoints(value as number | null | undefined)
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

  const extraFilters = (() => {
    switch (definition.id) {
      case 'day-gainers': {
        const request = draftRequest as ScannerRequestById['day-gainers']
        return (
          <div className="grid gap-2">
            <Label htmlFor="minTodayVolume">Min today volume</Label>
            <Input
              id="minTodayVolume"
              type="number"
              min={0}
              step={10000}
              value={String(request.minTodayVolume)}
              onChange={e =>
                setDraftRequest(prev => ({
                  ...prev,
                  minTodayVolume: coerceInt(
                    e.target.value,
                    (prev as ScannerRequestById['day-gainers']).minTodayVolume
                  ),
                }))
              }
            />
          </div>
        )
      }
      case 'hod-breakouts':
        return (
          <>
            <div className="grid gap-2">
              <Label htmlFor="minTodayVolume">Min today volume</Label>
              <Input
                id="minTodayVolume"
                type="number"
                min={0}
                step={10000}
                value={String(
                  (draftRequest as ScannerRequestById['hod-breakouts'])
                    .minTodayVolume
                )}
                onChange={e =>
                  setDraftRequest(prev => ({
                    ...prev,
                    minTodayVolume: coerceInt(
                      e.target.value,
                      (prev as ScannerRequestById['hod-breakouts'])
                        .minTodayVolume
                    ),
                  }))
                }
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="minRelVol">Min rel vol</Label>
              <Input
                id="minRelVol"
                type="number"
                step="0.1"
                value={String(
                  (draftRequest as ScannerRequestById['hod-breakouts'])
                    .minRelVol
                )}
                onChange={e =>
                  setDraftRequest(prev => ({
                    ...prev,
                    minRelVol: coerceNumber(
                      e.target.value,
                      (prev as ScannerRequestById['hod-breakouts']).minRelVol
                    ),
                  }))
                }
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="maxDistToHod">Max dist to HOD %</Label>
              <Input
                id="maxDistToHod"
                type="number"
                step="0.1"
                value={String(
                  (draftRequest as ScannerRequestById['hod-breakouts'])
                    .maxDistToHod
                )}
                onChange={e =>
                  setDraftRequest(prev => ({
                    ...prev,
                    maxDistToHod: coerceNumber(
                      e.target.value,
                      (prev as ScannerRequestById['hod-breakouts']).maxDistToHod
                    ),
                  }))
                }
              />
            </div>
          </>
        )
      case 'vwap-breakouts':
      case 'volume-spikes':
        return (
          <>
            <div className="grid gap-2">
              <Label htmlFor="minTodayVolume">Min today volume</Label>
              <Input
                id="minTodayVolume"
                type="number"
                min={0}
                step={10000}
                value={String(
                  (draftRequest as ScannerRequestById['vwap-breakouts'])
                    .minTodayVolume
                )}
                onChange={e =>
                  setDraftRequest(prev => ({
                    ...prev,
                    minTodayVolume: coerceInt(
                      e.target.value,
                      (prev as ScannerRequestById['vwap-breakouts'])
                        .minTodayVolume
                    ),
                  }))
                }
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="minRelVol">Min rel vol</Label>
              <Input
                id="minRelVol"
                type="number"
                step="0.1"
                value={String(
                  (draftRequest as ScannerRequestById['vwap-breakouts'])
                    .minRelVol
                )}
                onChange={e =>
                  setDraftRequest(prev => ({
                    ...prev,
                    minRelVol: coerceNumber(
                      e.target.value,
                      (prev as ScannerRequestById['vwap-breakouts']).minRelVol
                    ),
                  }))
                }
              />
            </div>
          </>
        )
      case 'hod-approach':
        return (
          <>
            <div className="grid gap-2">
              <Label htmlFor="minSetupPrice">Min setup price</Label>
              <Input
                id="minSetupPrice"
                type="number"
                step="0.01"
                value={String(
                  (draftRequest as ScannerRequestById['hod-approach'])
                    .minSetupPrice
                )}
                onChange={e =>
                  setDraftRequest(prev => ({
                    ...prev,
                    minSetupPrice: coerceNumber(
                      e.target.value,
                      (prev as ScannerRequestById['hod-approach']).minSetupPrice
                    ),
                  }))
                }
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="maxSetupPrice">Max setup price</Label>
              <Input
                id="maxSetupPrice"
                type="number"
                step="0.01"
                value={String(
                  (draftRequest as ScannerRequestById['hod-approach'])
                    .maxSetupPrice
                )}
                onChange={e =>
                  setDraftRequest(prev => ({
                    ...prev,
                    maxSetupPrice: coerceNumber(
                      e.target.value,
                      (prev as ScannerRequestById['hod-approach']).maxSetupPrice
                    ),
                  }))
                }
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="minTodayVolume">Min today volume</Label>
              <Input
                id="minTodayVolume"
                type="number"
                min={0}
                step={10000}
                value={String(
                  (draftRequest as ScannerRequestById['hod-approach'])
                    .minTodayVolume
                )}
                onChange={e =>
                  setDraftRequest(prev => ({
                    ...prev,
                    minTodayVolume: coerceInt(
                      e.target.value,
                      (prev as ScannerRequestById['hod-approach'])
                        .minTodayVolume
                    ),
                  }))
                }
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="minRangePct">Min range %</Label>
              <Input
                id="minRangePct"
                type="number"
                step="0.1"
                value={String(
                  (draftRequest as ScannerRequestById['hod-approach'])
                    .minRangePct
                )}
                onChange={e =>
                  setDraftRequest(prev => ({
                    ...prev,
                    minRangePct: coerceNumber(
                      e.target.value,
                      (prev as ScannerRequestById['hod-approach']).minRangePct
                    ),
                  }))
                }
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="minPosInRange">Min pos in range</Label>
              <Input
                id="minPosInRange"
                type="number"
                step="0.01"
                value={String(
                  (draftRequest as ScannerRequestById['hod-approach'])
                    .minPosInRange
                )}
                onChange={e =>
                  setDraftRequest(prev => ({
                    ...prev,
                    minPosInRange: coerceNumber(
                      e.target.value,
                      (prev as ScannerRequestById['hod-approach']).minPosInRange
                    ),
                  }))
                }
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="maxPosInRange">Max pos in range</Label>
              <Input
                id="maxPosInRange"
                type="number"
                step="0.001"
                value={String(
                  (draftRequest as ScannerRequestById['hod-approach'])
                    .maxPosInRange
                )}
                onChange={e =>
                  setDraftRequest(prev => ({
                    ...prev,
                    maxPosInRange: coerceNumber(
                      e.target.value,
                      (prev as ScannerRequestById['hod-approach']).maxPosInRange
                    ),
                  }))
                }
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="maxDistToHod">Max dist to HOD %</Label>
              <Input
                id="maxDistToHod"
                type="number"
                step="0.1"
                value={String(
                  (draftRequest as ScannerRequestById['hod-approach'])
                    .maxDistToHod
                )}
                onChange={e =>
                  setDraftRequest(prev => ({
                    ...prev,
                    maxDistToHod: coerceNumber(
                      e.target.value,
                      (prev as ScannerRequestById['hod-approach']).maxDistToHod
                    ),
                  }))
                }
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="minRelVol">Min rel vol</Label>
              <Input
                id="minRelVol"
                type="number"
                step="0.1"
                value={String(
                  (draftRequest as ScannerRequestById['hod-approach']).minRelVol
                )}
                onChange={e =>
                  setDraftRequest(prev => ({
                    ...prev,
                    minRelVol: coerceNumber(
                      e.target.value,
                      (prev as ScannerRequestById['hod-approach']).minRelVol
                    ),
                  }))
                }
              />
            </div>
            <div className="flex items-center gap-2 pt-6">
              <Checkbox
                id="adaptiveThresholds"
                checked={Boolean(
                  (draftRequest as ScannerRequestById['hod-approach'])
                    .adaptiveThresholds
                )}
                onCheckedChange={checked =>
                  setDraftRequest(prev => ({
                    ...prev,
                    adaptiveThresholds: Boolean(checked),
                  }))
                }
              />
              <Label htmlFor="adaptiveThresholds" className="text-sm">
                Adaptive thresholds
              </Label>
            </div>
          </>
        )
      case 'vwap-approach':
        return (
          <>
            <div className="grid gap-2">
              <Label htmlFor="minSetupPrice">Min setup price</Label>
              <Input
                id="minSetupPrice"
                type="number"
                step="0.01"
                value={String(
                  (draftRequest as ScannerRequestById['vwap-approach'])
                    .minSetupPrice
                )}
                onChange={e =>
                  setDraftRequest(prev => ({
                    ...prev,
                    minSetupPrice: coerceNumber(
                      e.target.value,
                      (prev as ScannerRequestById['vwap-approach'])
                        .minSetupPrice
                    ),
                  }))
                }
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="maxSetupPrice">Max setup price</Label>
              <Input
                id="maxSetupPrice"
                type="number"
                step="0.01"
                value={String(
                  (draftRequest as ScannerRequestById['vwap-approach'])
                    .maxSetupPrice
                )}
                onChange={e =>
                  setDraftRequest(prev => ({
                    ...prev,
                    maxSetupPrice: coerceNumber(
                      e.target.value,
                      (prev as ScannerRequestById['vwap-approach'])
                        .maxSetupPrice
                    ),
                  }))
                }
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="minTodayVolume">Min today volume</Label>
              <Input
                id="minTodayVolume"
                type="number"
                min={0}
                step={10000}
                value={String(
                  (draftRequest as ScannerRequestById['vwap-approach'])
                    .minTodayVolume
                )}
                onChange={e =>
                  setDraftRequest(prev => ({
                    ...prev,
                    minTodayVolume: coerceInt(
                      e.target.value,
                      (prev as ScannerRequestById['vwap-approach'])
                        .minTodayVolume
                    ),
                  }))
                }
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="minRangePct">Min range %</Label>
              <Input
                id="minRangePct"
                type="number"
                step="0.1"
                value={String(
                  (draftRequest as ScannerRequestById['vwap-approach'])
                    .minRangePct
                )}
                onChange={e =>
                  setDraftRequest(prev => ({
                    ...prev,
                    minRangePct: coerceNumber(
                      e.target.value,
                      (prev as ScannerRequestById['vwap-approach']).minRangePct
                    ),
                  }))
                }
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="minPosInRange">Min pos in range</Label>
              <Input
                id="minPosInRange"
                type="number"
                step="0.01"
                value={String(
                  (draftRequest as ScannerRequestById['vwap-approach'])
                    .minPosInRange
                )}
                onChange={e =>
                  setDraftRequest(prev => ({
                    ...prev,
                    minPosInRange: coerceNumber(
                      e.target.value,
                      (prev as ScannerRequestById['vwap-approach'])
                        .minPosInRange
                    ),
                  }))
                }
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="maxPosInRange">Max pos in range</Label>
              <Input
                id="maxPosInRange"
                type="number"
                step="0.001"
                value={String(
                  (draftRequest as ScannerRequestById['vwap-approach'])
                    .maxPosInRange
                )}
                onChange={e =>
                  setDraftRequest(prev => ({
                    ...prev,
                    maxPosInRange: coerceNumber(
                      e.target.value,
                      (prev as ScannerRequestById['vwap-approach'])
                        .maxPosInRange
                    ),
                  }))
                }
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="maxAbsVwapDistance">Max abs VWAP dist %</Label>
              <Input
                id="maxAbsVwapDistance"
                type="number"
                step="0.1"
                value={String(
                  (draftRequest as ScannerRequestById['vwap-approach'])
                    .maxAbsVwapDistance
                )}
                onChange={e =>
                  setDraftRequest(prev => ({
                    ...prev,
                    maxAbsVwapDistance: coerceNumber(
                      e.target.value,
                      (prev as ScannerRequestById['vwap-approach'])
                        .maxAbsVwapDistance
                    ),
                  }))
                }
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="minRelVol">Min rel vol</Label>
              <Input
                id="minRelVol"
                type="number"
                step="0.1"
                value={String(
                  (draftRequest as ScannerRequestById['vwap-approach'])
                    .minRelVol
                )}
                onChange={e =>
                  setDraftRequest(prev => ({
                    ...prev,
                    minRelVol: coerceNumber(
                      e.target.value,
                      (prev as ScannerRequestById['vwap-approach']).minRelVol
                    ),
                  }))
                }
              />
            </div>
            <div className="flex items-center gap-2 pt-6">
              <Checkbox
                id="adaptiveThresholds"
                checked={Boolean(
                  (draftRequest as ScannerRequestById['vwap-approach'])
                    .adaptiveThresholds
                )}
                onCheckedChange={checked =>
                  setDraftRequest(prev => ({
                    ...prev,
                    adaptiveThresholds: Boolean(checked),
                  }))
                }
              />
              <Label htmlFor="adaptiveThresholds" className="text-sm">
                Adaptive thresholds
              </Label>
            </div>
          </>
        )
      default:
        return null
    }
  })()

  return (
    <div className="grid gap-4 lg:grid-cols-[240px_1fr]">
      <Card className="h-fit lg:sticky lg:top-[72px]">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Scanners</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-1">
          {SCANNERS.map(s => (
            <NavLink
              key={s.id}
              to={`/scanners/${s.id}`}
              className={({ isActive }) =>
                cn(
                  'rounded-md px-2 py-2 text-sm hover:bg-muted',
                  isActive && 'bg-muted font-medium'
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
            <h1 className="text-xl font-semibold">{definition.title}</h1>
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

        <Card>
          <CardHeader className="pb-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <CardTitle className="text-base">Filters</CardTitle>
              <div className="flex items-center gap-2">
                <Label htmlFor="symbolFilter" className="text-xs">
                  Symbol
                </Label>
                <Input
                  id="symbolFilter"
                  placeholder="AAPL"
                  value={symbolFilter}
                  onChange={e => {
                    setPageIndex(0)
                    setSymbolFilter(e.target.value)
                  }}
                  className="h-8 w-40"
                />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4">
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <div className="grid gap-2">
                  <Label htmlFor="universeLimit">Universe limit</Label>
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
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="limit">Result limit</Label>
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
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="minPrice">Min price</Label>
                  <Input
                    id="minPrice"
                    type="number"
                    step="0.01"
                    value={String(draftRequest.minPrice)}
                    onChange={e =>
                      setDraftRequest(prev => ({
                        ...prev,
                        minPrice: coerceNumber(e.target.value, prev.minPrice),
                      }))
                    }
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="maxPrice">Max price</Label>
                  <Input
                    id="maxPrice"
                    type="number"
                    step="0.01"
                    value={String(draftRequest.maxPrice)}
                    onChange={e =>
                      setDraftRequest(prev => ({
                        ...prev,
                        maxPrice: coerceNumber(e.target.value, prev.maxPrice),
                      }))
                    }
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="minAvgVol">Min avg vol</Label>
                  <Input
                    id="minAvgVol"
                    type="number"
                    min={0}
                    step={10000}
                    value={String(draftRequest.minAvgVol)}
                    onChange={e =>
                      setDraftRequest(prev => ({
                        ...prev,
                        minAvgVol: coerceInt(e.target.value, prev.minAvgVol),
                      }))
                    }
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="minChangePct">Min change %</Label>
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
                  />
                </div>
                <div className="grid gap-2">
                  <Label>Interval</Label>
                  <Select
                    value={draftRequest.interval}
                    onValueChange={value =>
                      setDraftRequest(prev => ({
                        ...prev,
                        interval: value,
                      }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select interval" />
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
                <div className="grid gap-2">
                  <Label>Period</Label>
                  <Select
                    value={draftRequest.period}
                    onValueChange={value =>
                      setDraftRequest(prev => ({
                        ...prev,
                        period: value,
                      }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select period" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1d">1d</SelectItem>
                      <SelectItem value="5d">5d</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center gap-2 pt-6">
                  <Checkbox
                    id="prepost"
                    checked={draftRequest.prepost}
                    onCheckedChange={checked =>
                      setDraftRequest(prev => ({
                        ...prev,
                        prepost: Boolean(checked),
                      }))
                    }
                  />
                  <Label htmlFor="prepost" className="text-sm">
                    Include pre/post
                  </Label>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="closeSlopeN">Close slope N</Label>
                  <Input
                    id="closeSlopeN"
                    type="number"
                    min={2}
                    max={30}
                    value={String(draftRequest.closeSlopeN)}
                    onChange={e =>
                      setDraftRequest(prev => ({
                        ...prev,
                        closeSlopeN: coerceInt(
                          e.target.value,
                          prev.closeSlopeN
                        ),
                      }))
                    }
                  />
                </div>
                {extraFilters}
              </div>
              <Separator />
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="text-xs text-muted-foreground">
                  Applied limit: {appliedRequest.limit} | Universe:{' '}
                  {appliedRequest.universeLimit} | Sorted by:{' '}
                  {query.data?.sorted_by || '-'}
                </div>
                <div className="flex items-center gap-2">
                  <Label className="text-xs">Rows / page</Label>
                  <Select
                    value={String(pageSize)}
                    onValueChange={value => {
                      setPageIndex(0)
                      setPageSize(coerceInt(value, pageSize))
                    }}
                  >
                    <SelectTrigger className="h-8 w-[110px]">
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
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <CardTitle className="text-base">Results</CardTitle>
              <div className="text-xs text-muted-foreground">
                {query.isFetching
                  ? 'Loading...'
                  : query.isError
                    ? 'Error'
                    : `${totalRows.toLocaleString()} rows`}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {query.isError ? (
              <div className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm">
                {query.error instanceof Error
                  ? query.error.message
                  : 'Failed to load scanner results.'}
              </div>
            ) : (
              <div className="grid gap-3">
                <Table>
                  <TableHeader>
                    <TableRow>
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
                              col.align === 'right' && 'text-right'
                            )}
                          >
                            <button
                              type="button"
                              onClick={() => toggleSort(col.key)}
                              className={cn(
                                'inline-flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground',
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
                          colSpan={definition.columns.length}
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
                          {definition.columns.map(col => {
                            const value = col.getValue(row as never)
                            return (
                              <TableCell
                                key={col.key}
                                className={cn(
                                  'whitespace-nowrap',
                                  col.align === 'right' &&
                                    'text-right font-variant-numeric tabular-nums'
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

                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="text-xs text-muted-foreground">
                    Page {currentPageIndex + 1} of {totalPages} |{' '}
                    {totalRows.toLocaleString()} rows
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
