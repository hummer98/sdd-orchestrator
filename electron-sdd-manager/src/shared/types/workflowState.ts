/**
 * WorkflowState Types
 *
 * WorkflowViewのステート抽象化
 * Electron版とRemote UI版で共通のインターフェースを定義
 *
 * workflow-view-unification: API層抽象化後のステート抽象化
 */

import type {
  SpecDetail,
  WorkflowPhase,
} from '@shared/api/types';
import type { ReviewerScheme } from '@shared/components/review';
import type {
  DocumentReviewState,
  InspectionState,
  DocumentReviewAutoExecutionFlag,
} from './review';
import type { AutoExecutionStatus } from './execution';

// =============================================================================
// Phase Status Types
// =============================================================================

export type PhaseStatus = 'pending' | 'generated' | 'approved';

// =============================================================================
// Core State Interface
// =============================================================================

/**
 * WorkflowViewに必要な全ての状態を定義
 * プラットフォーム固有のストアから取得され、このインターフェースに変換される
 */
export interface WorkflowState {
  // ---------------------------------------------------------------------------
  // Spec State
  // ---------------------------------------------------------------------------
  /** 現在選択されているSpec */
  selectedSpec: string | null;
  /** Spec詳細情報 */
  specDetail: SpecDetail | null;
  /** ロード中フラグ */
  isLoading: boolean;

  // ---------------------------------------------------------------------------
  // Phase Status
  // ---------------------------------------------------------------------------
  /** 各フェーズのステータス */
  phaseStatuses: Record<WorkflowPhase, PhaseStatus>;
  /** 実行中のフェーズ一覧 */
  runningPhases: Set<string>;

  // ---------------------------------------------------------------------------
  // Auto Execution State
  // ---------------------------------------------------------------------------
  /** 自動実行中フラグ */
  isAutoExecuting: boolean;
  /** 現在自動実行中のフェーズ */
  currentAutoPhase: WorkflowPhase | null;
  /** 自動実行ステータス */
  autoExecutionStatus: AutoExecutionStatus;
  /** 各フェーズの自動実行許可設定 */
  autoExecutionPermissions: Record<WorkflowPhase, boolean>;

  // ---------------------------------------------------------------------------
  // Document Review State
  // ---------------------------------------------------------------------------
  /** Document Reviewの状態 */
  documentReviewState: DocumentReviewState | null;
  /** Document Reviewのscheme */
  documentReviewScheme: ReviewerScheme;
  /** Document Reviewの自動実行フラグ */
  documentReviewAutoExecutionFlag: DocumentReviewAutoExecutionFlag;

  // ---------------------------------------------------------------------------
  // Inspection State
  // ---------------------------------------------------------------------------
  /** Inspectionの状態 */
  inspectionState: InspectionState | null;

  // ---------------------------------------------------------------------------
  // Worktree State
  // ---------------------------------------------------------------------------
  /** Worktreeモードが選択されているか */
  isWorktreeModeSelected: boolean;
  /** 既存のWorktreeがあるか */
  hasExistingWorktree: boolean;
  /** mainブランチ上かどうか */
  isOnMain: boolean;
  /** Worktree変換中フラグ */
  isConverting: boolean;

  // ---------------------------------------------------------------------------
  // Parallel Execution State
  // ---------------------------------------------------------------------------
  /** 並列実行モードが有効か */
  parallelModeEnabled: boolean;
  /** 並列実行可能なタスクがあるか */
  hasParallelTasks: boolean;
  /** 並列タスク数 */
  parallelTaskCount: number;

  // ---------------------------------------------------------------------------
  // Metrics State
  // ---------------------------------------------------------------------------
  /** 現在のメトリクス */
  currentMetrics: {
    aiTimeSeconds?: number;
    humanTimeSeconds?: number;
    totalTimeSeconds?: number;
    phaseMetrics?: Record<string, unknown>;
  } | null;

  // ---------------------------------------------------------------------------
  // UI State
  // ---------------------------------------------------------------------------
  /** Optimistic UI: 起動中フラグ */
  launching: boolean;
  /** コマンドプレフィックス */
  commandPrefix: 'kiro' | 'spec-manager';
}

// =============================================================================
// Handlers Interface
// =============================================================================

/**
 * WorkflowViewで使用するハンドラー群
 */
export interface WorkflowHandlers {
  // ---------------------------------------------------------------------------
  // Phase Execution
  // ---------------------------------------------------------------------------
  /** フェーズを実行 */
  handleExecutePhase: (phase: WorkflowPhase) => Promise<void>;
  /** フェーズを承認 */
  handleApprovePhase: (phase: WorkflowPhase) => Promise<void>;
  /** 承認して次のフェーズを実行 */
  handleApproveAndExecutePhase: (phase: WorkflowPhase) => Promise<void>;
  /** 自動実行の許可をトグル */
  handleToggleAutoPermission: (phase: WorkflowPhase) => void;

  // ---------------------------------------------------------------------------
  // Auto Execution
  // ---------------------------------------------------------------------------
  /** 自動実行を開始/停止 */
  handleAutoExecution: () => Promise<void>;

  // ---------------------------------------------------------------------------
  // Document Review
  // ---------------------------------------------------------------------------
  /** Document Reviewを開始 */
  handleStartDocumentReview: () => Promise<void>;
  /** Document Review Replyを実行 */
  handleExecuteDocumentReviewReply: (roundNumber: number) => Promise<void>;
  /** Document Review Fixを適用 */
  handleApplyDocumentReviewFix: (roundNumber: number) => Promise<void>;
  /** Schemeを変更 */
  handleSchemeChange: (scheme: ReviewerScheme) => Promise<void>;
  /** Document Review自動実行フラグを変更 */
  handleDocumentReviewAutoExecutionFlagChange: (flag: DocumentReviewAutoExecutionFlag) => void;

  // ---------------------------------------------------------------------------
  // Inspection
  // ---------------------------------------------------------------------------
  /** Inspectionを開始 */
  handleStartInspection: () => Promise<void>;
  /** Inspection Fixを実行 */
  handleExecuteInspectionFix: (roundNumber: number) => Promise<void>;
  /** Inspection自動実行許可をトグル */
  handleToggleInspectionAutoPermission: () => void;

  // ---------------------------------------------------------------------------
  // Implementation
  // ---------------------------------------------------------------------------
  /** 実装を開始 */
  handleImplExecute: () => Promise<void>;
  /** タスクを実行 */
  handleExecuteTask: (taskId: string) => Promise<void>;
  /** 並列実行を開始 */
  handleParallelExecute: () => Promise<void>;
  /** 並列モードをトグル */
  handleToggleParallelMode: () => void;

  // ---------------------------------------------------------------------------
  // Worktree
  // ---------------------------------------------------------------------------
  /** Worktreeに変換 */
  handleConvertToWorktree: () => Promise<void>;

  // ---------------------------------------------------------------------------
  // Event Log
  // ---------------------------------------------------------------------------
  /** イベントログを表示 */
  handleShowEventLog: () => Promise<void>;

  // ---------------------------------------------------------------------------
  // Agent Log
  // ---------------------------------------------------------------------------
  /** エージェントログを表示 */
  handleShowAgentLog: (phase: WorkflowPhase) => void;
}

// =============================================================================
// Derived State Functions
// =============================================================================

/**
 * フェーズが実行可能かを判定
 */
export function canExecutePhase(
  state: Pick<WorkflowState, 'runningPhases' | 'phaseStatuses'>,
  phase: WorkflowPhase,
  allPhases: readonly WorkflowPhase[]
): boolean {
  // 同じspec内で既にAgentが実行中なら不可
  if (state.runningPhases.size > 0) return false;

  const index = allPhases.indexOf(phase);
  if (index === 0) return true; // requirements は常に実行可能

  // 前のフェーズが approved でなければ不可
  const prevPhase = allPhases[index - 1];
  return state.phaseStatuses[prevPhase] === 'approved';
}

/**
 * 前のフェーズのステータスを取得
 */
export function getPreviousPhaseStatus(
  phaseStatuses: Record<WorkflowPhase, PhaseStatus>,
  phase: WorkflowPhase,
  allPhases: readonly WorkflowPhase[]
): PhaseStatus | null {
  const index = allPhases.indexOf(phase);
  if (index <= 0) return null;
  return phaseStatuses[allPhases[index - 1]];
}

// =============================================================================
// Hook Return Type
// =============================================================================

/**
 * useWorkflowStateフックの戻り値型
 */
export interface UseWorkflowStateReturn {
  state: WorkflowState;
  handlers: WorkflowHandlers;
}

// =============================================================================
// Configuration Type
// =============================================================================

/**
 * WorkflowView用の設定
 */
export interface WorkflowConfig {
  /** API層のインスタンス（Electron用） */
  api?: unknown;
  /** ApiClient（Remote UI用） */
  apiClient?: unknown;
  /** コマンドプレフィックス */
  commandPrefix?: 'kiro' | 'spec-manager';
}
