import { beforeEach } from 'vitest'
import { webcrypto } from 'node:crypto'

// Polyfill Web Crypto API for tests (happy-dom doesn't include it)
if (!globalThis.crypto) {
  globalThis.crypto = webcrypto as Crypto
}

// Global test setup
beforeEach(() => {
  // Clear any mocks or setup before each test
})
