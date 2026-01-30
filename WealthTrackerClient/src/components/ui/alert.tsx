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
        'rounded-xl border px-3 py-2 text-sm',
        variant === 'destructive' &&
          'border-destructive/30 bg-destructive/10 text-destructive',
        variant === 'default' && 'border-border/70 bg-card',
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
