/**
 * Portkey Server Configuration
 * Initializes Portkey client for summarization (Claude)
 * Handles API requests with error handling, retry logic, and logging
 */

import OpenAI from 'openai'
import { createHeaders } from 'portkey-ai'

// Configuration constants
const MAX_RETRIES = 3
const RETRY_DELAY_MS = 1000
const REQUEST_TIMEOUT_MS = 60000 // 60 seconds for AI operations
const PORTKEY_GATEWAY_URL = 'https://api.portkey.ai/v1'

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
 * Initialize OpenAI client configured for Portkey gateway
 * @returns Configured OpenAI client instance with Portkey authentication
 */
function initializePortkey(): OpenAI {
  validateConfig()

  const portKeyApiKey = process.env.PORTKEY_API_KEY!

  return new OpenAI({
    apiKey: 'dummy',
    baseURL: PORTKEY_GATEWAY_URL,
    defaultHeaders: createHeaders({
      apiKey: portKeyApiKey,
    }),
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
- 📝 Other: Any other important information that doesn't fit the above categories

Format the summary as a structured document with each person as a section. Include all information provided, even if it goes into the "Other" section.`

    const response = await portkey.chat.completions.create(
      {
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 2048,
        messages: [
          {
            role: 'system',
            content: systemPrompt,
          },
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

    const summary = response.choices?.[0]?.message?.content || ''

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
 * Summarize a single participant's transcript into structured sections
 * Called immediately after transcription for real-time display
 * @param participantName - Name of the participant
 * @param transcriptText - Raw transcript text from a single participant
 * @returns Structured sections object
 */
export async function summarizeIndividualTranscript(
  participantName: string,
  transcriptText: string
): Promise<{
  yesterday?: string
  today?: string
  blockers?: string
  actionItems?: string
  other?: string
}> {
  if (!transcriptText || transcriptText.trim().length === 0) {
    throw new Error('Transcript text is required for summarization')
  }

  const portkey = initializePortkey()

  return withRetry(async () => {
    console.log('[Portkey] Starting individual transcript summarization', {
      participantName,
      textLength: transcriptText.length,
    })

    const systemPrompt = `You are a professional standup meeting summarizer. Extract key information from a participant's standup update and return ONLY a JSON object with these fields (omit fields that have no content):

{
  "yesterday": "What they completed yesterday",
  "today": "What they plan to do today",
  "blockers": "Any blockers or challenges",
  "actionItems": "Any actions needed from the team",
  "other": "Any other important information"
}

Be concise and extract only the most important points. Return ONLY valid JSON, no additional text.`

    const response = await portkey.chat.completions.create(
      {
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 1024,
        messages: [
          {
            role: 'system',
            content: systemPrompt,
          },
          {
            role: 'user',
            content: `${transcriptText}`,
          },
        ],
      },
      {
        timeout: REQUEST_TIMEOUT_MS,
      }
    )

    const responseText = response.choices?.[0]?.message?.content || ''

    if (!responseText || responseText.trim().length === 0) {
      console.error('[Portkey] Empty response from Claude')
      throw new Error('No summary content received from Claude')
    }

    console.log('[Portkey] Raw response from Claude:', responseText.substring(0, 500))

    // Parse the JSON response - try to extract JSON if wrapped in markdown
    let sections: {
      yesterday?: string
      today?: string
      blockers?: string
      actionItems?: string
      other?: string
    }
    try {
      // Try direct parse first
      sections = JSON.parse(responseText)
    } catch {
      // Try to extract JSON from markdown code blocks
      const jsonMatch = responseText.match(/```(?:json)?\s*([\s\S]*?)\s*```/)
      if (jsonMatch) {
        try {
          sections = JSON.parse(jsonMatch[1])
        } catch {
          console.error(
            '[Portkey] Failed to parse extracted JSON:',
            jsonMatch[1].substring(0, 200)
          )
          sections = {}
        }
      } else {
        console.error(
          '[Portkey] Failed to parse JSON and no code blocks found:',
          responseText.substring(0, 200)
        )
        sections = {}
      }
    }

    console.log('[Portkey] Individual transcript summarization successful', {
      participantName,
      sectionsCount: Object.keys(sections).filter(
        k => sections[k as keyof typeof sections]
      ).length,
    })

    return sections
  })
}

/**
 * Summarize transcripts into structured sections
 * @param transcriptText - Formatted transcript text (already formatted with participant names)
 * @returns Summary text ready for parsing
 */
export async function summarizeTranscripts(
  transcriptText: string
): Promise<string> {
  if (!transcriptText || transcriptText.trim().length === 0) {
    throw new Error('Transcript text is required for summarization')
  }

  const portkey = initializePortkey()

  return withRetry(async () => {
    console.log('[Portkey] Starting transcript summarization', {
      textLength: transcriptText.length,
    })

    const systemPrompt = `You are a professional meeting summarizer. Extract key information from the standup meeting transcripts and format it clearly.

For each participant, extract:
- ✅ Yesterday: What they completed yesterday
- 🎯 Today: What they plan to do today
- 🚫 Blockers: Any blockers or challenges
- 📌 Team Action Items: Any actions needed from the team
- 📝 Other: Any other important information that doesn't fit the above categories

Format the summary as a structured document with each person as a section. Include all information provided, even if it goes into the "Other" section.`

    const response = await portkey.chat.completions.create(
      {
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 2048,
        messages: [
          {
            role: 'system',
            content: systemPrompt,
          },
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

    const summary = response.choices?.[0]?.message?.content || ''

    if (!summary || summary.trim().length === 0) {
      throw new Error('No summary content received from Claude')
    }

    console.log('[Portkey] Transcript summarization successful', {
      summaryLength: summary.length,
    })

    return summary
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
