/**
 * Execution Types for Shared Components
 *
 * Task 4.7: AutoExecution関連コンポーネントを共有化する
 *
 * 自動実行ステータスと関連型定義
 */

// =============================================================================
// Auto Execution Status Types
// =============================================================================

/**
 * Auto execution status enumeration
 */
export type AutoExecutionStatus =
  | 'idle'
  | 'running'
  | 'paused'
  | 'completing'
  | 'error'
  | 'completed';

/**
 * Workflow phases that can be executed
 * document-review-phase Task 1.1: 'document-review' を追加
 * Requirements: 1.2
 */
export type WorkflowPhase =
  | 'requirements'
  | 'design'
  | 'tasks'
  | 'document-review'
  | 'impl'
  | 'inspection'
  | 'deploy';

/**
 * Phase labels for display
 * document-review-phase Task 1.2: 'document-review' のラベルを追加
 * Requirements: 1.3
 */
export const PHASE_LABELS: Record<WorkflowPhase, string> = {
  requirements: '要件定義',
  design: '設計',
  tasks: 'タスク',
  'document-review': 'ドキュメントレビュー',
  impl: '実装',
  inspection: 'Inspection',
  deploy: 'デプロイ',
};

// =============================================================================
// Bug Execution Types
// =============================================================================

/**
 * Bug auto execution status
 */
export type BugAutoExecutionStatus =
  | 'idle'
  | 'running'
  | 'paused'
  | 'error'
  | 'completed';

/**
 * Bug workflow phases
 */
export type BugPhase = 'analyze' | 'fix' | 'verify';

/**
 * Bug phase labels for display
 */
export const BUG_PHASE_LABELS: Record<BugPhase, string> = {
  analyze: '分析',
  fix: '修正',
  verify: '検証',
};
