/**
 * Session management composable
 * Handles session creation, joining, and state management with localStorage persistence
 * Includes input validation and secure password handling
 */

import { ref, computed, readonly } from 'vue'
import type { Session, SessionState, Participant } from '@/types/session'
import { generateSessionId, generateUserId } from '@/lib/crypto-utils'
import { hashPassword, verifyPassword } from '@/lib/password-utils'
import {
  validateUserName,
  validatePasswordStrength,
  sanitizeUserInput,
} from '@/lib/sanitize'

// Session expiration time (4 hours in milliseconds)
const SESSION_EXPIRATION_MS = 4 * 60 * 60 * 1000
const STORAGE_KEY = 'standup_session'

// Reactive session state
const currentSession = ref<Session | null>(null)
const currentUserId = ref<string | null>(null)
const currentUserName = ref<string | null>(null)

/**
 * Create a new standup session
 * @param userName - Name of the user creating the session
 * @param password - Optional password to protect the session
 * @returns The created session
 * @throws Error if input validation fails
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

  const sessionId = generateSessionId()
  const userId = generateUserId()
  const now = new Date()
  const expiresAt = new Date(now.getTime() + SESSION_EXPIRATION_MS)

  const session: Session = {
    id: sessionId,
    createdAt: now,
    expiresAt,
    status: 'waiting',
    participants: [
      {
        id: userId,
        name: sanitizedName,
        joinedAt: now,
        status: 'waiting',
      },
    ],
    leaderId: userId,
    passwordHash: password ? await hashPassword(password) : undefined,
  }

  // Save to state and localStorage
  currentSession.value = session
  currentUserId.value = userId
  currentUserName.value = sanitizedName
  saveToLocalStorage(session)

  return session
}

/**
 * Join an existing session
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

  const session = loadFromLocalStorage(sessionId)

  if (!session) {
    throw new Error('Session not found')
  }

  if (isSessionExpired(session)) {
    throw new Error('Session has expired')
  }

  // Verify password if session is protected
  if (session.passwordHash) {
    if (!password) {
      throw new Error('Password required for this session')
    }
    const isValid = await verifyPassword(password, session.passwordHash)
    if (!isValid) {
      throw new Error('Incorrect password')
    }
  }

  // Sanitize user name
  const sanitizedName = sanitizeUserInput(userName)

  // Add participant if not already in session
  const userId = generateUserId()
  const existingParticipant = session.participants.find(
    p => p.name === sanitizedName
  )

  if (!existingParticipant) {
    const newParticipant: Participant = {
      id: userId,
      name: sanitizedName,
      joinedAt: new Date(),
      status: 'waiting',
    }
    session.participants.push(newParticipant)
  }

  // Update state
  currentSession.value = session
  currentUserId.value = existingParticipant?.id || userId
  currentUserName.value = sanitizedName
  saveToLocalStorage(session)

  return session
}

/**
 * Leave the current session
 */
export const leaveSession = (): void => {
  currentSession.value = null
  currentUserId.value = null
  currentUserName.value = null
}

/**
 * Get the current session state
 */
export const getSessionState = (): Readonly<SessionState> => {
  return {
    currentSession: currentSession.value,
    currentUserId: currentUserId.value,
    currentUserName: currentUserName.value,
    isLeader: currentSession.value?.leaderId === currentUserId.value || false,
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

// Computed properties
export const useSession = () => {
  const session = computed(() => currentSession.value)
  const userId = computed(() => currentUserId.value)
  const userName = computed(() => currentUserName.value)
  const isLeader = computed(
    () => currentSession.value?.leaderId === currentUserId.value
  )
  const participants = computed(() => currentSession.value?.participants || [])

  return {
    // State
    session: readonly(session),
    userId: readonly(userId),
    userName: readonly(userName),
    isLeader: readonly(isLeader),
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
  }
}

// LocalStorage helpers
const saveToLocalStorage = (session: Session): void => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(session))
  } catch (error) {
    console.error('Failed to save session to localStorage:', error)
  }
}

const loadFromLocalStorage = (sessionId: string): Session | null => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (!stored) return null

    const session: Session = JSON.parse(stored)

    // Check if it's the requested session
    if (session.id !== sessionId) return null

    // Convert date strings back to Date objects
    session.createdAt = new Date(session.createdAt)
    session.expiresAt = new Date(session.expiresAt)
    session.participants.forEach(p => {
      p.joinedAt = new Date(p.joinedAt)
    })

    return session
  } catch (error) {
    console.error('Failed to load session from localStorage:', error)
    return null
  }
}
