/**
 * Netlify Function: Verify Email
 * POST /.netlify/functions/verify-email
 * Verifies the provided code against the stored verification code
 * Returns a JWT token if verification is successful
 */

import { Handler } from '@netlify/functions'
import { isValidEmail, isNonEmptyString } from './lib/validation'
import {
  getVerificationCodeKey,
  getVerificationCode,
  deleteVerificationCode,
  getVerificationAttempts,
  incrementVerificationAttempts,
} from './lib/redis-client'
import { hashVerificationCode } from './lib/crypto-utils-server'
import { generateEmailVerificationToken } from './lib/jwt-utils'
import type { ErrorResponse } from './lib/api-types'

interface VerifyEmailRequest {
  email: string
  code: string
}

interface VerifyEmailResponse extends ErrorResponse {
  success?: boolean
  token?: string
}

const GENERIC_ERROR_MESSAGE = 'Invalid or expired verification code'
const MAX_VERIFICATION_ATTEMPTS = 5

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
    let body: VerifyEmailRequest
    try {
      if (!event.body) {
        return {
          statusCode: 400,
          body: JSON.stringify({
            error: GENERIC_ERROR_MESSAGE,
          } as VerifyEmailResponse),
        }
      }

      body = JSON.parse(event.body) as VerifyEmailRequest
    } catch {
      return {
        statusCode: 400,
        body: JSON.stringify({
          error: GENERIC_ERROR_MESSAGE,
        } as VerifyEmailResponse),
      }
    }

    // Validate inputs
    if (!isNonEmptyString(body.email) || !isValidEmail(body.email)) {
      return {
        statusCode: 400,
        body: JSON.stringify({
          error: GENERIC_ERROR_MESSAGE,
        } as VerifyEmailResponse),
      }
    }

    if (
      !isNonEmptyString(body.code) ||
      body.code.trim().length !== 6 ||
      !/^\d{6}$/.test(body.code.trim())
    ) {
      return {
        statusCode: 400,
        body: JSON.stringify({
          error: GENERIC_ERROR_MESSAGE,
        } as VerifyEmailResponse),
      }
    }

    const email = body.email.toLowerCase().trim()
    const code = body.code.trim()

    // Check rate limit: max 5 verification attempts per email per 15 minutes
    const attemptKey = `email:verification:attempts:${email}`
    const attempts = await getVerificationAttempts(attemptKey)

    if (attempts >= MAX_VERIFICATION_ATTEMPTS) {
      return {
        statusCode: 429,
        body: JSON.stringify({
          error: 'Too many failed attempts. Please try again later.',
        } as VerifyEmailResponse),
      }
    }

    // Hash the provided code and look it up in Redis
    let codeHash: string
    try {
      codeHash = hashVerificationCode(code)
    } catch {
      // Increment failed attempts
      await incrementVerificationAttempts(attemptKey)
      return {
        statusCode: 400,
        body: JSON.stringify({
          error: GENERIC_ERROR_MESSAGE,
        } as VerifyEmailResponse),
      }
    }

    // Get the stored verification code
    const codeKey = getVerificationCodeKey(codeHash)
    const storedCode = await getVerificationCode(codeKey)

    // Verify code exists, hasn't expired, and email matches
    if (!storedCode) {
      // Increment failed attempts
      await incrementVerificationAttempts(attemptKey)
      return {
        statusCode: 400,
        body: JSON.stringify({
          error: GENERIC_ERROR_MESSAGE,
        } as VerifyEmailResponse),
      }
    }

    // Verify email matches
    if (storedCode.email !== email) {
      // Increment failed attempts
      await incrementVerificationAttempts(attemptKey)
      return {
        statusCode: 400,
        body: JSON.stringify({
          error: GENERIC_ERROR_MESSAGE,
        } as VerifyEmailResponse),
      }
    }

    // Verify code hasn't expired (5 minute TTL is handled by Redis, but double-check)
    const codeAgeSec = (Date.now() - storedCode.createdAt) / 1000
    if (codeAgeSec > 5 * 60) {
      // Delete the expired code
      await deleteVerificationCode(codeKey)
      // Increment failed attempts
      await incrementVerificationAttempts(attemptKey)
      return {
        statusCode: 400,
        body: JSON.stringify({
          error: 'Code expired',
        } as VerifyEmailResponse),
      }
    }

    // Code is valid! Delete it (single-use)
    await deleteVerificationCode(codeKey)

    // Generate JWT token
    const token = generateEmailVerificationToken(email)

    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        token,
      } as VerifyEmailResponse),
    }
  } catch (error) {
    console.error('[verify-email] Error:', error)

    // Generic error response
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: GENERIC_ERROR_MESSAGE,
      } as VerifyEmailResponse),
    }
  }
}

export { handler }
