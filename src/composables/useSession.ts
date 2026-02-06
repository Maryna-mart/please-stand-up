/**
 * Session management composable
 * Handles session creation, joining, and state management with backend API
 * Primary source of truth is now the backend (Netlify Functions + Redis)
 * localStorage is used as a cache for offline access
 */

import { ref, computed, readonly } from 'vue'
import type { Session, SessionState, Participant } from '@/types/session'
import {
  validateUserName,
  validatePasswordStrength,
  sanitizeUserInput,
} from '@/lib/sanitize'
import {
  createSession as apiCreateSession,
  joinSession as apiJoinSession,
  type CreateSessionPayload,
  type JoinSessionPayload,
} from '@/lib/session-api'
const STORAGE_KEY = 'standup_session'
const USER_ID_KEY = 'standup_user_id'
const USER_NAME_KEY = 'standup_user_name'
const EMAIL_VERIFICATION_TOKEN_KEY = 'standup_email_token'

// Reactive session state
const currentSession = ref<Session | null>(null)
const currentUserId = ref<string | null>(null)
const currentUserName = ref<string | null>(null)

/**
 * Create a new standup session via API
 * Email is extracted from the JWT emailToken on the backend
 * @param userName - Name of the user creating the session (leader)
 * @param password - Optional password to protect the session
 * @returns The created session
 * @throws Error if validation or API call fails
 */
export const createSession = async (
  userName: string,
  password?: string
): Promise<Session> => {
  // Validate user name
  if (!validateUserName(userName)) {
    throw new Error(
      'Invalid user name: must be 1-50 characters with no HTML or control characters'
    )
  }

  // Validate password if provided
  if (password && !validatePasswordStrength(password)) {
    throw new Error('Password must be at least 8 characters long')
  }

  // Sanitize user name
  const sanitizedName = sanitizeUserInput(userName)

  // Call API to create session
  const payload: CreateSessionPayload = {
    leaderName: sanitizedName,
    password,
  }

  const apiResponse = await apiCreateSession(payload)

  const now = new Date()
  const expiresAt = new Date(apiResponse.expiresAt)

  // Build session object from API response
  const session: Session = {
    id: apiResponse.sessionId,
    createdAt: now,
    expiresAt,
    status: 'waiting',
    participants: [
      {
        id: apiResponse.userId,
        name: sanitizedName,
        joinedAt: now,
        status: 'waiting',
      },
    ],
    passwordHash: password ? '***' : undefined, // Never store actual hash locally
  }

  // Save to state and localStorage (as cache)
  currentSession.value = session
  currentUserId.value = apiResponse.userId
  currentUserName.value = sanitizedName
  saveToLocalStorage(session)

  // Mark as authenticated so router doesn't ask for password on first redirect
  sessionStorage.setItem('session_authenticated', 'true')

  return session
}

/**
 * Join an existing session via API
 * Email is extracted from the JWT emailToken on the backend
 * @param sessionId - The session ID to join
 * @param userName - Name of the user joining
 * @param password - Password if session is protected
 * @returns The joined session
 * @throws Error if session not found, expired, wrong password, or invalid input
 */
export const joinSession = async (
  sessionId: string,
  userName: string,
  password?: string
): Promise<Session> => {
  // Validate user name
  if (!validateUserName(userName)) {
    throw new Error(
      'Invalid user name: must be 1-50 characters with no HTML or control characters'
    )
  }

  // Sanitize user name
  const sanitizedName = sanitizeUserInput(userName)

  // Call API to join session
  const payload: JoinSessionPayload = {
    sessionId,
    participantName: sanitizedName,
    password,
  }

  const apiResponse = await apiJoinSession(payload)

  const now = new Date()

  // Build session object from API response
  const session: Session = {
    id: apiResponse.sessionId,
    createdAt: new Date(apiResponse.createdAt),
    expiresAt: new Date(apiResponse.createdAt + 4 * 60 * 60 * 1000), // 4 hour expiry from creation
    status: 'waiting',
    participants: apiResponse.participants.map(p => ({
      id: p.id,
      name: p.name,
      joinedAt: now,
      status: 'waiting' as const,
    })),
    passwordHash: password ? '***' : undefined, // Never store actual hash locally
  }

  // Update state
  currentSession.value = session
  currentUserId.value = apiResponse.userId
  currentUserName.value = sanitizedName
  saveToLocalStorage(session)

  // Mark as authenticated so router doesn't ask for password on first redirect
  sessionStorage.setItem('session_authenticated', 'true')

  return session
}

/**
 * Leave the current session
 */
export const leaveSession = (): void => {
  currentSession.value = null
  currentUserId.value = null
  currentUserName.value = null
  localStorage.removeItem(STORAGE_KEY)
  localStorage.removeItem(USER_ID_KEY)
  localStorage.removeItem(USER_NAME_KEY)
  // Clear authentication flag when leaving
  sessionStorage.removeItem('session_authenticated')
}

/**
 * Get the current session state
 */
export const getSessionState = (): Readonly<SessionState> => {
  return {
    currentSession: currentSession.value,
    currentUserId: currentUserId.value,
    currentUserName: currentUserName.value,
  } as unknown as Readonly<SessionState>
}

/**
 * Check if a session has expired
 */
export const isSessionExpired = (session: Session): boolean => {
  return new Date() > new Date(session.expiresAt)
}

/**
 * Update participant status
 */
export const updateParticipantStatus = (
  participantId: string,
  status: Participant['status']
): void => {
  if (!currentSession.value) return

  const participant = currentSession.value.participants.find(
    p => p.id === participantId
  )
  if (participant) {
    participant.status = status
    saveToLocalStorage(currentSession.value)
  }
}

/**
 * Add transcript to participant
 */
export const addTranscript = (
  participantId: string,
  transcript: string,
  language: 'en' | 'de'
): void => {
  if (!currentSession.value) return

  const participant = currentSession.value.participants.find(
    p => p.id === participantId
  )
  if (participant) {
    participant.transcript = transcript
    participant.transcriptLanguage = language
    participant.status = 'done'
    saveToLocalStorage(currentSession.value)
  }
}

/**
 * Add summary to session
 */
export const addSummary = (summary: string): void => {
  if (!currentSession.value) return

  currentSession.value.summary = summary
  currentSession.value.status = 'completed'
  saveToLocalStorage(currentSession.value)
}

/**
 * Store email verification token in localStorage
 * @param token - JWT token from email verification
 */
export const setEmailVerificationToken = (token: string): void => {
  try {
    localStorage.setItem(EMAIL_VERIFICATION_TOKEN_KEY, token)
  } catch (error) {
    console.error('Failed to save email verification token:', error)
  }
}

/**
 * Get email verification token from localStorage
 * @returns Token if found and valid, null otherwise
 */
export const getEmailVerificationToken = (): string | null => {
  try {
    return localStorage.getItem(EMAIL_VERIFICATION_TOKEN_KEY)
  } catch (error) {
    console.error('Failed to get email verification token:', error)
    return null
  }
}

/**
 * Clear email verification token from localStorage
 */
export const clearEmailVerificationToken = (): void => {
  try {
    localStorage.removeItem(EMAIL_VERIFICATION_TOKEN_KEY)
  } catch (error) {
    console.error('Failed to clear email verification token:', error)
  }
}

/**
 * Load session from localStorage cache
 * Used on app startup to restore previous session
 * @returns Cached session or null if not found/invalid
 */
const loadFromLocalStorage = (): Session | null => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (!stored) return null

    const session: Session = JSON.parse(stored)

    // Validate required fields exist
    if (
      !session.id ||
      !session.participants ||
      !Array.isArray(session.participants)
    ) {
      return null
    }

    // Convert date strings back to Date objects
    session.createdAt = new Date(session.createdAt)
    session.expiresAt = new Date(session.expiresAt)
    session.participants.forEach(p => {
      p.joinedAt = new Date(p.joinedAt)
    })

    // Check if session is expired
    if (isSessionExpired(session)) {
      localStorage.removeItem(STORAGE_KEY)
      return null
    }

    return session
  } catch (error) {
    console.error('Failed to load session from localStorage:', error)
    return null
  }
}

/**
 * Initialize session from localStorage on app startup
 * Restores user to previous session without requiring re-login
 */
export const initializeSessionFromCache = (): void => {
  const cachedSession = loadFromLocalStorage()
  if (cachedSession) {
    currentSession.value = cachedSession
    // Restore userId and userName from localStorage
    const storedUserId = localStorage.getItem(USER_ID_KEY)
    const storedUserName = localStorage.getItem(USER_NAME_KEY)
    if (storedUserId) {
      currentUserId.value = storedUserId
    }
    if (storedUserName) {
      currentUserName.value = storedUserName
    }
  }
}

// Computed properties
export const useSession = () => {
  const session = computed(() => currentSession.value)
  const userId = computed(() => currentUserId.value)
  const userName = computed(() => currentUserName.value)
  const participants = computed(() => currentSession.value?.participants || [])

  return {
    // State
    session: readonly(session),
    userId: readonly(userId),
    userName: readonly(userName),
    participants: readonly(participants),

    // Actions
    createSession,
    joinSession,
    leaveSession,
    getSessionState,
    isSessionExpired,
    updateParticipantStatus,
    addTranscript,
    addSummary,
    initializeSessionFromCache,
    setEmailVerificationToken,
    getEmailVerificationToken,
    clearEmailVerificationToken,
  }
}

// LocalStorage helpers (session data is cached locally, but backend is source of truth)
const saveToLocalStorage = (session: Session): void => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(session))
    // Also persist userId and userName for restoration on reload
    if (currentUserId.value) {
      localStorage.setItem(USER_ID_KEY, currentUserId.value)
    }
    if (currentUserName.value) {
      localStorage.setItem(USER_NAME_KEY, currentUserName.value)
    }
  } catch (error) {
    console.error('Failed to save session to localStorage:', error)
  }
}
