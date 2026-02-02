/**
 * Netlify Function: Finish Session
 * POST /api/finish-session
 * Generates summary from transcripts and prepares for email delivery
 */

import { Handler } from '@netlify/functions'
import { getSession, updateSession } from './lib/redis-client'
import { isValidSessionId } from './lib/validation'
import { summarizeTranscripts } from './lib/portkey-server'
import { sendSummaryEmails, isSendGridConfigured } from './lib/sendgrid-client'
import { parseSummary } from '../src/lib/summary-parser'
import { decryptEmail, deserializeEncryptedEmail } from './lib/email-crypto'

interface FinishSessionRequest {
  sessionId: string
  transcripts: Array<{
    participantName: string
    text: string
  }>
}

interface FinishSessionResponse {
  success: boolean
  sessionId: string
  summary: {
    rawText: string
    participants: Array<{
      name: string
      sections: {
        yesterday?: string
        today?: string
        blockers?: string
        actionItems?: string
        other?: string
      }
    }>
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
    let body: FinishSessionRequest
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

    // Validate session ID
    const sessionId = body.sessionId
    if (!isValidSessionId(sessionId)) {
      return {
        statusCode: 400,
        body: JSON.stringify({
          error: 'Invalid session ID format',
          code: 'INVALID_SESSION_ID',
        } as ErrorResponse),
      }
    }

    // Validate transcripts array
    if (!Array.isArray(body.transcripts) || body.transcripts.length === 0) {
      return {
        statusCode: 400,
        body: JSON.stringify({
          error: 'At least one transcript is required',
          code: 'MISSING_TRANSCRIPTS',
        } as ErrorResponse),
      }
    }

    // Verify session exists
    const session = await getSession(sessionId)
    if (!session) {
      return {
        statusCode: 404,
        body: JSON.stringify({
          error: 'Session not found or expired',
          code: 'SESSION_NOT_FOUND',
        } as ErrorResponse),
      }
    }

    // Format transcripts for Claude
    const transcriptText = body.transcripts
      .map(t => `**${t.participantName}**:\n${t.text}`)
      .join('\n\n')

    console.log(
      '[finish-session] Sending transcripts to Claude for summarization',
      {
        sessionId,
        transcriptCount: body.transcripts.length,
        totalLength: transcriptText.length,
      }
    )

    // Generate summary using Claude via Portkey
    let summaryText: string
    try {
      summaryText = await summarizeTranscripts(transcriptText)
    } catch (error) {
      console.error('[finish-session] Summary generation failed:', error)
      return {
        statusCode: 502,
        body: JSON.stringify({
          error: 'Failed to generate summary. Please try again.',
          code: 'SUMMARY_GENERATION_ERROR',
        } as ErrorResponse),
      }
    }

    // Parse summary into structured sections
    const parsedSummary = parseSummary(summaryText)

    // Update session with summary
    const updateSuccess = await updateSession(sessionId, {
      summary: summaryText,
      finishedAt: Date.now(),
    })

    if (!updateSuccess) {
      console.error('[finish-session] Failed to update session with summary')
      return {
        statusCode: 502,
        body: JSON.stringify({
          error: 'Failed to save summary. Please try again.',
          code: 'STORAGE_ERROR',
        } as ErrorResponse),
      }
    }

    console.log('[finish-session] Session finished successfully', {
      sessionId,
      participantCount: parsedSummary.participants.length,
    })

    // Send emails if SendGrid is configured
    if (isSendGridConfigured()) {
      try {
        // Collect all participant emails (leader + participants)
        const recipients: Array<{ email: string; name: string }> = []

        // Add leader email if encrypted
        if (session.encryptedEmail) {
          try {
            const encryptedData = deserializeEncryptedEmail(
              session.encryptedEmail
            )
            const decryptedEmail = decryptEmail(encryptedData, sessionId)
            recipients.push({
              email: decryptedEmail,
              name: session.leaderName,
            })
          } catch (error) {
            console.warn(
              '[finish-session] Failed to decrypt leader email:',
              error
            )
          }
        }

        // Add participant emails if encrypted
        for (const participant of session.participants) {
          if (participant.encryptedEmail) {
            try {
              const encryptedData = deserializeEncryptedEmail(
                participant.encryptedEmail
              )
              const decryptedEmail = decryptEmail(encryptedData, sessionId)
              recipients.push({
                email: decryptedEmail,
                name: participant.name,
              })
            } catch (error) {
              console.warn(
                '[finish-session] Failed to decrypt participant email:',
                error
              )
            }
          }
        }

        // Send emails to all recipients
        if (recipients.length > 0) {
          const emailResults = await sendSummaryEmails(recipients, sessionId, {
            participants: parsedSummary.participants,
          })

          console.log('[finish-session] Email send results', {
            sessionId,
            total: recipients.length,
            results: emailResults,
          })
        }
      } catch (error) {
        console.error('[finish-session] Error sending emails:', error)
        // Don't fail the request if emails fail - summary was generated successfully
      }
    } else {
      console.log('[finish-session] SendGrid not configured, skipping email')
    }

    const response: FinishSessionResponse = {
      success: true,
      sessionId,
      summary: {
        rawText: summaryText,
        participants: parsedSummary.participants,
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
    console.error('[finish-session] Unexpected error:', error)
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
