/**
 * AutoExecutionStore Tests
 * TDD: Testing auto-execution runtime state management
 * Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7, 5.8
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { useAutoExecutionStore, initAutoExecutionIpcListeners, cleanupAutoExecutionIpcListeners } from './autoExecutionStore';
import { DEFAULT_AUTO_EXECUTION_RUNTIME } from './types';

const TEST_SPEC_ID = 'test-feature';

describe('useAutoExecutionStore', () => {
  beforeEach(() => {
    // Reset store state
    useAutoExecutionStore.setState({
      autoExecutionRuntimeMap: new Map(),
    });
  });

  describe('initial state (Req 5.1)', () => {
    it('should have empty autoExecutionRuntimeMap initially', () => {
      const state = useAutoExecutionStore.getState();
      expect(state.autoExecutionRuntimeMap.size).toBe(0);
    });
  });

  describe('getAutoExecutionRuntime (Req 5.2)', () => {
    it('should return default state for unknown specId (Req 5.8)', () => {
      const runtime = useAutoExecutionStore.getState().getAutoExecutionRuntime('unknown-spec');
      expect(runtime.isAutoExecuting).toBe(false);
      expect(runtime.currentAutoPhase).toBeNull();
      expect(runtime.autoExecutionStatus).toBe('idle');
    });

    it('should return stored state for known specId', () => {
      useAutoExecutionStore.getState().startAutoExecution(TEST_SPEC_ID);
      const runtime = useAutoExecutionStore.getState().getAutoExecutionRuntime(TEST_SPEC_ID);
      expect(runtime.isAutoExecuting).toBe(true);
      expect(runtime.autoExecutionStatus).toBe('running');
    });

    it('should return a copy, not a reference', () => {
      const runtime1 = useAutoExecutionStore.getState().getAutoExecutionRuntime('unknown-spec');
      const runtime2 = useAutoExecutionStore.getState().getAutoExecutionRuntime('unknown-spec');
      expect(runtime1).toEqual(runtime2);
      expect(runtime1).not.toBe(runtime2);
    });
  });

  describe('setAutoExecutionRunning (Req 5.3)', () => {
    it('should set isAutoExecuting to true for specific spec', () => {
      useAutoExecutionStore.getState().setAutoExecutionRunning(TEST_SPEC_ID, true);
      const runtime = useAutoExecutionStore.getState().getAutoExecutionRuntime(TEST_SPEC_ID);
      expect(runtime.isAutoExecuting).toBe(true);
    });

    it('should set isAutoExecuting to false for specific spec', () => {
      useAutoExecutionStore.getState().setAutoExecutionRunning(TEST_SPEC_ID, true);
      useAutoExecutionStore.getState().setAutoExecutionRunning(TEST_SPEC_ID, false);
      const runtime = useAutoExecutionStore.getState().getAutoExecutionRuntime(TEST_SPEC_ID);
      expect(runtime.isAutoExecuting).toBe(false);
    });

    it('should not affect other specs', () => {
      useAutoExecutionStore.getState().setAutoExecutionRunning(TEST_SPEC_ID, true);
      const otherRuntime = useAutoExecutionStore.getState().getAutoExecutionRuntime('other-spec');
      expect(otherRuntime.isAutoExecuting).toBe(false);
    });

    it('should preserve other state fields', () => {
      useAutoExecutionStore.getState().setAutoExecutionPhase(TEST_SPEC_ID, 'design');
      useAutoExecutionStore.getState().setAutoExecutionRunning(TEST_SPEC_ID, true);
      const runtime = useAutoExecutionStore.getState().getAutoExecutionRuntime(TEST_SPEC_ID);
      expect(runtime.currentAutoPhase).toBe('design');
    });
  });

  describe('setAutoExecutionPhase (Req 5.4)', () => {
    it('should set currentAutoPhase for specific spec', () => {
      useAutoExecutionStore.getState().setAutoExecutionPhase(TEST_SPEC_ID, 'design');
      const runtime = useAutoExecutionStore.getState().getAutoExecutionRuntime(TEST_SPEC_ID);
      expect(runtime.currentAutoPhase).toBe('design');
    });

    it('should allow setting to null', () => {
      useAutoExecutionStore.getState().setAutoExecutionPhase(TEST_SPEC_ID, 'tasks');
      useAutoExecutionStore.getState().setAutoExecutionPhase(TEST_SPEC_ID, null);
      const runtime = useAutoExecutionStore.getState().getAutoExecutionRuntime(TEST_SPEC_ID);
      expect(runtime.currentAutoPhase).toBeNull();
    });

    it('should support all workflow phases', () => {
      const phases = ['requirements', 'design', 'tasks', 'impl', 'inspection', 'deploy'] as const;
      for (const phase of phases) {
        useAutoExecutionStore.getState().setAutoExecutionPhase(TEST_SPEC_ID, phase);
        const runtime = useAutoExecutionStore.getState().getAutoExecutionRuntime(TEST_SPEC_ID);
        expect(runtime.currentAutoPhase).toBe(phase);
      }
    });
  });

  describe('setAutoExecutionStatus (Req 5.5)', () => {
    it('should set autoExecutionStatus to running for specific spec', () => {
      useAutoExecutionStore.getState().setAutoExecutionStatus(TEST_SPEC_ID, 'running');
      const runtime = useAutoExecutionStore.getState().getAutoExecutionRuntime(TEST_SPEC_ID);
      expect(runtime.autoExecutionStatus).toBe('running');
    });

    it('should set autoExecutionStatus to paused for specific spec', () => {
      useAutoExecutionStore.getState().setAutoExecutionStatus(TEST_SPEC_ID, 'paused');
      const runtime = useAutoExecutionStore.getState().getAutoExecutionRuntime(TEST_SPEC_ID);
      expect(runtime.autoExecutionStatus).toBe('paused');
    });

    it('should set autoExecutionStatus to completed for specific spec', () => {
      useAutoExecutionStore.getState().setAutoExecutionStatus(TEST_SPEC_ID, 'completed');
      const runtime = useAutoExecutionStore.getState().getAutoExecutionRuntime(TEST_SPEC_ID);
      expect(runtime.autoExecutionStatus).toBe('completed');
    });

    it('should set autoExecutionStatus to error for specific spec', () => {
      useAutoExecutionStore.getState().setAutoExecutionStatus(TEST_SPEC_ID, 'error');
      const runtime = useAutoExecutionStore.getState().getAutoExecutionRuntime(TEST_SPEC_ID);
      expect(runtime.autoExecutionStatus).toBe('error');
    });

    it('should support all status values', () => {
      const statuses = ['idle', 'running', 'paused', 'completing', 'error', 'completed'] as const;
      for (const status of statuses) {
        useAutoExecutionStore.getState().setAutoExecutionStatus(TEST_SPEC_ID, status);
        const runtime = useAutoExecutionStore.getState().getAutoExecutionRuntime(TEST_SPEC_ID);
        expect(runtime.autoExecutionStatus).toBe(status);
      }
    });
  });

  describe('startAutoExecution (Req 5.6)', () => {
    it('should set isAutoExecuting to true and status to running for specific spec', () => {
      useAutoExecutionStore.getState().startAutoExecution(TEST_SPEC_ID);
      const runtime = useAutoExecutionStore.getState().getAutoExecutionRuntime(TEST_SPEC_ID);
      expect(runtime.isAutoExecuting).toBe(true);
      expect(runtime.autoExecutionStatus).toBe('running');
    });

    it('should reset currentAutoPhase to null', () => {
      // First set a phase
      useAutoExecutionStore.getState().setAutoExecutionPhase(TEST_SPEC_ID, 'design');
      // Then start new auto execution
      useAutoExecutionStore.getState().startAutoExecution(TEST_SPEC_ID);
      const runtime = useAutoExecutionStore.getState().getAutoExecutionRuntime(TEST_SPEC_ID);
      expect(runtime.currentAutoPhase).toBeNull();
    });

    it('should allow multiple specs to be executing simultaneously', () => {
      useAutoExecutionStore.getState().startAutoExecution(TEST_SPEC_ID);
      useAutoExecutionStore.getState().startAutoExecution('another-spec');

      const runtime1 = useAutoExecutionStore.getState().getAutoExecutionRuntime(TEST_SPEC_ID);
      const runtime2 = useAutoExecutionStore.getState().getAutoExecutionRuntime('another-spec');

      expect(runtime1.isAutoExecuting).toBe(true);
      expect(runtime2.isAutoExecuting).toBe(true);
    });
  });

  describe('stopAutoExecution (Req 5.7)', () => {
    it('should reset auto execution state for specific spec', () => {
      // First start auto execution
      useAutoExecutionStore.getState().startAutoExecution(TEST_SPEC_ID);
      useAutoExecutionStore.getState().setAutoExecutionPhase(TEST_SPEC_ID, 'design');

      // Then stop
      useAutoExecutionStore.getState().stopAutoExecution(TEST_SPEC_ID);

      const runtime = useAutoExecutionStore.getState().getAutoExecutionRuntime(TEST_SPEC_ID);
      expect(runtime.isAutoExecuting).toBe(false);
      expect(runtime.currentAutoPhase).toBeNull();
      expect(runtime.autoExecutionStatus).toBe('idle');
    });

    it('should not affect other specs when stopping one', () => {
      // Start both specs
      useAutoExecutionStore.getState().startAutoExecution(TEST_SPEC_ID);
      useAutoExecutionStore.getState().startAutoExecution('another-spec');

      // Stop only one
      useAutoExecutionStore.getState().stopAutoExecution(TEST_SPEC_ID);

      const runtime1 = useAutoExecutionStore.getState().getAutoExecutionRuntime(TEST_SPEC_ID);
      const runtime2 = useAutoExecutionStore.getState().getAutoExecutionRuntime('another-spec');

      expect(runtime1.isAutoExecuting).toBe(false);
      expect(runtime2.isAutoExecuting).toBe(true);
    });

    it('should be idempotent (calling on already stopped spec does not throw)', () => {
      useAutoExecutionStore.getState().stopAutoExecution(TEST_SPEC_ID);
      useAutoExecutionStore.getState().stopAutoExecution(TEST_SPEC_ID);

      const runtime = useAutoExecutionStore.getState().getAutoExecutionRuntime(TEST_SPEC_ID);
      expect(runtime.isAutoExecuting).toBe(false);
      expect(runtime.autoExecutionStatus).toBe('idle');
    });
  });

  describe('isolation between specs', () => {
    it('should maintain independent state for each spec', () => {
      // Set different states for different specs
      useAutoExecutionStore.getState().startAutoExecution('spec-a');
      useAutoExecutionStore.getState().setAutoExecutionPhase('spec-a', 'requirements');

      useAutoExecutionStore.getState().startAutoExecution('spec-b');
      useAutoExecutionStore.getState().setAutoExecutionPhase('spec-b', 'design');
      useAutoExecutionStore.getState().setAutoExecutionStatus('spec-b', 'paused');

      const runtimeA = useAutoExecutionStore.getState().getAutoExecutionRuntime('spec-a');
      const runtimeB = useAutoExecutionStore.getState().getAutoExecutionRuntime('spec-b');

      expect(runtimeA.currentAutoPhase).toBe('requirements');
      expect(runtimeA.autoExecutionStatus).toBe('running');

      expect(runtimeB.currentAutoPhase).toBe('design');
      expect(runtimeB.autoExecutionStatus).toBe('paused');
    });
  });
});

// ============================================================
// IPC Listener Tests (bug fix: auto-execution-state-sync)
// ============================================================

describe('IPC Listeners for Auto-Execution State Sync', () => {
  // Store callbacks registered via mock electronAPI
  let statusChangedCallback: ((data: { specPath: string; state: unknown }) => void) | null = null;
  let phaseCompletedCallback: ((data: { specPath: string; phase: string }) => void) | null = null;
  let errorCallback: ((data: { specPath: string; error: { type: string; message?: string } }) => void) | null = null;

  // Mock unsubscribe functions
  const mockUnsubscribeStatus = vi.fn();
  const mockUnsubscribePhase = vi.fn();
  const mockUnsubscribeError = vi.fn();

  beforeEach(() => {
    // Reset store state
    useAutoExecutionStore.setState({
      autoExecutionRuntimeMap: new Map(),
    });

    // Reset callbacks
    statusChangedCallback = null;
    phaseCompletedCallback = null;
    errorCallback = null;

    // Reset mocks
    mockUnsubscribeStatus.mockClear();
    mockUnsubscribePhase.mockClear();
    mockUnsubscribeError.mockClear();

    // Mock window.electronAPI
    (global as unknown as { window: { electronAPI: unknown } }).window = {
      electronAPI: {
        onAutoExecutionStatusChanged: vi.fn((callback) => {
          statusChangedCallback = callback;
          return mockUnsubscribeStatus;
        }),
        onAutoExecutionPhaseCompleted: vi.fn((callback) => {
          phaseCompletedCallback = callback;
          return mockUnsubscribePhase;
        }),
        onAutoExecutionError: vi.fn((callback) => {
          errorCallback = callback;
          return mockUnsubscribeError;
        }),
      },
    };
  });

  afterEach(() => {
    // Cleanup listeners after each test
    cleanupAutoExecutionIpcListeners();
  });

  describe('initAutoExecutionIpcListeners', () => {
    it('should register all IPC event listeners', () => {
      initAutoExecutionIpcListeners();

      expect(window.electronAPI.onAutoExecutionStatusChanged).toHaveBeenCalledTimes(1);
      expect(window.electronAPI.onAutoExecutionPhaseCompleted).toHaveBeenCalledTimes(1);
      expect(window.electronAPI.onAutoExecutionError).toHaveBeenCalledTimes(1);
    });

    it('should not register duplicate listeners on second call', () => {
      initAutoExecutionIpcListeners();
      initAutoExecutionIpcListeners();

      // Should only be called once due to duplicate prevention
      expect(window.electronAPI.onAutoExecutionStatusChanged).toHaveBeenCalledTimes(1);
    });
  });

  describe('cleanupAutoExecutionIpcListeners', () => {
    it('should call unsubscribe functions for all listeners', () => {
      initAutoExecutionIpcListeners();
      cleanupAutoExecutionIpcListeners();

      expect(mockUnsubscribeStatus).toHaveBeenCalledTimes(1);
      expect(mockUnsubscribePhase).toHaveBeenCalledTimes(1);
      expect(mockUnsubscribeError).toHaveBeenCalledTimes(1);
    });

    it('should allow re-registration after cleanup', () => {
      initAutoExecutionIpcListeners();
      cleanupAutoExecutionIpcListeners();
      initAutoExecutionIpcListeners();

      expect(window.electronAPI.onAutoExecutionStatusChanged).toHaveBeenCalledTimes(2);
    });
  });

  describe('IPC event handling', () => {
    it('should update specStore when status changed event is received with running status', () => {
      initAutoExecutionIpcListeners();

      // Simulate IPC event from Main Process
      statusChangedCallback?.({
        specPath: '/project/.kiro/specs/test-feature',
        state: {
          specPath: '/project/.kiro/specs/test-feature',
          specId: TEST_SPEC_ID,
          status: 'running',
          currentPhase: 'design',
          executedPhases: ['requirements'],
          errors: [],
          startTime: Date.now(),
          lastActivityTime: Date.now(),
        },
      });

      const runtime = useAutoExecutionStore.getState().getAutoExecutionRuntime(TEST_SPEC_ID);
      expect(runtime.isAutoExecuting).toBe(true);
      expect(runtime.autoExecutionStatus).toBe('running');
      expect(runtime.currentAutoPhase).toBe('design');
    });

    it('should update specStore when status changed event is received with completed status', () => {
      initAutoExecutionIpcListeners();

      // First set to running
      statusChangedCallback?.({
        specPath: '/project/.kiro/specs/test-feature',
        state: {
          specPath: '/project/.kiro/specs/test-feature',
          specId: TEST_SPEC_ID,
          status: 'running',
          currentPhase: 'impl',
          executedPhases: ['requirements', 'design', 'tasks'],
          errors: [],
          startTime: Date.now(),
          lastActivityTime: Date.now(),
        },
      });

      // Then complete
      statusChangedCallback?.({
        specPath: '/project/.kiro/specs/test-feature',
        state: {
          specPath: '/project/.kiro/specs/test-feature',
          specId: TEST_SPEC_ID,
          status: 'completed',
          currentPhase: null,
          executedPhases: ['requirements', 'design', 'tasks', 'impl'],
          errors: [],
          startTime: Date.now(),
          lastActivityTime: Date.now(),
        },
      });

      const runtime = useAutoExecutionStore.getState().getAutoExecutionRuntime(TEST_SPEC_ID);
      expect(runtime.isAutoExecuting).toBe(false);
      expect(runtime.autoExecutionStatus).toBe('completed');
      expect(runtime.currentAutoPhase).toBeNull();
    });

    it('should update specStore when status changed event is received with error status', () => {
      initAutoExecutionIpcListeners();

      statusChangedCallback?.({
        specPath: '/project/.kiro/specs/test-feature',
        state: {
          specPath: '/project/.kiro/specs/test-feature',
          specId: TEST_SPEC_ID,
          status: 'error',
          currentPhase: 'design',
          executedPhases: ['requirements'],
          errors: ['PHASE_EXECUTION_FAILED'],
          startTime: Date.now(),
          lastActivityTime: Date.now(),
        },
      });

      const runtime = useAutoExecutionStore.getState().getAutoExecutionRuntime(TEST_SPEC_ID);
      expect(runtime.isAutoExecuting).toBe(false);
      expect(runtime.autoExecutionStatus).toBe('error');
    });

    it('should handle paused status as still executing', () => {
      initAutoExecutionIpcListeners();

      statusChangedCallback?.({
        specPath: '/project/.kiro/specs/test-feature',
        state: {
          specPath: '/project/.kiro/specs/test-feature',
          specId: TEST_SPEC_ID,
          status: 'paused',
          currentPhase: 'design',
          executedPhases: ['requirements'],
          errors: [],
          startTime: Date.now(),
          lastActivityTime: Date.now(),
        },
      });

      const runtime = useAutoExecutionStore.getState().getAutoExecutionRuntime(TEST_SPEC_ID);
      expect(runtime.isAutoExecuting).toBe(true);
      expect(runtime.autoExecutionStatus).toBe('paused');
    });

    it('should handle completing status as still executing', () => {
      initAutoExecutionIpcListeners();

      statusChangedCallback?.({
        specPath: '/project/.kiro/specs/test-feature',
        state: {
          specPath: '/project/.kiro/specs/test-feature',
          specId: TEST_SPEC_ID,
          status: 'completing',
          currentPhase: null,
          executedPhases: ['requirements', 'design', 'tasks', 'impl'],
          errors: [],
          startTime: Date.now(),
          lastActivityTime: Date.now(),
        },
      });

      const runtime = useAutoExecutionStore.getState().getAutoExecutionRuntime(TEST_SPEC_ID);
      expect(runtime.isAutoExecuting).toBe(true);
      expect(runtime.autoExecutionStatus).toBe('completing');
    });

    it('should maintain independent state for multiple specs via IPC events', () => {
      initAutoExecutionIpcListeners();

      // Start spec-a
      statusChangedCallback?.({
        specPath: '/project/.kiro/specs/spec-a',
        state: {
          specPath: '/project/.kiro/specs/spec-a',
          specId: 'spec-a',
          status: 'running',
          currentPhase: 'requirements',
          executedPhases: [],
          errors: [],
          startTime: Date.now(),
          lastActivityTime: Date.now(),
        },
      });

      // Start spec-b
      statusChangedCallback?.({
        specPath: '/project/.kiro/specs/spec-b',
        state: {
          specPath: '/project/.kiro/specs/spec-b',
          specId: 'spec-b',
          status: 'running',
          currentPhase: 'design',
          executedPhases: ['requirements'],
          errors: [],
          startTime: Date.now(),
          lastActivityTime: Date.now(),
        },
      });

      const runtimeA = useAutoExecutionStore.getState().getAutoExecutionRuntime('spec-a');
      const runtimeB = useAutoExecutionStore.getState().getAutoExecutionRuntime('spec-b');

      expect(runtimeA.isAutoExecuting).toBe(true);
      expect(runtimeA.currentAutoPhase).toBe('requirements');

      expect(runtimeB.isAutoExecuting).toBe(true);
      expect(runtimeB.currentAutoPhase).toBe('design');
    });
  });
});
