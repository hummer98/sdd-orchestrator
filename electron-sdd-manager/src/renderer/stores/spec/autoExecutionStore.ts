/**
 * AutoExecutionStore
 * Manages per-spec auto-execution runtime state
 * Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7, 5.8
 *
 * This store is the Single Source of Truth (SSoT) for auto-execution state
 * on the Renderer side. IPC events from Main Process update this store directly.
 */

import { create } from 'zustand';
import type { AutoExecutionStatus } from '../../types';
import type { WorkflowPhase } from '../../types/workflow';
import type {
  AutoExecutionState,
  AutoExecutionActions,
  AutoExecutionRuntimeState,
} from './types';
import { DEFAULT_AUTO_EXECUTION_RUNTIME, DEFAULT_AUTO_EXECUTION_STATE } from './types';
// trpc-full-migration Task 9.2: tRPC Subscription for event listeners
import { getVanillaClient } from '../../../shared/trpc/vanillaClient';
import type { Unsubscribable } from '@trpc/server/observable';

// ============================================================
// Types for IPC Event Data
// ============================================================

/**
 * Auto execution state from Main Process IPC events
 */
interface MainProcessAutoExecutionState {
  readonly specPath: string;
  readonly specId: string;
  readonly status: 'idle' | 'running' | 'paused' | 'completing' | 'completed' | 'error';
  readonly currentPhase: WorkflowPhase | null;
  readonly executedPhases: WorkflowPhase[];
  readonly errors: string[];
  readonly startTime: number;
  readonly lastActivityTime: number;
}

/**
 * Map Main Process status to Renderer AutoExecutionStatus
 */
function mapMainProcessStatus(status: MainProcessAutoExecutionState['status']): AutoExecutionStatus {
  // Direct mapping - types are compatible
  return status;
}

// ============================================================
// IPC Listener Registration
// ============================================================

// Store cleanup functions for IPC listeners
let ipcCleanupFunctions: (() => void)[] = [];

/**
 * Initialize IPC event listeners for auto-execution state sync
 * This should be called once during app initialization (e.g., in App.tsx)
 *
 * The listeners update the specStore directly, making it the SSoT for
 * auto-execution state on the Renderer side.
 */
export function initAutoExecutionIpcListeners(): void {
  // Prevent duplicate registration
  if (ipcCleanupFunctions.length > 0) {
    console.warn('[AutoExecutionStore] IPC listeners already registered');
    return;
  }

  // Task 9.2: Migrated from window.electronAPI.on* to tRPC Subscription
  const subscriptions: Unsubscribable[] = [];

  // Listen for status changed events from Main Process
  const statusSub = getVanillaClient().events.onAutoExecutionStatusChanged.subscribe(undefined, {
    onData: (data: Record<string, unknown>) => {
      if (!data || !('state' in data)) return; // phantom data guard
      const typedData = data as { specPath: string; state: MainProcessAutoExecutionState };
      if (!typedData.state) {
        console.warn('[AutoExecutionStore] Received status changed event with empty state', typedData);
        return;
      }
      const { specId, status, currentPhase } = typedData.state;

      // Update store directly - this is the key fix for the state sync bug
      const store = useAutoExecutionStore.getState();
      const map = new Map(store.autoExecutionRuntimeMap);
      const current = map.get(specId) ?? { ...DEFAULT_AUTO_EXECUTION_RUNTIME };

      map.set(specId, {
        ...current,
        isAutoExecuting: status === 'running' || status === 'paused' || status === 'completing',
        currentAutoPhase: currentPhase,
        autoExecutionStatus: mapMainProcessStatus(status),
      });

      useAutoExecutionStore.setState({ autoExecutionRuntimeMap: map });
    },
  });
  subscriptions.push(statusSub);

  // Listen for phase completed events
  const phaseSub = getVanillaClient().events.onAutoExecutionPhaseCompleted.subscribe(undefined, {
    onData: (data: Record<string, unknown>) => {
      if (!data || !('phase' in data)) return; // phantom data guard
      const typedData = data as { specPath: string; phase: string };
      console.debug('[AutoExecutionStore] Phase completed:', typedData.phase);
    },
  });
  subscriptions.push(phaseSub);

  // Listen for error events
  const errorSub = getVanillaClient().events.onAutoExecutionError.subscribe(undefined, {
    onData: (data: Record<string, unknown>) => {
      if (!data || !('error' in data)) return; // phantom data guard
      const typedData = data as { specPath: string; error: { type: string; message?: string } };
      if (!typedData.error) return;
      console.error('[AutoExecutionStore] Auto-execution error:', typedData.error);
      // Error state is handled via status changed event with status='error'
    },
  });
  subscriptions.push(errorSub);

  // Store cleanup functions (wrap subscriptions as cleanup functions)
  subscriptions.forEach((sub) => {
    ipcCleanupFunctions.push(() => sub.unsubscribe());
  });

  console.debug('[AutoExecutionStore] tRPC Subscription listeners registered');
}

/**
 * Cleanup IPC event listeners
 * Call this during app teardown if needed
 */
export function cleanupAutoExecutionIpcListeners(): void {
  ipcCleanupFunctions.forEach((cleanup) => cleanup());
  ipcCleanupFunctions = [];
  console.debug('[AutoExecutionStore] IPC listeners cleaned up');
}

type AutoExecutionStore = AutoExecutionState & AutoExecutionActions;

export const useAutoExecutionStore = create<AutoExecutionStore>((set, get) => ({
  // Initial state
  autoExecutionRuntimeMap: new Map(DEFAULT_AUTO_EXECUTION_STATE.autoExecutionRuntimeMap),

  // Actions

  /**
   * Get auto execution runtime state for a specific spec
   * Returns default state if not found
   * Requirement 5.2, 5.8: getAutoExecutionRuntime selector
   */
  getAutoExecutionRuntime: (specId: string): AutoExecutionRuntimeState => {
    const map = get().autoExecutionRuntimeMap;
    const runtime = map.get(specId);
    // Return a copy to prevent external mutation
    return runtime ? { ...runtime } : { ...DEFAULT_AUTO_EXECUTION_RUNTIME };
  },

  /**
   * Set auto execution running state for a specific spec
   * Requirement 5.3: setAutoExecutionRunning action
   */
  setAutoExecutionRunning: (specId: string, isRunning: boolean) => {
    const map = new Map(get().autoExecutionRuntimeMap);
    const current = map.get(specId) ?? { ...DEFAULT_AUTO_EXECUTION_RUNTIME };
    map.set(specId, { ...current, isAutoExecuting: isRunning });
    set({ autoExecutionRuntimeMap: map });
  },

  /**
   * Set current auto execution phase for a specific spec
   * Requirement 5.4: setAutoExecutionPhase action
   */
  setAutoExecutionPhase: (specId: string, phase: WorkflowPhase | null) => {
    const map = new Map(get().autoExecutionRuntimeMap);
    const current = map.get(specId) ?? { ...DEFAULT_AUTO_EXECUTION_RUNTIME };
    map.set(specId, { ...current, currentAutoPhase: phase });
    set({ autoExecutionRuntimeMap: map });
  },

  /**
   * Set auto execution status for a specific spec
   * Requirement 5.5: setAutoExecutionStatus action
   */
  setAutoExecutionStatus: (specId: string, status: AutoExecutionStatus) => {
    const map = new Map(get().autoExecutionRuntimeMap);
    const current = map.get(specId) ?? { ...DEFAULT_AUTO_EXECUTION_RUNTIME };
    map.set(specId, { ...current, autoExecutionStatus: status });
    set({ autoExecutionRuntimeMap: map });
  },

  /**
   * Start auto execution for a specific spec
   * Requirement 5.6: startAutoExecution action
   */
  startAutoExecution: (specId: string) => {
    const map = new Map(get().autoExecutionRuntimeMap);
    map.set(specId, {
      isAutoExecuting: true,
      currentAutoPhase: null,
      autoExecutionStatus: 'running',
    });
    set({ autoExecutionRuntimeMap: map });
  },

  /**
   * Stop auto execution for a specific spec
   * Requirement 5.7: stopAutoExecution action
   */
  stopAutoExecution: (specId: string) => {
    const map = new Map(get().autoExecutionRuntimeMap);
    map.set(specId, {
      isAutoExecuting: false,
      currentAutoPhase: null,
      autoExecutionStatus: 'idle',
    });
    set({ autoExecutionRuntimeMap: map });
  },
}));
