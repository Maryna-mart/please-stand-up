/**
 * Cryptographic utilities for secure session ID generation
 * Uses Web Crypto API for browser-native cryptographic operations
 */

/**
 * Generates a cryptographically secure random session ID
 * @returns URL-safe random string with at least 32 bytes of entropy
 */
export const generateSessionId = (): string => {
  // Generate 32 random bytes (256 bits of entropy)
  const buffer = new Uint8Array(32)
  crypto.getRandomValues(buffer)

  // Convert to base64url (URL-safe)
  return bufferToBase64Url(buffer)
}

/**
 * Generates a cryptographically secure random user ID
 * @returns URL-safe random string with 16 bytes of entropy
 */
export const generateUserId = (): string => {
  const buffer = new Uint8Array(16)
  crypto.getRandomValues(buffer)
  return bufferToBase64Url(buffer)
}

/**
 * Converts a Uint8Array to a base64url string (URL-safe)
 * @param buffer - The buffer to convert
 * @returns Base64url encoded string
 */
const bufferToBase64Url = (buffer: Uint8Array): string => {
  // Convert to base64
  const base64 = btoa(String.fromCharCode(...buffer))

  // Make URL-safe: replace +/= with -_
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '')
}

/**
 * Validates if a string is a valid session ID format
 * @param id - The ID to validate
 * @returns True if valid session ID format
 */
export const isValidSessionId = (id: string): boolean => {
  // Check length (base64url of 32 bytes ≈ 43 chars)
  if (id.length < 40) return false

  // Check if only contains valid base64url characters
  const base64UrlRegex = /^[A-Za-z0-9_-]+$/
  return base64UrlRegex.test(id)
}

/**
 * Validates if a string is a valid user ID format
 * @param id - The ID to validate
 * @returns True if valid user ID format
 */
export const isValidUserId = (id: string): boolean => {
  // Check length (base64url of 16 bytes ≈ 22 chars)
  if (id.length < 20) return false

  // Check if only contains valid base64url characters
  const base64UrlRegex = /^[A-Za-z0-9_-]+$/
  return base64UrlRegex.test(id)
}
