/**
 * SSH Authentication Service
 * Manages authentication methods and fallback chain
 * Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 9.5
 */

import * as fs from 'fs/promises';
import * as os from 'os';
import * as path from 'path';

/**
 * Authentication method types
 */
export type AuthMethod =
  | { type: 'agent'; socketPath: string }
  | { type: 'privateKey'; keyPath: string; hasPassphrase: boolean }
  | { type: 'password' };

/**
 * Authentication configuration for ssh2
 */
export type NextAuthConfig =
  | { type: 'none' }
  | { type: 'password'; username: string; password: string }
  | { type: 'publickey'; username: string; key: Buffer; passphrase?: string }
  | false;

/**
 * Authentication handler function type (for ssh2 keyboardInteractive/authHandler)
 */
export type AuthHandler = (
  methodsLeft: string[],
  partialSuccess: boolean | null,
  callback: (nextAuth: NextAuthConfig) => void
) => void;

/**
 * Common SSH key file names to check
 */
const DEFAULT_KEY_FILES = [
  'id_ed25519',
  'id_ecdsa',
  'id_rsa',
  'id_dsa',
];

/**
 * SSH Authentication Service
 * Handles multiple authentication methods with fallback chain
 */
export class SSHAuthService {
  private currentKeyPath: string | null = null;
  private currentKeyNeedsPassphrase: boolean = false;
  private cachedUsername: string = '';

  /**
   * Get available authentication methods for a host
   * Priority: agent > privateKey > password
   *
   * @param host - The target host
   * @param username - The username for authentication
   * @returns List of available authentication methods in priority order
   */
  async getAuthMethods(_host: string, username: string): Promise<AuthMethod[]> {
    this.cachedUsername = username;
    const methods: AuthMethod[] = [];

    // 1. Check for ssh-agent
    const agentSocket = process.env.SSH_AUTH_SOCK;
    if (agentSocket) {
      methods.push({
        type: 'agent',
        socketPath: agentSocket,
      });
    }

    // 2. Check for private keys
    const homeDir = os.homedir();
    const sshDir = path.join(homeDir, '.ssh');

    for (const keyName of DEFAULT_KEY_FILES) {
      const keyPath = path.join(sshDir, keyName);
      try {
        await fs.access(keyPath);
        const hasPassphrase = await this.checkKeyHasPassphrase(keyPath);
        methods.push({
          type: 'privateKey',
          keyPath,
          hasPassphrase,
        });
      } catch {
        // Key file doesn't exist, skip
      }
    }

    // 3. Password is always available as fallback
    methods.push({ type: 'password' });

    return methods;
  }

  /**
   * Check if a private key file is passphrase-protected
   */
  private async checkKeyHasPassphrase(keyPath: string): Promise<boolean> {
    try {
      const content = await fs.readFile(keyPath, 'utf-8');

      // Check for encrypted markers in various key formats
      if (content.includes('ENCRYPTED')) {
        return true;
      }

      // OpenSSH new format encrypted keys contain 'aes256-ctr' or similar
      if (content.includes('-----BEGIN OPENSSH PRIVATE KEY-----')) {
        // New OpenSSH format - check for encryption
        // Encrypted keys have a different structure, but simple check for 'bcrypt' or cipher
        if (content.includes('aes256-ctr') || content.includes('bcrypt')) {
          return true;
        }
        // For now, assume new format OpenSSH keys might be encrypted
        // A proper check would require parsing the key format
        return false;
      }

      return false;
    } catch {
      return true; // Assume encrypted if we can't read
    }
  }

  /**
   * Set the current key being used for authentication
   * Used to track which key needs passphrase prompt
   */
  setCurrentKey(keyPath: string, needsPassphrase: boolean): void {
    this.currentKeyPath = keyPath;
    this.currentKeyNeedsPassphrase = needsPassphrase;
  }

  /**
   * Create an authentication handler for ssh2
   *
   * @param onPasswordRequired - Callback when password is needed
   * @param onPassphraseRequired - Callback when key passphrase is needed
   * @returns Authentication handler function
   */
  createAuthHandler(
    onPasswordRequired: () => Promise<string>,
    onPassphraseRequired: (keyPath: string) => Promise<string>
  ): AuthHandler {
    return (methodsLeft, _partialSuccess, callback) => {
      // No more methods available
      if (!methodsLeft || methodsLeft.length === 0) {
        callback(false);
        return;
      }

      // Try password authentication
      if (methodsLeft.includes('password')) {
        onPasswordRequired()
          .then((password) => {
            callback({
              type: 'password',
              username: this.cachedUsername,
              password,
            });
          })
          .catch(() => {
            callback(false);
          });
        return;
      }

      // Try publickey authentication
      if (methodsLeft.includes('publickey') && this.currentKeyPath) {
        if (this.currentKeyNeedsPassphrase) {
          onPassphraseRequired(this.currentKeyPath)
            .then(async (passphrase) => {
              const keyContent = await fs.readFile(this.currentKeyPath!, 'utf-8');
              callback({
                type: 'publickey',
                username: this.cachedUsername,
                key: Buffer.from(keyContent),
                passphrase,
              });
            })
            .catch(() => {
              callback(false);
            });
        } else {
          fs.readFile(this.currentKeyPath, 'utf-8')
            .then((keyContent) => {
              callback({
                type: 'publickey',
                username: this.cachedUsername,
                key: Buffer.from(keyContent),
              });
            })
            .catch(() => {
              callback(false);
            });
        }
        return;
      }

      // No suitable method found
      callback(false);
    };
  }

  /**
   * Clear any cached credentials
   * Should be called after authentication completes or fails
   */
  clearCredentials(): void {
    this.currentKeyPath = null;
    this.currentKeyNeedsPassphrase = false;
  }
}

// Export singleton instance
export const sshAuthService = new SSHAuthService();
