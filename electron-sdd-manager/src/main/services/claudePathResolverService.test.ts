/**
 * ClaudePathResolverService Unit Tests
 * TDD: Testing claude command path resolution
 * Requirements: 1.1, 1.2, 1.3, 2.1, 2.4
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  ClaudePathResolverService,
  type ExecDeps,
  type ClaudePathResolutionResult,
} from './claudePathResolverService';

describe('ClaudePathResolverService', () => {
  // Store original env
  const originalEnv = process.env;

  // Mock exec dependencies
  const createExecDeps = (overrides: Partial<ExecDeps> = {}): ExecDeps => ({
    execAsync: vi.fn().mockRejectedValue(new Error('not found')),
    ...overrides,
  });

  beforeEach(() => {
    vi.clearAllMocks();
    // Reset environment variables
    process.env = { ...originalEnv };
    delete process.env.E2E_MOCK_CLAUDE_COMMAND;
    delete process.env.SHELL;
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('resolveClaudePath', () => {
    it('should resolve claude path using login shell with which command', async () => {
      // Requirement 1.1: Execute `which claude` within login shell
      const execDeps = createExecDeps({
        execAsync: vi.fn().mockResolvedValue({
          stdout: '/usr/local/bin/claude\n',
          stderr: '',
        }),
      });

      const service = new ClaudePathResolverService(execDeps);
      process.env.SHELL = '/bin/zsh';

      const result = await service.resolveClaudePath();

      expect(result.resolved).toBe(true);
      expect(result.path).toBe('/usr/local/bin/claude');
      expect(execDeps.execAsync).toHaveBeenCalledWith(
        "/bin/zsh -il -c 'which claude'",
        expect.any(Object)
      );
    });

    it('should use $SHELL environment variable for shell detection', async () => {
      // Requirement 1.2: Use $SHELL with -l flag
      const execDeps = createExecDeps({
        execAsync: vi.fn().mockResolvedValue({
          stdout: '/opt/homebrew/bin/claude\n',
          stderr: '',
        }),
      });

      const service = new ClaudePathResolverService(execDeps);
      process.env.SHELL = '/bin/bash';

      await service.resolveClaudePath();

      expect(execDeps.execAsync).toHaveBeenCalledWith(
        "/bin/bash -il -c 'which claude'",
        expect.any(Object)
      );
    });

    it('should fallback to /bin/sh when $SHELL is not set', async () => {
      // Requirement 1.2: Fallback to /bin/sh
      const execDeps = createExecDeps({
        execAsync: vi.fn().mockResolvedValue({
          stdout: '/usr/bin/claude\n',
          stderr: '',
        }),
      });

      const service = new ClaudePathResolverService(execDeps);
      delete process.env.SHELL;

      await service.resolveClaudePath();

      expect(execDeps.execAsync).toHaveBeenCalledWith(
        "/bin/sh -il -c 'which claude'",
        expect.any(Object)
      );
    });

    it('should cache the resolved path after first resolution', async () => {
      // Requirement 1.3: Cache resolved path for session
      const execDeps = createExecDeps({
        execAsync: vi.fn().mockResolvedValue({
          stdout: '/usr/local/bin/claude\n',
          stderr: '',
        }),
      });

      const service = new ClaudePathResolverService(execDeps);
      process.env.SHELL = '/bin/zsh';

      // First call
      const result1 = await service.resolveClaudePath();
      // Second call should use cache
      const result2 = await service.resolveClaudePath();

      expect(result1.resolved).toBe(true);
      expect(result2.resolved).toBe(true);
      expect(result1.path).toBe(result2.path);
      // execAsync should only be called once
      expect(execDeps.execAsync).toHaveBeenCalledTimes(1);
    });

    it('should return error result when which command fails', async () => {
      // Requirement 2.1, 2.4: Return error on failure, no fallback
      const execDeps = createExecDeps({
        execAsync: vi.fn().mockRejectedValue(new Error('command not found')),
      });

      const service = new ClaudePathResolverService(execDeps);
      process.env.SHELL = '/bin/zsh';

      const result = await service.resolveClaudePath();

      expect(result.resolved).toBe(false);
      expect(result.path).toBeUndefined();
      expect(result.error).toBeDefined();
    });

    it('should return error result when which returns empty output', async () => {
      // Requirement 2.1: Empty output means claude not found
      const execDeps = createExecDeps({
        execAsync: vi.fn().mockResolvedValue({
          stdout: '',
          stderr: '',
        }),
      });

      const service = new ClaudePathResolverService(execDeps);
      process.env.SHELL = '/bin/zsh';

      const result = await service.resolveClaudePath();

      expect(result.resolved).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should extract path from last line when session restore messages are present', async () => {
      // Handle macOS zsh session restore messages (e.g., "Restored session: ...")
      const execDeps = createExecDeps({
        execAsync: vi.fn().mockResolvedValue({
          stdout: 'Restored session: 2026年 2月 4日 水曜日 12時00分00秒 JST\n/opt/homebrew/bin/claude\n',
          stderr: '',
        }),
      });

      const service = new ClaudePathResolverService(execDeps);
      process.env.SHELL = '/bin/zsh';

      const result = await service.resolveClaudePath();

      expect(result.resolved).toBe(true);
      expect(result.path).toBe('/opt/homebrew/bin/claude');
    });

    it('should handle timeout gracefully', async () => {
      // Design: 5 second timeout for shell command
      const execDeps = createExecDeps({
        execAsync: vi.fn().mockImplementation(() => {
          return new Promise((_, reject) => {
            setTimeout(() => reject(new Error('ETIMEDOUT')), 100);
          });
        }),
      });

      const service = new ClaudePathResolverService(execDeps);
      process.env.SHELL = '/bin/zsh';

      const result = await service.resolveClaudePath();

      expect(result.resolved).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should pass timeout option to execAsync', async () => {
      const execDeps = createExecDeps({
        execAsync: vi.fn().mockResolvedValue({
          stdout: '/usr/local/bin/claude\n',
          stderr: '',
        }),
      });

      const service = new ClaudePathResolverService(execDeps);
      process.env.SHELL = '/bin/zsh';

      await service.resolveClaudePath();

      expect(execDeps.execAsync).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({ timeout: 5000 })
      );
    });
  });

  describe('getClaudePath', () => {
    it('should return cached path when resolved', async () => {
      const execDeps = createExecDeps({
        execAsync: vi.fn().mockResolvedValue({
          stdout: '/usr/local/bin/claude\n',
          stderr: '',
        }),
      });

      const service = new ClaudePathResolverService(execDeps);
      process.env.SHELL = '/bin/zsh';

      await service.resolveClaudePath();
      const path = service.getClaudePath();

      expect(path).toBe('/usr/local/bin/claude');
    });

    it('should return "claude" when not resolved', () => {
      const execDeps = createExecDeps();
      const service = new ClaudePathResolverService(execDeps);

      const path = service.getClaudePath();

      expect(path).toBe('claude');
    });

    it('should return "claude" when resolution failed', async () => {
      const execDeps = createExecDeps({
        execAsync: vi.fn().mockRejectedValue(new Error('not found')),
      });

      const service = new ClaudePathResolverService(execDeps);
      process.env.SHELL = '/bin/zsh';

      await service.resolveClaudePath();
      const path = service.getClaudePath();

      expect(path).toBe('claude');
    });

    it('should return E2E_MOCK_CLAUDE_COMMAND when set', async () => {
      // E2E test support
      const execDeps = createExecDeps({
        execAsync: vi.fn().mockResolvedValue({
          stdout: '/usr/local/bin/claude\n',
          stderr: '',
        }),
      });

      process.env.E2E_MOCK_CLAUDE_COMMAND = '/mock/claude';
      const service = new ClaudePathResolverService(execDeps);

      // Even after resolution, E2E mock should take precedence
      await service.resolveClaudePath();
      const path = service.getClaudePath();

      expect(path).toBe('/mock/claude');
    });

    it('should return E2E_MOCK_CLAUDE_COMMAND without calling resolveClaudePath', () => {
      // E2E test support - should work even without resolution
      const execDeps = createExecDeps();
      process.env.E2E_MOCK_CLAUDE_COMMAND = '/mock/claude';

      const service = new ClaudePathResolverService(execDeps);
      const path = service.getClaudePath();

      expect(path).toBe('/mock/claude');
      expect(execDeps.execAsync).not.toHaveBeenCalled();
    });
  });

  describe('isResolved', () => {
    it('should return false before resolution', () => {
      const execDeps = createExecDeps();
      const service = new ClaudePathResolverService(execDeps);

      expect(service.isResolved()).toBe(false);
    });

    it('should return true after successful resolution', async () => {
      const execDeps = createExecDeps({
        execAsync: vi.fn().mockResolvedValue({
          stdout: '/usr/local/bin/claude\n',
          stderr: '',
        }),
      });

      const service = new ClaudePathResolverService(execDeps);
      process.env.SHELL = '/bin/zsh';

      await service.resolveClaudePath();

      expect(service.isResolved()).toBe(true);
    });

    it('should return false after failed resolution', async () => {
      const execDeps = createExecDeps({
        execAsync: vi.fn().mockRejectedValue(new Error('not found')),
      });

      const service = new ClaudePathResolverService(execDeps);
      process.env.SHELL = '/bin/zsh';

      await service.resolveClaudePath();

      expect(service.isResolved()).toBe(false);
    });
  });

  describe('singleton pattern', () => {
    it('should return same instance when calling getClaudePathResolverService', async () => {
      // This test verifies the singleton getter function
      // Will be implemented when we add the singleton export
      const { getClaudePathResolverService } = await import('./claudePathResolverService');

      const instance1 = getClaudePathResolverService();
      const instance2 = getClaudePathResolverService();

      expect(instance1).toBe(instance2);
    });
  });
});
