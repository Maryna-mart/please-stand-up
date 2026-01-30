/**
 * Netlify Function: Transcribe Audio
 * POST /api/transcribe
 * Transcribes audio to text using Portkey Whisper API
 */

import { Handler } from '@netlify/functions'
import { isValidSessionId, isValidUserName } from './lib/validation'
import { sessionExists } from './lib/redis-client'
import {
  transcribeAudio,
  handlePortkeyError,
  logPortkeyRequest,
  isPortkeyConfigured,
} from './lib/portkey-server'
// import type { AudioFormat } from '../src/lib/portkey-types'

interface TranscribeResponse {
  success: boolean
  transcript: {
    text: string
    language: string
    duration?: number
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

const MAX_AUDIO_SIZE_MB = 25
const SUPPORTED_FORMATS: AudioFormat[] = ['webm', 'mp3', 'mp4', 'wav']

/**
 * Parse multipart form data to extract audio file and fields
 */
async function parseMultipartFormData(
  body: string,
  contentType: string
): Promise<{
  fields: Record<string, string>
  audioBuffer: Buffer
  audioFormat: AudioFormat
} | null> {
  if (!contentType.includes('multipart/form-data')) {
    return null
  }

  // Extract boundary from content-type header
  const boundaryMatch = contentType.match(/boundary=([^;]+)/)
  if (!boundaryMatch) {
    return null
  }

  const boundary = boundaryMatch[1]
  const parts = body.split(`--${boundary}`)

  const fields: Record<string, string> = {}
  let audioBuffer: Buffer | null = null
  let audioFormat: AudioFormat | null = null

  for (const part of parts) {
    if (part.includes('Content-Disposition: form-data')) {
      // Parse form field or file
      const nameMatch = part.match(/name="([^"]+)"/)
      const fileNameMatch = part.match(/filename="([^"]+)"/)

      if (nameMatch && !fileNameMatch) {
        // Regular form field
        const fieldName = nameMatch[1]
        const fieldValueMatch = part.match(/\r?\n\r?\n([\s\S]*?)\r?\n/)
        if (fieldValueMatch) {
          fields[fieldName] = fieldValueMatch[1]
        }
      } else if (fileNameMatch && nameMatch) {
        // File upload
        const fileName = fileNameMatch[1]
        const extMatch = fileName.match(/\.([a-z0-9]+)$/)

        if (extMatch) {
          const ext = extMatch[1].toLowerCase() as AudioFormat
          if (SUPPORTED_FORMATS.includes(ext)) {
            audioFormat = ext
            // Extract binary file data
            const dataMatch = part.match(/\r?\n\r?\n([\s\S]*?)\r?\n/)
            if (dataMatch) {
              audioBuffer = Buffer.from(dataMatch[1], 'binary')
            }
          }
        }
      }
    }
  }

  if (!audioBuffer || !audioFormat) {
    return null
  }

  return { fields, audioBuffer, audioFormat }
}

/**
 * Validate transcribe request parameters
 */
function validateRequest(
  sessionId: string,
  participantId: string,
  participantName: string
): { valid: boolean; error?: ErrorResponse } {
  if (!isValidSessionId(sessionId)) {
    return {
      valid: false,
      error: {
        error: 'Invalid session ID',
        code: 'INVALID_SESSION_ID',
      },
    }
  }

  if (!participantId || typeof participantId !== 'string') {
    return {
      valid: false,
      error: {
        error: 'Participant ID is required',
        code: 'MISSING_PARTICIPANT_ID',
      },
    }
  }

  if (!isValidUserName(participantName)) {
    return {
      valid: false,
      error: {
        error: 'Invalid participant name',
        code: 'INVALID_PARTICIPANT_NAME',
      },
    }
  }

  return { valid: true }
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

    // Check content type and parse multipart form data
    const contentType = event.headers['content-type'] || ''
    if (!event.body) {
      return {
        statusCode: 400,
        body: JSON.stringify({
          error: 'Request body is required',
          code: 'EMPTY_BODY',
        } as ErrorResponse),
      }
    }

    const parsed = await parseMultipartFormData(event.body, contentType)

    if (!parsed) {
      return {
        statusCode: 400,
        body: JSON.stringify({
          error: 'Invalid request format',
          code: 'INVALID_FORMAT',
        } as ErrorResponse),
      }
    }

    const { fields, audioBuffer, audioFormat } = parsed

    // Validate required fields
    const sessionId = fields.sessionId
    const participantId = fields.participantId
    const participantName = fields.participantName
    const language = fields.language

    const validation = validateRequest(
      sessionId,
      participantId,
      participantName
    )
    if (!validation.valid) {
      return {
        statusCode: 400,
        body: JSON.stringify(validation.error),
      }
    }

    // Validate audio size
    const audioSizeMb = audioBuffer.length / (1024 * 1024)
    if (audioSizeMb > MAX_AUDIO_SIZE_MB) {
      return {
        statusCode: 413,
        body: JSON.stringify({
          error: `Audio file exceeds ${MAX_AUDIO_SIZE_MB}MB limit`,
          code: 'AUDIO_TOO_LARGE',
        } as ErrorResponse),
      }
    }

    // Check if session exists on backend
    const sessionExists_ = await sessionExists(sessionId)
    if (!sessionExists_) {
      return {
        statusCode: 404,
        body: JSON.stringify({
          error: 'Session not found or expired',
          code: 'SESSION_NOT_FOUND',
        } as ErrorResponse),
      }
    }

    logPortkeyRequest('Transcribe request', {
      sessionId,
      participantId,
      audioSize: audioBuffer.length,
      audioFormat,
      language: language || 'auto-detect',
    })

    // Transcribe audio using Portkey
    const result = await transcribeAudio(audioBuffer, audioFormat, language)

    const response: TranscribeResponse = {
      success: true,
      transcript: {
        text: result.text,
        language: result.language,
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
    console.error('[Transcribe] Error:', error)

    // Handle Portkey-specific errors
    const portKeyError = handlePortkeyError(error)

    const response: TranscribeResponse = {
      success: false,
      transcript: {
        text: '',
        language: 'en',
      },
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
