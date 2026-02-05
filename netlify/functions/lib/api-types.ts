/**
 * Shared API Response Types
 * Used across all Netlify functions for consistent error handling
 */

export interface ErrorResponse {
  error?: string
  message?: string
  code?: string
  remaining?: number
  resetAt?: number
}
