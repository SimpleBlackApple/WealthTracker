import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { cn } from '@/lib/utils'

interface StockSymbolBadgeProps {
  symbol: string
  className?: string
}

// Generate a consistent color based on symbol hash
function getSymbolColor(symbol: string): string {
  const colors = [
    'bg-blue-500',
    'bg-emerald-500',
    'bg-violet-500',
    'bg-amber-500',
    'bg-rose-500',
    'bg-cyan-500',
    'bg-indigo-500',
    'bg-orange-500',
    'bg-teal-500',
    'bg-pink-500',
  ]

  let hash = 0
  for (let i = 0; i < symbol.length; i++) {
    hash = symbol.charCodeAt(i) + ((hash << 5) - hash)
  }

  return colors[Math.abs(hash) % colors.length]
}

export function StockSymbolBadge({ symbol, className }: StockSymbolBadgeProps) {
  const colorClass = getSymbolColor(symbol)
  const letter = symbol.charAt(0).toUpperCase()

  return (
    <Avatar className={cn('h-8 w-8', className)}>
      <AvatarFallback
        className={cn(colorClass, 'text-white text-xs font-semibold')}
      >
        {letter}
      </AvatarFallback>
    </Avatar>
  )
}
