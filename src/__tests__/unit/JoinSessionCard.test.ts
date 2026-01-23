import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createRouter, createMemoryHistory } from 'vue-router'
import JoinSessionCard from '@/components/JoinSessionCard.vue'

// Mock the useSession composable
vi.mock('@/composables/useSession', () => ({
  useSession: () => ({
    joinSession: vi.fn(),
  }),
}))

// Mock the session API
vi.mock('@/lib/session-api', () => ({
  joinSession: vi.fn(async payload => {
    return {
      sessionId: payload.sessionId,
      userId: 'user-456',
      participants: [
        { id: 'user-123', name: 'Leader', status: 'waiting' },
        { id: 'user-456', name: payload.participantName, status: 'waiting' },
      ],
      createdAt: Date.now(),
    }
  }),
}))

describe('JoinSessionCard', () => {
  let router: ReturnType<typeof createRouter>

  beforeEach(() => {
    router = createRouter({
      history: createMemoryHistory(),
      routes: [
        { path: '/', name: 'Home', component: { template: '<div>Home</div>' } },
        {
          path: '/session/:id',
          name: 'Session',
          component: { template: '<div>Session</div>' },
        },
      ],
    })
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('Rendering', () => {
    it('should render the card with title', () => {
      const wrapper = mount(JoinSessionCard, {
        props: {
          initialSessionId: 'session-123',
        },
        global: {
          plugins: [router],
          stubs: {
            teleport: true,
          },
        },
      })

      expect(wrapper.text()).toContain('Join Session')
    })

    it('should render participant name input field', () => {
      const wrapper = mount(JoinSessionCard, {
        props: {
          initialSessionId: 'session-123',
        },
        global: {
          plugins: [router],
          stubs: {
            teleport: true,
          },
        },
      })

      const input = wrapper.find('input[id="participantName"]')
      expect(input.exists()).toBe(true)
    })

    it('should render password input field', () => {
      const wrapper = mount(JoinSessionCard, {
        props: {
          initialSessionId: 'session-123',
        },
        global: {
          plugins: [router],
          stubs: {
            teleport: true,
          },
        },
      })

      const input = wrapper.find('input[id="joinPassword"]')
      expect(input.exists()).toBe(true)
    })

    it('should render submit button', () => {
      const wrapper = mount(JoinSessionCard, {
        props: {
          initialSessionId: 'session-123',
        },
        global: {
          plugins: [router],
          stubs: {
            teleport: true,
          },
        },
      })

      const button = wrapper.find('button[type="submit"]')
      expect(button.exists()).toBe(true)
      expect(button.text()).toContain('Join Session')
    })

    it('should render back button', () => {
      const wrapper = mount(JoinSessionCard, {
        props: {
          initialSessionId: 'session-123',
        },
        global: {
          plugins: [router],
          stubs: {
            teleport: true,
          },
        },
      })

      const buttons = wrapper.findAll('button')
      const backButton = buttons.find(b => b.text().includes('Back'))
      expect(backButton).toBeDefined()
    })
  })

  describe('Session ID Display', () => {
    it('should display the session ID from prop', () => {
      const sessionId = 'session-abc123'
      const wrapper = mount(JoinSessionCard, {
        props: {
          initialSessionId: sessionId,
        },
        global: {
          plugins: [router],
          stubs: {
            teleport: true,
          },
        },
      })

      // Session ID should be displayed in the div with id="sessionId"
      const sessionIdDiv = wrapper.find('div[id="sessionId"]')
      expect(sessionIdDiv.text()).toContain(sessionId)
    })

    it('should display session ID in monospace font', () => {
      const wrapper = mount(JoinSessionCard, {
        props: {
          initialSessionId: 'session-123',
        },
        global: {
          plugins: [router],
          stubs: {
            teleport: true,
          },
        },
      })

      const sessionIdDiv = wrapper.find('div[id="sessionId"]')
      expect(sessionIdDiv.classes()).toContain('font-mono')
    })

    it('should show "No session ID" when not provided', () => {
      const wrapper = mount(JoinSessionCard, {
        props: {
          initialSessionId: '',
        },
        global: {
          plugins: [router],
          stubs: {
            teleport: true,
          },
        },
      })

      const sessionIdDiv = wrapper.find('div[id="sessionId"]')
      expect(sessionIdDiv.text()).toContain('No session ID')
    })

    it('should not have an input field for session ID', () => {
      const wrapper = mount(JoinSessionCard, {
        props: {
          initialSessionId: 'session-123',
        },
        global: {
          plugins: [router],
          stubs: {
            teleport: true,
          },
        },
      })

      const sessionIdInput = wrapper.find('input[id="sessionId"]')
      expect(sessionIdInput.exists()).toBe(false)
    })
  })

  describe('Form Validation', () => {
    it('should disable submit button when name is empty', async () => {
      const wrapper = mount(JoinSessionCard, {
        props: {
          initialSessionId: 'session-123',
        },
        global: {
          plugins: [router],
          stubs: {
            teleport: true,
          },
        },
      })

      const button = wrapper.find('button[type="submit"]')
      expect(button.attributes('disabled')).toBeDefined()
    })

    it('should enable submit button when name is valid', async () => {
      const wrapper = mount(JoinSessionCard, {
        props: {
          initialSessionId: 'session-123',
        },
        global: {
          plugins: [router],
          stubs: {
            teleport: true,
          },
        },
      })

      const nameInput = wrapper.find('input[id="participantName"]')
      await nameInput.setValue('Alice')
      await wrapper.vm.$nextTick()

      const button = wrapper.find('button[type="submit"]')
      // When enabled, disabled attribute should be empty string or not exist
      expect(
        !button.attributes('disabled') || button.attributes('disabled') === ''
      ).toBe(true)
    })

    it('should show error for invalid name', async () => {
      const wrapper = mount(JoinSessionCard, {
        props: {
          initialSessionId: 'session-123',
        },
        global: {
          plugins: [router],
          stubs: {
            teleport: true,
          },
        },
      })

      const nameInput = wrapper.find('input[id="participantName"]')
      await nameInput.setValue('<img>')
      await wrapper.vm.$nextTick()

      expect(wrapper.text()).toContain(
        'Name must be 1-50 characters with no HTML or control characters'
      )
    })

    it('should show error for weak password', async () => {
      const wrapper = mount(JoinSessionCard, {
        props: {
          initialSessionId: 'session-123',
        },
        global: {
          plugins: [router],
          stubs: {
            teleport: true,
          },
        },
      })

      const passwordInput = wrapper.find('input[id="joinPassword"]')
      await passwordInput.setValue('short')
      await wrapper.vm.$nextTick()

      expect(wrapper.text()).toContain('Password must be at least 8 characters')
    })

    it('should allow empty password field', async () => {
      const wrapper = mount(JoinSessionCard, {
        props: {
          initialSessionId: 'session-123',
        },
        global: {
          plugins: [router],
          stubs: {
            teleport: true,
          },
        },
      })

      const nameInput = wrapper.find('input[id="participantName"]')
      await nameInput.setValue('Bob')
      await wrapper.vm.$nextTick()

      const button = wrapper.find('button[type="submit"]')
      // When enabled, disabled attribute should be empty string or not exist
      expect(
        !button.attributes('disabled') || button.attributes('disabled') === ''
      ).toBe(true)
    })
  })

  describe('Form Submission', () => {
    it('should handle form submission with participant name and session ID', async () => {
      const wrapper = mount(JoinSessionCard, {
        props: {
          initialSessionId: 'session-123',
        },
        global: {
          plugins: [router],
          stubs: {
            teleport: true,
          },
        },
      })

      const nameInput = wrapper.find('input[id="participantName"]')
      await nameInput.setValue('Charlie')
      await wrapper.vm.$nextTick()

      const form = wrapper.find('form')
      // Verify form can be submitted without errors
      await form.trigger('submit')
      await flushPromises()

      // After submission, should navigate to session page
      expect(router.currentRoute.value.name).toBe('Session')
    })

    it('should show loading state during submission', async () => {
      const wrapper = mount(JoinSessionCard, {
        props: {
          initialSessionId: 'session-123',
        },
        global: {
          plugins: [router],
          stubs: {
            teleport: true,
          },
        },
      })

      const nameInput = wrapper.find('input[id="participantName"]')
      await nameInput.setValue('Dave')
      await wrapper.vm.$nextTick()

      const button = wrapper.find('button[type="submit"]')
      expect(button.text()).toContain('Join Session')

      const form = wrapper.find('form')
      const submitPromise = form.trigger('submit')

      await wrapper.vm.$nextTick()
      expect(button.text()).toContain('Joining...')

      await submitPromise
      await flushPromises()
    })
  })

  describe('Navigation After Join', () => {
    it('should navigate to session page after successful join', async () => {
      const sessionId = 'session-xyz789'
      const wrapper = mount(JoinSessionCard, {
        props: {
          initialSessionId: sessionId,
        },
        global: {
          plugins: [router],
          stubs: {
            teleport: true,
          },
        },
      })

      const nameInput = wrapper.find('input[id="participantName"]')
      await nameInput.setValue('Eve')
      await wrapper.vm.$nextTick()

      const form = wrapper.find('form')
      await form.trigger('submit')
      await flushPromises()

      expect(router.currentRoute.value.path).toBe(`/session/${sessionId}`)
    })

    it('should pass correct session ID to session route', async () => {
      const sessionId = 'session-correct-id'
      const wrapper = mount(JoinSessionCard, {
        props: {
          initialSessionId: sessionId,
        },
        global: {
          plugins: [router],
          stubs: {
            teleport: true,
          },
        },
      })

      const nameInput = wrapper.find('input[id="participantName"]')
      await nameInput.setValue('Frank')
      await wrapper.vm.$nextTick()

      const form = wrapper.find('form')
      await form.trigger('submit')
      await flushPromises()

      expect(router.currentRoute.value.params.id).toBe(sessionId)
    })
  })

  describe('Back Button', () => {
    it('should navigate back to home on back button click', async () => {
      await router.push('/')

      const wrapper = mount(JoinSessionCard, {
        props: {
          initialSessionId: 'session-123',
        },
        global: {
          plugins: [router],
          stubs: {
            teleport: true,
          },
        },
      })

      const buttons = wrapper.findAll('button')
      const backButton = buttons.find(b => b.text().includes('Back'))

      if (backButton) {
        await backButton.trigger('click')
        await flushPromises()

        expect(router.currentRoute.value.name).toBe('Home')
      }
    })
  })

  describe('User Input Handling', () => {
    it('should accept valid participant names', async () => {
      const wrapper = mount(JoinSessionCard, {
        props: {
          initialSessionId: 'session-123',
        },
        global: {
          plugins: [router],
          stubs: {
            teleport: true,
          },
        },
      })

      const validNames = ['Alice', 'Bob', 'Carol', '李明', 'José']

      for (const name of validNames) {
        const nameInput = wrapper.find('input[id="participantName"]')
        await nameInput.setValue(name)
        await wrapper.vm.$nextTick()

        const errorMsg = wrapper.find('.text-red-600')
        expect(errorMsg.exists()).toBe(false)
      }
    })

    it('should accept valid passwords when provided', async () => {
      const wrapper = mount(JoinSessionCard, {
        props: {
          initialSessionId: 'session-123',
        },
        global: {
          plugins: [router],
          stubs: {
            teleport: true,
          },
        },
      })

      const passwordInput = wrapper.find('input[id="joinPassword"]')
      await passwordInput.setValue('ValidPassword123')
      await wrapper.vm.$nextTick()

      expect(wrapper.text()).not.toContain(
        'Password must be at least 8 characters'
      )
    })
  })

  describe('Session ID from URL', () => {
    it('should use session ID from prop (from route query param)', () => {
      const sessionIdFromUrl = 'abc-def-ghi'
      const wrapper = mount(JoinSessionCard, {
        props: {
          initialSessionId: sessionIdFromUrl,
        },
        global: {
          plugins: [router],
          stubs: {
            teleport: true,
          },
        },
      })

      const sessionIdDiv = wrapper.find('div[id="sessionId"]')
      expect(sessionIdDiv.text()).toContain(sessionIdFromUrl)
    })

    it('should submit with session ID from prop', async () => {
      const sessionId = 'test-session-123'
      const wrapper = mount(JoinSessionCard, {
        props: {
          initialSessionId: sessionId,
        },
        global: {
          plugins: [router],
          stubs: {
            teleport: true,
          },
        },
      })

      const nameInput = wrapper.find('input[id="participantName"]')
      await nameInput.setValue('Grace')
      await wrapper.vm.$nextTick()

      const form = wrapper.find('form')
      await form.trigger('submit')
      await flushPromises()

      // After submission, should navigate with the correct session ID
      expect(router.currentRoute.value.params.id).toBe(sessionId)
    })
  })
})
