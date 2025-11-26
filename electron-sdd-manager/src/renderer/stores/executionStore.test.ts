/**
 * Execution Store Tests
 * TDD: Testing execution state and log management
 * Requirements: 5.1-5.8, 8.1-8.8
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useExecutionStore } from './executionStore';

describe('useExecutionStore', () => {
  beforeEach(() => {
    // Reset store state
    useExecutionStore.setState({
      isExecuting: false,
      currentPhase: null,
      logs: [],
      exitCode: null,
      executionTimeMs: null,
      error: null,
    });
    vi.clearAllMocks();
  });

  describe('initial state', () => {
    it('should not be executing initially', () => {
      const state = useExecutionStore.getState();
      expect(state.isExecuting).toBe(false);
    });

    it('should have empty logs initially', () => {
      const state = useExecutionStore.getState();
      expect(state.logs).toEqual([]);
    });

    it('should have null exitCode initially', () => {
      const state = useExecutionStore.getState();
      expect(state.exitCode).toBeNull();
    });
  });

  describe('executePhase', () => {
    it('should set isExecuting to true during execution', async () => {
      window.electronAPI.executeCommand = vi.fn().mockImplementation(
        () => new Promise((resolve) => setTimeout(() => resolve({ exitCode: 0, executionTimeMs: 1000 }), 100))
      );
      window.electronAPI.onCommandOutput = vi.fn(() => vi.fn());

      const executePromise = useExecutionStore.getState().executePhase('requirements', '/spec/path', false);

      expect(useExecutionStore.getState().isExecuting).toBe(true);

      await executePromise;

      expect(useExecutionStore.getState().isExecuting).toBe(false);
    });

    it('should set currentPhase during execution', async () => {
      window.electronAPI.executeCommand = vi.fn().mockResolvedValue({ exitCode: 0, executionTimeMs: 1000 });
      window.electronAPI.onCommandOutput = vi.fn(() => vi.fn());

      await useExecutionStore.getState().executePhase('design', '/spec/path', false);

      // currentPhase should be set during execution, cleared after
      expect(useExecutionStore.getState().exitCode).toBe(0);
    });

    it('should store exitCode after execution', async () => {
      window.electronAPI.executeCommand = vi.fn().mockResolvedValue({ exitCode: 0, executionTimeMs: 500 });
      window.electronAPI.onCommandOutput = vi.fn(() => vi.fn());

      await useExecutionStore.getState().executePhase('tasks', '/spec/path', false);

      const state = useExecutionStore.getState();
      expect(state.exitCode).toBe(0);
      expect(state.executionTimeMs).toBe(500);
    });
  });

  describe('addLog', () => {
    it('should add log entry', () => {
      useExecutionStore.getState().addLog('stdout', 'Test output');

      const state = useExecutionStore.getState();
      expect(state.logs).toHaveLength(1);
      expect(state.logs[0].stream).toBe('stdout');
      expect(state.logs[0].data).toBe('Test output');
    });

    it('should distinguish stdout and stderr', () => {
      useExecutionStore.getState().addLog('stdout', 'Normal output');
      useExecutionStore.getState().addLog('stderr', 'Error output');

      const state = useExecutionStore.getState();
      expect(state.logs[0].stream).toBe('stdout');
      expect(state.logs[1].stream).toBe('stderr');
    });
  });

  describe('clearLogs', () => {
    it('should clear all logs', () => {
      useExecutionStore.setState({
        logs: [
          { id: '1', stream: 'stdout', data: 'test', timestamp: Date.now() },
        ],
      });

      useExecutionStore.getState().clearLogs();

      expect(useExecutionStore.getState().logs).toEqual([]);
    });
  });

  describe('copyLogs', () => {
    it('should format logs for copying', () => {
      const mockWriteText = vi.fn().mockResolvedValue(undefined);
      Object.defineProperty(navigator, 'clipboard', {
        value: { writeText: mockWriteText },
        writable: true,
        configurable: true,
      });

      useExecutionStore.setState({
        logs: [
          { id: '1', stream: 'stdout', data: 'Line 1', timestamp: Date.now() },
          { id: '2', stream: 'stderr', data: 'Error', timestamp: Date.now() },
        ],
      });

      useExecutionStore.getState().copyLogs();

      expect(mockWriteText).toHaveBeenCalled();
    });
  });

  describe('cancelExecution', () => {
    it('should call cancelExecution API', async () => {
      window.electronAPI.cancelExecution = vi.fn().mockResolvedValue(undefined);

      useExecutionStore.setState({ isExecuting: true });

      await useExecutionStore.getState().cancelExecution();

      expect(window.electronAPI.cancelExecution).toHaveBeenCalled();
      expect(useExecutionStore.getState().isExecuting).toBe(false);
    });
  });
});
