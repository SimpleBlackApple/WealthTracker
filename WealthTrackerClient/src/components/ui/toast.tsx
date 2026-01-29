import * as React from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'

import { cn } from '@/lib/utils'
import { Button } from './button'

export type ToastVariant = 'default' | 'success' | 'warning' | 'destructive'
export type ToastSound = 'none' | 'success' | 'warning' | 'error'

export type ToastOptions = {
  title: string
  description?: string
  variant?: ToastVariant
  durationMs?: number
  onClick?: () => void
  actionLabel?: string
  sound?: ToastSound
}

type ToastItem = ToastOptions & {
  id: string
  createdAt: number
}

type ToastContextValue = {
  toast: (options: ToastOptions) => void
  dismiss: (id: string) => void
  soundEnabled: boolean
  setSoundEnabled: (enabled: boolean) => void
}

const ToastContext = React.createContext<ToastContextValue | null>(null)

const SOUND_KEY = 'wt:toastSoundEnabled'

function useStableNow() {
  const [now, setNow] = React.useState(() => Date.now())
  React.useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(id)
  }, [])
  return now
}

function getInitialSoundEnabled() {
  const stored = localStorage.getItem(SOUND_KEY)
  if (stored === '0') return false
  if (stored === '1') return true
  return true
}

type Tone = { freq: number; durationMs: number; gain: number }

function playTones(tones: Tone[]) {
  try {
    const AudioContextCtor =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: AudioContext })
        .webkitAudioContext
    if (!AudioContextCtor) return

    const context = new AudioContextCtor()
    const startAt = context.currentTime + 0.02

    let cursor = startAt
    for (const tone of tones) {
      const osc = context.createOscillator()
      const gain = context.createGain()
      osc.type = 'sine'
      osc.frequency.value = tone.freq
      gain.gain.value = 0

      osc.connect(gain)
      gain.connect(context.destination)

      const dur = tone.durationMs / 1000
      gain.gain.setValueAtTime(0, cursor)
      gain.gain.linearRampToValueAtTime(tone.gain, cursor + 0.01)
      gain.gain.linearRampToValueAtTime(0, cursor + dur)

      osc.start(cursor)
      osc.stop(cursor + dur + 0.02)

      cursor += dur + 0.02
    }

    window.setTimeout(() => {
      context.close().catch(() => {})
    }, 1500)
  } catch {
    // ignore (autoplay restrictions, no audio device, etc.)
  }
}

function playToastSound(kind: ToastSound) {
  if (kind === 'none') return
  if (kind === 'success')
    return playTones([
      { freq: 880, durationMs: 80, gain: 0.06 },
      { freq: 1175, durationMs: 120, gain: 0.06 },
    ])
  if (kind === 'warning')
    return playTones([
      { freq: 660, durationMs: 90, gain: 0.06 },
      { freq: 440, durationMs: 120, gain: 0.06 },
    ])
  return playTones([{ freq: 220, durationMs: 160, gain: 0.08 }])
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = React.useState<ToastItem[]>([])
  const [soundEnabled, setSoundEnabledState] = React.useState(() =>
    getInitialSoundEnabled()
  )
  const now = useStableNow()

  const setSoundEnabled = React.useCallback((enabled: boolean) => {
    setSoundEnabledState(enabled)
    localStorage.setItem(SOUND_KEY, enabled ? '1' : '0')
  }, [])

  const dismiss = React.useCallback((id: string) => {
    setItems(prev => prev.filter(t => t.id !== id))
  }, [])

  const toast = React.useCallback(
    (options: ToastOptions) => {
      const id = `${Date.now()}-${Math.random().toString(16).slice(2)}`
      const item: ToastItem = {
        id,
        createdAt: Date.now(),
        durationMs: options.durationMs ?? 6000,
        variant: options.variant ?? 'default',
        sound: options.sound ?? 'none',
        ...options,
      }
      setItems(prev => [item, ...prev].slice(0, 5))

      if (soundEnabled && item.sound && item.sound !== 'none') {
        playToastSound(item.sound)
      }

      window.setTimeout(() => dismiss(id), item.durationMs)
    },
    [dismiss, soundEnabled]
  )

  const value = React.useMemo(
    () => ({ toast, dismiss, soundEnabled, setSoundEnabled }),
    [dismiss, setSoundEnabled, soundEnabled, toast]
  )

  return (
    <ToastContext.Provider value={value}>
      {children}
      {createPortal(
        <div className="pointer-events-none fixed right-4 top-4 z-[100] flex w-[360px] max-w-[calc(100vw-2rem)] flex-col gap-2">
          {items.map(item => (
            <ToastCard
              key={item.id}
              item={item}
              now={now}
              onDismiss={() => dismiss(item.id)}
            />
          ))}
        </div>,
        document.body
      )}
    </ToastContext.Provider>
  )
}

export function useToast() {
  const ctx = React.useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used within ToastProvider')
  return ctx
}

function ToastCard({
  item,
  now,
  onDismiss,
}: {
  item: ToastItem
  now: number
  onDismiss: () => void
}) {
  const secondsAgo = Math.max(0, Math.floor((now - item.createdAt) / 1000))

  const variantStyles: Record<ToastVariant, string> = {
    default: 'border-border/60 bg-background/90',
    success: 'border-emerald-500/30 bg-emerald-500/10',
    warning: 'border-amber-500/30 bg-amber-500/10',
    destructive: 'border-red-500/30 bg-red-500/10',
  }

  return (
    <div
      className={cn(
        'pointer-events-auto overflow-hidden rounded-xl border shadow-lg shadow-black/10 backdrop-blur animate-in fade-in slide-in-from-top-1',
        variantStyles[item.variant ?? 'default']
      )}
    >
      <button
        type="button"
        onClick={() => {
          item.onClick?.()
          onDismiss()
        }}
        className={cn(
          'grid w-full gap-1 px-3 py-2 text-left',
          item.onClick && 'cursor-pointer'
        )}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="truncate text-sm font-semibold">{item.title}</div>
            {item.description && (
              <div className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">
                {item.description}
              </div>
            )}
          </div>
          <div className="flex items-center gap-1">
            <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              {secondsAgo === 0 ? 'now' : `${secondsAgo}s`}
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-7 w-7 rounded-full"
              onClick={e => {
                e.preventDefault()
                e.stopPropagation()
                onDismiss()
              }}
              aria-label="Dismiss toast"
            >
              <X className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>

        {item.actionLabel && (
          <div className="mt-2">
            <span className="inline-flex items-center rounded-full border border-border/60 bg-card/60 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-foreground">
              {item.actionLabel}
            </span>
          </div>
        )}
      </button>
    </div>
  )
}
