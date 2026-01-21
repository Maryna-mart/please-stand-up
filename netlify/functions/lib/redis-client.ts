/**
 * Redis Client Wrapper
 * Handles session storage with automatic TTL expiration
 * Currently uses in-memory storage, but can be easily upgraded to Upstash Redis
 */

interface SessionData {
  id: string
  leaderName: string
  passwordHash?: string
  participants: Array<{
    id: string
    name: string
  }>
  createdAt: number
  expiresAt: number
}

interface SessionDataWithoutExpiry {
  id: string
  leaderName: string
  passwordHash?: string
  participants: Array<{
    id: string
    name: string
  }>
  createdAt: number
}

const SESSION_TTL_MS = 4 * 60 * 60 * 1000 // 4 hours

// In-memory session store (temporary - will use Upstash Redis in production)
const sessionStore = new Map<string, SessionData>()

/**
 * Set a session in Redis
 * @param sessionId - Unique session identifier
 * @param data - Session data
 * @returns true if successful
 */
export function setSession(
  sessionId: string,
  data: SessionDataWithoutExpiry
): boolean {
  try {
    const now = Date.now()
    const expiresAt = now + SESSION_TTL_MS

    sessionStore.set(sessionId, {
      ...data,
      expiresAt,
    })

    return true
  } catch (error) {
    console.error('[Redis] Error setting session:', error)
    return false
  }
}

/**
 * Get a session from Redis
 * @param sessionId - Unique session identifier
 * @returns Session data or null if not found or expired
 */
export function getSession(sessionId: string): SessionDataWithoutExpiry | null {
  try {
    const session = sessionStore.get(sessionId)

    if (!session) {
      return null
    }

    const now = Date.now()

    // Check if expired
    if (session.expiresAt < now) {
      sessionStore.delete(sessionId)
      return null
    }

    // Return without the expiry time
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { expiresAt: _expiresAt, ...data } = session
    return data
  } catch (error) {
    console.error('[Redis] Error getting session:', error)
    return null
  }
}

/**
 * Update a session in Redis
 * @param sessionId - Session identifier
 * @param data - Partial session data to merge
 * @returns true if successful
 */
export function updateSession(
  sessionId: string,
  data: Partial<SessionDataWithoutExpiry>
): boolean {
  try {
    const existing = sessionStore.get(sessionId)

    if (!existing) {
      return false
    }

    const now = Date.now()

    // Check if expired
    if (existing.expiresAt < now) {
      sessionStore.delete(sessionId)
      return false
    }

    // Merge data
    const updated: SessionData = {
      ...existing,
      ...data,
      id: existing.id, // Never override ID
      expiresAt: existing.expiresAt, // Preserve original expiry
    }

    sessionStore.set(sessionId, updated)
    return true
  } catch (error) {
    console.error('[Redis] Error updating session:', error)
    return false
  }
}

/**
 * Delete a session from Redis
 * @param sessionId - Session identifier
 * @returns true if deleted, false if not found
 */
export function deleteSession(sessionId: string): boolean {
  try {
    return sessionStore.delete(sessionId)
  } catch (error) {
    console.error('[Redis] Error deleting session:', error)
    return false
  }
}

/**
 * Check if a session exists
 * @param sessionId - Session identifier
 * @returns true if session exists and is not expired
 */
export function sessionExists(sessionId: string): boolean {
  const session = sessionStore.get(sessionId)

  if (!session) {
    return false
  }

  const now = Date.now()

  if (session.expiresAt < now) {
    sessionStore.delete(sessionId)
    return false
  }

  return true
}

/**
 * Add a participant to a session
 * @param sessionId - Session identifier
 * @param participantId - Participant ID
 * @param participantName - Participant name
 * @returns true if successful
 */
export function addParticipant(
  sessionId: string,
  participantId: string,
  participantName: string
): boolean {
  return updateSession(sessionId, {
    participants: [
      ...(getSession(sessionId)?.participants || []),
      { id: participantId, name: participantName },
    ],
  })
}

/**
 * Get participant count for a session
 * @param sessionId - Session identifier
 * @returns Number of participants or 0 if session not found
 */
export function getParticipantCount(sessionId: string): number {
  const session = getSession(sessionId)
  return session?.participants.length || 0
}

/**
 * Cleanup expired sessions (should be called periodically)
 */
export function cleanupExpiredSessions(): number {
  const now = Date.now()
  let deletedCount = 0

  for (const [sessionId, session] of sessionStore.entries()) {
    if (session.expiresAt < now) {
      sessionStore.delete(sessionId)
      deletedCount++
    }
  }

  return deletedCount
}

/**
 * Check Redis connectivity (for health checks)
 * @returns true if Redis is accessible
 */
export async function isRedisHealthy(): Promise<boolean> {
  try {
    // In-memory store is always healthy
    // In production with Upstash, this would ping Redis
    return true
  } catch (error) {
    console.error('[Redis] Health check failed:', error)
    return false
  }
}

/**
 * Get store statistics (for monitoring/testing)
 */
export function getStoreStats(): {
  totalSessions: number
  activeSessions: number
  expiredSessions: number
} {
  const now = Date.now()
  let activeSessions = 0
  let expiredSessions = 0

  for (const session of sessionStore.values()) {
    if (session.expiresAt >= now) {
      activeSessions++
    } else {
      expiredSessions++
    }
  }

  return {
    totalSessions: sessionStore.size,
    activeSessions,
    expiredSessions,
  }
}

/**
 * Reset store (for testing only)
 */
export function resetStore(): void {
  sessionStore.clear()
}

/**
 * Get store size (for testing)
 */
export function getStoreSize(): number {
  return sessionStore.size
}
