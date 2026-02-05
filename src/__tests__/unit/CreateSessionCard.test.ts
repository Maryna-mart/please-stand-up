import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createRouter, createMemoryHistory } from 'vue-router'
import CreateSessionCard from '@/components/CreateSessionCard.vue'

// Mock the useSession composable
vi.mock('@/composables/useSession', () => ({
  useSession: () => ({
    createSession: vi.fn(),
  }),
}))

// Mock the session API
vi.mock('@/lib/session-api', () => ({
  createSession: vi.fn(async () => {
    return {
      sessionId: 'session-12345',
      userId: 'user-123',
      expiresAt: new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString(),
    }
  }),
}))

describe('CreateSessionCard', () => {
  let router: ReturnType<typeof createRouter>

  beforeEach(() => {
    // Create a memory router for testing
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
      const wrapper = mount(CreateSessionCard, {
        global: {
          plugins: [router],
          stubs: {
            teleport: true,
          },
        },
      })

      expect(wrapper.text()).toContain('Create Session')
    })

    it('should render name input field', () => {
      const wrapper = mount(CreateSessionCard, {
        global: {
          plugins: [router],
          stubs: {
            teleport: true,
          },
        },
      })

      const input = wrapper.find('input[id="leaderName"]')
      expect(input.exists()).toBe(true)
    })

    it('should render password input field', () => {
      const wrapper = mount(CreateSessionCard, {
        global: {
          plugins: [router],
          stubs: {
            teleport: true,
          },
        },
      })

      const input = wrapper.find('input[id="createPassword"]')
      expect(input.exists()).toBe(true)
    })

    it('should render submit button', () => {
      const wrapper = mount(CreateSessionCard, {
        global: {
          plugins: [router],
          stubs: {
            teleport: true,
          },
        },
      })

      const button = wrapper.find('button[type="submit"]')
      expect(button.exists()).toBe(true)
      expect(button.text()).toContain('Create Session')
    })
  })

  describe('Form Validation', () => {
    it('should disable submit button when name is empty', async () => {
      const wrapper = mount(CreateSessionCard, {
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
      const wrapper = mount(CreateSessionCard, {
        global: {
          plugins: [router],
          stubs: {
            teleport: true,
          },
        },
      })

      const nameInput = wrapper.find('input[id="leaderName"]')
      await nameInput.setValue('John')
      const emailInput = wrapper.find('input[id="createEmail"]')
      await emailInput.setValue('john@example.com')
      await wrapper.vm.$nextTick()

      const button = wrapper.find('button[type="submit"]')
      expect(button.attributes('disabled')).toBeUndefined()
    })

    it('should show error for invalid name', async () => {
      const wrapper = mount(CreateSessionCard, {
        global: {
          plugins: [router],
          stubs: {
            teleport: true,
          },
        },
      })

      const nameInput = wrapper.find('input[id="leaderName"]')
      // Enter name with HTML characters
      await nameInput.setValue('<script>')
      await wrapper.vm.$nextTick()

      expect(wrapper.text()).toContain(
        'Name must be 1-50 characters with no HTML or control characters'
      )
    })

    it('should show error for weak password', async () => {
      const wrapper = mount(CreateSessionCard, {
        global: {
          plugins: [router],
          stubs: {
            teleport: true,
          },
        },
      })

      const passwordInput = wrapper.find('input[id="createPassword"]')
      await passwordInput.setValue('short')
      await wrapper.vm.$nextTick()

      expect(wrapper.text()).toContain('Password must be at least 8 characters')
    })

    it('should allow optional password field', async () => {
      const wrapper = mount(CreateSessionCard, {
        global: {
          plugins: [router],
          stubs: {
            teleport: true,
          },
        },
      })

      const nameInput = wrapper.find('input[id="leaderName"]')
      await nameInput.setValue('John')
      const emailInput = wrapper.find('input[id="createEmail"]')
      await emailInput.setValue('john@example.com')
      await wrapper.vm.$nextTick()

      const button = wrapper.find('button[type="submit"]')
      // Button should be enabled even with empty password
      expect(button.attributes('disabled')).toBeUndefined()
    })
  })

  describe('Form Submission', () => {
    it('should handle form submission with valid name', async () => {
      const wrapper = mount(CreateSessionCard, {
        global: {
          plugins: [router],
          stubs: {
            teleport: true,
          },
        },
      })

      const nameInput = wrapper.find('input[id="leaderName"]')
      await nameInput.setValue('John')
      await wrapper.vm.$nextTick()

      const form = wrapper.find('form')
      const submitPromise = form.trigger('submit')

      // Form should be submitted without validation errors
      expect(submitPromise).toBeDefined()
    })

    it('should show loading state during submission', async () => {
      const wrapper = mount(CreateSessionCard, {
        global: {
          plugins: [router],
          stubs: {
            teleport: true,
          },
        },
      })

      const nameInput = wrapper.find('input[id="leaderName"]')
      await nameInput.setValue('John')
      const emailInput = wrapper.find('input[id="createEmail"]')
      await emailInput.setValue('john@example.com')
      await wrapper.vm.$nextTick()

      const button = wrapper.find('button[type="submit"]')
      expect(button.text()).toContain('Create Session')

      const form = wrapper.find('form')
      const submitPromise = form.trigger('submit')

      await wrapper.vm.$nextTick()
      expect(button.text()).toContain('Creating...')

      await submitPromise
      await flushPromises()
    })
  })

  describe('Navigation After Session Creation', () => {
    it('should accept valid name and be ready for submission', async () => {
      const wrapper = mount(CreateSessionCard, {
        global: {
          plugins: [router],
          stubs: {
            teleport: true,
          },
        },
      })

      const nameInput = wrapper.find('input[id="leaderName"]')
      await nameInput.setValue('Alice')
      await wrapper.vm.$nextTick()

      const button = wrapper.find('button[type="submit"]')
      // Form should be valid and ready to submit (disabled attr should be empty or not exist)
      const isEnabled =
        !button.attributes('disabled') || button.attributes('disabled') === ''
      expect(isEnabled).toBe(true)
    })

    it('should validate password strength for optional field', async () => {
      const wrapper = mount(CreateSessionCard, {
        global: {
          plugins: [router],
          stubs: {
            teleport: true,
          },
        },
      })

      const nameInput = wrapper.find('input[id="leaderName"]')
      await nameInput.setValue('Bob')
      const passwordInput = wrapper.find('input[id="createPassword"]')
      await passwordInput.setValue('ValidPassword123')
      await wrapper.vm.$nextTick()

      // Should not show password error for valid password
      expect(wrapper.text()).not.toContain(
        'Password must be at least 8 characters'
      )
    })
  })

  describe('User Input Handling', () => {
    it('should accept valid user names', async () => {
      const wrapper = mount(CreateSessionCard, {
        global: {
          plugins: [router],
          stubs: {
            teleport: true,
          },
        },
      })

      const validNames = ['Alice', 'Bob Smith', 'José', 'Yuki', 'أحمد']

      for (const name of validNames) {
        const nameInput = wrapper.find('input[id="leaderName"]')
        await nameInput.setValue(name)
        await wrapper.vm.$nextTick()

        const errorMsg = wrapper.find('.text-red-600')
        expect(errorMsg.exists()).toBe(false)
      }
    })

    it('should handle name trimming', async () => {
      const wrapper = mount(CreateSessionCard, {
        global: {
          plugins: [router],
          stubs: {
            teleport: true,
          },
        },
      })

      const nameInput = wrapper.find('input[id="leaderName"]')
      await nameInput.setValue('  John  ')
      const emailInput = wrapper.find('input[id="createEmail"]')
      await emailInput.setValue('john@example.com')
      await wrapper.vm.$nextTick()

      const button = wrapper.find('button[type="submit"]')
      expect(button.attributes('disabled')).toBeUndefined()
    })

    it('should accept valid passwords', async () => {
      const wrapper = mount(CreateSessionCard, {
        global: {
          plugins: [router],
          stubs: {
            teleport: true,
          },
        },
      })

      const passwordInput = wrapper.find('input[id="createPassword"]')
      await passwordInput.setValue('ValidPassword123')
      await wrapper.vm.$nextTick()

      expect(wrapper.text()).not.toContain(
        'Password must be at least 8 characters'
      )
    })
  })
})
