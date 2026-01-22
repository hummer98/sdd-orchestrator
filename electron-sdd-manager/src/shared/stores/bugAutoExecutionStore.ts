/**
 * BugAutoExecutionStore
 * Manages per-bug auto-execution runtime state
 * bug-auto-execution-per-bug-state: Tasks 1.1, 1.2, 2.1, 2.2, 2.3, 3.1
 * Requirements: 1.1-1.4, 2.1-2.5, 3.1-3.4, 6.1, 6.4
 *
 * This store is the Single Source of Truth (SSoT) for bug auto-execution state
 * on the Renderer side. IPC events from Main Process update this store directly.
 * Shared between Electron and Remote UI (placed in shared/stores/).
 */

import { create } from 'zustand';
import type { BugWorkflowPhase } from '../../renderer/types/bug';
import type { BugAutoExecutionStatus } from '../../renderer/types/bugAutoExecution';
import type { ApiClient } from '../api/types';

/**
 * Bug Auto Execution State Response (from API)
 * Requirements: 6.3 (bug-auto-execution-per-bug-state Task 6.2)
 */
export interface BugAutoExecutionStateResponse {
  readonly bugPath: string;
  readonly bugName: string;
  readonly status: 'idle' | 'running' | 'paused' | 'completed' | 'error';
  readonly currentPhase: string | null;
  readonly executedPhases: string[];
  readonly errors: string[];
  readonly startTime: number;
  readonly lastActivityTime: number;
  readonly retryCount: number;
  readonly lastFailedPhase: string | null;
}

// ============================================================
// Task 1.1: Bug Auto Execution Runtime State Types
// Requirements: 1.4
// ============================================================

/**
 * Bug Auto Execution Runtime State (per-bug)
 * Runtime state for auto-execution (not persisted to bug.json)
 */
export interface BugAutoExecutionRuntimeState {
  /** Auto-executing flag */
  readonly isAutoExecuting: boolean;
  /** Current auto-execution phase */
  readonly currentAutoPhase: BugWorkflowPhase | null;
  /** Detailed auto-execution status */
  readonly autoExecutionStatus: BugAutoExecutionStatus;
  /** Last failed phase */
  readonly lastFailedPhase: BugWorkflowPhase | null;
  /** Retry count */
  readonly retryCount: number;
}

/** Bug Auto Execution Runtime Map type */
export type BugAutoExecutionRuntimeMap = Map<string, BugAutoExecutionRuntimeState>;

/** Default Bug Auto Execution Runtime State values */
export const DEFAULT_BUG_AUTO_EXECUTION_RUNTIME: BugAutoExecutionRuntimeState = {
  isAutoExecuting: false,
  currentAutoPhase: null,
  autoExecutionStatus: 'idle',
  lastFailedPhase: null,
  retryCount: 0,
};

// ============================================================
// Task 1.2: Store State and Actions
// Requirements: 1.1, 1.2, 1.3
// ============================================================

/** Store State */
interface BugAutoExecutionState {
  readonly bugAutoExecutionRuntimeMap: BugAutoExecutionRuntimeMap;
}

/** Main Process State (for IPC events) */
interface MainProcessBugAutoExecutionState {
  readonly status: 'idle' | 'running' | 'paused' | 'completed' | 'error';
  readonly currentPhase: string | null;
  readonly retryCount: number;
  readonly lastFailedPhase: string | null;
}

/** Store Actions */
interface BugAutoExecutionActions {
  /** Get state for a specific bugPath (returns default if not found) */
  getBugAutoExecutionRuntime(bugPath: string): BugAutoExecutionRuntimeState;

  /** Fetch state from Main Process (pull) - Req 3.1, 3.2, 3.3, 3.4 */
  fetchBugAutoExecutionState(bugPath: string): Promise<void>;

  /**
   * Fetch state via ApiClient (for Remote UI)
   * Requirements: 6.3 (bug-auto-execution-per-bug-state Task 6.2)
   * Uses ApiClient abstraction instead of window.electronAPI directly
   */
  fetchBugAutoExecutionStateWithClient(bugPath: string, apiClient: ApiClient): Promise<void>;

  /** Start auto execution (Map update) */
  startAutoExecution(bugPath: string): void;

  /** Stop auto execution (Map update) */
  stopAutoExecution(bugPath: string): void;

  /** Update from Main Process state (IPC event) - Req 2.1 */
  updateFromMainProcess(bugPath: string, state: MainProcessBugAutoExecutionState): void;

  /** Set error state (IPC event) - Req 2.4 */
  setErrorState(bugPath: string, lastFailedPhase: BugWorkflowPhase | null, retryCount: number): void;

  /** Set completed state (IPC event) - Req 2.3 */
  setCompletedState(bugPath: string): void;
}

type BugAutoExecutionStore = BugAutoExecutionState & BugAutoExecutionActions;

// ============================================================
// Store Implementation
// ============================================================

export const useBugAutoExecutionStore = create<BugAutoExecutionStore>((set, get) => ({
  // Initial state
  bugAutoExecutionRuntimeMap: new Map(),

  // Actions

  /**
   * Get bug auto execution runtime state for a specific bug
   * Returns default state if not found
   * Requirement 1.1, 1.3
   */
  getBugAutoExecutionRuntime: (bugPath: string): BugAutoExecutionRuntimeState => {
    const map = get().bugAutoExecutionRuntimeMap;
    const runtime = map.get(bugPath);
    // Return a copy to prevent external mutation
    return runtime ? { ...runtime } : { ...DEFAULT_BUG_AUTO_EXECUTION_RUNTIME };
  },

  /**
   * Fetch bug auto execution state from Main Process (pull)
   * Requirements: 3.1, 3.2, 3.3, 3.4
   */
  fetchBugAutoExecutionState: async (bugPath: string): Promise<void> => {
    try {
      const result = await window.electronAPI.bugAutoExecutionStatus({ bugPath });

      const map = new Map(get().bugAutoExecutionRuntimeMap);

      if (result) {
        // Req 3.2: Update store with fetched state
        const status = result.status as MainProcessBugAutoExecutionState['status'];
        map.set(bugPath, {
          isAutoExecuting: status === 'running' || status === 'paused',
          currentAutoPhase: result.currentPhase as BugWorkflowPhase | null,
          autoExecutionStatus: status as BugAutoExecutionStatus,
          lastFailedPhase: result.lastFailedPhase as BugWorkflowPhase | null,
          retryCount: result.retryCount,
        });
      } else {
        // Req 3.3: Set default state if Main Process returns null
        map.set(bugPath, { ...DEFAULT_BUG_AUTO_EXECUTION_RUNTIME });
      }

      set({ bugAutoExecutionRuntimeMap: map });
    } catch (error) {
      console.error('[BugAutoExecutionStore] Failed to fetch state:', error);
      // Set default state on error (graceful degradation)
      const map = new Map(get().bugAutoExecutionRuntimeMap);
      map.set(bugPath, { ...DEFAULT_BUG_AUTO_EXECUTION_RUNTIME });
      set({ bugAutoExecutionRuntimeMap: map });
    }
  },

  /**
   * Fetch bug auto execution state via ApiClient (for Remote UI)
   * Requirements: 6.3 (bug-auto-execution-per-bug-state Task 6.2)
   */
  fetchBugAutoExecutionStateWithClient: async (bugPath: string, apiClient: ApiClient): Promise<void> => {
    try {
      // Use ApiClient.getBugAutoExecutionStatus if available
      if (apiClient.getBugAutoExecutionStatus) {
        const result = await apiClient.getBugAutoExecutionStatus(bugPath);

        const map = new Map(get().bugAutoExecutionRuntimeMap);

        if (result.ok && result.value) {
          const state = result.value as BugAutoExecutionStateResponse;
          map.set(bugPath, {
            isAutoExecuting: state.status === 'running' || state.status === 'paused',
            currentAutoPhase: state.currentPhase as BugWorkflowPhase | null,
            autoExecutionStatus: state.status as BugAutoExecutionStatus,
            lastFailedPhase: state.lastFailedPhase as BugWorkflowPhase | null,
            retryCount: state.retryCount,
          });
        } else {
          // Set default state if null or error
          map.set(bugPath, { ...DEFAULT_BUG_AUTO_EXECUTION_RUNTIME });
        }

        set({ bugAutoExecutionRuntimeMap: map });
      } else {
        // Fallback to default state if method not supported
        const map = new Map(get().bugAutoExecutionRuntimeMap);
        map.set(bugPath, { ...DEFAULT_BUG_AUTO_EXECUTION_RUNTIME });
        set({ bugAutoExecutionRuntimeMap: map });
      }
    } catch (error) {
      console.error('[BugAutoExecutionStore] Failed to fetch state via ApiClient:', error);
      // Set default state on error (graceful degradation)
      const map = new Map(get().bugAutoExecutionRuntimeMap);
      map.set(bugPath, { ...DEFAULT_BUG_AUTO_EXECUTION_RUNTIME });
      set({ bugAutoExecutionRuntimeMap: map });
    }
  },

  /**
   * Start auto execution for a specific bug
   */
  startAutoExecution: (bugPath: string): void => {
    const map = new Map(get().bugAutoExecutionRuntimeMap);
    map.set(bugPath, {
      isAutoExecuting: true,
      currentAutoPhase: null,
      autoExecutionStatus: 'running',
      lastFailedPhase: null,
      retryCount: 0,
    });
    set({ bugAutoExecutionRuntimeMap: map });
  },

  /**
   * Stop auto execution for a specific bug
   */
  stopAutoExecution: (bugPath: string): void => {
    const map = new Map(get().bugAutoExecutionRuntimeMap);
    map.set(bugPath, {
      isAutoExecuting: false,
      currentAutoPhase: null,
      autoExecutionStatus: 'idle',
      lastFailedPhase: null,
      retryCount: 0,
    });
    set({ bugAutoExecutionRuntimeMap: map });
  },

  /**
   * Update from Main Process state (IPC event handler)
   * Requirement 2.1
   */
  updateFromMainProcess: (bugPath: string, state: MainProcessBugAutoExecutionState): void => {
    const map = new Map(get().bugAutoExecutionRuntimeMap);
    const current = map.get(bugPath) ?? { ...DEFAULT_BUG_AUTO_EXECUTION_RUNTIME };

    map.set(bugPath, {
      ...current,
      isAutoExecuting: state.status === 'running' || state.status === 'paused',
      currentAutoPhase: state.currentPhase as BugWorkflowPhase | null,
      autoExecutionStatus: state.status as BugAutoExecutionStatus,
      lastFailedPhase: state.lastFailedPhase as BugWorkflowPhase | null,
      retryCount: state.retryCount,
    });

    set({ bugAutoExecutionRuntimeMap: map });
  },

  /**
   * Set error state for a specific bug
   * Requirement 2.4
   */
  setErrorState: (bugPath: string, lastFailedPhase: BugWorkflowPhase | null, retryCount: number): void => {
    const map = new Map(get().bugAutoExecutionRuntimeMap);
    const current = map.get(bugPath) ?? { ...DEFAULT_BUG_AUTO_EXECUTION_RUNTIME };

    map.set(bugPath, {
      ...current,
      isAutoExecuting: false,
      autoExecutionStatus: 'error',
      lastFailedPhase,
      retryCount,
    });

    set({ bugAutoExecutionRuntimeMap: map });
  },

  /**
   * Set completed state for a specific bug
   * Requirement 2.3
   */
  setCompletedState: (bugPath: string): void => {
    const map = new Map(get().bugAutoExecutionRuntimeMap);
    const current = map.get(bugPath) ?? { ...DEFAULT_BUG_AUTO_EXECUTION_RUNTIME };

    map.set(bugPath, {
      ...current,
      isAutoExecuting: false,
      currentAutoPhase: null,
      autoExecutionStatus: 'completed',
    });

    set({ bugAutoExecutionRuntimeMap: map });
  },
}));

// ============================================================
// Task 2.1: IPC Listener Registration
// Requirements: 2.5
// ============================================================

// Store cleanup functions for IPC listeners
let ipcCleanupFunctions: (() => void)[] = [];

/**
 * IPC event data for status changed
 */
interface BugAutoExecutionStatusChangedEvent {
  bugPath: string;
  state: {
    bugPath: string;
    bugName: string;
    status: string;
    currentPhase: string | null;
    executedPhases: string[];
    errors: string[];
    startTime: number;
    lastActivityTime: number;
    retryCount: number;
    lastFailedPhase: string | null;
  };
}

/**
 * Initialize IPC event listeners for bug auto-execution state sync
 * This should be called once during app initialization (e.g., in App.tsx)
 *
 * Requirements: 2.1, 2.2, 2.3, 2.4, 2.5
 */
export function initBugAutoExecutionIpcListeners(): void {
  // Prevent duplicate registration (Req 2.5)
  if (ipcCleanupFunctions.length > 0) {
    console.warn('[BugAutoExecutionStore] IPC listeners already registered');
    return;
  }

  // Req 2.1: Listen for status changed events
  const unsubscribeStatus = window.electronAPI.onBugAutoExecutionStatusChanged?.(
    (data: BugAutoExecutionStatusChangedEvent) => {
      const { bugPath, state } = data;
      useBugAutoExecutionStore.getState().updateFromMainProcess(bugPath, {
        status: state.status as MainProcessBugAutoExecutionState['status'],
        currentPhase: state.currentPhase,
        retryCount: state.retryCount,
        lastFailedPhase: state.lastFailedPhase,
      });
    }
  );

  // Req 2.2: Listen for phase completed events (log only)
  const unsubscribePhase = window.electronAPI.onBugAutoExecutionPhaseCompleted?.(
    (data: { bugPath: string; phase: string }) => {
      console.log(`[BugAutoExecutionStore] Phase completed: ${data.phase}`, { bugPath: data.bugPath });
    }
  );

  // Req 2.3: Listen for execution completed events
  const unsubscribeCompleted = window.electronAPI.onBugAutoExecutionCompleted?.(
    (data: { bugPath: string }) => {
      useBugAutoExecutionStore.getState().setCompletedState(data.bugPath);
    }
  );

  // Req 2.4: Listen for error events
  const unsubscribeError = window.electronAPI.onBugAutoExecutionError?.(
    (data) => {
      console.error('[BugAutoExecutionStore] Bug auto-execution error:', data.error);
      // Extract phase from error if available
      const phase = 'phase' in data.error ? (data.error.phase as BugWorkflowPhase | null) : null;
      // Get current retry count from store
      const currentState = useBugAutoExecutionStore.getState().getBugAutoExecutionRuntime(data.bugPath);
      useBugAutoExecutionStore.getState().setErrorState(
        data.bugPath,
        phase,
        currentState.retryCount
      );
    }
  );

  // Bug fix: bug-auto-execution-worktree-cwd
  // execute-next-phase is now handled in Main Process (handlers.ts)
  // This ensures worktree cwd is correctly resolved using BugService.getAgentCwd()
  // Renderer no longer needs to execute agents - Main Process handles it

  // Store cleanup functions
  if (unsubscribeStatus) ipcCleanupFunctions.push(unsubscribeStatus);
  if (unsubscribePhase) ipcCleanupFunctions.push(unsubscribePhase);
  if (unsubscribeCompleted) ipcCleanupFunctions.push(unsubscribeCompleted);
  if (unsubscribeError) ipcCleanupFunctions.push(unsubscribeError);

  console.debug('[BugAutoExecutionStore] IPC listeners registered');
}

/**
 * Cleanup IPC event listeners
 * Call this during app teardown if needed
 */
export function cleanupBugAutoExecutionIpcListeners(): void {
  ipcCleanupFunctions.forEach((cleanup) => cleanup());
  ipcCleanupFunctions = [];
  console.debug('[BugAutoExecutionStore] IPC listeners cleaned up');
}

// ============================================================
// Task 3.2: WebSocket Event Listener Registration (Remote UI)
// Requirements: 5.4, 2.4 (remote-ui-bug-advanced-features)
// ============================================================

/**
 * WebSocket event data for bug auto execution status
 */
interface WebSocketBugAutoExecutionStatusEvent {
  bugPath: string;
  state: BugAutoExecutionStateResponse;
}

/**
 * Initialize WebSocket event listeners for bug auto-execution state sync
 * This is for Remote UI using WebSocketApiClient
 *
 * Requirements: 5.4 (remote-ui-bug-advanced-features Task 3.2)
 *
 * @param apiClient - WebSocketApiClient instance with on() method
 * @returns Cleanup function to unsubscribe all listeners
 */
export function initBugAutoExecutionWebSocketListeners(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  apiClient: any // WebSocketApiClient with on() method
): () => void {
  const cleanupFunctions: (() => void)[] = [];

  // Listen for BUG_AUTO_EXECUTION_STATUS events
  if (apiClient.on) {
    const unsubscribeStatus = apiClient.on('bugAutoExecutionStatus', (data: WebSocketBugAutoExecutionStatusEvent) => {
      const { bugPath, state } = data;
      if (state) {
        useBugAutoExecutionStore.getState().updateFromMainProcess(bugPath, {
          status: state.status as 'idle' | 'running' | 'paused' | 'completed' | 'error',
          currentPhase: state.currentPhase,
          retryCount: state.retryCount,
          lastFailedPhase: state.lastFailedPhase,
        });
      }
    });
    if (unsubscribeStatus) cleanupFunctions.push(unsubscribeStatus);

    // Listen for BUG_AUTO_EXECUTION_STARTED events
    const unsubscribeStarted = apiClient.on('bugAutoExecutionStarted', (data: { bugPath: string; state?: BugAutoExecutionStateResponse }) => {
      const { bugPath, state } = data;
      if (state) {
        useBugAutoExecutionStore.getState().updateFromMainProcess(bugPath, {
          status: state.status as 'idle' | 'running' | 'paused' | 'completed' | 'error',
          currentPhase: state.currentPhase,
          retryCount: state.retryCount,
          lastFailedPhase: state.lastFailedPhase,
        });
      } else {
        useBugAutoExecutionStore.getState().startAutoExecution(bugPath);
      }
    });
    if (unsubscribeStarted) cleanupFunctions.push(unsubscribeStarted);

    // Listen for BUG_AUTO_EXECUTION_PHASE_COMPLETED events
    const unsubscribePhase = apiClient.on('bugAutoExecutionPhaseCompleted', (data: { bugPath: string; phase: string }) => {
      console.log(`[BugAutoExecutionStore] Phase completed: ${data.phase}`, { bugPath: data.bugPath });
    });
    if (unsubscribePhase) cleanupFunctions.push(unsubscribePhase);

    // Listen for BUG_AUTO_EXECUTION_COMPLETED events
    const unsubscribeCompleted = apiClient.on('bugAutoExecutionCompleted', (data: { bugPath: string }) => {
      useBugAutoExecutionStore.getState().setCompletedState(data.bugPath);
    });
    if (unsubscribeCompleted) cleanupFunctions.push(unsubscribeCompleted);

    // Listen for BUG_AUTO_EXECUTION_ERROR events
    const unsubscribeError = apiClient.on('bugAutoExecutionError', (data: { bugPath: string; error: { type: string; message?: string; phase?: string } }) => {
      console.error('[BugAutoExecutionStore] Bug auto-execution error:', data.error);
      const phase = data.error.phase as BugWorkflowPhase | null;
      const currentState = useBugAutoExecutionStore.getState().getBugAutoExecutionRuntime(data.bugPath);
      useBugAutoExecutionStore.getState().setErrorState(
        data.bugPath,
        phase ?? null,
        currentState.retryCount
      );
    });
    if (unsubscribeError) cleanupFunctions.push(unsubscribeError);

    // Listen for BUG_AUTO_EXECUTION_STOPPED events
    const unsubscribeStopped = apiClient.on('bugAutoExecutionStopped', (data: { bugPath: string }) => {
      useBugAutoExecutionStore.getState().stopAutoExecution(data.bugPath);
    });
    if (unsubscribeStopped) cleanupFunctions.push(unsubscribeStopped);
  }

  console.debug('[BugAutoExecutionStore] WebSocket listeners registered');

  // Return cleanup function
  return () => {
    cleanupFunctions.forEach((cleanup) => cleanup());
    console.debug('[BugAutoExecutionStore] WebSocket listeners cleaned up');
  };
}
