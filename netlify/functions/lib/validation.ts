/**
 * Server-side Validation Module
 * Validates all user inputs before processing
 */

/**
 * Validate session ID format
 * Must be base64url encoded, 43-44 characters long
 */
export function isValidSessionId(id: string): boolean {
  if (typeof id !== 'string') return false
  if (id.length < 40 || id.length > 50) return false
  // Base64url pattern: alphanumeric, dash, underscore only
  const base64urlPattern = /^[A-Za-z0-9_-]+$/
  return base64urlPattern.test(id)
}

/**
 * Validate user name
 */
export function isValidUserName(name: string): boolean {
  if (typeof name !== 'string') return false

  const trimmed = name.trim()

  // Must be 1-50 characters
  if (trimmed.length === 0 || trimmed.length > 50) return false

  // No control characters (eslint-disable for necessary regex)
  // eslint-disable-next-line no-control-regex
  if (/[\x00-\x1F\x7F]/.test(trimmed)) return false

  // No HTML tags or entities (basic check)
  if (/<|>|&|"|'/.test(trimmed)) return false

  return true
}

/**
 * Validate password strength
 * Minimum 8 characters
 */
export function isPasswordSecure(password: string): boolean {
  if (typeof password !== 'string') return false
  return password.length >= 8
}

/**
 * Validate email address (basic check)
 */
export function isValidEmail(email: string): boolean {
  if (typeof email !== 'string') return false

  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailPattern.test(email)
}

/**
 * Validate email list (comma-separated)
 */
export function isValidEmailList(emails: string): boolean {
  if (typeof emails !== 'string') return false

  const emailList = emails
    .split(',')
    .map(e => e.trim())
    .filter(e => e.length > 0)

  if (emailList.length === 0) return false

  return emailList.every(email => isValidEmail(email))
}

/**
 * Sanitize user input - remove dangerous characters
 * This is a second line of defense after validation
 */
export function sanitizeInput(input: string): string {
  if (typeof input !== 'string') return ''

  // Remove any HTML tags
  let sanitized = input.replace(/<[^>]*>/g, '')

  // Escape HTML entities
  sanitized = sanitized
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')

  // Trim whitespace
  sanitized = sanitized.trim()

  return sanitized
}

/**
 * Parse and validate a JSON object safely
 */
export function parseSafeJson<T>(json: string): T | null {
  try {
    const parsed = JSON.parse(json)
    return parsed as T
  } catch {
    return null
  }
}

/**
 * Validate that a number is within range
 */
export function isNumberInRange(
  value: unknown,
  min: number,
  max: number
): value is number {
  return typeof value === 'number' && value >= min && value <= max
}

/**
 * Validate that an array has items
 */
export function isNonEmptyArray(value: unknown): value is unknown[] {
  return Array.isArray(value) && value.length > 0
}

/**
 * Extract client IP from request
 * Checks X-Forwarded-For, CF-Connecting-IP, and falls back to remote address
 */
export function getClientIp(
  headers: Record<string, string | string[] | undefined>
): string {
  // Check for X-Forwarded-For (most common)
  const forwarded = headers['x-forwarded-for']
  if (forwarded) {
    const ip = Array.isArray(forwarded) ? forwarded[0] : forwarded
    return ip.split(',')[0].trim()
  }

  // Check for Cloudflare
  const cfIp = headers['cf-connecting-ip']
  if (cfIp) {
    return Array.isArray(cfIp) ? cfIp[0] : cfIp
  }

  // Fallback to localhost (should be overridden by actual remote address in production)
  return '127.0.0.1'
}

/**
 * Check if value is a non-empty string
 */
export function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0
}
