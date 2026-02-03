/**
 * Unit tests for ai-api client
 * Tests API functions, error handling, and retry logic
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  getErrorMessage,
  parseAPIError,
  getSessionTranscripts,
  uploadAudio,
  generateSummary,
  finishSession,
  summarizeTranscript,
  saveTranscript,
} from '@/lib/ai-api'
import type { Transcript } from '@/lib/portkey-types'

// Mock global fetch - properly typed as a Vitest mock function
type MockedFetch = ReturnType<typeof vi.fn>
const mockFetch: MockedFetch = vi.fn()
global.fetch = mockFetch as unknown as typeof fetch

describe('ai-api: getSessionTranscripts', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should fetch and return transcripts from session', async () => {
    const sessionId = 'test-session-id'
    const mockTranscripts: Transcript[] = [
      {
        participantName: 'Alice',
        text: '✅ Yesterday: Worked on login\n🎯 Today: Working on checkout',
        language: 'en',
        duration: 60,
      },
      {
        participantName: 'Bob',
        text: '✅ Yesterday: Fixed bugs\n🎯 Today: Code review',
        language: 'en',
        duration: 45,
      },
    ]

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ transcripts: mockTranscripts }),
    })

    const result = await getSessionTranscripts(sessionId)

    expect(result).toEqual(mockTranscripts)
    expect(mockFetch).toHaveBeenCalledWith(
      '/.netlify/functions/get-session/test-session-id'
    )
  })

  it('should encode special characters in sessionId', async () => {
    const sessionId = 'test/session?id=123'
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ transcripts: [] }),
    })

    await getSessionTranscripts(sessionId)

    const callUrl = mockFetch.mock.calls[0][0]
    // Should be properly URL-encoded
    expect(callUrl).toContain('test%2Fsession%3Fid%3D123')
    expect(callUrl).toContain('get-session')
  })

  it('should return empty array on 404 error', async () => {
    const sessionId = 'nonexistent'
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 404,
      json: async () => ({ error: 'Not found' }),
    })

    const result = await getSessionTranscripts(sessionId)

    expect(result).toEqual([])
  })

  it('should return empty array on network error', async () => {
    const sessionId = 'test-session'
    mockFetch.mockRejectedValueOnce(new Error('Network error'))

    const result = await getSessionTranscripts(sessionId)

    expect(result).toEqual([])
  })

  it('should throw on missing sessionId', async () => {
    await expect(getSessionTranscripts('')).rejects.toThrow(
      'Session ID is required'
    )
  })

  it('should handle response without transcripts field', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ id: 'test', leaderName: 'Alice' }),
    })

    const result = await getSessionTranscripts('test-id')

    expect(result).toEqual([])
  })
})

describe('ai-api: uploadAudio', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should upload audio and return transcript', async () => {
    const audioBlob = new Blob(['audio data'], { type: 'audio/webm' })
    const mockTranscript = {
      text: 'Yesterday I finished the login page',
      language: 'en' as const,
    }

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        transcript: mockTranscript,
      }),
    })

    const result = await uploadAudio(
      'session-id',
      'participant-id',
      'Alice',
      audioBlob,
      'webm',
      'en'
    )

    expect(result).toEqual(mockTranscript)
  })

  it('should validate inputs', async () => {
    const emptyBlob = new Blob([], { type: 'audio/webm' })

    await expect(
      uploadAudio('session-id', 'participant-id', 'Alice', emptyBlob, 'webm')
    ).rejects.toThrow('Audio blob is empty')
  })

  it('should reject files larger than 25MB', async () => {
    const largeBlob = new Blob([new ArrayBuffer(26 * 1024 * 1024)], {
      type: 'audio/webm',
    })

    await expect(
      uploadAudio('session-id', 'participant-id', 'Alice', largeBlob, 'webm')
    ).rejects.toThrow('exceeds 25MB limit')
  })

  it('should retry on transient errors', async () => {
    const audioBlob = new Blob(['audio'], { type: 'audio/webm' })
    mockFetch
      .mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: async () => ({ error: 'Server error' }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          transcript: { text: 'Success', language: 'en' },
        }),
      })

    const result = await uploadAudio(
      'session-id',
      'participant-id',
      'Alice',
      audioBlob,
      'webm'
    )

    expect(result.text).toBe('Success')
    expect(mockFetch).toHaveBeenCalledTimes(2)
  })
})

describe('ai-api: generateSummary', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should generate summary from transcripts', async () => {
    const transcripts: Transcript[] = [
      {
        participantName: 'Alice',
        text: 'Yesterday: Login page, Today: Checkout',
        language: 'en',
      },
    ]

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        summary: {
          text: 'Session summary here',
          language: 'en',
        },
      }),
    })

    const result = await generateSummary('session-id', transcripts)

    expect(result.text).toBe('Session summary here')
    expect(result.language).toBe('en')
  })

  it('should validate inputs', async () => {
    await expect(generateSummary('', [])).rejects.toThrow(
      'Session ID is required'
    )

    await expect(generateSummary('session-id', [])).rejects.toThrow(
      'At least one transcript is required'
    )
  })

  it('should require participantName and text in transcripts', async () => {
    const invalidTranscripts: Array<Record<string, unknown>> = [
      { participantName: 'Alice' }, // missing text
    ]

    await expect(
      generateSummary('session-id', invalidTranscripts as unknown as Transcript[])
    ).rejects.toThrow('participant name and text')
  })
})

describe('ai-api: finishSession', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should finish session and return summary', async () => {
    const transcripts: Transcript[] = [
      {
        participantName: 'Alice',
        text: 'Standup summary',
        language: 'en',
      },
    ]

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        rawText: 'Full session summary text',
      }),
    })

    const result = await finishSession('session-id', transcripts)

    expect(result).toBe('Full session summary text')
  })

  it('should validate inputs', async () => {
    await expect(finishSession('', [])).rejects.toThrow(
      'Session ID is required'
    )
  })
})

describe('ai-api: summarizeTranscript', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should summarize single transcript', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        sections: {
          yesterday: 'Worked on login',
          today: 'Working on checkout',
          blockers: 'Waiting for API',
          actionItems: 'Review code',
          other: 'Attending meetup',
        },
      }),
    })

    const result = await summarizeTranscript(
      'Alice',
      'Full transcript text',
      'en'
    )

    expect(result.yesterday).toBe('Worked on login')
    expect(result.today).toBe('Working on checkout')
    expect(result.blockers).toBe('Waiting for API')
  })

  it('should validate required fields', async () => {
    await expect(summarizeTranscript('', 'text')).rejects.toThrow(
      'Participant name and transcript text are required'
    )

    await expect(summarizeTranscript('Alice', '')).rejects.toThrow(
      'Participant name and transcript text are required'
    )
  })

  it('should retry on server errors', async () => {
    mockFetch
      .mockResolvedValueOnce({
        ok: false,
        status: 503,
        json: async () => ({ error: 'Service unavailable' }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          sections: { yesterday: 'Success' },
        }),
      })

    const result = await summarizeTranscript('Alice', 'transcript')

    expect(result.yesterday).toBe('Success')
    expect(mockFetch).toHaveBeenCalledTimes(2)
  })
})

describe('ai-api: saveTranscript', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should save transcript to session', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true }),
    })

    await saveTranscript('session-id', {
      participantName: 'Alice',
      text: 'Transcript text',
      duration: 60,
      language: 'en',
    })

    expect(mockFetch).toHaveBeenCalledWith(
      '/.netlify/functions/save-transcript',
      expect.objectContaining({
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })
    )
  })

  it('should validate inputs', async () => {
    await expect(
      saveTranscript('', { participantName: 'Alice', text: 'text' })
    ).rejects.toThrow('Session ID and transcript are required')

    await expect(
      saveTranscript('session-id', { participantName: 'Alice' } as unknown as Parameters<typeof saveTranscript>[1])
    ).rejects.toThrow('participantName and text')
  })

  it('should handle failed save response', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: false, error: 'Bad request' }),
    })

    await expect(
      saveTranscript('session-id', {
        participantName: 'Alice',
        text: 'text',
      })
    ).rejects.toThrow('Failed to save transcript')
  })
})

describe('ai-api: Error Handling', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('getErrorMessage', () => {
    it('should handle string errors', () => {
      expect(getErrorMessage('string error')).toBe('string error')
    })

    it('should handle Error instances', () => {
      const error = new Error('Error message')
      expect(getErrorMessage(error)).toBe('Error message')
    })

    it('should handle microphone permission errors with specific message', () => {
      const error = new Error('NotAllowedError: permission denied')
      const message = getErrorMessage(error)
      expect(message).toContain('Microphone permission denied')
      expect(message).toContain('browser settings')
    })

    it('should handle microphone not found errors with specific message', () => {
      const error = new Error('NotFoundError: No microphone detected')
      const message = getErrorMessage(error)
      expect(message).toContain('No microphone found')
      expect(message).toContain('check your device')
    })

    it('should return generic message for API errors when isAPIError=true', () => {
      const error = new Error('API request failed')
      const message = getErrorMessage(error, true)
      expect(message).toBe('Oops, something went wrong. Please try again.')
    })

    it('should return detailed message for non-API errors', () => {
      const error = new Error('Network timeout')
      const message = getErrorMessage(error, false)
      expect(message).toBe('Network timeout')
    })

    it('should handle object with message property', () => {
      const error = { message: 'Custom error message' }
      expect(getErrorMessage(error)).toBe('Custom error message')
    })

    it('should handle object with error property', () => {
      const error = { error: 'Custom error' }
      expect(getErrorMessage(error)).toBe('Custom error')
    })

    it('should return default message for null/undefined', () => {
      expect(getErrorMessage(null)).toBe(
        'Oops, something went wrong. Please try again.'
      )
      expect(getErrorMessage(undefined)).toBe(
        'Oops, something went wrong. Please try again.'
      )
    })

    it('should handle [object Object] from plain objects', () => {
      const error = { some: 'error', nested: { details: 'here' } }
      const message = getErrorMessage(error)
      // Should not return [object Object]
      expect(message).not.toBe('[object Object]')
      expect(message.length).toBeGreaterThan(0)
    })

    it('should handle empty Error message with fallback', () => {
      const error = new Error('')
      const message = getErrorMessage(error)
      expect(message).toBeTruthy()
    })

    it('should distinguish API errors from specific errors', () => {
      const apiError = new Error('Server error')
      const specificError = new Error('Microphone permission denied')

      const apiMsg = getErrorMessage(apiError, true)
      const specificMsg = getErrorMessage(specificError, false)

      expect(apiMsg).toBe('Oops, something went wrong. Please try again.')
      expect(specificMsg).toContain('permission denied')
    })

    it('should show generic message during retries', () => {
      const error = new Error('Rate limited')
      ;(error as Error & { status?: number }).status = 429

      // When retries will happen, show generic message
      expect(getErrorMessage(error, true)).toBe(
        'Oops, something went wrong. Please try again.'
      )
    })

    it('should show detailed message for immediate failures', () => {
      const error = new Error('NotFoundError: No microphone')
      error.name = 'NotFoundError'

      // For immediate failure (no retry), show specific message
      expect(getErrorMessage(error, false)).toContain('No microphone')
    })
  })

  describe('parseAPIError', () => {
    it('should parse timeout errors', () => {
      const error = new Error('timeout')
      const parsed = parseAPIError(error)

      expect(parsed.message).toContain('timeout')
      expect(parsed.code).toBe('TIMEOUT')
      expect(parsed.status).toBe(504)
    })

    it('should parse network errors', () => {
      const error = new Error('fetch failed')
      const parsed = parseAPIError(error)

      expect(parsed.message).toContain('Network error')
      expect(parsed.code).toBe('NETWORK_ERROR')
      expect(parsed.status).toBe(0)
    })

    it('should parse general errors with message', () => {
      const error = new Error('Something went wrong')
      const parsed = parseAPIError(error)

      expect(parsed.message).toBe('Something went wrong')
      expect(parsed.code).toBe('UNKNOWN_ERROR')
    })

    it('should handle error objects without message', () => {
      const error = new Error('')
      const parsed = parseAPIError(error)

      expect(parsed.message).toBe('An unexpected error occurred')
      expect(parsed.code).toBe('UNKNOWN_ERROR')
    })

    it('should handle string errors', () => {
      const parsed = parseAPIError('String error')

      expect(parsed.message).toBe('String error')
      expect(parsed.code).toBe('UNKNOWN_ERROR')
    })

    it('should handle object errors with message property', () => {
      const error = { message: 'Object error message' }
      const parsed = parseAPIError(error)

      expect(parsed.message).toBe('Object error message')
      expect(parsed.code).toBe('UNKNOWN_ERROR')
    })

    it('should not expose [object Object] in message', () => {
      const error = { nested: { prop: 'value' } }
      const parsed = parseAPIError(error)

      expect(parsed.message).not.toBe('[object Object]')
      expect(parsed.message.length).toBeGreaterThan(0)
    })

    it('should parse network timeout errors', () => {
      const error = new Error('Request timeout exceeded')
      const parsed = parseAPIError(error)

      expect(parsed.message).toContain('timeout')
    })
  })

  describe('Error Message Strategy', () => {
    it('should provide consistent error handling across error types', () => {
      const errorTypes = [
        new Error('Some error'),
        'String error',
        { message: 'Object error' },
        null,
      ]

      const messages = errorTypes.map(err => getErrorMessage(err))

      // All messages should be strings and not [object Object]
      messages.forEach(msg => {
        expect(typeof msg).toBe('string')
        expect(msg).not.toBe('[object Object]')
        expect(msg.length).toBeGreaterThan(0)
      })
    })

    it('should handle permission-related errors specially', () => {
      const permissionError = new Error('User denied microphone permission')
      const message = getErrorMessage(permissionError, false)

      expect(message.toLowerCase()).toContain('permission')
    })

    it('should handle NotFoundError specially', () => {
      const error = new Error('NotFoundError')
      const message = getErrorMessage(error, false)

      expect(message.toLowerCase()).toContain('microphone')
    })
  })

  describe('Retry Scenarios via Error Messages', () => {
    it('should indicate retryable vs non-retryable errors through message strategy', () => {
      // Retryable: API error with retry flag
      const retryableMsg = getErrorMessage(new Error('Server error'), true)
      expect(retryableMsg).toContain('Please try again')

      // Non-retryable: Specific error
      const nonRetryableMsg = getErrorMessage(new Error('Missing field'), false)
      expect(nonRetryableMsg).toBe('Missing field')
    })
  })
})
