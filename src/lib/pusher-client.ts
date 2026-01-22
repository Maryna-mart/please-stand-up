/**
 * Pusher Client Initialization
 * Handles real-time communication for timer sync, user join/leave, and status updates
 */

import Pusher from 'pusher-js'

// Initialize Pusher with environment variables
const pusherClient = new Pusher(import.meta.env.VITE_PUSHER_APP_KEY, {
  cluster: import.meta.env.VITE_PUSHER_CLUSTER,
  forceTLS: true, // Always use secure connection
})

// Log connection state changes (for debugging)
pusherClient.connection.bind('connected', () => {
  // Pusher connected
})

pusherClient.connection.bind('disconnected', () => {
  // Pusher disconnected
})

pusherClient.connection.bind('error', (error: unknown) => {
  // Pusher connection error - silently handle
  void error
})

export default pusherClient
