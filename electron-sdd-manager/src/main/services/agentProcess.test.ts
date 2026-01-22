/**
 * AgentProcess Tests
 * Requirements: 5.1, 9.1, 9.4, 9.6, 10.1, 10.2
 *
 * Note: These tests verify the AgentProcess interface through
 * a real but short-lived process (echo command).
 */

import { describe, it, expect, vi } from 'vitest';
import { AgentProcessOptions, createAgentProcess } from './agentProcess';

describe('AgentProcess', () => {
  // Task 21.1: Basic AgentProcess implementation
  describe('spawn and pid', () => {
    it('should spawn a process and return pid', async () => {
      const options: AgentProcessOptions = {
        agentId: 'agent-001',
        command: 'echo',
        args: ['test'],
        cwd: '/tmp',
      };

      const process = createAgentProcess(options);

      expect(process.agentId).toBe('agent-001');
      expect(process.pid).toBeGreaterThan(0);

      // Wait for process to exit
      await new Promise<void>((resolve) => {
        process.onExit(() => resolve());
      });
    });

    it('should use sessionId when provided', () => {
      const options: AgentProcessOptions = {
        agentId: 'agent-001',
        command: 'echo',
        args: ['test'],
        cwd: '/tmp',
        sessionId: 'session-123',
      };

      const process = createAgentProcess(options);

      expect(process.sessionId).toBe('session-123');

      // Clean up
      process.kill();
    });

    it('should have empty sessionId when not provided', () => {
      const options: AgentProcessOptions = {
        agentId: 'agent-001',
        command: 'echo',
        args: ['test'],
        cwd: '/tmp',
      };

      const process = createAgentProcess(options);

      expect(process.sessionId).toBe('');

      // Clean up
      process.kill();
    });
  });

  // Task 21.2: stdout/stderr streaming
  describe('onOutput', () => {
    it('should emit stdout output events', async () => {
      const options: AgentProcessOptions = {
        agentId: 'agent-001',
        command: 'echo',
        args: ['Hello from stdout'],
        cwd: '/tmp',
      };

      const process = createAgentProcess(options);
      const outputs: { stream: string; data: string }[] = [];

      process.onOutput((stream, data) => {
        outputs.push({ stream, data });
      });

      // Wait for process to complete
      await new Promise<void>((resolve) => {
        process.onExit(() => resolve());
      });

      // Check that stdout was captured
      expect(outputs.some((o) => o.stream === 'stdout' && o.data.includes('Hello from stdout'))).toBe(true);
    });

    it('should emit stderr output events', async () => {
      // Use ls with a non-existent directory to generate stderr
      const options: AgentProcessOptions = {
        agentId: 'agent-001',
        command: 'ls',
        args: ['/nonexistent_directory_12345'],
        cwd: '/tmp',
      };

      const process = createAgentProcess(options);
      const outputs: { stream: string; data: string }[] = [];

      process.onOutput((stream, data) => {
        outputs.push({ stream, data });
      });

      // Wait for process to complete
      await new Promise<void>((resolve) => {
        process.onExit(() => resolve());
      });

      // Check that stderr was captured (ls will output error to stderr)
      const hasStderr = outputs.some((o) => o.stream === 'stderr');
      expect(hasStderr).toBe(true);
    });
  });

  // Task 21.3: stdin handling for claude -p compatibility
  describe('stdin handling', () => {
    it('should close stdin immediately to allow claude -p to complete', async () => {
      // This test verifies that stdin is closed after spawn
      // so that commands like `claude -p` don't hang waiting for input
      const options: AgentProcessOptions = {
        agentId: 'agent-001',
        command: 'cat',
        args: [],
        cwd: '/tmp',
      };

      const process = createAgentProcess(options);
      const outputs: string[] = [];

      process.onOutput((stream, data) => {
        if (stream === 'stdout') {
          outputs.push(data);
        }
      });

      // With stdin closed immediately, cat should exit quickly (no input = EOF)
      const exitCode = await new Promise<number>((resolve) => {
        process.onExit((code) => resolve(code));
      });

      // cat with closed stdin should exit with 0
      expect(exitCode).toBe(0);
      // No output expected since stdin was closed immediately
      expect(outputs.length).toBe(0);
    });

    it('should capture stdout when stdin is piped and closed', async () => {
      // Use a command that produces output without needing stdin
      const options: AgentProcessOptions = {
        agentId: 'agent-001',
        command: 'echo',
        args: ['hello'],
        cwd: '/tmp',
      };

      const process = createAgentProcess(options);
      const outputs: string[] = [];

      process.onOutput((stream, data) => {
        if (stream === 'stdout') {
          outputs.push(data);
        }
      });

      await new Promise<void>((resolve) => {
        process.onExit(() => resolve());
      });

      expect(outputs.some((o) => o.includes('hello'))).toBe(true);
    });
  });

  // Task 21.4: exit event handling
  describe('onExit', () => {
    it('should emit exit event with code 0 on success', async () => {
      const options: AgentProcessOptions = {
        agentId: 'agent-001',
        command: 'true',  // Always exits with 0
        args: [],
        cwd: '/tmp',
      };

      const process = createAgentProcess(options);

      const exitCode = await new Promise<number>((resolve) => {
        process.onExit((code) => resolve(code));
      });

      expect(exitCode).toBe(0);
    });

    it('should emit exit event with non-zero code on failure', async () => {
      const options: AgentProcessOptions = {
        agentId: 'agent-001',
        command: 'false',  // Always exits with 1
        args: [],
        cwd: '/tmp',
      };

      const process = createAgentProcess(options);

      const exitCode = await new Promise<number>((resolve) => {
        process.onExit((code) => resolve(code));
      });

      expect(exitCode).toBe(1);
    });
  });

  describe('isRunning', () => {
    it('should return true when process is running', () => {
      const options: AgentProcessOptions = {
        agentId: 'agent-001',
        command: 'sleep',
        args: ['10'],
        cwd: '/tmp',
      };

      const process = createAgentProcess(options);
      expect(process.isRunning).toBe(true);

      // Clean up
      process.kill();
    });

    it('should return false after process exits', async () => {
      const options: AgentProcessOptions = {
        agentId: 'agent-001',
        command: 'true',
        args: [],
        cwd: '/tmp',
      };

      const process = createAgentProcess(options);

      // Wait for exit
      await new Promise<void>((resolve) => {
        process.onExit(() => resolve());
      });

      expect(process.isRunning).toBe(false);
    });

    it('should return false after kill', () => {
      const options: AgentProcessOptions = {
        agentId: 'agent-001',
        command: 'sleep',
        args: ['10'],
        cwd: '/tmp',
      };

      const process = createAgentProcess(options);
      process.kill();

      expect(process.isRunning).toBe(false);
    });
  });

  describe('kill', () => {
    it('should terminate the process', async () => {
      const options: AgentProcessOptions = {
        agentId: 'agent-001',
        command: 'sleep',
        args: ['10'],
        cwd: '/tmp',
      };

      const process = createAgentProcess(options);
      expect(process.isRunning).toBe(true);

      process.kill();

      // Wait a bit for the process to terminate
      await new Promise((r) => setTimeout(r, 100));

      expect(process.isRunning).toBe(false);
    });
  });

  // Line buffering tests for JSONL format support
  describe('stdout line buffering', () => {
    it('should output complete lines with trailing newline', async () => {
      // printf outputs without trailing newline by default, then we add explicit newlines
      const options: AgentProcessOptions = {
        agentId: 'agent-001',
        command: 'printf',
        args: ['line1\\nline2\\n'],
        cwd: '/tmp',
      };

      const process = createAgentProcess(options);
      const outputs: string[] = [];

      process.onOutput((stream, data) => {
        if (stream === 'stdout') {
          outputs.push(data);
        }
      });

      await new Promise<void>((resolve) => {
        process.onExit(() => resolve());
      });

      // Each complete line should end with newline
      expect(outputs.length).toBeGreaterThanOrEqual(1);
      outputs.forEach((output) => {
        expect(output.endsWith('\n')).toBe(true);
      });
    });

    it('should handle multiple lines output', async () => {
      const options: AgentProcessOptions = {
        agentId: 'agent-001',
        command: 'printf',
        args: ['{"type":"a"}\\n{"type":"b"}\\n{"type":"c"}\\n'],
        cwd: '/tmp',
      };

      const process = createAgentProcess(options);
      const outputs: string[] = [];

      process.onOutput((stream, data) => {
        if (stream === 'stdout') {
          outputs.push(data);
        }
      });

      await new Promise<void>((resolve) => {
        process.onExit(() => resolve());
      });

      // Combine all outputs and verify content
      const combined = outputs.join('');
      expect(combined).toContain('{"type":"a"}');
      expect(combined).toContain('{"type":"b"}');
      expect(combined).toContain('{"type":"c"}');
    });

    it('should flush remaining buffer on process exit', async () => {
      // printf without trailing newline - buffer should be flushed on exit
      const options: AgentProcessOptions = {
        agentId: 'agent-001',
        command: 'printf',
        args: ['no-newline-at-end'],
        cwd: '/tmp',
      };

      const process = createAgentProcess(options);
      const outputs: string[] = [];

      process.onOutput((stream, data) => {
        if (stream === 'stdout') {
          outputs.push(data);
        }
      });

      await new Promise<void>((resolve) => {
        process.onExit(() => resolve());
      });

      // The remaining buffer should be flushed with added newline
      const combined = outputs.join('');
      expect(combined).toContain('no-newline-at-end');
      expect(combined.endsWith('\n')).toBe(true);
    });

    it('should not output empty lines', async () => {
      const options: AgentProcessOptions = {
        agentId: 'agent-001',
        command: 'printf',
        args: ['line1\\n\\n\\nline2\\n'],
        cwd: '/tmp',
      };

      const process = createAgentProcess(options);
      const outputs: string[] = [];

      process.onOutput((stream, data) => {
        if (stream === 'stdout') {
          outputs.push(data);
        }
      });

      await new Promise<void>((resolve) => {
        process.onExit(() => resolve());
      });

      // Empty lines should be filtered out
      outputs.forEach((output) => {
        expect(output.trim().length).toBeGreaterThan(0);
      });
    });
  });
});
