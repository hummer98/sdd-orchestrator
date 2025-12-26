/**
 * Bug Workflow Types
 * Requirements: 3.1, 6.1
 */

/**
 * Bug phase type representing the current workflow state
 * Requirements: 3.1
 */
export type BugPhase = 'reported' | 'analyzed' | 'fixed' | 'verified';

/**
 * Bug action type for workflow commands
 * Requirements: 5.1-5.4
 */
export type BugAction = 'analyze' | 'fix' | 'verify';

/**
 * Bug metadata interface
 * Requirements: 6.1
 */
export interface BugMetadata {
  readonly name: string;           // バグ名（ディレクトリ名）
  readonly path: string;           // フルパス
  readonly phase: BugPhase;        // 現在のフェーズ
  readonly updatedAt: string;      // 最終更新日時
  readonly reportedAt: string;     // 報告日時
}

/**
 * Artifact info for bug files
 */
export interface BugArtifactInfo {
  readonly exists: boolean;
  readonly path: string;
  readonly updatedAt: string | null;
  readonly content?: string;
}

/**
 * Bug detail interface with full artifact information
 */
export interface BugDetail {
  readonly metadata: BugMetadata;
  readonly artifacts: {
    readonly report: BugArtifactInfo | null;      // report.md
    readonly analysis: BugArtifactInfo | null;    // analysis.md
    readonly fix: BugArtifactInfo | null;         // fix.md
    readonly verification: BugArtifactInfo | null; // verification.md
  };
}

/**
 * Bugs change event for file watcher
 * Requirements: 6.5
 */
export interface BugsChangeEvent {
  readonly type: 'add' | 'change' | 'unlink' | 'addDir' | 'unlinkDir';
  readonly path: string;
  readonly bugName?: string;
}

/**
 * Determine bug phase from artifacts
 * Requirements: 3.1
 * @param artifacts - Bug artifacts object
 * @returns Current bug phase
 */
export function determineBugPhase(artifacts: BugDetail['artifacts']): BugPhase {
  if (artifacts.verification?.exists) return 'verified';
  if (artifacts.fix?.exists) return 'fixed';
  if (artifacts.analysis?.exists) return 'analyzed';
  return 'reported';
}

/**
 * Get the next action available for a given phase
 * Requirements: 5.6
 * @param phase - Current bug phase
 * @returns Next available action or null if complete
 */
export function getNextAction(phase: BugPhase): BugAction | null {
  switch (phase) {
    case 'reported':
      return 'analyze';
    case 'analyzed':
      return 'fix';
    case 'fixed':
      return 'verify';
    case 'verified':
      return null;
  }
}

/**
 * Check if an action is available for a given phase
 * Requirements: 5.6
 * @param phase - Current bug phase
 * @param action - Action to check
 * @returns Whether the action is available
 */
export function isActionAvailable(phase: BugPhase, action: BugAction): boolean {
  return getNextAction(phase) === action;
}

/**
 * Phase labels for display
 */
export const PHASE_LABELS: Record<BugPhase, string> = {
  reported: '報告済',
  analyzed: '分析済',
  fixed: '修正済',
  verified: '検証済',
};

/**
 * Phase colors for display (Tailwind CSS classes)
 */
export const PHASE_COLORS: Record<BugPhase, string> = {
  reported: 'bg-red-100 text-red-700',
  analyzed: 'bg-yellow-100 text-yellow-700',
  fixed: 'bg-blue-100 text-blue-700',
  verified: 'bg-green-100 text-green-700',
};

/**
 * All phases in order
 */
export const BUG_PHASES: readonly BugPhase[] = ['reported', 'analyzed', 'fixed', 'verified'] as const;

// ============================================================
// Task 1.1: bugs-pane-integration - BugWorkflowPhase, BugPhaseStatus, BugDocumentTab型
// Requirements: 2.2, 3.2
// ============================================================

/**
 * Bugワークフロー表示用のフェーズ型
 * BugPhase（ドキュメント存在判定用）とは別概念
 * Requirements: 3.2
 */
export type BugWorkflowPhase = 'report' | 'analyze' | 'fix' | 'verify' | 'deploy';

/**
 * ワークフローフェーズの状態
 * Requirements: 3.3
 */
export type BugPhaseStatus = 'pending' | 'completed' | 'executing';

/**
 * Bugドキュメントタブ型
 * Requirements: 2.2
 */
export type BugDocumentTab = 'report' | 'analysis' | 'fix' | 'verification';

/**
 * ワークフローフェーズの順序定義
 */
export const BUG_WORKFLOW_PHASES: readonly BugWorkflowPhase[] = [
  'report',
  'analyze',
  'fix',
  'verify',
  'deploy',
] as const;

/**
 * ドキュメントタブの順序定義
 */
export const BUG_DOCUMENT_TABS: readonly BugDocumentTab[] = [
  'report',
  'analysis',
  'fix',
  'verification',
] as const;

/**
 * ワークフローフェーズのラベル
 */
export const BUG_WORKFLOW_PHASE_LABELS: Record<BugWorkflowPhase, string> = {
  report: 'Report',
  analyze: 'Analyze',
  fix: 'Fix',
  verify: 'Verify',
  deploy: 'Deploy',
};

/**
 * フェーズとコマンドのマッピング
 * Requirements: 4.1-4.5
 */
export const BUG_PHASE_COMMANDS: Record<BugWorkflowPhase, string | null> = {
  report: null, // 手動作成のため実行ボタンなし
  analyze: '/kiro:bug-analyze',
  fix: '/kiro:bug-fix',
  verify: '/kiro:bug-verify',
  deploy: '/commit',
};
