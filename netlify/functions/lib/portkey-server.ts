/**
 * Portkey Server Configuration
 * Initializes Portkey client for transcription (Whisper) and summarization (Claude)
 * Handles API requests with error handling, retry logic, and logging
 */

import OpenAI from 'openai'
import FormData from 'form-data'

// Configuration constants
const MAX_RETRIES = 3
const RETRY_DELAY_MS = 1000
const REQUEST_TIMEOUT_MS = 60000 // 60 seconds for AI operations

interface TranscriptionResult {
  text: string
  language: string
}

interface SummarizationResult {
  summary: string
  language: string
}

interface ErrorWithCode extends Error {
  code?: string
  status?: number
}

// Validate environment configuration
function validateConfig(): void {
  const apiKey = process.env.PORTKEY_API_KEY

  if (!apiKey) {
    console.error(
      '[Portkey] PORTKEY_API_KEY environment variable not configured'
    )
    throw new Error('Portkey API key not configured')
  }

  console.log('[Portkey] API key is configured (length: ' + apiKey.length + ')')
}

/**
 * Initialize OpenAI client configured for Portkey
 * @returns Configured OpenAI client instance
 */
function initializePortkey(): OpenAI {
  validateConfig()

  const apiKey = process.env.PORTKEY_API_KEY!

  return new OpenAI({
    apiKey,
    baseURL: 'https://api.portkey.ai/v1',
  })
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
        `[Portkey] Retry attempt ${attempt + 1}/${maxRetries} after ${delayMs}ms`
      )
      await new Promise(resolve => setTimeout(resolve, delayMs))
    }
  }

  // This should never happen due to throw above, but TypeScript needs it
  throw lastError || new Error('Unknown error in retry logic')
}

/**
 * Transcribe audio to text using Whisper
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
    console.log('[Portkey] Starting transcription for audio', {
      size: audioBuffer.length,
      format: audioFormat,
      language: language || 'auto-detect',
    })

    // Use form-data for proper multipart encoding in Node.js
    const form = new FormData()
    form.append('file', audioBuffer, {
      filename: `audio.${audioFormat}`,
      contentType: `audio/${audioFormat}`,
    })
    form.append('model', 'whisper-1')
    if (language && language !== 'auto-detect') {
      form.append('language', language)
    }
    form.append('prompt', 'This is a team standup meeting transcript.')

    console.log('[Portkey] Sending request to Portkey API', {
      fileName: `audio.${audioFormat}`,
      mimeType: `audio/${audioFormat}`,
    })

    // Convert form to buffer by reading the stream
    const chunks: Buffer[] = []
    for await (const chunk of form) {
      chunks.push(chunk as Buffer)
    }
    const formBuffer = Buffer.concat(chunks)

    const apiKey = process.env.PORTKEY_API_KEY!
    const response = await fetch(
      'https://api.portkey.ai/v1/audio/transcriptions',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          ...form.getHeaders(),
        },
        body: formBuffer,
      }
    )

    if (!response.ok) {
      const errorText = await response.text()
      const error = new Error(
        `Portkey API error: ${response.status} ${response.statusText} - ${errorText}`
      ) as ErrorWithCode
      error.status = response.status
      throw error
    }

    const data = (await response.json()) as { text: string }

    console.log('[Portkey] Transcription successful', {
      textLength: data.text.length,
      language: language || 'detected',
    })

    return {
      text: data.text,
      language: language || 'en', // Default to English if not specified
    }
  })
}

/**
 * Generate summary using Claude
 * @param transcripts - Array of participant transcripts
 * @param language - Language for output (default: detected from input)
 * @returns Formatted summary
 */
export async function generateSummary(
  transcripts: Array<{
    participantName: string
    text: string
  }>,
  language: string = 'en'
): Promise<SummarizationResult> {
  if (!transcripts || transcripts.length === 0) {
    throw new Error('No transcripts provided for summarization')
  }

  const portkey = initializePortkey()

  return withRetry(async () => {
    console.log('[Portkey] Starting summarization', {
      participantCount: transcripts.length,
      totalTextLength: transcripts.reduce((sum, t) => sum + t.text.length, 0),
      language,
    })

    // Build the prompt with all participant transcripts
    const transcriptText = transcripts
      .map(t => `${t.participantName}:\n${t.text}`)
      .join('\n\n---\n\n')

    const systemPrompt = `You are a professional meeting summarizer. Extract key information from the standup meeting transcripts and format it clearly in ${language}.

For each participant, extract:
- ✅ Yesterday: What they completed yesterday
- 🎯 Today: What they plan to do today
- 🚫 Blockers: Any blockers or challenges
- 📌 Team Action Items: Any actions needed from the team

Format the summary as a structured document with each person as a section.`

    const response = await portkey.chat.completions.create(
      {
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 2048,
        system: systemPrompt,
        messages: [
          {
            role: 'user',
            content: `Please summarize this standup meeting:\n\n${transcriptText}`,
          },
        ],
      },
      {
        timeout: REQUEST_TIMEOUT_MS,
      }
    )

    const summary =
      response.content[0].type === 'text' ? response.content[0].text : ''

    console.log('[Portkey] Summarization successful', {
      summaryLength: summary.length,
      language,
    })

    return {
      summary,
      language,
    }
  })
}

/**
 * Check if Portkey is accessible
 * @returns true if API key is configured and valid
 */
export function isPortkeyConfigured(): boolean {
  return !!process.env.PORTKEY_API_KEY
}

/**
 * Log Portkey request for debugging
 * @param operation - Operation name
 * @param details - Additional details
 */
export function logPortkeyRequest(
  operation: string,
  details: Record<string, unknown>
): void {
  console.log(`[Portkey] ${operation}`, details)
}

/**
 * Handle Portkey API errors gracefully
 * @param error - Error object
 * @returns Formatted error for response
 */
export function handlePortkeyError(error: unknown): {
  message: string
  code: string
  status: number
} {
  const err = error as ErrorWithCode

  // Log the actual error for debugging
  console.error('[Portkey] Error details:', {
    message: err.message,
    status: err.status,
    code: err.code,
    stack: err.stack,
  })

  if (err.message?.includes('timeout')) {
    return {
      message: 'AI service request timeout. Please try again.',
      code: 'PORTKEY_TIMEOUT',
      status: 504,
    }
  }

  if (err.status === 429) {
    return {
      message: 'AI service is rate limited. Please try again later.',
      code: 'PORTKEY_RATE_LIMIT',
      status: 429,
    }
  }

  if (err.status === 401) {
    return {
      message: 'AI service authentication failed.',
      code: 'PORTKEY_AUTH_ERROR',
      status: 401,
    }
  }

  if (err.status && err.status >= 500) {
    return {
      message: 'AI service is temporarily unavailable. Please try again.',
      code: 'PORTKEY_SERVICE_ERROR',
      status: 502,
    }
  }

  return {
    message: 'Failed to process audio or generate summary.',
    code: 'PORTKEY_ERROR',
    status: 502,
  }
}
