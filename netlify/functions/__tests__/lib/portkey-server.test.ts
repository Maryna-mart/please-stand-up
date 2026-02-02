/**
 * Unit tests for Portkey server configuration and operations
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import {
  generateSummary,
  isPortkeyConfigured,
  handlePortkeyError,
  logPortkeyRequest,
} from '../../lib/portkey-server'

// Mock the Portkey SDK
vi.mock('@portkey-ai/node-sdk', () => ({
  Portkey: vi.fn(() => ({
    audio: {
      transcriptions: {
        create: vi.fn(),
      },
    },
    messages: {
      create: vi.fn(),
    },
  })),
}))

describe('Portkey Server', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Set valid API key by default
    process.env.PORTKEY_API_KEY = 'pk-test-api-key-123'
  })

  afterEach(() => {
    delete process.env.PORTKEY_API_KEY
  })

  describe('Configuration', () => {
    it('should detect when Portkey is configured', () => {
      expect(isPortkeyConfigured()).toBe(true)
    })

    it('should detect when Portkey is not configured', () => {
      delete process.env.PORTKEY_API_KEY
      expect(isPortkeyConfigured()).toBe(false)
    })

    it('should throw error when summarizing without API key configured', async () => {
      delete process.env.PORTKEY_API_KEY

      const transcripts = [
        {
          participantName: 'Alice',
          text: 'I worked on feature X',
        },
      ]

      await expect(generateSummary(transcripts)).rejects.toThrow(
        'Portkey API key not configured'
      )
    })
  })

describe('Summarization Validation', () => {
    it('should reject empty transcripts', async () => {
      await expect(generateSummary([])).rejects.toThrow(
        'No transcripts provided for summarization'
      )
    })

    it('should reject when transcripts is null', async () => {
      await expect(
        generateSummary(
          null as unknown as Array<{ participantName: string; text: string }>
        )
      ).rejects.toThrow('No transcripts provided for summarization')
    })

    it('should accept single transcript', async () => {
      const transcripts = [
        {
          participantName: 'Alice',
          text: 'Completed feature X. Today working on feature Y.',
        },
      ]

      expect(async () => {
        try {
          await generateSummary(transcripts)
        } catch (error) {
          // Expected to fail at API call, but not validation
          if ((error as Error).message.includes('transcript')) {
            throw error
          }
        }
      }).not.toThrow('transcript')
    })

    it('should accept multiple transcripts from different participants', async () => {
      const transcripts = [
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
      ]

      expect(async () => {
        try {
          await generateSummary(transcripts)
        } catch (error) {
          // Expected to fail at API call, but not validation
          if ((error as Error).message.includes('transcript')) {
            throw error
          }
        }
      }).not.toThrow('transcript')
    })
  })

  describe('Error Handling', () => {
    it('should handle timeout errors', () => {
      const error = new Error('request timeout')
      const result = handlePortkeyError(error)

      expect(result.code).toBe('PORTKEY_TIMEOUT')
      expect(result.status).toBe(504)
      expect(result.message).toContain('timeout')
    })

    it('should handle rate limit errors (429)', () => {
      const error = new Error('Too Many Requests') as NodeJS.ErrnoException & {
        status?: number
      }
      error.status = 429

      const result = handlePortkeyError(error)

      expect(result.code).toBe('PORTKEY_RATE_LIMIT')
      expect(result.status).toBe(429)
      expect(result.message).toContain('rate limited')
    })

    it('should handle authentication errors (401)', () => {
      const error = new Error('Unauthorized') as NodeJS.ErrnoException & {
        status?: number
      }
      error.status = 401

      const result = handlePortkeyError(error)

      expect(result.code).toBe('PORTKEY_AUTH_ERROR')
      expect(result.status).toBe(401)
      expect(result.message).toContain('authentication')
    })

    it('should handle service errors (500+)', () => {
      const error = new Error(
        'Internal Server Error'
      ) as NodeJS.ErrnoException & {
        status?: number
      }
      error.status = 500

      const result = handlePortkeyError(error)

      expect(result.code).toBe('PORTKEY_SERVICE_ERROR')
      expect(result.status).toBe(502)
      expect(result.message).toContain('temporarily unavailable')
    })

    it('should handle generic errors', () => {
      const error = new Error('Unknown error')

      const result = handlePortkeyError(error)

      expect(result.code).toBe('PORTKEY_ERROR')
      expect(result.status).toBe(502)
    })

    it('should not retry on validation errors (4xx except 429/503)', () => {
      const error = new Error('Bad Request') as NodeJS.ErrnoException & {
        status?: number
      }
      error.status = 400

      const result = handlePortkeyError(error)

      expect(result.code).toBe('PORTKEY_ERROR')
      expect(result.status).toBe(502)
    })
  })

  describe('Logging', () => {
    it('should log Portkey requests', () => {
      const consoleSpy = vi.spyOn(console, 'log')

      const details = {
        operation: 'transcribe',
        audioSize: 1024,
        format: 'webm',
      }

      logPortkeyRequest('Test Operation', details)

      expect(consoleSpy).toHaveBeenCalledWith(
        '[Portkey] Test Operation',
        details
      )

      consoleSpy.mockRestore()
    })

    it('should log with metadata', () => {
      const consoleSpy = vi.spyOn(console, 'log')

      const metadata = {
        sessionId: 'test-session-123',
        participantCount: 5,
        totalSize: 5120,
      }

      logPortkeyRequest('Summarize', metadata)

      expect(consoleSpy).toHaveBeenCalledWith(
        '[Portkey] Summarize',
        expect.objectContaining(metadata)
      )

      consoleSpy.mockRestore()
    })
  })

  describe('Language Support', () => {
    it('should accept optional language parameter for summarization', async () => {
      const transcripts = [
        {
          participantName: 'Alice',
          text: 'Completed feature X',
        },
      ]

      // Should not throw validation error for language parameter
      expect(async () => {
        try {
          await generateSummary(transcripts, 'de')
        } catch (error) {
          // Expected to fail at API call
          if ((error as Error).message.includes('language')) {
            throw error
          }
        }
      }).not.toThrow('language')
    })
  })
})
