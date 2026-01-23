import { beforeEach } from 'vitest'

// Note: crypto.hash polyfill is applied globally in vitest.config.ts
// before any plugins run. No need to duplicate here.

// Mock localStorage for tests
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

Object.defineProperty(globalThis, 'localStorage', {
  value: localStorageMock,
})

// Global test setup
beforeEach(() => {
  // Clear localStorage before each test
  localStorage.clear()
})
