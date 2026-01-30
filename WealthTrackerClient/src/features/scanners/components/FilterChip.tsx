import { ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'
import { forwardRef, type ComponentProps } from 'react'

interface FilterChipProps {
  label: string
  value: string | number | boolean
  defaultValue: string | number | boolean
  active?: boolean
}

type Props = FilterChipProps & ComponentProps<'button'>

export const FilterChip = forwardRef<HTMLButtonElement, Props>(
  ({ label, value, defaultValue, active, ...props }, ref) => {
    const isModified = value !== defaultValue

    return (
      <button
        ref={ref}
        type="button"
        {...props}
        className={cn(
          'flex items-center gap-2 whitespace-nowrap rounded-full border px-3 py-1.5 text-sm font-semibold transition-colors',
          isModified
            ? 'border-primary/30 bg-primary/10 text-primary'
            : 'border-border/70 bg-card text-muted-foreground hover:bg-secondary/50 hover:text-foreground',
          active && 'ring-[3px] ring-ring/20'
        )}
      >
        <span>{label}</span>
        <span className="h-4 w-px bg-border/70" />
        <span
          className={cn(
            'font-semibold',
            isModified ? 'text-primary' : 'text-foreground'
          )}
        >
          {typeof value === 'boolean' ? (value ? 'Yes' : 'No') : String(value)}
        </span>
        <ChevronDown className="h-3.5 w-3.5 opacity-50" />
      </button>
    )
  }
)

FilterChip.displayName = 'FilterChip'
