/**
 * BugAutoExecutionStore Tests
 * TDD: Testing bug auto-execution per-bug state management
 * bug-auto-execution-per-bug-state: Tasks 1.1, 1.2, 2.1, 2.2, 2.3, 3.1, 8.1, 8.2
 * Requirements: 1.1-1.4, 2.1-2.5, 3.1-3.4
 *
 * trpc-full-migration Task 7.2: Replace window.electronAPI with tRPC vanilla client
 * Requirements: 6.2 - AutoExecution全チャンネル移行
 */

// trpc-full-migration Task 7.2: Mock tRPC vanilla client for bugAutoExecution operations
// Task 9.2: Added events namespace for tRPC Subscription mocks
type SubscribeOptions = { onData?: (data: unknown) => void; onError?: (err: unknown) => void; onComplete?: () => void };
const eventSubscribers: Record<string, ((data: unknown) => void)[]> = {};
const mockUnsubscribeFns: Record<string, ReturnType<typeof vi.fn>[]> = {};

function createMockSubscription(eventName: string) {
  return {
    subscribe: (_input: unknown, opts?: SubscribeOptions) => {
      if (!eventSubscribers[eventName]) eventSubscribers[eventName] = [];
      if (!mockUnsubscribeFns[eventName]) mockUnsubscribeFns[eventName] = [];
      if (opts?.onData) eventSubscribers[eventName].push(opts.onData);
      const unsub = vi.fn();
      mockUnsubscribeFns[eventName].push(unsub);
      return { unsubscribe: unsub };
    },
  };
}

function emitMockEvent(eventName: string, data: unknown) {
  (eventSubscribers[eventName] || []).forEach((cb) => cb(data));
}

function clearEventSubscribers() {
  Object.keys(eventSubscribers).forEach((key) => delete eventSubscribers[key]);
  Object.keys(mockUnsubscribeFns).forEach((key) => delete mockUnsubscribeFns[key]);
}

const mockVanillaClient = {
  autoExecution: {
    bugGetStatus: { query: vi.fn() },
  },
  events: {
    onBugAutoExecutionStatusChanged: createMockSubscription('onBugAutoExecutionStatusChanged'),
    onBugAutoExecutionPhaseCompleted: createMockSubscription('onBugAutoExecutionPhaseCompleted'),
    onBugAutoExecutionCompleted: createMockSubscription('onBugAutoExecutionCompleted'),
    onBugAutoExecutionError: createMockSubscription('onBugAutoExecutionError'),
  },
};
vi.mock('../trpc/vanillaClient', () => ({
  getVanillaClient: () => mockVanillaClient,
}));

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import {
  useBugAutoExecutionStore,
  initBugAutoExecutionIpcListeners,
  cleanupBugAutoExecutionIpcListeners,
  DEFAULT_BUG_AUTO_EXECUTION_RUNTIME,
} from './bugAutoExecutionStore';
import type { BugAutoExecutionRuntimeState } from './bugAutoExecutionStore';

const TEST_BUG_PATH = '/project/.kiro/bugs/test-bug';
const TEST_BUG_PATH_2 = '/project/.kiro/bugs/another-bug';

// ============================================================
// Task 8.1: Store Unit Tests
// Requirements: 1.1, 1.2, 1.3, 1.4
// ============================================================

describe('useBugAutoExecutionStore', () => {
  beforeEach(() => {
    // Reset store state
    useBugAutoExecutionStore.setState({
      bugAutoExecutionRuntimeMap: new Map(),
    });
  });

  describe('initial state (Req 1.1)', () => {
    it('should have empty bugAutoExecutionRuntimeMap initially', () => {
      const state = useBugAutoExecutionStore.getState();
      expect(state.bugAutoExecutionRuntimeMap.size).toBe(0);
    });
  });

  describe('getBugAutoExecutionRuntime (Req 1.1, 1.3)', () => {
    it('should return default state for unknown bugPath', () => {
      const runtime = useBugAutoExecutionStore.getState().getBugAutoExecutionRuntime('unknown-path');
      expect(runtime.isAutoExecuting).toBe(false);
      expect(runtime.currentAutoPhase).toBeNull();
      expect(runtime.autoExecutionStatus).toBe('idle');
      expect(runtime.lastFailedPhase).toBeNull();
      expect(runtime.retryCount).toBe(0);
    });

    it('should return stored state for known bugPath', () => {
      useBugAutoExecutionStore.getState().startAutoExecution(TEST_BUG_PATH);
      const runtime = useBugAutoExecutionStore.getState().getBugAutoExecutionRuntime(TEST_BUG_PATH);
      expect(runtime.isAutoExecuting).toBe(true);
      expect(runtime.autoExecutionStatus).toBe('running');
    });

    it('should return a copy, not a reference', () => {
      const runtime1 = useBugAutoExecutionStore.getState().getBugAutoExecutionRuntime('unknown-path');
      const runtime2 = useBugAutoExecutionStore.getState().getBugAutoExecutionRuntime('unknown-path');
      expect(runtime1).toEqual(runtime2);
      expect(runtime1).not.toBe(runtime2);
    });
  });

  describe('startAutoExecution', () => {
    it('should set isAutoExecuting to true and status to running for specific bug', () => {
      useBugAutoExecutionStore.getState().startAutoExecution(TEST_BUG_PATH);
      const runtime = useBugAutoExecutionStore.getState().getBugAutoExecutionRuntime(TEST_BUG_PATH);
      expect(runtime.isAutoExecuting).toBe(true);
      expect(runtime.autoExecutionStatus).toBe('running');
    });

    it('should reset currentAutoPhase to null', () => {
      // First set a phase
      useBugAutoExecutionStore.getState().updateFromMainProcess(TEST_BUG_PATH, {
        status: 'running',
        currentPhase: 'analyze',
        retryCount: 0,
        lastFailedPhase: null,
      });
      // Then start new auto execution
      useBugAutoExecutionStore.getState().startAutoExecution(TEST_BUG_PATH);
      const runtime = useBugAutoExecutionStore.getState().getBugAutoExecutionRuntime(TEST_BUG_PATH);
      expect(runtime.currentAutoPhase).toBeNull();
    });

    it('should allow multiple bugs to be executing simultaneously', () => {
      useBugAutoExecutionStore.getState().startAutoExecution(TEST_BUG_PATH);
      useBugAutoExecutionStore.getState().startAutoExecution(TEST_BUG_PATH_2);

      const runtime1 = useBugAutoExecutionStore.getState().getBugAutoExecutionRuntime(TEST_BUG_PATH);
      const runtime2 = useBugAutoExecutionStore.getState().getBugAutoExecutionRuntime(TEST_BUG_PATH_2);

      expect(runtime1.isAutoExecuting).toBe(true);
      expect(runtime2.isAutoExecuting).toBe(true);
    });
  });

  describe('stopAutoExecution', () => {
    it('should reset auto execution state for specific bug', () => {
      // First start auto execution
      useBugAutoExecutionStore.getState().startAutoExecution(TEST_BUG_PATH);
      useBugAutoExecutionStore.getState().updateFromMainProcess(TEST_BUG_PATH, {
        status: 'running',
        currentPhase: 'fix',
        retryCount: 0,
        lastFailedPhase: null,
      });

      // Then stop
      useBugAutoExecutionStore.getState().stopAutoExecution(TEST_BUG_PATH);

      const runtime = useBugAutoExecutionStore.getState().getBugAutoExecutionRuntime(TEST_BUG_PATH);
      expect(runtime.isAutoExecuting).toBe(false);
      expect(runtime.currentAutoPhase).toBeNull();
      expect(runtime.autoExecutionStatus).toBe('idle');
    });

    it('should not affect other bugs when stopping one (Req 1.2)', () => {
      // Start both bugs
      useBugAutoExecutionStore.getState().startAutoExecution(TEST_BUG_PATH);
      useBugAutoExecutionStore.getState().startAutoExecution(TEST_BUG_PATH_2);

      // Stop only one
      useBugAutoExecutionStore.getState().stopAutoExecution(TEST_BUG_PATH);

      const runtime1 = useBugAutoExecutionStore.getState().getBugAutoExecutionRuntime(TEST_BUG_PATH);
      const runtime2 = useBugAutoExecutionStore.getState().getBugAutoExecutionRuntime(TEST_BUG_PATH_2);

      expect(runtime1.isAutoExecuting).toBe(false);
      expect(runtime2.isAutoExecuting).toBe(true);
    });

    it('should be idempotent (calling on already stopped bug does not throw)', () => {
      useBugAutoExecutionStore.getState().stopAutoExecution(TEST_BUG_PATH);
      useBugAutoExecutionStore.getState().stopAutoExecution(TEST_BUG_PATH);

      const runtime = useBugAutoExecutionStore.getState().getBugAutoExecutionRuntime(TEST_BUG_PATH);
      expect(runtime.isAutoExecuting).toBe(false);
      expect(runtime.autoExecutionStatus).toBe('idle');
    });
  });

  describe('updateFromMainProcess', () => {
    it('should update state for specific bug from Main Process data', () => {
      useBugAutoExecutionStore.getState().updateFromMainProcess(TEST_BUG_PATH, {
        status: 'running',
        currentPhase: 'analyze',
        retryCount: 0,
        lastFailedPhase: null,
      });

      const runtime = useBugAutoExecutionStore.getState().getBugAutoExecutionRuntime(TEST_BUG_PATH);
      expect(runtime.isAutoExecuting).toBe(true);
      expect(runtime.autoExecutionStatus).toBe('running');
      expect(runtime.currentAutoPhase).toBe('analyze');
    });

    it('should create new entry if bugPath does not exist', () => {
      const newBugPath = '/project/.kiro/bugs/new-bug';
      useBugAutoExecutionStore.getState().updateFromMainProcess(newBugPath, {
        status: 'running',
        currentPhase: 'fix',
        retryCount: 0,
        lastFailedPhase: null,
      });

      const runtime = useBugAutoExecutionStore.getState().getBugAutoExecutionRuntime(newBugPath);
      expect(runtime.isAutoExecuting).toBe(true);
      expect(runtime.currentAutoPhase).toBe('fix');
    });

    it('should handle paused status as still executing', () => {
      useBugAutoExecutionStore.getState().updateFromMainProcess(TEST_BUG_PATH, {
        status: 'paused',
        currentPhase: 'analyze',
        retryCount: 0,
        lastFailedPhase: null,
      });

      const runtime = useBugAutoExecutionStore.getState().getBugAutoExecutionRuntime(TEST_BUG_PATH);
      expect(runtime.isAutoExecuting).toBe(true);
      expect(runtime.autoExecutionStatus).toBe('paused');
    });
  });

  describe('setErrorState', () => {
    it('should set error state with lastFailedPhase and retryCount', () => {
      useBugAutoExecutionStore.getState().setErrorState(TEST_BUG_PATH, 'fix', 2);

      const runtime = useBugAutoExecutionStore.getState().getBugAutoExecutionRuntime(TEST_BUG_PATH);
      expect(runtime.isAutoExecuting).toBe(false);
      expect(runtime.autoExecutionStatus).toBe('error');
      expect(runtime.lastFailedPhase).toBe('fix');
      expect(runtime.retryCount).toBe(2);
    });
  });

  describe('setCompletedState', () => {
    it('should set completed state for specific bug', () => {
      // First start execution
      useBugAutoExecutionStore.getState().startAutoExecution(TEST_BUG_PATH);

      // Then complete
      useBugAutoExecutionStore.getState().setCompletedState(TEST_BUG_PATH);

      const runtime = useBugAutoExecutionStore.getState().getBugAutoExecutionRuntime(TEST_BUG_PATH);
      expect(runtime.isAutoExecuting).toBe(false);
      expect(runtime.autoExecutionStatus).toBe('completed');
      expect(runtime.currentAutoPhase).toBeNull();
    });
  });

  describe('isolation between bugs (Req 1.2)', () => {
    it('should maintain independent state for each bug', () => {
      // Set different states for different bugs
      useBugAutoExecutionStore.getState().startAutoExecution(TEST_BUG_PATH);
      useBugAutoExecutionStore.getState().updateFromMainProcess(TEST_BUG_PATH, {
        status: 'running',
        currentPhase: 'analyze',
        retryCount: 0,
        lastFailedPhase: null,
      });

      useBugAutoExecutionStore.getState().setErrorState(TEST_BUG_PATH_2, 'fix', 1);

      const runtime1 = useBugAutoExecutionStore.getState().getBugAutoExecutionRuntime(TEST_BUG_PATH);
      const runtime2 = useBugAutoExecutionStore.getState().getBugAutoExecutionRuntime(TEST_BUG_PATH_2);

      expect(runtime1.currentAutoPhase).toBe('analyze');
      expect(runtime1.autoExecutionStatus).toBe('running');
      expect(runtime1.isAutoExecuting).toBe(true);

      expect(runtime2.autoExecutionStatus).toBe('error');
      expect(runtime2.lastFailedPhase).toBe('fix');
      expect(runtime2.isAutoExecuting).toBe(false);
    });
  });

  // trpc-full-migration Task 7.2: tRPC integration tests
  describe('fetchBugAutoExecutionState via tRPC (Req 3.1, 3.2, 3.3, 3.4, Task 7.2)', () => {
    beforeEach(() => {
      vi.clearAllMocks();
    });

    it('should update store with fetched state via tRPC', async () => {
      mockVanillaClient.autoExecution.bugGetStatus.query.mockResolvedValue({
        bugPath: TEST_BUG_PATH,
        bugName: 'test-bug',
        status: 'running',
        currentPhase: 'verify',
        executedPhases: ['analyze', 'fix'],
        errors: [],
        startTime: Date.now(),
        lastActivityTime: Date.now(),
        retryCount: 0,
        lastFailedPhase: null,
      });

      await useBugAutoExecutionStore.getState().fetchBugAutoExecutionState(TEST_BUG_PATH);

      const runtime = useBugAutoExecutionStore.getState().getBugAutoExecutionRuntime(TEST_BUG_PATH);
      expect(runtime.isAutoExecuting).toBe(true);
      expect(runtime.autoExecutionStatus).toBe('running');
      expect(runtime.currentAutoPhase).toBe('verify');
    });

    it('should set default state when tRPC returns null (Req 3.3)', async () => {
      mockVanillaClient.autoExecution.bugGetStatus.query.mockResolvedValue(null);

      await useBugAutoExecutionStore.getState().fetchBugAutoExecutionState(TEST_BUG_PATH);

      const runtime = useBugAutoExecutionStore.getState().getBugAutoExecutionRuntime(TEST_BUG_PATH);
      expect(runtime).toEqual(DEFAULT_BUG_AUTO_EXECUTION_RUNTIME);
    });

    it('should call tRPC bugGetStatus with correct bugPath (Req 3.4)', async () => {
      mockVanillaClient.autoExecution.bugGetStatus.query.mockResolvedValue(null);

      await useBugAutoExecutionStore.getState().fetchBugAutoExecutionState(TEST_BUG_PATH);

      expect(mockVanillaClient.autoExecution.bugGetStatus.query).toHaveBeenCalledWith({ bugPath: TEST_BUG_PATH });
    });

    it('should handle tRPC errors gracefully and set default state', async () => {
      mockVanillaClient.autoExecution.bugGetStatus.query.mockRejectedValue(new Error('tRPC error'));

      await useBugAutoExecutionStore.getState().fetchBugAutoExecutionState(TEST_BUG_PATH);

      const runtime = useBugAutoExecutionStore.getState().getBugAutoExecutionRuntime(TEST_BUG_PATH);
      expect(runtime).toEqual(DEFAULT_BUG_AUTO_EXECUTION_RUNTIME);
    });
  });
});

// ============================================================
// Task 8.2: IPC Listener Unit Tests
// Requirements: 2.1, 2.2, 2.3, 2.4, 2.5
// ============================================================

// ============================================================
// Task 6.2: ApiClient Abstraction for Remote UI
// Requirements: 6.3 (Remote UIでバグ選択時にWebSocket経由で状態取得)
// ============================================================

describe('useBugAutoExecutionStore - ApiClient abstraction (Task 6.2)', () => {
  beforeEach(() => {
    // Reset store state
    useBugAutoExecutionStore.setState({
      bugAutoExecutionRuntimeMap: new Map(),
    });
  });

  describe('fetchBugAutoExecutionStateWithClient (Req 6.3)', () => {
    it('should fetch state via ApiClient', async () => {
      const mockApiClient = {
        getBugAutoExecutionStatus: vi.fn().mockResolvedValue({
          ok: true,
          value: {
            bugPath: TEST_BUG_PATH,
            bugName: 'test-bug',
            status: 'running',
            currentPhase: 'fix',
            executedPhases: ['analyze'],
            errors: [],
            startTime: Date.now(),
            lastActivityTime: Date.now(),
            retryCount: 1,
            lastFailedPhase: null,
          },
        }),
      };

      await useBugAutoExecutionStore.getState().fetchBugAutoExecutionStateWithClient(
        TEST_BUG_PATH,
        mockApiClient as unknown as import('../api/types').ApiClient
      );

      expect(mockApiClient.getBugAutoExecutionStatus).toHaveBeenCalledWith(TEST_BUG_PATH);
      const runtime = useBugAutoExecutionStore.getState().getBugAutoExecutionRuntime(TEST_BUG_PATH);
      expect(runtime.isAutoExecuting).toBe(true);
      expect(runtime.autoExecutionStatus).toBe('running');
      expect(runtime.currentAutoPhase).toBe('fix');
      expect(runtime.retryCount).toBe(1);
    });

    it('should set default state when ApiClient returns null', async () => {
      const mockApiClient = {
        getBugAutoExecutionStatus: vi.fn().mockResolvedValue({
          ok: true,
          value: null,
        }),
      };

      await useBugAutoExecutionStore.getState().fetchBugAutoExecutionStateWithClient(
        TEST_BUG_PATH,
        mockApiClient as unknown as import('../api/types').ApiClient
      );

      const runtime = useBugAutoExecutionStore.getState().getBugAutoExecutionRuntime(TEST_BUG_PATH);
      expect(runtime).toEqual(DEFAULT_BUG_AUTO_EXECUTION_RUNTIME);
    });

    it('should handle ApiClient error gracefully', async () => {
      const mockApiClient = {
        getBugAutoExecutionStatus: vi.fn().mockResolvedValue({
          ok: false,
          error: { type: 'API_ERROR', message: 'Connection failed' },
        }),
      };

      await useBugAutoExecutionStore.getState().fetchBugAutoExecutionStateWithClient(
        TEST_BUG_PATH,
        mockApiClient as unknown as import('../api/types').ApiClient
      );

      const runtime = useBugAutoExecutionStore.getState().getBugAutoExecutionRuntime(TEST_BUG_PATH);
      expect(runtime).toEqual(DEFAULT_BUG_AUTO_EXECUTION_RUNTIME);
    });
  });
});

// Task 9.2: IPC Listeners migrated to tRPC Subscriptions
describe('IPC Listeners for Bug Auto-Execution State Sync (tRPC Subscription)', () => {
  beforeEach(() => {
    // Reset store state
    useBugAutoExecutionStore.setState({
      bugAutoExecutionRuntimeMap: new Map(),
    });

    // Clear event subscribers
    clearEventSubscribers();
  });

  afterEach(() => {
    // Cleanup listeners after each test
    cleanupBugAutoExecutionIpcListeners();
  });

  describe('initBugAutoExecutionIpcListeners (Req 2.5)', () => {
    it('should subscribe to all tRPC event subscriptions', () => {
      const statusSpy = vi.spyOn(mockVanillaClient.events.onBugAutoExecutionStatusChanged, 'subscribe');
      const phaseSpy = vi.spyOn(mockVanillaClient.events.onBugAutoExecutionPhaseCompleted, 'subscribe');
      const completedSpy = vi.spyOn(mockVanillaClient.events.onBugAutoExecutionCompleted, 'subscribe');
      const errorSpy = vi.spyOn(mockVanillaClient.events.onBugAutoExecutionError, 'subscribe');

      initBugAutoExecutionIpcListeners();

      expect(statusSpy).toHaveBeenCalledTimes(1);
      expect(phaseSpy).toHaveBeenCalledTimes(1);
      expect(completedSpy).toHaveBeenCalledTimes(1);
      expect(errorSpy).toHaveBeenCalledTimes(1);
    });

    it('should not register duplicate listeners on second call (Req 2.5)', () => {
      const statusSpy = vi.spyOn(mockVanillaClient.events.onBugAutoExecutionStatusChanged, 'subscribe');

      initBugAutoExecutionIpcListeners();
      initBugAutoExecutionIpcListeners();

      // Should only be called once due to duplicate prevention
      expect(statusSpy).toHaveBeenCalledTimes(1);
    });
  });

  describe('cleanupBugAutoExecutionIpcListeners', () => {
    it('should call unsubscribe on all subscriptions', () => {
      initBugAutoExecutionIpcListeners();
      cleanupBugAutoExecutionIpcListeners();

      // All unsubscribe functions should have been called
      const allUnsubs = Object.values(mockUnsubscribeFns).flat();
      expect(allUnsubs.length).toBeGreaterThanOrEqual(4);
      allUnsubs.forEach((unsub) => expect(unsub).toHaveBeenCalled());
    });

    it('should allow re-registration after cleanup', () => {
      const statusSpy = vi.spyOn(mockVanillaClient.events.onBugAutoExecutionStatusChanged, 'subscribe');

      initBugAutoExecutionIpcListeners();
      cleanupBugAutoExecutionIpcListeners();
      clearEventSubscribers();
      initBugAutoExecutionIpcListeners();

      expect(statusSpy).toHaveBeenCalledTimes(2);
    });
  });

  describe('IPC event handling', () => {
    it('should update store when status changed event is received (Req 2.1)', () => {
      initBugAutoExecutionIpcListeners();

      // Simulate tRPC Subscription event
      emitMockEvent('onBugAutoExecutionStatusChanged', {
        bugPath: TEST_BUG_PATH,
        state: {
          bugPath: TEST_BUG_PATH,
          bugName: 'test-bug',
          status: 'running',
          currentPhase: 'analyze',
          executedPhases: [],
          errors: [],
          startTime: Date.now(),
          lastActivityTime: Date.now(),
          retryCount: 0,
          lastFailedPhase: null,
        },
      });

      const runtime = useBugAutoExecutionStore.getState().getBugAutoExecutionRuntime(TEST_BUG_PATH);
      expect(runtime.isAutoExecuting).toBe(true);
      expect(runtime.autoExecutionStatus).toBe('running');
      expect(runtime.currentAutoPhase).toBe('analyze');
    });

    it('should log when phase completed event is received (Req 2.2)', () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      initBugAutoExecutionIpcListeners();

      emitMockEvent('onBugAutoExecutionPhaseCompleted', {
        bugPath: TEST_BUG_PATH,
        phase: 'fix',
      });

      // Verify log was called with string containing both prefix and phase
      expect(consoleSpy).toHaveBeenCalled();
      const logCall = consoleSpy.mock.calls[0];
      expect(logCall[0]).toContain('[BugAutoExecutionStore]');
      expect(logCall[0]).toContain('fix');

      consoleSpy.mockRestore();
    });

    it('should update store to completed when completed event is received (Req 2.3)', () => {
      initBugAutoExecutionIpcListeners();

      // First set to running
      emitMockEvent('onBugAutoExecutionStatusChanged', {
        bugPath: TEST_BUG_PATH,
        state: {
          bugPath: TEST_BUG_PATH,
          bugName: 'test-bug',
          status: 'running',
          currentPhase: 'verify',
          executedPhases: ['analyze', 'fix'],
          errors: [],
          startTime: Date.now(),
          lastActivityTime: Date.now(),
          retryCount: 0,
          lastFailedPhase: null,
        },
      });

      // Then complete
      emitMockEvent('onBugAutoExecutionCompleted', { bugPath: TEST_BUG_PATH });

      const runtime = useBugAutoExecutionStore.getState().getBugAutoExecutionRuntime(TEST_BUG_PATH);
      expect(runtime.isAutoExecuting).toBe(false);
      expect(runtime.autoExecutionStatus).toBe('completed');
    });

    it('should update store to error when error event is received (Req 2.4)', () => {
      initBugAutoExecutionIpcListeners();

      // First set to running
      emitMockEvent('onBugAutoExecutionStatusChanged', {
        bugPath: TEST_BUG_PATH,
        state: {
          bugPath: TEST_BUG_PATH,
          bugName: 'test-bug',
          status: 'running',
          currentPhase: 'fix',
          executedPhases: ['analyze'],
          errors: [],
          startTime: Date.now(),
          lastActivityTime: Date.now(),
          retryCount: 0,
          lastFailedPhase: null,
        },
      });

      // Then error
      emitMockEvent('onBugAutoExecutionError', {
        bugPath: TEST_BUG_PATH,
        error: { type: 'PHASE_EXECUTION_FAILED', phase: 'fix' },
      });

      const runtime = useBugAutoExecutionStore.getState().getBugAutoExecutionRuntime(TEST_BUG_PATH);
      expect(runtime.isAutoExecuting).toBe(false);
      expect(runtime.autoExecutionStatus).toBe('error');
      expect(runtime.lastFailedPhase).toBe('fix');
    });

    it('should maintain independent state for multiple bugs via IPC events', () => {
      initBugAutoExecutionIpcListeners();

      // Start bug-a
      emitMockEvent('onBugAutoExecutionStatusChanged', {
        bugPath: TEST_BUG_PATH,
        state: {
          bugPath: TEST_BUG_PATH,
          bugName: 'test-bug',
          status: 'running',
          currentPhase: 'analyze',
          executedPhases: [],
          errors: [],
          startTime: Date.now(),
          lastActivityTime: Date.now(),
          retryCount: 0,
          lastFailedPhase: null,
        },
      });

      // Start bug-b
      emitMockEvent('onBugAutoExecutionStatusChanged', {
        bugPath: TEST_BUG_PATH_2,
        state: {
          bugPath: TEST_BUG_PATH_2,
          bugName: 'another-bug',
          status: 'running',
          currentPhase: 'fix',
          executedPhases: ['analyze'],
          errors: [],
          startTime: Date.now(),
          lastActivityTime: Date.now(),
          retryCount: 0,
          lastFailedPhase: null,
        },
      });

      const runtime1 = useBugAutoExecutionStore.getState().getBugAutoExecutionRuntime(TEST_BUG_PATH);
      const runtime2 = useBugAutoExecutionStore.getState().getBugAutoExecutionRuntime(TEST_BUG_PATH_2);

      expect(runtime1.isAutoExecuting).toBe(true);
      expect(runtime1.currentAutoPhase).toBe('analyze');

      expect(runtime2.isAutoExecuting).toBe(true);
      expect(runtime2.currentAutoPhase).toBe('fix');
    });
  });
});
