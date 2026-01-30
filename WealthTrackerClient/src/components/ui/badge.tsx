import { cva, type VariantProps } from 'class-variance-authority'

import { cn } from '@/lib/utils'

const badgeVariants = cva(
  'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/25',
  {
    variants: {
      variant: {
        default: 'border-primary/25 bg-primary/10 text-primary',
        secondary: 'border-border/70 bg-secondary text-secondary-foreground',
        destructive: 'border-destructive/25 bg-destructive/10 text-destructive',
        outline: 'border-border/70 bg-card text-foreground',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
)

function Badge({
  className,
  variant,
  ...props
}: React.ComponentProps<'div'> & VariantProps<typeof badgeVariants>) {
  return (
    <div
      data-slot="badge"
      className={cn(badgeVariants({ variant }), className)}
      {...props}
    />
  )
}

export { Badge, badgeVariants }
