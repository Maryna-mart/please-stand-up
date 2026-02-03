/**
 * Netlify Function: Save Transcript
 * POST /api/save-transcript
 * Saves a participant's transcript to session data and broadcasts to other participants
 */

import { Handler } from '@netlify/functions'
import { getSession, setSession } from './lib/redis-client'
import { broadcastTranscriptAdded } from './lib/pusher-server'

interface SaveTranscriptRequest {
  sessionId: string
  transcript: {
    participantName: string
    text: string
    duration?: number
    language?: string
  }
}

interface ErrorResponse {
  error: string
  code: string
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
    let body: SaveTranscriptRequest
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

    // Validate inputs
    if (!body.sessionId || !body.transcript) {
      return {
        statusCode: 400,
        body: JSON.stringify({
          error: 'Session ID and transcript are required',
          code: 'MISSING_FIELDS',
        } as ErrorResponse),
      }
    }

    if (!body.transcript.participantName || !body.transcript.text) {
      return {
        statusCode: 400,
        body: JSON.stringify({
          error: 'Transcript must have participantName and text',
          code: 'INVALID_TRANSCRIPT',
        } as ErrorResponse),
      }
    }

    console.log('[save-transcript] Saving transcript for', {
      sessionId: body.sessionId,
      participantName: body.transcript.participantName,
    })

    // Get existing session
    const session = await getSession(body.sessionId)
    if (!session) {
      return {
        statusCode: 404,
        body: JSON.stringify({
          error: 'Session not found',
          code: 'SESSION_NOT_FOUND',
        } as ErrorResponse),
      }
    }

    // Add transcript to session data
    const updatedSession = {
      ...session,
      transcripts: [...(session.transcripts || []), body.transcript],
    }

    // Save to Redis
    await setSession(body.sessionId, updatedSession)

    // Broadcast to other participants via Pusher (non-blocking)
    broadcastTranscriptAdded(body.sessionId, body.transcript).catch(error => {
      console.error('[save-transcript] Broadcast failed (non-critical):', error)
    })

    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        message: 'Transcript saved successfully',
      }),
      headers: {
        'Content-Type': 'application/json',
      },
    }
  } catch (error) {
    console.error('[save-transcript] Unexpected error:', error)
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
