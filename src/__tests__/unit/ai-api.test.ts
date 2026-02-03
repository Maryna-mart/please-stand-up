/**
 * Unit tests for ai-api client
 * Tests error handling and API integration
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { getErrorMessage, parseAPIError } from '@/lib/ai-api'

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
