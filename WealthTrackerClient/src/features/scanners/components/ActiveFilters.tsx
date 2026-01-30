import { X } from 'lucide-react'
import { Badge } from '@/components/ui/badge'

interface FilterValue {
  key: string
  label: string
  value: string | number | boolean
  defaultValue: string | number | boolean
}

interface ActiveFiltersProps {
  filters: FilterValue[]
  onRemove: (key: string) => void
}

export function ActiveFilters({ filters, onRemove }: ActiveFiltersProps) {
  const activeFilters = filters.filter(f => f.value !== f.defaultValue)

  if (activeFilters.length === 0) return null

  return (
    <div className="flex flex-wrap gap-2">
      {activeFilters.map(filter => (
        <Badge
          key={filter.key}
          variant="secondary"
          className="gap-1.5 pr-1 text-xs"
        >
          <span className="text-xs font-semibold text-muted-foreground">
            {filter.label}
          </span>
          <span className="font-medium">
            {typeof filter.value === 'boolean'
              ? filter.value
                ? 'Yes'
                : 'No'
              : String(filter.value)}
          </span>
          <button
            type="button"
            onClick={() => onRemove(filter.key)}
            className="ml-1 rounded-full p-0.5 hover:bg-muted/60"
          >
            <X className="h-3 w-3" />
          </button>
        </Badge>
      ))}
    </div>
  )
}
