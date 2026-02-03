/**
 * Frontend AI API Client
 * Handles communication with Netlify AI functions (transcribe, summarize)
 * Includes exponential backoff retry logic for transient failures
 */

import type { LanguageCode, Transcript } from './portkey-types'

const REQUEST_TIMEOUT_MS = 120000 // 2 minutes for audio processing
const MAX_RETRIES = 3
const RETRY_DELAYS = [100, 300, 900] // milliseconds with exponential backoff

interface TranscriptResult {
  text: string
  language: LanguageCode
}

interface SummaryResult {
  text: string
  language: LanguageCode
}

interface APIError {
  message: string
  code: string
  status: number
}

/**
 * Check if an error is retryable (transient)
 * Non-retryable errors: validation (4xx except 429), auth errors
 * Retryable errors: rate limit (429), server errors (5xx), timeouts, network errors
 */
function isRetryableError(error: unknown, statusCode?: number): boolean {
  // Network/timeout errors are always retryable
  if (error instanceof Error) {
    if (error.name === 'AbortError') return true // timeout
    if (error.message.includes('timeout')) return true
    if (error.message.includes('fetch') || error.message.includes('network'))
      return true
  }

  // HTTP status code logic
  if (statusCode) {
    if (statusCode === 429) return true // Rate limited - retry
    if (statusCode >= 500) return true // Server errors - retry
    if (statusCode >= 400) return false // Client/validation errors - don't retry
  }

  // Unknown errors - don't retry
  return false
}

/**
 * Retry a function with exponential backoff
 */
async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  operationName: string
): Promise<T> {
  let lastError: unknown

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      return await fn()
    } catch (error) {
      lastError = error

      // Check if error is retryable
      const statusCode = (error as Error & { status?: number }).status
      if (!isRetryableError(error, statusCode)) {
        // Non-retryable error - fail immediately
        throw error
      }

      // If this was the last attempt, throw the error
      if (attempt === MAX_RETRIES) {
        console.error(
          `[${operationName}] Failed after ${MAX_RETRIES} attempts:`,
          error
        )
        throw error
      }

      // Wait before retrying
      const delayMs = RETRY_DELAYS[attempt - 1]
      console.log(
        `[${operationName}] Attempt ${attempt} failed, retrying in ${delayMs}ms...`
      )
      await new Promise(resolve => setTimeout(resolve, delayMs))
    }
  }

  // Should never reach here, but satisfy TypeScript
  throw lastError
}

/**
 * Upload audio for transcription
 * @param sessionId - Session ID
 * @param participantId - Participant ID
 * @param participantName - Participant name
 * @param audioBlob - Audio file blob
 * @param format - Audio format
 * @param language - Optional language code
 * @returns Transcript with text and detected language
 */
export async function uploadAudio(
  sessionId: string,
  participantId: string,
  participantName: string,
  audioBlob: Blob,
  format: 'webm' | 'mp3' | 'mp4' | 'wav',
  language?: LanguageCode
): Promise<TranscriptResult> {
  // Validate inputs
  if (!sessionId || !participantId || !participantName) {
    throw new Error('Session ID, participant ID, and name are required')
  }

  if (!audioBlob || audioBlob.size === 0) {
    throw new Error('Audio blob is empty')
  }

  if (audioBlob.size > 25 * 1024 * 1024) {
    throw new Error('Audio file exceeds 25MB limit')
  }

  const formData = new FormData()
  formData.append('sessionId', sessionId)
  formData.append('participantId', participantId)
  formData.append('participantName', participantName)
  formData.append('audio', audioBlob, `audio.${format}`)
  if (language) {
    formData.append('language', language)
  }

  return retryWithBackoff(async () => {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)

    try {
      const response = await fetch('/.netlify/functions/transcribe', {
        method: 'POST',
        body: formData,
        signal: controller.signal,
      })

      clearTimeout(timeoutId)

      if (!response.ok) {
        const error = (await response.json().catch(() => ({}))) as {
          error?: string
          code?: string
        }
        const err = new Error(error.error || 'Transcription failed')
        ;(err as Error & { status?: number }).status = response.status
        throw err
      }

      const data = (await response.json()) as {
        success?: boolean
        transcript?: { text: string; language: LanguageCode }
        error?: { message: string; code: string }
      }

      if (!data.success || !data.transcript) {
        throw new Error(data.error?.message || 'Transcription failed')
      }

      return data.transcript
    } catch (error) {
      clearTimeout(timeoutId)

      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error('Transcription request timeout')
      }

      throw error
    }
  }, 'uploadAudio')
}

/**
 * Generate summary from transcripts
 * @param sessionId - Session ID
 * @param transcripts - Array of participant transcripts
 * @param language - Optional output language
 * @returns Generated summary
 */
export async function generateSummary(
  sessionId: string,
  transcripts: Transcript[],
  language?: LanguageCode
): Promise<SummaryResult> {
  // Validate inputs
  if (!sessionId) {
    throw new Error('Session ID is required')
  }

  if (!Array.isArray(transcripts) || transcripts.length === 0) {
    throw new Error('At least one transcript is required')
  }

  for (const transcript of transcripts) {
    if (!transcript.participantName || !transcript.text) {
      throw new Error('Each transcript must have participant name and text')
    }
  }

  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)

  try {
    const response = await fetch('/.netlify/functions/summarize', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        sessionId,
        transcripts,
        language,
      }),
      signal: controller.signal,
    })

    clearTimeout(timeoutId)

    if (!response.ok) {
      const error = (await response.json().catch(() => ({}))) as {
        error?: string
        code?: string
      }
      const err = new Error(error.error || 'Summary generation failed')
      ;(err as Error & { status?: number }).status = response.status
      throw err
    }

    const data = (await response.json()) as {
      success?: boolean
      summary?: { text: string; language: LanguageCode }
      error?: { message: string; code: string }
    }

    if (!data.success || !data.summary) {
      throw new Error(data.error?.message || 'Summary generation failed')
    }

    return {
      text: data.summary.text,
      language: data.summary.language,
    }
  } catch (error) {
    clearTimeout(timeoutId)

    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error('Summary generation request timeout')
    }

    throw error
  }
}

/**
 * Finish session by generating summary from transcripts
 * @param sessionId - Session ID
 * @param transcripts - Array of participant transcripts
 * @returns Summary with structured sections
 */
export async function finishSession(
  sessionId: string,
  transcripts: Transcript[]
): Promise<string> {
  // Validate inputs
  if (!sessionId) {
    throw new Error('Session ID is required')
  }

  if (!Array.isArray(transcripts) || transcripts.length === 0) {
    throw new Error('At least one transcript is required')
  }

  for (const transcript of transcripts) {
    if (!transcript.participantName || !transcript.text) {
      throw new Error('Each transcript must have participant name and text')
    }
  }

  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)

  try {
    const response = await fetch('/.netlify/functions/finish-session', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        sessionId,
        transcripts,
      }),
      signal: controller.signal,
    })

    clearTimeout(timeoutId)

    if (!response.ok) {
      const error = (await response.json().catch(() => ({}))) as {
        error?: string
        code?: string
      }
      const err = new Error(error.error || 'Session finish failed')
      ;(err as Error & { status?: number }).status = response.status
      throw err
    }

    const data = (await response.json()) as {
      success?: boolean
      rawText?: string
      error?: { message: string; code: string }
    }

    if (!data.success || !data.rawText) {
      throw new Error(data.error?.message || 'Session finish failed')
    }

    return data.rawText
  } catch (error) {
    clearTimeout(timeoutId)

    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error('Session finish request timeout')
    }

    throw error
  }
}

/**
 * Summarize a single participant's transcript immediately after transcription
 * @param participantName - Name of the participant
 * @param transcriptText - Raw transcript text to summarize
 * @param language - Detected language code for output
 * @returns Structured summary sections for immediate display
 */
export async function summarizeTranscript(
  participantName: string,
  transcriptText: string,
  language?: LanguageCode
): Promise<{
  yesterday?: string
  today?: string
  blockers?: string
  actionItems?: string
  other?: string
}> {
  if (!participantName || !transcriptText) {
    throw new Error('Participant name and transcript text are required')
  }

  return retryWithBackoff(async () => {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)

    try {
      const response = await fetch('/.netlify/functions/summarize-transcript', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          participantName,
          transcriptText,
          language,
        }),
        signal: controller.signal,
      })

      clearTimeout(timeoutId)

      if (!response.ok) {
        const error = (await response.json().catch(() => ({}))) as {
          error?: string
          code?: string
        }
        const err = new Error(error.error || 'Transcript summarization failed')
        ;(err as Error & { status?: number }).status = response.status
        throw err
      }

      const data = (await response.json()) as {
        success?: boolean
        sections?: {
          yesterday?: string
          today?: string
          blockers?: string
          actionItems?: string
          other?: string
        }
        error?: { message: string; code: string }
      }

      if (!data.success || !data.sections) {
        throw new Error(
          data.error?.message || 'Transcript summarization failed'
        )
      }

      return data.sections
    } catch (error) {
      clearTimeout(timeoutId)

      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error('Transcript summarization request timeout')
      }

      throw error
    }
  }, 'summarizeTranscript')
}

/**
 * Save a transcript to the session backend
 * @param sessionId - Session ID
 * @param transcript - Transcript data to save
 */
export async function saveTranscript(
  sessionId: string,
  transcript: {
    participantName: string
    text: string
    duration?: number
    language?: string
  }
): Promise<void> {
  if (!sessionId || !transcript) {
    throw new Error('Session ID and transcript are required')
  }

  if (!transcript.participantName || !transcript.text) {
    throw new Error('Transcript must have participantName and text')
  }

  try {
    const response = await fetch('/.netlify/functions/save-transcript', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        sessionId,
        transcript,
      }),
    })

    if (!response.ok) {
      const error = (await response.json().catch(() => ({}))) as {
        error?: string
        code?: string
      }
      throw new Error(error.error || 'Failed to save transcript')
    }

    const data = (await response.json()) as {
      success?: boolean
      error?: { message: string; code: string }
    }

    if (!data.success) {
      throw new Error(data.error?.message || 'Failed to save transcript')
    }
  } catch (error) {
    console.error('[ai-api] saveTranscript failed:', error)
    throw error
  }
}

/**
 * Get transcripts from session
 * @param sessionId - Session ID
 * @returns Array of transcripts from the session
 */
export async function getSessionTranscripts(
  sessionId: string
): Promise<Transcript[]> {
  if (!sessionId) {
    throw new Error('Session ID is required')
  }

  try {
    const response = await fetch(
      `/.netlify/functions/get-session?sessionId=${sessionId}`
    )

    if (!response.ok) {
      throw new Error('Failed to fetch session data')
    }

    const data = (await response.json()) as {
      success?: boolean
      session?: {
        transcripts?: Transcript[]
      }
    }

    return data.session?.transcripts || []
  } catch (error) {
    console.error('[ai-api] getSessionTranscripts failed:', error)
    return [] // Return empty array on error
  }
}

/**
 * Convert any error to a human-readable message string
 * Used in UI to ensure we never display "[object Object]"
 * For API errors, returns generic message since retries will happen
 * For specific errors (microphone, etc.), returns detailed message
 * @param error - Error of any type
 * @param isAPIError - If true, return generic message for retry scenarios
 * @returns Human-readable error message
 */
export function getErrorMessage(error: unknown, isAPIError = false): string {
  if (!error) return 'Oops, something went wrong. Please try again.'

  if (typeof error === 'string') {
    return error
  }

  if (error instanceof Error) {
    // Specific, non-API errors always get detailed messages
    if (error.message.includes('permission')) {
      return 'Microphone permission denied. Please enable it in your browser settings.'
    }
    if (
      error.message.includes('NotFoundError') ||
      error.message.includes('No microphone')
    ) {
      return 'No microphone found. Please check your device.'
    }

    // For API errors, use generic message since retries will happen
    if (isAPIError) {
      return 'Oops, something went wrong. Please try again.'
    }

    // For non-API errors, return the actual message
    if (error.message && error.message.trim().length > 0) {
      return error.message
    }
  }

  if (typeof error === 'object') {
    const errorObj = error as Record<string, unknown>
    if (errorObj.message && typeof errorObj.message === 'string') {
      if (isAPIError) {
        return 'Oops, something went wrong. Please try again.'
      }
      return errorObj.message
    }
    if (errorObj.error && typeof errorObj.error === 'string') {
      if (isAPIError) {
        return 'Oops, something went wrong. Please try again.'
      }
      return errorObj.error
    }
  }

  return 'Oops, something went wrong. Please try again.'
}

/**
 * Parse API error response
 * @param error - Error object
 * @returns Formatted API error
 */
export function parseAPIError(error: unknown): APIError {
  if (error instanceof Error) {
    // Check for network/timeout errors
    if (error.message.includes('timeout')) {
      return {
        message: 'Request timeout. Please try again.',
        code: 'TIMEOUT',
        status: 504,
      }
    }

    if (error.message.includes('fetch') || error.message.includes('network')) {
      return {
        message: 'Network error. Please check your connection.',
        code: 'NETWORK_ERROR',
        status: 0,
      }
    }

    // Return error message, ensuring it's a string
    const message =
      error.message && error.message.trim().length > 0
        ? error.message
        : 'An unexpected error occurred'

    return {
      message,
      code: 'UNKNOWN_ERROR',
      status: 0,
    }
  }

  // Handle non-Error objects by converting them to string
  let errorMessage = 'An unknown error occurred'
  if (error) {
    if (typeof error === 'string') {
      errorMessage = error
    } else if (typeof error === 'object') {
      const errorObj = error as Record<string, unknown>
      if (errorObj.message && typeof errorObj.message === 'string') {
        errorMessage = errorObj.message
      } else {
        errorMessage = JSON.stringify(error)
      }
    }
  }

  return {
    message: errorMessage,
    code: 'UNKNOWN_ERROR',
    status: 0,
  }
}
