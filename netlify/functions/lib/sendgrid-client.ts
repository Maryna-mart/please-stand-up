/**
 * SendGrid Email Client
 * Handles sending standup summary emails to participants
 */

interface EmailAddress {
  email: string
  name?: string
}

interface EmailContent {
  type: 'text/plain' | 'text/html'
  value: string
}

interface SendGridRequest {
  personalizations: Array<{
    to: EmailAddress[]
    subject: string
  }>
  from: EmailAddress
  content: EmailContent[]
  reply_to?: EmailAddress
}

interface SendGridResponse {
  statusCode: number
  success: boolean
  messageId?: string
  error?: string
}

// Validate SendGrid configuration
function validateConfig(): void {
  const apiKey = process.env.SENDGRID_API_KEY
  const fromEmail = process.env.SENDGRID_FROM_EMAIL

  if (!apiKey || apiKey === 'your_sendgrid_api_key_here') {
    console.warn('[SendGrid] API key not configured or placeholder value')
    return
  }

  if (!fromEmail || fromEmail === 'your-verified-email@example.com') {
    console.warn('[SendGrid] From email not configured or placeholder value')
    return
  }

  console.log('[SendGrid] Configuration validated')
}

/**
 * Format summary sections into HTML email body
 */
function formatSummaryAsHtml(
  participantName: string,
  sections: {
    yesterday?: string
    today?: string
    blockers?: string
    actionItems?: string
    other?: string
  }
): string {
  const sections_array = []

  if (sections.yesterday) {
    sections_array.push(`
      <div style="margin-bottom: 16px;">
        <h3 style="color: #10b981; margin: 0 0 8px 0; font-size: 16px;">✅ Yesterday</h3>
        <p style="margin: 0; color: #374151; line-height: 1.6;">${escapeHtml(sections.yesterday)}</p>
      </div>
    `)
  }

  if (sections.today) {
    sections_array.push(`
      <div style="margin-bottom: 16px;">
        <h3 style="color: #3b82f6; margin: 0 0 8px 0; font-size: 16px;">🎯 Today</h3>
        <p style="margin: 0; color: #374151; line-height: 1.6;">${escapeHtml(sections.today)}</p>
      </div>
    `)
  }

  if (sections.blockers) {
    sections_array.push(`
      <div style="margin-bottom: 16px;">
        <h3 style="color: #ef4444; margin: 0 0 8px 0; font-size: 16px;">🚫 Blockers</h3>
        <p style="margin: 0; color: #374151; line-height: 1.6;">${escapeHtml(sections.blockers)}</p>
      </div>
    `)
  }

  if (sections.actionItems) {
    sections_array.push(`
      <div style="margin-bottom: 16px;">
        <h3 style="color: #f59e0b; margin: 0 0 8px 0; font-size: 16px;">📌 Team Action Items</h3>
        <p style="margin: 0; color: #374151; line-height: 1.6;">${escapeHtml(sections.actionItems)}</p>
      </div>
    `)
  }

  if (sections.other) {
    sections_array.push(`
      <div style="margin-bottom: 16px;">
        <h3 style="color: #8b5cf6; margin: 0 0 8px 0; font-size: 16px;">📝 Other</h3>
        <p style="margin: 0; color: #374151; line-height: 1.6;">${escapeHtml(sections.other)}</p>
      </div>
    `)
  }

  return `
    <div style="margin-bottom: 24px; padding: 16px; background-color: #f9fafb; border-radius: 8px; border-left: 4px solid #3b82f6;">
      <h2 style="margin: 0 0 16px 0; color: #1f2937; font-size: 18px;">${escapeHtml(participantName)}</h2>
      <div>${sections_array.join('')}</div>
    </div>
  `
}

/**
 * Escape HTML special characters
 */
function escapeHtml(text: string): string {
  const map: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;',
  }
  return text.replace(/[&<>"']/g, char => map[char])
}

/**
 * Check if SendGrid is configured
 */
export function isSendGridConfigured(): boolean {
  const apiKey = process.env.SENDGRID_API_KEY
  const fromEmail = process.env.SENDGRID_FROM_EMAIL

  return !!(
    apiKey &&
    apiKey !== 'your_sendgrid_api_key_here' &&
    fromEmail &&
    fromEmail !== 'your-verified-email@example.com'
  )
}

/**
 * Send standup summary email
 * @param recipientEmail - Email address to send to
 * @param recipientName - Recipient name
 * @param sessionId - Session ID
 * @param summary - Summary with parsed participant sections
 * @returns Send status
 */
export async function sendSummaryEmail(
  recipientEmail: string,
  recipientName: string,
  sessionId: string,
  summary: {
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
): Promise<SendGridResponse> {
  validateConfig()

  const apiKey = process.env.SENDGRID_API_KEY
  const fromEmail = process.env.SENDGRID_FROM_EMAIL
  const fromName = process.env.SENDGRID_FROM_NAME

  if (!apiKey || !fromEmail) {
    return {
      statusCode: 502,
      success: false,
      error: 'SendGrid not configured',
    }
  }

  try {
    // Format HTML email body with all participant summaries
    const participantSummaries = summary.participants
      .map(p => formatSummaryAsHtml(p.name, p.sections))
      .join('')

    const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background-color: #1f2937; color: white; padding: 24px; border-radius: 8px; margin-bottom: 24px; text-align: center; }
    .header h1 { margin: 0; font-size: 24px; }
    .content { padding: 0; }
    .footer { margin-top: 32px; padding-top: 16px; border-top: 1px solid #e5e7eb; text-align: center; color: #6b7280; font-size: 12px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Standup Summary</h1>
      <p style="margin: 8px 0 0 0; opacity: 0.9;">Session ${escapeHtml(sessionId)}</p>
    </div>

    <div class="content">
      <p style="margin: 0 0 24px 0;">
        Hi ${escapeHtml(recipientName)},
      </p>

      <p style="margin: 0 0 24px 0; color: #6b7280;">
        Here's the summary from today's standup meeting:
      </p>

      ${participantSummaries}

      <p style="margin: 24px 0 0 0; color: #6b7280; font-size: 14px;">
        Generated on ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}
      </p>
    </div>

    <div class="footer">
      <p>This is an automated message from Standup Bot</p>
    </div>
  </div>
</body>
</html>
    `

    console.log('[SendGrid] Sending summary email', {
      to: recipientEmail,
      sessionId,
      participantCount: summary.participants.length,
    })

    const request: SendGridRequest = {
      personalizations: [
        {
          to: [{ email: recipientEmail, name: recipientName }],
          subject: `Standup Summary - ${new Date().toLocaleDateString()}`,
        },
      ],
      from: {
        email: fromEmail,
        name: fromName,
      },
      content: [
        {
          type: 'text/html',
          value: htmlContent,
        },
      ],
    }

    const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    })

    if (response.ok) {
      console.log('[SendGrid] Email sent successfully', {
        to: recipientEmail,
        statusCode: response.status,
      })

      return {
        statusCode: response.status,
        success: true,
      }
    } else {
      const errorText = await response.text()
      console.error('[SendGrid] Failed to send email', {
        statusCode: response.status,
        error: errorText,
      })

      return {
        statusCode: response.status,
        success: false,
        error: `SendGrid API error: ${response.statusText}`,
      }
    }
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error'
    console.error('[SendGrid] Error sending email:', {
      error: errorMessage,
      recipientEmail,
    })

    return {
      statusCode: 500,
      success: false,
      error: errorMessage,
    }
  }
}

/**
 * Send summary emails to multiple recipients
 * @param recipients - Array of recipient email addresses
 * @param sessionId - Session ID
 * @param summary - Summary data
 * @returns Array of send results
 */
export async function sendSummaryEmails(
  recipients: Array<{ email: string; name: string }>,
  sessionId: string,
  summary: {
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
): Promise<
  Array<{
    email: string
    success: boolean
    error?: string
  }>
> {
  const results = []

  for (const recipient of recipients) {
    const result = await sendSummaryEmail(
      recipient.email,
      recipient.name,
      sessionId,
      summary
    )

    results.push({
      email: recipient.email,
      success: result.success,
      error: result.error,
    })
  }

  return results
}
