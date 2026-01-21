/**
 * Password hashing and verification utilities using Web Crypto API
 * Uses PBKDF2 for secure password hashing (browser-native, no backend needed)
 * Includes timing-safe comparison to prevent timing attacks
 */

const ITERATIONS = 100000 // OWASP recommendation for PBKDF2
const HASH_ALGORITHM = 'SHA-256'
const KEY_LENGTH = 256 // bits

/**
 * Constant-time comparison for Uint8Array
 * Prevents timing attacks by comparing all bytes even if first byte differs
 * Uses browser-native crypto API when available
 */
const timingSafeCompare = async (
  a: Uint8Array,
  b: Uint8Array
): Promise<boolean> => {
  // Check if using Node.js crypto module (for Netlify Functions)
  try {
    // Try to use Node.js crypto.timingSafeEqual if available
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const nodeCrypto = (globalThis as any).require?.('crypto')
    if (nodeCrypto?.timingSafeEqual) {
      return nodeCrypto.timingSafeEqual(a, b)
    }
  } catch {
    // Not in Node.js or crypto module not available, use browser implementation
  }

  // Browser implementation: constant-time comparison
  if (a.length !== b.length) return false

  let diff = 0
  for (let i = 0; i < a.length; i++) {
    diff |= a[i]! ^ b[i]!
  }

  return diff === 0
}

/**
 * Hashes a password using PBKDF2
 * @param password - The password to hash
 * @returns Promise resolving to base64url encoded hash (includes salt)
 */
export const hashPassword = async (password: string): Promise<string> => {
  // Generate random salt (16 bytes)
  const salt = crypto.getRandomValues(new Uint8Array(16))

  // Convert password to bytes
  const passwordBuffer = new TextEncoder().encode(password)

  // Import password as CryptoKey
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    passwordBuffer,
    'PBKDF2',
    false,
    ['deriveBits']
  )

  // Derive key using PBKDF2
  const hashBuffer = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt,
      iterations: ITERATIONS,
      hash: HASH_ALGORITHM,
    },
    keyMaterial,
    KEY_LENGTH
  )

  // Combine salt + hash
  const combined = new Uint8Array(salt.length + hashBuffer.byteLength)
  combined.set(salt, 0)
  combined.set(new Uint8Array(hashBuffer), salt.length)

  // Return base64url encoded
  return bufferToBase64Url(combined)
}

/**
 * Verifies a password against a hash
 * @param password - The password to verify
 * @param hash - The hash to verify against (from hashPassword)
 * @returns Promise resolving to true if password matches
 */
export const verifyPassword = async (
  password: string,
  hash: string
): Promise<boolean> => {
  try {
    // Decode hash
    const combined = base64UrlToBuffer(hash)

    // Extract salt (first 16 bytes) and stored hash
    const salt = combined.slice(0, 16)
    const storedHash = combined.slice(16)

    // Convert password to bytes
    const passwordBuffer = new TextEncoder().encode(password)

    // Import password as CryptoKey
    const keyMaterial = await crypto.subtle.importKey(
      'raw',
      passwordBuffer,
      'PBKDF2',
      false,
      ['deriveBits']
    )

    // Derive key using same parameters
    const hashBuffer = await crypto.subtle.deriveBits(
      {
        name: 'PBKDF2',
        salt,
        iterations: ITERATIONS,
        hash: HASH_ALGORITHM,
      },
      keyMaterial,
      KEY_LENGTH
    )

    // Compare hashes using timing-safe comparison
    const derivedHash = new Uint8Array(hashBuffer)
    return await timingSafeCompare(derivedHash, storedHash)
  } catch {
    // Invalid hash format or other error
    return false
  }
}

/**
 * Converts a Uint8Array to base64url string
 */
const bufferToBase64Url = (buffer: Uint8Array): string => {
  const base64 = btoa(String.fromCharCode(...buffer))
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '')
}

/**
 * Converts a base64url string to Uint8Array
 */
const base64UrlToBuffer = (base64url: string): Uint8Array => {
  // Convert base64url to base64
  const base64 = base64url.replace(/-/g, '+').replace(/_/g, '/')

  // Add padding if needed
  const padding = '='.repeat((4 - (base64.length % 4)) % 4)
  const paddedBase64 = base64 + padding

  // Decode
  const binaryString = atob(paddedBase64)
  const bytes = new Uint8Array(binaryString.length)
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i)
  }
  return bytes
}
