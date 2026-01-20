import { describe, it, expect, beforeEach } from 'vitest'
import {
  createSession,
  joinSession,
  leaveSession,
  getSessionState,
  isSessionExpired,
  updateParticipantStatus,
  addTranscript,
  addSummary,
  useSession,
} from '@/composables/useSession'

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {}
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value
    },
    removeItem: (key: string) => {
      delete store[key]
    },
    clear: () => {
      store = {}
    },
  }
})()

Object.defineProperty(globalThis, 'localStorage', {
  value: localStorageMock,
  writable: true,
})

describe('useSession', () => {
  beforeEach(() => {
    localStorageMock.clear()
    leaveSession() // Clear state between tests
  })

  describe('createSession', () => {
    it('should create a new session', async () => {
      const session = await createSession('Alice')

      expect(session).toBeDefined()
      expect(session.id).toBeDefined()
      expect(session.participants).toHaveLength(1)
      expect(session.participants[0].name).toBe('Alice')
      expect(session.status).toBe('waiting')
    })

    it('should create session with password', async () => {
      const session = await createSession('Bob', 'secret123')

      expect(session.passwordHash).toBeDefined()
      expect(session.passwordHash).not.toBe('secret123') // Should be hashed
    })

    it('should set creator as leader', async () => {
      const session = await createSession('Charlie')

      expect(session.leaderId).toBe(session.participants[0].id)
    })

    it('should set expiration to 4 hours from now', async () => {
      const before = new Date()
      const session = await createSession('Dave')
      const after = new Date()

      const expectedExpiration = 4 * 60 * 60 * 1000 // 4 hours
      const actualDuration =
        session.expiresAt.getTime() - session.createdAt.getTime()

      expect(actualDuration).toBe(expectedExpiration)
      expect(session.createdAt.getTime()).toBeGreaterThanOrEqual(
        before.getTime()
      )
      expect(session.createdAt.getTime()).toBeLessThanOrEqual(after.getTime())
    })

    it('should save session to localStorage', async () => {
      const session = await createSession('Eve')

      const stored = localStorage.getItem('standup_session')
      expect(stored).toBeDefined()
      const parsed = JSON.parse(stored!)
      expect(parsed.id).toBe(session.id)
    })

    it('should update session state', async () => {
      await createSession('Frank')

      const state = getSessionState()
      expect(state.currentSession).not.toBeNull()
      expect(state.currentUserName).toBe('Frank')
      expect(state.isLeader).toBe(true)
    })
  })

  describe('joinSession', () => {
    it('should join an existing session', async () => {
      const created = await createSession('Alice')
      leaveSession() // Simulate different user

      const joined = await joinSession(created.id, 'Bob')

      expect(joined.id).toBe(created.id)
      expect(joined.participants).toHaveLength(2)
      expect(joined.participants[1].name).toBe('Bob')
    })

    it('should join session with correct password', async () => {
      const created = await createSession('Alice', 'secret123')
      leaveSession()

      const joined = await joinSession(created.id, 'Bob', 'secret123')

      expect(joined.id).toBe(created.id)
      expect(joined.participants).toHaveLength(2)
    })

    it('should reject wrong password', async () => {
      const created = await createSession('Alice', 'secret123')
      leaveSession()

      await expect(
        joinSession(created.id, 'Bob', 'wrongpassword')
      ).rejects.toThrow('Incorrect password')
    })

    it('should require password for protected session', async () => {
      const created = await createSession('Alice', 'secret123')
      leaveSession()

      await expect(joinSession(created.id, 'Bob')).rejects.toThrow(
        'Password required'
      )
    })

    it('should throw error if session not found', async () => {
      await expect(joinSession('nonexistent', 'Bob')).rejects.toThrow(
        'Session not found'
      )
    })

    it('should not add duplicate participant', async () => {
      const created = await createSession('Alice')

      const joined = await joinSession(created.id, 'Alice')

      expect(joined.participants).toHaveLength(1)
      expect(joined.participants[0].name).toBe('Alice')
    })

    it('should mark joiner as non-leader', async () => {
      const created = await createSession('Alice')
      leaveSession()

      await joinSession(created.id, 'Bob')
      const state = getSessionState()

      expect(state.isLeader).toBe(false)
    })
  })

  describe('isSessionExpired', () => {
    it('should return false for fresh session', async () => {
      const session = await createSession('Alice')

      expect(isSessionExpired(session)).toBe(false)
    })

    it('should return true for expired session', async () => {
      const session = await createSession('Alice')
      // Manually set expiration to past
      session.expiresAt = new Date(Date.now() - 1000)

      expect(isSessionExpired(session)).toBe(true)
    })

    it('should reject joining expired session', async () => {
      const session = await createSession('Alice')
      session.expiresAt = new Date(Date.now() - 1000)
      localStorage.setItem('standup_session', JSON.stringify(session))
      leaveSession()

      await expect(joinSession(session.id, 'Bob')).rejects.toThrow(
        'Session has expired'
      )
    })
  })

  describe('leaveSession', () => {
    it('should clear session state', async () => {
      await createSession('Alice')

      leaveSession()

      const state = getSessionState()
      expect(state.currentSession).toBeNull()
      expect(state.currentUserId).toBeNull()
      expect(state.currentUserName).toBeNull()
      expect(state.isLeader).toBe(false)
    })
  })

  describe('updateParticipantStatus', () => {
    it('should update participant status', async () => {
      const session = await createSession('Alice')
      const participantId = session.participants[0].id

      updateParticipantStatus(participantId, 'recording')

      const state = getSessionState()
      expect(state.currentSession?.participants[0].status).toBe('recording')
    })

    it('should save to localStorage after update', async () => {
      const session = await createSession('Alice')
      const participantId = session.participants[0].id

      updateParticipantStatus(participantId, 'transcribing')

      const stored = localStorage.getItem('standup_session')
      const parsed = JSON.parse(stored!)
      expect(parsed.participants[0].status).toBe('transcribing')
    })
  })

  describe('addTranscript', () => {
    it('should add transcript to participant', async () => {
      const session = await createSession('Alice')
      const participantId = session.participants[0].id

      addTranscript(participantId, 'Yesterday I worked on...', 'en')

      const state = getSessionState()
      expect(state.currentSession?.participants[0].transcript).toBe(
        'Yesterday I worked on...'
      )
      expect(state.currentSession?.participants[0].transcriptLanguage).toBe(
        'en'
      )
      expect(state.currentSession?.participants[0].status).toBe('done')
    })
  })

  describe('addSummary', () => {
    it('should add summary to session', async () => {
      await createSession('Alice')

      addSummary('Team standup summary...')

      const state = getSessionState()
      expect(state.currentSession?.summary).toBe('Team standup summary...')
      expect(state.currentSession?.status).toBe('completed')
    })
  })

  describe('useSession composable', () => {
    it('should provide reactive session state', async () => {
      const { session, userName, isLeader } = useSession()

      expect(session.value).toBeNull()

      await createSession('Alice')

      expect(session.value).not.toBeNull()
      expect(userName.value).toBe('Alice')
      expect(isLeader.value).toBe(true)
    })

    it('should provide all actions', () => {
      const composable = useSession()

      expect(composable.createSession).toBeDefined()
      expect(composable.joinSession).toBeDefined()
      expect(composable.leaveSession).toBeDefined()
      expect(composable.updateParticipantStatus).toBeDefined()
      expect(composable.addTranscript).toBeDefined()
      expect(composable.addSummary).toBeDefined()
    })
  })
})
