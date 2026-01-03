/**
 * AutoExecutionStore
 * Manages per-spec auto-execution runtime state
 * Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7, 5.8
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
