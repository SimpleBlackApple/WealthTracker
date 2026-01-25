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
      <div className="hidden items-center gap-2 rounded-full border border-border/60 bg-card/60 px-3 py-1 text-xs text-muted-foreground sm:flex">
        <span className="h-2 w-2 rounded-full bg-primary/70" />
        <span className="font-medium text-foreground/90">{user.name}</span>
      </div>
      <Button onClick={handleLogout} variant="outline" size="sm">
        Logout
      </Button>
    </div>
  )
}
