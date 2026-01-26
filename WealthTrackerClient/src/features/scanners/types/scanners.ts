export type ScannerId =
  | 'day-gainers'
  | 'hod-breakouts'
  | 'vwap-breakouts'
  | 'volume-spikes'
  | 'hod-approach'
  | 'vwap-approach'

export type SortDirection = 'asc' | 'desc'

export type ScannerUniverseRequest = {
  universeLimit: number
  limit: number
  minPrice: number
  maxPrice: number
  minAvgVol: number
  minChangePct: number
  interval: string
  period: string
  prepost: boolean
  closeSlopeN: number
  asOf?: string
}

export type DayGainersRequest = ScannerUniverseRequest & {
  minTodayVolume: number
}

export type HodBreakoutsRequest = ScannerUniverseRequest & {
  minTodayVolume: number
  minRelVol: number
  maxDistToHod: number
}

export type VwapBreakoutsRequest = ScannerUniverseRequest & {
  minTodayVolume: number
  minRelVol: number
}

export type VolumeSpikesRequest = ScannerUniverseRequest & {
  minTodayVolume: number
  minRelVol: number
}

export type HodApproachRequest = ScannerUniverseRequest & {
  minSetupPrice: number
  maxSetupPrice: number
  minTodayVolume: number
  minRangePct: number
  minPosInRange: number
  maxPosInRange: number
  maxDistToHod: number
  minRelVol: number
  adaptiveThresholds: boolean
}

export type VwapApproachRequest = ScannerUniverseRequest & {
  minSetupPrice: number
  maxSetupPrice: number
  minTodayVolume: number
  minRangePct: number
  minPosInRange: number
  maxPosInRange: number
  maxAbsVwapDistance: number
  minRelVol: number
  adaptiveThresholds: boolean
}

export type ScannerRequestById = {
  'day-gainers': DayGainersRequest
  'hod-breakouts': HodBreakoutsRequest
  'vwap-breakouts': VwapBreakoutsRequest
  'volume-spikes': VolumeSpikesRequest
  'hod-approach': HodApproachRequest
  'vwap-approach': VwapApproachRequest
}

export type DayGainerRow = {
  symbol: string
  exchange?: string | null
  price?: number | null
  prev_close?: number | null
  change_pct?: number | null
  volume?: number | null
  relative_volume?: number | null
  float_shares?: number | null
  market_cap?: number | null
}

export type IntradayMomentumRow = {
  symbol: string
  exchange?: string | null
  price?: number | null
  day_high?: number | null
  day_low?: number | null
  last_bar_high?: number | null
  range_pct?: number | null
  relative_volume?: number | null
  price_change_pct?: number | null
  avg_volume_20d?: number | null
  vwap?: number | null
  vwap_distance?: number | null
  distance_to_hod?: number | null
  break_type?: string | null
}

export type HodVwapApproachRow = {
  symbol: string
  exchange?: string | null
  price?: number | null
  hod?: number | null
  distance_to_hod?: number | null
  vwap?: number | null
  vwap_distance?: number | null
  range_pct?: number | null
  relative_volume?: number | null
}

export type ScannerResponse<TRow> = {
  scanner: string
  sorted_by: string
  results: TRow[]
}

export type ScannerResponseById = {
  'day-gainers': ScannerResponse<DayGainerRow>
  'hod-breakouts': ScannerResponse<IntradayMomentumRow>
  'vwap-breakouts': ScannerResponse<IntradayMomentumRow>
  'volume-spikes': ScannerResponse<IntradayMomentumRow>
  'hod-approach': ScannerResponse<HodVwapApproachRow>
  'vwap-approach': ScannerResponse<HodVwapApproachRow>
}

export type ColumnDef<TRow> = {
  key: string
  header: string
  align?: 'left' | 'right'
  getValue: (row: TRow) => string | number | null | undefined
  sortValue?: (row: TRow) => string | number | null | undefined
}

export type ScannerDefinition<TScannerId extends ScannerId> = {
  id: TScannerId
  title: string
  description: string
  defaultRequest: ScannerRequestById[TScannerId]
  defaultSort: { key: string; direction: SortDirection }
  columns: ColumnDef<ScannerResponseById[TScannerId]['results'][number]>[]
}

const baseDefaults: Omit<ScannerUniverseRequest, 'asOf'> = {
  universeLimit: 50,
  limit: 25,
  minPrice: 1.5,
  maxPrice: 30,
  minAvgVol: 1_000_000,
  minChangePct: 3.0,
  interval: '5m',
  period: '1d',
  prepost: false,
  closeSlopeN: 6,
}

const defineScanner = <TScannerId extends ScannerId>(
  scanner: ScannerDefinition<TScannerId>
) => scanner

export const SCANNERS = [
  defineScanner({
    id: 'day-gainers',
    title: 'Day Gainers',
    description: 'Regular-session gainers with liquidity and price filters.',
    defaultRequest: {
      ...baseDefaults,
      minChangePct: 0.0,
      minTodayVolume: 0,
    },
    defaultSort: { key: 'change_pct', direction: 'desc' },
    columns: [
      { key: 'symbol', header: 'Symbol', getValue: row => row.symbol },
      { key: 'price', header: 'Price', align: 'right', getValue: r => r.price },
      {
        key: 'change_pct',
        header: 'Change %',
        align: 'right',
        getValue: r => r.change_pct ?? null,
      },
      {
        key: 'volume',
        header: 'Volume',
        align: 'right',
        getValue: r => r.volume ?? null,
      },
      {
        key: 'relative_volume',
        header: 'Rel Vol',
        align: 'right',
        getValue: r => r.relative_volume ?? null,
      },
      {
        key: 'float_shares',
        header: 'Float',
        align: 'right',
        getValue: r => r.float_shares ?? null,
      },
      {
        key: 'market_cap',
        header: 'Mkt Cap',
        align: 'right',
        getValue: r => r.market_cap ?? null,
      },
    ],
  }),
  defineScanner({
    id: 'hod-breakouts',
    title: 'HOD Breakouts',
    description: 'Names breaking HOD now with strong volume + momentum.',
    defaultRequest: {
      ...baseDefaults,
      minTodayVolume: 150_000,
      minRelVol: 1.4,
      maxDistToHod: 1.0,
    },
    defaultSort: { key: 'price_change_pct', direction: 'desc' },
    columns: [
      { key: 'symbol', header: 'Symbol', getValue: row => row.symbol },
      { key: 'price', header: 'Price', align: 'right', getValue: r => r.price },
      {
        key: 'price_change_pct',
        header: 'Chg %',
        align: 'right',
        getValue: r => r.price_change_pct ?? null,
      },
      {
        key: 'range_pct',
        header: 'Range %',
        align: 'right',
        getValue: r => r.range_pct ?? null,
      },
      {
        key: 'relative_volume',
        header: 'Rel Vol',
        align: 'right',
        getValue: r => r.relative_volume ?? null,
      },
      {
        key: 'distance_to_hod',
        header: 'Dist to HOD %',
        align: 'right',
        getValue: r => r.distance_to_hod ?? null,
      },
      {
        key: 'day_high',
        header: 'HOD',
        align: 'right',
        getValue: r => r.day_high ?? null,
      },
      {
        key: 'vwap',
        header: 'VWAP',
        align: 'right',
        getValue: r => r.vwap ?? null,
      },
      {
        key: 'vwap_distance',
        header: 'VWAP Dist %',
        align: 'right',
        getValue: r => r.vwap_distance ?? null,
      },
      {
        key: 'break_type',
        header: 'Break',
        getValue: r => r.break_type ?? null,
      },
    ],
  }),
  defineScanner({
    id: 'vwap-breakouts',
    title: 'VWAP Breakouts',
    description: 'Names reclaiming/holding VWAP with strong volume + momentum.',
    defaultRequest: {
      ...baseDefaults,
      minTodayVolume: 200_000,
      minRelVol: 1.7,
    },
    defaultSort: { key: 'price_change_pct', direction: 'desc' },
    columns: [
      { key: 'symbol', header: 'Symbol', getValue: row => row.symbol },
      { key: 'price', header: 'Price', align: 'right', getValue: r => r.price },
      {
        key: 'price_change_pct',
        header: 'Chg %',
        align: 'right',
        getValue: r => r.price_change_pct ?? null,
      },
      {
        key: 'range_pct',
        header: 'Range %',
        align: 'right',
        getValue: r => r.range_pct ?? null,
      },
      {
        key: 'relative_volume',
        header: 'Rel Vol',
        align: 'right',
        getValue: r => r.relative_volume ?? null,
      },
      {
        key: 'vwap',
        header: 'VWAP',
        align: 'right',
        getValue: r => r.vwap ?? null,
      },
      {
        key: 'vwap_distance',
        header: 'VWAP Dist %',
        align: 'right',
        getValue: r => r.vwap_distance ?? null,
      },
      {
        key: 'break_type',
        header: 'Break',
        getValue: r => r.break_type ?? null,
      },
    ],
  }),
  defineScanner({
    id: 'volume-spikes',
    title: 'Volume Spikes',
    description: 'High relative-volume movers with a minimum gain threshold.',
    defaultRequest: {
      ...baseDefaults,
      minTodayVolume: 200_000,
      minRelVol: 2.0,
    },
    defaultSort: { key: 'relative_volume', direction: 'desc' },
    columns: [
      { key: 'symbol', header: 'Symbol', getValue: row => row.symbol },
      { key: 'price', header: 'Price', align: 'right', getValue: r => r.price },
      {
        key: 'price_change_pct',
        header: 'Chg %',
        align: 'right',
        getValue: r => r.price_change_pct ?? null,
      },
      {
        key: 'relative_volume',
        header: 'Rel Vol',
        align: 'right',
        getValue: r => r.relative_volume ?? null,
      },
      {
        key: 'range_pct',
        header: 'Range %',
        align: 'right',
        getValue: r => r.range_pct ?? null,
      },
      {
        key: 'avg_volume_20d',
        header: 'Avg Vol 20d',
        align: 'right',
        getValue: r => r.avg_volume_20d ?? null,
      },
    ],
  }),
  defineScanner({
    id: 'hod-approach',
    title: 'HOD Approach',
    description: 'Near-breakout setups approaching HOD.',
    defaultRequest: {
      ...baseDefaults,
      minSetupPrice: 2.0,
      maxSetupPrice: 60.0,
      minTodayVolume: 200_000,
      minRangePct: 7.0,
      minPosInRange: 0.5,
      maxPosInRange: 0.995,
      maxDistToHod: 2.0,
      minRelVol: 1.2,
      adaptiveThresholds: true,
    },
    defaultSort: { key: 'distance_to_hod', direction: 'asc' },
    columns: [
      { key: 'symbol', header: 'Symbol', getValue: row => row.symbol },
      { key: 'price', header: 'Price', align: 'right', getValue: r => r.price },
      {
        key: 'range_pct',
        header: 'Range %',
        align: 'right',
        getValue: r => r.range_pct ?? null,
      },
      {
        key: 'relative_volume',
        header: 'Rel Vol',
        align: 'right',
        getValue: r => r.relative_volume ?? null,
      },
      {
        key: 'hod',
        header: 'HOD',
        align: 'right',
        getValue: r => r.hod ?? null,
      },
      {
        key: 'distance_to_hod',
        header: 'Dist to HOD %',
        align: 'right',
        getValue: r => r.distance_to_hod ?? null,
      },
    ],
  }),
  defineScanner({
    id: 'vwap-approach',
    title: 'VWAP Approach',
    description: 'Near-breakout setups approaching VWAP.',
    defaultRequest: {
      ...baseDefaults,
      minSetupPrice: 2.0,
      maxSetupPrice: 60.0,
      minTodayVolume: 200_000,
      minRangePct: 7.0,
      minPosInRange: 0.5,
      maxPosInRange: 0.995,
      maxAbsVwapDistance: 1.7,
      minRelVol: 1.2,
      adaptiveThresholds: true,
    },
    defaultSort: { key: 'vwap_distance', direction: 'asc' },
    columns: [
      { key: 'symbol', header: 'Symbol', getValue: row => row.symbol },
      { key: 'price', header: 'Price', align: 'right', getValue: r => r.price },
      {
        key: 'range_pct',
        header: 'Range %',
        align: 'right',
        getValue: r => r.range_pct ?? null,
      },
      {
        key: 'relative_volume',
        header: 'Rel Vol',
        align: 'right',
        getValue: r => r.relative_volume ?? null,
      },
      {
        key: 'vwap',
        header: 'VWAP',
        align: 'right',
        getValue: r => r.vwap ?? null,
      },
      {
        key: 'vwap_distance',
        header: 'VWAP Dist %',
        align: 'right',
        getValue: r => r.vwap_distance ?? null,
        sortValue: r =>
          r.vwap_distance === null || r.vwap_distance === undefined
            ? null
            : Math.abs(r.vwap_distance),
      },
    ],
  }),
]
