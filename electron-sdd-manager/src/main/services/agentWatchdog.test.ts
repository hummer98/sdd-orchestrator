/**
 * Tests for AgentWatchdog
 * Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 9.3
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { AgentWatchdog } from './agentWatchdog';
import { AgentRegistry } from './agentRegistry';
import { ProcessUtils } from './processUtils';
import type { AgentLifecycleManager } from './agentLifecycleManager';

describe('AgentWatchdog', () => {
  let watchdog: AgentWatchdog;
  let registry: AgentRegistry;
  let processUtils: ProcessUtils;
  let mockLifecycleManager: Partial<AgentLifecycleManager>;

  beforeEach(() => {
    registry = new AgentRegistry();
    processUtils = new ProcessUtils();
    mockLifecycleManager = {
      killAgent: vi.fn(async () => ({ ok: true, value: undefined })),
    };
  });

  afterEach(() => {
    watchdog?.stop();
  });

  describe('initialization', () => {
    it('should create a watchdog instance', () => {
      watchdog = new AgentWatchdog(
        registry,
        processUtils,
        mockLifecycleManager as AgentLifecycleManager
      );

      expect(watchdog).toBeDefined();
    });

    it('should not start automatically', () => {
      watchdog = new AgentWatchdog(
        registry,
        processUtils,
        mockLifecycleManager as AgentLifecycleManager
      );

      // Watchdog should not be running initially
      expect(watchdog).toBeDefined();
    });
  });

  describe('start and stop', () => {
    it('should start the watchdog with 30 second interval', () => {
      vi.useFakeTimers();

      watchdog = new AgentWatchdog(
        registry,
        processUtils,
        mockLifecycleManager as AgentLifecycleManager
      );

      const checkHealthSpy = vi.spyOn(watchdog, 'checkHealth');

      watchdog.start();

      // Advance time by 30 seconds
      vi.advanceTimersByTime(30000);

      expect(checkHealthSpy).toHaveBeenCalled();

      vi.useRealTimers();
    });

    it('should stop the watchdog', () => {
      vi.useFakeTimers();

      watchdog = new AgentWatchdog(
        registry,
        processUtils,
        mockLifecycleManager as AgentLifecycleManager
      );

      const checkHealthSpy = vi.spyOn(watchdog, 'checkHealth');

      watchdog.start();
      watchdog.stop();

      // Advance time after stop
      vi.advanceTimersByTime(30000);

      // Should not be called after stop
      expect(checkHealthSpy).not.toHaveBeenCalled();

      vi.useRealTimers();
    });
  });

  describe('checkHealth', () => {
    it('should return healthy result when no agents', async () => {
      watchdog = new AgentWatchdog(
        registry,
        processUtils,
        mockLifecycleManager as AgentLifecycleManager
      );

      const result = await watchdog.checkHealth();

      expect(result.checkedCount).toBe(0);
      expect(result.orphansDetected).toBe(0);
      expect(result.zombiesKilled).toBe(0);
      expect(result.errors).toEqual([]);
    });

    it('should detect orphaned agents', async () => {
      // Mock an agent with non-existent PID
      const mockHandle = {
        agentId: 'orphan-agent',
        specId: 'spec-1',
        phase: 'impl',
        pid: 9999999, // Non-existent PID
        sessionId: 'session-1',
        state: 'running',
        isReattached: false,
        startedAt: new Date().toISOString(),
        processStartTime: 'some-time',
        exitReason: null,
      };

      registry.register(mockHandle as any);

      const mockUpdateRecord = vi.fn();
      mockLifecycleManager.recordStore = {
        updateRecord: mockUpdateRecord,
      } as any;

      watchdog = new AgentWatchdog(
        registry,
        processUtils,
        mockLifecycleManager as AgentLifecycleManager
      );

      const result = await watchdog.checkHealth();

      expect(result.orphansDetected).toBe(1);
      expect(mockUpdateRecord).toHaveBeenCalledWith(
        'orphan-agent',
        expect.objectContaining({
          status: 'interrupted',
          exitReason: 'orphaned',
        })
      );
    });

    it('should detect and kill zombie processes', async () => {
      // Mock an agent with current process PID (alive) but terminal state
      const mockHandle = {
        agentId: 'zombie-agent',
        specId: 'spec-1',
        phase: 'impl',
        pid: process.pid, // Current process (alive)
        sessionId: 'session-1',
        state: 'completed', // Terminal state
        isReattached: false,
        startedAt: new Date().toISOString(),
        processStartTime: 'some-time',
        exitReason: 'completed',
      };

      registry.register(mockHandle as any);

      watchdog = new AgentWatchdog(
        registry,
        processUtils,
        mockLifecycleManager as AgentLifecycleManager
      );

      const result = await watchdog.checkHealth();

      expect(result.zombiesKilled).toBe(1);
      expect(mockLifecycleManager.killAgent).toHaveBeenCalledWith('zombie-agent');
    });

    it('should handle errors gracefully', async () => {
      const mockHandle = {
        agentId: 'error-agent',
        specId: 'spec-1',
        phase: 'impl',
        pid: 12345,
        sessionId: 'session-1',
        state: 'running',
        isReattached: false,
        startedAt: new Date().toISOString(),
        processStartTime: 'some-time',
        exitReason: null,
      };

      registry.register(mockHandle as any);

      // Mock processUtils to throw error
      const mockProcessUtils = {
        ...processUtils,
        checkProcessAlive: vi.fn(() => {
          throw new Error('Check failed');
        }),
      };

      watchdog = new AgentWatchdog(
        registry,
        mockProcessUtils as any,
        mockLifecycleManager as AgentLifecycleManager
      );

      const result = await watchdog.checkHealth();

      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors[0]).toContain('Check failed');
    });
  });
});
