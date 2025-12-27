/**
 * CloudflaredBinaryChecker Unit Tests
 * TDD: Testing cloudflared binary detection
 * Requirements: 4.1, 4.2
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CloudflaredBinaryChecker, FsDeps, ExecDeps } from './cloudflaredBinaryChecker';

describe('CloudflaredBinaryChecker', () => {
  // Mock CloudflareConfigStore
  const mockConfigStore = {
    getCloudflaredPath: vi.fn(),
  };

  // Mock fs dependencies
  const createFsDeps = (overrides: Partial<FsDeps> = {}): FsDeps => ({
    existsSync: vi.fn().mockReturnValue(false),
    accessSync: vi.fn(),
    constants: { X_OK: 1 },
    ...overrides,
  });

  // Mock exec dependencies
  const createExecDeps = (overrides: Partial<ExecDeps> = {}): ExecDeps => ({
    execAsync: vi.fn().mockRejectedValue(new Error('not found')),
    ...overrides,
  });

  beforeEach(() => {
    vi.clearAllMocks();
    mockConfigStore.getCloudflaredPath.mockReset();
  });

  describe('checkBinaryExists', () => {
    it('should return custom path when set and valid', async () => {
      const customPath = '/custom/path/cloudflared';
      mockConfigStore.getCloudflaredPath.mockReturnValue(customPath);

      const fsDeps = createFsDeps({
        existsSync: vi.fn().mockReturnValue(true),
        accessSync: vi.fn(),
      });

      const checker = new CloudflaredBinaryChecker(
        mockConfigStore as any,
        fsDeps,
        createExecDeps()
      );

      const result = await checker.checkBinaryExists();

      expect(result.exists).toBe(true);
      if (result.exists) {
        expect(result.path).toBe(customPath);
      }
    });

    it('should fall back to which command when custom path is not set', async () => {
      mockConfigStore.getCloudflaredPath.mockReturnValue(null);

      const execDeps = createExecDeps({
        execAsync: vi.fn().mockResolvedValue({
          stdout: '/usr/local/bin/cloudflared\n',
          stderr: '',
        }),
      });

      const checker = new CloudflaredBinaryChecker(
        mockConfigStore as any,
        createFsDeps(),
        execDeps
      );

      const result = await checker.checkBinaryExists();

      expect(result.exists).toBe(true);
      if (result.exists) {
        expect(result.path).toBe('/usr/local/bin/cloudflared');
      }
    });

    it('should check common paths when which fails', async () => {
      mockConfigStore.getCloudflaredPath.mockReturnValue(null);

      const fsDeps = createFsDeps({
        existsSync: vi.fn().mockImplementation((path: string) => {
          return path === '/usr/local/bin/cloudflared';
        }),
        accessSync: vi.fn(),
      });

      const execDeps = createExecDeps({
        execAsync: vi.fn().mockRejectedValue(new Error('not found')),
      });

      const checker = new CloudflaredBinaryChecker(
        mockConfigStore as any,
        fsDeps,
        execDeps
      );

      const result = await checker.checkBinaryExists();

      expect(result.exists).toBe(true);
      if (result.exists) {
        expect(result.path).toBe('/usr/local/bin/cloudflared');
      }
    });

    it('should check /opt/homebrew/bin for Apple Silicon Macs', async () => {
      mockConfigStore.getCloudflaredPath.mockReturnValue(null);

      const fsDeps = createFsDeps({
        existsSync: vi.fn().mockImplementation((path: string) => {
          return path === '/opt/homebrew/bin/cloudflared';
        }),
        accessSync: vi.fn(),
      });

      const execDeps = createExecDeps({
        execAsync: vi.fn().mockRejectedValue(new Error('not found')),
      });

      const checker = new CloudflaredBinaryChecker(
        mockConfigStore as any,
        fsDeps,
        execDeps
      );

      const result = await checker.checkBinaryExists();

      expect(result.exists).toBe(true);
      if (result.exists) {
        expect(result.path).toBe('/opt/homebrew/bin/cloudflared');
      }
    });

    it('should return false when binary not found', async () => {
      mockConfigStore.getCloudflaredPath.mockReturnValue(null);

      const fsDeps = createFsDeps({
        existsSync: vi.fn().mockReturnValue(false),
      });

      const execDeps = createExecDeps({
        execAsync: vi.fn().mockRejectedValue(new Error('not found')),
      });

      const checker = new CloudflaredBinaryChecker(
        mockConfigStore as any,
        fsDeps,
        execDeps
      );

      const result = await checker.checkBinaryExists();

      expect(result.exists).toBe(false);
    });

    it('should return false when custom path is set but not executable', async () => {
      const customPath = '/custom/path/cloudflared';
      mockConfigStore.getCloudflaredPath.mockReturnValue(customPath);

      const fsDeps = createFsDeps({
        existsSync: vi.fn().mockReturnValue(true),
        accessSync: vi.fn().mockImplementation(() => {
          throw new Error('Permission denied');
        }),
      });

      const checker = new CloudflaredBinaryChecker(
        mockConfigStore as any,
        fsDeps,
        createExecDeps()
      );

      const result = await checker.checkBinaryExists();

      expect(result.exists).toBe(false);
    });
  });

  describe('getInstallInstructions', () => {
    it('should return installation instructions for macOS', () => {
      const checker = new CloudflaredBinaryChecker(
        mockConfigStore as any,
        createFsDeps(),
        createExecDeps()
      );

      const instructions = checker.getInstallInstructions();

      expect(instructions.homebrew).toBe('brew install cloudflared');
      expect(instructions.macports).toBe('sudo port install cloudflared');
      expect(instructions.downloadUrl).toContain('cloudflare');
    });
  });

  describe('isExecutable', () => {
    it('should return true for executable file', () => {
      const fsDeps = createFsDeps({
        existsSync: vi.fn().mockReturnValue(true),
        accessSync: vi.fn(),
      });

      const checker = new CloudflaredBinaryChecker(
        mockConfigStore as any,
        fsDeps,
        createExecDeps()
      );

      const result = checker.isExecutable('/path/to/binary');

      expect(result).toBe(true);
    });

    it('should return false for non-existent file', () => {
      const fsDeps = createFsDeps({
        existsSync: vi.fn().mockReturnValue(false),
      });

      const checker = new CloudflaredBinaryChecker(
        mockConfigStore as any,
        fsDeps,
        createExecDeps()
      );

      const result = checker.isExecutable('/path/to/binary');

      expect(result).toBe(false);
    });

    it('should return false for non-executable file', () => {
      const fsDeps = createFsDeps({
        existsSync: vi.fn().mockReturnValue(true),
        accessSync: vi.fn().mockImplementation(() => {
          throw new Error('EACCES');
        }),
      });

      const checker = new CloudflaredBinaryChecker(
        mockConfigStore as any,
        fsDeps,
        createExecDeps()
      );

      const result = checker.isExecutable('/path/to/binary');

      expect(result).toBe(false);
    });
  });
});
