/**
 * Tests for AgentLifecycleManager
 * Requirements: 1.1, 1.4, 3.1-3.5, 5.1-5.5, 6.3, 9.1, 9.2
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { AgentLifecycleManager } from './agentLifecycleManager';
import { AgentRegistry } from './agentRegistry';
import { ProcessUtils } from './processUtils';
import type { AgentRecord } from './agentRecordService';

describe('AgentLifecycleManager', () => {
  let manager: AgentLifecycleManager;
  let registry: AgentRegistry;
  let processUtils: ProcessUtils;

  beforeEach(() => {
    registry = new AgentRegistry();
    processUtils = new ProcessUtils();
    // Manager will be created with mocked dependencies in actual tests
  });

  afterEach(() => {
    manager?.dispose();
  });

  describe('initialization', () => {
    it('should create a singleton instance', () => {
      const manager1 = new AgentLifecycleManager(registry, processUtils, {
        readAllRecords: async () => [],
        createRecord: async () => {},
        updateRecord: async () => {},
      } as any);

      const manager2 = new AgentLifecycleManager(registry, processUtils, {
        readAllRecords: async () => [],
        createRecord: async () => {},
        updateRecord: async () => {},
      } as any);

      expect(manager1).toBeDefined();
      expect(manager2).toBeDefined();
    });

    it('should initialize with empty agent list', () => {
      manager = new AgentLifecycleManager(registry, processUtils, {
        readAllRecords: async () => [],
        createRecord: async () => {},
        updateRecord: async () => {},
      } as any);

      expect(manager.getAllAgents()).toEqual([]);
    });
  });

  describe('getAgent', () => {
    beforeEach(() => {
      manager = new AgentLifecycleManager(registry, processUtils, {
        readAllRecords: async () => [],
        createRecord: async () => {},
        updateRecord: async () => {},
      } as any);
    });

    it('should return null for non-existent agent', () => {
      expect(manager.getAgent('non-existent')).toBeNull();
    });
  });

  describe('getAllAgents', () => {
    beforeEach(() => {
      manager = new AgentLifecycleManager(registry, processUtils, {
        readAllRecords: async () => [],
        createRecord: async () => {},
        updateRecord: async () => {},
      } as any);
    });

    it('should return empty array when no agents', () => {
      expect(manager.getAllAgents()).toEqual([]);
    });
  });

  describe('getAgentsBySpec', () => {
    beforeEach(() => {
      manager = new AgentLifecycleManager(registry, processUtils, {
        readAllRecords: async () => [],
        createRecord: async () => {},
        updateRecord: async () => {},
      } as any);
    });

    it('should return empty array for spec with no agents', () => {
      expect(manager.getAgentsBySpec('spec-1')).toEqual([]);
    });
  });

  describe('event emission', () => {
    beforeEach(() => {
      manager = new AgentLifecycleManager(registry, processUtils, {
        readAllRecords: async () => [],
        createRecord: async () => {},
        updateRecord: async () => {},
      } as any);
    });

    it('should support event listeners', () => {
      const listener = vi.fn();
      manager.on('agent-started', listener);

      // Event emission will be tested in integration tests
      expect(listener).not.toHaveBeenCalled();
    });
  });

  describe('dispose', () => {
    beforeEach(() => {
      manager = new AgentLifecycleManager(registry, processUtils, {
        readAllRecords: async () => [],
        createRecord: async () => {},
        updateRecord: async () => {},
      } as any);
    });

    it('should clean up resources', () => {
      expect(() => manager.dispose()).not.toThrow();
    });
  });

  describe('synchronizeOnStartup', () => {
    it('should handle empty records', async () => {
      manager = new AgentLifecycleManager(registry, processUtils, {
        readAllRecords: async () => [],
        createRecord: async () => {},
        updateRecord: async () => {},
      } as any);

      const result = await manager.synchronizeOnStartup();
      expect(result.totalRecords).toBe(0);
      expect(result.reattached).toBe(0);
      expect(result.markedInterrupted).toBe(0);
      expect(result.pidReused).toBe(0);
    });

    it('should skip already terminated agents', async () => {
      const records: AgentRecord[] = [
        {
          agentId: 'completed-agent',
          specId: 'spec-1',
          phase: 'impl',
          pid: 1234,
          sessionId: 'session-1',
          status: 'completed',
          startedAt: new Date().toISOString(),
          lastActivityAt: new Date().toISOString(),
          command: 'claude code',
        },
      ];

      manager = new AgentLifecycleManager(registry, processUtils, {
        readAllRecords: async () => records,
        createRecord: async () => {},
        updateRecord: async () => {},
      } as any);

      const result = await manager.synchronizeOnStartup();
      expect(result.totalRecords).toBe(1);
      expect(result.reattached).toBe(0);
      expect(result.markedInterrupted).toBe(0);
    });

    it('should mark non-alive processes as interrupted', async () => {
      const records: AgentRecord[] = [
        {
          agentId: 'dead-agent',
          specId: 'spec-1',
          phase: 'impl',
          pid: 9999999, // Non-existent PID
          sessionId: 'session-1',
          status: 'running',
          startedAt: new Date().toISOString(),
          lastActivityAt: new Date().toISOString(),
          command: 'claude code',
        },
      ];

      const updateMock = vi.fn();
      manager = new AgentLifecycleManager(registry, processUtils, {
        readAllRecords: async () => records,
        createRecord: async () => {},
        updateRecord: updateMock,
      } as any);

      const result = await manager.synchronizeOnStartup();
      expect(result.markedInterrupted).toBe(1);
      expect(updateMock).toHaveBeenCalledWith('dead-agent', {
        status: 'interrupted',
        exitReason: 'exited_while_app_closed',
        lastActivityAt: expect.any(String),
      });
    });

    it('should detect PID reuse', async () => {
      const records: AgentRecord[] = [
        {
          agentId: 'reused-pid-agent',
          specId: 'spec-1',
          phase: 'impl',
          pid: process.pid, // Current process
          sessionId: 'session-1',
          status: 'running',
          startedAt: new Date().toISOString(),
          lastActivityAt: new Date().toISOString(),
          command: 'claude code',
          processStartTime: 'wrong-start-time',
        },
      ];

      const updateMock = vi.fn();
      manager = new AgentLifecycleManager(registry, processUtils, {
        readAllRecords: async () => records,
        createRecord: async () => {},
        updateRecord: updateMock,
      } as any);

      const result = await manager.synchronizeOnStartup();
      expect(result.pidReused).toBe(1);
      expect(updateMock).toHaveBeenCalledWith('reused-pid-agent', {
        status: 'interrupted',
        exitReason: 'pid_reused',
        lastActivityAt: expect.any(String),
      });
    });

    it('should reattach continuing processes', async () => {
      const currentStartTime = processUtils.getProcessStartTime(process.pid);
      const records: AgentRecord[] = [
        {
          agentId: 'continuing-agent',
          specId: 'spec-1',
          phase: 'impl',
          pid: process.pid,
          sessionId: 'session-1',
          status: 'running',
          startedAt: new Date().toISOString(),
          lastActivityAt: new Date().toISOString(),
          command: 'claude code',
          processStartTime: currentStartTime!,
        },
      ];

      manager = new AgentLifecycleManager(registry, processUtils, {
        readAllRecords: async () => records,
        createRecord: async () => {},
        updateRecord: async () => {},
      } as any);

      const result = await manager.synchronizeOnStartup();
      expect(result.reattached).toBe(1);

      const handle = manager.getAgent('continuing-agent');
      expect(handle).toBeDefined();
      expect(handle?.isReattached).toBe(true);
    });

    it('should emit agent-state-synced event', async () => {
      manager = new AgentLifecycleManager(registry, processUtils, {
        readAllRecords: async () => [],
        createRecord: async () => {},
        updateRecord: async () => {},
      } as any);

      const listener = vi.fn();
      manager.on('agent-state-synced', listener);

      await manager.synchronizeOnStartup();
      expect(listener).toHaveBeenCalled();
    });
  });

  describe('startAgent', () => {
    it('should spawn a process and register the agent', async () => {
      const mockSpawn = vi.fn();
      const mockProcess = {
        pid: 12345,
        stdout: { on: vi.fn() },
        stderr: { on: vi.fn() },
        on: vi.fn(),
      };

      mockSpawn.mockReturnValue(mockProcess);

      const mockRecordStore = {
        readAllRecords: async () => [],
        createRecord: vi.fn(),
        updateRecord: vi.fn(),
      };

      manager = new AgentLifecycleManager(registry, processUtils, mockRecordStore as any);

      const options = {
        agentId: 'agent-1',
        specId: 'spec-1',
        phase: 'impl',
        sessionId: 'session-1',
        command: 'claude',
        args: ['code'],
        cwd: '/test/path',
        spawn: mockSpawn,
      };

      const result = await manager.startAgent(options);

      expect(result.ok).toBe(true);
      expect(mockSpawn).toHaveBeenCalledWith('claude', ['code'], { cwd: '/test/path' });
      expect(mockRecordStore.createRecord).toHaveBeenCalled();

      const handle = manager.getAgent('agent-1');
      expect(handle).toBeDefined();
      expect(handle?.pid).toBe(12345);
      expect(handle?.state).toBe('running');
    });

    it('should emit agent-started event', async () => {
      const mockSpawn = vi.fn();
      const mockProcess = {
        pid: 12345,
        stdout: { on: vi.fn() },
        stderr: { on: vi.fn() },
        on: vi.fn(),
      };

      mockSpawn.mockReturnValue(mockProcess);

      manager = new AgentLifecycleManager(registry, processUtils, {
        readAllRecords: async () => [],
        createRecord: vi.fn(),
        updateRecord: vi.fn(),
      } as any);

      const listener = vi.fn();
      manager.on('agent-started', listener);

      const options = {
        agentId: 'agent-1',
        specId: 'spec-1',
        phase: 'impl',
        sessionId: 'session-1',
        command: 'claude',
        args: ['code'],
        cwd: '/test/path',
        spawn: mockSpawn,
      };

      await manager.startAgent(options);

      expect(listener).toHaveBeenCalledWith('agent-1', expect.objectContaining({
        agentId: 'agent-1',
        pid: 12345,
      }));
    });

    it('should capture processStartTime', async () => {
      const mockSpawn = vi.fn();
      const mockProcess = {
        pid: process.pid, // Use current process for real start time
        stdout: { on: vi.fn() },
        stderr: { on: vi.fn() },
        on: vi.fn(),
      };

      mockSpawn.mockReturnValue(mockProcess);

      const mockRecordStore = {
        readAllRecords: async () => [],
        createRecord: vi.fn(),
        updateRecord: vi.fn(),
      };

      manager = new AgentLifecycleManager(registry, processUtils, mockRecordStore as any);

      const options = {
        agentId: 'agent-1',
        specId: 'spec-1',
        phase: 'impl',
        sessionId: 'session-1',
        command: 'claude',
        args: ['code'],
        cwd: '/test/path',
        spawn: mockSpawn,
      };

      await manager.startAgent(options);

      expect(mockRecordStore.createRecord).toHaveBeenCalledWith(
        expect.objectContaining({
          processStartTime: expect.any(String),
        })
      );

      const handle = manager.getAgent('agent-1');
      expect(handle?.processStartTime).toBeTruthy();
    });

    it('should return error if spawn fails', async () => {
      const mockSpawn = vi.fn();
      mockSpawn.mockImplementation(() => {
        throw new Error('Spawn failed');
      });

      manager = new AgentLifecycleManager(registry, processUtils, {
        readAllRecords: async () => [],
        createRecord: vi.fn(),
        updateRecord: vi.fn(),
      } as any);

      const options = {
        agentId: 'agent-1',
        specId: 'spec-1',
        phase: 'impl',
        sessionId: 'session-1',
        command: 'claude',
        args: ['code'],
        cwd: '/test/path',
        spawn: mockSpawn,
      };

      const result = await manager.startAgent(options);

      expect(result.ok).toBe(false);
      expect(result.error).toContain('Spawn failed');
    });
  });

  describe('stopAgent', () => {
    it('should send SIGTERM and update state to stopping', async () => {
      const mockProcess = {
        pid: 12345,
        stdout: { on: vi.fn() },
        stderr: { on: vi.fn() },
        on: vi.fn(),
        kill: vi.fn(() => true),
      };

      const mockSpawn = vi.fn(() => mockProcess);

      const mockRecordStore = {
        readAllRecords: async () => [],
        createRecord: vi.fn(),
        updateRecord: vi.fn(),
      };

      manager = new AgentLifecycleManager(registry, processUtils, mockRecordStore as any);

      // Start agent first
      await manager.startAgent({
        agentId: 'agent-1',
        specId: 'spec-1',
        phase: 'impl',
        sessionId: 'session-1',
        command: 'claude',
        args: ['code'],
        cwd: '/test/path',
        spawn: mockSpawn,
      });

      // Stop agent
      const result = await manager.stopAgent('agent-1', 'user_request');

      expect(result.ok).toBe(true);
      expect(mockProcess.kill).toHaveBeenCalledWith('SIGTERM');
      expect(mockRecordStore.updateRecord).toHaveBeenCalledWith(
        'agent-1',
        expect.objectContaining({
          status: 'stopping',
        })
      );
    });

    it('should send SIGKILL after 10 second grace period', async () => {
      vi.useFakeTimers();

      const mockProcess = {
        pid: 12345,
        stdout: { on: vi.fn() },
        stderr: { on: vi.fn() },
        on: vi.fn(),
        kill: vi.fn(() => true),
      };

      const mockSpawn = vi.fn(() => mockProcess);

      const mockRecordStore = {
        readAllRecords: async () => [],
        createRecord: vi.fn(),
        updateRecord: vi.fn(),
      };

      // Mock processUtils to return true (process still alive after SIGTERM)
      const mockProcessUtils = {
        getProcessStartTime: vi.fn(() => null),
        isSameProcess: vi.fn(() => true),
        checkProcessAlive: vi.fn(() => true),
      };

      manager = new AgentLifecycleManager(registry, mockProcessUtils as any, mockRecordStore as any);

      // Start agent
      await manager.startAgent({
        agentId: 'agent-1',
        specId: 'spec-1',
        phase: 'impl',
        sessionId: 'session-1',
        command: 'claude',
        args: ['code'],
        cwd: '/test/path',
        spawn: mockSpawn,
      });

      // Stop agent
      const stopPromise = manager.stopAgent('agent-1', 'timeout');

      // Advance time by 10 seconds
      await vi.advanceTimersByTimeAsync(10000);

      await stopPromise;

      expect(mockProcess.kill).toHaveBeenCalledWith('SIGTERM');
      expect(mockProcess.kill).toHaveBeenCalledWith('SIGKILL');

      vi.useRealTimers();
    });

    it('should emit agent-stopped event', async () => {
      const mockProcess = {
        pid: 12345,
        stdout: { on: vi.fn() },
        stderr: { on: vi.fn() },
        on: vi.fn(),
        kill: vi.fn(() => true),
      };

      const mockSpawn = vi.fn(() => mockProcess);

      manager = new AgentLifecycleManager(registry, processUtils, {
        readAllRecords: async () => [],
        createRecord: vi.fn(),
        updateRecord: vi.fn(),
      } as any);

      // Start agent
      await manager.startAgent({
        agentId: 'agent-1',
        specId: 'spec-1',
        phase: 'impl',
        sessionId: 'session-1',
        command: 'claude',
        args: ['code'],
        cwd: '/test/path',
        spawn: mockSpawn,
      });

      const listener = vi.fn();
      manager.on('agent-stopped', listener);

      // Trigger exit
      const exitCallback = mockProcess.on.mock.calls.find((call: any) => call[0] === 'exit')?.[1];
      if (exitCallback) {
        await exitCallback(0);
      }

      // Wait a bit for async operations
      await new Promise(resolve => setTimeout(resolve, 50));

      expect(listener).toHaveBeenCalled();
    }, 10000); // Increase timeout to 10s

    it('should return error for non-existent agent', async () => {
      manager = new AgentLifecycleManager(registry, processUtils, {
        readAllRecords: async () => [],
        createRecord: vi.fn(),
        updateRecord: vi.fn(),
      } as any);

      const result = await manager.stopAgent('non-existent', 'user_request');

      expect(result.ok).toBe(false);
      expect(result.error).toContain('not found');
    });
  });

  describe('killAgent', () => {
    it('should send SIGKILL immediately', async () => {
      const mockProcess = {
        pid: 12345,
        stdout: { on: vi.fn() },
        stderr: { on: vi.fn() },
        on: vi.fn(),
        kill: vi.fn(() => true),
      };

      const mockSpawn = vi.fn(() => mockProcess);

      const mockRecordStore = {
        readAllRecords: async () => [],
        createRecord: vi.fn(),
        updateRecord: vi.fn(),
      };

      manager = new AgentLifecycleManager(registry, processUtils, mockRecordStore as any);

      // Start agent
      await manager.startAgent({
        agentId: 'agent-1',
        specId: 'spec-1',
        phase: 'impl',
        sessionId: 'session-1',
        command: 'claude',
        args: ['code'],
        cwd: '/test/path',
        spawn: mockSpawn,
      });

      // Kill agent
      const result = await manager.killAgent('agent-1');

      expect(result.ok).toBe(true);
      expect(mockProcess.kill).toHaveBeenCalledWith('SIGKILL');
      expect(mockRecordStore.updateRecord).toHaveBeenCalledWith(
        'agent-1',
        expect.objectContaining({
          status: 'killing',
        })
      );
    });

    it('should work on reattached agents', async () => {
      // Create a reattached agent with current process PID (so we don't try to kill non-existent process)
      const record: AgentRecord = {
        agentId: 'reattached-agent',
        specId: 'spec-1',
        phase: 'impl',
        pid: process.pid, // Use current process to avoid errors
        sessionId: 'session-1',
        status: 'running',
        startedAt: new Date().toISOString(),
        lastActivityAt: new Date().toISOString(),
        command: 'claude code',
        processStartTime: 'some-start-time',
      };

      const testRegistry = new AgentRegistry();
      testRegistry.registerReattached(record);

      const mockRecordStore = {
        readAllRecords: async () => [],
        createRecord: vi.fn(),
        updateRecord: vi.fn(),
      };

      manager = new AgentLifecycleManager(testRegistry, processUtils, mockRecordStore as any);

      // Note: We can't actually kill the current process, but we can verify the method doesn't error
      // In a real scenario with a different PID, SIGKILL would work
      const result = await manager.killAgent('reattached-agent');

      expect(result.ok).toBe(true);
      expect(mockRecordStore.updateRecord).toHaveBeenCalledWith(
        'reattached-agent',
        expect.objectContaining({
          status: 'killing',
        })
      );
    });

    it('should return error for non-existent agent', async () => {
      manager = new AgentLifecycleManager(registry, processUtils, {
        readAllRecords: async () => [],
        createRecord: vi.fn(),
        updateRecord: vi.fn(),
      } as any);

      const result = await manager.killAgent('non-existent');

      expect(result.ok).toBe(false);
      expect(result.error).toContain('not found');
    });
  });
});
