/**
 * Netlify Function: Generate Summary
 * POST /api/summarize
 * Generates a standup summary from transcripts using Portkey Claude
 */

import { Handler } from '@netlify/functions'
import { isValidSessionId } from './lib/validation'
import { sessionExists } from './lib/redis-client'
import {
  generateSummary,
  handlePortkeyError,
  logPortkeyRequest,
  isPortkeyConfigured,
} from './lib/portkey-server'
import type { LanguageCode } from '../src/lib/portkey-types'

interface SummarizeRequest {
  sessionId: string
  transcripts: Array<{
    participantName: string
    text: string
  }>
  language?: LanguageCode
}

interface SummarizeResponse {
  success: boolean
  summary?: {
    text: string
    language: LanguageCode
    generatedAt: string
  }
  error?: {
    message: string
    code: string
  }
}

interface ErrorResponse {
  error: string
  code: string
}

/**
 * Validate summarize request
 */
function validateRequest(request: unknown): {
  valid: boolean
  data?: SummarizeRequest
  error?: ErrorResponse
} {
  if (!request || typeof request !== 'object') {
    return {
      valid: false,
      error: {
        error: 'Invalid request body',
        code: 'INVALID_BODY',
      },
    }
  }

  const req = request as Record<string, unknown>

  // Validate session ID
  if (!req.sessionId || typeof req.sessionId !== 'string') {
    return {
      valid: false,
      error: {
        error: 'Session ID is required',
        code: 'MISSING_SESSION_ID',
      },
    }
  }

  if (!isValidSessionId(req.sessionId)) {
    return {
      valid: false,
      error: {
        error: 'Invalid session ID format',
        code: 'INVALID_SESSION_ID',
      },
    }
  }

  // Validate transcripts array
  if (!Array.isArray(req.transcripts)) {
    return {
      valid: false,
      error: {
        error: 'Transcripts must be an array',
        code: 'INVALID_TRANSCRIPTS',
      },
    }
  }

  if (req.transcripts.length === 0) {
    return {
      valid: false,
      error: {
        error: 'At least one transcript is required',
        code: 'EMPTY_TRANSCRIPTS',
      },
    }
  }

  // Validate each transcript
  for (let i = 0; i < req.transcripts.length; i++) {
    const transcript = req.transcripts[i]

    if (!transcript || typeof transcript !== 'object') {
      return {
        valid: false,
        error: {
          error: `Transcript ${i} is invalid`,
          code: 'INVALID_TRANSCRIPT',
        },
      }
    }

    if (
      !transcript.participantName ||
      typeof transcript.participantName !== 'string' ||
      transcript.participantName.length === 0 ||
      transcript.participantName.length > 50
    ) {
      return {
        valid: false,
        error: {
          error: `Transcript ${i}: invalid participant name`,
          code: 'INVALID_PARTICIPANT_NAME',
        },
      }
    }

    if (
      !transcript.text ||
      typeof transcript.text !== 'string' ||
      transcript.text.length === 0
    ) {
      return {
        valid: false,
        error: {
          error: `Transcript ${i}: text is required and cannot be empty`,
          code: 'EMPTY_TRANSCRIPT_TEXT',
        },
      }
    }
  }

  // Validate optional language
  const validLanguages = ['en', 'de', 'fr', 'es', 'it', 'pt', 'ja', 'zh']
  if (req.language && !validLanguages.includes(req.language as string)) {
    return {
      valid: false,
      error: {
        error: 'Invalid language code',
        code: 'INVALID_LANGUAGE',
      },
    }
  }

  return {
    valid: true,
    data: req as SummarizeRequest,
  }
}

const handler: Handler = async event => {
  // Only allow POST requests
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({
        error: 'Method not allowed',
        code: 'METHOD_NOT_ALLOWED',
      } as ErrorResponse),
    }
  }

  try {
    // Check if Portkey is configured
    if (!isPortkeyConfigured()) {
      return {
        statusCode: 502,
        body: JSON.stringify({
          error: 'AI service not configured',
          code: 'PORTKEY_NOT_CONFIGURED',
        } as ErrorResponse),
      }
    }

    // Parse request body
    let body: SummarizeRequest
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

      const validation = validateRequest(JSON.parse(event.body))

      if (!validation.valid) {
        return {
          statusCode: 400,
          body: JSON.stringify(validation.error),
        }
      }

      body = validation.data!
    } catch (error) {
      console.error('[Summarize] JSON parse error:', error)
      return {
        statusCode: 400,
        body: JSON.stringify({
          error: 'Invalid JSON in request body',
          code: 'INVALID_JSON',
        } as ErrorResponse),
      }
    }

    // Check if session exists on backend
    const sessionExists_ = await sessionExists(body.sessionId)
    if (!sessionExists_) {
      return {
        statusCode: 404,
        body: JSON.stringify({
          error: 'Session not found or expired',
          code: 'SESSION_NOT_FOUND',
        } as ErrorResponse),
      }
    }

    logPortkeyRequest('Summarize request', {
      sessionId: body.sessionId,
      transcriptCount: body.transcripts.length,
      totalTextLength: body.transcripts.reduce(
        (sum, t) => sum + t.text.length,
        0
      ),
      language: body.language || 'auto-detect',
    })

    // Generate summary using Portkey
    const result = await generateSummary(
      body.transcripts,
      body.language || 'en'
    )

    const response: SummarizeResponse = {
      success: true,
      summary: {
        text: result.summary,
        language: (result.language as LanguageCode) || 'en',
        generatedAt: new Date().toISOString(),
      },
    }

    return {
      statusCode: 200,
      body: JSON.stringify(response),
      headers: {
        'Content-Type': 'application/json',
      },
    }
  } catch (error) {
    console.error('[Summarize] Error:', error)

    // Handle Portkey-specific errors
    const portKeyError = handlePortkeyError(error)

    const response: SummarizeResponse = {
      success: false,
      error: {
        message: portKeyError.message,
        code: portKeyError.code,
      },
    }

    return {
      statusCode: portKeyError.status,
      body: JSON.stringify(response),
      headers: {
        'Content-Type': 'application/json',
      },
    }
  }
}

export { handler }
