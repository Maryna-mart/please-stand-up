/**
 * Netlify Function: Transcribe Audio
 * POST /api/transcribe
 * Transcribes audio to text using Deepgram STT API
 */

import { Handler } from '@netlify/functions'
import { isValidSessionId, isValidUserName } from './lib/validation'
import { sessionExists } from './lib/redis-client'
import {
  transcribeAudio,
  handleDeepgramError,
  logDeepgramRequest,
  isDeepgramConfigured,
} from './lib/deepgram-server'

type AudioFormat = 'webm' | 'mp3' | 'mp4' | 'wav'

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
 * Handles both raw binary and base64-encoded bodies from Netlify
 */
async function parseMultipartFormData(
  body: string,
  contentType: string,
  isBase64: boolean
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
    console.error('[Transcribe] Failed to extract boundary from content-type')
    return null
  }

  const boundary = boundaryMatch[1].trim()

  // Decode body if it's base64 encoded by Netlify
  let bodyBuffer: Buffer
  try {
    if (isBase64) {
      bodyBuffer = Buffer.from(body, 'base64')
    } else {
      bodyBuffer = Buffer.from(body, 'utf-8')
    }
  } catch (e) {
    console.error('[Transcribe] Failed to decode body:', e)
    return null
  }

  const bodyStr = bodyBuffer.toString('binary')
  const boundaryBytes = `--${boundary}`
  const parts = bodyStr.split(boundaryBytes)

  const fields: Record<string, string> = {}
  let audioBuffer: Buffer | null = null
  let audioFormat: AudioFormat | null = null

  for (const part of parts) {
    if (!part.includes('Content-Disposition: form-data')) {
      continue
    }

    // Parse form field or file
    const nameMatch = part.match(/name="([^"]+)"/)
    const fileNameMatch = part.match(/filename="([^"]+)"/)

    if (nameMatch && !fileNameMatch) {
      // Regular form field - extract value
      const headerEndIdx = part.indexOf('\r\n\r\n')
      if (headerEndIdx !== -1) {
        let fieldValue = part.substring(headerEndIdx + 4)
        // Remove trailing CRLF and boundary marker
        fieldValue = fieldValue.replace(/\r\n$/, '')
        fields[nameMatch[1]] = fieldValue
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
          const headerEndIdx = part.indexOf('\r\n\r\n')
          if (headerEndIdx !== -1) {
            let fileData = part.substring(headerEndIdx + 4)
            // Remove trailing CRLF
            if (fileData.endsWith('\r\n')) {
              fileData = fileData.slice(0, -2)
            }
            audioBuffer = Buffer.from(fileData, 'binary')
          }
        }
      }
    }
  }

  console.log('[Transcribe] Parsed fields:', Object.keys(fields))
  console.log('[Transcribe] Audio format:', audioFormat)
  console.log('[Transcribe] Audio buffer size:', audioBuffer?.length)

  if (!audioBuffer || !audioFormat) {
    console.error('[Transcribe] Failed to extract audio or format')
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
    // Check if Deepgram is configured
    if (!isDeepgramConfigured()) {
      return {
        statusCode: 502,
        body: JSON.stringify({
          error: 'Transcription service not configured',
          code: 'DEEPGRAM_NOT_CONFIGURED',
        } as ErrorResponse),
      }
    }

    // Check content type and parse multipart form data
    const contentType = event.headers['content-type'] || ''
    if (!event.body) {
      console.error('[Transcribe] Request body is empty')
      return {
        statusCode: 400,
        body: JSON.stringify({
          error: 'Request body is required',
          code: 'EMPTY_BODY',
        } as ErrorResponse),
      }
    }

    console.log('[Transcribe] Content-Type:', contentType)
    console.log('[Transcribe] Body length:', event.body.length)
    console.log('[Transcribe] Is base64 encoded:', event.isBase64Encoded)

    const parsed = await parseMultipartFormData(
      event.body,
      contentType,
      event.isBase64Encoded || false
    )

    if (!parsed) {
      console.error('[Transcribe] Failed to parse multipart form data')
      return {
        statusCode: 400,
        body: JSON.stringify({
          error: 'Invalid request format - failed to parse multipart data',
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

    logDeepgramRequest('Transcribe request', {
      sessionId,
      participantId,
      audioSize: audioBuffer.length,
      audioFormat,
      language: language || 'auto-detect',
    })

    // Transcribe audio using Deepgram
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

    // Handle Deepgram-specific errors
    const deepgramError = handleDeepgramError(error)

    const response: TranscribeResponse = {
      success: false,
      transcript: {
        text: '',
        language: 'en',
      },
      error: {
        message: deepgramError.message,
        code: deepgramError.code,
      },
    }

    return {
      statusCode: deepgramError.status,
      body: JSON.stringify(response),
      headers: {
        'Content-Type': 'application/json',
      },
    }
  }
}

export { handler }
