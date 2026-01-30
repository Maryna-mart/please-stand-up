import { createRouter, createWebHistory, RouteRecordRaw } from 'vue-router'
import Home from '../views/Home.vue'
import Session from '../views/Session.vue'
import NotFound from '../views/NotFound.vue'

const routes: RouteRecordRaw[] = [
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
]

export const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
})

// Update document title on route change
router.beforeEach(to => {
  const title = to.meta.title as string
  if (title) {
    document.title = title
  }
})

// Guard for session routes: validate session exists and determine access level
router.beforeEach(async to => {
  if (to.name === 'Session') {
    const sessionId = to.params.id as string

    const { useSession } = await import('../composables/useSession')
    const { session, userId, leaveSession } = useSession()
    const { getSession } = await import('../lib/session-api')

    // Always check if session is valid on backend first
    try {
      const backendSession = await getSession(sessionId)
      // Session is valid on backend

      // Check if user has this session cached
      if (session.value?.id === sessionId && userId.value) {
        // Verify userId is a valid participant in the backend session
        const isValidParticipant = backendSession.participants.some(
          p => p.id === userId.value
        )

        if (!isValidParticipant) {
          // userId is not valid - clear cache and redirect to join
          leaveSession()
          return {
            name: 'Home',
            query: { sessionId },
            replace: true,
          }
        }

        // userId is valid, now check if session is password-protected
        if (backendSession.passwordRequired) {
          // Check if user just authenticated (created or joined session)
          const isAuthenticated =
            sessionStorage.getItem('session_authenticated') === 'true'

          if (!isAuthenticated) {
            // Not recently authenticated - ask for password (page reload or rejoin)
            // Keep cache (don't call leaveSession) so we can verify they're rejoining
            return {
              name: 'Home',
              query: { sessionId, requirePassword: 'true' },
              replace: true,
            }
          }
          // User just created/joined - allow access without re-entering password
        }

        // User is confirmed participant - allow access
        return true
      }

      // Session is valid on backend but user doesn't have it cached
      // Redirect to home with sessionId so JoinSessionCard shows
      return {
        name: 'Home',
        query: { sessionId },
        replace: true,
      }
    } catch {
      // Session doesn't exist or is expired on backend
      // Redirect to home (user can try creating a new session)
      return {
        name: 'Home',
        replace: true,
      }
    }
  }
})
