/**
 * Portkey Type Definitions
 * Shared types for frontend/backend communication with Portkey AI services
 */

/**
 * Audio format supported for transcription
 */
export type AudioFormat = 'webm' | 'mp3' | 'mp4' | 'wav'

/**
 * Supported language codes
 */
export type LanguageCode = 'en' | 'de' | 'fr' | 'es' | 'it' | 'pt' | 'ja' | 'zh'

/**
 * Transcript from a single participant
 */
export interface Transcript {
  participantName: string
  text: string
  language?: LanguageCode
  duration?: number
}

/**
 * API request to transcribe audio
 */
export interface TranscribeRequest {
  sessionId: string
  participantId: string
  participantName: string
  audio: Blob | File
  format: AudioFormat
  language?: LanguageCode
}

/**
 * API response from transcription
 */
export interface TranscribeResponse {
  success: boolean
  transcript: {
    text: string
    language: LanguageCode
    duration?: number
  }
  error?: {
    message: string
    code: string
  }
}

/**
 * API request to generate summary
 */
export interface SummarizeRequest {
  sessionId: string
  transcripts: Transcript[]
  language?: LanguageCode
}

/**
 * API response from summarization
 */
export interface SummarizeResponse {
  success: boolean
  summary: {
    text: string
    language: LanguageCode
    generatedAt: string
  }
  error?: {
    message: string
    code: string
  }
}

/**
 * AI operation progress
 */
export enum AIOperationStatus {
  IDLE = 'idle',
  PROCESSING = 'processing',
  SUCCESS = 'success',
  ERROR = 'error',
}

/**
 * Error codes returned from Portkey operations
 */
export enum PortkeyErrorCode {
  // Transcription errors
  INVALID_AUDIO = 'INVALID_AUDIO',
  AUDIO_TOO_LARGE = 'AUDIO_TOO_LARGE',
  UNSUPPORTED_FORMAT = 'UNSUPPORTED_FORMAT',

  // API errors
  PORTKEY_TIMEOUT = 'PORTKEY_TIMEOUT',
  PORTKEY_RATE_LIMIT = 'PORTKEY_RATE_LIMIT',
  PORTKEY_AUTH_ERROR = 'PORTKEY_AUTH_ERROR',
  PORTKEY_SERVICE_ERROR = 'PORTKEY_SERVICE_ERROR',
  PORTKEY_ERROR = 'PORTKEY_ERROR',

  // Validation errors
  EMPTY_TRANSCRIPTS = 'EMPTY_TRANSCRIPTS',
  INVALID_SESSION = 'INVALID_SESSION',
  MISSING_TRANSCRIPT = 'MISSING_TRANSCRIPT',
}

/**
 * Result of audio transcription operation
 */
export interface TranscriptionResult {
  text: string
  language: LanguageCode
  duration?: number
}

/**
 * Result of summary generation operation
 */
export interface SummaryResult {
  text: string
  language: LanguageCode
  generatedAt: Date
}

/**
 * Configuration for Portkey operations
 */
export interface PortkeyConfig {
  apiKey?: string
  retryAttempts?: number
  timeoutMs?: number
  whisperModel?: string
  claudeModel?: string
}
