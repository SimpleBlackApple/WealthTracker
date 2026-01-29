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
    const {
      children,
      // panel-group specific props to strip
      orientation: _orientation,
      direction: _direction,
      autoSaveId: _autoSaveId,
      onLayout: _onLayout,
      ...rest
    } = props
    return React.createElement('div', rest, children)
  },
  Panel: (props: Record<string, unknown> & { children?: React.ReactNode }) => {
    const {
      children,
      // panel specific props to strip
      defaultSize: _defaultSize,
      minSize: _minSize,
      maxSize: _maxSize,
      collapsible: _collapsible,
      collapsedSize: _collapsedSize,
      order: _order,
      onResize: _onResize,
      ...rest
    } = props
    return React.createElement('div', rest, children)
  },
  Separator: (props: Record<string, unknown> & { children?: React.ReactNode }) => {
    const { children, ...rest } = props
    return React.createElement('div', rest, children)
  },
}))
