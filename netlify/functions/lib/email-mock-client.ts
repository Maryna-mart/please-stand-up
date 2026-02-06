/**
 * Email Mock Client for Development
 * When ENABLE_DEV_MODE_EMAIL_MOCK is enabled, this client stores codes in Redis
 * and logs them to the browser console without attempting to send via SendGrid.
 *
 * Usage:
 * - Set ENABLE_DEV_MODE_EMAIL_MOCK=true in .env for development
 * - Request verification code as normal
 * - Code is logged to browser console with a special [EMAIL_CODE] prefix
 * - Copy the code from console and use it to verify email
 * - Switch back to real SendGrid by disabling the flag
 *
 * In production, disable this and set real SENDGRID_API_KEY
 */

/**
 * Check if development email mock mode is enabled
 */
export function isDevelopmentEmailMockEnabled(): boolean {
  return process.env.ENABLE_DEV_MODE_EMAIL_MOCK === 'true'
}

/**
 * Generate console logging payload to display verification code
 * Returns email and code as an object instead of JavaScript code
 * This avoids needing eval() on the frontend
 *
 * @param email - Email address
 * @param code - 6-digit verification code
 * @returns Object with email and code
 */
export function createConsoleLogPayload(
  email: string,
  code: string
): { email: string; code: string } {
  return { email, code }
}

/**
 * Send a verification code (mock version for development)
 * In development mode, returns a response that includes console logging data
 * The code is still stored in Redis for rate limiting and verification
 *
 * Frontend will log the email and code to console directly
 *
 * @param email - Email to send to
 * @param code - Verification code
 * @returns Mock response that includes console logging data
 */
export async function sendMockVerificationCodeEmail(
  email: string,
  code: string
): Promise<{
  statusCode: number
  success: boolean
  message: string
  devMode: boolean
  devConsolePayload?: { email: string; code: string }
}> {
  if (!isDevelopmentEmailMockEnabled()) {
    return {
      statusCode: 400,
      success: false,
      message: 'Development mock mode not enabled',
      devMode: false,
    }
  }

  try {
    const payload = createConsoleLogPayload(email, code)

    console.log('[EmailMock] Mock verification code generated', {
      email: email.toLowerCase(),
      code,
      devMode: true,
    })

    return {
      statusCode: 200,
      success: true,
      message: 'Check browser console for verification code (development mode)',
      devMode: true,
      devConsolePayload: payload,
    }
  } catch (error) {
    console.error('[EmailMock] Error in sendMockVerificationCodeEmail:', error)
    return {
      statusCode: 500,
      success: false,
      message: 'Failed to generate mock code',
      devMode: false,
    }
  }
}

/**
 * Send a summary email (mock version for development)
 * In development mode, logs the email to server console instead of sending via SendGrid
 *
 * @param email - Email to send to
 * @param content - Email content/summary
 * @returns Mock response object
 */
export async function sendMockSummaryEmail(
  email: string,
  content: unknown
): Promise<{ statusCode: number; success: boolean; error?: string }> {
  if (!isDevelopmentEmailMockEnabled()) {
    return {
      statusCode: 400,
      success: false,
      error: 'Development mock mode not enabled',
    }
  }

  try {
    console.log('[EmailMock] Summary email would be sent to:', email)
    console.log('[EmailMock] Email Content:', JSON.stringify(content, null, 2))

    return {
      statusCode: 200,
      success: true,
    }
  } catch (error) {
    console.error('[EmailMock] Error in sendMockSummaryEmail:', error)
    return {
      statusCode: 500,
      success: false,
      error: 'Failed to process mock summary email',
    }
  }
}
