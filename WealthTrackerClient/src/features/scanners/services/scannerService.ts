import type { AxiosInstance } from 'axios'

import { authService } from '@/features/auth/services/authService'
import type {
  ScannerId,
  ScannerRequestById,
  ScannerResponseById,
} from '@/features/scanners/types/scanners'

const scannerPathById: Record<ScannerId, string> = {
  holdings: '/scanner/holdings',
  'day-gainers': '/scanner/day-gainers',
  'hod-breakouts': '/scanner/hod-breakouts',
  'vwap-breakouts': '/scanner/vwap-breakouts',
  'volume-spikes': '/scanner/volume-spikes',
  'hod-approach': '/scanner/hod-approach',
  'vwap-approach': '/scanner/vwap-approach',
}

class ScannerService {
  private axiosInstance: AxiosInstance

  constructor() {
    this.axiosInstance = authService.getAxiosInstance()
  }

  async runScanner<TScannerId extends ScannerId>(
    scannerId: TScannerId,
    request: ScannerRequestById[TScannerId]
  ): Promise<ScannerResponseById[TScannerId]> {
    const path = scannerPathById[scannerId]
    const response = await this.axiosInstance.post<
      ScannerResponseById[TScannerId]
    >(path, request)
    return response.data
  }
}

export const scannerService = new ScannerService()
