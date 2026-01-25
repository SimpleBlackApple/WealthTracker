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
          'flex items-center gap-1.5 whitespace-nowrap rounded-full border px-3 py-1.5 text-xs font-semibold transition-all',
          isModified
            ? 'border-primary/40 bg-primary/10 text-primary shadow-sm'
            : 'border-border/60 bg-card/70 text-muted-foreground hover:border-primary/30 hover:text-foreground',
          active && 'ring-1 ring-primary/40 shadow-md'
        )}
      >
        <span>{label}</span>
        <span className="mx-0.5 h-3 w-[1px] bg-border/60" />
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
