import { describe, it, expect } from 'vitest'
import {
  generateSessionId,
  generateUserId,
  isValidSessionId,
  isValidUserId,
} from '@/lib/crypto-utils'

describe('crypto-utils', () => {
  describe('generateSessionId', () => {
    it('should generate a session ID', () => {
      const id = generateSessionId()
      expect(id).toBeDefined()
      expect(typeof id).toBe('string')
    })

    it('should generate unique IDs', () => {
      const id1 = generateSessionId()
      const id2 = generateSessionId()
      expect(id1).not.toBe(id2)
    })

    it('should generate IDs with minimum length', () => {
      const id = generateSessionId()
      expect(id.length).toBeGreaterThanOrEqual(40)
    })

    it('should generate URL-safe IDs (base64url)', () => {
      const id = generateSessionId()
      const base64UrlRegex = /^[A-Za-z0-9_-]+$/
      expect(base64UrlRegex.test(id)).toBe(true)
    })

    it('should not contain unsafe URL characters', () => {
      const id = generateSessionId()
      expect(id).not.toContain('+')
      expect(id).not.toContain('/')
      expect(id).not.toContain('=')
    })
  })

  describe('generateUserId', () => {
    it('should generate a user ID', () => {
      const id = generateUserId()
      expect(id).toBeDefined()
      expect(typeof id).toBe('string')
    })

    it('should generate unique IDs', () => {
      const id1 = generateUserId()
      const id2 = generateUserId()
      expect(id1).not.toBe(id2)
    })

    it('should generate IDs with minimum length', () => {
      const id = generateUserId()
      expect(id.length).toBeGreaterThanOrEqual(20)
    })

    it('should generate URL-safe IDs', () => {
      const id = generateUserId()
      const base64UrlRegex = /^[A-Za-z0-9_-]+$/
      expect(base64UrlRegex.test(id)).toBe(true)
    })
  })

  describe('isValidSessionId', () => {
    it('should validate a valid session ID', () => {
      const id = generateSessionId()
      expect(isValidSessionId(id)).toBe(true)
    })

    it('should reject IDs that are too short', () => {
      expect(isValidSessionId('abc123')).toBe(false)
    })

    it('should reject IDs with invalid characters', () => {
      expect(isValidSessionId('a'.repeat(40) + '+')).toBe(false)
      expect(isValidSessionId('a'.repeat(40) + '/')).toBe(false)
      expect(isValidSessionId('a'.repeat(40) + '=')).toBe(false)
      expect(isValidSessionId('a'.repeat(40) + ' ')).toBe(false)
    })

    it('should accept valid base64url characters', () => {
      const validId =
        'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_'
      expect(isValidSessionId(validId)).toBe(true)
    })
  })

  describe('isValidUserId', () => {
    it('should validate a valid user ID', () => {
      const id = generateUserId()
      expect(isValidUserId(id)).toBe(true)
    })

    it('should reject IDs that are too short', () => {
      expect(isValidUserId('abc')).toBe(false)
    })

    it('should reject IDs with invalid characters', () => {
      expect(isValidUserId('a'.repeat(20) + '+')).toBe(false)
    })

    it('should accept valid base64url characters', () => {
      const validId = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklm'
      expect(isValidUserId(validId)).toBe(true)
    })
  })
})
