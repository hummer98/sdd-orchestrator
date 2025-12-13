/**
 * Host Key Manager
 * Manages SSH host key verification and known_hosts file
 * Requirements: 9.1, 9.2, 9.3
 */

import * as fs from 'fs/promises';
import * as os from 'os';
import * as path from 'path';
import * as crypto from 'crypto';

/**
 * Host key verification result types
 */
export type HostKeyVerificationResult =
  | { status: 'known'; fingerprint: string }
  | { status: 'unknown'; fingerprint: string }
  | { status: 'changed'; oldFingerprint: string; newFingerprint: string };

/**
 * Host Key Manager
 * Handles host key verification and known_hosts file management
 */
export class HostKeyManager {
  private knownHostsPath: string;

  constructor() {
    this.knownHostsPath = path.join(os.homedir(), '.ssh', 'known_hosts');
  }

  /**
   * Calculate fingerprint of a host key
   *
   * @param key - The host key buffer
   * @param algorithm - Hash algorithm ('sha256' or 'md5')
   * @returns Fingerprint string with algorithm prefix
   */
  getFingerprint(key: Buffer, algorithm: 'sha256' | 'md5' = 'sha256'): string {
    const hash = crypto.createHash(algorithm).update(key).digest();

    if (algorithm === 'sha256') {
      return `SHA256:${hash.toString('base64').replace(/=+$/, '')}`;
    } else {
      // MD5 fingerprint as colon-separated hex
      const hexPairs: string[] = [];
      for (let i = 0; i < hash.length; i++) {
        hexPairs.push(hash[i].toString(16).padStart(2, '0'));
      }
      return `MD5:${hexPairs.join(':')}`;
    }
  }

  /**
   * Verify a host key against known_hosts
   *
   * @param host - Hostname
   * @param port - SSH port
   * @param key - Host key buffer
   * @returns Verification result
   */
  async verifyHostKey(
    host: string,
    port: number,
    key: Buffer
  ): Promise<HostKeyVerificationResult> {
    const fingerprint = this.getFingerprint(key);

    try {
      const content = await fs.readFile(this.knownHostsPath, 'utf-8');
      const lines = content.split('\n');

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) continue;

        const [storedHost, storedKeyType, storedKeyData] = trimmed.split(/\s+/);

        if (this.hostMatches(storedHost, host, port)) {
          // Host found, check if key matches
          const storedKey = Buffer.from(`${storedKeyType} ${storedKeyData}`);

          // Compare key data (simplified comparison)
          if (this.keysMatch(key, trimmed)) {
            return { status: 'known', fingerprint };
          } else {
            const oldFingerprint = this.getFingerprint(storedKey);
            return {
              status: 'changed',
              oldFingerprint,
              newFingerprint: fingerprint,
            };
          }
        }
      }

      // Host not found
      return { status: 'unknown', fingerprint };
    } catch (error: unknown) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        // known_hosts doesn't exist
        return { status: 'unknown', fingerprint };
      }
      throw error;
    }
  }

  /**
   * Accept and save a host key to known_hosts
   *
   * @param host - Hostname
   * @param port - SSH port
   * @param key - Host key buffer
   */
  async acceptHostKey(host: string, port: number, key: Buffer): Promise<void> {
    const hostPattern = this.formatHostPattern(host, port);
    const keyString = key.toString();
    const newEntry = `${hostPattern} ${keyString}\n`;

    // Ensure .ssh directory exists
    const sshDir = path.dirname(this.knownHostsPath);
    await fs.mkdir(sshDir, { recursive: true, mode: 0o700 });

    let existingContent = '';
    try {
      existingContent = await fs.readFile(this.knownHostsPath, 'utf-8');
    } catch (error: unknown) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
        throw error;
      }
    }

    // Remove existing entry for this host if present
    const lines = existingContent.split('\n');
    const filteredLines = lines.filter((line) => {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) return true;
      const [storedHost] = trimmed.split(/\s+/);
      return !this.hostMatches(storedHost, host, port);
    });

    // Add new entry
    let newContent = filteredLines.join('\n');
    if (newContent && !newContent.endsWith('\n')) {
      newContent += '\n';
    }
    newContent += newEntry;

    await fs.writeFile(this.knownHostsPath, newContent, { mode: 0o600 });
  }

  /**
   * Remove a host entry from known_hosts
   *
   * @param host - Hostname
   * @param port - SSH port
   */
  async removeHostKey(host: string, port: number): Promise<void> {
    try {
      const content = await fs.readFile(this.knownHostsPath, 'utf-8');
      const lines = content.split('\n');

      const filteredLines = lines.filter((line) => {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) return true;
        const [storedHost] = trimmed.split(/\s+/);
        return !this.hostMatches(storedHost, host, port);
      });

      await fs.writeFile(this.knownHostsPath, filteredLines.join('\n'), { mode: 0o600 });
    } catch (error: unknown) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
        throw error;
      }
    }
  }

  /**
   * Format host pattern for known_hosts
   * Uses [host]:port notation for non-standard ports
   */
  private formatHostPattern(host: string, port: number): string {
    if (port === 22) {
      return host;
    }
    return `[${host}]:${port}`;
  }

  /**
   * Check if a stored host pattern matches the given host and port
   */
  private hostMatches(storedHost: string, host: string, port: number): boolean {
    // Check standard port format
    if (port === 22 && storedHost === host) {
      return true;
    }

    // Check non-standard port format [host]:port
    const bracketMatch = storedHost.match(/^\[(.+)\]:(\d+)$/);
    if (bracketMatch) {
      const [, storedHostPart, storedPort] = bracketMatch;
      return storedHostPart === host && parseInt(storedPort, 10) === port;
    }

    // Also check if stored is simple hostname and our port is 22
    if (port === 22 && storedHost === host) {
      return true;
    }

    return false;
  }

  /**
   * Check if keys match (simplified - compare key data from line)
   */
  private keysMatch(key: Buffer, knownHostsLine: string): boolean {
    const keyString = key.toString();
    // Extract key type and data from our key
    const keyParts = keyString.split(/\s+/);
    if (keyParts.length < 2) return false;

    // Check if the known_hosts line contains our key data
    return knownHostsLine.includes(keyParts[0]) && knownHostsLine.includes(keyParts[1]);
  }
}

// Export singleton instance
export const hostKeyManager = new HostKeyManager();
