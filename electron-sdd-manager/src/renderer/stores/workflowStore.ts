/**
 * Workflow Store
 * Manages workflow auto-execution state and settings
 * Requirements: 5.1-5.4, 6.1-6.6
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { WorkflowPhase, ValidationType } from '../types/workflow';
import { WORKFLOW_PHASES } from '../types/workflow';

// ============================================================
// Task 2.1: Auto Execution Permissions
// Requirements: 5.1, 5.2, 5.3
// ============================================================

export interface AutoExecutionPermissions {
  requirements: boolean;
  design: boolean;
  tasks: boolean;
  impl: boolean;
  inspection: boolean;
  deploy: boolean;
}

export const DEFAULT_AUTO_EXECUTION_PERMISSIONS: AutoExecutionPermissions = {
  requirements: true, // デフォルトで許可
  design: false,
  tasks: false,
  impl: false,
  inspection: false,
  deploy: false,
};

// ============================================================
// Task 2.2: Validation Options
// Requirements: 4.1, 4.2, 4.3
// ============================================================

export interface ValidationOptions {
  gap: boolean;
  design: boolean;
  impl: boolean;
}

const DEFAULT_VALIDATION_OPTIONS: ValidationOptions = {
  gap: false,
  design: false,
  impl: false,
};

// ============================================================
// Task 2.3: Auto Execution State
// Requirements: 6.1, 6.2, 6.3, 6.4
// ============================================================

interface WorkflowState {
  /** 自動実行許可設定（フェーズごと） */
  autoExecutionPermissions: AutoExecutionPermissions;
  /** バリデーションオプション設定 */
  validationOptions: ValidationOptions;
  /** 自動実行中フラグ */
  isAutoExecuting: boolean;
  /** 現在の自動実行位置 */
  currentAutoPhase: WorkflowPhase | null;
}

interface WorkflowActions {
  /** 自動実行許可をトグル */
  toggleAutoPermission: (phase: WorkflowPhase) => void;
  /** バリデーションオプションをトグル */
  toggleValidationOption: (type: ValidationType) => void;
  /** 自動実行を開始 */
  startAutoExecution: () => void;
  /** 自動実行を停止 */
  stopAutoExecution: () => void;
  /** 現在の自動実行フェーズを更新 */
  setCurrentAutoPhase: (phase: WorkflowPhase | null) => void;
  /** 設定をリセット */
  resetSettings: () => void;
  /** フェーズが自動実行許可されているか確認 */
  isPhaseAutoPermitted: (phase: WorkflowPhase) => boolean;
  /** 次の自動実行フェーズを取得 */
  getNextAutoPhase: (currentPhase: WorkflowPhase | null) => WorkflowPhase | null;
}

type WorkflowStore = WorkflowState & WorkflowActions;

// ============================================================
// Task 2.4: LocalStorage Persistence
// Requirements: 5.4
// ============================================================

export const useWorkflowStore = create<WorkflowStore>()(
  persist(
    (set, get) => ({
      // Initial state
      autoExecutionPermissions: { ...DEFAULT_AUTO_EXECUTION_PERMISSIONS },
      validationOptions: { ...DEFAULT_VALIDATION_OPTIONS },
      isAutoExecuting: false,
      currentAutoPhase: null,

      // Task 2.1: Auto Execution Permissions
      toggleAutoPermission: (phase: WorkflowPhase) => {
        set((state) => ({
          autoExecutionPermissions: {
            ...state.autoExecutionPermissions,
            [phase]: !state.autoExecutionPermissions[phase],
          },
        }));
      },

      // Task 2.2: Validation Options
      toggleValidationOption: (type: ValidationType) => {
        set((state) => ({
          validationOptions: {
            ...state.validationOptions,
            [type]: !state.validationOptions[type],
          },
        }));
      },

      // Task 2.3: Auto Execution State
      startAutoExecution: () => {
        set({ isAutoExecuting: true });
      },

      stopAutoExecution: () => {
        set({
          isAutoExecuting: false,
          currentAutoPhase: null,
        });
      },

      setCurrentAutoPhase: (phase: WorkflowPhase | null) => {
        set({ currentAutoPhase: phase });
      },

      // Task 2.4: Reset Settings
      resetSettings: () => {
        set({
          autoExecutionPermissions: { ...DEFAULT_AUTO_EXECUTION_PERMISSIONS },
          validationOptions: { ...DEFAULT_VALIDATION_OPTIONS },
          isAutoExecuting: false,
          currentAutoPhase: null,
        });
      },

      // Helper methods
      isPhaseAutoPermitted: (phase: WorkflowPhase) => {
        return get().autoExecutionPermissions[phase];
      },

      getNextAutoPhase: (currentPhase: WorkflowPhase | null) => {
        if (currentPhase === null) {
          return WORKFLOW_PHASES[0]; // requirements
        }

        const currentIndex = WORKFLOW_PHASES.indexOf(currentPhase);
        if (currentIndex === -1 || currentIndex === WORKFLOW_PHASES.length - 1) {
          return null;
        }

        return WORKFLOW_PHASES[currentIndex + 1];
      },
    }),
    {
      name: 'sdd-manager-workflow-settings',
      partialize: (state) => ({
        autoExecutionPermissions: state.autoExecutionPermissions,
        validationOptions: state.validationOptions,
      }),
    }
  )
);
