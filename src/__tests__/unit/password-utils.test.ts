import { describe, it, expect } from 'vitest'
import { hashPassword, verifyPassword } from '@/lib/password-utils'

describe('password-utils', () => {
  describe('hashPassword', () => {
    it('should hash a password', async () => {
      const hash = await hashPassword('test123')
      expect(hash).toBeDefined()
      expect(typeof hash).toBe('string')
      expect(hash.length).toBeGreaterThan(0)
    })

    it('should generate different hashes for same password (due to salt)', async () => {
      const hash1 = await hashPassword('test123')
      const hash2 = await hashPassword('test123')
      expect(hash1).not.toBe(hash2)
    })

    it('should handle empty password', async () => {
      const hash = await hashPassword('')
      expect(hash).toBeDefined()
      expect(typeof hash).toBe('string')
    })

    it('should handle special characters', async () => {
      const hash = await hashPassword('P@ssw0rd!#$%^&*()')
      expect(hash).toBeDefined()
      expect(typeof hash).toBe('string')
    })

    it('should handle unicode characters', async () => {
      const hash = await hashPassword('パスワード123')
      expect(hash).toBeDefined()
      expect(typeof hash).toBe('string')
    })
  })

  describe('verifyPassword', () => {
    it('should verify correct password', async () => {
      const password = 'test123'
      const hash = await hashPassword(password)
      const isValid = await verifyPassword(password, hash)
      expect(isValid).toBe(true)
    })

    it('should reject incorrect password', async () => {
      const hash = await hashPassword('test123')
      const isValid = await verifyPassword('wrong', hash)
      expect(isValid).toBe(false)
    })

    it('should be case-sensitive', async () => {
      const hash = await hashPassword('Test123')
      expect(await verifyPassword('test123', hash)).toBe(false)
      expect(await verifyPassword('Test123', hash)).toBe(true)
    })

    it('should handle empty password verification', async () => {
      const hash = await hashPassword('')
      expect(await verifyPassword('', hash)).toBe(true)
      expect(await verifyPassword('a', hash)).toBe(false)
    })

    it('should handle special characters in verification', async () => {
      const password = 'P@ssw0rd!#$%^&*()'
      const hash = await hashPassword(password)
      expect(await verifyPassword(password, hash)).toBe(true)
      expect(await verifyPassword('P@ssw0rd', hash)).toBe(false)
    })

    it('should handle unicode characters in verification', async () => {
      const password = 'パスワード123'
      const hash = await hashPassword(password)
      expect(await verifyPassword(password, hash)).toBe(true)
      expect(await verifyPassword('パスワード', hash)).toBe(false)
    })

    it('should reject invalid hash format', async () => {
      const isValid = await verifyPassword('test123', 'invalid-hash')
      expect(isValid).toBe(false)
    })

    it('should reject empty hash', async () => {
      const isValid = await verifyPassword('test123', '')
      expect(isValid).toBe(false)
    })

    it('should handle hash consistency', async () => {
      const password = 'mySecurePassword123'
      const hash = await hashPassword(password)

      // Verify multiple times to ensure consistency
      expect(await verifyPassword(password, hash)).toBe(true)
      expect(await verifyPassword(password, hash)).toBe(true)
      expect(await verifyPassword(password, hash)).toBe(true)
    })
  })
})
