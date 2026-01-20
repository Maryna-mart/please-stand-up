import { describe, it, expect } from 'vitest'

describe('Test Setup', () => {
  it('should run basic assertions', () => {
    expect(1 + 1).toBe(2)
  })

  it('should handle strings', () => {
    const message = 'Hello, Standup!'
    expect(message).toContain('Standup')
  })
})
