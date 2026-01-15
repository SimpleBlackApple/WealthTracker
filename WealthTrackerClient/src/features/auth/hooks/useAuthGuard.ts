import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/stores/authStore'

export function useAuthGuard(requireAuth = true) {
  const navigate = useNavigate()
  const { isAuthenticated, user } = useAuthStore()

  useEffect(() => {
    if (requireAuth && !isAuthenticated) {
      navigate('/login')
    } else if (!requireAuth && isAuthenticated) {
      navigate('/')
    }
  }, [isAuthenticated, navigate, requireAuth])

  return { isAuthenticated, user }
}
