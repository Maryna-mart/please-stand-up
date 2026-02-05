import { defineConfig } from 'vitest/config'

/**
 * Separate vitest config for backend (Netlify functions)
 * Uses Node.js environment instead of happy-dom
 * Includes netlify/** functions in test discovery
 */
export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['netlify/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: ['netlify/functions/lib/**/*.ts'],
      exclude: ['node_modules/', '**/*.test.ts', '**/__tests__/**'],
    },
  },
})
