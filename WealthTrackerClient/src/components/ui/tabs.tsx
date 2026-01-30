import * as React from 'react'

import { cn } from '@/lib/utils'

type TabsContextValue = {
  value: string
  onValueChange: (value: string) => void
}

const TabsContext = React.createContext<TabsContextValue | null>(null)

export function Tabs({
  value,
  onValueChange,
  className,
  children,
}: {
  value: string
  onValueChange: (value: string) => void
  className?: string
  children: React.ReactNode
}) {
  const contextValue = React.useMemo(
    () => ({ value, onValueChange }),
    [value, onValueChange]
  )

  return (
    <TabsContext.Provider value={contextValue}>
      <div className={className}>{children}</div>
    </TabsContext.Provider>
  )
}

export function TabsList({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      role="tablist"
      className={cn(
        'rounded-xl border border-border/70 bg-secondary/60 p-1 shadow-xs',
        className
      )}
      {...props}
    />
  )
}

export function TabsTrigger({
  value,
  className,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { value: string }) {
  const context = React.useContext(TabsContext)
  if (!context) throw new Error('TabsTrigger must be used within Tabs')

  const selected = context.value === value

  return (
    <button
      type="button"
      role="tab"
      aria-selected={selected}
      data-state={selected ? 'active' : 'inactive'}
      className={cn(
        'inline-flex items-center justify-center rounded-lg px-3 py-1.5 text-xs font-semibold text-muted-foreground transition-colors',
        'focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/25',
        selected && 'bg-card text-foreground shadow-sm shadow-black/5',
        className
      )}
      onClick={() => context.onValueChange(value)}
      {...props}
    />
  )
}

export function TabsContent({
  value,
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & { value: string }) {
  const context = React.useContext(TabsContext)
  if (!context) throw new Error('TabsContent must be used within Tabs')

  if (context.value !== value) return null

  return (
    <div role="tabpanel" className={cn('outline-none', className)} {...props}>
      {children}
    </div>
  )
}
