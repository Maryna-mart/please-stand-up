/**
 * Frontend AI API Client
 * Handles communication with Netlify AI functions (transcribe, summarize)
 * Backend handles retry logic for transient failures
 */

import type { LanguageCode, Transcript } from './portkey-types'

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
      throw new Error(data.error?.message || 'Transcript summarization failed')
    }

    return data.sections
  } catch (error) {
    clearTimeout(timeoutId)

    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error('Transcript summarization request timeout')
    }

    throw error
  }
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
