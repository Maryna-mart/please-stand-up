/**
 * Netlify Function: Summarize Single Transcript
 * POST /api/summarize-transcript
 * Generates summary sections for a single participant's transcript
 * Called immediately after transcription for real-time display
 */

import { Handler } from '@netlify/functions'
import { summarizeIndividualTranscript } from './lib/portkey-server'

interface SummarizeTranscriptRequest {
  participantName: string
  transcriptText: string
}

interface SummarizeTranscriptResponse {
  success: boolean
  sections: {
    yesterday?: string
    today?: string
    blockers?: string
    actionItems?: string
    other?: string
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
    let body: SummarizeTranscriptRequest
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
    if (!body.participantName || !body.transcriptText) {
      return {
        statusCode: 400,
        body: JSON.stringify({
          error: 'Participant name and transcript text are required',
          code: 'MISSING_FIELDS',
        } as ErrorResponse),
      }
    }

    console.log('[summarize-transcript] Summarizing transcript for', {
      participantName: body.participantName,
      textLength: body.transcriptText.length,
    })

    // Generate summary sections using Claude via Portkey
    let sections: {
      yesterday?: string
      today?: string
      blockers?: string
      actionItems?: string
      other?: string
    }
    try {
      sections = await summarizeIndividualTranscript(
        body.participantName,
        body.transcriptText
      )
    } catch (error) {
      console.error('[summarize-transcript] Summarization failed:', error)
      return {
        statusCode: 502,
        body: JSON.stringify({
          error: 'Failed to summarize transcript. Please try again.',
          code: 'SUMMARIZATION_ERROR',
        } as ErrorResponse),
      }
    }

    const response: SummarizeTranscriptResponse = {
      success: true,
      sections,
    }

    return {
      statusCode: 200,
      body: JSON.stringify(response),
      headers: {
        'Content-Type': 'application/json',
      },
    }
  } catch (error) {
    console.error('[summarize-transcript] Unexpected error:', error)
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
