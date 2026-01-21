/**
 * ExecutionContext Type Definition
 * Manages per-spec execution state for parallel auto-execution support
 * Requirements: 1.1, 1.5, 1.6, 3.6
 */

import type { SpecDetail } from './index';
import type { WorkflowPhase } from './workflow';
import type { AutoExecutionStatus } from './index';

/**
 * ExecutionContext - Spec毎の自動実行コンテキスト
 * 各Specの実行状態を完全にカプセル化し、並行実行時の状態分離を実現
 * Requirements: 1.1, 1.5, 1.6, 3.6
 * spec-path-ssot-refactor: Changed specPath to specName
 */
export interface ExecutionContext {
  /** 対象SpecのID */
  readonly specId: string;
  /** specDetailのスナップショット（作成時点） */
  readonly specDetailSnapshot: Readonly<SpecDetail>;
  /** specの名前（IPC操作用） spec-path-ssot-refactor: Changed from specPath */
  readonly specName: string;
  /** 現在実行中のフェーズ */
  currentPhase: WorkflowPhase | null;
  /** 実行状態 */
  executionStatus: AutoExecutionStatus;
  /** トラッキング中のAgentId一覧 */
  trackedAgentIds: Set<string>;
  /** 実行済みフェーズ一覧 */
  executedPhases: WorkflowPhase[];
  /** エラー一覧 */
  errors: string[];
  /** 実行開始時刻 */
  startTime: number;
  /** タイムアウトID */
  timeoutId: ReturnType<typeof setTimeout> | null;
}

/**
 * ExecutionContext生成用オプション
 * Requirements: 1.2, 1.5
 */
export interface CreateExecutionContextOptions {
  specId: string;
  specDetail: SpecDetail;
}

/**
 * ExecutionContextファクトリ関数
 * specDetailのスナップショットを作成し、初期状態のコンテキストを生成
 * Requirements: 1.2, 1.5
 */
export function createExecutionContext(options: CreateExecutionContextOptions): ExecutionContext {
  const { specId, specDetail } = options;

  // specDetailのスナップショットを作成（浅いコピー）
  const specDetailSnapshot: Readonly<SpecDetail> = {
    ...specDetail,
    metadata: { ...specDetail.metadata },
    specJson: { ...specDetail.specJson },
    artifacts: { ...specDetail.artifacts },
  };

  // spec-path-ssot-refactor: Changed specPath to specName
  return {
    specId,
    specDetailSnapshot,
    specName: specDetail.metadata.name,
    currentPhase: null,
    executionStatus: 'running',
    trackedAgentIds: new Set<string>(),
    executedPhases: [],
    errors: [],
    startTime: Date.now(),
    timeoutId: null,
  };
}

/**
 * ExecutionContextのディープクリーンアップ
 * timeoutのクリアとリソース解放
 * Requirements: 6.1, 6.3
 */
export function disposeExecutionContext(context: ExecutionContext): void {
  if (context.timeoutId) {
    clearTimeout(context.timeoutId);
    context.timeoutId = null;
  }
  context.trackedAgentIds.clear();
}

/**
 * 最大並行実行数
 * Requirements: 3.4
 */
export const MAX_CONCURRENT_SPECS = 5;
