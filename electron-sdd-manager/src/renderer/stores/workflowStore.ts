/**
 * Workflow Store
 * Manages workflow auto-execution settings (global defaults)
 * Requirements: 5.1-5.4, 6.1-6.6, 7.1-7.4, 8.1-8.5
 *
 * NOTE: As part of spec-scoped-auto-execution-state feature (Task 5.1):
 * - isAutoExecuting, currentAutoPhase, autoExecutionStatus have been migrated to spec.json
 * - This store now only holds global default settings
 * - Spec-specific auto-execution state is managed via spec.json.autoExecution
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { WorkflowPhase } from '../types/workflow';
import { ALL_WORKFLOW_PHASES } from '../types/workflow';
import type { BugWorkflowPhase } from '../types/bug';
import type { BugAutoExecutionPermissions } from '../types/bugAutoExecution';
import { DEFAULT_BUG_AUTO_EXECUTION_PERMISSIONS } from '../types/bugAutoExecution';
// inspection-permission-unification Task 4: InspectionAutoExecutionFlag import removed
// InspectionAutoExecutionFlag is deprecated - use permissions.inspection instead

// ============================================================
// Bug Fix: auto-execution-flag-cross-spec-contamination
// Removed persistSettingsToSpec() function
// spec.json is now the Single Source of Truth for auto-execution settings
// Settings are persisted directly via useElectronWorkflowState hook
// ============================================================

// ============================================================
// Task 2.1: Auto Execution Permissions
// Requirements: 5.1, 5.2, 5.3
// ============================================================

/**
 * document-review-phase Task 2.1: AutoExecutionPermissions に documentReview 追加
 * Requirements: 2.1 - documentReview フィールドの追加
 */
export interface AutoExecutionPermissions {
  requirements: boolean;
  design: boolean;
  tasks: boolean;
  'document-review': boolean;
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

/**
 * document-review-phase Task 2.3: permissions.documentReview のデフォルト値 true
 * Requirements: 2.1, 2.3
 * Rationale: tasks完了後に自動的にdocument-reviewが実行される動作が期待される
 */
export const DEFAULT_AUTO_EXECUTION_PERMISSIONS: AutoExecutionPermissions = {
  requirements: true, // デフォルトで許可
  design: false,
  tasks: false,
  'document-review': true, // document-review-phase: デフォルトGO
  impl: false,
  inspection: true, // inspection-permission-unification: デフォルトGO
  deploy: false,
};


// ============================================================
// Task 7.1: Document Review Options
// document-review-phase Task 6.1: DocumentReviewOptions removed
// Requirements: 6.1 - Use permissions['document-review'] instead
// ============================================================

/**
 * @deprecated document-review-phase Task 6.1: Use permissions['document-review'] instead
 * Auto execution flag for document review (2 values - skip removed)
 * Kept for backward compatibility only
 */
export type DocumentReviewAutoExecutionFlag = 'run' | 'pause';

/**
 * @deprecated document-review-phase Task 6.1: Use permissions['document-review'] instead
 * DocumentReviewOptions interface is deprecated - use permissions['document-review'] instead
 */
export interface DocumentReviewOptions {
  /** @deprecated Auto execution flag - use permissions['document-review'] instead */
  autoExecutionFlag: DocumentReviewAutoExecutionFlag;
}

// NOTE: document-review-phase Task 6.1, 7.1: Document review auto-execution is now controlled
// via permissions['document-review'] in AutoExecutionPermissions (GO/NOGO toggle)

// ============================================================
// worktree-mode-spec-scoped: WorktreeModeSelection type REMOVED
// Requirements: 4.4 (worktree-mode-spec-scoped)
// worktreeModeSelection has been moved to spec.json.worktree.enabled
// ============================================================

// ============================================================
// Task 1.1: Auto Execution Status Types (DEPRECATED)
// Requirements: 7.4
// NOTE: AutoExecutionStatus has been migrated to spec.json
// The type is now defined in types/index.ts as part of SpecAutoExecutionState
// ============================================================

/**
 * 実行サマリー情報
 */
export interface ExecutionSummary {
  /** 実行したフェーズ一覧 */
  readonly executedPhases: readonly WorkflowPhase[];
  /** 総所要時間（ms） */
  readonly totalDuration: number;
  /** エラー一覧 */
  readonly errors: readonly string[];
}

// ============================================================
// Task 2.3: Auto Execution State (SIMPLIFIED)
// Requirements: 6.1, 6.2, 6.3, 6.4, 7.4
// NOTE: isAutoExecuting, currentAutoPhase, autoExecutionStatus migrated to spec.json
// ============================================================

interface WorkflowState {
  /** 自動実行許可設定（フェーズごと）- グローバルデフォルト設定 */
  autoExecutionPermissions: AutoExecutionPermissions;

  // Task 1.1: Auto execution state extension (simplified)
  // NOTE: isAutoExecuting, currentAutoPhase, autoExecutionStatus removed
  /** 最後に失敗したフェーズ */
  lastFailedPhase: WorkflowPhase | null;
  /** 連続失敗回数 */
  failedRetryCount: number;
  /** 実行サマリー（完了時） */
  executionSummary: ExecutionSummary | null;

  // Command Prefix Configuration
  /** コマンドプレフィックス設定 */
  commandPrefix: CommandPrefix;

  // document-review-phase Task 6.1: documentReviewOptions REMOVED
  // Requirements: 6.1
  // Document review auto-execution is now controlled via permissions['document-review']

  // Task 7.3: Review Confirmation
  // Requirements: 7.5
  /** レビューラウンド完了後の確認待ち状態 */
  pendingReviewConfirmation: boolean;

  // ============================================================
  // bugs-workflow-auto-execution Task 1.1: Bug Auto Execution Settings
  // Requirements: 2.1, 7.4
  // ============================================================
  /** Bug自動実行許可設定（フェーズごと） */
  bugAutoExecutionPermissions: BugAutoExecutionPermissions;

  // ============================================================
  // inspection-permission-unification Task 4.1: inspectionAutoExecutionFlag REMOVED
  // Requirements: 3.1 (inspection-permission-unification)
  // Use permissions.inspection instead
  // ============================================================

  // ============================================================
  // worktree-mode-spec-scoped: worktreeModeSelection REMOVED
  // Requirements: 4.1 (worktree-mode-spec-scoped)
  // worktreeModeSelection has been moved to spec.json.worktree.enabled
  // ============================================================
}

interface WorkflowActions {
  /** 自動実行許可をトグル */
  toggleAutoPermission: (phase: WorkflowPhase) => void;
  // NOTE: startAutoExecution, stopAutoExecution, setCurrentAutoPhase removed
  // These are now managed via spec.json.autoExecution
  /** 設定をリセット */
  resetSettings: () => void;
  /** フェーズが自動実行許可されているか確認 */
  isPhaseAutoPermitted: (phase: WorkflowPhase) => boolean;
  /** 次の自動実行フェーズを取得 */
  getNextAutoPhase: (currentPhase: WorkflowPhase | null) => WorkflowPhase | null;

  // Task 1.2: State update actions (simplified)
  // NOTE: setAutoExecutionStatus removed (migrated to spec.json)
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

  // document-review-phase Task 6.1: setDocumentReviewAutoExecutionFlag REMOVED
  // Requirements: 6.1
  // Use toggleAutoPermission('document-review') instead

  // Task 7.3: Review Confirmation
  // Requirements: 7.5
  /** レビュー確認待ち状態を設定 */
  setPendingReviewConfirmation: (pending: boolean) => void;

  // spec-scoped-auto-execution-state Task 2.3: Sync methods
  // Requirements: 2.4, 2.5
  /** 自動実行許可設定を一括設定 */
  setAutoExecutionPermissions: (permissions: AutoExecutionPermissions) => void;

  // document-review-phase Task 6.1: setDocumentReviewOptions REMOVED
  // Requirements: 6.1
  // Document review is now controlled via permissions['document-review']

  // ============================================================
  // bugs-workflow-auto-execution Task 1.2: Bug Auto Execution Actions
  // Requirements: 2.2
  // ============================================================
  /** Bug自動実行許可をトグル */
  toggleBugAutoPermission: (phase: BugWorkflowPhase) => void;
  /** Bug自動実行許可設定を一括設定 */
  setBugAutoExecutionPermissions: (permissions: BugAutoExecutionPermissions) => void;
  /** Bug自動実行許可設定を取得 */
  getBugAutoExecutionPermissions: () => BugAutoExecutionPermissions;

  // ============================================================
  // inspection-permission-unification Task 4.2: setInspectionAutoExecutionFlag REMOVED
  // Requirements: 3.3 (inspection-permission-unification)
  // Use toggleAutoPermission('inspection') instead
  // ============================================================

  // ============================================================
  // worktree-mode-spec-scoped: Worktree mode actions REMOVED
  // Requirements: 4.2, 4.3 (worktree-mode-spec-scoped)
  // setWorktreeModeSelection, resetWorktreeModeSelection removed
  // ============================================================
}

type WorkflowStore = WorkflowState & WorkflowActions;

// ============================================================
// Task 2.4: LocalStorage Persistence
// Requirements: 5.4
// ============================================================

export const useWorkflowStore = create<WorkflowStore>()(
  persist(
    (set, get) => ({
      // Initial state (simplified - auto execution state moved to spec.json)
      autoExecutionPermissions: { ...DEFAULT_AUTO_EXECUTION_PERMISSIONS },

      // Task 1.1: Auto execution state extension - initial state (simplified)
      // NOTE: isAutoExecuting, currentAutoPhase, autoExecutionStatus removed
      lastFailedPhase: null,
      failedRetryCount: 0,
      executionSummary: null,

      // Command Prefix Configuration - initial state
      commandPrefix: DEFAULT_COMMAND_PREFIX,

      // document-review-phase Task 6.1: documentReviewOptions removed
      // Document review is now controlled via permissions['document-review']

      // Task 7.3: Review Confirmation - initial state
      pendingReviewConfirmation: false,

      // bugs-workflow-auto-execution Task 1.1: Bug Auto Execution Settings - initial state
      bugAutoExecutionPermissions: { ...DEFAULT_BUG_AUTO_EXECUTION_PERMISSIONS },

      // inspection-permission-unification Task 4.1: inspectionAutoExecutionFlag initial state REMOVED
      // Use permissions.inspection instead (default: true in DEFAULT_AUTO_EXECUTION_PERMISSIONS)

      // worktree-mode-spec-scoped: worktreeModeSelection initial state REMOVED
      // worktreeModeSelection has been moved to spec.json.worktree.enabled

      // Task 2.1: Auto Execution Permissions
      // Bug Fix: auto-execution-flag-cross-spec-contamination
      // Removed persistSettingsToSpec() call - workflowStore now only manages global defaults
      // Spec-scoped settings are persisted via useElectronWorkflowState hook
      toggleAutoPermission: (phase: WorkflowPhase) => {
        set((state) => ({
          autoExecutionPermissions: {
            ...state.autoExecutionPermissions,
            [phase]: !state.autoExecutionPermissions[phase],
          },
        }));
      },

      // NOTE: startAutoExecution, stopAutoExecution, setCurrentAutoPhase removed
      // These are now managed via spec.json.autoExecution

      // Task 2.4: Reset Settings (simplified)
      resetSettings: () => {
        set({
          autoExecutionPermissions: { ...DEFAULT_AUTO_EXECUTION_PERMISSIONS },
          // Task 1.1: Reset remaining auto execution state
          lastFailedPhase: null,
          failedRetryCount: 0,
          executionSummary: null,
        });
      },

      // Task 1.2: State update actions (simplified)
      // NOTE: setAutoExecutionStatus removed (migrated to spec.json)

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

      // document-review-phase Task 6.1: setDocumentReviewAutoExecutionFlag REMOVED
      // Use toggleAutoPermission('document-review') instead

      // Task 7.3: Review Confirmation
      // Requirements: 7.5
      setPendingReviewConfirmation: (pending: boolean) => {
        set({ pendingReviewConfirmation: pending });
      },

      // spec-scoped-auto-execution-state Task 2.3: Sync methods
      // Requirements: 2.4, 2.5
      setAutoExecutionPermissions: (permissions: AutoExecutionPermissions) => {
        set({ autoExecutionPermissions: { ...permissions } });
      },

      // document-review-phase Task 6.1: setDocumentReviewOptions REMOVED
      // Document review is now controlled via permissions['document-review']

      // Helper methods
      isPhaseAutoPermitted: (phase: WorkflowPhase) => {
        return get().autoExecutionPermissions[phase];
      },

      getNextAutoPhase: (currentPhase: WorkflowPhase | null) => {
        if (currentPhase === null) {
          return ALL_WORKFLOW_PHASES[0]; // requirements
        }

        const currentIndex = ALL_WORKFLOW_PHASES.indexOf(currentPhase);
        if (currentIndex === -1 || currentIndex === ALL_WORKFLOW_PHASES.length - 1) {
          return null;
        }

        return ALL_WORKFLOW_PHASES[currentIndex + 1];
      },

      // ============================================================
      // bugs-workflow-auto-execution Task 1.2: Bug Auto Execution Actions
      // Requirements: 2.2
      // ============================================================
      toggleBugAutoPermission: (phase: BugWorkflowPhase) => {
        // Skip report phase as it's not auto-executable
        if (phase === 'report') return;

        set((state) => ({
          bugAutoExecutionPermissions: {
            ...state.bugAutoExecutionPermissions,
            [phase]: !state.bugAutoExecutionPermissions[phase as keyof BugAutoExecutionPermissions],
          },
        }));
      },

      setBugAutoExecutionPermissions: (permissions: BugAutoExecutionPermissions) => {
        set({ bugAutoExecutionPermissions: { ...permissions } });
      },

      getBugAutoExecutionPermissions: () => {
        return get().bugAutoExecutionPermissions;
      },

      // ============================================================
      // inspection-permission-unification Task 4.2: setInspectionAutoExecutionFlag REMOVED
      // Use toggleAutoPermission('inspection') instead
      // ============================================================

      // ============================================================
      // worktree-mode-spec-scoped: Worktree mode actions REMOVED
      // Requirements: 4.2, 4.3 (worktree-mode-spec-scoped)
      // setWorktreeModeSelection, resetWorktreeModeSelection removed
      // worktreeModeSelection has been moved to spec.json.worktree.enabled
      // ============================================================
    }),
    {
      name: 'sdd-manager-workflow-settings',
      // Task 1.3: Persistence - include bugAutoExecutionPermissions
      // inspection-permission-unification Task 4.1: inspectionAutoExecutionFlag removed from persistence
      // document-review-phase Task 6.1: documentReviewOptions removed from persistence
      partialize: (state) => ({
        autoExecutionPermissions: state.autoExecutionPermissions,
        commandPrefix: state.commandPrefix,
        bugAutoExecutionPermissions: state.bugAutoExecutionPermissions,
        // documentReviewOptions removed - use permissions['document-review'] instead
        // inspectionAutoExecutionFlag removed - use permissions.inspection instead
      }),
    }
  )
);
