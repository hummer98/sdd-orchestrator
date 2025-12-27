/**
 * CloudflareTunnelManager Unit Tests
 * TDD: Testing Cloudflare Tunnel process management
 * Requirements: 2.1, 2.4, 4.3, 4.4
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { EventEmitter } from 'events';
import type { ChildProcess } from 'child_process';
import {
  CloudflareTunnelManager,
  TunnelStartResult,
  TunnelStatus,
} from './cloudflareTunnelManager';

// Create mock child process
const createMockChildProcess = (): EventEmitter & Partial<ChildProcess> & {
  stdout: EventEmitter;
  stderr: EventEmitter;
  kill: ReturnType<typeof vi.fn>;
  pid: number;
} => {
  const process = new EventEmitter() as EventEmitter & Partial<ChildProcess> & {
    stdout: EventEmitter;
    stderr: EventEmitter;
    kill: ReturnType<typeof vi.fn>;
    pid: number;
  };
  process.stdout = new EventEmitter();
  process.stderr = new EventEmitter();
  process.kill = vi.fn().mockReturnValue(true);
  process.pid = 12345;
  return process;
};

describe('CloudflareTunnelManager', () => {
  // Mock dependencies
  const mockConfigStore = {
    getTunnelToken: vi.fn(),
    getCloudflaredPath: vi.fn(),
    getAccessToken: vi.fn(),
  };

  const mockBinaryChecker = {
    checkBinaryExists: vi.fn(),
    isExecutable: vi.fn(),
    getInstallInstructions: vi.fn(),
  };

  const mockSpawn = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    mockConfigStore.getTunnelToken.mockReturnValue('test-token');
    mockConfigStore.getCloudflaredPath.mockReturnValue(null);
    mockConfigStore.getAccessToken.mockReturnValue('abc123');
    mockBinaryChecker.checkBinaryExists.mockResolvedValue({
      exists: true,
      path: '/usr/local/bin/cloudflared',
    });
  });

  describe('start', () => {
    it('should start tunnel and parse URL from stdout', async () => {
      const mockProcess = createMockChildProcess();
      mockSpawn.mockReturnValue(mockProcess);

      const manager = new CloudflareTunnelManager(
        mockConfigStore as any,
        mockBinaryChecker as any,
        mockSpawn
      );

      // Start tunnel in background
      const startPromise = manager.start(8765);

      // Simulate cloudflared output
      setTimeout(() => {
        mockProcess.stdout.emit(
          'data',
          Buffer.from('2024-01-01 Your quick Tunnel has been created! Visit it at: https://test-tunnel.trycloudflare.com\n')
        );
      }, 10);

      const result = await startPromise;

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.url).toBe('https://test-tunnel.trycloudflare.com');
        expect(result.value.pid).toBe(12345);
      }
    });

    it('should fail when tunnel token is not configured', async () => {
      mockConfigStore.getTunnelToken.mockReturnValue(null);

      const manager = new CloudflareTunnelManager(
        mockConfigStore as any,
        mockBinaryChecker as any,
        mockSpawn
      );

      const result = await manager.start(8765);

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.type).toBe('NO_TUNNEL_TOKEN');
      }
    });

    it('should fail when cloudflared binary not found', async () => {
      mockBinaryChecker.checkBinaryExists.mockResolvedValue({ exists: false });
      mockBinaryChecker.getInstallInstructions.mockReturnValue({
        homebrew: 'brew install cloudflared',
      });

      const manager = new CloudflareTunnelManager(
        mockConfigStore as any,
        mockBinaryChecker as any,
        mockSpawn
      );

      const result = await manager.start(8765);

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.type).toBe('BINARY_NOT_FOUND');
      }
    });

    it('should fail when tunnel is already running', async () => {
      const mockProcess = createMockChildProcess();
      mockSpawn.mockReturnValue(mockProcess);

      const manager = new CloudflareTunnelManager(
        mockConfigStore as any,
        mockBinaryChecker as any,
        mockSpawn
      );

      // Start first tunnel
      const startPromise = manager.start(8765);
      setTimeout(() => {
        mockProcess.stdout.emit(
          'data',
          Buffer.from('Visit it at: https://test-tunnel.trycloudflare.com\n')
        );
      }, 10);
      await startPromise;

      // Try to start second tunnel
      const result = await manager.start(8765);

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.type).toBe('ALREADY_RUNNING');
      }
    });

    it('should handle process spawn errors', async () => {
      const mockProcess = createMockChildProcess();
      mockSpawn.mockReturnValue(mockProcess);

      const manager = new CloudflareTunnelManager(
        mockConfigStore as any,
        mockBinaryChecker as any,
        mockSpawn
      );

      // Start tunnel
      const startPromise = manager.start(8765);

      // Simulate error
      setTimeout(() => {
        mockProcess.emit('error', new Error('spawn failed'));
      }, 10);

      const result = await startPromise;

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.type).toBe('SPAWN_ERROR');
      }
    });

    it('should timeout if URL not received within limit', async () => {
      const mockProcess = createMockChildProcess();
      mockSpawn.mockReturnValue(mockProcess);

      const manager = new CloudflareTunnelManager(
        mockConfigStore as any,
        mockBinaryChecker as any,
        mockSpawn
      );

      // Start with short timeout for testing
      const result = await manager.start(8765, { timeout: 50 });

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.type).toBe('TIMEOUT');
      }
    });
  });

  describe('stop', () => {
    it('should stop running tunnel', async () => {
      const mockProcess = createMockChildProcess();
      mockSpawn.mockReturnValue(mockProcess);

      const manager = new CloudflareTunnelManager(
        mockConfigStore as any,
        mockBinaryChecker as any,
        mockSpawn
      );

      // Start tunnel first
      const startPromise = manager.start(8765);
      setTimeout(() => {
        mockProcess.stdout.emit(
          'data',
          Buffer.from('Visit it at: https://test-tunnel.trycloudflare.com\n')
        );
      }, 10);
      await startPromise;

      // Stop tunnel
      const stopPromise = manager.stop();

      // Simulate process exit
      setTimeout(() => {
        mockProcess.emit('exit', 0, null);
      }, 10);

      const result = await stopPromise;

      expect(result.ok).toBe(true);
      expect(mockProcess.kill).toHaveBeenCalled();
    });

    it('should return error when no tunnel is running', async () => {
      const manager = new CloudflareTunnelManager(
        mockConfigStore as any,
        mockBinaryChecker as any,
        mockSpawn
      );

      const result = await manager.stop();

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.type).toBe('NOT_RUNNING');
      }
    });
  });

  describe('getStatus', () => {
    it('should return stopped status when not running', () => {
      const manager = new CloudflareTunnelManager(
        mockConfigStore as any,
        mockBinaryChecker as any,
        mockSpawn
      );

      const status = manager.getStatus();

      expect(status.state).toBe('stopped');
      expect(status.url).toBeNull();
      expect(status.pid).toBeNull();
    });

    it('should return running status when tunnel is active', async () => {
      const mockProcess = createMockChildProcess();
      mockSpawn.mockReturnValue(mockProcess);

      const manager = new CloudflareTunnelManager(
        mockConfigStore as any,
        mockBinaryChecker as any,
        mockSpawn
      );

      const startPromise = manager.start(8765);
      setTimeout(() => {
        mockProcess.stdout.emit(
          'data',
          Buffer.from('Visit it at: https://test-tunnel.trycloudflare.com\n')
        );
      }, 10);
      await startPromise;

      const status = manager.getStatus();

      expect(status.state).toBe('running');
      expect(status.url).toBe('https://test-tunnel.trycloudflare.com');
      expect(status.pid).toBe(12345);
    });
  });

  describe('onStatusChange', () => {
    it('should notify callback when status changes', async () => {
      const mockProcess = createMockChildProcess();
      mockSpawn.mockReturnValue(mockProcess);

      const manager = new CloudflareTunnelManager(
        mockConfigStore as any,
        mockBinaryChecker as any,
        mockSpawn
      );

      const statusCallback = vi.fn();
      const unsubscribe = manager.onStatusChange(statusCallback);

      // Start tunnel
      const startPromise = manager.start(8765);
      setTimeout(() => {
        mockProcess.stdout.emit(
          'data',
          Buffer.from('Visit it at: https://test-tunnel.trycloudflare.com\n')
        );
      }, 10);
      await startPromise;

      expect(statusCallback).toHaveBeenCalled();

      // Unsubscribe
      unsubscribe();
    });
  });

  describe('parseUrlFromOutput', () => {
    it('should parse trycloudflare.com URL from output', () => {
      const manager = new CloudflareTunnelManager(
        mockConfigStore as any,
        mockBinaryChecker as any,
        mockSpawn
      );

      const output = '2024-01-01 Your quick Tunnel has been created! Visit it at: https://abc-def.trycloudflare.com';
      const url = manager.parseUrlFromOutput(output);

      expect(url).toBe('https://abc-def.trycloudflare.com');
    });

    it('should return null for output without URL', () => {
      const manager = new CloudflareTunnelManager(
        mockConfigStore as any,
        mockBinaryChecker as any,
        mockSpawn
      );

      const output = 'Some other log message';
      const url = manager.parseUrlFromOutput(output);

      expect(url).toBeNull();
    });
  });

  describe('getConnectUrl', () => {
    it('should return URL with access token query parameter', async () => {
      const mockProcess = createMockChildProcess();
      mockSpawn.mockReturnValue(mockProcess);

      const manager = new CloudflareTunnelManager(
        mockConfigStore as any,
        mockBinaryChecker as any,
        mockSpawn
      );

      const startPromise = manager.start(8765);
      setTimeout(() => {
        mockProcess.stdout.emit(
          'data',
          Buffer.from('Visit it at: https://test-tunnel.trycloudflare.com\n')
        );
      }, 10);
      await startPromise;

      const connectUrl = manager.getConnectUrl();

      expect(connectUrl).toBe('https://test-tunnel.trycloudflare.com?token=abc123');
    });

    it('should return null when tunnel is not running', () => {
      const manager = new CloudflareTunnelManager(
        mockConfigStore as any,
        mockBinaryChecker as any,
        mockSpawn
      );

      const connectUrl = manager.getConnectUrl();

      expect(connectUrl).toBeNull();
    });
  });
});
