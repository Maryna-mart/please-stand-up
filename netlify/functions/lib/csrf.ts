/**
 * CSRF Token Generation and Validation
 * Provides basic CSRF protection for state-changing operations
 */

import { randomBytes } from 'node:crypto'

interface CsrfTokenEntry {
  token: string
  createdAt: number
  expiresAt: number
}

const CSRF_TOKEN_LIFETIME_MS = 10 * 60 * 1000 // 10 minutes

// In-memory store for CSRF tokens
// In production, this should use Redis or a database
const csrfTokenStore = new Map<string, CsrfTokenEntry>()

/**
 * Generate a new CSRF token
 * @returns CSRF token string
 */
export function generateCsrfToken(): string {
  // Generate 32 bytes of random data
  const buffer = randomBytes(32)
  const token = buffer.toString('hex')

  // Store token with expiration
  csrfTokenStore.set(token, {
    token,
    createdAt: Date.now(),
    expiresAt: Date.now() + CSRF_TOKEN_LIFETIME_MS,
  })

  return token
}

/**
 * Validate a CSRF token
 * @param token - Token to validate
 * @returns true if token is valid and not expired, false otherwise
 */
export function validateCsrfToken(token: string): boolean {
  const entry = csrfTokenStore.get(token)

  if (!entry) {
    return false
  }

  const now = Date.now()

  // Check if expired
  if (entry.expiresAt < now) {
    csrfTokenStore.delete(token)
    return false
  }

  // Token is valid - remove it (one-time use)
  csrfTokenStore.delete(token)

  return true
}

/**
 * Cleanup expired CSRF tokens (call periodically)
 */
export function cleanupExpiredTokens(): void {
  const now = Date.now()

  for (const [token, entry] of csrfTokenStore.entries()) {
    if (entry.expiresAt < now) {
      csrfTokenStore.delete(token)
    }
  }
}

/**
 * Reset CSRF token store for testing
 */
export function resetCsrfStore(): void {
  csrfTokenStore.clear()
}

/**
 * Get store size (for testing/monitoring)
 */
export function getStoreSize(): number {
  return csrfTokenStore.size
}
