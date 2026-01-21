/**
 * Server-side Password Utilities
 * Uses Node.js crypto for PBKDF2 hashing and timing-safe comparison
 */

import { pbkdf2, randomBytes, timingSafeEqual } from 'node:crypto'
import { promisify } from 'node:util'

const ITERATIONS = 100000 // OWASP recommendation
const HASH_ALGORITHM = 'sha256'
const KEY_LENGTH = 64 // 512 bits
const SALT_LENGTH = 16

// Promisify pbkdf2 for async usage
const pbkdf2Async = promisify(pbkdf2)

/**
 * Hash a password using PBKDF2
 * @param password - The password to hash
 * @returns Promise resolving to base64-encoded hash with salt prepended
 * Format: base64(salt + hash) - salt and hash are concatenated for verification
 */
export async function hashPasswordServer(password: string): Promise<string> {
  try {
    // Generate random salt
    const salt = randomBytes(SALT_LENGTH)

    // Hash password with salt
    const hash = (await pbkdf2Async(
      password,
      salt,
      ITERATIONS,
      KEY_LENGTH,
      HASH_ALGORITHM
    )) as Buffer

    // Combine salt + hash and return as base64
    const combined = Buffer.concat([salt, hash])
    return combined.toString('base64')
  } catch (error) {
    console.error('[password-utils-server] Hashing error:', error)
    throw error
  }
}

/**
 * Verify a password against its hash
 * @param password - The plaintext password to verify
 * @param hash - The hashed password (base64-encoded salt + hash)
 * @returns Promise resolving to true if password matches, false otherwise
 */
export async function verifyPasswordServer(
  password: string,
  hash: string
): Promise<boolean> {
  try {
    // Decode the stored hash
    const combined = Buffer.from(hash, 'base64')

    // Extract salt (first 16 bytes) and stored hash (remaining)
    const salt = combined.subarray(0, SALT_LENGTH)
    const storedHash = combined.subarray(SALT_LENGTH)

    // Hash the provided password with the same salt
    const computedHash = (await pbkdf2Async(
      password,
      salt,
      ITERATIONS,
      KEY_LENGTH,
      HASH_ALGORITHM
    )) as Buffer

    // Timing-safe comparison
    try {
      return timingSafeEqual(computedHash, storedHash)
    } catch {
      // timingSafeEqual throws if buffers are different lengths
      // This should not happen if hash format is correct, but handle gracefully
      return false
    }
  } catch (error) {
    console.error('[password-utils-server] Verification error:', error)
    // Return false instead of throwing to avoid leaking information about hash format
    return false
  }
}
