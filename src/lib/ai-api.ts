/**
 * Frontend AI API Client
 * Handles communication with Netlify AI functions (transcribe, summarize)
 * Implements retry logic for transient failures
 */

import type { LanguageCode, Transcript } from './portkey-types'

const MAX_RETRIES = 3
const RETRY_DELAY_MS = 1000
const REQUEST_TIMEOUT_MS = 120000 // 2 minutes for audio processing

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
 * Retry logic for API calls with exponential backoff
 */
async function withRetry<T>(
  fn: () => Promise<T>,
  maxRetries: number = MAX_RETRIES
): Promise<T> {
  let lastError: Error | null = null

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn()
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error))

      // Don't retry on validation errors (4xx)
      if (
        lastError.message.includes('400') ||
        lastError.message.includes('401') ||
        lastError.message.includes('404')
      ) {
        throw error
      }

      // Don't retry on last attempt
      if (attempt === maxRetries) {
        throw error
      }

      // Exponential backoff: 1s, 2s, 4s
      const delayMs = RETRY_DELAY_MS * Math.pow(2, attempt)
      await new Promise(resolve => setTimeout(resolve, delayMs))
    }
  }

  throw lastError || new Error('Unknown error in retry logic')
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

  return withRetry(async () => {
    const formData = new FormData()
    formData.append('sessionId', sessionId)
    formData.append('participantId', participantId)
    formData.append('participantName', participantName)
    formData.append('audio', audioBlob, `audio.${format}`)
    if (language) {
      formData.append('language', language)
    }

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

      if (
        error instanceof Error &&
        error.name === 'AbortError'
      ) {
        throw new Error('Transcription request timeout')
      }

      throw error
    }
  })
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

  return withRetry(async () => {
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

      if (
        error instanceof Error &&
        error.name === 'AbortError'
      ) {
        throw new Error('Summary generation request timeout')
      }

      throw error
    }
  })
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

    if (error.message.includes('fetch')) {
      return {
        message: 'Network error. Please check your connection.',
        code: 'NETWORK_ERROR',
        status: 0,
      }
    }

    return {
      message: error.message,
      code: 'UNKNOWN_ERROR',
      status: 0,
    }
  }

  return {
    message: 'An unknown error occurred',
    code: 'UNKNOWN_ERROR',
    status: 0,
  }
}

/**
 * Check if error is retryable
 * @param error - Error object
 * @returns true if error is retryable
 */
export function isRetryableError(error: unknown): boolean {
  if (error instanceof Error) {
    // Retry on timeout and network errors
    if (
      error.message.includes('timeout') ||
      error.message.includes('fetch') ||
      error.message.includes('Network')
    ) {
      return true
    }

    // Retry on 5xx server errors
    if (
      error.message.includes('502') ||
      error.message.includes('503') ||
      error.message.includes('504')
    ) {
      return true
    }

    // Retry on rate limit (429)
    if (error.message.includes('429')) {
      return true
    }
  }

  return false
}
