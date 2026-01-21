import { describe, it, expect } from 'vitest'
import {
  isValidParticipant,
  isValidSessionStructure,
  validateSession,
  getSafeSessionId,
  getSafeParticipantId,
  validateDateField,
  parseSafeSession,
} from '@/lib/session-validation'
import type { Session, Participant } from '@/types/session'

describe('session validation', () => {
  describe('isValidParticipant', () => {
    const createValidParticipant = (): Participant => ({
      id: 'user-123',
      name: 'John Doe',
      joinedAt: new Date(),
      status: 'waiting',
    })

    it('should accept valid participant', () => {
      const p = createValidParticipant()
      expect(isValidParticipant(p)).toBe(true)
    })

    it('should reject participant without id', () => {
      const p = createValidParticipant()
      const invalid = { ...p, id: undefined }
      expect(isValidParticipant(invalid)).toBe(false)
    })

    it('should reject participant with empty id', () => {
      const p = createValidParticipant()
      const invalid = { ...p, id: '' }
      expect(isValidParticipant(invalid)).toBe(false)
    })

    it('should reject participant without name', () => {
      const p = createValidParticipant()
      const invalid = { ...p, name: undefined }
      expect(isValidParticipant(invalid)).toBe(false)
    })

    it('should reject participant with empty name', () => {
      const p = createValidParticipant()
      const invalid = { ...p, name: '' }
      expect(isValidParticipant(invalid)).toBe(false)
    })

    it('should reject participant with name > 50 chars', () => {
      const p = createValidParticipant()
      const invalid = { ...p, name: 'A'.repeat(51) }
      expect(isValidParticipant(invalid)).toBe(false)
    })

    it('should reject participant with invalid status', () => {
      const p = createValidParticipant()
      const invalid = { ...p, status: 'invalid' }
      expect(isValidParticipant(invalid)).toBe(false)
    })

    it('should reject participant with invalid joinedAt', () => {
      const p = createValidParticipant()
      const invalid = { ...p, joinedAt: 'not-a-date' }
      expect(isValidParticipant(invalid)).toBe(false)
    })

    it('should accept participant with valid transcript', () => {
      const p = createValidParticipant()
      p.transcript = 'Some text'
      expect(isValidParticipant(p)).toBe(true)
    })

    it('should reject participant with non-string transcript', () => {
      const p = createValidParticipant()
      const invalid = { ...p, transcript: 123 }
      expect(isValidParticipant(invalid)).toBe(false)
    })

    it('should accept valid transcriptLanguage', () => {
      const p = createValidParticipant()
      p.transcriptLanguage = 'de'
      expect(isValidParticipant(p)).toBe(true)
    })

    it('should reject invalid transcriptLanguage', () => {
      const p = createValidParticipant()
      const invalid = { ...p, transcriptLanguage: 'fr' }
      expect(isValidParticipant(invalid)).toBe(false)
    })

    it('should reject null', () => {
      expect(isValidParticipant(null)).toBe(false)
    })

    it('should reject undefined', () => {
      expect(isValidParticipant(undefined)).toBe(false)
    })

    it('should reject non-object', () => {
      expect(isValidParticipant('not an object')).toBe(false)
      expect(isValidParticipant(123)).toBe(false)
    })
  })

  describe('isValidSessionStructure', () => {
    const createValidSession = (): Session => {
      const now = new Date()
      return {
        id: 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqr',
        createdAt: now,
        expiresAt: new Date(now.getTime() + 4 * 60 * 60 * 1000),
        status: 'waiting',
        leaderId: 'user-1',
        participants: [
          {
            id: 'user-1',
            name: 'Leader',
            joinedAt: now,
            status: 'waiting',
          },
        ],
      }
    }

    it('should accept valid session', () => {
      const s = createValidSession()
      expect(isValidSessionStructure(s)).toBe(true)
    })

    it('should reject session with short id', () => {
      const s = createValidSession()
      s.id = 'short'
      expect(isValidSessionStructure(s)).toBe(false)
    })

    it('should reject session with invalid createdAt', () => {
      const s = createValidSession()
      s.createdAt = 'not-a-date' as unknown as Date
      expect(isValidSessionStructure(s)).toBe(false)
    })

    it('should reject session with invalid status', () => {
      const s = createValidSession()
      s.status = 'invalid' as unknown as Session['status']
      expect(isValidSessionStructure(s)).toBe(false)
    })

    it('should reject session with non-array participants', () => {
      const s = createValidSession()
      s.participants = 'not-an-array' as unknown as Participant[]
      expect(isValidSessionStructure(s)).toBe(false)
    })

    it('should reject session with invalid participant', () => {
      const s = createValidSession()
      s.participants = [
        { id: '', name: '', status: 'waiting' },
      ] as unknown as Participant[]
      expect(isValidSessionStructure(s)).toBe(false)
    })

    it('should reject session with empty leaderId', () => {
      const s = createValidSession()
      s.leaderId = ''
      expect(isValidSessionStructure(s)).toBe(false)
    })

    it('should accept session with passwordHash', () => {
      const s = createValidSession()
      s.passwordHash = 'hashed_password'
      expect(isValidSessionStructure(s)).toBe(true)
    })

    it('should reject session with non-string passwordHash', () => {
      const s = createValidSession()
      s.passwordHash = 123 as unknown as string
      expect(isValidSessionStructure(s)).toBe(false)
    })

    it('should accept session with summary', () => {
      const s = createValidSession()
      s.summary = 'Summary text'
      expect(isValidSessionStructure(s)).toBe(true)
    })

    it('should reject null', () => {
      expect(isValidSessionStructure(null)).toBe(false)
    })
  })

  describe('validateSession', () => {
    const createValidSession = (): Session => {
      const now = new Date()
      return {
        id: 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqr',
        createdAt: now,
        expiresAt: new Date(now.getTime() + 4 * 60 * 60 * 1000),
        status: 'waiting',
        leaderId: 'user-1',
        participants: [
          {
            id: 'user-1',
            name: 'Leader',
            joinedAt: now,
            status: 'waiting',
          },
        ],
      }
    }

    it('should accept valid session', () => {
      const s = createValidSession()
      expect(validateSession(s)).toEqual(s)
    })

    it('should reject invalid session structure', () => {
      const invalid = { id: 'short' }
      expect(validateSession(invalid)).toBeNull()
    })

    it('should reject expired session', () => {
      const s = createValidSession()
      s.expiresAt = new Date(Date.now() - 1000) // 1 second ago
      expect(validateSession(s)).toBeNull()
    })

    it('should reject session where leader not in participants', () => {
      const s = createValidSession()
      s.leaderId = 'nonexistent-user'
      expect(validateSession(s)).toBeNull()
    })
  })

  describe('getSafeSessionId', () => {
    it('should accept valid session ID', () => {
      const id = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqr'
      expect(getSafeSessionId(id)).toBe(id)
    })

    it('should reject ID shorter than 40 chars', () => {
      expect(getSafeSessionId('short')).toBeNull()
    })

    it('should reject ID with invalid characters', () => {
      expect(getSafeSessionId('A'.repeat(40) + '+')).toBeNull()
      expect(getSafeSessionId('A'.repeat(40) + '/')).toBeNull()
    })

    it('should reject non-string', () => {
      expect(getSafeSessionId(123)).toBeNull()
      expect(getSafeSessionId(null)).toBeNull()
    })

    it('should accept ID with dashes and underscores', () => {
      const id = 'ABC-_def-_ghij-_klmn-_opqr-_stuvwxyz1234'
      expect(getSafeSessionId(id)).toBe(id)
    })
  })

  describe('getSafeParticipantId', () => {
    it('should accept valid participant ID', () => {
      const id = 'user-123_abc'
      expect(getSafeParticipantId(id)).toBe(id)
    })

    it('should reject empty string', () => {
      expect(getSafeParticipantId('')).toBeNull()
    })

    it('should reject ID longer than 100 chars', () => {
      expect(getSafeParticipantId('A'.repeat(101))).toBeNull()
    })

    it('should reject ID with invalid characters', () => {
      expect(getSafeParticipantId('user@123')).toBeNull()
      expect(getSafeParticipantId('user 123')).toBeNull()
      expect(getSafeParticipantId('user.123')).toBeNull()
    })

    it('should reject non-string', () => {
      expect(getSafeParticipantId(123)).toBeNull()
      expect(getSafeParticipantId(null)).toBeNull()
    })
  })

  describe('validateDateField', () => {
    it('should accept valid Date object', () => {
      const date = new Date()
      expect(validateDateField(date)).toEqual(date)
    })

    it('should accept valid ISO date string', () => {
      const dateStr = new Date().toISOString()
      const result = validateDateField(dateStr)
      expect(result).toBeTruthy()
      expect(result?.getTime()).toBeGreaterThan(0)
    })

    it('should reject invalid date string', () => {
      expect(validateDateField('not-a-date')).toBeNull()
    })

    it('should reject invalid Date object', () => {
      expect(validateDateField(new Date('invalid'))).toBeNull()
    })

    it('should reject non-date types', () => {
      expect(validateDateField(123)).toBeNull()
      expect(validateDateField(null)).toBeNull()
    })
  })

  describe('parseSafeSession', () => {
    const createValidSessionJson = (): string => {
      const now = new Date()
      return JSON.stringify({
        id: 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqr',
        createdAt: now.toISOString(),
        expiresAt: new Date(now.getTime() + 4 * 60 * 60 * 1000).toISOString(),
        status: 'waiting',
        leaderId: 'user-1',
        participants: [
          {
            id: 'user-1',
            name: 'Leader',
            joinedAt: now.toISOString(),
            status: 'waiting',
          },
        ],
      })
    }

    it('should parse valid session JSON', () => {
      const json = createValidSessionJson()
      const result = parseSafeSession(json)
      expect(result).toBeTruthy()
      expect(result?.id).toBeDefined()
    })

    it('should return null for invalid JSON', () => {
      expect(parseSafeSession('not json')).toBeNull()
    })

    it('should return null for malicious JSON', () => {
      const malicious = JSON.stringify({
        id: 'short',
        status: 'invalid',
      })
      expect(parseSafeSession(malicious)).toBeNull()
    })

    it('should convert date strings to Date objects', () => {
      const json = createValidSessionJson()
      const result = parseSafeSession(json)
      expect(result?.createdAt instanceof Date).toBe(true)
      expect(result?.expiresAt instanceof Date).toBe(true)
    })

    it('should return null for expired session JSON', () => {
      const now = new Date()
      const json = JSON.stringify({
        id: 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqr',
        createdAt: new Date(now.getTime() - 5 * 60 * 60 * 1000).toISOString(),
        expiresAt: new Date(now.getTime() - 1000).toISOString(), // 1 second ago
        status: 'waiting',
        leaderId: 'user-1',
        participants: [
          {
            id: 'user-1',
            name: 'Leader',
            joinedAt: new Date(
              now.getTime() - 5 * 60 * 60 * 1000
            ).toISOString(),
            status: 'waiting',
          },
        ],
      })
      expect(parseSafeSession(json)).toBeNull()
    })
  })
})
