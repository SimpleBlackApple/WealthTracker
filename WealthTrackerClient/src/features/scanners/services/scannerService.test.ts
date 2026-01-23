import { describe, it, expect, beforeEach, vi } from 'vitest'
import type { ScannerResponseById } from '@/features/scanners/types/scanners'

const mocks = vi.hoisted(() => ({
  post: vi.fn(),
}))

vi.mock('@/features/auth/services/authService', () => ({
  authService: {
    getAxiosInstance: () => ({
      post: mocks.post,
    }),
  },
}))

import { scannerService } from './scannerService'

describe('scannerService', () => {
  beforeEach(() => {
    mocks.post.mockReset()
  })

  it('posts to the day gainers endpoint', async () => {
    const response: ScannerResponseById['day-gainers'] = {
      scanner: 'day_gainers',
      sorted_by: 'change_pct',
      results: [],
    }
    mocks.post.mockResolvedValue({ data: response })

    const result = await scannerService.runScanner('day-gainers', {
      universeLimit: 50,
      limit: 25,
      minPrice: 1.5,
      maxPrice: 30,
      minAvgVol: 1_000_000,
      minChangePct: 3,
      interval: '5m',
      period: '1d',
      prepost: false,
      closeSlopeN: 6,
      minTodayVolume: 0,
    })

    expect(mocks.post).toHaveBeenCalledWith('/scanner/day-gainers', {
      universeLimit: 50,
      limit: 25,
      minPrice: 1.5,
      maxPrice: 30,
      minAvgVol: 1_000_000,
      minChangePct: 3,
      interval: '5m',
      period: '1d',
      prepost: false,
      closeSlopeN: 6,
      minTodayVolume: 0,
    })
    expect(result.scanner).toBe('day_gainers')
  })

  it('posts to the vwap approach endpoint', async () => {
    const response: ScannerResponseById['vwap-approach'] = {
      scanner: 'vwap_approach',
      sorted_by: 'vwap_distance',
      results: [],
    }
    mocks.post.mockResolvedValue({ data: response })

    const result = await scannerService.runScanner('vwap-approach', {
      universeLimit: 50,
      limit: 25,
      minPrice: 1.5,
      maxPrice: 30,
      minAvgVol: 1_000_000,
      minChangePct: 3,
      interval: '5m',
      period: '1d',
      prepost: false,
      closeSlopeN: 6,
      minSetupPrice: 2,
      maxSetupPrice: 60,
      minTodayVolume: 200_000,
      minRangePct: 7,
      minPosInRange: 0.5,
      maxPosInRange: 0.995,
      maxAbsVwapDistance: 1.7,
      minRelVol: 1.2,
      adaptiveThresholds: true,
    })

    expect(mocks.post).toHaveBeenCalledWith('/scanner/vwap-approach', {
      universeLimit: 50,
      limit: 25,
      minPrice: 1.5,
      maxPrice: 30,
      minAvgVol: 1_000_000,
      minChangePct: 3,
      interval: '5m',
      period: '1d',
      prepost: false,
      closeSlopeN: 6,
      minSetupPrice: 2,
      maxSetupPrice: 60,
      minTodayVolume: 200_000,
      minRangePct: 7,
      minPosInRange: 0.5,
      maxPosInRange: 0.995,
      maxAbsVwapDistance: 1.7,
      minRelVol: 1.2,
      adaptiveThresholds: true,
    })
    expect(result.scanner).toBe('vwap_approach')
  })
})
