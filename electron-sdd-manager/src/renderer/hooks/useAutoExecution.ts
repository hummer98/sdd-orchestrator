/**
 * useAutoExecution Hook
 * Provides auto-execution functionality via IPC to Main Process
 * Requirements: 3.1, 3.4, 3.5
 *
 * auto-execution-projectpath-fix Task 4.5:
 * Requirements: 4.3 - Renderer側store/hookでprojectPath取得・送信
 */

import { useCallback, useState } from 'react';
import type { WorkflowPhase } from '../types/workflow';
import type { AutoExecutionStatus } from '../types';

// ============================================================
// Types
// ============================================================

/**
 * Auto execution permissions for each phase
 * inspection-permission-unification Task 1.1: Added inspection and deploy as required fields
 * Requirements: 1.3, 1.5
 */
export interface AutoExecutionPermissions {
  readonly requirements: boolean;
  readonly design: boolean;
  readonly tasks: boolean;
  readonly impl: boolean;
  readonly inspection: boolean;
  readonly deploy: boolean;
}

/**
 * Approval phase status
 */
export interface ApprovalPhaseStatus {
  readonly generated: boolean;
  readonly approved: boolean;
}

/**
 * Approvals status from spec.json
 */
export interface ApprovalsStatus {
  readonly requirements: ApprovalPhaseStatus;
  readonly design: ApprovalPhaseStatus;
  readonly tasks: ApprovalPhaseStatus;
}

/**
 * Auto execution options
 * document-review-phase: documentReviewFlag removed - use permissions['document-review'] instead
 */
export interface AutoExecutionOptions {
  readonly permissions: AutoExecutionPermissions;
  // documentReviewFlag removed - use permissions['document-review'] instead
  readonly timeoutMs?: number;
  /** Current approvals status from spec.json (used to skip completed phases) */
  readonly approvals?: ApprovalsStatus;
}

/**
 * Auto execution state from Main Process
 */
export interface AutoExecutionState {
  readonly specPath: string;
  readonly specId: string;
  readonly status: AutoExecutionStatus;
  readonly currentPhase: WorkflowPhase | null;
  readonly executedPhases: WorkflowPhase[];
  readonly errors: string[];
  readonly startTime: number;
  readonly lastActivityTime: number;
}

/**
 * Auto execution error types
 */
export type AutoExecutionError =
  | { type: 'ALREADY_EXECUTING'; specId: string }
  | { type: 'NOT_EXECUTING'; specId: string }
  | { type: 'MAX_CONCURRENT_REACHED'; limit: number }
  | { type: 'PRECONDITION_FAILED'; message: string }
  | { type: 'PHASE_EXECUTION_FAILED'; phase: WorkflowPhase; message?: string }
  | { type: 'SPEC_NOT_FOUND'; specPath: string };

/**
 * Result type
 */
export type Result<T, E> =
  | { ok: true; value: T }
  | { ok: false; error: E };

/**
 * Hook return type
 */
export interface UseAutoExecutionReturn {
  // State
  readonly isAutoExecuting: boolean;
  readonly status: AutoExecutionStatus | null;
  readonly currentPhase: WorkflowPhase | null;
  readonly executedPhases: WorkflowPhase[];
  readonly errors: string[];

  // Derived state
  readonly canStart: boolean;
  readonly canStop: boolean;

  // Actions
  /**
   * Start auto-execution
   * auto-execution-projectpath-fix Task 4.5: Added projectPath parameter
   */
  startAutoExecution: (
    projectPath: string,
    specPath: string,
    specId: string,
    options: AutoExecutionOptions
  ) => Promise<Result<AutoExecutionState, AutoExecutionError>>;
  stopAutoExecution: (specPath: string) => Promise<Result<void, AutoExecutionError>>;
  retryFromPhase: (
    specPath: string,
    phase: WorkflowPhase
  ) => Promise<Result<AutoExecutionState, AutoExecutionError>>;
  refreshStatus: (specPath: string) => Promise<void>;
}

// ============================================================
// Hook Implementation
// ============================================================

/**
 * useAutoExecution hook
 * Provides auto-execution functionality via IPC to Main Process
 * Requirements: 3.1, 3.4, 3.5
 */
export function useAutoExecution(): UseAutoExecutionReturn {
  // State
  const [state, setState] = useState<AutoExecutionState | null>(null);

  // Derived values
  const isAutoExecuting = state?.status === 'running';
  const status = state?.status ?? null;
  const currentPhase = state?.currentPhase ?? null;
  const executedPhases = state?.executedPhases ?? [];
  const errors = state?.errors ?? [];

  // Computed derived state
  const canStart = !isAutoExecuting;
  const canStop = isAutoExecuting;

  // ============================================================
  // Actions
  // ============================================================

  /**
   * Start auto-execution via IPC
   * auto-execution-projectpath-fix Task 4.5: Added projectPath parameter
   */
  const startAutoExecution = useCallback(
    async (
      projectPath: string,
      specPath: string,
      specId: string,
      options: AutoExecutionOptions
    ): Promise<Result<AutoExecutionState, AutoExecutionError>> => {
      try {
        const result = await window.electronAPI.autoExecutionStart({
          projectPath,
          specPath,
          specId,
          options,
        });

        if (result.ok) {
          setState(result.value);
        }

        return result;
      } catch (error) {
        return {
          ok: false,
          error: {
            type: 'PHASE_EXECUTION_FAILED',
            phase: 'requirements',
            message: error instanceof Error ? error.message : 'Unknown error',
          },
        };
      }
    },
    []
  );

  /**
   * Stop auto-execution via IPC
   */
  const stopAutoExecution = useCallback(
    async (specPath: string): Promise<Result<void, AutoExecutionError>> => {
      try {
        const result = await window.electronAPI.autoExecutionStop({ specPath });

        if (result.ok) {
          // Refresh status after stop
          const statusResult = await window.electronAPI.autoExecutionStatus({ specPath });
          if (statusResult) {
            setState(statusResult);
          }
        }

        return result;
      } catch (error) {
        return {
          ok: false,
          error: {
            type: 'NOT_EXECUTING',
            specId: '',
          },
        };
      }
    },
    []
  );

  /**
   * Retry from a specific phase via IPC
   */
  const retryFromPhase = useCallback(
    async (
      specPath: string,
      phase: WorkflowPhase
    ): Promise<Result<AutoExecutionState, AutoExecutionError>> => {
      try {
        const result = await window.electronAPI.autoExecutionRetryFrom({
          specPath,
          phase,
        });

        if (result.ok) {
          setState(result.value);
        }

        return result;
      } catch (error) {
        return {
          ok: false,
          error: {
            type: 'NOT_EXECUTING',
            specId: '',
          },
        };
      }
    },
    []
  );

  /**
   * Refresh status from Main Process
   */
  const refreshStatus = useCallback(async (specPath: string): Promise<void> => {
    try {
      const result = await window.electronAPI.autoExecutionStatus({ specPath });
      setState(result);
    } catch {
      // Ignore errors
    }
  }, []);

  // ============================================================
  // Event Listeners
  // ============================================================
  // NOTE: IPC event listeners are now registered in autoExecutionStore.ts
  // and initialized in App.tsx via initAutoExecutionIpcListeners().
  // This ensures specStore is the SSoT for auto-execution state.
  // (bug fix: auto-execution-state-sync)

  return {
    // State
    isAutoExecuting,
    status,
    currentPhase,
    executedPhases,
    errors,

    // Derived state
    canStart,
    canStop,

    // Actions
    startAutoExecution,
    stopAutoExecution,
    retryFromPhase,
    refreshStatus,
  };
}
