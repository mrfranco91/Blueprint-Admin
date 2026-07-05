import { createHash, randomBytes } from 'crypto';

/**
 * Token utilities for client invitations.
 *
 * SECURITY: Activation tokens are stored as SHA-256 hashes.
 * The raw token is only returned once (in the activation link)
 * and never stored in plaintext. When validating, the incoming
 * token is hashed and compared against the stored hash.
 */

/**
 * Generate a raw activation token (64-char hex).
 * This is the token that appears in the activation URL.
 * It must NEVER be stored — only its hash is persisted.
 */
export function generateRawToken(): string {
  return randomBytes(32).toString('hex');
}

/**
 * Hash a raw token for storage using SHA-256.
 * Returns a 64-char hex string.
 */
export function hashToken(rawToken: string): string {
  return createHash('sha256').update(rawToken).digest('hex');
}

/**
 * Generate a short 6-character uppercase alphanumeric claim code.
 * Stored in plaintext for in-person verbal/visual handoff.
 */
export function generateClaimCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // omit 0/O/1/I for readability
  let code = '';
  const bytes = randomBytes(6);
  for (let i = 0; i < 6; i++) {
    code += chars[bytes[i] % chars.length];
  }
  return code;
}
