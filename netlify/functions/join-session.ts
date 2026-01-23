/**
 * Netlify Function: Join Session
 * POST /api/join-session
 * Allows a user to join an existing session
 */

import { Handler } from '@netlify/functions'
import { randomBytes } from 'node:crypto'
import {
  isRateLimited,
  getRemainingRequests,
  getRateLimitResetTime,
} from './lib/rate-limiter'
import {
  isValidSessionId,
  isValidUserName,
  getClientIp,
  sanitizeInput,
  isNonEmptyString,
} from './lib/validation'
import { getSession, updateSession } from './lib/redis-client'
import { verifyPasswordServer } from './lib/password-utils-server'

const MAX_PARTICIPANTS = 20

interface JoinSessionRequest {
  sessionId: string
  participantName: string
  password?: string
}

interface JoinSessionResponse {
  sessionId: string
  userId: string
  participants: Array<{
    id: string
    name: string
  }>
  createdAt: number
  message?: string
}

interface ErrorResponse {
  error: string
  code: string
  remaining?: number
  resetAt?: number
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
    let body: JoinSessionRequest
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

    // Check rate limit (10 joins per hour per IP)
    if (isRateLimited(clientIp, 'join')) {
      const remaining = getRemainingRequests(clientIp, 'join')
      const resetAt = getRateLimitResetTime(clientIp, 'join')

      return {
        statusCode: 429,
        body: JSON.stringify({
          error: 'Too many join attempts. Please wait before trying again.',
          code: 'RATE_LIMITED',
          remaining,
          resetAt,
        } as ErrorResponse),
      }
    }

    // Validate session ID
    const sessionId = body.sessionId
    if (!isNonEmptyString(sessionId)) {
      return {
        statusCode: 400,
        body: JSON.stringify({
          error: 'Session ID is required',
          code: 'MISSING_SESSION_ID',
        } as ErrorResponse),
      }
    }

    if (!isValidSessionId(sessionId)) {
      return {
        statusCode: 400,
        body: JSON.stringify({
          error: 'Invalid session ID format',
          code: 'INVALID_SESSION_ID',
        } as ErrorResponse),
      }
    }

    // Validate participant name
    const participantName = body.participantName
    if (!isNonEmptyString(participantName)) {
      return {
        statusCode: 400,
        body: JSON.stringify({
          error: 'Participant name is required',
          code: 'MISSING_PARTICIPANT_NAME',
        } as ErrorResponse),
      }
    }

    if (!isValidUserName(participantName)) {
      return {
        statusCode: 400,
        body: JSON.stringify({
          error:
            'Participant name must be 1-50 characters and contain no special characters',
          code: 'INVALID_PARTICIPANT_NAME',
        } as ErrorResponse),
      }
    }

    // Retrieve session
    const session = await getSession(sessionId)

    if (!session) {
      return {
        statusCode: 404,
        body: JSON.stringify({
          error: 'Session not found or expired',
          code: 'SESSION_NOT_FOUND',
        } as ErrorResponse),
      }
    }

    // Check if password is required and matches
    if (session.passwordHash) {
      if (!body.password) {
        return {
          statusCode: 401,
          body: JSON.stringify({
            error: 'This session is password protected',
            code: 'PASSWORD_REQUIRED',
          } as ErrorResponse),
        }
      }

      const passwordValid = await verifyPasswordServer(
        body.password,
        session.passwordHash
      )

      if (!passwordValid) {
        return {
          statusCode: 401,
          body: JSON.stringify({
            error: 'Incorrect password',
            code: 'INVALID_PASSWORD',
          } as ErrorResponse),
        }
      }
    }

    // Check max participants limit
    if (session.participants.length >= MAX_PARTICIPANTS) {
      return {
        statusCode: 403,
        body: JSON.stringify({
          error: `Session is full (maximum ${MAX_PARTICIPANTS} participants)`,
          code: 'SESSION_FULL',
        } as ErrorResponse),
      }
    }

    // Check for duplicate participant name (case-insensitive)
    const nameTaken = session.participants.some(
      p => p.name.toLowerCase() === participantName.toLowerCase()
    )

    if (nameTaken) {
      return {
        statusCode: 400,
        body: JSON.stringify({
          error: 'A participant with this name already exists in the session',
          code: 'DUPLICATE_NAME',
        } as ErrorResponse),
      }
    }

    // Generate user ID
    const userId = generateUserId()

    // Add participant to session
    const updatedParticipants = [
      ...session.participants,
      {
        id: userId,
        name: sanitizeInput(participantName),
      },
    ]

    const updateSuccess = await updateSession(sessionId, {
      participants: updatedParticipants,
    })

    if (!updateSuccess) {
      console.error(
        '[join-session] Failed to update session with new participant'
      )
      return {
        statusCode: 502,
        body: JSON.stringify({
          error: 'Failed to join session. Please try again.',
          code: 'UPDATE_ERROR',
        } as ErrorResponse),
      }
    }

    // Return success response
    const response: JoinSessionResponse = {
      sessionId,
      userId,
      participants: updatedParticipants,
      createdAt: session.createdAt,
      message: 'Successfully joined session',
    }

    return {
      statusCode: 200,
      body: JSON.stringify(response),
      headers: {
        'Content-Type': 'application/json',
      },
    }
  } catch (error) {
    console.error('[join-session] Unexpected error:', error)
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
