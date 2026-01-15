export interface User {
  id: number
  name: string
  email: string
}

export interface AuthTokens {
  accessToken: string
  refreshToken: string
}

export interface AuthResponse {
  accessToken: string
  refreshToken: string
  user: User
}

export interface RefreshResponse {
  accessToken: string
}

export interface LoginRequest {
  code: string
  redirectUri: string
}

export interface RefreshRequest {
  refreshToken: string
}

export interface GoogleOAuthConfig {
  clientId: string
  redirectUri: string
}
