/**
 * Workflow Store
 * Manages workflow auto-execution state and settings
 * Requirements: 5.1-5.4, 6.1-6.6, 7.1-7.4, 8.1-8.5
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

// ============================================================
// Command Prefix Configuration
// Requirements: Support for multiple command prefixes
// ============================================================

export type CommandPrefix = 'kiro' | 'spec-manager';

export const COMMAND_PREFIXES: Record<CommandPrefix, { label: string; description: string }> = {
  kiro: {
    label: '/kiro:spec-*',
    description: 'Kiro形式のスラッシュコマンド',
  },
  'spec-manager': {
    label: '/spec-manager:*',
    description: 'spec-manager形式のスラッシュコマンド',
  },
};

export const DEFAULT_COMMAND_PREFIX: CommandPrefix = 'kiro';

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
// Task 1.1: Auto Execution Status Types
// Requirements: 7.4
// ============================================================

/**
 * 自動実行の詳細状態
 */
export type AutoExecutionStatus =
  | 'idle'       // 待機中
  | 'running'    // 実行中
  | 'paused'     // 一時停止（Agent待機中）
  | 'completing' // 完了処理中
  | 'error'      // エラー停止
  | 'completed'; // 完了

/**
 * 実行サマリー情報
 */
export interface ExecutionSummary {
  /** 実行したフェーズ一覧 */
  readonly executedPhases: readonly WorkflowPhase[];
  /** 実行したバリデーション一覧 */
  readonly executedValidations: readonly ValidationType[];
  /** 総所要時間（ms） */
  readonly totalDuration: number;
  /** エラー一覧 */
  readonly errors: readonly string[];
}

// ============================================================
// Task 2.3: Auto Execution State
// Requirements: 6.1, 6.2, 6.3, 6.4, 7.4
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

  // Task 1.1: Auto execution state extension
  /** 自動実行の詳細状態 */
  autoExecutionStatus: AutoExecutionStatus;
  /** 最後に失敗したフェーズ */
  lastFailedPhase: WorkflowPhase | null;
  /** 連続失敗回数 */
  failedRetryCount: number;
  /** 実行サマリー（完了時） */
  executionSummary: ExecutionSummary | null;

  // Command Prefix Configuration
  /** コマンドプレフィックス設定 */
  commandPrefix: CommandPrefix;
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

  // Task 1.2: State update actions
  /** 自動実行ステータスを更新 */
  setAutoExecutionStatus: (status: AutoExecutionStatus) => void;
  /** 最後に失敗したフェーズを設定 */
  setLastFailedPhase: (phase: WorkflowPhase | null) => void;
  /** 失敗リトライ回数をインクリメント */
  incrementFailedRetryCount: () => void;
  /** 失敗リトライ回数をリセット */
  resetFailedRetryCount: () => void;
  /** 実行サマリーを設定 */
  setExecutionSummary: (summary: ExecutionSummary | null) => void;

  // Command Prefix Configuration
  /** コマンドプレフィックスを設定 */
  setCommandPrefix: (prefix: CommandPrefix) => void;
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

      // Task 1.1: Auto execution state extension - initial state
      autoExecutionStatus: 'idle' as AutoExecutionStatus,
      lastFailedPhase: null,
      failedRetryCount: 0,
      executionSummary: null,

      // Command Prefix Configuration - initial state
      commandPrefix: DEFAULT_COMMAND_PREFIX,

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
          // Task 1.1: Also reset auto execution state extension
          autoExecutionStatus: 'idle' as AutoExecutionStatus,
          lastFailedPhase: null,
          failedRetryCount: 0,
          executionSummary: null,
        });
      },

      // Task 1.2: State update actions
      setAutoExecutionStatus: (status: AutoExecutionStatus) => {
        set({ autoExecutionStatus: status });
      },

      setLastFailedPhase: (phase: WorkflowPhase | null) => {
        set({ lastFailedPhase: phase });
      },

      incrementFailedRetryCount: () => {
        set((state) => ({
          failedRetryCount: state.failedRetryCount + 1,
        }));
      },

      resetFailedRetryCount: () => {
        set({ failedRetryCount: 0 });
      },

      setExecutionSummary: (summary: ExecutionSummary | null) => {
        set({ executionSummary: summary });
      },

      // Command Prefix Configuration
      setCommandPrefix: (prefix: CommandPrefix) => {
        set({ commandPrefix: prefix });
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
        commandPrefix: state.commandPrefix,
      }),
    }
  )
);
