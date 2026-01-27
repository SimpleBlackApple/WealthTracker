import type {
  AuthResponse,
  LoginRequest,
  RefreshRequest,
  RefreshResponse,
} from '../types/auth'
import type { AxiosInstance, AxiosRequestConfig } from 'axios'
import axios from 'axios'

const API_BASE =
  import.meta.env.VITE_API_BASE_URL || 'http://localhost:5141/api'

class AuthService {
  private axiosInstance: AxiosInstance
  private authInstance: AxiosInstance

  constructor() {
    this.authInstance = axios.create({
      baseURL: API_BASE,
      headers: {
        'Content-Type': 'application/json',
      },
    })
    this.axiosInstance = this.createAxiosInstance()
  }

  private createAxiosInstance(): AxiosInstance {
    const instance = axios.create({
      baseURL: API_BASE,
      headers: {
        'Content-Type': 'application/json',
      },
    })

    // Request interceptor to add auth token
    instance.interceptors.request.use(
      config => {
        const token = localStorage.getItem('accessToken')
        if (token) {
          config.headers.Authorization = `Bearer ${token}`
        }
        return config
      },
      error => Promise.reject(error)
    )

    // Response interceptor to handle token refresh
    instance.interceptors.response.use(
      response => response,
      async error => {
        const originalRequest = error.config as AxiosRequestConfig & {
          _retry?: boolean
          skipAuthRefresh?: boolean
        }

        if (error.response?.status === 401 && !originalRequest._retry) {
          const requestUrl = originalRequest.url ?? ''
          if (
            originalRequest.skipAuthRefresh ||
            requestUrl.includes('/auth/refresh')
          ) {
            this.clearAuthStorage()
            this.redirectToLogin()
            return Promise.reject(error)
          }

          originalRequest._retry = true

          try {
            const refreshToken = localStorage.getItem('refreshToken')
            if (refreshToken) {
              const response = await this.refreshToken(refreshToken)
              const newAccessToken = response.data.accessToken

              localStorage.setItem('accessToken', newAccessToken)

              if (originalRequest.headers) {
                originalRequest.headers.Authorization = `Bearer ${newAccessToken}`
              }
              return instance(originalRequest)
            }

            this.clearAuthStorage()
            this.redirectToLogin()
          } catch (refreshError) {
            this.clearAuthStorage()
            this.redirectToLogin()
            return Promise.reject(refreshError)
          }
        }

        return Promise.reject(error)
      }
    )

    return instance
  }

  async loginWithGoogle(
    code: string,
    redirectUri: string
  ): Promise<AuthResponse> {
    const request: LoginRequest = { code, redirectUri }
    const response = await this.authInstance.post<AuthResponse>(
      '/auth/google/callback',
      request
    )
    return response.data
  }

  async refreshToken(refreshToken: string) {
    const request: RefreshRequest = { refreshToken }
    return await this.authInstance.post<RefreshResponse>(
      '/auth/refresh',
      request
    )
  }

  async logout(refreshToken: string): Promise<void> {
    await this.authInstance.post('/auth/logout', { refreshToken })
  }

  getAxiosInstance(): AxiosInstance {
    return this.axiosInstance
  }

  private clearAuthStorage() {
    localStorage.removeItem('accessToken')
    localStorage.removeItem('refreshToken')
    localStorage.removeItem('user')
  }

  private redirectToLogin() {
    if (window.location.pathname !== '/login') {
      window.location.href = '/login'
    }
  }
}

export const authService = new AuthService()
