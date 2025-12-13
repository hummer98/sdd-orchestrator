/**
 * ProviderFactory Unit Tests
 * TDD: Testing provider switching functionality
 * Requirements: 7.1, 7.2
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock logger first to avoid Electron app dependency
vi.mock('../logger', () => ({
  logger: {
    info: vi.fn(),
    debug: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

describe('ProviderFactory', () => {
  let ProviderFactory: typeof import('./providerFactory').ProviderFactory;

  // Mock connection service
  const mockConnectionService = {
    getStatus: vi.fn(() => 'connected'),
    getSFTPClient: vi.fn(() => ({ ok: true, value: {} })),
    getSSHClient: vi.fn(() => ({ ok: true, value: {} })),
    executeCommand: vi.fn(),
    onStatusChange: vi.fn(() => () => {}),
  };

  beforeEach(async () => {
    vi.resetAllMocks();

    // Dynamically import to get fresh module
    const module = await import('./providerFactory');
    ProviderFactory = module.ProviderFactory;
  });

  describe('getFileSystemProvider', () => {
    it('should return LocalFileSystemProvider for local project', () => {
      const factory = new ProviderFactory();
      const provider = factory.getFileSystemProvider('local');

      expect(provider.type).toBe('local');
    });

    it('should return SSHFileSystemProvider for SSH project', () => {
      const factory = new ProviderFactory();
      factory.setSSHConnectionService(mockConnectionService as any);
      const provider = factory.getFileSystemProvider('ssh');

      expect(provider.type).toBe('ssh');
    });

    it('should throw error when SSH provider requested but not configured', () => {
      const factory = new ProviderFactory();

      expect(() => factory.getFileSystemProvider('ssh')).toThrow();
    });

    it('should cache provider instances', () => {
      const factory = new ProviderFactory();
      const provider1 = factory.getFileSystemProvider('local');
      const provider2 = factory.getFileSystemProvider('local');

      expect(provider1).toBe(provider2);
    });
  });

  describe('getProcessProvider', () => {
    it('should return LocalProcessProvider for local project', () => {
      const factory = new ProviderFactory();
      const provider = factory.getProcessProvider('local');

      expect(provider.type).toBe('local');
    });

    it('should return SSHProcessProvider for SSH project', () => {
      const factory = new ProviderFactory();
      factory.setSSHConnectionService(mockConnectionService as any);
      const provider = factory.getProcessProvider('ssh');

      expect(provider.type).toBe('ssh');
    });

    it('should throw error when SSH provider requested but not configured', () => {
      const factory = new ProviderFactory();

      expect(() => factory.getProcessProvider('ssh')).toThrow();
    });

    it('should cache provider instances', () => {
      const factory = new ProviderFactory();
      const provider1 = factory.getProcessProvider('local');
      const provider2 = factory.getProcessProvider('local');

      expect(provider1).toBe(provider2);
    });
  });

  describe('setSSHConnectionService', () => {
    it('should enable SSH providers', () => {
      const factory = new ProviderFactory();
      factory.setSSHConnectionService(mockConnectionService as any);

      // Should not throw now
      expect(() => factory.getFileSystemProvider('ssh')).not.toThrow();
      expect(() => factory.getProcessProvider('ssh')).not.toThrow();
    });

    it('should clear cached SSH providers when connection changes', () => {
      const factory = new ProviderFactory();
      factory.setSSHConnectionService(mockConnectionService as any);
      const provider1 = factory.getFileSystemProvider('ssh');

      // Set a new connection service
      factory.setSSHConnectionService({
        ...mockConnectionService,
        getStatus: vi.fn(() => 'connected'),
      } as any);
      const provider2 = factory.getFileSystemProvider('ssh');

      // Should be different instances
      expect(provider1).not.toBe(provider2);
    });
  });

  describe('clearSSHProviders', () => {
    it('should clear cached SSH providers', () => {
      const factory = new ProviderFactory();
      factory.setSSHConnectionService(mockConnectionService as any);
      const provider1 = factory.getFileSystemProvider('ssh');

      factory.clearSSHProviders();
      factory.setSSHConnectionService(mockConnectionService as any);
      const provider2 = factory.getFileSystemProvider('ssh');

      expect(provider1).not.toBe(provider2);
    });
  });

  describe('getProviderType', () => {
    it('should return "local" for local path', () => {
      const factory = new ProviderFactory();
      expect(factory.getProviderType('/home/user/project')).toBe('local');
    });

    it('should return "ssh" for SSH URI', () => {
      const factory = new ProviderFactory();
      expect(factory.getProviderType('ssh://user@host/path')).toBe('ssh');
    });

    it('should return "local" for Windows-style paths', () => {
      const factory = new ProviderFactory();
      expect(factory.getProviderType('C:\\Users\\project')).toBe('local');
    });
  });

  describe('hasActiveSSHConnection', () => {
    it('should return false when no SSH connection configured', () => {
      const factory = new ProviderFactory();
      expect(factory.hasActiveSSHConnection()).toBe(false);
    });

    it('should return true when SSH connection is active', () => {
      const factory = new ProviderFactory();
      factory.setSSHConnectionService(mockConnectionService as any);
      expect(factory.hasActiveSSHConnection()).toBe(true);
    });
  });
});
