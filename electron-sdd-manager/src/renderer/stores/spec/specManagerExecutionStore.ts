/**
 * SpecManagerExecutionStore
 * Manages spec-manager phase execution state
 * Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 6.7, 6.8
 */

import { create } from 'zustand';
import type {
  SpecManagerExecutionState,
  SpecManagerExecutionActions,
  SpecManagerPhase,
  ImplTaskStatus,
  CheckImplResult,
} from './types';
import { DEFAULT_SPEC_MANAGER_EXECUTION_STATE } from './types';

type SpecManagerExecutionStore = SpecManagerExecutionState & SpecManagerExecutionActions;

export const useSpecManagerExecutionStore = create<SpecManagerExecutionStore>((set, get) => ({
  // Initial state
  ...DEFAULT_SPEC_MANAGER_EXECUTION_STATE,

  // Actions

  /**
   * Execute spec-manager generation command
   * Requirement 6.2: executeSpecManagerGeneration action
   * Requirement 6.6: Prevent concurrent operations
   * Requirement 6.7: Set error state on failure
   */
  executeSpecManagerGeneration: async (
    specId: string,
    phase: SpecManagerPhase,
    featureName: string,
    taskId: string | undefined,
    executionMode: 'auto' | 'manual'
  ) => {
    const { isRunning } = get();

    // Check if already running - prevent concurrent operations
    if (isRunning) {
      console.warn('[specManagerExecutionStore] spec-manager operation already running');
      return;
    }

    // Set running state
    set({
      ...DEFAULT_SPEC_MANAGER_EXECUTION_STATE,
      isRunning: true,
      currentPhase: phase,
      currentSpecId: specId,
      executionMode,
      implTaskStatus: phase === 'impl' ? 'running' : null,
    });

    try {
      // Call main process to execute spec-manager phase
      if (phase === 'impl' && taskId) {
        await window.electronAPI.executeTaskImpl(specId, featureName, taskId);
      } else {
        await window.electronAPI.executePhase(specId, phase, featureName);
      }

      // Note: Actual completion handling is done via IPC callbacks
      // The running state will be updated when the agent completes
    } catch (error) {
      // Set error state
      set({
        ...get(),
        isRunning: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        implTaskStatus: 'error',
      });
    }
  },

  /**
   * Handle impl completion result from ImplCompletionAnalyzer
   * Requirement 6.3: handleCheckImplResult action
   * Requirement 6.8: Store completion stats
   */
  handleCheckImplResult: (result: CheckImplResult) => {
    set({
      ...get(),
      isRunning: false,
      lastCheckResult: result,
      implTaskStatus: 'success',
      error: null,
    });
  },

  /**
   * Update impl task status
   * Requirement 6.4: updateImplTaskStatus action for status/retry updates
   */
  updateImplTaskStatus: (status: ImplTaskStatus, retryCount?: number) => {
    const current = get();
    set({
      ...current,
      implTaskStatus: status,
      retryCount: retryCount !== undefined ? retryCount : current.retryCount,
      isRunning: status === 'running' || status === 'continuing',
    });
  },

  /**
   * Clear spec-manager error
   * Requirement 6.5: clearSpecManagerError action
   */
  clearSpecManagerError: () => {
    set({
      ...get(),
      error: null,
      implTaskStatus: null,
    });
  },
}));
