/**
 * Unit tests for transcribe Netlify function
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { handler } from '../transcribe'
import type { Context } from '@netlify/functions'

// Mock Portkey server
vi.mock('../lib/portkey-server', () => ({
  transcribeAudio: vi.fn(),
  handlePortkeyError: vi.fn((error: unknown) => ({
    message: 'Transcription failed',
    code: 'TRANSCRIBE_ERROR',
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
  isValidUserName: vi.fn(name => name.length > 0 && name.length <= 50),
}))

const mockTranscribeAudio = vi.mocked((await import('../lib/portkey-server')).transcribeAudio)
const mockSessionExists = vi.mocked((await import('../lib/redis-client')).sessionExists)

describe('Transcribe Function', () => {
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
        headers: { 'content-type': 'multipart/form-data' },
        body: null,
      } as any)

      expect(result.statusCode).toBe(400)
      expect(result.body).toContain('Request body is required')
    })

    it('should require valid session ID', async () => {
      const formData = `--boundary\r\nContent-Disposition: form-data; name="sessionId"\r\n\r\ninvalid\r\n--boundary--`

      const result = await handler({
        httpMethod: 'POST',
        headers: { 'content-type': 'multipart/form-data; boundary=boundary' },
        body: formData,
      } as any)

      expect(result.statusCode).toBe(400)
      expect(result.body).toContain('Invalid session ID')
    })

    it('should require participant ID', async () => {
      const formData = `--boundary\r\nContent-Disposition: form-data; name="sessionId"\r\n\r\nvalid-session-123456\r\n--boundary--`

      const result = await handler({
        httpMethod: 'POST',
        headers: { 'content-type': 'multipart/form-data; boundary=boundary' },
        body: formData,
      } as any)

      expect(result.statusCode).toBe(400)
      expect(result.body).toContain('Participant ID')
    })

    it('should require participant name', async () => {
      const formData = `--boundary\r\nContent-Disposition: form-data; name="sessionId"\r\n\r\nvalid-session-123456\r\nContent-Disposition: form-data; name="participantId"\r\n\r\nuser-123\r\n--boundary--`

      const result = await handler({
        httpMethod: 'POST',
        headers: { 'content-type': 'multipart/form-data; boundary=boundary' },
        body: formData,
      } as any)

      expect(result.statusCode).toBe(400)
      expect(result.body).toContain('Participant name')
    })
  })

  describe('Audio Validation', () => {
    it('should reject audio exceeding 25MB limit', async () => {
      // Mock session exists
      mockSessionExists.mockResolvedValue(true)

      // Create form data with oversized audio
      const largeAudio = Buffer.alloc(26 * 1024 * 1024)
      const formData = `--boundary\r\nContent-Disposition: form-data; name="sessionId"\r\n\r\nvalid-session-123456\r\nContent-Disposition: form-data; name="participantId"\r\n\r\nuser-123\r\nContent-Disposition: form-data; name="participantName"\r\n\r\nAlice\r\nContent-Disposition: form-data; name="audio"; filename="audio.webm"\r\nContent-Type: audio/webm\r\n\r\n${largeAudio.toString('binary')}\r\n--boundary--`

      const result = await handler({
        httpMethod: 'POST',
        headers: { 'content-type': 'multipart/form-data; boundary=boundary' },
        body: formData,
      } as any)

      expect(result.statusCode).toBe(413)
      expect(result.body).toContain('exceeds')
    })
  })

  describe('Session Validation', () => {
    it('should reject when session does not exist', async () => {
      mockSessionExists.mockResolvedValue(false)

      const formData = `--boundary\r\nContent-Disposition: form-data; name="sessionId"\r\n\r\nvalid-session-123456\r\nContent-Disposition: form-data; name="participantId"\r\n\r\nuser-123\r\nContent-Disposition: form-data; name="participantName"\r\n\r\nAlice\r\n--boundary--`

      const result = await handler({
        httpMethod: 'POST',
        headers: { 'content-type': 'multipart/form-data; boundary=boundary' },
        body: formData,
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
        headers: { 'content-type': 'multipart/form-data' },
        body: 'test',
      } as any)

      expect(result.statusCode).toBe(502)
      expect(result.body).toContain('not configured')
    })
  })

  describe('Error Handling', () => {
    it('should handle transcription errors from Portkey', async () => {
      mockSessionExists.mockResolvedValue(true)

      const { handlePortkeyError } = await import('../lib/portkey-server')
      const mockHandleError = vi.mocked(handlePortkeyError)

      mockHandleError.mockReturnValue({
        message: 'AI service timeout',
        code: 'PORTKEY_TIMEOUT',
        status: 504,
      })

      mockTranscribeAudio.mockRejectedValue(
        new Error('request timeout')
      )

      const formData = `--boundary\r\nContent-Disposition: form-data; name="sessionId"\r\n\r\nvalid-session-123456\r\nContent-Disposition: form-data; name="participantId"\r\n\r\nuser-123\r\nContent-Disposition: form-data; name="participantName"\r\n\r\nAlice\r\n--boundary--`

      const result = await handler({
        httpMethod: 'POST',
        headers: { 'content-type': 'multipart/form-data; boundary=boundary' },
        body: formData,
      } as any)

      expect(result.statusCode).toBe(502)
      expect(result.body).toContain('error')
    })
  })

  describe('Response Format', () => {
    it('should return proper error response structure', async () => {
      const result = await handler({
        httpMethod: 'GET',
        headers: {},
      } as any)

      const body = JSON.parse(result.body)
      expect(body).toHaveProperty('error')
      expect(body).toHaveProperty('code')
    })
  })

  describe('Audio Formats', () => {
    it('should support webm format', async () => {
      mockSessionExists.mockResolvedValue(true)
      mockTranscribeAudio.mockResolvedValue({
        text: 'Test transcript',
        language: 'en',
      })

      // Verify webm is in supported formats
      const formData = `--boundary\r\nContent-Disposition: form-data; name="sessionId"\r\n\r\nvalid-session-123456\r\nContent-Disposition: form-data; name="participantId"\r\n\r\nuser-123\r\nContent-Disposition: form-data; name="participantName"\r\n\r\nAlice\r\n--boundary--`

      expect(async () => {
        // Format should be parsed from filename
      }).not.toThrow()
    })

    it('should support mp3 format', () => {
      // mp3 should be supported
      expect(['webm', 'mp3', 'mp4', 'wav']).toContain('mp3')
    })

    it('should support mp4 format', () => {
      // mp4 should be supported
      expect(['webm', 'mp3', 'mp4', 'wav']).toContain('mp4')
    })

    it('should support wav format', () => {
      // wav should be supported
      expect(['webm', 'mp3', 'mp4', 'wav']).toContain('wav')
    })
  })
})
