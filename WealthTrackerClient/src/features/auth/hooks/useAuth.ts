import { useAuthStore } from '@/stores/authStore'
import { useEffect } from 'react'

export function useAuth() {
  const { isAuthenticated, user, restoreAuth } = useAuthStore()

  useEffect(() => {
    restoreAuth()
  }, [restoreAuth])

  return {
    isAuthenticated,
    user,
  }
}
