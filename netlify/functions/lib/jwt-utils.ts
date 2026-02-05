/**
 * JWT Utilities for Email Verification
 * Uses HS256 (HMAC-SHA256) with SESSION_SECRET for token signing
 */

import { createHmac, timingSafeEqual } from 'node:crypto'

const SESSION_SECRET = process.env.SESSION_SECRET
const ALGORITHM = 'HS256'
const TOKEN_EXPIRY_DAYS = 30

if (!SESSION_SECRET) {
  console.warn('[JWT] SESSION_SECRET not configured')
}

interface EmailTokenPayload {
  email: string
  issuedAt: number
  expiresAt: number
}

/**
 * Encode data as URL-safe base64
 */
function base64UrlEncode(data: Buffer): string {
  return data
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '')
}

/**
 * Decode URL-safe base64
 */
function base64UrlDecode(str: string): Buffer {
  let padded = str.replace(/-/g, '+').replace(/_/g, '/')
  const paddingNeeded = 4 - (padded.length % 4)
  if (paddingNeeded && paddingNeeded !== 4) {
    padded += '='.repeat(paddingNeeded)
  }
  return Buffer.from(padded, 'base64')
}

/**
 * Create HMAC signature
 */
function createSignature(data: string, secret: string): string {
  const hmac = createHmac('sha256', secret)
  hmac.update(data)
  return base64UrlEncode(hmac.digest())
}

/**
 * Generate an email verification token
 * Returns a JWT token that can be stored in localStorage
 */
export function generateEmailVerificationToken(email: string): string {
  if (!SESSION_SECRET) {
    throw new Error('SESSION_SECRET not configured')
  }

  const now = Date.now()
  const expiresAt = now + TOKEN_EXPIRY_DAYS * 24 * 60 * 60 * 1000

  const payload: EmailTokenPayload = {
    email,
    issuedAt: now,
    expiresAt,
  }

  // Create JWT parts
  const headerObj = { alg: ALGORITHM, typ: 'JWT' }
  const headerStr = base64UrlEncode(Buffer.from(JSON.stringify(headerObj)))
  const payloadStr = base64UrlEncode(Buffer.from(JSON.stringify(payload)))

  // Create signature
  const signatureInput = `${headerStr}.${payloadStr}`
  const signature = createSignature(signatureInput, SESSION_SECRET)

  // Return complete JWT
  return `${signatureInput}.${signature}`
}

/**
 * Decode and verify an email verification token
 * Returns the email if token is valid, null if invalid or expired
 */
export function verifyEmailToken(token: string): string | null {
  if (!SESSION_SECRET) {
    console.error('[JWT] SESSION_SECRET not configured')
    return null
  }

  try {
    // Split JWT into parts
    const parts = token.split('.')
    if (parts.length !== 3) {
      return null
    }

    const [headerStr, payloadStr, providedSignature] = parts

    // Verify signature
    const signatureInput = `${headerStr}.${payloadStr}`
    const expectedSignature = createSignature(signatureInput, SESSION_SECRET)

    // Use timing-safe comparison to prevent timing attacks
    const providedSigBuf = Buffer.from(providedSignature)
    const expectedSigBuf = Buffer.from(expectedSignature)

    if (providedSigBuf.length !== expectedSigBuf.length) {
      return null
    }

    try {
      timingSafeEqual(providedSigBuf, expectedSigBuf)
    } catch {
      return null
    }

    // Decode and verify payload
    const payloadBuf = base64UrlDecode(payloadStr)
    const payload = JSON.parse(payloadBuf.toString()) as EmailTokenPayload

    // Verify payload structure
    if (!payload.email || !payload.issuedAt || !payload.expiresAt) {
      return null
    }

    // Verify token hasn't expired
    if (Date.now() > payload.expiresAt) {
      return null
    }

    return payload.email
  } catch (error) {
    console.error('[JWT] Token verification error:', error)
    return null
  }
}

/**
 * Extract email from token without verification (for display purposes only)
 * Should only be used after verifyEmailToken has confirmed validity
 */
export function extractEmailFromToken(token: string): string | null {
  try {
    const parts = token.split('.')
    if (parts.length !== 3) {
      return null
    }

    const payloadStr = parts[1]
    const payloadBuf = base64UrlDecode(payloadStr)
    const payload = JSON.parse(payloadBuf.toString()) as EmailTokenPayload

    return payload.email || null
  } catch {
    return null
  }
}
