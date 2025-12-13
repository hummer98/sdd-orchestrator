/**
 * Provider Factory
 * Manages FileSystemProvider and ProcessProvider instances for local/SSH projects
 * Requirements: 7.1, 7.2
 */

import type { FileSystemProvider } from './fileSystemProvider';
import type { ProcessProvider } from './processProvider';
import type { SSHConnectionService } from './sshConnectionService';
import { LocalFileSystemProvider } from './fileSystemProvider';
import { LocalProcessProvider } from './processProvider';
import { SSHFileSystemProvider } from './sshFileSystemProvider';
import { SSHProcessProvider } from './sshProcessProvider';
import { logger } from '../logger';

export type ProviderType = 'local' | 'ssh';

/**
 * Provider Factory
 * Creates and caches FileSystemProvider and ProcessProvider instances
 */
export class ProviderFactory {
  private localFileSystemProvider: LocalFileSystemProvider | null = null;
  private localProcessProvider: LocalProcessProvider | null = null;
  private sshFileSystemProvider: SSHFileSystemProvider | null = null;
  private sshProcessProvider: SSHProcessProvider | null = null;
  private sshConnectionService: SSHConnectionService | null = null;

  /**
   * Get FileSystemProvider for the given type
   */
  getFileSystemProvider(type: ProviderType): FileSystemProvider {
    if (type === 'local') {
      if (!this.localFileSystemProvider) {
        this.localFileSystemProvider = new LocalFileSystemProvider();
        logger.debug('[ProviderFactory] Created LocalFileSystemProvider');
      }
      return this.localFileSystemProvider;
    }

    // SSH type
    if (!this.sshConnectionService) {
      throw new Error('SSH connection service not configured. Call setSSHConnectionService first.');
    }

    if (!this.sshFileSystemProvider) {
      this.sshFileSystemProvider = new SSHFileSystemProvider(this.sshConnectionService);
      logger.debug('[ProviderFactory] Created SSHFileSystemProvider');
    }
    return this.sshFileSystemProvider;
  }

  /**
   * Get ProcessProvider for the given type
   */
  getProcessProvider(type: ProviderType): ProcessProvider {
    if (type === 'local') {
      if (!this.localProcessProvider) {
        this.localProcessProvider = new LocalProcessProvider();
        logger.debug('[ProviderFactory] Created LocalProcessProvider');
      }
      return this.localProcessProvider;
    }

    // SSH type
    if (!this.sshConnectionService) {
      throw new Error('SSH connection service not configured. Call setSSHConnectionService first.');
    }

    if (!this.sshProcessProvider) {
      this.sshProcessProvider = new SSHProcessProvider(this.sshConnectionService);
      logger.debug('[ProviderFactory] Created SSHProcessProvider');
    }
    return this.sshProcessProvider;
  }

  /**
   * Set SSH connection service for creating SSH providers
   */
  setSSHConnectionService(connectionService: SSHConnectionService): void {
    // Clear cached SSH providers when connection changes
    this.clearSSHProviders();
    this.sshConnectionService = connectionService;
    logger.info('[ProviderFactory] SSH connection service configured');
  }

  /**
   * Clear cached SSH providers
   * Call this when SSH connection is closed or changed
   */
  clearSSHProviders(): void {
    this.sshFileSystemProvider = null;
    this.sshProcessProvider = null;
    logger.debug('[ProviderFactory] SSH providers cleared');
  }

  /**
   * Determine provider type from path
   * Returns 'ssh' for SSH URIs, 'local' for local paths
   */
  getProviderType(path: string): ProviderType {
    if (path.startsWith('ssh://')) {
      return 'ssh';
    }
    return 'local';
  }

  /**
   * Check if SSH connection is configured
   */
  hasActiveSSHConnection(): boolean {
    return this.sshConnectionService !== null;
  }

  /**
   * Get the current SSH connection service
   */
  getSSHConnectionService(): SSHConnectionService | null {
    return this.sshConnectionService;
  }
}

// Export singleton instance
export const providerFactory = new ProviderFactory();
