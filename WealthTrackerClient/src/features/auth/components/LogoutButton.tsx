import { Button } from '@/components/ui/button'
import { useAuthStore } from '@/stores/authStore'

export function LogoutButton() {
  const { logout, user } = useAuthStore()

  const handleLogout = async () => {
    await logout()
    window.location.href = '/'
  }

  if (!user) return null

  return (
    <div className="flex items-center gap-4">
      <span className="text-sm text-gray-600">{user.name}</span>
      <Button onClick={handleLogout} variant="outline">
        Logout
      </Button>
    </div>
  )
}
