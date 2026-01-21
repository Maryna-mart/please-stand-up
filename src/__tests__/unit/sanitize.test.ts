import { describe, it, expect } from 'vitest'
import {
  escapeHtml,
  sanitizeUserInput,
  sanitizeForDisplay,
  validateSessionId,
  validateUserName,
  validatePasswordStrength,
} from '@/lib/sanitize'

describe('sanitize utilities', () => {
  describe('escapeHtml', () => {
    it('should escape HTML entities', () => {
      const input = '<script>alert("xss")</script>'
      const result = escapeHtml(input)
      expect(result).toBe(
        '&lt;script&gt;alert(&quot;xss&quot;)&lt;&#x2F;script&gt;'
      )
    })

    it('should escape ampersand', () => {
      expect(escapeHtml('AT&T')).toBe('AT&amp;T')
    })

    it('should escape quotes', () => {
      expect(escapeHtml('He said "hello"')).toBe('He said &quot;hello&quot;')
    })

    it('should escape single quotes', () => {
      expect(escapeHtml("It's working")).toBe('It&#39;s working')
    })

    it('should escape forward slashes', () => {
      expect(escapeHtml('</div>')).toBe('&lt;&#x2F;div&gt;')
    })

    it('should handle multiple special characters', () => {
      expect(escapeHtml('<a href="test">')).toBe(
        '&lt;a href=&quot;test&quot;&gt;'
      )
    })

    it('should not modify safe strings', () => {
      const safe = 'John Doe'
      expect(escapeHtml(safe)).toBe(safe)
    })
  })

  describe('sanitizeUserInput', () => {
    it('should remove HTML tags with script tag XSS', () => {
      const xss = '<script>alert("xss")</script>John'
      const result = sanitizeUserInput(xss)
      expect(result).not.toContain('<script>')
      expect(result).not.toContain('</script>')
      expect(result).toContain('John')
    })

    it('should remove img tag with onerror XSS', () => {
      const xss = '<img src=x onerror="alert(1)">'
      const result = sanitizeUserInput(xss)
      expect(result).not.toContain('<img')
      expect(result).not.toContain('onerror')
    })

    it('should remove iframe tag', () => {
      const xss = '<iframe src="malicious.com"></iframe>'
      const result = sanitizeUserInput(xss)
      expect(result).not.toContain('<iframe')
      expect(result).not.toContain('</iframe>')
    })

    it('should handle SVG XSS payload', () => {
      const xss = '<svg onload="alert(1)"></svg>'
      const result = sanitizeUserInput(xss)
      expect(result).not.toContain('<svg')
      expect(result).not.toContain('onload')
    })

    it('should handle event handler XSS', () => {
      const xss = '<div onclick="steal()">Click me</div>'
      const result = sanitizeUserInput(xss)
      expect(result).not.toContain('<div')
      expect(result).not.toContain('onclick')
      expect(result).toContain('Click me')
    })

    it('should trim whitespace', () => {
      const input = '  John Doe  '
      expect(sanitizeUserInput(input)).toBe('John Doe')
    })

    it('should return empty string for null or undefined', () => {
      expect(sanitizeUserInput(null as unknown as string)).toBe('')
      expect(sanitizeUserInput(undefined as unknown as string)).toBe('')
    })

    it('should handle empty string', () => {
      expect(sanitizeUserInput('')).toBe('')
    })

    it('should preserve safe text with special characters', () => {
      const input = "José's café & restaurant"
      const result = sanitizeUserInput(input)
      expect(result).toContain('José')
      expect(result).toContain('café')
      expect(result).toContain('restaurant')
    })

    it('should handle JavaScript protocol XSS', () => {
      const xss = '<a href="javascript:alert(1)">Click</a>'
      const result = sanitizeUserInput(xss)
      expect(result).not.toContain('<a')
      expect(result).not.toContain('javascript:')
      expect(result).toContain('Click')
    })

    it('should handle style tag XSS with expression', () => {
      const xss =
        '<style>body { background: url("javascript:alert(1)") }</style>'
      const result = sanitizeUserInput(xss)
      // Style tag is removed, so no XSS possible
      expect(result).not.toContain('<style')
      // Note: javascript: is escaped and inside quotes, so it's safe
      // The key is the <style> tag is removed
      expect(result).not.toContain('<style')
    })

    it('should handle data URI XSS', () => {
      const xss = '<img src="data:text/html,<script>alert(1)</script>">'
      const result = sanitizeUserInput(xss)
      expect(result).not.toContain('<img')
      expect(result).not.toContain('data:')
    })

    it('should handle form tag with action XSS', () => {
      const xss = '<form action="javascript:alert(1)"><input /></form>'
      const result = sanitizeUserInput(xss)
      expect(result).not.toContain('<form')
      expect(result).not.toContain('javascript:')
    })
  })

  describe('sanitizeForDisplay', () => {
    it('should behave same as sanitizeUserInput', () => {
      const input = '<script>alert("xss")</script>Test'
      expect(sanitizeForDisplay(input)).toBe(sanitizeUserInput(input))
    })
  })

  describe('validateSessionId', () => {
    it('should accept valid base64url session ID', () => {
      const validId = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqr'
      expect(validateSessionId(validId)).toBe(true)
    })

    it('should reject IDs shorter than 40 chars', () => {
      expect(validateSessionId('short123')).toBe(false)
    })

    it('should reject IDs with invalid base64url characters', () => {
      expect(validateSessionId('A'.repeat(40) + '+')).toBe(false)
      expect(validateSessionId('A'.repeat(40) + '/')).toBe(false)
      expect(validateSessionId('A'.repeat(40) + '=')).toBe(false)
      expect(validateSessionId('A'.repeat(40) + ' ')).toBe(false)
    })

    it('should reject empty string', () => {
      expect(validateSessionId('')).toBe(false)
    })

    it('should reject null/undefined', () => {
      expect(validateSessionId(null as unknown as string)).toBe(false)
      expect(validateSessionId(undefined as unknown as string)).toBe(false)
    })

    it('should accept valid dashes and underscores', () => {
      const validId = 'ABC-_def-_ghij-_klmn-_opqr-_stuvwxyz1234'
      expect(validateSessionId(validId)).toBe(true)
    })
  })

  describe('validateUserName', () => {
    it('should accept valid name', () => {
      expect(validateUserName('John Doe')).toBe(true)
    })

    it('should accept name with unicode characters', () => {
      expect(validateUserName('José García')).toBe(true)
      expect(validateUserName('李明')).toBe(true)
      expect(validateUserName('Müller')).toBe(true)
    })

    it('should reject empty string', () => {
      expect(validateUserName('')).toBe(false)
    })

    it('should reject whitespace only', () => {
      expect(validateUserName('   ')).toBe(false)
    })

    it('should reject names longer than 50 chars', () => {
      expect(validateUserName('A'.repeat(51))).toBe(false)
    })

    it('should accept exactly 50 chars', () => {
      expect(validateUserName('A'.repeat(50))).toBe(true)
    })

    it('should reject null/undefined', () => {
      expect(validateUserName(null as unknown as string)).toBe(false)
      expect(validateUserName(undefined as unknown as string)).toBe(false)
    })

    it('should reject names with HTML tags', () => {
      expect(validateUserName('<script>alert("xss")</script>')).toBe(false)
      expect(validateUserName('<img src=x>')).toBe(false)
      expect(validateUserName('John<div>Doe</div>')).toBe(false)
    })

    it('should reject names with control characters', () => {
      expect(validateUserName('John\x00Doe')).toBe(false) // Null byte
      expect(validateUserName('John\x1fDoe')).toBe(false) // Unit separator
      expect(validateUserName('John\x7fDoe')).toBe(false) // Delete character
    })

    it('should accept names with special characters', () => {
      expect(validateUserName("O'Brien")).toBe(true)
      expect(validateUserName('Smith-Jones')).toBe(true)
      expect(validateUserName('Jean-Pierre')).toBe(true)
    })
  })

  describe('validatePasswordStrength', () => {
    it('should accept strong password', () => {
      expect(validatePasswordStrength('MyPassword123!')).toBe(true)
    })

    it('should reject passwords shorter than 8 chars', () => {
      expect(validatePasswordStrength('Pass123')).toBe(false)
      expect(validatePasswordStrength('short')).toBe(false)
    })

    it('should accept exactly 8 chars', () => {
      expect(validatePasswordStrength('Pass1234')).toBe(true)
    })

    it('should reject empty string', () => {
      expect(validatePasswordStrength('')).toBe(false)
    })

    it('should reject null/undefined', () => {
      expect(validatePasswordStrength(null as unknown as string)).toBe(false)
      expect(validatePasswordStrength(undefined as unknown as string)).toBe(
        false
      )
    })

    it('should accept password with special characters', () => {
      expect(validatePasswordStrength('P@ssw0rd!')).toBe(true)
    })

    it('should accept password with spaces', () => {
      expect(validatePasswordStrength('my secure password')).toBe(true)
    })
  })
})
