/**
 * Agent Lifecycle Management Integration Tests
 * Task 10.6: Integration tests for agent lifecycle management
 *
 * Tests:
 * - AutoExecutionCoordinator + AgentLifecycleManager: Timeout stop coordination
 * - SpecManagerService + AgentLifecycleManager: Process start delegation
 * - AgentWatchdog + AgentRegistry: Orphan detection flow
 *
 * Requirements: 1.4, 1.5, 9.1, 9.2, 9.3
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { EventEmitter } from 'events';

import { AgentLifecycleManager, type IAgentRecordStore } from './agentLifecycleManager';
import { AgentRegistry } from './agentRegistry';
import { ProcessUtils } from './processUtils';
import { AgentWatchdog } from './agentWatchdog';
import type { AgentRecord } from './agentRecordService';
import type { StopReason } from './agentLifecycleTypes';

// Mock AgentRecordStore
function createMockRecordStore(): IAgentRecordStore {
  const records: Map<string, AgentRecord> = new Map();

  return {
    readAllRecords: vi.fn(async () => Array.from(records.values())),
    createRecord: vi.fn(async (record: AgentRecord) => {
      records.set(record.agentId, record);
    }),
    updateRecord: vi.fn(async (agentId: string, updates: Partial<AgentRecord>) => {
      const existing = records.get(agentId);
      if (existing) {
        records.set(agentId, { ...existing, ...updates });
      }
    }),
  };
}

// Mock ProcessUtils
function createMockProcessUtils(overrides?: Partial<ProcessUtils>): ProcessUtils {
  const mockUtils = {
    checkProcessAlive: vi.fn().mockReturnValue(true),
    getProcessStartTime: vi.fn().mockReturnValue('Mon Jan 27 00:00:00 2026'),
    isSameProcess: vi.fn().mockReturnValue(true),
    ...overrides,
  };
  return mockUtils as unknown as ProcessUtils;
}

// Mock spawn that returns a mock ChildProcess
function createMockSpawn(pid: number = 12345) {
  const mockProcess = new EventEmitter() as any;
  mockProcess.pid = pid;
  mockProcess.stdout = new EventEmitter();
  mockProcess.stderr = new EventEmitter();
  mockProcess.stdin = { write: vi.fn() };
  mockProcess.kill = vi.fn().mockReturnValue(true);
  mockProcess.killed = false;

  return vi.fn().mockReturnValue(mockProcess);
}

describe('Agent Lifecycle Integration Tests', () => {
  let registry: AgentRegistry;
  let recordStore: IAgentRecordStore;
  let processUtils: ProcessUtils;
  let lifecycleManager: AgentLifecycleManager;

  beforeEach(() => {
    vi.useFakeTimers();
    registry = new AgentRegistry();
    recordStore = createMockRecordStore();
    processUtils = createMockProcessUtils();
    lifecycleManager = new AgentLifecycleManager(registry, processUtils, recordStore);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
    registry.clear();
    lifecycleManager.dispose();
  });

  describe('AutoExecutionCoordinator + AgentLifecycleManager: Timeout Stop Coordination', () => {
    /**
     * Requirement 1.5, 9.2: When AutoExecutionCoordinator detects timeout,
     * it should call AgentLifecycleManager.stopAgent(agentId, 'timeout')
     */
    it('should stop agent when timeout is triggered', async () => {
      // Arrange: Start an agent
      const mockSpawn = createMockSpawn(12345);
      const startResult = await lifecycleManager.startAgent({
        agentId: 'test-agent-1',
        specId: 'test-spec',
        phase: 'impl',
        sessionId: 'session-1',
        command: 'sleep',
        args: ['100'],
        cwd: '/tmp',
        spawn: mockSpawn,
      });

      expect(startResult.ok).toBe(true);

      // Verify agent is running
      const runningAgent = lifecycleManager.getAgent('test-agent-1');
      expect(runningAgent).toBeTruthy();
      expect(runningAgent?.state).toBe('running');

      // Act: Simulate timeout by calling stopAgent with 'timeout' reason
      // This is what AutoExecutionCoordinator should do when timeout occurs
      const stopResult = await lifecycleManager.stopAgent('test-agent-1', 'timeout');

      // Assert
      expect(stopResult.ok).toBe(true);

      // Verify state transition to stopping
      const stoppingAgent = lifecycleManager.getAgent('test-agent-1');
      expect(stoppingAgent?.state).toBe('stopping');

      // Verify SIGTERM was sent
      const mockProcess = mockSpawn.mock.results[0].value;
      expect(mockProcess.kill).toHaveBeenCalledWith('SIGTERM');

      // Verify record was updated
      expect(recordStore.updateRecord).toHaveBeenCalledWith('test-agent-1', expect.objectContaining({
        status: 'stopping',
      }));
    });

    /**
     * Requirement 3.1, 3.3: Timeout should trigger timed_out state before stopping
     */
    it('should transition through timed_out state on timeout', async () => {
      const mockSpawn = createMockSpawn(12345);
      await lifecycleManager.startAgent({
        agentId: 'test-agent-2',
        specId: 'test-spec',
        phase: 'impl',
        sessionId: 'session-2',
        command: 'sleep',
        args: ['100'],
        cwd: '/tmp',
        spawn: mockSpawn,
      });

      // Act: Stop with timeout reason
      await lifecycleManager.stopAgent('test-agent-2', 'timeout');

      // Assert: Record should show timed_out was set first
      expect(recordStore.updateRecord).toHaveBeenCalledWith('test-agent-2', expect.objectContaining({
        status: 'timed_out',
      }));
    });

    /**
     * Requirement 3.3: If process doesn't exit within grace period, SIGKILL should be sent
     */
    it('should send SIGKILL after grace period if process does not exit', async () => {
      // Create mock spawn that returns the same process instance
      const mockProcess = new EventEmitter() as any;
      mockProcess.pid = 12345;
      mockProcess.stdout = new EventEmitter();
      mockProcess.stderr = new EventEmitter();
      mockProcess.stdin = { write: vi.fn() };
      mockProcess.kill = vi.fn().mockReturnValue(true);
      mockProcess.killed = false;

      const mockSpawn = vi.fn().mockReturnValue(mockProcess);

      await lifecycleManager.startAgent({
        agentId: 'test-agent-3',
        specId: 'test-spec',
        phase: 'impl',
        sessionId: 'session-3',
        command: 'sleep',
        args: ['100'],
        cwd: '/tmp',
        spawn: mockSpawn,
      });

      // Act: Stop with timeout reason
      await lifecycleManager.stopAgent('test-agent-3', 'timeout');

      // Verify SIGTERM was sent
      expect(mockProcess.kill).toHaveBeenCalledWith('SIGTERM');

      // Fast forward 10 seconds (grace period)
      await vi.advanceTimersByTimeAsync(10000);

      // Assert: SIGKILL should be sent after grace period
      expect(mockProcess.kill).toHaveBeenCalledWith('SIGKILL');

      // Verify state transition to killing
      expect(recordStore.updateRecord).toHaveBeenCalledWith('test-agent-3', expect.objectContaining({
        status: 'killing',
      }));
    });
  });

  describe('AgentWatchdog + AgentRegistry: Orphan Detection Flow', () => {
    let watchdog: AgentWatchdog;

    beforeEach(() => {
      watchdog = new AgentWatchdog(registry, processUtils, lifecycleManager);
    });

    afterEach(() => {
      watchdog.stop();
    });

    /**
     * Requirement 7.2, 9.3: Watchdog should detect orphaned agents
     * (running state but process not alive)
     */
    it('should detect orphaned agents during health check', async () => {
      // Arrange: Create an agent handle and register it
      const mockSpawn = createMockSpawn(12345);
      await lifecycleManager.startAgent({
        agentId: 'orphan-agent',
        specId: 'test-spec',
        phase: 'impl',
        sessionId: 'session-orphan',
        command: 'sleep',
        args: ['100'],
        cwd: '/tmp',
        spawn: mockSpawn,
      });

      // Simulate process death (checkProcessAlive returns false)
      (processUtils.checkProcessAlive as any).mockReturnValue(false);

      // Act: Run health check
      const result = await watchdog.checkHealth();

      // Assert
      expect(result.orphansDetected).toBe(1);
      expect(result.checkedCount).toBe(1);

      // Verify agent was marked as interrupted with orphaned exit reason
      expect(recordStore.updateRecord).toHaveBeenCalledWith('orphan-agent', expect.objectContaining({
        status: 'interrupted',
        exitReason: 'orphaned',
      }));
    });

    /**
     * Requirement 7.3: Watchdog should kill zombie processes
     * (terminal state but process still alive)
     */
    it('should kill zombie processes during health check', async () => {
      // Arrange: Create an agent and manually set it to completed state
      const mockSpawn = createMockSpawn(12345);
      const mockProcess = mockSpawn();
      mockSpawn.mockReturnValue(mockProcess);

      await lifecycleManager.startAgent({
        agentId: 'zombie-agent',
        specId: 'test-spec',
        phase: 'impl',
        sessionId: 'session-zombie',
        command: 'sleep',
        args: ['100'],
        cwd: '/tmp',
        spawn: mockSpawn,
      });

      // Manually set state to completed (simulating terminal state with live process)
      const agent = registry.get('zombie-agent');
      if (agent) {
        agent.state = 'completed';
      }

      // Process is still alive
      (processUtils.checkProcessAlive as any).mockReturnValue(true);

      // Act: Run health check
      const result = await watchdog.checkHealth();

      // Assert
      expect(result.zombiesKilled).toBe(1);
    });

    /**
     * Requirement 7.1, 7.5: Watchdog should run at 30 second intervals
     */
    it('should run health check at 30 second intervals when started', () => {
      // Spy on checkHealth
      const checkHealthSpy = vi.spyOn(watchdog, 'checkHealth');

      // Start watchdog
      watchdog.start();

      // Should not have run yet
      expect(checkHealthSpy).not.toHaveBeenCalled();

      // Advance by 30 seconds
      vi.advanceTimersByTime(30000);

      // Should have run once
      expect(checkHealthSpy).toHaveBeenCalledTimes(1);

      // Advance by another 30 seconds
      vi.advanceTimersByTime(30000);

      // Should have run twice
      expect(checkHealthSpy).toHaveBeenCalledTimes(2);
    });
  });

  describe('AgentLifecycleManager Startup Synchronization', () => {
    /**
     * Requirement 5.1, 5.2: On startup, should read all records and check process state
     */
    it('should mark agents as interrupted if process is not alive on startup', async () => {
      // Arrange: Pre-populate record store with a "running" agent
      const existingRecord: AgentRecord = {
        agentId: 'stale-agent',
        specId: 'test-spec',
        phase: 'impl',
        pid: 99999,
        sessionId: 'session-stale',
        status: 'running',
        startedAt: '2026-01-27T00:00:00Z',
        lastActivityAt: '2026-01-27T00:00:00Z',
        command: 'claude -p --verbose',
        processStartTime: 'Mon Jan 27 00:00:00 2026',
      };

      (recordStore.readAllRecords as any).mockResolvedValue([existingRecord]);

      // Process is not alive
      (processUtils.checkProcessAlive as any).mockReturnValue(false);

      // Act: Synchronize on startup
      const result = await lifecycleManager.synchronizeOnStartup();

      // Assert
      expect(result.totalRecords).toBe(1);
      expect(result.markedInterrupted).toBe(1);
      expect(result.reattached).toBe(0);

      // Verify record was updated
      expect(recordStore.updateRecord).toHaveBeenCalledWith('stale-agent', expect.objectContaining({
        status: 'interrupted',
        exitReason: 'exited_while_app_closed',
      }));
    });

    /**
     * Requirement 5.3: Should detect PID reuse
     */
    it('should mark agents as interrupted if PID was reused', async () => {
      // Arrange: Pre-populate record store with a "running" agent
      const existingRecord: AgentRecord = {
        agentId: 'pid-reuse-agent',
        specId: 'test-spec',
        phase: 'impl',
        pid: 12345,
        sessionId: 'session-reuse',
        status: 'running',
        startedAt: '2026-01-27T00:00:00Z',
        lastActivityAt: '2026-01-27T00:00:00Z',
        command: 'claude -p --verbose',
        processStartTime: 'Mon Jan 27 00:00:00 2026',
      };

      (recordStore.readAllRecords as any).mockResolvedValue([existingRecord]);

      // Process is alive but with different start time (PID reuse)
      (processUtils.checkProcessAlive as any).mockReturnValue(true);
      (processUtils.isSameProcess as any).mockReturnValue(false);

      // Act: Synchronize on startup
      const result = await lifecycleManager.synchronizeOnStartup();

      // Assert
      expect(result.pidReused).toBe(1);

      // Verify record was updated
      expect(recordStore.updateRecord).toHaveBeenCalledWith('pid-reuse-agent', expect.objectContaining({
        status: 'interrupted',
        exitReason: 'pid_reused',
      }));
    });

    /**
     * Requirement 5.4: Should reattach to running processes
     */
    it('should reattach to processes that are still running', async () => {
      // Arrange: Pre-populate record store with a "running" agent
      const existingRecord: AgentRecord = {
        agentId: 'reattach-agent',
        specId: 'test-spec',
        phase: 'impl',
        pid: 12345,
        sessionId: 'session-reattach',
        status: 'running',
        startedAt: '2026-01-27T00:00:00Z',
        lastActivityAt: '2026-01-27T00:00:00Z',
        command: 'claude -p --verbose',
        processStartTime: 'Mon Jan 27 00:00:00 2026',
      };

      (recordStore.readAllRecords as any).mockResolvedValue([existingRecord]);

      // Process is alive and same
      (processUtils.checkProcessAlive as any).mockReturnValue(true);
      (processUtils.isSameProcess as any).mockReturnValue(true);

      // Act: Synchronize on startup
      const result = await lifecycleManager.synchronizeOnStartup();

      // Assert
      expect(result.reattached).toBe(1);

      // Verify agent was registered in registry
      const agent = registry.get('reattach-agent');
      expect(agent).toBeTruthy();
      expect(agent?.isReattached).toBe(true);
    });

    /**
     * Requirement 5.5: Should emit agent-state-synced event
     */
    it('should emit agent-state-synced event after synchronization', async () => {
      (recordStore.readAllRecords as any).mockResolvedValue([]);

      const syncedCallback = vi.fn();
      lifecycleManager.on('agent-state-synced', syncedCallback);

      // Act
      await lifecycleManager.synchronizeOnStartup();

      // Assert
      expect(syncedCallback).toHaveBeenCalled();
    });
  });

  describe('Event-Driven Monitoring (Layer 1)', () => {
    /**
     * Requirement 9.1: Agent exit events should update state immediately
     */
    it('should update state when agent process exits', async () => {
      // Create mock spawn that returns the same process instance
      const mockProcess = new EventEmitter() as any;
      mockProcess.pid = 12345;
      mockProcess.stdout = new EventEmitter();
      mockProcess.stderr = new EventEmitter();
      mockProcess.stdin = { write: vi.fn() };
      mockProcess.kill = vi.fn().mockReturnValue(true);
      mockProcess.killed = false;

      const mockSpawn = vi.fn().mockReturnValue(mockProcess);

      await lifecycleManager.startAgent({
        agentId: 'exit-agent',
        specId: 'test-spec',
        phase: 'impl',
        sessionId: 'session-exit',
        command: 'sleep',
        args: ['1'],
        cwd: '/tmp',
        spawn: mockSpawn,
      });

      // Listen for agent-stopped event
      const stoppedCallback = vi.fn();
      lifecycleManager.on('agent-stopped', stoppedCallback);

      // Simulate process exit with code 0 (async handler)
      mockProcess.emit('exit', 0);

      // Wait for async handler to complete
      await vi.waitFor(() => {
        expect(stoppedCallback).toHaveBeenCalled();
      });

      // Assert
      expect(stoppedCallback).toHaveBeenCalledWith(
        'exit-agent',
        expect.any(String), // reason
        'completed' // exitReason
      );

      // Verify record was updated
      expect(recordStore.updateRecord).toHaveBeenCalledWith('exit-agent', expect.objectContaining({
        status: 'completed',
        exitReason: 'completed',
      }));
    });

    /**
     * Requirement 9.1: Agent error events should update state immediately
     */
    it('should update state when agent process errors', async () => {
      // Create mock spawn that returns the same process instance
      const mockProcess = new EventEmitter() as any;
      mockProcess.pid = 12345;
      mockProcess.stdout = new EventEmitter();
      mockProcess.stderr = new EventEmitter();
      mockProcess.stdin = { write: vi.fn() };
      mockProcess.kill = vi.fn().mockReturnValue(true);
      mockProcess.killed = false;

      const mockSpawn = vi.fn().mockReturnValue(mockProcess);

      await lifecycleManager.startAgent({
        agentId: 'error-agent',
        specId: 'test-spec',
        phase: 'impl',
        sessionId: 'session-error',
        command: 'invalid-command',
        args: [],
        cwd: '/tmp',
        spawn: mockSpawn,
      });

      // Listen for agent-stopped event
      const stoppedCallback = vi.fn();
      lifecycleManager.on('agent-stopped', stoppedCallback);

      // Simulate process error (async handler)
      mockProcess.emit('error', new Error('Command not found'));

      // Wait for async handler to complete
      await vi.waitFor(() => {
        expect(stoppedCallback).toHaveBeenCalled();
      });

      // Assert
      expect(stoppedCallback).toHaveBeenCalledWith(
        'error-agent',
        expect.any(String), // reason
        'crashed' // exitReason
      );

      // Verify record was updated
      expect(recordStore.updateRecord).toHaveBeenCalledWith('error-agent', expect.objectContaining({
        status: 'failed',
        exitReason: 'crashed',
      }));
    });
  });
});
