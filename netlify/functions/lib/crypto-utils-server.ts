/**
 * Server-side Crypto Utilities
 * Uses Node.js crypto for secure code verification
 */

import { createHmac } from 'node:crypto'

const SESSION_SECRET = process.env.SESSION_SECRET

if (!SESSION_SECRET) {
  console.warn('[crypto-utils-server] SESSION_SECRET not configured')
}

/**
 * Generate HMAC hash for verification code
 * Uses deterministic hashing (unlike PBKDF2) so same code always produces same hash
 * Allows looking up codes by their plaintext value
 */
export function hashVerificationCode(code: string): string {
  if (!SESSION_SECRET) {
    throw new Error('SESSION_SECRET not configured')
  }

  const hmac = createHmac('sha256', SESSION_SECRET)
  hmac.update(code)
  return hmac.digest('hex')
}

/**
 * Verify a code against its hash
 * For verification codes, we use HMAC which is deterministic
 */
export function verifyCodeHash(code: string, hash: string): boolean {
  try {
    const computedHash = hashVerificationCode(code)
    return computedHash === hash
  } catch (error) {
    console.error('[crypto-utils-server] Error verifying code hash:', error)
    return false
  }
}
