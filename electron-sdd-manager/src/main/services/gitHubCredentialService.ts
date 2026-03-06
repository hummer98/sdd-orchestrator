/**
 * GitHub Credential Service
 * Manages PAT encryption/storage and Enterprise URL persistence using
 * Electron safeStorage API and electron-store.
 *
 * github-issue-integration: Task 2.1
 * Requirements: 1.1, 1.2
 */

import { safeStorage } from 'electron';
import Store from 'electron-store';

/**
 * Storage schema for GitHub credentials.
 * Tokens are stored as base64-encoded encrypted buffers.
 * Enterprise URLs are stored as plain strings (not sensitive).
 */
interface GitHubCredentialStoreSchema {
  tokens: Record<string, string>; // projectPath -> base64-encoded encrypted token
  enterpriseUrls: Record<string, string>; // projectPath -> enterprise URL
}

/**
 * Normalizes a project path for use as a storage key.
 * Removes trailing slashes for consistency.
 */
function normalizeProjectPath(projectPath: string): string {
  return projectPath.replace(/\/+$/, '');
}

/**
 * GitHubCredentialService
 *
 * Encrypts and stores GitHub Personal Access Tokens using Electron's
 * safeStorage API (OS keychain integration). Manages project-scoped
 * credentials and GitHub Enterprise URLs.
 *
 * Preconditions:
 * - safeStorage.isEncryptionAvailable() must return true for token operations
 * - app.whenReady() must have resolved before instantiation
 *
 * Postconditions:
 * - Tokens are never stored in plaintext
 * - Each project has independent credential storage
 */
export class GitHubCredentialService {
  private store: Store<GitHubCredentialStoreSchema>;

  constructor() {
    this.store = new Store<GitHubCredentialStoreSchema>({
      name: 'github-credentials',
      defaults: {
        tokens: {},
        enterpriseUrls: {},
      },
    });
  }

  /**
   * Encrypt and store a PAT for a project.
   * @throws Error if encryption is not available
   */
  storeToken(projectPath: string, token: string): void {
    if (!safeStorage.isEncryptionAvailable()) {
      throw new Error(
        'Encryption is not available. Set GITHUB_TOKEN environment variable as fallback.',
      );
    }

    const key = normalizeProjectPath(projectPath);
    const encrypted = safeStorage.encryptString(token);
    const base64 = encrypted.toString('base64');

    const tokens = this.store.get('tokens', {});
    tokens[key] = base64;
    this.store.set('tokens', tokens);
  }

  /**
   * Decrypt and return a stored PAT for a project.
   * @returns The decrypted token, or null if not found or encryption unavailable
   */
  getToken(projectPath: string): string | null {
    if (!safeStorage.isEncryptionAvailable()) {
      return null;
    }

    const key = normalizeProjectPath(projectPath);
    const tokens = this.store.get('tokens', {});
    const base64 = tokens[key];

    if (!base64) {
      return null;
    }

    const buffer = Buffer.from(base64, 'base64');
    return safeStorage.decryptString(buffer);
  }

  /**
   * Remove a stored PAT for a project.
   */
  removeToken(projectPath: string): void {
    const key = normalizeProjectPath(projectPath);
    const tokens = this.store.get('tokens', {});
    delete tokens[key];
    this.store.set('tokens', tokens);
  }

  /**
   * Store a GitHub Enterprise URL for a project.
   * Enterprise URLs are not sensitive and do not require encryption.
   */
  storeEnterpriseUrl(projectPath: string, url: string): void {
    const key = normalizeProjectPath(projectPath);
    const urls = this.store.get('enterpriseUrls', {});
    urls[key] = url;
    this.store.set('enterpriseUrls', urls);
  }

  /**
   * Get the stored GitHub Enterprise URL for a project.
   * @returns The enterprise URL, or null if not configured
   */
  getEnterpriseUrl(projectPath: string): string | null {
    const key = normalizeProjectPath(projectPath);
    const urls = this.store.get('enterpriseUrls', {});
    return urls[key] ?? null;
  }

  /**
   * Remove the stored GitHub Enterprise URL for a project.
   */
  removeEnterpriseUrl(projectPath: string): void {
    const key = normalizeProjectPath(projectPath);
    const urls = this.store.get('enterpriseUrls', {});
    delete urls[key];
    this.store.set('enterpriseUrls', urls);
  }

  /**
   * Check if credentials (token) are stored for a project.
   */
  hasCredentials(projectPath: string): boolean {
    const key = normalizeProjectPath(projectPath);
    const tokens = this.store.get('tokens', {});
    return key in tokens;
  }
}
