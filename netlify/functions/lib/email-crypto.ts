/**
 * Email Encryption/Decryption Utility
 * Uses AES-256-GCM for secure email storage in Redis
 * Provides reversible encryption so we can send emails later
 */

import crypto from 'crypto'

const ALGORITHM = 'aes-256-gcm'
const IV_LENGTH = 16 // 128 bits
const AUTH_TAG_LENGTH = 16 // 128 bits
const SALT_LENGTH = 16 // 128 bits

interface EncryptedEmail {
  iv: string // hex-encoded initialization vector
  salt: string // hex-encoded salt for key derivation
  authTag: string // hex-encoded authentication tag
  encryptedData: string // hex-encoded encrypted email
}

/**
 * Derive a 32-byte key from a session secret using PBKDF2
 * @param sessionSecret - Session secret to derive key from
 * @param salt - Random salt for key derivation
 * @returns 32-byte derived key
 */
function deriveKey(sessionSecret: string, salt: Buffer): Buffer {
  return crypto.pbkdf2Sync(sessionSecret, salt, 100000, 32, 'sha256')
}

/**
 * Encrypt an email address using AES-256-GCM
 * Stores IV, salt, and auth tag with the ciphertext for decryption
 *
 * @param email - Plain text email address
 * @param sessionSecret - Session secret for encryption key
 * @returns Encrypted email object with all needed components for decryption
 * @throws Error if encryption fails
 */
export function encryptEmail(
  email: string,
  sessionSecret: string
): EncryptedEmail {
  if (!email || typeof email !== 'string') {
    throw new Error('Email must be a non-empty string')
  }

  if (!sessionSecret || typeof sessionSecret !== 'string') {
    throw new Error('Session secret must be a non-empty string')
  }

  try {
    // Generate random IV and salt
    const iv = crypto.randomBytes(IV_LENGTH)
    const salt = crypto.randomBytes(SALT_LENGTH)

    // Derive encryption key from session secret
    const key = deriveKey(sessionSecret, salt)

    // Create cipher
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv)

    // Encrypt email
    let encrypted = cipher.update(email, 'utf8', 'hex')
    encrypted += cipher.final('hex')

    // Get authentication tag
    const authTag = cipher.getAuthTag()

    // Return all components needed for decryption
    return {
      iv: iv.toString('hex'),
      salt: salt.toString('hex'),
      authTag: authTag.toString('hex'),
      encryptedData: encrypted,
    }
  } catch (error) {
    console.error('[EmailCrypto] Encryption failed:', error)
    throw new Error(`Failed to encrypt email: ${(error as Error).message}`)
  }
}

/**
 * Decrypt an email address encrypted with encryptEmail()
 *
 * @param encrypted - Encrypted email object
 * @param sessionSecret - Session secret for decryption key (must be same as encryption)
 * @returns Plain text email address
 * @throws Error if decryption fails (wrong key, corrupted data, or auth failure)
 */
export function decryptEmail(
  encrypted: EncryptedEmail,
  sessionSecret: string
): string {
  if (!encrypted || typeof encrypted !== 'object') {
    throw new Error('Encrypted email object is required')
  }

  if (
    !encrypted.iv ||
    !encrypted.salt ||
    !encrypted.authTag ||
    !encrypted.encryptedData
  ) {
    throw new Error('Encrypted email object is missing required fields')
  }

  if (!sessionSecret || typeof sessionSecret !== 'string') {
    throw new Error('Session secret must be a non-empty string')
  }

  try {
    // Convert hex strings back to buffers
    const iv = Buffer.from(encrypted.iv, 'hex')
    const salt = Buffer.from(encrypted.salt, 'hex')
    const authTag = Buffer.from(encrypted.authTag, 'hex')
    const encryptedData = Buffer.from(encrypted.encryptedData, 'hex')

    // Validate buffer lengths
    if (iv.length !== IV_LENGTH) {
      throw new Error(`Invalid IV length: ${iv.length} (expected ${IV_LENGTH})`)
    }

    if (salt.length !== SALT_LENGTH) {
      throw new Error(
        `Invalid salt length: ${salt.length} (expected ${SALT_LENGTH})`
      )
    }

    if (authTag.length !== AUTH_TAG_LENGTH) {
      throw new Error(
        `Invalid auth tag length: ${authTag.length} (expected ${AUTH_TAG_LENGTH})`
      )
    }

    // Derive decryption key from session secret (using same salt)
    const key = deriveKey(sessionSecret, salt)

    // Create decipher
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv)

    // Set authentication tag BEFORE decrypting
    decipher.setAuthTag(authTag)

    // Decrypt email
    let decrypted = decipher.update(encryptedData, 'hex', 'utf8')
    decrypted += decipher.final('utf8')

    // Validate decrypted result is not empty
    if (!decrypted || decrypted.trim().length === 0) {
      throw new Error('Decryption resulted in empty email')
    }

    return decrypted
  } catch (error) {
    const errorMsg = (error as Error).message
    console.error('[EmailCrypto] Decryption failed:', {
      message: errorMsg,
      hasError: !!error,
    })

    // Re-throw with more context, but don't expose internal details to client
    if (
      errorMsg.includes('Unsupported state or unable to authenticate data') ||
      errorMsg.includes('Decipher failed')
    ) {
      throw new Error('Failed to decrypt email - invalid key or corrupted data')
    }

    throw new Error(`Failed to decrypt email: ${errorMsg}`)
  }
}

/**
 * Serialize encrypted email to JSON string for storage
 * @param encrypted - Encrypted email object
 * @returns JSON string representation
 */
export function serializeEncryptedEmail(encrypted: EncryptedEmail): string {
  return JSON.stringify(encrypted)
}

/**
 * Deserialize encrypted email from JSON string
 * @param serialized - JSON string representation
 * @returns Encrypted email object
 * @throws Error if JSON is invalid
 */
export function deserializeEncryptedEmail(serialized: string): EncryptedEmail {
  try {
    const parsed = JSON.parse(serialized)

    if (
      !parsed.iv ||
      !parsed.salt ||
      !parsed.authTag ||
      !parsed.encryptedData
    ) {
      throw new Error('Invalid encrypted email format')
    }

    return parsed as EncryptedEmail
  } catch (error) {
    throw new Error(
      `Failed to deserialize encrypted email: ${(error as Error).message}`
    )
  }
}
