/**
 * Rate Limiting Module
 * Prevents abuse by limiting session creation and joining attempts per IP
 * Uses simple in-memory counters (can be upgraded to Redis for distributed systems)
 */

interface RateLimitEntry {
  count: number
  resetTime: number
}

interface RateLimitConfig {
  maxRequests: number
  windowMs: number
}

const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000 // 1 hour
const CREATE_SESSION_LIMIT = 5 // 5 create requests per hour per IP
const JOIN_SESSION_LIMIT = 10 // 10 join requests per hour per IP

// In-memory store for rate limiting
// In production, this should use Redis for distributed rate limiting
const rateLimitStore = new Map<string, Map<string, RateLimitEntry>>()

/**
 * Check if a request should be rate limited
 * @param identifier - IP address or unique identifier
 * @param limitType - 'create' or 'join'
 * @returns true if request is allowed, false if rate limited
 */
export function isRateLimited(
  identifier: string,
  limitType: 'create' | 'join'
): boolean {
  const config: RateLimitConfig =
    limitType === 'create'
      ? { maxRequests: CREATE_SESSION_LIMIT, windowMs: RATE_LIMIT_WINDOW_MS }
      : { maxRequests: JOIN_SESSION_LIMIT, windowMs: RATE_LIMIT_WINDOW_MS }

  const now = Date.now()

  // Get or create the limit entry for this identifier
  let limiterMap = rateLimitStore.get(limitType)
  if (!limiterMap) {
    limiterMap = new Map()
    rateLimitStore.set(limitType, limiterMap)
  }

  let entry = limiterMap.get(identifier)

  // Initialize or reset if window has expired
  if (!entry || entry.resetTime < now) {
    entry = {
      count: 0,
      resetTime: now + config.windowMs,
    }
  }

  // Check if limit exceeded
  if (entry.count >= config.maxRequests) {
    return true // Rate limited
  }

  // Increment counter and save
  entry.count++
  limiterMap.set(identifier, entry)

  return false // Allowed
}

/**
 * Get remaining requests for an identifier
 * @param identifier - IP address or unique identifier
 * @param limitType - 'create' or 'join'
 * @returns Number of remaining requests (0 if rate limited)
 */
export function getRemainingRequests(
  identifier: string,
  limitType: 'create' | 'join'
): number {
  const config: RateLimitConfig =
    limitType === 'create'
      ? { maxRequests: CREATE_SESSION_LIMIT, windowMs: RATE_LIMIT_WINDOW_MS }
      : { maxRequests: JOIN_SESSION_LIMIT, windowMs: RATE_LIMIT_WINDOW_MS }

  const limiterMap = rateLimitStore.get(limitType)
  if (!limiterMap) return config.maxRequests

  const entry = limiterMap.get(identifier)
  const now = Date.now()

  if (!entry || entry.resetTime < now) {
    return config.maxRequests
  }

  return Math.max(0, config.maxRequests - entry.count)
}

/**
 * Get reset time for rate limit window
 * @param identifier - IP address or unique identifier
 * @param limitType - 'create' or 'join'
 * @returns Timestamp when the rate limit window resets (0 if no limit)
 */
export function getRateLimitResetTime(
  identifier: string,
  limitType: 'create' | 'join'
): number {
  const limiterMap = rateLimitStore.get(limitType)
  if (!limiterMap) return 0

  const entry = limiterMap.get(identifier)
  const now = Date.now()

  if (!entry || entry.resetTime < now) {
    return 0
  }

  return entry.resetTime
}

/**
 * Reset rate limit for testing purposes
 */
export function resetRateLimit(
  identifier?: string,
  limitType?: 'create' | 'join'
): void {
  if (!identifier || !limitType) {
    // Reset all
    rateLimitStore.clear()
    return
  }

  const limiterMap = rateLimitStore.get(limitType)
  if (limiterMap) {
    limiterMap.delete(identifier)
  }
}

/**
 * Cleanup expired entries (call periodically to prevent memory leaks)
 */
export function cleanupExpiredEntries(): void {
  const now = Date.now()

  for (const [limitType, limiterMap] of rateLimitStore.entries()) {
    for (const [identifier, entry] of limiterMap.entries()) {
      if (entry.resetTime < now) {
        limiterMap.delete(identifier)
      }
    }

    // Delete empty maps
    if (limiterMap.size === 0) {
      rateLimitStore.delete(limitType)
    }
  }
}
