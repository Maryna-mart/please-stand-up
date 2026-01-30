/**
 * Tests for Session.vue view
 * Tests participant initialization, display, and real-time updates
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { ref, computed } from 'vue'
import Session from '@/views/Session.vue'
import type { Session as SessionType } from '@/types/session'

// Mock useSession composable
const mockSession = ref<SessionType | null>(null)
const mockUserId = ref<string | null>(null)
const mockUserName = ref<string | null>(null)

vi.mock('@/composables/useSession', () => ({
  useSession: () => ({
    session: computed(() => mockSession.value),
    userId: computed(() => mockUserId.value),
    userName: computed(() => mockUserName.value),
    participants: computed(() => mockSession.value?.participants || []),
    leaveSession: vi.fn(),
    createSession: vi.fn(),
    joinSession: vi.fn(),
    getSessionState: vi.fn(() => ({
      currentSession: mockSession.value,
      currentUserId: mockUserId.value,
      currentUserName: mockUserName.value,
    })),
    isSessionExpired: vi.fn(),
    updateParticipantStatus: vi.fn(),
    addTranscript: vi.fn(),
    addSummary: vi.fn(),
    initializeSessionFromCache: vi.fn(),
  }),
}))

// Mock usePusher composable
let mockSubscribeFn = vi.fn()
let mockUnsubscribeFn = vi.fn()

vi.mock('@/composables/usePusher', () => ({
  usePusher: () => ({
    subscribeToSession: mockSubscribeFn,
    unsubscribeFromSession: mockUnsubscribeFn,
  }),
}))

// Mock router
const mockPush = vi.fn()
vi.mock('vue-router', async () => {
  const actual = await vi.importActual('vue-router')
  return {
    ...actual,
    useRouter: () => ({
      push: mockPush,
    }),
    useRoute: () => ({
      params: {
        id: 'test-session-abc123',
      },
    }),
  }
})

describe('Session.vue', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    // Reset session state
    mockSession.value = null
    mockUserId.value = null
    mockUserName.value = null

    mockSubscribeFn = vi.fn()
    mockUnsubscribeFn = vi.fn()
  })

  describe('Participants Initialization', () => {
    it('should initialize participants from session data on mount', () => {
      const now = new Date()
      mockSession.value = {
        id: 'test-session-abc123',
        createdAt: now,
        expiresAt: new Date(now.getTime() + 4 * 60 * 60 * 1000),
        status: 'waiting',
        participants: [
          {
            id: 'user-1',
            name: 'Alice',
            joinedAt: now,
            status: 'waiting',
          },
          {
            id: 'user-2',
            name: 'Bob',
            joinedAt: now,
            status: 'waiting',
          },
        ],
      }
      mockUserId.value = 'user-1'

      const wrapper = mount(Session)

      // Check that participants were initialized
      expect(wrapper.vm.participants).toHaveLength(2)
      expect(wrapper.vm.participants[0].name).toBe('Alice')
      expect(wrapper.vm.participants[1].name).toBe('Bob')
    })

    it('should handle empty participants list', () => {
      const now = new Date()
      mockSession.value = {
        id: 'test-session-abc123',
        createdAt: now,
        expiresAt: new Date(now.getTime() + 4 * 60 * 60 * 1000),
        status: 'waiting',
        participants: [],
      }

      const wrapper = mount(Session)

      expect(wrapper.vm.participants).toHaveLength(0)
    })

    it('should map participant status correctly', () => {
      const now = new Date()
      mockSession.value = {
        id: 'test-session-abc123',
        createdAt: now,
        expiresAt: new Date(now.getTime() + 4 * 60 * 60 * 1000),
        status: 'waiting',
        participants: [
          {
            id: 'user-1',
            name: 'Alice',
            joinedAt: now,
            status: 'done',
          },
        ],
      }

      const wrapper = mount(Session)

      expect(wrapper.vm.participants[0].status).toBe('done')
      expect(wrapper.vm.participants[0].transcriptReady).toBe(true)
    })
  })

  describe('Pusher Integration', () => {
    it('should subscribe to Pusher on mount', () => {
      const now = new Date()
      mockSession.value = {
        id: 'test-session-abc123',
        createdAt: now,
        expiresAt: new Date(now.getTime() + 4 * 60 * 60 * 1000),
        status: 'waiting',
        participants: [],
      }

      mount(Session)

      expect(mockSubscribeFn).toHaveBeenCalledWith(
        'test-session-abc123',
        expect.objectContaining({
          onUserJoined: expect.any(Function),
          onUserLeft: expect.any(Function),
          onTimerStarted: expect.any(Function),
          onTimerStopped: expect.any(Function),
          onStatusChanged: expect.any(Function),
        })
      )
    })

    it('should handle user joined event', () => {
      const now = new Date()
      mockSession.value = {
        id: 'test-session-abc123',
        createdAt: now,
        expiresAt: new Date(now.getTime() + 4 * 60 * 60 * 1000),
        status: 'waiting',
        participants: [
          {
            id: 'user-1',
            name: 'Alice',
            joinedAt: now,
            status: 'waiting',
          },
        ],
      }

      const wrapper = mount(Session)

      // Get the onUserJoined callback from Pusher
      const calls = mockSubscribeFn.mock.calls
      const callbacks = calls[0][1]
      const onUserJoined = callbacks.onUserJoined

      // Call the callback to simulate user joining
      onUserJoined({ userId: 'user-2', userName: 'Bob' })

      expect(wrapper.vm.participants).toHaveLength(2)
      expect(wrapper.vm.participants[1].name).toBe('Bob')
    })

    it('should handle user left event', () => {
      const now = new Date()
      mockSession.value = {
        id: 'test-session-abc123',
        createdAt: now,
        expiresAt: new Date(now.getTime() + 4 * 60 * 60 * 1000),
        status: 'waiting',
        participants: [
          {
            id: 'user-1',
            name: 'Alice',
            joinedAt: now,
            status: 'waiting',
          },
          {
            id: 'user-2',
            name: 'Bob',
            joinedAt: now,
            status: 'waiting',
          },
        ],
      }

      const wrapper = mount(Session)
      expect(wrapper.vm.participants).toHaveLength(2)

      // Get the onUserLeft callback
      const calls = mockSubscribeFn.mock.calls
      const callbacks = calls[0][1]
      const onUserLeft = callbacks.onUserLeft

      // Simulate user leaving
      onUserLeft({ userId: 'user-2' })

      expect(wrapper.vm.participants).toHaveLength(1)
      expect(wrapper.vm.participants[0].name).toBe('Alice')
    })

    it('should handle status changed event', () => {
      const now = new Date()
      mockSession.value = {
        id: 'test-session-abc123',
        createdAt: now,
        expiresAt: new Date(now.getTime() + 4 * 60 * 60 * 1000),
        status: 'waiting',
        participants: [
          {
            id: 'user-1',
            name: 'Alice',
            joinedAt: now,
            status: 'waiting',
          },
        ],
      }

      const wrapper = mount(Session)
      expect(wrapper.vm.participants[0].status).toBe('waiting')

      // Get the onStatusChanged callback
      const calls = mockSubscribeFn.mock.calls
      const callbacks = calls[0][1]
      const onStatusChanged = callbacks.onStatusChanged

      // Simulate status change to recording
      onStatusChanged({ userId: 'user-1', status: 'recording' })

      expect(wrapper.vm.participants[0].status).toBe('recording')
    })
  })

  describe('Generate Summary Button', () => {
    it('should have generate summary button available to all', () => {
      const now = new Date()
      mockSession.value = {
        id: 'test-session-abc123',
        createdAt: now,
        expiresAt: new Date(now.getTime() + 4 * 60 * 60 * 1000),
        status: 'waiting',
        participants: [],
      }

      const wrapper = mount(Session)

      // Find buttons in the session controls
      const buttons = wrapper.findAll('button')
      const generateButton = buttons.find(
        btn => btn.text().includes('Generate Summary')
      )
      expect(generateButton).toBeDefined()

      // Button should be disabled when no transcripts
      expect(generateButton?.attributes('disabled')).toBeDefined()
    })

    it('should enable generate summary when transcripts available', async () => {
      const now = new Date()
      mockSession.value = {
        id: 'test-session-abc123',
        createdAt: now,
        expiresAt: new Date(now.getTime() + 4 * 60 * 60 * 1000),
        status: 'waiting',
        participants: [],
      }

      const wrapper = mount(Session)

      // Add a transcript
      wrapper.vm.transcripts.push({
        text: 'Test transcript',
      })

      await wrapper.vm.$nextTick()

      // Button should no longer be disabled
      expect(wrapper.vm.canGenerateSummary).toBe(true)
    })
  })

  describe('Leave Session', () => {
    it('should unsubscribe from Pusher on unmount', () => {
      const now = new Date()
      mockSession.value = {
        id: 'test-session-abc123',
        createdAt: now,
        expiresAt: new Date(now.getTime() + 4 * 60 * 60 * 1000),
        status: 'waiting',
        participants: [],
      }

      const wrapper = mount(Session)
      expect(mockUnsubscribeFn).not.toHaveBeenCalled()

      wrapper.unmount()

      expect(mockUnsubscribeFn).toHaveBeenCalled()
    })
  })

  describe('Session Info', () => {
    it('should display session ID in computed property', () => {
      const now = new Date()
      mockSession.value = {
        id: 'test-session-abc123',
        createdAt: now,
        expiresAt: new Date(now.getTime() + 4 * 60 * 60 * 1000),
        status: 'waiting',
        participants: [],
      }

      const wrapper = mount(Session)

      expect(wrapper.vm.sessionId).toBe('test-session-abc123')
    })

    it('should initialize empty transcripts and summary', () => {
      const now = new Date()
      mockSession.value = {
        id: 'test-session-abc123',
        createdAt: now,
        expiresAt: new Date(now.getTime() + 4 * 60 * 60 * 1000),
        status: 'waiting',
        participants: [],
      }

      const wrapper = mount(Session)

      expect(wrapper.vm.transcripts).toEqual([])
      expect(wrapper.vm.summary).toBe('')
      expect(wrapper.vm.showSummary).toBe(false)
    })
  })
})
