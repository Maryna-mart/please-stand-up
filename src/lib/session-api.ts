/**
 * Session API Client
 * Handles communication with Netlify Functions for session management
 */

export interface CreateSessionPayload {
  leaderName: string
  password?: string
  email?: string
}

export interface CreateSessionResponse {
  sessionId: string
  userId: string
  expiresAt: number
}

export interface SessionInfo {
  id: string
  leaderName: string
  participants: Array<{
    id: string
    name: string
  }>
  createdAt: number
  passwordRequired: boolean
}

export interface JoinSessionPayload {
  sessionId: string
  participantName: string
  password?: string
  email?: string
}

export interface JoinSessionResponse {
  sessionId: string
  userId: string
  participants: Array<{
    id: string
    name: string
  }>
  createdAt: number
}

export interface ApiError {
  error: string
  code: string
  remaining?: number
  resetAt?: number
}

/**
 * Base API URL - uses relative path in production
 */
const API_BASE = '/.netlify/functions'

/**
 * Retry configuration
 */
const MAX_RETRIES = 3
const RETRY_DELAY_MS = 1000

/**
 * Sleep helper for retry delays
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

/**
 * Parse error response
 */
function parseErrorResponse(data: unknown): ApiError {
  if (
    typeof data === 'object' &&
    data !== null &&
    'error' in data &&
    'code' in data
  ) {
    return data as ApiError
  }

  return {
    error: 'Unknown error occurred',
    code: 'UNKNOWN_ERROR',
  }
}

/**
 * Make a request with retry logic for transient errors
 */
async function fetchWithRetry<T>(
  url: string,
  options: RequestInit,
  isTransient: (status: number) => boolean = status =>
    status >= 500 || status === 429
): Promise<T> {
  let lastError: unknown

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      const response = await fetch(url, options)

      const data = await response.json()

      // Success response
      if (response.ok) {
        return data as T
      }

      // Check if error is transient and retryable
      if (isTransient(response.status) && attempt < MAX_RETRIES - 1) {
        lastError = data
        // Exponential backoff
        await sleep(RETRY_DELAY_MS * Math.pow(2, attempt))
        continue
      }

      // Non-transient error or last attempt
      throw new Error(JSON.stringify(data))
    } catch (error) {
      lastError = error
      if (attempt === MAX_RETRIES - 1) {
        throw lastError
      }
      // Wait before next attempt
      await sleep(RETRY_DELAY_MS * Math.pow(2, attempt))
    }
  }

  throw lastError
}

/**
 * Create a new session
 */
export async function createSession(
  payload: CreateSessionPayload
): Promise<CreateSessionResponse> {
  try {
    const response = await fetchWithRetry<CreateSessionResponse>(
      `${API_BASE}/create-session`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      }
    )

    return response
  } catch (error) {
    let data: ApiError

    if (error instanceof Error) {
      try {
        data = parseErrorResponse(JSON.parse(error.message))
      } catch {
        // error.message is not JSON, treat as unknown error
        data = parseErrorResponse(error)
      }
    } else {
      data = parseErrorResponse(error)
    }

    // User-friendly error messages
    switch (data.code) {
      case 'RATE_LIMITED':
        throw new Error(
          `Too many session creations. Please wait ${Math.ceil((data.resetAt || 0 - Date.now()) / 1000)} seconds.`
        )
      case 'INVALID_LEADER_NAME':
        throw new Error('Leader name must be 1-50 characters')
      case 'WEAK_PASSWORD':
        throw new Error('Password must be at least 8 characters')
      case 'EMPTY_BODY':
        throw new Error('Request body is required')
      case 'INVALID_JSON':
        throw new Error('Invalid request format')
      default:
        throw new Error(data.error || 'Failed to create session')
    }
  }
}

/**
 * Get session information
 */
export async function getSession(sessionId: string): Promise<SessionInfo> {
  try {
    const response = await fetchWithRetry<SessionInfo>(
      `${API_BASE}/get-session/${encodeURIComponent(sessionId)}`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      }
    )

    return response
  } catch (error) {
    let data: ApiError

    if (error instanceof Error) {
      try {
        data = parseErrorResponse(JSON.parse(error.message))
      } catch {
        // error.message is not JSON, treat as unknown error
        data = parseErrorResponse(error)
      }
    } else {
      data = parseErrorResponse(error)
    }

    // User-friendly error messages
    switch (data.code) {
      case 'SESSION_NOT_FOUND':
        throw new Error('Session not found or expired')
      case 'INVALID_SESSION_ID':
        throw new Error('Invalid session ID format')
      case 'MISSING_SESSION_ID':
        throw new Error('Session ID is required')
      default:
        throw new Error(data.error || 'Failed to fetch session')
    }
  }
}

/**
 * Join an existing session
 */
export async function joinSession(
  payload: JoinSessionPayload
): Promise<JoinSessionResponse> {
  try {
    const response = await fetchWithRetry<JoinSessionResponse>(
      `${API_BASE}/join-session`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      }
    )

    return response
  } catch (error) {
    let data: ApiError

    if (error instanceof Error) {
      try {
        data = parseErrorResponse(JSON.parse(error.message))
      } catch {
        // error.message is not JSON, treat as unknown error
        data = parseErrorResponse(error)
      }
    } else {
      data = parseErrorResponse(error)
    }

    // User-friendly error messages
    switch (data.code) {
      case 'SESSION_NOT_FOUND':
        throw new Error('Session not found or expired')
      case 'PASSWORD_REQUIRED':
        throw new Error('This session requires a password')
      case 'INVALID_PASSWORD':
        throw new Error('Incorrect password')
      case 'SESSION_FULL':
        throw new Error('Session is full (maximum 20 participants)')
      case 'DUPLICATE_NAME':
        throw new Error('A participant with this name already exists')
      case 'RATE_LIMITED':
        throw new Error(
          `Too many join attempts. Please wait ${Math.ceil((data.resetAt || 0 - Date.now()) / 1000)} seconds.`
        )
      case 'INVALID_PARTICIPANT_NAME':
        throw new Error('Participant name must be 1-50 characters')
      case 'INVALID_SESSION_ID':
        throw new Error('Invalid session ID format')
      default:
        throw new Error(data.error || 'Failed to join session')
    }
  }
}
