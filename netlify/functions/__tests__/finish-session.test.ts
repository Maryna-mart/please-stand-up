/**
 * Integration tests for finish-session function
 */
/* eslint-disable @typescript-eslint/no-explicit-any */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { handler } from '../finish-session'
import { callHandler } from './lib/test-utils'

// Mock dependencies
vi.mock('../lib/redis-client', () => ({
  getSession: vi.fn(),
  updateSession: vi.fn(),
}))

vi.mock('../lib/validation', () => ({
  isValidSessionId: vi.fn(),
}))

vi.mock('../lib/portkey-server', () => ({
  summarizeTranscripts: vi.fn(),
}))

vi.mock('../lib/sendgrid-client', () => ({
  sendSummaryEmails: vi.fn(),
  isSendGridConfigured: vi.fn(),
}))

vi.mock('../lib/summary-parser', () => ({
  parseSummary: vi.fn(),
}))

vi.mock('../lib/email-crypto', () => ({
  decryptEmail: vi.fn(),
  deserializeEncryptedEmail: vi.fn(),
}))

import { getSession, updateSession } from '../lib/redis-client'
import { isValidSessionId } from '../lib/validation'
import { summarizeTranscripts } from '../lib/portkey-server'
import { sendSummaryEmails, isSendGridConfigured } from '../lib/sendgrid-client'
import { parseSummary } from '../lib/summary-parser'
import { decryptEmail, deserializeEncryptedEmail } from '../lib/email-crypto'

describe('finish-session handler', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.resetAllMocks()
  })

  describe('HTTP method validation', () => {
    it('should reject non-POST requests', async () => {
      const event = {
        httpMethod: 'GET',
        body: null,
      }

      const response = await callHandler(handler, event)

      expect(response.statusCode).toBe(405)
      expect(response.body).toContain('Method not allowed')
    })

    it('should reject PUT requests', async () => {
      const event = {
        httpMethod: 'PUT',
        body: null,
      }

      const response = await callHandler(handler, event)

      expect(response.statusCode).toBe(405)
    })
  })

  describe('Request body validation', () => {
    it('should reject empty body', async () => {
      const event = {
        httpMethod: 'POST',
        body: null,
      }

      const response = await handler(event as any)

      expect(response.statusCode).toBe(400)
      const body = JSON.parse(response.body)
      expect(body.code).toBe('EMPTY_BODY')
      expect(body.error).toContain('Request body is required')
    })

    it('should reject invalid JSON', async () => {
      const event = {
        httpMethod: 'POST',
        body: '{invalid json}',
      }

      const response = await handler(event as any)

      expect(response.statusCode).toBe(400)
      const body = JSON.parse(response.body)
      expect(body.code).toBe('INVALID_JSON')
    })
  })

  describe('Session ID validation', () => {
    it('should reject invalid session ID format', async () => {
      vi.mocked(isValidSessionId).mockReturnValue(false)

      const event = {
        httpMethod: 'POST',
        body: JSON.stringify({
          sessionId: 'invalid',
          transcripts: [{ participantName: 'Alice', text: 'Some work' }],
        }),
      }

      const response = await handler(event as any)

      expect(response.statusCode).toBe(400)
      const body = JSON.parse(response.body)
      expect(body.code).toBe('INVALID_SESSION_ID')
    })
  })

  describe('Transcripts validation', () => {
    beforeEach(() => {
      vi.mocked(isValidSessionId).mockReturnValue(true)
    })

    it('should reject empty transcripts array', async () => {
      const event = {
        httpMethod: 'POST',
        body: JSON.stringify({
          sessionId: 'valid-id-123',
          transcripts: [],
        }),
      }

      const response = await handler(event as any)

      expect(response.statusCode).toBe(400)
      const body = JSON.parse(response.body)
      expect(body.code).toBe('MISSING_TRANSCRIPTS')
    })

    it('should reject non-array transcripts', async () => {
      const event = {
        httpMethod: 'POST',
        body: JSON.stringify({
          sessionId: 'valid-id-123',
          transcripts: 'not-an-array',
        }),
      }

      const response = await handler(event as any)

      expect(response.statusCode).toBe(400)
      const body = JSON.parse(response.body)
      expect(body.code).toBe('MISSING_TRANSCRIPTS')
    })
  })

  describe('Session not found', () => {
    beforeEach(() => {
      vi.mocked(isValidSessionId).mockReturnValue(true)
      vi.mocked(getSession).mockResolvedValue(null)
    })

    it('should return 404 when session does not exist', async () => {
      const event = {
        httpMethod: 'POST',
        body: JSON.stringify({
          sessionId: 'nonexistent-id',
          transcripts: [{ participantName: 'Alice', text: 'Work' }],
        }),
      }

      const response = await handler(event as any)

      expect(response.statusCode).toBe(404)
      const body = JSON.parse(response.body)
      expect(body.code).toBe('SESSION_NOT_FOUND')
    })
  })

  describe('Summary generation', () => {
    beforeEach(() => {
      vi.mocked(isValidSessionId).mockReturnValue(true)
      vi.mocked(getSession).mockResolvedValue({
        sessionId: 'session-123',
        leaderName: 'Leader',
        participants: [],
      } as any)
      vi.mocked(isSendGridConfigured).mockReturnValue(false)
    })

    it('should handle summary generation failure', async () => {
      vi.mocked(summarizeTranscripts).mockRejectedValue(
        new Error('Claude API error')
      )

      const event = {
        httpMethod: 'POST',
        body: JSON.stringify({
          sessionId: 'session-123',
          transcripts: [{ participantName: 'Alice', text: 'Work' }],
        }),
      }

      const response = await handler(event as any)

      expect(response.statusCode).toBe(502)
      const body = JSON.parse(response.body)
      expect(body.code).toBe('SUMMARY_GENERATION_ERROR')
    })

    it('should handle session update failure', async () => {
      vi.mocked(summarizeTranscripts).mockResolvedValue(
        '**Alice**:\n✅ Yesterday: Work'
      )
      vi.mocked(updateSession).mockResolvedValue(false)

      const event = {
        httpMethod: 'POST',
        body: JSON.stringify({
          sessionId: 'session-123',
          transcripts: [{ participantName: 'Alice', text: 'Work' }],
        }),
      }

      const response = await handler(event as any)

      expect(response.statusCode).toBe(502)
      const body = JSON.parse(response.body)
      expect(body.code).toBe('STORAGE_ERROR')
    })

    it('should successfully complete without email', async () => {
      const summaryText =
        '**Alice**:\n✅ Yesterday: Completed work\n🎯 Today: Starting new task'
      vi.mocked(summarizeTranscripts).mockResolvedValue(summaryText)
      vi.mocked(updateSession).mockResolvedValue(true)
      vi.mocked(isSendGridConfigured).mockReturnValue(false)

      const event = {
        httpMethod: 'POST',
        body: JSON.stringify({
          sessionId: 'session-123',
          transcripts: [
            {
              participantName: 'Alice',
              text: 'I completed work. Today I will start a new task',
            },
          ],
        }),
      }

      const response = await handler(event as any)

      expect(response.statusCode).toBe(200)
      const body = JSON.parse(response.body)
      expect(body.success).toBe(true)
      expect(body.sessionId).toBe('session-123')
      expect(body.rawText).toBe(summaryText)
    })
  })

  describe('Email functionality', () => {
    beforeEach(() => {
      vi.mocked(isValidSessionId).mockReturnValue(true)
      vi.mocked(isSendGridConfigured).mockReturnValue(true)
      vi.mocked(summarizeTranscripts).mockResolvedValue(
        '**Alice**:\n✅ Yesterday: Work'
      )
      vi.mocked(updateSession).mockResolvedValue(true)
      vi.mocked(parseSummary).mockReturnValue({
        participants: [
          {
            name: 'Alice',
            sections: { yesterday: 'Work' },
          },
        ],
      })
    })

    it('should collect leader email when encrypted', async () => {
      vi.mocked(getSession).mockResolvedValue({
        sessionId: 'session-123',
        leaderName: 'John',
        encryptedEmail: 'encrypted-leader@example.com',
        participants: [],
      } as any)

      vi.mocked(deserializeEncryptedEmail).mockReturnValue({
        iv: 'test-iv',
        encryptedData: 'test-data',
      } as any)
      vi.mocked(decryptEmail).mockReturnValue('john@example.com')
      vi.mocked(sendSummaryEmails).mockResolvedValue([] as any)

      const event = {
        httpMethod: 'POST',
        body: JSON.stringify({
          sessionId: 'session-123',
          transcripts: [{ participantName: 'Alice', text: 'Work' }],
        }),
      }

      const response = await handler(event as any)

      expect(response.statusCode).toBe(200)
      expect(sendSummaryEmails).toHaveBeenCalled()
      const callArgs = vi.mocked(sendSummaryEmails).mock.calls[0]
      expect(callArgs[0]).toContainEqual({
        email: 'john@example.com',
        name: 'John',
      })
    })

    it('should collect participant emails when encrypted', async () => {
      vi.mocked(getSession).mockResolvedValue({
        sessionId: 'session-123',
        leaderName: 'John',
        participants: [
          {
            name: 'Alice',
            encryptedEmail: 'encrypted-alice@example.com',
          },
          {
            name: 'Bob',
            encryptedEmail: 'encrypted-bob@example.com',
          },
        ],
      } as any)

      vi.mocked(deserializeEncryptedEmail).mockReturnValue({
        iv: 'test-iv',
        encryptedData: 'test-data',
      } as any)
      vi.mocked(decryptEmail).mockImplementation((_, sessionId) =>
        sessionId === 'session-123' ? 'alice@example.com' : 'bob@example.com'
      )
      vi.mocked(sendSummaryEmails).mockResolvedValue([] as any)

      const event = {
        httpMethod: 'POST',
        body: JSON.stringify({
          sessionId: 'session-123',
          transcripts: [{ participantName: 'Alice', text: 'Work' }],
        }),
      }

      const response = await handler(event as any)

      expect(response.statusCode).toBe(200)
      expect(sendSummaryEmails).toHaveBeenCalled()
    })

    it('should handle decryption errors gracefully', async () => {
      vi.mocked(getSession).mockResolvedValue({
        sessionId: 'session-123',
        leaderName: 'John',
        encryptedEmail: 'encrypted-leader@example.com',
        participants: [],
      } as any)

      vi.mocked(deserializeEncryptedEmail).mockImplementation(() => {
        throw new Error('Decryption failed')
      })

      const event = {
        httpMethod: 'POST',
        body: JSON.stringify({
          sessionId: 'session-123',
          transcripts: [{ participantName: 'Alice', text: 'Work' }],
        }),
      }

      const response = await handler(event as any)

      // Should still succeed - email failure doesn't fail the session
      expect(response.statusCode).toBe(200)
      const body = JSON.parse(response.body)
      expect(body.success).toBe(true)
    })

    it('should skip email sending when no recipients', async () => {
      vi.mocked(getSession).mockResolvedValue({
        sessionId: 'session-123',
        leaderName: 'John',
        participants: [],
      } as any)

      const event = {
        httpMethod: 'POST',
        body: JSON.stringify({
          sessionId: 'session-123',
          transcripts: [{ participantName: 'Alice', text: 'Work' }],
        }),
      }

      const response = await handler(event as any)

      expect(response.statusCode).toBe(200)
      // sendSummaryEmails should not be called if no recipients
      expect(sendSummaryEmails).not.toHaveBeenCalled()
    })

    it('should not fail if email sending throws', async () => {
      vi.mocked(getSession).mockResolvedValue({
        sessionId: 'session-123',
        leaderName: 'John',
        encryptedEmail: 'encrypted-leader@example.com',
        participants: [],
      } as any)

      vi.mocked(deserializeEncryptedEmail).mockReturnValue({
        iv: 'test-iv',
        encryptedData: 'test-data',
      } as any)
      vi.mocked(decryptEmail).mockReturnValue('john@example.com')
      vi.mocked(sendSummaryEmails).mockRejectedValue(
        new Error('SendGrid error')
      )

      const event = {
        httpMethod: 'POST',
        body: JSON.stringify({
          sessionId: 'session-123',
          transcripts: [{ participantName: 'Alice', text: 'Work' }],
        }),
      }

      const response = await handler(event as any)

      // Should still succeed - email failure doesn't fail the session
      expect(response.statusCode).toBe(200)
      const body = JSON.parse(response.body)
      expect(body.success).toBe(true)
    })
  })

  describe('Summary parsing integration', () => {
    beforeEach(() => {
      vi.mocked(isValidSessionId).mockReturnValue(true)
      vi.mocked(isSendGridConfigured).mockReturnValue(true)
      vi.mocked(summarizeTranscripts).mockResolvedValue(
        '**Alice**:\n✅ Yesterday: Complex work\n**Bob**:\n✅ Yesterday: Different work'
      )
      vi.mocked(updateSession).mockResolvedValue(true)
    })

    it('should parse summary before sending emails', async () => {
      const mockParsedSummary = {
        participants: [
          {
            name: 'Alice',
            sections: { yesterday: 'Complex work' },
          },
          {
            name: 'Bob',
            sections: { yesterday: 'Different work' },
          },
        ],
      }
      vi.mocked(parseSummary).mockReturnValue(mockParsedSummary)
      vi.mocked(sendSummaryEmails).mockResolvedValue([] as any)

      vi.mocked(getSession).mockResolvedValue({
        sessionId: 'session-123',
        leaderName: 'Leader',
        encryptedEmail: 'encrypted-leader@example.com',
        participants: [],
      } as any)

      vi.mocked(deserializeEncryptedEmail).mockReturnValue({
        iv: 'test-iv',
        encryptedData: 'test-data',
      } as any)
      vi.mocked(decryptEmail).mockReturnValue('leader@example.com')

      const event = {
        httpMethod: 'POST',
        body: JSON.stringify({
          sessionId: 'session-123',
          transcripts: [
            { participantName: 'Alice', text: 'Complex work' },
            { participantName: 'Bob', text: 'Different work' },
          ],
        }),
      }

      const response = await handler(event as any)

      expect(response.statusCode).toBe(200)
      expect(parseSummary).toHaveBeenCalledWith(
        '**Alice**:\n✅ Yesterday: Complex work\n**Bob**:\n✅ Yesterday: Different work'
      )

      // sendSummaryEmails should receive parsed summary as 3rd argument
      expect(sendSummaryEmails).toHaveBeenCalled()
      const callArgs = vi.mocked(sendSummaryEmails).mock.calls[0]
      expect(callArgs[2]).toEqual(mockParsedSummary)
    })
  })

  describe('Unexpected errors', () => {
    it('should handle unexpected errors gracefully', async () => {
      vi.mocked(isValidSessionId).mockImplementation(() => {
        throw new Error('Unexpected validation error')
      })

      const event = {
        httpMethod: 'POST',
        body: JSON.stringify({
          sessionId: 'session-123',
          transcripts: [{ participantName: 'Alice', text: 'Work' }],
        }),
      }

      const response = await handler(event as any)

      expect(response.statusCode).toBe(500)
      const body = JSON.parse(response.body)
      expect(body.code).toBe('INTERNAL_ERROR')
    })
  })

  describe('Multi-participant workflows', () => {
    beforeEach(() => {
      vi.mocked(isValidSessionId).mockReturnValue(true)
      vi.mocked(isSendGridConfigured).mockReturnValue(true)
      vi.mocked(updateSession).mockResolvedValue(true)
    })

    it('should handle 3+ participants successfully', async () => {
      const summaryText = `**Alice**:
✅ Yesterday: API work
🎯 Today: Testing

**Bob**:
✅ Yesterday: Frontend fixes
🎯 Today: Feature implementation

**Charlie**:
✅ Yesterday: Documentation
🎯 Today: Code review`

      vi.mocked(summarizeTranscripts).mockResolvedValue(summaryText)
      vi.mocked(parseSummary).mockReturnValue({
        participants: [
          {
            name: 'Alice',
            sections: { yesterday: 'API work', today: 'Testing' },
          },
          {
            name: 'Bob',
            sections: {
              yesterday: 'Frontend fixes',
              today: 'Feature implementation',
            },
          },
          {
            name: 'Charlie',
            sections: { yesterday: 'Documentation', today: 'Code review' },
          },
        ],
      })

      vi.mocked(getSession).mockResolvedValue({
        sessionId: 'session-123',
        leaderName: 'Leader',
        encryptedEmail: 'leader@example.com',
        participants: [
          { name: 'Alice', encryptedEmail: 'alice@example.com' },
          { name: 'Bob', encryptedEmail: 'bob@example.com' },
          { name: 'Charlie', encryptedEmail: 'charlie@example.com' },
        ],
      } as any)

      vi.mocked(deserializeEncryptedEmail).mockReturnValue({
        iv: 'test',
        encryptedData: 'test',
      } as any)
      vi.mocked(decryptEmail).mockReturnValue('decrypted@example.com')
      vi.mocked(sendSummaryEmails).mockResolvedValue([] as any)

      const event = {
        httpMethod: 'POST',
        body: JSON.stringify({
          sessionId: 'session-123',
          transcripts: [
            { participantName: 'Alice', text: 'API work. Testing today' },
            {
              participantName: 'Bob',
              text: 'Frontend fixes. Feature implementation today',
            },
            {
              participantName: 'Charlie',
              text: 'Documentation. Code review today',
            },
          ],
        }),
      }

      const response = await handler(event as any)

      expect(response.statusCode).toBe(200)
      expect(sendSummaryEmails).toHaveBeenCalled()
      const callArgs = vi.mocked(sendSummaryEmails).mock.calls[0]
      // Should have 4 recipients: leader + 3 participants
      expect(callArgs[0].length).toBe(4)
    })
  })
})
