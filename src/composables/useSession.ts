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

// Reactive session state
const currentSession = ref<Session | null>(null)
const currentUserId = ref<string | null>(null)
const currentUserName = ref<string | null>(null)

/**
 * Create a new standup session via API
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
    leaderId: apiResponse.userId,
    passwordHash: password ? '***' : undefined, // Never store actual hash locally
  }

  // Save to state and localStorage (as cache)
  currentSession.value = session
  currentUserId.value = apiResponse.userId
  currentUserName.value = sanitizedName
  saveToLocalStorage(session)

  return session
}

/**
 * Join an existing session via API
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
    leaderId: apiResponse.participants[0]?.id || apiResponse.userId, // First participant is leader
    passwordHash: password ? '***' : undefined, // Never store actual hash locally
  }

  // Update state
  currentSession.value = session
  currentUserId.value = apiResponse.userId
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

// LocalStorage helpers (session data is cached locally, but backend is source of truth)
const saveToLocalStorage = (session: Session): void => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(session))
  } catch (error) {
    console.error('Failed to save session to localStorage:', error)
  }
}
