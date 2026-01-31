export type RuntimeConfig = {
  apiBaseUrl: string
  googleClientId: string
  googleRedirectUri: string
}

declare global {
  interface Window {
    __WEALTHTRACKER_CONFIG__?: Partial<RuntimeConfig>
  }
}

export function getRuntimeConfig(): RuntimeConfig {
  const fromWindow =
    typeof window !== 'undefined' ? window.__WEALTHTRACKER_CONFIG__ : undefined

  return {
    apiBaseUrl:
      fromWindow?.apiBaseUrl || import.meta.env.VITE_API_BASE_URL || '',
    googleClientId:
      fromWindow?.googleClientId || import.meta.env.VITE_GOOGLE_CLIENT_ID || '',
    googleRedirectUri:
      fromWindow?.googleRedirectUri ||
      import.meta.env.VITE_GOOGLE_REDIRECT_URI ||
      '',
  }
}
