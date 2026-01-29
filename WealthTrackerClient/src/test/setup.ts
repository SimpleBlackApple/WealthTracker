import { afterEach, vi } from 'vitest'
import { cleanup } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'
import React from 'react'

// Cleanup after each test
afterEach(() => {
  cleanup()
})

// Mock localStorage with actual storage
const localStorageMock = (() => {
  let store: Record<string, string> = {}

  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value.toString()
    },
    removeItem: (key: string) => {
      delete store[key]
    },
    clear: () => {
      store = {}
    },
  }
})()

globalThis.localStorage = localStorageMock as Storage

// Radix Select expects pointer capture APIs.
if (!Element.prototype.hasPointerCapture) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ;(Element.prototype as any).hasPointerCapture = () => false
}
if (!Element.prototype.setPointerCapture) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ;(Element.prototype as any).setPointerCapture = () => {}
}
if (!Element.prototype.releasePointerCapture) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ;(Element.prototype as any).releasePointerCapture = () => {}
}

if (!Element.prototype.scrollIntoView) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ;(Element.prototype as any).scrollIntoView = () => {}
}

// Mock react-resizable-panels for JSDOM stability (resize observers + pointer events).
vi.mock('react-resizable-panels', () => ({
  Group: (props: Record<string, unknown> & { children?: React.ReactNode }) => {
    const rest = { ...props } as Record<string, unknown> & {
      children?: React.ReactNode
    }
    const children = rest.children
    delete rest.children
    delete rest.orientation
    delete rest.direction
    delete rest.autoSaveId
    delete rest.onLayout
    return React.createElement('div', rest, children)
  },
  Panel: (props: Record<string, unknown> & { children?: React.ReactNode }) => {
    const rest = { ...props } as Record<string, unknown> & {
      children?: React.ReactNode
    }
    const children = rest.children
    delete rest.children
    delete rest.defaultSize
    delete rest.minSize
    delete rest.maxSize
    delete rest.collapsible
    delete rest.collapsedSize
    delete rest.order
    delete rest.onResize
    return React.createElement('div', rest, children)
  },
  Separator: (
    props: Record<string, unknown> & { children?: React.ReactNode }
  ) => {
    const rest = { ...props } as Record<string, unknown> & {
      children?: React.ReactNode
    }
    const children = rest.children
    delete rest.children
    return React.createElement('div', rest, children)
  },
}))
