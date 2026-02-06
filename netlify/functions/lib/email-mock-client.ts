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
 * Generate client-side console logging code to display verification code
 * This creates a special marker in the function response that the frontend can detect
 *
 * @param email - Email address
 * @param code - 6-digit verification code
 * @returns JavaScript code to log the code to browser console
 */
export function createConsoleLogPayload(email: string, code: string): string {
  return `
console.group('%c🔐 [EMAIL_CODE] Development Mode - Verification Code', 'color: #ff6b6b; font-weight: bold; font-size: 14px;');
console.log('%cEmail:', 'color: #4c6ef5; font-weight: bold;', '${email}');
console.log('%cCode:', 'color: #4c6ef5; font-weight: bold;', '${code}');
console.log('%cThis code is displayed here because ENABLE_DEV_MODE_EMAIL_MOCK is enabled', 'color: #868e96; font-size: 12px;');
console.log('%cCopy the code above and paste it into the verification field', 'color: #15aabf; font-size: 12px; font-weight: bold;');
console.groupEnd();
`
}

/**
 * Send a verification code (mock version for development)
 * In development mode, returns a response that includes console logging instructions
 * The code is still stored in Redis for rate limiting and verification
 *
 * Frontend will detect the dev-mode flag and execute console logging code
 *
 * @param email - Email to send to
 * @param code - Verification code
 * @returns Mock response that includes console.log payload
 */
export async function sendMockVerificationCodeEmail(
  email: string,
  code: string
): Promise<{
  statusCode: number
  success: boolean
  message: string
  devMode: boolean
  devConsolePayload?: string
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
