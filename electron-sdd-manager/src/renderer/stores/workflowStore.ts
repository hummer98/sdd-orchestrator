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
import type { WorkflowPhase, ValidationType } from '../types/workflow';
import { ALL_WORKFLOW_PHASES } from '../types/workflow';
import type { SpecAutoExecutionState } from '../types';
import type { BugWorkflowPhase } from '../types/bug';
import type { BugAutoExecutionPermissions } from '../types/bugAutoExecution';
import { DEFAULT_BUG_AUTO_EXECUTION_PERMISSIONS } from '../types/bugAutoExecution';
import type { InspectionAutoExecutionFlag } from '../types/inspection';

// ============================================================
// Bug Fix: auto-execution-settings-not-persisted
// Helper function to persist settings to spec.json
// ============================================================

/**
 * Persist current workflow settings to spec.json
 * Called after each setting change to ensure spec-scoped persistence
 */
async function persistSettingsToSpec(): Promise<void> {
  // Dynamic import to avoid circular dependency
  const { useSpecStore } = await import('./specStore');
  const specStore = useSpecStore.getState();
  const specDetail = specStore.specDetail;

  if (!specDetail) {
    // No spec selected, skip persistence
    return;
  }

  // Get current state from workflowStore
  const workflowState = useWorkflowStore.getState();

  // Build the autoExecution state object
  // Bug fix: inspection-auto-execution-toggle - include inspectionFlag
  const autoExecutionState: SpecAutoExecutionState = {
    enabled: true, // Enable when user explicitly changes settings
    permissions: { ...workflowState.autoExecutionPermissions },
    documentReviewFlag: workflowState.documentReviewOptions.autoExecutionFlag,
    validationOptions: { ...workflowState.validationOptions },
    inspectionFlag: workflowState.inspectionAutoExecutionFlag,
  };

  try {
    await window.electronAPI.updateSpecJson(specDetail.metadata.path, {
      autoExecution: autoExecutionState,
    });
    console.log('[workflowStore] Settings persisted to spec.json');
  } catch (error) {
    console.error('[workflowStore] Failed to persist settings to spec.json:', error);
  }
}

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
// Task 7.1: Document Review Options
// Requirements: 7.4
// ============================================================

/** Auto execution flag for document review (3 values) */
export type DocumentReviewAutoExecutionFlag = 'run' | 'pause' | 'skip';

export interface DocumentReviewOptions {
  /** Auto execution flag (run/pause/skip) - Requirements: 6.7, 6.8 */
  autoExecutionFlag: DocumentReviewAutoExecutionFlag;
}

// NOTE: DEFAULT_DOCUMENT_REVIEW_OPTIONS removed as part of document-review-default-cleanup
// The default value 'pause' is now defined inline in the store initialization
// and in DEFAULT_SPEC_AUTO_EXECUTION_STATE (types/index.ts)

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
  /** 実行したバリデーション一覧 */
  readonly executedValidations: readonly ValidationType[];
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
  /** バリデーションオプション設定 */
  validationOptions: ValidationOptions;

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

  // Task 7.1: Document Review Options
  // Requirements: 7.4
  /** ドキュメントレビューオプション */
  documentReviewOptions: DocumentReviewOptions;

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
  // Bug fix: inspection-auto-execution-toggle
  // Inspection auto execution flag (run/pause/skip)
  // ============================================================
  /** Inspection自動実行フラグ */
  inspectionAutoExecutionFlag: InspectionAutoExecutionFlag;
}

interface WorkflowActions {
  /** 自動実行許可をトグル */
  toggleAutoPermission: (phase: WorkflowPhase) => void;
  /** バリデーションオプションをトグル */
  toggleValidationOption: (type: ValidationType) => void;
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

  // Task 6.1: Auto Execution Flag Control
  // Requirements: 6.7, 6.8
  /** ドキュメントレビュー自動実行フラグを設定 */
  setDocumentReviewAutoExecutionFlag: (flag: DocumentReviewAutoExecutionFlag) => void;

  // Task 7.3: Review Confirmation
  // Requirements: 7.5
  /** レビュー確認待ち状態を設定 */
  setPendingReviewConfirmation: (pending: boolean) => void;

  // spec-scoped-auto-execution-state Task 2.3: Sync methods
  // Requirements: 2.4, 2.5
  /** 自動実行許可設定を一括設定 */
  setAutoExecutionPermissions: (permissions: AutoExecutionPermissions) => void;
  /** ドキュメントレビューオプションを一括設定 */
  setDocumentReviewOptions: (options: Partial<DocumentReviewOptions>) => void;
  /** バリデーションオプションを一括設定 */
  setValidationOptions: (options: Partial<ValidationOptions>) => void;

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
  // Bug fix: inspection-auto-execution-toggle
  // ============================================================
  /** Inspection自動実行フラグを設定 */
  setInspectionAutoExecutionFlag: (flag: InspectionAutoExecutionFlag) => void;
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
      validationOptions: { ...DEFAULT_VALIDATION_OPTIONS },

      // Task 1.1: Auto execution state extension - initial state (simplified)
      // NOTE: isAutoExecuting, currentAutoPhase, autoExecutionStatus removed
      lastFailedPhase: null,
      failedRetryCount: 0,
      executionSummary: null,

      // Command Prefix Configuration - initial state
      commandPrefix: DEFAULT_COMMAND_PREFIX,

      // Task 7.1: Document Review Options - initial state
      // Default to 'pause' - requires user confirmation before auto-executing document review
      documentReviewOptions: { autoExecutionFlag: 'pause' },

      // Task 7.3: Review Confirmation - initial state
      pendingReviewConfirmation: false,

      // bugs-workflow-auto-execution Task 1.1: Bug Auto Execution Settings - initial state
      bugAutoExecutionPermissions: { ...DEFAULT_BUG_AUTO_EXECUTION_PERMISSIONS },

      // Bug fix: inspection-auto-execution-toggle - initial state
      // Default to 'pause' - consistent with documentReviewOptions.autoExecutionFlag
      inspectionAutoExecutionFlag: 'pause' as InspectionAutoExecutionFlag,

      // Task 2.1: Auto Execution Permissions
      // Bug Fix: auto-execution-settings-not-persisted - persist to spec.json
      toggleAutoPermission: (phase: WorkflowPhase) => {
        set((state) => ({
          autoExecutionPermissions: {
            ...state.autoExecutionPermissions,
            [phase]: !state.autoExecutionPermissions[phase],
          },
        }));
        // Persist to spec.json after state update
        persistSettingsToSpec();
      },

      // Task 2.2: Validation Options
      // Bug Fix: auto-execution-settings-not-persisted - persist to spec.json
      toggleValidationOption: (type: ValidationType) => {
        set((state) => ({
          validationOptions: {
            ...state.validationOptions,
            [type]: !state.validationOptions[type],
          },
        }));
        // Persist to spec.json after state update
        persistSettingsToSpec();
      },

      // NOTE: startAutoExecution, stopAutoExecution, setCurrentAutoPhase removed
      // These are now managed via spec.json.autoExecution

      // Task 2.4: Reset Settings (simplified)
      resetSettings: () => {
        set({
          autoExecutionPermissions: { ...DEFAULT_AUTO_EXECUTION_PERMISSIONS },
          validationOptions: { ...DEFAULT_VALIDATION_OPTIONS },
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

      // Task 6.1: Auto Execution Flag Control
      // Requirements: 6.7, 6.8
      // Bug Fix: auto-execution-settings-not-persisted - persist to spec.json
      setDocumentReviewAutoExecutionFlag: (flag: DocumentReviewAutoExecutionFlag) => {
        set((state) => ({
          documentReviewOptions: {
            ...state.documentReviewOptions,
            autoExecutionFlag: flag,
          },
        }));
        // Persist to spec.json after state update
        persistSettingsToSpec();
      },

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

      setDocumentReviewOptions: (options: Partial<DocumentReviewOptions>) => {
        set((state) => ({
          documentReviewOptions: {
            ...state.documentReviewOptions,
            ...options,
          },
        }));
      },

      setValidationOptions: (options: Partial<ValidationOptions>) => {
        set((state) => ({
          validationOptions: {
            ...state.validationOptions,
            ...options,
          },
        }));
      },

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
      // Bug fix: inspection-auto-execution-toggle
      // Set inspection auto execution flag and persist to spec.json
      // ============================================================
      setInspectionAutoExecutionFlag: (flag: InspectionAutoExecutionFlag) => {
        set({ inspectionAutoExecutionFlag: flag });
        // Persist to spec.json after state update
        persistSettingsToSpec();
      },
    }),
    {
      name: 'sdd-manager-workflow-settings',
      // Task 1.3: Persistence - include bugAutoExecutionPermissions
      partialize: (state) => ({
        autoExecutionPermissions: state.autoExecutionPermissions,
        validationOptions: state.validationOptions,
        commandPrefix: state.commandPrefix,
        documentReviewOptions: state.documentReviewOptions,
        bugAutoExecutionPermissions: state.bugAutoExecutionPermissions,
        // Bug fix: inspection-auto-execution-toggle - persist inspectionAutoExecutionFlag
        inspectionAutoExecutionFlag: state.inspectionAutoExecutionFlag,
      }),
    }
  )
);
