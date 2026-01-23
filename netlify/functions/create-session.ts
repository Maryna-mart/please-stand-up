/**
 * Netlify Function: Create Session
 * POST /api/create-session
 * Creates a new standup session with a leader
 */

import { Handler } from '@netlify/functions'
import { randomBytes } from 'node:crypto'
import {
  isRateLimited,
  getRemainingRequests,
  getRateLimitResetTime,
} from './lib/rate-limiter'
import {
  isValidUserName,
  isPasswordSecure,
  getClientIp,
  sanitizeInput,
  isNonEmptyString,
} from './lib/validation'
import { setSession } from './lib/redis-client'
import { hashPasswordServer } from './lib/password-utils-server'

interface CreateSessionRequest {
  leaderName: string
  password?: string
}

interface CreateSessionResponse {
  sessionId: string
  userId: string
  expiresAt: number
  message?: string
}

interface ErrorResponse {
  error: string
  code: string
  remaining?: number
  resetAt?: number
}

/**
 * Generate a cryptographically secure session ID
 */
function generateSessionId(): string {
  return randomBytes(32).toString('base64url')
}

/**
 * Generate a user ID
 */
function generateUserId(): string {
  return randomBytes(16).toString('base64url')
}

const handler: Handler = async event => {
  // Only allow POST requests
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method not allowed' }),
    }
  }

  try {
    // Parse request body
    let body: CreateSessionRequest
    try {
      if (!event.body) {
        return {
          statusCode: 400,
          body: JSON.stringify({
            error: 'Request body is required',
            code: 'EMPTY_BODY',
          } as ErrorResponse),
        }
      }

      body = JSON.parse(event.body)
    } catch {
      return {
        statusCode: 400,
        body: JSON.stringify({
          error: 'Invalid JSON in request body',
          code: 'INVALID_JSON',
        } as ErrorResponse),
      }
    }

    // Get client IP for rate limiting
    const headers = event.headers as Record<
      string,
      string | string[] | undefined
    >
    const clientIp = getClientIp(headers)

    // Check rate limit (5 creates per hour per IP)
    if (isRateLimited(clientIp, 'create')) {
      const remaining = getRemainingRequests(clientIp, 'create')
      const resetAt = getRateLimitResetTime(clientIp, 'create')

      return {
        statusCode: 429,
        body: JSON.stringify({
          error: 'Too many session creations. Please wait before trying again.',
          code: 'RATE_LIMITED',
          remaining,
          resetAt,
        } as ErrorResponse),
      }
    }

    // Validate leader name
    const leaderName = body.leaderName
    if (!isNonEmptyString(leaderName)) {
      return {
        statusCode: 400,
        body: JSON.stringify({
          error: 'Leader name is required',
          code: 'MISSING_LEADER_NAME',
        } as ErrorResponse),
      }
    }

    if (!isValidUserName(leaderName)) {
      return {
        statusCode: 400,
        body: JSON.stringify({
          error:
            'Leader name must be 1-50 characters and contain no special characters',
          code: 'INVALID_LEADER_NAME',
        } as ErrorResponse),
      }
    }

    // Validate password if provided
    let passwordHash: string | undefined
    if (body.password) {
      if (!isNonEmptyString(body.password)) {
        return {
          statusCode: 400,
          body: JSON.stringify({
            error: 'Password must not be empty',
            code: 'EMPTY_PASSWORD',
          } as ErrorResponse),
        }
      }

      if (!isPasswordSecure(body.password)) {
        return {
          statusCode: 400,
          body: JSON.stringify({
            error: 'Password must be at least 8 characters',
            code: 'WEAK_PASSWORD',
          } as ErrorResponse),
        }
      }

      // Hash password
      try {
        passwordHash = await hashPasswordServer(body.password)
      } catch (error) {
        console.error('[create-session] Password hashing failed:', error)
        return {
          statusCode: 500,
          body: JSON.stringify({
            error: 'Failed to process password',
            code: 'PASSWORD_HASH_ERROR',
          } as ErrorResponse),
        }
      }
    }

    // Generate session and user IDs
    const sessionId = generateSessionId()
    const userId = generateUserId()
    const createdAt = Date.now()

    // Store session in Redis
    const sessionData = {
      id: sessionId,
      leaderName: sanitizeInput(leaderName),
      passwordHash,
      participants: [
        {
          id: userId,
          name: sanitizeInput(leaderName),
        },
      ],
      createdAt,
    }

    const sessionStored = await setSession(sessionId, sessionData)

    if (!sessionStored) {
      console.error('[create-session] Failed to store session in Redis')
      return {
        statusCode: 502,
        body: JSON.stringify({
          error: 'Failed to create session. Please try again.',
          code: 'STORAGE_ERROR',
        } as ErrorResponse),
      }
    }

    // Return success response
    const expiresAt = createdAt + 4 * 60 * 60 * 1000 // 4 hours from creation

    const response: CreateSessionResponse = {
      sessionId,
      userId,
      expiresAt,
      message: 'Session created successfully',
    }

    return {
      statusCode: 201,
      body: JSON.stringify(response),
      headers: {
        'Content-Type': 'application/json',
      },
    }
  } catch (error) {
    console.error('[create-session] Unexpected error:', error)
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: 'Internal server error',
        code: 'INTERNAL_ERROR',
      } as ErrorResponse),
    }
  }
}

export { handler }
