/**
 * Access Token Service
 * Generates and validates access tokens for remote access authentication
 * Requirements: 3.1, 3.3, 3.4
 */

import { randomBytes, timingSafeEqual } from 'crypto';
import { CloudflareConfigStore, getCloudflareConfigStore } from './cloudflareConfigStore';

/**
 * AccessTokenService
 *
 * Manages access token generation and validation for Cloudflare Tunnel authentication.
 * Uses cryptographically secure random generation and timing-safe comparison.
 *
 * @example
 * const service = getAccessTokenService();
 * const token = service.ensureToken(); // Get or generate token
 * const isValid = service.validateToken(userProvidedToken);
 */
export class AccessTokenService {
  private configStore: CloudflareConfigStore;

  constructor(configStore?: CloudflareConfigStore) {
    this.configStore = configStore ?? getCloudflareConfigStore();
  }

  /**
   * Generate a new 10-character alphanumeric token
   * Requirements: 3.1
   *
   * Uses crypto.randomBytes for cryptographic security.
   * The token is stored in the config store.
   *
   * @returns The generated token
   */
  generateToken(): string {
    // Generate random bytes and convert to base64url
    // base64url uses a-z, A-Z, 0-9, -, _ (alphanumeric + 2 special chars)
    // We'll use a subset for cleaner tokens
    const bytes = randomBytes(10);
    const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let token = '';

    for (let i = 0; i < 10; i++) {
      token += chars[bytes[i] % chars.length];
    }

    // Store the token
    this.configStore.setAccessToken(token);

    return token;
  }

  /**
   * Validate a token against the stored token
   * Requirements: 3.4
   *
   * Uses timing-safe comparison to prevent timing attacks.
   *
   * @param token The token to validate
   * @returns true if valid, false otherwise
   */
  validateToken(token: string): boolean {
    const storedToken = this.configStore.getAccessToken();

    // No token stored or empty input
    if (!storedToken || !token) {
      return false;
    }

    // Tokens must be same length for timing-safe comparison
    if (token.length !== storedToken.length) {
      return false;
    }

    try {
      // Use timing-safe comparison
      const tokenBuffer = Buffer.from(token, 'utf-8');
      const storedBuffer = Buffer.from(storedToken, 'utf-8');
      return timingSafeEqual(tokenBuffer, storedBuffer);
    } catch {
      return false;
    }
  }

  /**
   * Refresh the access token
   * Requirements: 3.3
   *
   * Generates a new token and invalidates the old one.
   *
   * @returns The new token
   */
  refreshToken(): string {
    return this.generateToken();
  }

  /**
   * Get the current access token
   *
   * @returns The stored token or null if none exists
   */
  getToken(): string | null {
    return this.configStore.getAccessToken();
  }

  /**
   * Ensure a token exists
   *
   * If no token exists, generate one. Otherwise, return the existing token.
   * Useful for first startup.
   *
   * @returns The token (existing or newly generated)
   */
  ensureToken(): string {
    const existing = this.configStore.getAccessToken();
    if (existing) {
      return existing;
    }
    return this.generateToken();
  }

  /**
   * Set a fixed access token
   * Task 10.2: Support for CLI --remote-token option
   *
   * Used for E2E testing to set a known token value.
   *
   * @param token The fixed token to use
   */
  setFixedToken(token: string): void {
    this.configStore.setAccessToken(token);
  }
}

// Singleton instance
let accessTokenService: AccessTokenService | null = null;

export function getAccessTokenService(): AccessTokenService {
  if (!accessTokenService) {
    accessTokenService = new AccessTokenService();
  }
  return accessTokenService;
}
