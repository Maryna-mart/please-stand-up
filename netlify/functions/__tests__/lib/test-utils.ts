/**
 * Test utilities for Netlify function testing
 */
/* eslint-disable @typescript-eslint/no-explicit-any */

import type { Handler, HandlerResponse } from '@netlify/functions'

/**
 * Type-safe wrapper for calling handlers in tests
 * Extracts the handler logic without requiring full Netlify context
 */
export async function callHandler(
  handler: Handler,
  event: {
    httpMethod: string
    body?: string | null
  }
): Promise<HandlerResponse> {
  // Call handler with event and undefined context (tests don't need full context)
  const response = await handler({ ...event } as any, undefined as any)
  // Ensure we always return a response (Handler can return void, but tests expect response)
  return (
    response || ({ statusCode: 500, body: 'No response' } as HandlerResponse)
  )
}
