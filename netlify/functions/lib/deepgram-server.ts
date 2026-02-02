/**
 * Deepgram Server Configuration
 * Handles audio transcription using Deepgram STT API
 * Supports: webm, mp3, mp4, wav formats
 */

// Configuration constants
const MAX_RETRIES = 3
const RETRY_DELAY_MS = 1000
const DEEPGRAM_API_URL = 'https://api.deepgram.com/v1/listen'

interface TranscriptionResult {
  text: string
  language: string
}

interface ErrorWithCode extends Error {
  code?: string
  status?: number
}

// Validate environment configuration
function validateConfig(): void {
  const apiKey = process.env.DEEPGRAM_API_KEY

  if (!apiKey) {
    console.error(
      '[Deepgram] DEEPGRAM_API_KEY environment variable not configured'
    )
    throw new Error('Deepgram API key not configured')
  }

  console.log(
    '[Deepgram] API key is configured (length: ' + apiKey.length + ')'
  )
}

/**
 * Retry logic for API calls with exponential backoff
 * @param fn - Async function to retry
 * @param maxRetries - Maximum number of retry attempts
 * @returns Result from the function
 */
async function withRetry<T>(
  fn: () => Promise<T>,
  maxRetries: number = MAX_RETRIES
): Promise<T> {
  let lastError: ErrorWithCode | null = null

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn()
    } catch (error) {
      lastError = error as ErrorWithCode

      // Don't retry on validation errors (4xx except 429/503)
      const status = lastError.status || 400
      if (status >= 400 && status < 500 && status !== 429 && status !== 503) {
        throw error
      }

      // Don't retry on last attempt
      if (attempt === maxRetries) {
        throw error
      }

      // Exponential backoff: 1s, 2s, 4s, etc.
      const delayMs = RETRY_DELAY_MS * Math.pow(2, attempt)
      console.log(
        `[Deepgram] Retry attempt ${attempt + 1}/${maxRetries} after ${delayMs}ms`
      )
      await new Promise(resolve => setTimeout(resolve, delayMs))
    }
  }

  // This should never happen due to throw above, but TypeScript needs it
  throw lastError || new Error('Unknown error in retry logic')
}

/**
 * Transcribe audio to text using Deepgram STT API
 * @param audioBuffer - Audio file buffer
 * @param audioFormat - Audio format (webm, mp3, mp4, wav)
 * @param language - Optional language code (e.g., 'en', 'de')
 * @returns Transcription result with detected language
 */
export async function transcribeAudio(
  audioBuffer: Buffer,
  audioFormat: 'webm' | 'mp3' | 'mp4' | 'wav',
  language?: string
): Promise<TranscriptionResult> {
  if (!audioBuffer || audioBuffer.length === 0) {
    throw new Error('Audio buffer is empty')
  }

  if (audioBuffer.length > 25 * 1024 * 1024) {
    throw new Error('Audio file exceeds 25MB limit')
  }

  return withRetry(async () => {
    validateConfig()

    const apiKey = process.env.DEEPGRAM_API_KEY!

    console.log('[Deepgram] Starting transcription for audio', {
      size: audioBuffer.length,
      format: audioFormat,
      language: language || 'auto-detect',
    })

    // Build request parameters
    const params = new URLSearchParams()
    params.append('model', 'nova-2')
    params.append('smart_format', 'true')
    params.append('detect_language', 'true') // Enable automatic language detection

    // Add language if specified and not auto-detect
    if (language && language !== 'auto-detect') {
      params.append('language', language)
    }

    const url = `${DEEPGRAM_API_URL}?${params.toString()}`

    const startTime = Date.now()
    console.log('[Deepgram] Sending transcription request to Deepgram API...')

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          Authorization: `Token ${apiKey}`,
          'Content-Type': `audio/${audioFormat}`,
        },
        body: audioBuffer,
      })

      if (!response.ok) {
        const errorText = await response.text()
        console.error('[Deepgram] API response error', {
          status: response.status,
          statusText: response.statusText,
          body: errorText,
        })

        const error = new Error(`Deepgram API error: ${response.statusText}`)
        ;(error as ErrorWithCode).status = response.status
        throw error
      }

      const result = (await response.json()) as {
        results?: {
          channels?: Array<{
            detected_language?: string
            alternatives?: Array<{
              transcript?: string
              language?: string
            }>
          }>
        }
      }

      const duration = Date.now() - startTime
      console.log('[Deepgram] Transcription API response received', {
        durationMs: duration,
        hasResults: !!result.results,
      })

      // Extract transcript and detected language from Deepgram response
      const transcript =
        result.results?.channels?.[0]?.alternatives?.[0]?.transcript || ''
      // Deepgram returns detected_language at channel level when detect_language=true
      const detectedLanguage =
        result.results?.channels?.[0]?.detected_language ||
        result.results?.channels?.[0]?.alternatives?.[0]?.language ||
        language ||
        'en'

      if (!transcript || transcript.trim().length === 0) {
        throw new Error('No transcription text in response')
      }

      console.log('[Deepgram] Transcription successful', {
        textLength: transcript.length,
        language: detectedLanguage,
      })

      return {
        text: transcript.trim(),
        language: detectedLanguage,
      }
    } catch (error) {
      console.error('[Deepgram] Transcription failed with detailed error:', {
        error: error,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        message: (error as any).message,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        status: (error as any).status,
      })
      throw error
    }
  })
}

/**
 * Check if Deepgram is accessible
 * @returns true if API key is configured and valid
 */
export function isDeepgramConfigured(): boolean {
  return !!process.env.DEEPGRAM_API_KEY
}

/**
 * Log Deepgram request for debugging
 * @param operation - Operation name
 * @param details - Additional details
 */
export function logDeepgramRequest(
  operation: string,
  details: Record<string, unknown>
): void {
  console.log(`[Deepgram] ${operation}`, details)
}

/**
 * Handle Deepgram API errors gracefully
 * @param error - Error object
 * @returns Formatted error for response
 */
export function handleDeepgramError(error: unknown): {
  message: string
  code: string
  status: number
} {
  const err = error as ErrorWithCode

  // Log the actual error for debugging
  console.error('[Deepgram] Error details:', {
    message: err.message,
    status: err.status,
    code: err.code,
    stack: err.stack,
  })

  if (err.message?.includes('timeout')) {
    return {
      message: 'Transcription request timeout. Please try again.',
      code: 'DEEPGRAM_TIMEOUT',
      status: 504,
    }
  }

  if (err.status === 429) {
    return {
      message: 'Transcription service is rate limited. Please try again later.',
      code: 'DEEPGRAM_RATE_LIMIT',
      status: 429,
    }
  }

  if (err.status === 401) {
    return {
      message: 'Transcription service authentication failed.',
      code: 'DEEPGRAM_AUTH_ERROR',
      status: 401,
    }
  }

  if (err.status && err.status >= 500) {
    return {
      message:
        'Transcription service is temporarily unavailable. Please try again.',
      code: 'DEEPGRAM_SERVICE_ERROR',
      status: 502,
    }
  }

  return {
    message: 'Failed to transcribe audio.',
    code: 'DEEPGRAM_ERROR',
    status: 502,
  }
}
