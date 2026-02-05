/**
 * Netlify Function: Send Email Verification Code
 * POST /.netlify/functions/send-verification-code
 * Sends a 6-digit verification code to the provided email address
 */

import { Handler } from '@netlify/functions'
import { randomBytes } from 'node:crypto'
import { isValidEmail, isNonEmptyString } from './lib/validation'
import { sendVerificationCodeEmail } from './lib/sendgrid-client'
import {
  getVerificationCodeKey,
  setVerificationCode,
  getVerificationAttempts,
  incrementVerificationAttempts,
} from './lib/redis-client'
import { hashVerificationCode } from './lib/crypto-utils-server'
import type { ErrorResponse } from './lib/api-types'

interface SendVerificationCodeRequest {
  email: string
}

interface SendVerificationCodeResponse extends ErrorResponse {
  success?: boolean
  message: string
}

// Rate limiting for email verification requests
const EMAIL_VERIFICATION_RATE_LIMITS = {
  maxCodesPerHourPerEmail: 10,
  codeTtlSeconds: 5 * 60, // 5 minutes
}

const GENERIC_SUCCESS_MESSAGE = 'Check your email for the verification code'

/**
 * Generate a 6-digit verification code
 */
function generateVerificationCode(): string {
  // Generate 3 random bytes and convert to number between 0-999999
  const randomNum = randomBytes(3).readUintBE(0, 3) % 1000000
  // Pad with zeros to ensure 6 digits
  return String(randomNum).padStart(6, '0')
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
    let body: SendVerificationCodeRequest
    try {
      if (!event.body) {
        return {
          statusCode: 200,
          body: JSON.stringify({
            success: true,
            message: GENERIC_SUCCESS_MESSAGE,
          } as SendVerificationCodeResponse),
        }
      }

      body = JSON.parse(event.body) as SendVerificationCodeRequest
    } catch {
      return {
        statusCode: 200,
        body: JSON.stringify({
          success: true,
          message: GENERIC_SUCCESS_MESSAGE,
        } as SendVerificationCodeResponse),
      }
    }

    // Validate email
    if (!isNonEmptyString(body.email) || !isValidEmail(body.email)) {
      // Return generic message to prevent email enumeration
      return {
        statusCode: 200,
        body: JSON.stringify({
          success: true,
          message: GENERIC_SUCCESS_MESSAGE,
        } as SendVerificationCodeResponse),
      }
    }

    const email = body.email.toLowerCase().trim()

    // Check rate limit: max 10 codes per hour per email
    const emailKey = `email:verification:count:${email}`
    const attempts = await getVerificationAttempts(emailKey)

    if (attempts >= EMAIL_VERIFICATION_RATE_LIMITS.maxCodesPerHourPerEmail) {
      // Return 429 to indicate rate limiting
      return {
        statusCode: 429,
        body: JSON.stringify({
          message:
            'Too many verification code requests. Please try again later.',
        } as SendVerificationCodeResponse),
      }
    }

    // Generate verification code
    const code = generateVerificationCode()

    // Hash the code before storing (never store plaintext)
    const hashedCode = hashVerificationCode(code)

    // Store in Redis with TTL
    const codeKey = getVerificationCodeKey(hashedCode)
    await setVerificationCode(codeKey, {
      email,
      createdAt: Date.now(),
      attempts: 0,
    })

    // Increment the code request counter for this email
    await incrementVerificationAttempts(emailKey)

    // Send email with the code
    try {
      await sendVerificationCodeEmail(email, code)
    } catch (emailError) {
      console.error('[send-verification-code] Email send error:', emailError)
      // Still return success to prevent email enumeration
      // The user will eventually realize they didn't get the email
    }

    // Always return generic success message (prevent email enumeration)
    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        message: GENERIC_SUCCESS_MESSAGE,
      } as SendVerificationCodeResponse),
    }
  } catch (error) {
    console.error('[send-verification-code] Error:', error)

    // Generic error response
    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        message: GENERIC_SUCCESS_MESSAGE,
      } as SendVerificationCodeResponse),
    }
  }
}

export { handler }
