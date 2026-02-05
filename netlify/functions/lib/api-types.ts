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

/**
 * Summary parsing types for email formatting
 */

export interface SummarySection {
  yesterday?: string
  today?: string
  blockers?: string
  actionItems?: string
  other?: string
}

export interface ParsedSummary {
  participants: Array<{
    name: string
    sections: SummarySection
  }>
}
