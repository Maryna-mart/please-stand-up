/**
 * Session and Participant type definitions for the standup assistant
 */

export type SessionStatus = 'waiting' | 'in-progress' | 'completed' | 'expired'

export type ParticipantStatus =
  | 'waiting'
  | 'recording'
  | 'transcribing'
  | 'done'

export interface Participant {
  id: string
  name: string
  joinedAt: Date
  status: ParticipantStatus
  audioBlob?: Blob
  transcript?: string
  transcriptLanguage?: 'en' | 'de'
}

export interface Session {
  id: string
  createdAt: Date
  expiresAt: Date
  status: SessionStatus
  passwordHash?: string
  participants: Participant[]
  summary?: string
}

export interface SessionState {
  currentSession: Session | null
  currentUserId: string | null
  currentUserName: string | null
}

// Type guards
export const isSessionExpired = (session: Session): boolean => {
  return new Date() > session.expiresAt
}

export const isParticipant = (session: Session, userId: string): boolean => {
  return session.participants.some(p => p.id === userId)
}

export const getParticipant = (
  session: Session,
  userId: string
): Participant | undefined => {
  return session.participants.find(p => p.id === userId)
}
