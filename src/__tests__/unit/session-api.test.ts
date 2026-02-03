/**
 * Unit tests for session-api client
 * Tests session management API functions
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  createSession,
  getSession,
  joinSession,
  type CreateSessionPayload,
  type JoinSessionPayload,
} from '@/lib/session-api'

// Mock global fetch - properly typed as a Vitest mock function
type MockedFetch = ReturnType<typeof vi.fn>
const mockFetch: MockedFetch = vi.fn()
global.fetch = mockFetch as unknown as typeof fetch

afterEach(() => {
  vi.restoreAllMocks()
  vi.useRealTimers()
})

describe('session-api: createSession', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockFetch.mockReset()
  })

  it('should create a new session', async () => {
    const payload: CreateSessionPayload = {
      leaderName: 'Alice',
      password: 'password123',
      email: 'alice@example.com',
    }

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        sessionId: 'test-session-id',
        userId: 'user-id',
        expiresAt: Date.now() + 4 * 60 * 60 * 1000,
      }),
    })

    const result = await createSession(payload)

    expect(result.sessionId).toBe('test-session-id')
    expect(result.userId).toBe('user-id')
    expect(mockFetch).toHaveBeenCalledWith(
      '/.netlify/functions/create-session',
      expect.objectContaining({
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
    )
  })

  it('should send correct request body for create session', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        sessionId: 'test-id',
        userId: 'user-id',
        expiresAt: Date.now(),
      }),
    })

    await createSession({
      leaderName: 'Alice',
    })

    const callArgs = mockFetch.mock.calls[0]
    const body = JSON.parse(callArgs[1].body)
    expect(body.leaderName).toBe('Alice')
  })
})

describe('session-api: getSession', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockFetch.mockReset()
  })

  it('should get session information', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        id: 'session-id',
        leaderName: 'Alice',
        participants: [
          { id: 'user1', name: 'Alice' },
          { id: 'user2', name: 'Bob' },
        ],
        createdAt: Date.now(),
        passwordRequired: false,
      }),
    })

    const result = await getSession('session-id')

    expect(result.id).toBe('session-id')
    expect(result.leaderName).toBe('Alice')
    expect(result.participants).toHaveLength(2)
    expect(mockFetch).toHaveBeenCalledWith(
      '/.netlify/functions/get-session/session-id',
      expect.any(Object)
    )
  })

  it('should URL-encode sessionId in path', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        id: 'test',
        leaderName: 'Alice',
        participants: [],
        createdAt: Date.now(),
        passwordRequired: false,
      }),
    })

    await getSession('session/id?test=123')

    const callUrl = mockFetch.mock.calls[0][0]
    expect(callUrl).toContain('session%2Fid%3Ftest%3D123')
  })

  it('should handle network errors gracefully', async () => {
    mockFetch.mockRejectedValueOnce(new Error('Network error'))

    await expect(getSession('session-id')).rejects.toThrow()
  })
})

describe('session-api: joinSession', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockFetch.mockReset()
  })

  it('should join an existing session', async () => {
    const payload: JoinSessionPayload = {
      sessionId: 'session-id',
      participantName: 'Bob',
      email: 'bob@example.com',
    }

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        sessionId: 'session-id',
        userId: 'bob-id',
        participants: [
          { id: 'alice-id', name: 'Alice' },
          { id: 'bob-id', name: 'Bob' },
        ],
        createdAt: Date.now(),
      }),
    })

    const result = await joinSession(payload)

    expect(result.sessionId).toBe('session-id')
    expect(result.userId).toBe('bob-id')
    expect(result.participants).toHaveLength(2)
  })

  it('should send correct request body for join session', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        sessionId: 'test-id',
        userId: 'user-id',
        participants: [],
        createdAt: Date.now(),
      }),
    })

    await joinSession({
      sessionId: 'session-id',
      participantName: 'Bob',
      password: 'pass123',
    })

    const callArgs = mockFetch.mock.calls[0]
    const body = JSON.parse(callArgs[1].body)
    expect(body.sessionId).toBe('session-id')
    expect(body.participantName).toBe('Bob')
    expect(body.password).toBe('pass123')
  })

  it('should handle network errors gracefully', async () => {
    mockFetch.mockRejectedValueOnce(new Error('Network error'))

    await expect(
      joinSession({
        sessionId: 'session-id',
        participantName: 'Bob',
      })
    ).rejects.toThrow()
  })
})

describe('session-api: Request formatting', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockFetch.mockReset()
  })

  it('should use correct API base path', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        sessionId: 'test',
        userId: 'user',
        expiresAt: Date.now(),
      }),
    })

    await createSession({ leaderName: 'Alice' })

    const url = mockFetch.mock.calls[0][0]
    expect(url).toContain('/.netlify/functions')
  })

  it('should set correct Content-Type headers for POST', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        sessionId: 'test',
        userId: 'user',
        expiresAt: Date.now(),
      }),
    })

    await createSession({ leaderName: 'Alice' })

    const options = mockFetch.mock.calls[0][1]
    expect(options.headers['Content-Type']).toBe('application/json')
    expect(options.method).toBe('POST')
  })

  it('should set correct headers for GET', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        id: 'test',
        leaderName: 'Alice',
        participants: [],
        createdAt: Date.now(),
        passwordRequired: false,
      }),
    })

    await getSession('session-id')

    const options = mockFetch.mock.calls[0][1]
    expect(options.method).toBe('GET')
    expect(options.headers['Content-Type']).toBe('application/json')
  })
})
