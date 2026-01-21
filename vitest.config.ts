import { defineConfig } from 'vitest/config'
import vue from '@vitejs/plugin-vue'
import path from 'path'
import { createHash } from 'crypto'

// Polyfill crypto.hash globally before any plugins run
const crypto = globalThis.crypto as unknown as Record<string, unknown>
if (!crypto.hash) {
  crypto.hash = (algorithm: string, data: ArrayBuffer | BufferSource) => {
    const nodeAlgorithm = algorithm.replace('-', '')
    const hash = createHash(nodeAlgorithm)
    const buffer = Buffer.isBuffer(data)
      ? data
      : Buffer.from(data as ArrayBuffer)
    hash.update(buffer)
    return hash.digest()
  }
}

export default defineConfig({
  plugins: [vue()],
  test: {
    globals: true,
    environment: 'happy-dom',
    setupFiles: ['./src/__tests__/setup.ts'],
    exclude: ['node_modules', 'dist', 'e2e', '**/e2e/**'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'src/__tests__/',
        '*.config.ts',
        'dist/',
        'e2e/',
      ],
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})
