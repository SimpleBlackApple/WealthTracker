import * as React from 'react'

import { cn } from '@/lib/utils'

type AlertVariant = 'default' | 'destructive'

export function Alert({
  className,
  variant = 'default',
  ...props
}: React.HTMLAttributes<HTMLDivElement> & { variant?: AlertVariant }) {
  return (
    <div
      role="alert"
      className={cn(
        'rounded-lg border px-3 py-2 text-sm',
        variant === 'destructive' &&
          'border-red-500/30 bg-red-500/10 text-red-700 dark:text-red-200',
        variant === 'default' && 'border-border/60 bg-card/60',
        className
      )}
      {...props}
    />
  )
}

export function AlertDescription({
  className,
  ...props
}: React.HTMLAttributes<HTMLParagraphElement>) {
  return <p className={cn('text-sm', className)} {...props} />
}
