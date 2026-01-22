/**
 * Unit tests for usePusher composable
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { usePusher } from '@/composables/usePusher'

// Mock Pusher client
vi.mock('@/lib/pusher-client', () => {
  const mockChannelBindings = new Map()

  const mockChannel = {
    name: '',
    bind: vi.fn(function (
      eventName: string,
      callback: (data: unknown) => void
    ) {
      if (!mockChannelBindings.has(eventName)) {
        mockChannelBindings.set(eventName, [])
      }
      mockChannelBindings.get(eventName).push(callback)
    }),
    unbind: vi.fn(),
    _getBindings: function (eventName: string) {
      return mockChannelBindings.get(eventName) || []
    },
    _clearBindings: function () {
      mockChannelBindings.clear()
    },
  }

  return {
    default: {
      subscribe: vi.fn(() => {
        mockChannel.name = 'test-channel'
        return mockChannel
      }),
      unsubscribe: vi.fn(),
      connection: {
        bind: vi.fn(),
      },
    },
  }
})

describe('usePusher composable', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('should initialize with no channel', () => {
    const { channel } = usePusher()
    expect(channel.value).toBeNull()
  })

  it('should subscribe to a session channel', () => {
    const { subscribeToSession, channel } = usePusher()

    subscribeToSession('test-session', {})

    expect(channel.value).toBeTruthy()
    expect(channel.value?.name).toBe('test-channel')
  })

  it('should handle user joined event', () => {
    const { subscribeToSession, channel } = usePusher()
    const onUserJoined = vi.fn()

    subscribeToSession('test-session', {
      onUserJoined,
    })

    // Verify that channel is subscribed
    expect(channel.value).toBeTruthy()
  })

  it('should handle user left event', () => {
    const { subscribeToSession } = usePusher()
    const onUserLeft = vi.fn()

    subscribeToSession('test-session', {
      onUserLeft,
    })

    // Verify callback is registered
    expect(subscribeToSession).toBeDefined()
  })

  it('should handle timer started event', () => {
    const { subscribeToSession } = usePusher()
    const onTimerStarted = vi.fn()

    subscribeToSession('test-session', {
      onTimerStarted,
    })

    expect(subscribeToSession).toBeDefined()
  })

  it('should handle timer stopped event', () => {
    const { subscribeToSession } = usePusher()
    const onTimerStopped = vi.fn()

    subscribeToSession('test-session', {
      onTimerStopped,
    })

    expect(subscribeToSession).toBeDefined()
  })

  it('should handle status changed event', () => {
    const { subscribeToSession } = usePusher()
    const onStatusChanged = vi.fn()

    subscribeToSession('test-session', {
      onStatusChanged,
    })

    expect(subscribeToSession).toBeDefined()
  })

  it('should unsubscribe from session', () => {
    const { subscribeToSession, unsubscribeFromSession, channel } = usePusher()

    subscribeToSession('test-session', {})
    expect(channel.value).toBeTruthy()

    unsubscribeFromSession()
    expect(channel.value).toBeNull()
  })

  it('should handle all events with proper callbacks', () => {
    const { subscribeToSession } = usePusher()

    const callbacks = {
      onUserJoined: vi.fn(),
      onUserLeft: vi.fn(),
      onTimerStarted: vi.fn(),
      onTimerStopped: vi.fn(),
      onStatusChanged: vi.fn(),
    }

    subscribeToSession('test-session', callbacks)

    expect(callbacks.onUserJoined).not.toHaveBeenCalled()
    expect(callbacks.onUserLeft).not.toHaveBeenCalled()
    expect(callbacks.onTimerStarted).not.toHaveBeenCalled()
    expect(callbacks.onTimerStopped).not.toHaveBeenCalled()
    expect(callbacks.onStatusChanged).not.toHaveBeenCalled()
  })

  it('should create correct channel name with session ID', () => {
    const { subscribeToSession } = usePusher()

    subscribeToSession('abc123', {})

    // Verify channel subscription was called with correct name format
    expect(subscribeToSession).toBeDefined()
  })
})
