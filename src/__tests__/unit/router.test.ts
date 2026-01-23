import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createRouter, createMemoryHistory, Router } from 'vue-router'
import Home from '@/views/Home.vue'
import Session from '@/views/Session.vue'
import NotFound from '@/views/NotFound.vue'

// Mock session state for testing
let mockSessionState: {
  session: { id: string } | null
  userId: string | null
} = {
  session: null,
  userId: null,
}

// Mock the useSession composable
vi.mock('@/composables/useSession', () => ({
  useSession: () => ({
    get session() {
      return { value: mockSessionState.session }
    },
    get userId() {
      return { value: mockSessionState.userId }
    },
  }),
}))

// Create a test router matching the app's router configuration
function createTestRouter(): Router {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      {
        path: '/',
        name: 'Home',
        component: Home,
        meta: { title: 'Standup Timer - Home' },
      },
      {
        path: '/session/:id',
        name: 'Session',
        component: Session,
        meta: { title: 'Standup Session' },
      },
      {
        path: '/:pathMatch(.*)*',
        name: 'NotFound',
        component: NotFound,
        meta: { title: '404 - Not Found' },
      },
    ],
  })

  // Mock getSession for backend validation
  vi.mock('@/lib/session-api', () => ({
    getSession: vi.fn(async (sessionId: string) => {
      // Simulate valid session check
      // For testing, consider sessions valid unless they're specifically marked as invalid
      if (sessionId === 'invalid-session') {
        throw new Error('Session not found')
      }
      return {
        id: sessionId,
        leaderName: 'Test',
        participants: [],
        createdAt: Date.now(),
        passwordRequired: false,
      }
    }),
  }))

  // Add the session guard
  router.beforeEach(async to => {
    if (to.name === 'Session') {
      const { useSession } = await import('@/composables/useSession')
      const { session, userId } = useSession()

      const sessionId = to.params.id as string

      // First check: does user already have this session?
      if (session.value?.id === sessionId && userId.value) {
        // User has this session cached and in memory, allow direct access
        return true
      }

      // Second check: is the session valid on the backend?
      try {
        const { getSession } = await import('@/lib/session-api')
        await getSession(sessionId)
        // Session exists on backend, user needs to join it
        // Redirect to home with sessionId so JoinSessionCard shows
        return {
          name: 'Home',
          query: { sessionId },
          replace: true,
        }
      } catch {
        // Session doesn't exist or is invalid
        // Redirect to home (user can try creating a new session)
        return {
          name: 'Home',
          replace: true,
        }
      }
    }
  })

  return router
}

describe('Router Navigation Flow', () => {
  let router: Router

  beforeEach(() => {
    router = createTestRouter()
  })

  describe('Home route', () => {
    it('should navigate to home page', async () => {
      await router.push('/')
      expect(router.currentRoute.value.name).toBe('Home')
      expect(router.currentRoute.value.path).toBe('/')
    })

    it('should preserve sessionId query parameter', async () => {
      await router.push({ path: '/', query: { sessionId: 'abc123' } })
      expect(router.currentRoute.value.query.sessionId).toBe('abc123')
    })
  })

  describe('Session route', () => {
    it('should route to session when user is in correct session', async () => {
      const sessionId = 'test-session-id'
      mockSessionState.session = { id: sessionId }
      mockSessionState.userId = 'user-123'

      await router.push(`/session/${sessionId}`)
      expect(router.currentRoute.value.name).toBe('Session')
      expect(router.currentRoute.value.path).toBe(`/session/${sessionId}`)
    })

    it('should extract session ID from route params when user is in session', async () => {
      const sessionId = 'session-12345'
      mockSessionState.session = { id: sessionId }
      mockSessionState.userId = 'user-123'

      await router.push(`/session/${sessionId}`)
      expect(router.currentRoute.value.params.id).toBe(sessionId)
    })

    it('should load Session component for session route when authorized', async () => {
      const sessionId = 'test-id'
      mockSessionState.session = { id: sessionId }
      mockSessionState.userId = 'user-123'

      await router.push(`/session/${sessionId}`)
      expect(router.currentRoute.value.name).toBe('Session')
    })

    it('should set correct page title for session when authorized', async () => {
      const sessionId = 'test-id'
      mockSessionState.session = { id: sessionId }
      mockSessionState.userId = 'user-123'

      await router.push(`/session/${sessionId}`)
      expect(router.currentRoute.value.meta.title).toBe('Standup Session')
    })

    it('should handle special characters in session ID when authorized', async () => {
      const sessionId = 'abc123-def456'
      mockSessionState.session = { id: sessionId }
      mockSessionState.userId = 'user-123'

      await router.push(`/session/${sessionId}`)
      expect(router.currentRoute.value.params.id).toBe(sessionId)
    })
  })

  describe('NotFound route', () => {
    it('should navigate to 404 for invalid routes', async () => {
      await router.push('/invalid/path/that/does/not/exist')
      expect(router.currentRoute.value.name).toBe('NotFound')
    })

    it('should set 404 page title', async () => {
      await router.push('/nonexistent')
      expect(router.currentRoute.value.meta.title).toBe('404 - Not Found')
    })
  })

  describe('Route transitions', () => {
    it('should transition from home to session when user has session', async () => {
      const sessionId = 'session-123'
      mockSessionState.session = { id: sessionId }
      mockSessionState.userId = 'user-456'

      await router.push('/')
      expect(router.currentRoute.value.name).toBe('Home')

      await router.push(`/session/${sessionId}`)
      expect(router.currentRoute.value.name).toBe('Session')
    })

    it('should transition from session back to home', async () => {
      const sessionId = 'session-123'
      mockSessionState.session = { id: sessionId }
      mockSessionState.userId = 'user-456'

      await router.push(`/session/${sessionId}`)
      expect(router.currentRoute.value.name).toBe('Session')

      // Reset session state before going back to home
      mockSessionState.session = null
      mockSessionState.userId = null

      await router.push('/')
      expect(router.currentRoute.value.name).toBe('Home')
    })

    it('should preserve sessionId when user joins session flow', async () => {
      const sessionId = 'abc123'
      await router.push({ path: '/', query: { sessionId } })
      expect(router.currentRoute.value.query.sessionId).toBe(sessionId)

      // After joining, user will have session set
      mockSessionState.session = { id: sessionId }
      mockSessionState.userId = 'user-789'

      await router.push(`/session/${sessionId}`)
      expect(router.currentRoute.value.name).toBe('Session')
      // The query param gets cleared when we successfully navigate to session
    })
  })

  describe('Session Access Validation', () => {
    beforeEach(() => {
      // Reset mock session state before each test
      mockSessionState = {
        session: null,
        userId: null,
      }
    })

    it('should allow direct access when user has session in cache', async () => {
      const sessionId = 'session-cached'
      mockSessionState.session = { id: sessionId }
      mockSessionState.userId = 'user-123'

      await router.push(`/session/${sessionId}`)

      // User has this session, allow direct access
      expect(router.currentRoute.value.name).toBe('Session')
      expect(router.currentRoute.value.params.id).toBe(sessionId)
    })

    it('should show join card when session is valid but not in cache', async () => {
      const sessionId = 'session-valid-not-cached'
      mockSessionState.session = null
      mockSessionState.userId = null

      await router.push(`/session/${sessionId}`)

      // Session is valid on backend but user doesn't have it cached
      // Show JoinSessionCard
      expect(router.currentRoute.value.name).toBe('Home')
      expect(router.currentRoute.value.query.sessionId).toBe(sessionId)
    })

    it('should show join card when user has different session cached', async () => {
      const sessionA = 'session-a'
      const sessionB = 'session-b'
      mockSessionState.session = { id: sessionA }
      mockSessionState.userId = 'user-123'

      await router.push(`/session/${sessionB}`)

      // User has a different session, show join card for session B
      expect(router.currentRoute.value.name).toBe('Home')
      expect(router.currentRoute.value.query.sessionId).toBe(sessionB)
    })

    it('should redirect to home when session is invalid on backend', async () => {
      const invalidSessionId = 'invalid-session'
      mockSessionState.session = null
      mockSessionState.userId = null

      await router.push(`/session/${invalidSessionId}`)

      // Session doesn't exist on backend
      expect(router.currentRoute.value.name).toBe('Home')
      expect(router.currentRoute.value.query.sessionId).toBeUndefined()
    })

    it('should prioritize local cache over backend check', async () => {
      // If user has session cached, go directly to session
      // No need to even check backend
      const sessionId = 'session-from-cache'
      mockSessionState.session = { id: sessionId }
      mockSessionState.userId = 'user-456'

      await router.push(`/session/${sessionId}`)

      expect(router.currentRoute.value.name).toBe('Session')
      expect(router.currentRoute.value.path).toBe(`/session/${sessionId}`)
    })

    it('should redirect if user has session but no userId', async () => {
      const sessionId = 'session-test'
      mockSessionState.session = { id: sessionId }
      mockSessionState.userId = null

      await router.push(`/session/${sessionId}`)

      // Missing userId, show join card
      expect(router.currentRoute.value.name).toBe('Home')
      expect(router.currentRoute.value.query.sessionId).toBe(sessionId)
    })
  })
})
