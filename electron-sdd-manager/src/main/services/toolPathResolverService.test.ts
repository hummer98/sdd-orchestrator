/**
 * ToolPathResolverService Unit Tests
 * TDD: Testing unified tool path resolution
 * Requirements: 1.1, 1.2, 1.3, 2.1-2.4, 3.1-3.3, 4.1-4.3, 5.1-5.3, 6.1-6.2, 8.1-8.2
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  ToolPathResolverService,
  TOOL_DEFINITIONS,
  getToolPathResolverService,
  resetToolPathResolverService,
  type ToolDefinition,
  type ToolResolutionResult,
  type ToolStatus,
  type ExecDeps,
} from './toolPathResolverService';

describe('ToolPathResolverService', () => {
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
    delete process.env.E2E_MOCK_JJ_COMMAND;
    delete process.env.E2E_MOCK_JQ_COMMAND;
    delete process.env.SHELL;
    // Reset singleton
    resetToolPathResolverService();
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  // ============================================================
  // Task 1.1: TOOL_DEFINITIONS constant array
  // Requirements: 1.2, 5.1, 5.2, 5.3
  // ============================================================

  describe('TOOL_DEFINITIONS', () => {
    it('should contain claude, jj, and jq tool definitions', () => {
      // Requirement 1.2: Support claude, jj, jq
      const toolNames = TOOL_DEFINITIONS.map((t) => t.name);
      expect(toolNames).toContain('claude');
      expect(toolNames).toContain('jj');
      expect(toolNames).toContain('jq');
    });

    it('should have required fields for each tool', () => {
      // Requirement 5.2: Each tool has name, required, versionCommand, installGuidance
      for (const tool of TOOL_DEFINITIONS) {
        expect(tool).toHaveProperty('name');
        expect(tool).toHaveProperty('required');
        expect(tool).toHaveProperty('versionCommand');
        expect(tool).toHaveProperty('installGuidance');
        expect(typeof tool.name).toBe('string');
        expect(typeof tool.required).toBe('boolean');
        expect(typeof tool.versionCommand).toBe('string');
        expect(typeof tool.installGuidance).toBe('string');
      }
    });

    it('should mark claude as required and jj/jq as not required', () => {
      const claudeTool = TOOL_DEFINITIONS.find((t) => t.name === 'claude');
      const jjTool = TOOL_DEFINITIONS.find((t) => t.name === 'jj');
      const jqTool = TOOL_DEFINITIONS.find((t) => t.name === 'jq');

      expect(claudeTool?.required).toBe(true);
      expect(jjTool?.required).toBe(false);
      expect(jqTool?.required).toBe(false);
    });
  });

  // ============================================================
  // Task 1.2: ToolResolutionResult and ToolStatus types
  // Requirements: 6.1, 6.2
  // ============================================================

  describe('ToolResolutionResult type', () => {
    it('should have resolved, path, version, and error fields', async () => {
      // Requirement 6.1: Resolution result interface
      const execDeps = createExecDeps({
        execAsync: vi.fn().mockResolvedValue({
          stdout: '/usr/local/bin/claude\n',
          stderr: '',
        }),
      });

      const service = new ToolPathResolverService(execDeps);
      process.env.SHELL = '/bin/zsh';

      const result = await service.resolveTool('claude');

      // Check structure of successful result
      expect(result).toHaveProperty('resolved');
      expect(result.resolved).toBe(true);
      expect(result).toHaveProperty('path');
      expect(result.path).toBe('/usr/local/bin/claude');
    });

    it('should return error field on failure', async () => {
      const execDeps = createExecDeps({
        execAsync: vi.fn().mockRejectedValue(new Error('command not found')),
      });

      const service = new ToolPathResolverService(execDeps);
      process.env.SHELL = '/bin/zsh';

      const result = await service.resolveTool('claude');

      expect(result.resolved).toBe(false);
      expect(result.path).toBeUndefined();
      expect(result.error).toBeDefined();
    });
  });

  describe('ToolStatus type', () => {
    it('should combine definition and resolution result', async () => {
      // Requirement 6.2: ToolStatus = definition + resolution
      const execDeps = createExecDeps({
        execAsync: vi.fn().mockResolvedValue({
          stdout: '/usr/local/bin/claude\n',
          stderr: '',
        }),
      });

      const service = new ToolPathResolverService(execDeps);
      process.env.SHELL = '/bin/zsh';

      await service.resolveTool('claude');
      const status = service.getStatus('claude');

      expect(status).toBeDefined();
      expect(status!.definition).toBeDefined();
      expect(status!.definition.name).toBe('claude');
      expect(status!.resolution).toBeDefined();
      expect(status!.resolution.resolved).toBe(true);
    });
  });

  // ============================================================
  // Task 1.3: resolveTool - Single tool path resolution
  // Requirements: 2.1, 2.2, 2.3, 2.4, 8.1, 8.2
  // ============================================================

  describe('resolveTool', () => {
    it('should resolve tool path using login shell with which command', async () => {
      // Requirement 2.1: Execute `which {tool}` within login shell
      const execDeps = createExecDeps({
        execAsync: vi.fn().mockResolvedValue({
          stdout: '/usr/local/bin/claude\n',
          stderr: '',
        }),
      });

      const service = new ToolPathResolverService(execDeps);
      process.env.SHELL = '/bin/zsh';

      const result = await service.resolveTool('claude');

      expect(result.resolved).toBe(true);
      expect(result.path).toBe('/usr/local/bin/claude');
      expect(execDeps.execAsync).toHaveBeenCalledWith(
        "/bin/zsh -il -c 'which claude'",
        expect.any(Object)
      );
    });

    it('should set SHELL_SESSIONS_DISABLE=1 and TERM=dumb to prevent shell output pollution', async () => {
      // Fix for:
      // - "zsh: error on TTY read" and "Saving session..." messages on macOS
      //   See: https://github.com/sindresorhus/pure/issues/664
      // - VSCode shell integration ANSI sequences (]633;P;ContinuationPrompt=...)
      //   corrupting which command output
      const execDeps = createExecDeps({
        execAsync: vi.fn().mockResolvedValue({
          stdout: '/usr/local/bin/claude\n',
          stderr: '',
        }),
      });

      const service = new ToolPathResolverService(execDeps);
      process.env.SHELL = '/bin/zsh';

      await service.resolveTool('claude');

      expect(execDeps.execAsync).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          env: expect.objectContaining({
            SHELL_SESSIONS_DISABLE: '1',
            TERM: 'dumb',
          }),
        })
      );
    });

    it('should use $SHELL environment variable for shell detection', async () => {
      // Requirement 2.2: .zshrc/.zprofile should be loaded
      const execDeps = createExecDeps({
        execAsync: vi.fn().mockResolvedValue({
          stdout: '/opt/homebrew/bin/jj\n',
          stderr: '',
        }),
      });

      const service = new ToolPathResolverService(execDeps);
      process.env.SHELL = '/bin/bash';

      await service.resolveTool('jj');

      expect(execDeps.execAsync).toHaveBeenCalledWith(
        "/bin/bash -il -c 'which jj'",
        expect.any(Object)
      );
    });

    it('should fallback to /bin/sh when $SHELL is not set', async () => {
      // Requirement 2.3: Fallback to /bin/sh
      const execDeps = createExecDeps({
        execAsync: vi.fn().mockResolvedValue({
          stdout: '/usr/bin/jq\n',
          stderr: '',
        }),
      });

      const service = new ToolPathResolverService(execDeps);
      delete process.env.SHELL;

      await service.resolveTool('jq');

      expect(execDeps.execAsync).toHaveBeenCalledWith(
        "/bin/sh -il -c 'which jq'",
        expect.any(Object)
      );
    });

    it('should pass timeout option to execAsync (5 seconds)', async () => {
      // Requirement 2.4: 5 second timeout
      const execDeps = createExecDeps({
        execAsync: vi.fn().mockResolvedValue({
          stdout: '/usr/local/bin/claude\n',
          stderr: '',
        }),
      });

      const service = new ToolPathResolverService(execDeps);
      process.env.SHELL = '/bin/zsh';

      await service.resolveTool('claude');

      expect(execDeps.execAsync).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({ timeout: 5000 })
      );
    });

    it('should return E2E_MOCK_CLAUDE_COMMAND when set', async () => {
      // Requirement 8.1, 8.2: E2E mock environment variable support
      const execDeps = createExecDeps();
      process.env.E2E_MOCK_CLAUDE_COMMAND = '/mock/claude';

      const service = new ToolPathResolverService(execDeps);
      const result = await service.resolveTool('claude');

      expect(result.resolved).toBe(true);
      expect(result.path).toBe('/mock/claude');
      // execAsync should NOT be called when E2E mock is set
      expect(execDeps.execAsync).not.toHaveBeenCalled();
    });

    it('should return E2E_MOCK_JJ_COMMAND when set', async () => {
      // Requirement 8.1: E2E mock for any tool
      const execDeps = createExecDeps();
      process.env.E2E_MOCK_JJ_COMMAND = '/mock/jj';

      const service = new ToolPathResolverService(execDeps);
      const result = await service.resolveTool('jj');

      expect(result.resolved).toBe(true);
      expect(result.path).toBe('/mock/jj');
      expect(execDeps.execAsync).not.toHaveBeenCalled();
    });

    it('should return error result when which command fails', async () => {
      const execDeps = createExecDeps({
        execAsync: vi.fn().mockRejectedValue(new Error('command not found')),
      });

      const service = new ToolPathResolverService(execDeps);
      process.env.SHELL = '/bin/zsh';

      const result = await service.resolveTool('claude');

      expect(result.resolved).toBe(false);
      expect(result.path).toBeUndefined();
      expect(result.error).toBeDefined();
    });

    it('should return error result when which returns empty output', async () => {
      const execDeps = createExecDeps({
        execAsync: vi.fn().mockResolvedValue({
          stdout: '',
          stderr: '',
        }),
      });

      const service = new ToolPathResolverService(execDeps);
      process.env.SHELL = '/bin/zsh';

      const result = await service.resolveTool('claude');

      expect(result.resolved).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should handle timeout gracefully', async () => {
      const execDeps = createExecDeps({
        execAsync: vi.fn().mockImplementation(() => {
          return new Promise((_, reject) => {
            setTimeout(() => reject(new Error('ETIMEDOUT')), 100);
          });
        }),
      });

      const service = new ToolPathResolverService(execDeps);
      process.env.SHELL = '/bin/zsh';

      const result = await service.resolveTool('claude');

      expect(result.resolved).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should retrieve version using versionCommand', async () => {
      const execDeps = createExecDeps({
        execAsync: vi
          .fn()
          .mockResolvedValueOnce({
            stdout: '/usr/local/bin/claude\n',
            stderr: '',
          })
          .mockResolvedValueOnce({
            stdout: 'claude 1.0.0\n',
            stderr: '',
          }),
      });

      const service = new ToolPathResolverService(execDeps);
      process.env.SHELL = '/bin/zsh';

      const result = await service.resolveTool('claude');

      expect(result.resolved).toBe(true);
      expect(result.version).toBe('claude 1.0.0');
    });
  });

  // ============================================================
  // Task 1.4: Session cache
  // Requirements: 3.1, 3.2, 3.3
  // ============================================================

  describe('Session cache', () => {
    it('should cache the resolved path after first resolution', async () => {
      // Requirement 3.1: Cache until session end
      const execDeps = createExecDeps({
        execAsync: vi.fn().mockResolvedValue({
          stdout: '/usr/local/bin/claude\n',
          stderr: '',
        }),
      });

      const service = new ToolPathResolverService(execDeps);
      process.env.SHELL = '/bin/zsh';

      // First call
      const result1 = await service.resolveTool('claude');
      // Second call should use cache
      const result2 = await service.resolveTool('claude');

      expect(result1.resolved).toBe(true);
      expect(result2.resolved).toBe(true);
      expect(result1.path).toBe(result2.path);
      // execAsync should only be called once (once for which, once for version)
      // Actually, due to caching, only the first resolveTool call invokes execAsync
      expect(execDeps.execAsync).toHaveBeenCalledTimes(2); // which + version
    });

    it('should cache failure state as well', async () => {
      // Requirement 3.3: Cache includes success/failure state
      const execDeps = createExecDeps({
        execAsync: vi.fn().mockRejectedValue(new Error('not found')),
      });

      const service = new ToolPathResolverService(execDeps);
      process.env.SHELL = '/bin/zsh';

      // First call - fails
      const result1 = await service.resolveTool('claude');
      // Second call should return cached failure
      const result2 = await service.resolveTool('claude');

      expect(result1.resolved).toBe(false);
      expect(result2.resolved).toBe(false);
      // Only one execAsync call (cached failure)
      expect(execDeps.execAsync).toHaveBeenCalledTimes(1);
    });

    it('should return cached path via getPath immediately', async () => {
      // Requirement 3.2: getPath returns cached value immediately
      const execDeps = createExecDeps({
        execAsync: vi.fn().mockResolvedValue({
          stdout: '/usr/local/bin/claude\n',
          stderr: '',
        }),
      });

      const service = new ToolPathResolverService(execDeps);
      process.env.SHELL = '/bin/zsh';

      await service.resolveTool('claude');
      const path = service.getPath('claude');

      expect(path).toBe('/usr/local/bin/claude');
    });
  });

  // ============================================================
  // Task 1.5: resolveAll and public APIs
  // Requirements: 1.1, 4.1, 4.2, 4.3
  // ============================================================

  describe('resolveAll', () => {
    it('should resolve all registered tools in parallel', async () => {
      // Requirement 4.1, 4.2: Resolve all tools at startup in parallel
      const execDeps = createExecDeps({
        execAsync: vi.fn().mockImplementation((command: string) => {
          if (command.includes('which claude')) {
            return Promise.resolve({ stdout: '/usr/local/bin/claude\n', stderr: '' });
          }
          if (command.includes('which jj')) {
            return Promise.resolve({ stdout: '/opt/homebrew/bin/jj\n', stderr: '' });
          }
          if (command.includes('which jq')) {
            return Promise.resolve({ stdout: '/opt/homebrew/bin/jq\n', stderr: '' });
          }
          // Version commands
          if (command.includes('--version')) {
            return Promise.resolve({ stdout: 'version 1.0\n', stderr: '' });
          }
          return Promise.reject(new Error('unknown command'));
        }),
      });

      const service = new ToolPathResolverService(execDeps);
      process.env.SHELL = '/bin/zsh';

      // Requirement 4.3: Promise completion notification
      await service.resolveAll();

      // All tools should be resolved
      expect(service.isResolved('claude')).toBe(true);
      expect(service.isResolved('jj')).toBe(true);
      expect(service.isResolved('jq')).toBe(true);
    });

    it('should handle partial failures gracefully', async () => {
      const execDeps = createExecDeps({
        execAsync: vi.fn().mockImplementation((command: string) => {
          if (command.includes('which claude')) {
            return Promise.resolve({ stdout: '/usr/local/bin/claude\n', stderr: '' });
          }
          if (command.includes('claude --version')) {
            return Promise.resolve({ stdout: 'claude 1.0\n', stderr: '' });
          }
          // jj and jq not found
          return Promise.reject(new Error('not found'));
        }),
      });

      const service = new ToolPathResolverService(execDeps);
      process.env.SHELL = '/bin/zsh';

      // Should not throw
      await service.resolveAll();

      expect(service.isResolved('claude')).toBe(true);
      expect(service.isResolved('jj')).toBe(false);
      expect(service.isResolved('jq')).toBe(false);
    });
  });

  describe('getPath', () => {
    it('should return cached path when resolved', async () => {
      const execDeps = createExecDeps({
        execAsync: vi.fn().mockResolvedValue({
          stdout: '/usr/local/bin/claude\n',
          stderr: '',
        }),
      });

      const service = new ToolPathResolverService(execDeps);
      process.env.SHELL = '/bin/zsh';

      await service.resolveTool('claude');
      const path = service.getPath('claude');

      expect(path).toBe('/usr/local/bin/claude');
    });

    it('should return tool name when not resolved', () => {
      const execDeps = createExecDeps();
      const service = new ToolPathResolverService(execDeps);

      const path = service.getPath('claude');

      expect(path).toBe('claude');
    });

    it('should return E2E mock path when environment variable is set', () => {
      const execDeps = createExecDeps();
      process.env.E2E_MOCK_CLAUDE_COMMAND = '/mock/claude';

      const service = new ToolPathResolverService(execDeps);
      const path = service.getPath('claude');

      expect(path).toBe('/mock/claude');
    });
  });

  describe('getDefinition', () => {
    it('should return definition for known tool', () => {
      const execDeps = createExecDeps();
      const service = new ToolPathResolverService(execDeps);

      const definition = service.getDefinition('claude');

      expect(definition).toBeDefined();
      expect(definition!.name).toBe('claude');
      expect(definition!.required).toBe(true);
    });

    it('should return undefined for unknown tool', () => {
      const execDeps = createExecDeps();
      const service = new ToolPathResolverService(execDeps);

      const definition = service.getDefinition('unknown');

      expect(definition).toBeUndefined();
    });
  });

  describe('getStatus', () => {
    it('should return status combining definition and resolution', async () => {
      const execDeps = createExecDeps({
        execAsync: vi.fn().mockResolvedValue({
          stdout: '/usr/local/bin/claude\n',
          stderr: '',
        }),
      });

      const service = new ToolPathResolverService(execDeps);
      process.env.SHELL = '/bin/zsh';

      await service.resolveTool('claude');
      const status = service.getStatus('claude');

      expect(status).toBeDefined();
      expect(status!.definition.name).toBe('claude');
      expect(status!.resolution.resolved).toBe(true);
    });

    it('should return undefined for unknown tool', () => {
      const execDeps = createExecDeps();
      const service = new ToolPathResolverService(execDeps);

      const status = service.getStatus('unknown');

      expect(status).toBeUndefined();
    });
  });

  describe('getAllStatuses', () => {
    it('should return status for all defined tools', async () => {
      const execDeps = createExecDeps({
        execAsync: vi.fn().mockResolvedValue({
          stdout: '/usr/local/bin/tool\n',
          stderr: '',
        }),
      });

      const service = new ToolPathResolverService(execDeps);
      process.env.SHELL = '/bin/zsh';

      await service.resolveAll();
      const statuses = service.getAllStatuses();

      expect(statuses.length).toBe(TOOL_DEFINITIONS.length);
      for (const status of statuses) {
        expect(status.definition).toBeDefined();
        expect(status.resolution).toBeDefined();
      }
    });
  });

  describe('isResolved', () => {
    it('should return false before resolution', () => {
      const execDeps = createExecDeps();
      const service = new ToolPathResolverService(execDeps);

      expect(service.isResolved('claude')).toBe(false);
    });

    it('should return true after successful resolution', async () => {
      const execDeps = createExecDeps({
        execAsync: vi.fn().mockResolvedValue({
          stdout: '/usr/local/bin/claude\n',
          stderr: '',
        }),
      });

      const service = new ToolPathResolverService(execDeps);
      process.env.SHELL = '/bin/zsh';

      await service.resolveTool('claude');

      expect(service.isResolved('claude')).toBe(true);
    });

    it('should return false after failed resolution', async () => {
      const execDeps = createExecDeps({
        execAsync: vi.fn().mockRejectedValue(new Error('not found')),
      });

      const service = new ToolPathResolverService(execDeps);
      process.env.SHELL = '/bin/zsh';

      await service.resolveTool('claude');

      expect(service.isResolved('claude')).toBe(false);
    });
  });

  // ============================================================
  // Singleton pattern
  // ============================================================

  describe('singleton pattern', () => {
    it('should return same instance when calling getToolPathResolverService', () => {
      const instance1 = getToolPathResolverService();
      const instance2 = getToolPathResolverService();

      expect(instance1).toBe(instance2);
    });

    it('should create new instance after reset', () => {
      const instance1 = getToolPathResolverService();
      resetToolPathResolverService();
      const instance2 = getToolPathResolverService();

      expect(instance1).not.toBe(instance2);
    });
  });
});
