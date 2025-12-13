/**
 * ProcessProvider Unit Tests
 * TDD: Testing process execution abstraction interface and local implementation
 * Requirements: 4.1, 4.2, 4.4, 4.5, 4.6, 4.7
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as path from 'path';
import * as os from 'os';
import * as fs from 'fs/promises';

// Mock logger first to avoid Electron app dependency
vi.mock('../logger', () => ({
  logger: {
    info: vi.fn(),
    debug: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

import {
  type ProcessProvider,
  type ProcessError,
  LocalProcessProvider,
} from './processProvider';

describe('LocalProcessProvider', () => {
  let provider: LocalProcessProvider;
  let tempDir: string;

  beforeEach(async () => {
    provider = new LocalProcessProvider();
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'procprovider-test-'));
  });

  afterEach(async () => {
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  describe('type property', () => {
    it('should return "local" as type', () => {
      expect(provider.type).toBe('local');
    });
  });

  describe('exec', () => {
    it('should execute command and return stdout', async () => {
      const result = await provider.exec('echo "Hello, World!"', { cwd: tempDir });

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.stdout.trim()).toBe('Hello, World!');
        expect(result.value.exitCode).toBe(0);
      }
    });

    it('should capture stderr', async () => {
      const result = await provider.exec('echo "Error message" >&2', { cwd: tempDir });

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.stderr.trim()).toBe('Error message');
      }
    });

    it('should return exit code from command', async () => {
      const result = await provider.exec('exit 42', { cwd: tempDir });

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.exitCode).toBe(42);
      }
    });

    it('should support environment variables', async () => {
      const result = await provider.exec('echo $TEST_VAR', {
        cwd: tempDir,
        env: { TEST_VAR: 'test-value' },
      });

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.stdout.trim()).toBe('test-value');
      }
    });

    it('should respect cwd option', async () => {
      const result = await provider.exec('pwd', { cwd: tempDir });

      expect(result.ok).toBe(true);
      if (result.ok) {
        // On macOS, /var is symlinked to /private/var, so we need to check both
        const stdout = result.value.stdout.trim();
        expect(stdout === tempDir || stdout === path.join('/private', tempDir)).toBe(true);
      }
    });

    it('should return non-zero exit code for invalid command', async () => {
      // When executed via shell, invalid commands result in non-zero exit code
      // rather than a COMMAND_NOT_FOUND error
      const result = await provider.exec('nonexistent-command-12345', { cwd: tempDir });

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.exitCode).not.toBe(0);
      }
    });
  });

  describe('spawn', () => {
    it('should spawn process and return handle', async () => {
      const result = await provider.spawn('echo', ['Hello'], { cwd: tempDir });

      expect(result.ok).toBe(true);
      if (result.ok) {
        const handle = result.value;
        expect(handle.pid).toBeGreaterThan(0);

        // Wait for process to complete
        await new Promise<void>((resolve) => {
          handle.onExit(() => resolve());
        });

        expect(handle.isRunning).toBe(false);
      }
    });

    it('should stream stdout via onOutput callback', async () => {
      const result = await provider.spawn('echo', ['Hello, Spawn!'], { cwd: tempDir });

      expect(result.ok).toBe(true);
      if (result.ok) {
        const handle = result.value;
        const outputs: string[] = [];

        handle.onOutput((stream, data) => {
          if (stream === 'stdout') {
            outputs.push(data);
          }
        });

        await new Promise<void>((resolve) => {
          handle.onExit(() => resolve());
        });

        const fullOutput = outputs.join('');
        expect(fullOutput.trim()).toBe('Hello, Spawn!');
      }
    });

    it('should report exit code via onExit callback', async () => {
      const result = await provider.spawn('sh', ['-c', 'exit 7'], { cwd: tempDir });

      expect(result.ok).toBe(true);
      if (result.ok) {
        const exitCode = await new Promise<number>((resolve) => {
          result.value.onExit((code) => resolve(code));
        });

        expect(exitCode).toBe(7);
      }
    });

    it('should support kill method', async () => {
      // Start a long-running process
      const result = await provider.spawn('sleep', ['10'], { cwd: tempDir });

      expect(result.ok).toBe(true);
      if (result.ok) {
        const handle = result.value;
        expect(handle.isRunning).toBe(true);

        // Kill it
        handle.kill();

        // Wait for process to exit
        await new Promise<void>((resolve) => {
          handle.onExit(() => resolve());
        });

        expect(handle.isRunning).toBe(false);
      }
    });

    it('should support kill with signal', async () => {
      const result = await provider.spawn('sleep', ['10'], { cwd: tempDir });

      expect(result.ok).toBe(true);
      if (result.ok) {
        const handle = result.value;

        handle.kill('SIGKILL');

        await new Promise<void>((resolve) => {
          handle.onExit(() => resolve());
        });

        expect(handle.isRunning).toBe(false);
      }
    });

    it('should support environment variables in spawn', async () => {
      const result = await provider.spawn('sh', ['-c', 'echo $MY_ENV_VAR'], {
        cwd: tempDir,
        env: { MY_ENV_VAR: 'spawn-env-value' },
      });

      expect(result.ok).toBe(true);
      if (result.ok) {
        const outputs: string[] = [];
        result.value.onOutput((stream, data) => {
          if (stream === 'stdout') outputs.push(data);
        });

        await new Promise<void>((resolve) => {
          result.value.onExit(() => resolve());
        });

        expect(outputs.join('').trim()).toBe('spawn-env-value');
      }
    });

    it('should handle stdin writing', async () => {
      const result = await provider.spawn('cat', [], { cwd: tempDir });

      expect(result.ok).toBe(true);
      if (result.ok) {
        const handle = result.value;
        const outputs: string[] = [];

        handle.onOutput((stream, data) => {
          if (stream === 'stdout') outputs.push(data);
        });

        handle.writeStdin('Hello from stdin\n');
        handle.closeStdin();

        await new Promise<void>((resolve) => {
          handle.onExit(() => resolve());
        });

        expect(outputs.join('').trim()).toBe('Hello from stdin');
      }
    });
  });
});

describe('ProcessError types', () => {
  it('should have proper error type structure', () => {
    const spawnError: ProcessError = { type: 'SPAWN_ERROR', message: 'Failed to spawn' };
    const connectionError: ProcessError = { type: 'CONNECTION_LOST' };
    const notFoundError: ProcessError = { type: 'COMMAND_NOT_FOUND', command: 'missing-cmd' };
    const permissionError: ProcessError = { type: 'PERMISSION_DENIED' };
    const timeoutError: ProcessError = { type: 'TIMEOUT' };

    expect(spawnError.type).toBe('SPAWN_ERROR');
    expect(connectionError.type).toBe('CONNECTION_LOST');
    expect(notFoundError.type).toBe('COMMAND_NOT_FOUND');
    expect(permissionError.type).toBe('PERMISSION_DENIED');
    expect(timeoutError.type).toBe('TIMEOUT');
  });
});

/**
 * SSHProcessProvider Unit Tests
 * TDD: Testing SSH process provider implementation
 * Requirements: 4.3, 5.4, 5.7
 */
describe('SSHProcessProvider', () => {
  // Import is done dynamically to allow mocking
  let SSHProcessProvider: typeof import('./sshProcessProvider').SSHProcessProvider;

  // Event emitter pattern for channel mock
  type EventHandler = (...args: any[]) => void;

  const createMockChannel = () => {
    const handlers: Record<string, EventHandler[]> = {};
    const stderrHandlers: Record<string, EventHandler[]> = {};

    return {
      on: vi.fn((event: string, handler: EventHandler) => {
        if (!handlers[event]) handlers[event] = [];
        handlers[event].push(handler);
      }),
      write: vi.fn(),
      end: vi.fn(),
      close: vi.fn(),
      signal: vi.fn(),
      stderr: {
        on: vi.fn((event: string, handler: EventHandler) => {
          if (!stderrHandlers[event]) stderrHandlers[event] = [];
          stderrHandlers[event].push(handler);
        }),
      },
      emit: (event: string, ...args: any[]) => {
        handlers[event]?.forEach((h) => h(...args));
      },
      emitStderr: (event: string, ...args: any[]) => {
        stderrHandlers[event]?.forEach((h) => h(...args));
      },
    };
  };

  let mockChannel: ReturnType<typeof createMockChannel>;

  // Mock exec function
  const mockExec = vi.fn();

  // Mock connection service
  const mockConnectionService = {
    getStatus: vi.fn(() => 'connected'),
    executeCommand: vi.fn(),
    getSSHClient: vi.fn(() => ({ ok: true, value: { exec: mockExec } })),
    onStatusChange: vi.fn(() => () => {}),
  };

  beforeEach(async () => {
    vi.resetAllMocks();
    mockChannel = createMockChannel();

    // Reset mock implementations
    mockConnectionService.getStatus.mockReturnValue('connected');

    // Dynamically import to get mocked version
    const module = await import('./sshProcessProvider');
    SSHProcessProvider = module.SSHProcessProvider;
  });

  describe('type property', () => {
    it('should return "ssh" as type', () => {
      const provider = new SSHProcessProvider(mockConnectionService as any);
      expect(provider.type).toBe('ssh');
    });
  });

  describe('exec', () => {
    it('should execute command on remote server', async () => {
      mockConnectionService.executeCommand.mockResolvedValue({
        ok: true,
        value: {
          stdout: 'Hello from remote!',
          stderr: '',
          exitCode: 0,
        },
      });

      const provider = new SSHProcessProvider(mockConnectionService as any);
      const result = await provider.exec('echo "Hello from remote!"', { cwd: '/remote/path' });

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.stdout.trim()).toBe('Hello from remote!');
        expect(result.value.exitCode).toBe(0);
      }
    });

    it('should capture stderr from remote command', async () => {
      mockConnectionService.executeCommand.mockResolvedValue({
        ok: true,
        value: {
          stdout: '',
          stderr: 'Error message from remote',
          exitCode: 1,
        },
      });

      const provider = new SSHProcessProvider(mockConnectionService as any);
      const result = await provider.exec('failing-command', { cwd: '/remote/path' });

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.stderr.trim()).toBe('Error message from remote');
        expect(result.value.exitCode).toBe(1);
      }
    });

    it('should return CONNECTION_LOST when not connected', async () => {
      mockConnectionService.getStatus.mockReturnValue('disconnected');
      mockConnectionService.executeCommand.mockResolvedValue({
        ok: false,
        error: { type: 'NETWORK_ERROR', message: 'Not connected' },
      });

      const provider = new SSHProcessProvider(mockConnectionService as any);
      const result = await provider.exec('any-command', { cwd: '/path' });

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.type).toBe('CONNECTION_LOST');
      }
    });

    it('should support environment variables', async () => {
      mockConnectionService.executeCommand.mockResolvedValue({
        ok: true,
        value: {
          stdout: 'remote-env-value',
          stderr: '',
          exitCode: 0,
        },
      });

      const provider = new SSHProcessProvider(mockConnectionService as any);
      const result = await provider.exec('echo $TEST_VAR', {
        cwd: '/path',
        env: { TEST_VAR: 'remote-env-value' },
      });

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.stdout.trim()).toBe('remote-env-value');
      }
    });
  });

  describe('spawn', () => {
    it('should spawn remote process and return handle', async () => {
      // Setup mock exec to simulate successful channel creation
      mockExec.mockImplementation((command: string, callback: (err: Error | null, channel?: any) => void) => {
        callback(null, mockChannel);
        // Simulate process completion
        setTimeout(() => {
          mockChannel.emit('close', 0);
        }, 10);
      });

      mockConnectionService.getSSHClient.mockReturnValue({ ok: true, value: { exec: mockExec } });

      const provider = new SSHProcessProvider(mockConnectionService as any);
      const result = await provider.spawn('echo', ['Hello'], { cwd: '/remote/path' });

      expect(result.ok).toBe(true);
      if (result.ok) {
        const handle = result.value;
        expect(handle.pid).toBeGreaterThanOrEqual(0); // Remote PID tracking may vary
        expect(typeof handle.onOutput).toBe('function');
        expect(typeof handle.onExit).toBe('function');
        expect(typeof handle.kill).toBe('function');
      }
    });

    it('should stream stdout via onOutput callback', async () => {
      // Use a more direct approach - register callbacks before calling spawn
      const channel = createMockChannel();

      mockExec.mockImplementation((command: string, callback: (err: Error | null, ch?: any) => void) => {
        callback(null, channel);
      });

      mockConnectionService.getSSHClient.mockReturnValue({ ok: true, value: { exec: mockExec } });

      const provider = new SSHProcessProvider(mockConnectionService as any);
      const result = await provider.spawn('cat', ['file.txt'], { cwd: '/remote/path' });

      expect(result.ok).toBe(true);
      if (result.ok) {
        const handle = result.value;
        const outputs: string[] = [];

        handle.onOutput((stream, data) => {
          if (stream === 'stdout') {
            outputs.push(data);
          }
        });

        // Emit data and then close
        channel.emit('data', Buffer.from('Remote output line 1\n'));
        channel.emit('data', Buffer.from('Remote output line 2\n'));
        channel.emit('close', 0);

        // Wait for processing
        await new Promise((r) => setTimeout(r, 10));

        const fullOutput = outputs.join('');
        expect(fullOutput).toContain('Remote output line 1');
        expect(fullOutput).toContain('Remote output line 2');
      }
    });

    it('should stream stderr via onOutput callback', async () => {
      const channel = createMockChannel();

      mockExec.mockImplementation((command: string, callback: (err: Error | null, ch?: any) => void) => {
        callback(null, channel);
      });

      mockConnectionService.getSSHClient.mockReturnValue({ ok: true, value: { exec: mockExec } });

      const provider = new SSHProcessProvider(mockConnectionService as any);
      const result = await provider.spawn('failing-cmd', [], { cwd: '/remote/path' });

      expect(result.ok).toBe(true);
      if (result.ok) {
        const handle = result.value;
        const errors: string[] = [];

        handle.onOutput((stream, data) => {
          if (stream === 'stderr') {
            errors.push(data);
          }
        });

        // Emit stderr data and close
        channel.emitStderr('data', Buffer.from('Error: something went wrong\n'));
        channel.emit('close', 1);

        // Wait for processing
        await new Promise((r) => setTimeout(r, 10));

        expect(errors.join('')).toContain('Error: something went wrong');
      }
    });

    it('should report exit code via onExit callback', async () => {
      const channel = createMockChannel();

      mockExec.mockImplementation((command: string, callback: (err: Error | null, ch?: any) => void) => {
        callback(null, channel);
      });

      mockConnectionService.getSSHClient.mockReturnValue({ ok: true, value: { exec: mockExec } });

      const provider = new SSHProcessProvider(mockConnectionService as any);
      const result = await provider.spawn('exit', ['42'], { cwd: '/remote/path' });

      expect(result.ok).toBe(true);
      if (result.ok) {
        let exitCode = -1;
        result.value.onExit((code) => {
          exitCode = code;
        });

        // Emit close with exit code
        channel.emit('close', 42);

        // Wait for processing
        await new Promise((r) => setTimeout(r, 10));

        expect(exitCode).toBe(42);
      }
    });

    it('should support kill method', async () => {
      mockExec.mockImplementation((command: string, callback: (err: Error | null, channel?: any) => void) => {
        callback(null, mockChannel);
      });

      mockConnectionService.getSSHClient.mockReturnValue({ ok: true, value: { exec: mockExec } });

      const provider = new SSHProcessProvider(mockConnectionService as any);
      const result = await provider.spawn('sleep', ['10'], { cwd: '/remote/path' });

      expect(result.ok).toBe(true);
      if (result.ok) {
        const handle = result.value;
        handle.kill('SIGTERM');

        expect(mockChannel.signal).toHaveBeenCalledWith('TERM');
      }
    });

    it('should support stdin writing', async () => {
      mockExec.mockImplementation((command: string, callback: (err: Error | null, channel?: any) => void) => {
        callback(null, mockChannel);
      });

      mockConnectionService.getSSHClient.mockReturnValue({ ok: true, value: { exec: mockExec } });

      const provider = new SSHProcessProvider(mockConnectionService as any);
      const result = await provider.spawn('cat', [], { cwd: '/remote/path' });

      expect(result.ok).toBe(true);
      if (result.ok) {
        const handle = result.value;
        handle.writeStdin('Input data\n');

        expect(mockChannel.write).toHaveBeenCalledWith('Input data\n');
      }
    });

    it('should close stdin', async () => {
      mockExec.mockImplementation((command: string, callback: (err: Error | null, channel?: any) => void) => {
        callback(null, mockChannel);
      });

      mockConnectionService.getSSHClient.mockReturnValue({ ok: true, value: { exec: mockExec } });

      const provider = new SSHProcessProvider(mockConnectionService as any);
      const result = await provider.spawn('cat', [], { cwd: '/remote/path' });

      expect(result.ok).toBe(true);
      if (result.ok) {
        const handle = result.value;
        handle.closeStdin();

        expect(mockChannel.end).toHaveBeenCalled();
      }
    });

    it('should handle spawn errors gracefully', async () => {
      mockExec.mockImplementation((command: string, callback: (err: Error | null, channel?: any) => void) => {
        callback(new Error('Failed to create channel'));
      });

      mockConnectionService.getSSHClient.mockReturnValue({ ok: true, value: { exec: mockExec } });

      const provider = new SSHProcessProvider(mockConnectionService as any);
      const result = await provider.spawn('any-command', [], { cwd: '/remote/path' });

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.type).toBe('SPAWN_ERROR');
      }
    });
  });

  describe('remote PID tracking', () => {
    it('should track remote process PID when available', async () => {
      mockExec.mockImplementation((command: string, callback: (err: Error | null, channel?: any) => void) => {
        callback(null, mockChannel);
        // Simulate getting PID from initial output
        setTimeout(() => {
          mockChannel.emit('data', Buffer.from('__PID__:12345\n'));
        }, 10);
      });

      mockConnectionService.getSSHClient.mockReturnValue({ ok: true, value: { exec: mockExec } });

      const provider = new SSHProcessProvider(mockConnectionService as any);
      const result = await provider.spawn('long-running-process', [], { cwd: '/remote/path' });

      expect(result.ok).toBe(true);
      if (result.ok) {
        // Wait for PID to be captured
        await new Promise((resolve) => setTimeout(resolve, 50));
        expect(result.value.pid).toBe(12345);
      }
    });
  });

  describe('environment variable injection', () => {
    it('should prepend environment variables to command', async () => {
      mockExec.mockImplementation((command: string, callback: (err: Error | null, channel?: any) => void) => {
        callback(null, mockChannel);
        setTimeout(() => {
          mockChannel.emit('close', 0);
        }, 10);
      });

      mockConnectionService.getSSHClient.mockReturnValue({ ok: true, value: { exec: mockExec } });

      const provider = new SSHProcessProvider(mockConnectionService as any);
      await provider.spawn('echo', ['$VAR1 $VAR2'], {
        cwd: '/remote/path',
        env: { VAR1: 'value1', VAR2: 'value2' },
      });

      expect(mockExec).toHaveBeenCalled();
      const calledCommand = mockExec.mock.calls[0][0];
      expect(calledCommand).toContain('VAR1=');
      expect(calledCommand).toContain('VAR2=');
    });
  });
});
