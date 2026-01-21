/**
 * Netlify Function: Get Session
 * GET /api/get-session/:sessionId
 * Retrieves session information (without password hash)
 */

import { Handler } from '@netlify/functions'
import { isValidSessionId } from './lib/validation'
import { getSession } from './lib/redis-client'

interface GetSessionResponse {
  id: string
  leaderName: string
  participants: Array<{
    id: string
    name: string
  }>
  createdAt: number
  passwordRequired: boolean
}

interface ErrorResponse {
  error: string
  code: string
}

const handler: Handler = async event => {
  // Only allow GET requests
  if (event.httpMethod !== 'GET') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method not allowed' }),
    }
  }

  try {
    // Extract session ID from path
    const sessionId = event.path.split('/').pop()

    if (!sessionId) {
      return {
        statusCode: 400,
        body: JSON.stringify({
          error: 'Session ID is required',
          code: 'MISSING_SESSION_ID',
        } as ErrorResponse),
      }
    }

    // Validate session ID format
    if (!isValidSessionId(sessionId)) {
      return {
        statusCode: 400,
        body: JSON.stringify({
          error: 'Invalid session ID format',
          code: 'INVALID_SESSION_ID',
        } as ErrorResponse),
      }
    }

    // Retrieve session from storage
    const session = getSession(sessionId)

    if (!session) {
      return {
        statusCode: 404,
        body: JSON.stringify({
          error: 'Session not found or expired',
          code: 'SESSION_NOT_FOUND',
        } as ErrorResponse),
      }
    }

    // Return session data (never include password hash)
    const response: GetSessionResponse = {
      id: session.id,
      leaderName: session.leaderName,
      participants: session.participants,
      createdAt: session.createdAt,
      passwordRequired: !!session.passwordHash,
    }

    return {
      statusCode: 200,
      body: JSON.stringify(response),
      headers: {
        'Content-Type': 'application/json',
      },
    }
  } catch (error) {
    console.error('[get-session] Unexpected error:', error)
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
