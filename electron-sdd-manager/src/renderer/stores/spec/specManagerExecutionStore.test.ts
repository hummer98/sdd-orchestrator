/**
 * SpecManagerExecutionStore Tests
 * TDD: Testing spec-manager execution state management
 * Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 6.7, 6.8
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useSpecManagerExecutionStore } from './specManagerExecutionStore';
import type { CheckImplResult } from './types';

describe('useSpecManagerExecutionStore', () => {
  beforeEach(() => {
    // Reset store state
    useSpecManagerExecutionStore.setState({
      isRunning: false,
      currentPhase: null,
      currentSpecId: null,
      lastCheckResult: null,
      error: null,
      implTaskStatus: null,
      retryCount: 0,
      executionMode: null,
    });
    vi.clearAllMocks();
  });

  describe('initial state (Req 6.1)', () => {
    it('should have correct initial values', () => {
      const state = useSpecManagerExecutionStore.getState();
      expect(state.isRunning).toBe(false);
      expect(state.currentPhase).toBeNull();
      expect(state.currentSpecId).toBeNull();
      expect(state.lastCheckResult).toBeNull();
      expect(state.error).toBeNull();
      expect(state.implTaskStatus).toBeNull();
      expect(state.retryCount).toBe(0);
      expect(state.executionMode).toBeNull();
    });
  });

  describe('executeSpecManagerGeneration (Req 6.2)', () => {
    it('should set running state during phase execution', async () => {
      window.electronAPI.executePhase = vi.fn().mockResolvedValue(undefined);

      const promise = useSpecManagerExecutionStore.getState().executeSpecManagerGeneration(
        'test-spec',
        'requirements',
        'test-feature',
        undefined,
        'manual'
      );

      // Check running state
      const state = useSpecManagerExecutionStore.getState();
      expect(state.isRunning).toBe(true);
      expect(state.currentPhase).toBe('requirements');
      expect(state.currentSpecId).toBe('test-spec');
      expect(state.executionMode).toBe('manual');

      await promise;
    });

    it('should call executePhase for non-impl phases', async () => {
      window.electronAPI.executePhase = vi.fn().mockResolvedValue(undefined);

      await useSpecManagerExecutionStore.getState().executeSpecManagerGeneration(
        'test-spec',
        'design',
        'test-feature',
        undefined,
        'auto'
      );

      expect(window.electronAPI.executePhase).toHaveBeenCalledWith(
        'test-spec',
        'design',
        'test-feature'
      );
    });

    it('should call executeTaskImpl for impl phase with taskId', async () => {
      window.electronAPI.executeTaskImpl = vi.fn().mockResolvedValue(undefined);

      await useSpecManagerExecutionStore.getState().executeSpecManagerGeneration(
        'test-spec',
        'impl',
        'test-feature',
        '1.1',
        'manual'
      );

      expect(window.electronAPI.executeTaskImpl).toHaveBeenCalledWith(
        'test-spec',
        'test-feature',
        '1.1'
      );
    });

    it('should set implTaskStatus to running for impl phase', async () => {
      window.electronAPI.executeTaskImpl = vi.fn().mockResolvedValue(undefined);

      useSpecManagerExecutionStore.getState().executeSpecManagerGeneration(
        'test-spec',
        'impl',
        'test-feature',
        '1.1',
        'manual'
      );

      const state = useSpecManagerExecutionStore.getState();
      expect(state.implTaskStatus).toBe('running');
    });

    it('should log warning and return if already running (Req 6.6)', async () => {
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      window.electronAPI.executePhase = vi.fn().mockResolvedValue(undefined);

      // Set running state
      useSpecManagerExecutionStore.setState({ isRunning: true, currentSpecId: 'other-spec' });

      await useSpecManagerExecutionStore.getState().executeSpecManagerGeneration(
        'test-spec',
        'requirements',
        'test-feature',
        undefined,
        'manual'
      );

      expect(warnSpy).toHaveBeenCalled();
      expect(window.electronAPI.executePhase).not.toHaveBeenCalled();
      // Should still be the original spec
      expect(useSpecManagerExecutionStore.getState().currentSpecId).toBe('other-spec');

      warnSpy.mockRestore();
    });

    it('should set error state if executeSpecManagerGeneration fails (Req 6.7)', async () => {
      window.electronAPI.executePhase = vi.fn().mockRejectedValue(new Error('Execution failed'));

      await useSpecManagerExecutionStore.getState().executeSpecManagerGeneration(
        'test-spec',
        'requirements',
        'test-feature',
        undefined,
        'manual'
      );

      const state = useSpecManagerExecutionStore.getState();
      expect(state.error).toBe('Execution failed');
      expect(state.isRunning).toBe(false);
      expect(state.implTaskStatus).toBe('error');
    });
  });

  describe('handleCheckImplResult (Req 6.3, 6.8)', () => {
    it('should set implTaskStatus to success', () => {
      const result: CheckImplResult = {
        status: 'success',
        completedTasks: ['1.1', '1.2'],
        stats: {
          num_turns: 5,
          duration_ms: 10000,
          total_cost_usd: 0.05,
        },
      };

      // First set to running
      useSpecManagerExecutionStore.setState({ isRunning: true, currentSpecId: 'test-spec' });

      useSpecManagerExecutionStore.getState().handleCheckImplResult(result);

      const state = useSpecManagerExecutionStore.getState();
      expect(state.implTaskStatus).toBe('success');
      expect(state.lastCheckResult).toEqual(result);
      expect(state.isRunning).toBe(false);
      expect(state.error).toBeNull();
    });
  });

  describe('updateImplTaskStatus (Req 6.4)', () => {
    it('should update implTaskStatus', () => {
      useSpecManagerExecutionStore.getState().updateImplTaskStatus('continuing');

      const state = useSpecManagerExecutionStore.getState();
      expect(state.implTaskStatus).toBe('continuing');
    });

    it('should update retryCount when provided', () => {
      useSpecManagerExecutionStore.getState().updateImplTaskStatus('continuing', 2);

      const state = useSpecManagerExecutionStore.getState();
      expect(state.retryCount).toBe(2);
    });

    it('should set isRunning to true for running/continuing status', () => {
      useSpecManagerExecutionStore.getState().updateImplTaskStatus('running');
      expect(useSpecManagerExecutionStore.getState().isRunning).toBe(true);

      useSpecManagerExecutionStore.setState({ isRunning: false });
      useSpecManagerExecutionStore.getState().updateImplTaskStatus('continuing');
      expect(useSpecManagerExecutionStore.getState().isRunning).toBe(true);
    });

    it('should set isRunning to false for terminal statuses', () => {
      useSpecManagerExecutionStore.setState({ isRunning: true });
      useSpecManagerExecutionStore.getState().updateImplTaskStatus('success');
      expect(useSpecManagerExecutionStore.getState().isRunning).toBe(false);

      useSpecManagerExecutionStore.setState({ isRunning: true });
      useSpecManagerExecutionStore.getState().updateImplTaskStatus('error');
      expect(useSpecManagerExecutionStore.getState().isRunning).toBe(false);

      useSpecManagerExecutionStore.setState({ isRunning: true });
      useSpecManagerExecutionStore.getState().updateImplTaskStatus('stalled');
      expect(useSpecManagerExecutionStore.getState().isRunning).toBe(false);
    });
  });

  describe('clearSpecManagerError (Req 6.5)', () => {
    it('should reset error state', () => {
      useSpecManagerExecutionStore.setState({ error: 'Some error', implTaskStatus: 'error' });

      useSpecManagerExecutionStore.getState().clearSpecManagerError();

      const state = useSpecManagerExecutionStore.getState();
      expect(state.error).toBeNull();
      expect(state.implTaskStatus).toBeNull();
    });
  });

  describe('execution mode', () => {
    it('should track auto execution mode', async () => {
      window.electronAPI.executePhase = vi.fn().mockResolvedValue(undefined);

      useSpecManagerExecutionStore.getState().executeSpecManagerGeneration(
        'test-spec',
        'requirements',
        'test-feature',
        undefined,
        'auto'
      );

      expect(useSpecManagerExecutionStore.getState().executionMode).toBe('auto');
    });

    it('should track manual execution mode', async () => {
      window.electronAPI.executePhase = vi.fn().mockResolvedValue(undefined);

      useSpecManagerExecutionStore.getState().executeSpecManagerGeneration(
        'test-spec',
        'requirements',
        'test-feature',
        undefined,
        'manual'
      );

      expect(useSpecManagerExecutionStore.getState().executionMode).toBe('manual');
    });
  });
});
