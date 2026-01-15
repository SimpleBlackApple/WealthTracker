import type {
  AuthResponse,
  LoginRequest,
  RefreshRequest,
  RefreshResponse,
} from '../types/auth'
import type { AxiosInstance } from 'axios'
import axios from 'axios'

const API_BASE =
  import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api'

class AuthService {
  private axiosInstance: AxiosInstance

  constructor() {
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
        const originalRequest = error.config

        if (error.response?.status === 401 && !originalRequest._retry) {
          originalRequest._retry = true

          try {
            const refreshToken = localStorage.getItem('refreshToken')
            if (refreshToken) {
              const response = await this.refreshToken(refreshToken)
              const newAccessToken = response.data.accessToken

              localStorage.setItem('accessToken', newAccessToken)

              originalRequest.headers.Authorization = `Bearer ${newAccessToken}`
              return instance(originalRequest)
            }
          } catch (refreshError) {
            localStorage.removeItem('accessToken')
            localStorage.removeItem('refreshToken')
            localStorage.removeItem('user')
            window.location.href = '/login'
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
    const response = await this.axiosInstance.post<AuthResponse>(
      '/auth/google/callback',
      request
    )
    return response.data
  }

  async refreshToken(refreshToken: string) {
    const request: RefreshRequest = { refreshToken }
    return await this.axiosInstance.post<RefreshResponse>(
      '/auth/refresh',
      request
    )
  }

  async logout(refreshToken: string): Promise<void> {
    await this.axiosInstance.post('/auth/logout', { refreshToken })
  }

  getAxiosInstance(): AxiosInstance {
    return this.axiosInstance
  }
}

export const authService = new AuthService()
