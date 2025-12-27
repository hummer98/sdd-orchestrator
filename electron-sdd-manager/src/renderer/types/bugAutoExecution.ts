/**
 * Bug Auto Execution Types
 * Types for bug workflow auto-execution feature
 * bugs-workflow-auto-execution Task 1.1
 * Requirements: 2.1, 7.4
 */

import type { BugWorkflowPhase } from './bug';

/**
 * Bug自動実行許可設定
 * Requirements: 2.1
 */
export interface BugAutoExecutionPermissions {
  analyze: boolean;
  fix: boolean;
  verify: boolean;
  deploy: boolean;
}

/**
 * Bug自動実行の状態
 * Requirements: 3.1-3.5
 */
export type BugAutoExecutionStatus =
  | 'idle'       // 待機中
  | 'running'    // 実行中
  | 'paused'     // 一時停止（Agent待機中）
  | 'error'      // エラー停止
  | 'completed'; // 完了

/**
 * Bug自動実行状態
 * Requirements: 2.3, 2.4
 */
export interface BugAutoExecutionState {
  /** 自動実行が進行中かどうか */
  isAutoExecuting: boolean;
  /** 現在自動実行中のフェーズ */
  currentAutoPhase: BugWorkflowPhase | null;
  /** 自動実行ステータス */
  autoExecutionStatus: BugAutoExecutionStatus;
  /** 最後に失敗したフェーズ */
  lastFailedPhase: BugWorkflowPhase | null;
  /** 連続失敗回数 */
  failedRetryCount: number;
}

/**
 * デフォルトのBug自動実行許可設定
 * Requirements: 2.1 - analyze, fix, verify許可、deploy無効
 */
export const DEFAULT_BUG_AUTO_EXECUTION_PERMISSIONS: BugAutoExecutionPermissions = {
  analyze: true,
  fix: true,
  verify: true,
  deploy: false, // deployはデフォルト無効
};

/**
 * デフォルトのBug自動実行状態
 */
export const DEFAULT_BUG_AUTO_EXECUTION_STATE: BugAutoExecutionState = {
  isAutoExecuting: false,
  currentAutoPhase: null,
  autoExecutionStatus: 'idle',
  lastFailedPhase: null,
  failedRetryCount: 0,
};

/**
 * 自動実行対象フェーズの順序
 * reportフェーズは手動作成のため除外
 */
export const BUG_AUTO_EXECUTION_PHASES: readonly BugWorkflowPhase[] = [
  'analyze',
  'fix',
  'verify',
  'deploy',
] as const;

/**
 * Bug自動実行フェーズのラベル
 */
export const BUG_AUTO_EXECUTION_PHASE_LABELS: Record<BugWorkflowPhase, string> = {
  report: 'Report',
  analyze: 'Analyze',
  fix: 'Fix',
  verify: 'Verify',
  deploy: 'Deploy',
};
