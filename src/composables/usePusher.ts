/**
 * Pusher Composable
 * Handles channel subscriptions and real-time event listening
 */

import { ref, onUnmounted } from 'vue'
import pusherClient from '@/lib/pusher-client'
import type { Channel } from 'pusher-js'

export function usePusher() {
  const channel = ref<Channel | null>(null)
  const isConnected = ref(false)

  /**
   * Subscribe to a session channel
   * @param channelName - Session ID (will be prefixed with 'session-')
   * @param onUserJoined - Callback when user joins
   * @param onUserLeft - Callback when user leaves
   * @param onTimerStarted - Callback when timer starts
   * @param onTimerStopped - Callback when timer stops
   * @param onStatusChanged - Callback when participant status changes
   */
  function subscribeToSession(
    channelName: string,
    callbacks: {
      onUserJoined?: (data: Record<string, unknown>) => void
      onUserLeft?: (data: Record<string, unknown>) => void
      onTimerStarted?: (data: Record<string, unknown>) => void
      onTimerStopped?: (data: Record<string, unknown>) => void
      onStatusChanged?: (data: Record<string, unknown>) => void
    } = {}
  ) {
    // Create public channel for the session
    const sessionChannel = pusherClient.subscribe(`session-${channelName}`)

    channel.value = sessionChannel

    // Bind to connection state
    sessionChannel.bind('pusher:subscription_succeeded', () => {
      isConnected.value = true
    })

    sessionChannel.bind('pusher:subscription_error', (error: unknown) => {
      isConnected.value = false
      void error
    })

    // Bind to user events
    if (callbacks.onUserJoined) {
      sessionChannel.bind('user-joined', callbacks.onUserJoined)
    }

    if (callbacks.onUserLeft) {
      sessionChannel.bind('user-left', callbacks.onUserLeft)
    }

    // Bind to timer events
    if (callbacks.onTimerStarted) {
      sessionChannel.bind('timer-started', callbacks.onTimerStarted)
    }

    if (callbacks.onTimerStopped) {
      sessionChannel.bind('timer-stopped', callbacks.onTimerStopped)
    }

    // Bind to status update events
    if (callbacks.onStatusChanged) {
      sessionChannel.bind('status-changed', callbacks.onStatusChanged)
    }
  }

  /**
   * Unsubscribe from the current channel
   */
  function unsubscribeFromSession() {
    if (channel.value) {
      pusherClient.unsubscribe(`session-${channel.value.name}`)
      channel.value = null
      isConnected.value = false
      console.log('✅ Unsubscribed from session')
    }
  }

  /**
   * Broadcast an event to the session channel
   * @param eventName - Event name
   * @param data - Event data
   */
  function broadcastEvent(eventName: string, data: Record<string, unknown>) {
    if (!channel.value) {
      return
    }

    // Note: Broadcasting from client requires authentication (Pusher Channels app setting)
    // For MVP, we'll trigger events from frontend state changes
    // Production may need authenticated channels with signed authentication tokens
    void eventName
    void data
  }

  /**
   * Cleanup on unmount
   */
  onUnmounted(() => {
    unsubscribeFromSession()
  })

  return {
    channel,
    isConnected,
    subscribeToSession,
    unsubscribeFromSession,
    broadcastEvent,
  }
}
