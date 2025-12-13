/**
 * RemoteAgentService Unit Tests
 * TDD: Testing Claude Code remote execution functionality
 * Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7
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

import type { ProcessHandle } from './processProvider';

describe('RemoteAgentService', () => {
  let RemoteAgentService: typeof import('./remoteAgentService').RemoteAgentService;

  // Event emitter pattern for process handle mock
  type EventHandler = (...args: any[]) => void;

  const createMockProcessHandle = () => {
    const outputCallbacks: ((stream: 'stdout' | 'stderr', data: string) => void)[] = [];
    const exitCallbacks: ((code: number) => void)[] = [];
    let isRunning = true;
    let pid = Math.floor(Math.random() * 10000) + 1000;

    return {
      get pid() {
        return pid;
      },
      get isRunning() {
        return isRunning;
      },
      onOutput: vi.fn((cb: (stream: 'stdout' | 'stderr', data: string) => void) => {
        outputCallbacks.push(cb);
      }),
      onExit: vi.fn((cb: (code: number) => void) => {
        exitCallbacks.push(cb);
      }),
      kill: vi.fn((signal?: NodeJS.Signals) => {
        isRunning = false;
      }),
      writeStdin: vi.fn(),
      closeStdin: vi.fn(),
      // Test helpers
      emitOutput: (stream: 'stdout' | 'stderr', data: string) => {
        outputCallbacks.forEach((cb) => cb(stream, data));
      },
      emitExit: (code: number) => {
        isRunning = false;
        exitCallbacks.forEach((cb) => cb(code));
      },
    };
  };

  // Mock process provider
  const mockProcessProvider = {
    type: 'ssh' as const,
    spawn: vi.fn(),
    exec: vi.fn(),
  };

  beforeEach(async () => {
    vi.resetAllMocks();

    // Dynamically import to get fresh module
    const module = await import('./remoteAgentService');
    RemoteAgentService = module.RemoteAgentService;
  });

  describe('checkClaudeCodeAvailability', () => {
    it('should return true when Claude Code is installed', async () => {
      mockProcessProvider.exec.mockResolvedValue({
        ok: true,
        value: {
          stdout: '/usr/local/bin/claude\n',
          stderr: '',
          exitCode: 0,
        },
      });

      const service = new RemoteAgentService(mockProcessProvider);
      const result = await service.checkClaudeCodeAvailability();

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.installed).toBe(true);
        expect(result.value.path).toBe('/usr/local/bin/claude');
      }
    });

    it('should return false when Claude Code is not installed', async () => {
      mockProcessProvider.exec.mockResolvedValue({
        ok: true,
        value: {
          stdout: '',
          stderr: 'claude: command not found\n',
          exitCode: 1,
        },
      });

      const service = new RemoteAgentService(mockProcessProvider);
      const result = await service.checkClaudeCodeAvailability();

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.installed).toBe(false);
      }
    });

    it('should return version information when available', async () => {
      mockProcessProvider.exec
        .mockResolvedValueOnce({
          ok: true,
          value: {
            stdout: '/usr/local/bin/claude\n',
            stderr: '',
            exitCode: 0,
          },
        })
        .mockResolvedValueOnce({
          ok: true,
          value: {
            stdout: 'claude version 1.0.0\n',
            stderr: '',
            exitCode: 0,
          },
        });

      const service = new RemoteAgentService(mockProcessProvider);
      const result = await service.checkClaudeCodeAvailability();

      expect(result.ok).toBe(true);
      if (result.ok && result.value.installed) {
        expect(result.value.version).toBe('1.0.0');
      }
    });

    it('should handle connection errors', async () => {
      mockProcessProvider.exec.mockResolvedValue({
        ok: false,
        error: { type: 'CONNECTION_LOST' },
      });

      const service = new RemoteAgentService(mockProcessProvider);
      const result = await service.checkClaudeCodeAvailability();

      expect(result.ok).toBe(false);
    });
  });

  describe('startAgent', () => {
    it('should start Claude Code agent on remote server', async () => {
      const mockHandle = createMockProcessHandle();
      mockProcessProvider.spawn.mockResolvedValue({
        ok: true,
        value: mockHandle,
      });

      const service = new RemoteAgentService(mockProcessProvider);
      const result = await service.startAgent({
        projectPath: '/remote/project',
        command: 'test-command',
      });

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.pid).toBeGreaterThan(0);
        expect(result.value.isRunning).toBe(true);
      }

      expect(mockProcessProvider.spawn).toHaveBeenCalledWith(
        'claude',
        expect.arrayContaining(['test-command']),
        expect.objectContaining({ cwd: '/remote/project' })
      );
    });

    it('should stream stdout to output callback', async () => {
      const mockHandle = createMockProcessHandle();
      mockProcessProvider.spawn.mockResolvedValue({
        ok: true,
        value: mockHandle,
      });

      const outputLines: string[] = [];
      const service = new RemoteAgentService(mockProcessProvider);
      const result = await service.startAgent({
        projectPath: '/remote/project',
        command: 'test-command',
        onOutput: (data) => outputLines.push(data),
      });

      expect(result.ok).toBe(true);

      // Simulate agent output
      mockHandle.emitOutput('stdout', 'Line 1\n');
      mockHandle.emitOutput('stdout', 'Line 2\n');

      expect(outputLines).toContain('Line 1\n');
      expect(outputLines).toContain('Line 2\n');
    });

    it('should stream stderr to output callback', async () => {
      const mockHandle = createMockProcessHandle();
      mockProcessProvider.spawn.mockResolvedValue({
        ok: true,
        value: mockHandle,
      });

      const errorLines: string[] = [];
      const service = new RemoteAgentService(mockProcessProvider);
      const result = await service.startAgent({
        projectPath: '/remote/project',
        command: 'test-command',
        onError: (data) => errorLines.push(data),
      });

      expect(result.ok).toBe(true);

      // Simulate agent error output
      mockHandle.emitOutput('stderr', 'Error occurred\n');

      expect(errorLines).toContain('Error occurred\n');
    });

    it('should notify on agent exit', async () => {
      const mockHandle = createMockProcessHandle();
      mockProcessProvider.spawn.mockResolvedValue({
        ok: true,
        value: mockHandle,
      });

      let exitCode = -1;
      const service = new RemoteAgentService(mockProcessProvider);
      const result = await service.startAgent({
        projectPath: '/remote/project',
        command: 'test-command',
        onExit: (code) => {
          exitCode = code;
        },
      });

      expect(result.ok).toBe(true);

      // Simulate agent exit
      mockHandle.emitExit(0);

      expect(exitCode).toBe(0);
    });

    it('should handle spawn errors', async () => {
      mockProcessProvider.spawn.mockResolvedValue({
        ok: false,
        error: { type: 'SPAWN_ERROR', message: 'Failed to start claude' },
      });

      const service = new RemoteAgentService(mockProcessProvider);
      const result = await service.startAgent({
        projectPath: '/remote/project',
        command: 'test-command',
      });

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.type).toBe('SPAWN_ERROR');
      }
    });

    it('should track remote agent PID', async () => {
      const mockHandle = createMockProcessHandle();
      mockProcessProvider.spawn.mockResolvedValue({
        ok: true,
        value: mockHandle,
      });

      const service = new RemoteAgentService(mockProcessProvider);
      const result = await service.startAgent({
        projectPath: '/remote/project',
        command: 'test-command',
      });

      expect(result.ok).toBe(true);
      if (result.ok) {
        const pid = result.value.pid;
        expect(typeof pid).toBe('number');
        expect(pid).toBeGreaterThan(0);
      }
    });
  });

  describe('stopAgent', () => {
    it('should stop running agent with SIGTERM', async () => {
      const mockHandle = createMockProcessHandle();
      mockProcessProvider.spawn.mockResolvedValue({
        ok: true,
        value: mockHandle,
      });

      const service = new RemoteAgentService(mockProcessProvider);
      const startResult = await service.startAgent({
        projectPath: '/remote/project',
        command: 'test-command',
      });

      expect(startResult.ok).toBe(true);
      if (startResult.ok) {
        await service.stopAgent();

        expect(mockHandle.kill).toHaveBeenCalledWith('SIGTERM');
      }
    });

    it('should return success when no agent is running', async () => {
      const service = new RemoteAgentService(mockProcessProvider);
      const result = await service.stopAgent();

      expect(result.ok).toBe(true);
    });

    it('should clear agent reference after stopping', async () => {
      const mockHandle = createMockProcessHandle();
      mockProcessProvider.spawn.mockResolvedValue({
        ok: true,
        value: mockHandle,
      });

      const service = new RemoteAgentService(mockProcessProvider);
      await service.startAgent({
        projectPath: '/remote/project',
        command: 'test-command',
      });

      await service.stopAgent();

      // isRunning should return false after stopping
      expect(service.isAgentRunning()).toBe(false);
    });
  });

  describe('isAgentRunning', () => {
    it('should return true when agent is running', async () => {
      const mockHandle = createMockProcessHandle();
      mockProcessProvider.spawn.mockResolvedValue({
        ok: true,
        value: mockHandle,
      });

      const service = new RemoteAgentService(mockProcessProvider);
      await service.startAgent({
        projectPath: '/remote/project',
        command: 'test-command',
      });

      expect(service.isAgentRunning()).toBe(true);
    });

    it('should return false when no agent has been started', () => {
      const service = new RemoteAgentService(mockProcessProvider);
      expect(service.isAgentRunning()).toBe(false);
    });

    it('should return false after agent exits', async () => {
      const mockHandle = createMockProcessHandle();
      mockProcessProvider.spawn.mockResolvedValue({
        ok: true,
        value: mockHandle,
      });

      const service = new RemoteAgentService(mockProcessProvider);
      await service.startAgent({
        projectPath: '/remote/project',
        command: 'test-command',
      });

      // Simulate agent exit
      mockHandle.emitExit(0);

      expect(service.isAgentRunning()).toBe(false);
    });
  });

  describe('getAgentPid', () => {
    it('should return PID of running agent', async () => {
      const mockHandle = createMockProcessHandle();
      mockProcessProvider.spawn.mockResolvedValue({
        ok: true,
        value: mockHandle,
      });

      const service = new RemoteAgentService(mockProcessProvider);
      await service.startAgent({
        projectPath: '/remote/project',
        command: 'test-command',
      });

      expect(service.getAgentPid()).toBe(mockHandle.pid);
    });

    it('should return null when no agent is running', () => {
      const service = new RemoteAgentService(mockProcessProvider);
      expect(service.getAgentPid()).toBeNull();
    });
  });

  describe('getInstallationGuidance', () => {
    it('should return installation instructions', () => {
      const service = new RemoteAgentService(mockProcessProvider);
      const guidance = service.getInstallationGuidance();

      expect(guidance).toContain('npm');
      expect(guidance.length).toBeGreaterThan(0);
    });
  });
});
