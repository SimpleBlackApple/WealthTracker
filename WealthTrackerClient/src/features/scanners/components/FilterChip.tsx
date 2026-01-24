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
          'flex items-center gap-1.5 whitespace-nowrap rounded-full border px-3 py-1.5 text-xs font-medium transition-colors',
          isModified
            ? 'border-primary bg-primary/5 text-primary'
            : 'border-border bg-background text-muted-foreground hover:bg-muted',
          active && 'bg-muted ring-1 ring-primary'
        )}
      >
        <span>{label}</span>
        <span className="h-3 w-[1px] bg-border mx-0.5" />
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
