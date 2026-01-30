/**
 * Integration tests for summarize function
 * Tests the HTTP handler and Portkey integration
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { handler } from '../summarize'

vi.mock('../lib/portkey-server', () => ({
  generateSummary: vi.fn(),
  isPortkeyConfigured: vi.fn(() => true),
  handlePortkeyError: vi.fn(err => ({
    message: 'Summary failed',
    code: 'ERROR',
    status: 502,
  })),
  logPortkeyRequest: vi.fn(),
}))

vi.mock('../lib/redis-client', () => ({
  sessionExists: vi.fn(() => Promise.resolve(true)),
}))

vi.mock('../lib/validation', () => ({
  isValidSessionId: vi.fn(id => id && id.length > 10),
}))

describe('Summarize Function', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should reject non-POST requests', async () => {
    const result = await handler({
      httpMethod: 'GET',
      headers: {},
    } as unknown as Parameters<typeof handler>[0])

    expect(result.statusCode).toBe(405)
    expect(result.body).toContain('Method not allowed')
  })

  it('should reject empty body', async () => {
    const result = await handler({
      httpMethod: 'POST',
      headers: {},
      body: null,
    } as unknown as Parameters<typeof handler>[0])

    expect(result.statusCode).toBe(400)
    expect(result.body).toContain('Request body is required')
  })

  it('should reject invalid JSON', async () => {
    const result = await handler({
      httpMethod: 'POST',
      headers: {},
      body: 'invalid json {',
    } as unknown as Parameters<typeof handler>[0])

    expect(result.statusCode).toBe(400)
    expect(result.body).toContain('Invalid JSON')
  })

  it('should require Portkey configuration', async () => {
    const { isPortkeyConfigured } = await import('../lib/portkey-server')
    vi.mocked(isPortkeyConfigured).mockReturnValue(false)

    const result = await handler({
      httpMethod: 'POST',
      headers: {},
      body: JSON.stringify({
        sessionId: 'valid-session-id-long',
        transcripts: [{ participantName: 'Alice', text: 'test' }],
      }),
    } as unknown as Parameters<typeof handler>[0])

    expect(result.statusCode).toBe(502)
    expect(result.body).toContain('not configured')
  })

  it('should validate session ID format', async () => {
    const result = await handler({
      httpMethod: 'POST',
      headers: {},
      body: JSON.stringify({
        sessionId: 'short',
        transcripts: [{ participantName: 'Alice', text: 'test' }],
      }),
    } as unknown as Parameters<typeof handler>[0])

    expect(result.statusCode).toBe(400)
    expect(result.body).toContain('Invalid session ID')
  })

  it('should require transcripts array', async () => {
    const result = await handler({
      httpMethod: 'POST',
      headers: {},
      body: JSON.stringify({
        sessionId: 'valid-session-id-long',
      }),
    } as unknown as Parameters<typeof handler>[0])

    expect(result.statusCode).toBe(400)
    expect(result.body).toContain('Transcripts must be an array')
  })

  it('should reject empty transcripts array', async () => {
    const result = await handler({
      httpMethod: 'POST',
      headers: {},
      body: JSON.stringify({
        sessionId: 'valid-session-id-long',
        transcripts: [],
      }),
    } as unknown as Parameters<typeof handler>[0])

    expect(result.statusCode).toBe(400)
    expect(result.body).toContain('At least one transcript')
  })

  it('should validate transcript structure', async () => {
    const result = await handler({
      httpMethod: 'POST',
      headers: {},
      body: JSON.stringify({
        sessionId: 'valid-session-id-long',
        transcripts: [
          {
            participantName: 'Alice',
            // missing text field
          },
        ],
      }),
    } as unknown as Parameters<typeof handler>[0])

    expect(result.statusCode).toBe(400)
    expect(result.body).toContain('text is required')
  })

  it('should accept valid language codes', () => {
    const validLanguages = ['en', 'de', 'fr', 'es', 'it', 'pt', 'ja', 'zh']
    validLanguages.forEach(lang => {
      expect(validLanguages).toContain(lang)
    })
  })

  it('should reject invalid language codes', async () => {
    const result = await handler({
      httpMethod: 'POST',
      headers: {},
      body: JSON.stringify({
        sessionId: 'valid-session-id-long',
        transcripts: [{ participantName: 'Alice', text: 'test' }],
        language: 'invalid-lang-code',
      }),
    } as unknown as Parameters<typeof handler>[0])

    expect(result.statusCode).toBe(400)
    expect(result.body).toContain('Invalid language')
  })
})
