/**
 * Sanitization utilities using native browser APIs
 * No external dependencies - reduces attack surface
 */

/**
 * HTML entity map for escaping
 */
const HTML_ENTITIES: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
  '/': '&#x2F;',
}

/**
 * Escape HTML entities to prevent XSS
 * @param input - Raw user input string
 * @returns HTML-safe string with entities escaped
 */
export const escapeHtml = (input: string): string => {
  return input.replace(/[&<>"'/]/g, char => HTML_ENTITIES[char] || char)
}

/**
 * Sanitize user input for display
 * Removes/escapes all HTML tags and entities
 * @param input - User input (name, text, etc.)
 * @returns Safe string for display
 */
export const sanitizeUserInput = (input: string): string => {
  if (!input || typeof input !== 'string') {
    return ''
  }

  // Trim whitespace
  let sanitized = input.trim()

  // Remove any HTML tags using regex
  sanitized = sanitized.replace(/<[^>]*>/g, '')

  // Escape remaining HTML entities
  sanitized = escapeHtml(sanitized)

  return sanitized
}

/**
 * Validate session ID format
 * Session IDs should be base64url strings, at least 40 chars
 * @param id - Session ID to validate
 * @returns True if valid format
 */
export const validateSessionId = (id: string): boolean => {
  if (!id || typeof id !== 'string') {
    return false
  }

  // Check length (base64url of 32 bytes ≈ 43 chars)
  if (id.length < 40) {
    return false
  }

  // Check if only contains valid base64url characters (A-Za-z0-9_-)
  const base64UrlRegex = /^[A-Za-z0-9_-]+$/
  return base64UrlRegex.test(id)
}

/**
 * Validate user name
 * Max 50 chars, no control characters, no HTML
 * @param name - User name to validate
 * @returns True if valid
 */
export const validateUserName = (name: string): boolean => {
  if (!name || typeof name !== 'string') {
    return false
  }

  const trimmed = name.trim()

  // Check length
  if (trimmed.length === 0 || trimmed.length > 50) {
    return false
  }

  // Check for control characters (ASCII 0-31, 127)
  // eslint-disable-next-line no-control-regex
  if (/[\u0000-\u001F\u007F]/.test(trimmed)) {
    return false
  }

  // Check for HTML tags
  if (/<[^>]*>/g.test(trimmed)) {
    return false
  }

  return true
}

/**
 * Validate password strength
 * Min 8 chars, no empty strings
 * @param password - Password to validate
 * @returns True if valid
 */
export const validatePasswordStrength = (password: string): boolean => {
  if (!password || typeof password !== 'string') {
    return false
  }

  // Min 8 characters
  if (password.length < 8) {
    return false
  }

  return true
}

/**
 * Sanitize for display
 * Same as sanitizeUserInput but explicit name
 * @param input - User input to display
 * @returns Safe HTML string
 */
export const sanitizeForDisplay = (input: string): string => {
  return sanitizeUserInput(input)
}
