/**
 * Redis Client Wrapper
 * Handles session storage with automatic TTL expiration
 * Uses Upstash Redis for persistent storage across function invocations
 */

import type { Transcript } from '../../../src/lib/portkey-types'

interface SessionData {
  id: string
  leaderName: string
  passwordHash?: string
  encryptedEmail?: string
  participants: Array<{
    id: string
    name: string
    encryptedEmail?: string
  }>
  transcripts?: Transcript[]
  summary?: string
  finishedAt?: number
  createdAt: number
}

const SESSION_TTL_SECONDS = 4 * 60 * 60 // 4 hours in seconds

// Upstash Redis configuration
const REDIS_URL = process.env.UPSTASH_REDIS_REST_URL
const REDIS_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN
const REDIS_TIMEOUT = parseInt(process.env.UPSTASH_REDIS_TIMEOUT_MS || '5000')

if (!REDIS_URL || !REDIS_TOKEN) {
  console.warn(
    '[Redis] Upstash Redis credentials not configured. Sessions will not persist.'
  )
}

/**
 * Make a request to Upstash Redis REST API
 */
async function redisRequest<T>(command: string[]): Promise<T> {
  if (!REDIS_URL || !REDIS_TOKEN) {
    throw new Error('Upstash Redis credentials not configured')
  }

  try {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), REDIS_TIMEOUT)

    const response = await fetch(REDIS_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${REDIS_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(command),
      signal: controller.signal,
    })

    clearTimeout(timeoutId)

    if (!response.ok) {
      const errorData = (await response.json().catch(() => ({}))) as Record<
        string,
        unknown
      >
      throw new Error(
        `Redis error (${response.status}): ${(errorData.error as string) || response.statusText}`
      )
    }

    const data = (await response.json()) as Record<string, T>
    return data.result
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error(`Redis request timeout (${REDIS_TIMEOUT}ms)`)
    }
    throw error
  }
}

/**
 * Set a session in Redis with TTL
 * @param sessionId - Unique session identifier
 * @param data - Session data
 * @returns true if successful
 */
export async function setSession(
  sessionId: string,
  data: SessionData
): Promise<boolean> {
  try {
    await redisRequest<string>([
      'SET',
      `session:${sessionId}`,
      JSON.stringify(data),
      'EX',
      SESSION_TTL_SECONDS.toString(),
    ])
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
export async function getSession(
  sessionId: string
): Promise<SessionData | null> {
  try {
    const result = await redisRequest<string | null>([
      'GET',
      `session:${sessionId}`,
    ])

    if (!result) {
      return null
    }

    return JSON.parse(result) as SessionData
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
export async function updateSession(
  sessionId: string,
  data: Partial<SessionData>
): Promise<boolean> {
  try {
    // Get existing session
    const existing = await getSession(sessionId)

    if (!existing) {
      return false
    }

    // Merge data (never override id or createdAt)
    const updated: SessionData = {
      ...existing,
      ...data,
      id: existing.id,
      createdAt: existing.createdAt,
    }

    // Set updated session
    await redisRequest<string>([
      'SET',
      `session:${sessionId}`,
      JSON.stringify(updated),
      'EX',
      SESSION_TTL_SECONDS.toString(),
    ])

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
export async function deleteSession(sessionId: string): Promise<boolean> {
  try {
    const result = await redisRequest<number>(['DEL', `session:${sessionId}`])
    return result > 0
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
export async function sessionExists(sessionId: string): Promise<boolean> {
  try {
    const result = await redisRequest<number>([
      'EXISTS',
      `session:${sessionId}`,
    ])
    return result > 0
  } catch (error) {
    console.error('[Redis] Error checking session existence:', error)
    return false
  }
}

/**
 * Add a participant to a session
 * @param sessionId - Session identifier
 * @param participantId - Participant ID
 * @param participantName - Participant name
 * @returns true if successful
 */
export async function addParticipant(
  sessionId: string,
  participantId: string,
  participantName: string
): Promise<boolean> {
  const session = await getSession(sessionId)

  if (!session) {
    return false
  }

  return updateSession(sessionId, {
    participants: [
      ...session.participants,
      { id: participantId, name: participantName },
    ],
  })
}

/**
 * Get participant count for a session
 * @param sessionId - Session identifier
 * @returns Number of participants or 0 if session not found
 */
export async function getParticipantCount(sessionId: string): Promise<number> {
  const session = await getSession(sessionId)
  return session?.participants.length || 0
}

/**
 * Check Redis connectivity (for health checks)
 * @returns true if Redis is accessible
 */
export async function isRedisHealthy(): Promise<boolean> {
  try {
    if (!REDIS_URL || !REDIS_TOKEN) {
      return false
    }

    await redisRequest<string>(['PING'])
    return true
  } catch (error) {
    console.error('[Redis] Health check failed:', error)
    return false
  }
}
