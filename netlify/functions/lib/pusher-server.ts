/**
 * Pusher Server Utility
 * Handles real-time event broadcasting to session channels
 */

import Pusher from 'pusher'

// Initialize Pusher singleton
let pusher: Pusher | null = null

function getPusherInstance(): Pusher {
  if (!pusher) {
    const appId = process.env.PUSHER_APP_ID
    const key = process.env.VITE_PUSHER_APP_KEY
    const secret = process.env.PUSHER_SECRET
    const cluster = process.env.VITE_PUSHER_CLUSTER || 'eu'

    if (!appId || !key || !secret) {
      throw new Error('Missing Pusher environment variables')
    }

    pusher = new Pusher({
      appId,
      key,
      secret,
      cluster,
      useTLS: true,
    })
  }

  return pusher
}

/**
 * Broadcast transcript added event to session channel
 */
export async function broadcastTranscriptAdded(
  sessionId: string,
  transcript: {
    participantName: string
    text: string
    duration?: number
    language?: string
  }
): Promise<void> {
  try {
    const pusher = getPusherInstance()
    const channelName = `session-${sessionId}`
    const eventName = 'transcript-added'

    await pusher.trigger(channelName, eventName, {
      transcript,
      timestamp: new Date().toISOString(),
    })

    console.log('[pusher] Broadcast transcript-added to', channelName)
  } catch (error) {
    console.error('[pusher] Failed to broadcast transcript-added:', error)
    // Don't throw - broadcasting is non-critical
  }
}
