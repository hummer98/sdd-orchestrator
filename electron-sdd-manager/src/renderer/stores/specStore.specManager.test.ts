/**
 * Spec Store - spec-manager Extensions Tests
 * TDD: Testing spec-manager state management
 * Requirements: 5.2, 5.3, 5.4, 5.5, 5.7, 5.8
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useSpecStore } from './specStore';
import { useSpecManagerExecutionStore } from './spec/specManagerExecutionStore';
import { DEFAULT_SPEC_MANAGER_EXECUTION_STATE } from './spec/types';

describe('useSpecStore - spec-manager Extensions', () => {
  beforeEach(() => {
    // Reset store to initial state via actions instead of setState (for Facade compatibility)
    useSpecStore.getState().clearSelectedSpec();
    useSpecStore.getState().setSpecs([]);
    // Reset specManagerExecution state directly
    useSpecManagerExecutionStore.setState(DEFAULT_SPEC_MANAGER_EXECUTION_STATE);
    vi.clearAllMocks();
  });

  // ============================================================
  // Task 7.1: spec-manager用状態管理
  // Requirements: 5.2, 5.3, 5.4, 5.5, 5.7, 5.8
  // ============================================================
  describe('Task 7.1: specManagerExecution state', () => {
    describe('initial state', () => {
      it('should have isRunning as false initially', () => {
        const state = useSpecStore.getState();
        expect(state.specManagerExecution.isRunning).toBe(false);
      });

      it('should have currentPhase as null initially', () => {
        const state = useSpecStore.getState();
        expect(state.specManagerExecution.currentPhase).toBeNull();
      });

      it('should have currentSpecId as null initially', () => {
        const state = useSpecStore.getState();
        expect(state.specManagerExecution.currentSpecId).toBeNull();
      });

      it('should have lastCheckResult as null initially', () => {
        const state = useSpecStore.getState();
        expect(state.specManagerExecution.lastCheckResult).toBeNull();
      });

      it('should have error as null initially', () => {
        const state = useSpecStore.getState();
        expect(state.specManagerExecution.error).toBeNull();
      });

      it('should have implTaskStatus as null initially', () => {
        const state = useSpecStore.getState();
        expect(state.specManagerExecution.implTaskStatus).toBeNull();
      });

      it('should have retryCount as 0 initially', () => {
        const state = useSpecStore.getState();
        expect(state.specManagerExecution.retryCount).toBe(0);
      });

      it('should have executionMode as null initially', () => {
        const state = useSpecStore.getState();
        expect(state.specManagerExecution.executionMode).toBeNull();
      });
    });

    describe('executeSpecManagerGeneration action', () => {
      it('should set isRunning to true', async () => {
        window.electronAPI.executePhase = vi.fn().mockResolvedValue(undefined);

        // Start execution without awaiting
        useSpecStore.getState().executeSpecManagerGeneration(
          'test-spec',
          'requirements',
          'test-feature',
          undefined,
          'manual'
        );

        // isRunning should be true during execution
        expect(useSpecStore.getState().specManagerExecution.isRunning).toBe(true);
      });

      it('should set currentPhase to the executing phase', async () => {
        window.electronAPI.executePhase = vi.fn().mockImplementation(
          () => new Promise((resolve) => setTimeout(() => resolve(undefined), 100))
        );

        useSpecStore.getState().executeSpecManagerGeneration(
          'test-spec',
          'design',
          'test-feature',
          undefined,
          'auto'
        );

        // Check state during execution
        expect(useSpecStore.getState().specManagerExecution.currentPhase).toBe('design');
      });

      it('should set currentSpecId to the executing spec', async () => {
        window.electronAPI.executePhase = vi.fn().mockImplementation(
          () => new Promise((resolve) => setTimeout(() => resolve(undefined), 100))
        );

        useSpecStore.getState().executeSpecManagerGeneration(
          'my-spec',
          'tasks',
          'my-feature',
          undefined,
          'manual'
        );

        expect(useSpecStore.getState().specManagerExecution.currentSpecId).toBe('my-spec');
      });

      it('should set executionMode correctly', async () => {
        window.electronAPI.executePhase = vi.fn().mockResolvedValue(undefined);

        useSpecStore.getState().executeSpecManagerGeneration(
          'test-spec',
          'requirements',
          'test-feature',
          undefined,
          'auto'
        );

        // executionMode should be set
        expect(useSpecStore.getState().specManagerExecution.executionMode).toBe('auto');
      });

      it('should handle impl phase with taskId', async () => {
        window.electronAPI.executeTaskImpl = vi.fn().mockResolvedValue(undefined);

        useSpecStore.getState().executeSpecManagerGeneration(
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
    });

    describe('handleCheckImplResult action', () => {
      it('should update lastCheckResult', () => {
        const result = {
          status: 'success' as const,
          completedTasks: ['1.1', '1.2'],
          stats: {
            num_turns: 5,
            duration_ms: 10000,
            total_cost_usd: 0.05,
          },
        };

        useSpecStore.getState().handleCheckImplResult(result);

        const state = useSpecStore.getState();
        expect(state.specManagerExecution.lastCheckResult).toEqual(result);
      });

      it('should update implTaskStatus to success', () => {
        const result = {
          status: 'success' as const,
          completedTasks: ['1.1'],
          stats: {
            num_turns: 3,
            duration_ms: 5000,
            total_cost_usd: 0.02,
          },
        };

        useSpecStore.getState().handleCheckImplResult(result);

        const state = useSpecStore.getState();
        expect(state.specManagerExecution.implTaskStatus).toBe('success');
      });
    });

    describe('updateImplTaskStatus action', () => {
      it('should update implTaskStatus', () => {
        useSpecStore.getState().updateImplTaskStatus('running');

        const state = useSpecStore.getState();
        expect(state.specManagerExecution.implTaskStatus).toBe('running');
      });

      it('should update retryCount when provided', () => {
        useSpecStore.getState().updateImplTaskStatus('continuing', 1);

        const state = useSpecStore.getState();
        expect(state.specManagerExecution.implTaskStatus).toBe('continuing');
        expect(state.specManagerExecution.retryCount).toBe(1);
      });

      it('should handle stalled status', () => {
        useSpecStore.getState().updateImplTaskStatus('stalled', 2);

        const state = useSpecStore.getState();
        expect(state.specManagerExecution.implTaskStatus).toBe('stalled');
        expect(state.specManagerExecution.retryCount).toBe(2);
      });

      it('should handle error status', () => {
        useSpecStore.getState().updateImplTaskStatus('error');

        const state = useSpecStore.getState();
        expect(state.specManagerExecution.implTaskStatus).toBe('error');
      });
    });

    describe('clearSpecManagerError action', () => {
      it('should clear error', () => {
        useSpecStore.setState({
          specManagerExecution: {
            ...useSpecStore.getState().specManagerExecution,
            error: 'Some error occurred',
          },
        });

        useSpecStore.getState().clearSpecManagerError();

        const state = useSpecStore.getState();
        expect(state.specManagerExecution.error).toBeNull();
      });

      it('should reset implTaskStatus to null', () => {
        useSpecStore.setState({
          specManagerExecution: {
            ...useSpecStore.getState().specManagerExecution,
            implTaskStatus: 'error',
          },
        });

        useSpecStore.getState().clearSpecManagerError();

        const state = useSpecStore.getState();
        expect(state.specManagerExecution.implTaskStatus).toBeNull();
      });
    });

    describe('exclusive control', () => {
      it('should prevent concurrent spec-manager operations', async () => {
        // Use the actual API that the implementation calls
        window.electronAPI.executePhase = vi.fn().mockImplementation(
          () => new Promise((resolve) => setTimeout(() => resolve(undefined), 1000))
        );

        // Start first operation
        const promise1 = useSpecStore.getState().executeSpecManagerGeneration(
          'spec-a',
          'requirements',
          'feature-a',
          undefined,
          'manual'
        );

        // Check state immediately after starting first operation
        expect(useSpecStore.getState().specManagerExecution.isRunning).toBe(true);

        // Try to start second operation
        const promise2 = useSpecStore.getState().executeSpecManagerGeneration(
          'spec-b',
          'design',
          'feature-b',
          undefined,
          'manual'
        );

        // Second operation should be blocked (first operation still has isRunning=true)
        // The second operation should return early without changing state
        const state = useSpecStore.getState();
        expect(state.specManagerExecution.currentSpecId).toBe('spec-a');
        expect(state.specManagerExecution.currentPhase).toBe('requirements');

        await Promise.allSettled([promise1, promise2]);
      });
    });
  });
});

// Test ImplTaskStatus type
describe('ImplTaskStatus type', () => {
  const validStatuses = ['pending', 'running', 'continuing', 'success', 'error', 'stalled'];

  validStatuses.forEach((status) => {
    it(`should accept "${status}" as valid status`, () => {
      useSpecStore.getState().updateImplTaskStatus(status as any);
      expect(useSpecStore.getState().specManagerExecution.implTaskStatus).toBe(status);
    });
  });
});
