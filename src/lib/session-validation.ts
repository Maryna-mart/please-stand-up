/**
 * Session validation utilities with runtime type guards
 * Prevents corrupt/malicious data in localStorage from causing issues
 */

import type { Session, Participant } from '@/types/session'

/**
 * Type guard: Check if object is a valid Participant
 */
export const isValidParticipant = (obj: unknown): obj is Participant => {
  if (!obj || typeof obj !== 'object') {
    return false
  }

  const p = obj as Record<string, unknown>

  // Check required fields exist and have correct types
  return (
    typeof p.id === 'string' &&
    p.id.length > 0 &&
    typeof p.name === 'string' &&
    p.name.length > 0 &&
    p.name.length <= 50 &&
    typeof p.status === 'string' &&
    ['waiting', 'recording', 'done'].includes(p.status as string) &&
    p.joinedAt instanceof Date &&
    // Optional fields
    (p.transcript === undefined || typeof p.transcript === 'string') &&
    (p.transcriptLanguage === undefined ||
      (typeof p.transcriptLanguage === 'string' &&
        ['en', 'de'].includes(p.transcriptLanguage as string)))
  )
}

/**
 * Type guard: Check if object is a valid Session
 */
export const isValidSessionStructure = (obj: unknown): obj is Session => {
  if (!obj || typeof obj !== 'object') {
    return false
  }

  const s = obj as Record<string, unknown>

  // Check required fields
  if (
    typeof s.id !== 'string' ||
    s.id.length < 40 ||
    !(s.createdAt instanceof Date) ||
    !(s.expiresAt instanceof Date) ||
    typeof s.status !== 'string' ||
    !['waiting', 'in-progress', 'completed'].includes(s.status as string) ||
    !Array.isArray(s.participants) ||
    typeof s.leaderId !== 'string' ||
    s.leaderId.length === 0
  ) {
    return false
  }

  // Check all participants are valid
  if (!s.participants.every((p: unknown) => isValidParticipant(p))) {
    return false
  }

  // Check optional fields
  if (s.passwordHash !== undefined && typeof s.passwordHash !== 'string') {
    return false
  }

  if (s.summary !== undefined && typeof s.summary !== 'string') {
    return false
  }

  return true
}

/**
 * Validate session before using it
 * Returns null if invalid, otherwise returns the session
 */
export const validateSession = (session: unknown): Session | null => {
  if (!isValidSessionStructure(session)) {
    console.error('Invalid session structure detected', session)
    return null
  }

  // Additional validation: Check expiration
  const s = session as Session
  if (new Date() > s.expiresAt) {
    console.error('Session has expired', s.id)
    return null
  }

  // Check consistency: leader must be in participants
  const leaderExists = s.participants.some(p => p.id === s.leaderId)
  if (!leaderExists) {
    console.error('Session leader not in participants', s.id)
    return null
  }

  return s
}

/**
 * Get safe session ID from string
 * Returns null if invalid
 */
export const getSafeSessionId = (id: unknown): string | null => {
  if (typeof id !== 'string') {
    return null
  }

  if (id.length < 40) {
    return null
  }

  // Check if only contains valid base64url characters
  const base64UrlRegex = /^[A-Za-z0-9_-]+$/
  if (!base64UrlRegex.test(id)) {
    return null
  }

  return id
}

/**
 * Get safe participant ID from string
 * Returns null if invalid
 */
export const getSafeParticipantId = (id: unknown): string | null => {
  if (typeof id !== 'string') {
    return null
  }

  if (id.length === 0 || id.length > 100) {
    return null
  }

  // Check if only contains safe characters (alphanumeric, dash, underscore)
  const safeIdRegex = /^[A-Za-z0-9_-]+$/
  if (!safeIdRegex.test(id)) {
    return null
  }

  return id
}

/**
 * Validate date field
 * Ensures it's a valid Date object or a valid ISO string that can be converted
 */
export const validateDateField = (date: unknown): Date | null => {
  if (date instanceof Date) {
    if (isNaN(date.getTime())) {
      return null
    }
    return date
  }

  if (typeof date === 'string') {
    const parsed = new Date(date)
    if (isNaN(parsed.getTime())) {
      return null
    }
    return parsed
  }

  return null
}

/**
 * Safely get session data from JSON string
 * Parses, validates, and returns session or null
 */
export const parseSafeSession = (jsonStr: string): Session | null => {
  try {
    const parsed = JSON.parse(jsonStr)

    // Re-convert date strings to Date objects
    if (typeof parsed.createdAt === 'string') {
      parsed.createdAt = new Date(parsed.createdAt)
    }
    if (typeof parsed.expiresAt === 'string') {
      parsed.expiresAt = new Date(parsed.expiresAt)
    }
    parsed.participants.forEach((p: Participant) => {
      if (typeof p.joinedAt === 'string') {
        p.joinedAt = new Date(p.joinedAt)
      }
    })

    return validateSession(parsed)
  } catch (error) {
    console.error('Failed to parse session JSON', error)
    return null
  }
}
