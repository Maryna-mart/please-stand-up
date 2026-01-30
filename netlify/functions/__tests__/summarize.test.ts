/**
 * Unit tests for summarize Netlify function
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { handler } from '../summarize'

// Mock Portkey server
vi.mock('../lib/portkey-server', () => ({
  generateSummary: vi.fn(),
  handlePortkeyError: vi.fn((error: unknown) => ({
    message: 'Summary generation failed',
    code: 'SUMMARIZE_ERROR',
    status: 502,
  })),
  logPortkeyRequest: vi.fn(),
  isPortkeyConfigured: vi.fn(() => true),
}))

// Mock Redis client
vi.mock('../lib/redis-client', () => ({
  sessionExists: vi.fn(),
}))

// Mock validation
vi.mock('../lib/validation', () => ({
  isValidSessionId: vi.fn(id => id.length > 10),
}))

const mockGenerateSummary = vi.mocked(
  (await import('../lib/portkey-server')).generateSummary
)
const mockSessionExists = vi.mocked(
  (await import('../lib/redis-client')).sessionExists
)

describe('Summarize Function', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    process.env.PORTKEY_API_KEY = 'pk-test-key'
  })

  describe('Request Validation', () => {
    it('should reject non-POST requests', async () => {
      const result = await handler({
        httpMethod: 'GET',
        headers: {},
      } as any)

      expect(result.statusCode).toBe(405)
      expect(result.body).toContain('Method not allowed')
    })

    it('should reject empty request body', async () => {
      const result = await handler({
        httpMethod: 'POST',
        headers: {},
        body: null,
      } as any)

      expect(result.statusCode).toBe(400)
      expect(result.body).toContain('Request body is required')
    })

    it('should reject invalid JSON', async () => {
      const result = await handler({
        httpMethod: 'POST',
        headers: {},
        body: 'invalid json {',
      } as any)

      expect(result.statusCode).toBe(400)
      expect(result.body).toContain('Invalid JSON')
    })

    it('should require session ID', async () => {
      const result = await handler({
        httpMethod: 'POST',
        headers: {},
        body: JSON.stringify({
          transcripts: [
            {
              participantName: 'Alice',
              text: 'Test',
            },
          ],
        }),
      } as any)

      expect(result.statusCode).toBe(400)
      expect(result.body).toContain('Session ID')
    })

    it('should validate session ID format', async () => {
      const result = await handler({
        httpMethod: 'POST',
        headers: {},
        body: JSON.stringify({
          sessionId: 'short',
          transcripts: [
            {
              participantName: 'Alice',
              text: 'Test',
            },
          ],
        }),
      } as any)

      expect(result.statusCode).toBe(400)
      expect(result.body).toContain('Invalid session ID')
    })
  })

  describe('Transcripts Validation', () => {
    it('should require transcripts array', async () => {
      const result = await handler({
        httpMethod: 'POST',
        headers: {},
        body: JSON.stringify({
          sessionId: 'valid-session-123456',
        }),
      } as any)

      expect(result.statusCode).toBe(400)
      expect(result.body).toContain('Transcripts must be an array')
    })

    it('should reject empty transcripts array', async () => {
      const result = await handler({
        httpMethod: 'POST',
        headers: {},
        body: JSON.stringify({
          sessionId: 'valid-session-123456',
          transcripts: [],
        }),
      } as any)

      expect(result.statusCode).toBe(400)
      expect(result.body).toContain('At least one transcript')
    })

    it('should require participant name for each transcript', async () => {
      const result = await handler({
        httpMethod: 'POST',
        headers: {},
        body: JSON.stringify({
          sessionId: 'valid-session-123456',
          transcripts: [
            {
              text: 'Test transcript',
            },
          ],
        }),
      } as any)

      expect(result.statusCode).toBe(400)
      expect(result.body).toContain('participant name')
    })

    it('should require text for each transcript', async () => {
      const result = await handler({
        httpMethod: 'POST',
        headers: {},
        body: JSON.stringify({
          sessionId: 'valid-session-123456',
          transcripts: [
            {
              participantName: 'Alice',
            },
          ],
        }),
      } as any)

      expect(result.statusCode).toBe(400)
      expect(result.body).toContain('text is required')
    })

    it('should accept single transcript', async () => {
      mockSessionExists.mockResolvedValue(true)
      mockGenerateSummary.mockResolvedValue({
        summary: 'Summary text',
        language: 'en',
      })

      const result = await handler({
        httpMethod: 'POST',
        headers: {},
        body: JSON.stringify({
          sessionId: 'valid-session-123456',
          transcripts: [
            {
              participantName: 'Alice',
              text: 'I completed feature X',
            },
          ],
        }),
      } as any)

      expect(result.statusCode).toBe(200)
      expect(result.body).toContain('success')
    })

    it('should accept multiple transcripts', async () => {
      mockSessionExists.mockResolvedValue(true)
      mockGenerateSummary.mockResolvedValue({
        summary: 'Summary text',
        language: 'en',
      })

      const result = await handler({
        httpMethod: 'POST',
        headers: {},
        body: JSON.stringify({
          sessionId: 'valid-session-123456',
          transcripts: [
            {
              participantName: 'Alice',
              text: 'Completed feature X',
            },
            {
              participantName: 'Bob',
              text: 'Completed feature Y',
            },
            {
              participantName: 'Charlie',
              text: 'Completed feature Z',
            },
          ],
        }),
      } as any)

      expect(result.statusCode).toBe(200)
    })
  })

  describe('Language Validation', () => {
    it('should accept valid language codes', async () => {
      mockSessionExists.mockResolvedValue(true)
      mockGenerateSummary.mockResolvedValue({
        summary: 'Summary',
        language: 'de',
      })

      const validLanguages = ['en', 'de', 'fr', 'es', 'it', 'pt', 'ja', 'zh']

      for (const lang of validLanguages) {
        const result = await handler({
          httpMethod: 'POST',
          headers: {},
          body: JSON.stringify({
            sessionId: 'valid-session-123456',
            transcripts: [
              {
                participantName: 'Alice',
                text: 'Test',
              },
            ],
            language: lang,
          }),
        } as any)

        expect(result.statusCode).toBe(200)
      }
    })

    it('should reject invalid language codes', async () => {
      const result = await handler({
        httpMethod: 'POST',
        headers: {},
        body: JSON.stringify({
          sessionId: 'valid-session-123456',
          transcripts: [
            {
              participantName: 'Alice',
              text: 'Test',
            },
          ],
          language: 'invalid-lang',
        }),
      } as any)

      expect(result.statusCode).toBe(400)
      expect(result.body).toContain('Invalid language')
    })

    it('should default to English if language not specified', async () => {
      mockSessionExists.mockResolvedValue(true)
      mockGenerateSummary.mockResolvedValue({
        summary: 'Summary',
        language: 'en',
      })

      const result = await handler({
        httpMethod: 'POST',
        headers: {},
        body: JSON.stringify({
          sessionId: 'valid-session-123456',
          transcripts: [
            {
              participantName: 'Alice',
              text: 'Test',
            },
          ],
        }),
      } as any)

      expect(result.statusCode).toBe(200)
    })
  })

  describe('Session Validation', () => {
    it('should check if session exists on backend', async () => {
      mockSessionExists.mockResolvedValue(false)

      const result = await handler({
        httpMethod: 'POST',
        headers: {},
        body: JSON.stringify({
          sessionId: 'valid-session-123456',
          transcripts: [
            {
              participantName: 'Alice',
              text: 'Test',
            },
          ],
        }),
      } as any)

      expect(result.statusCode).toBe(404)
      expect(result.body).toContain('Session not found')
    })
  })

  describe('Portkey Configuration', () => {
    it('should check if Portkey is configured', async () => {
      const { isPortkeyConfigured } = await import('../lib/portkey-server')
      const mockIsConfigured = vi.mocked(isPortkeyConfigured)

      mockIsConfigured.mockReturnValue(false)

      const result = await handler({
        httpMethod: 'POST',
        headers: {},
        body: JSON.stringify({
          sessionId: 'valid-session-123456',
          transcripts: [
            {
              participantName: 'Alice',
              text: 'Test',
            },
          ],
        }),
      } as any)

      expect(result.statusCode).toBe(502)
      expect(result.body).toContain('not configured')
    })
  })

  describe('Error Handling', () => {
    it('should handle summarization errors', async () => {
      mockSessionExists.mockResolvedValue(true)

      const { handlePortkeyError } = await import('../lib/portkey-server')
      const mockHandleError = vi.mocked(handlePortkeyError)

      mockHandleError.mockReturnValue({
        message: 'AI service unavailable',
        code: 'PORTKEY_SERVICE_ERROR',
        status: 502,
      })

      mockGenerateSummary.mockRejectedValue(
        new Error('Service error')
      )

      const result = await handler({
        httpMethod: 'POST',
        headers: {},
        body: JSON.stringify({
          sessionId: 'valid-session-123456',
          transcripts: [
            {
              participantName: 'Alice',
              text: 'Test',
            },
          ],
        }),
      } as any)

      expect(result.statusCode).toBe(502)
      expect(result.body).toContain('error')
    })
  })

  describe('Response Format', () => {
    it('should return success response with proper structure', async () => {
      mockSessionExists.mockResolvedValue(true)
      mockGenerateSummary.mockResolvedValue({
        summary: 'Test summary',
        language: 'en',
      })

      const result = await handler({
        httpMethod: 'POST',
        headers: {},
        body: JSON.stringify({
          sessionId: 'valid-session-123456',
          transcripts: [
            {
              participantName: 'Alice',
              text: 'Completed feature X',
            },
          ],
        }),
      } as any)

      expect(result.statusCode).toBe(200)

      const body = JSON.parse(result.body)
      expect(body).toHaveProperty('success', true)
      expect(body).toHaveProperty('summary')
      expect(body.summary).toHaveProperty('text')
      expect(body.summary).toHaveProperty('language')
      expect(body.summary).toHaveProperty('generatedAt')
    })

    it('should return error response with proper structure', async () => {
      const result = await handler({
        httpMethod: 'POST',
        headers: {},
        body: JSON.stringify({
          sessionId: 'short',
          transcripts: [],
        }),
      } as any)

      expect(result.statusCode).toBe(400)

      const body = JSON.parse(result.body)
      expect(body).toHaveProperty('error')
      expect(body).toHaveProperty('code')
    })
  })
})
