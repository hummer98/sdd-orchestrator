/**
 * ISpecWorkflowApi Interface
 *
 * Spec右ペイン（ワークフロー）操作の統一インターフェース。
 * ApiClientを拡張し、Electron版専用メソッドを追加。
 *
 * Design Decision:
 * - Remote UI版: ApiClientを直接使用（既存メソッドで十分）
 * - Electron版: ISpecWorkflowApi実装を使用（追加メソッドが必要）
 *
 * 共通化対象:
 * - executePhase, updateApproval, executeDocumentReview, executeInspection (ApiClient由来)
 * - updateSpecJson, getEventLog, startImpl (Electron専用)
 */

import type {
  Result,
  ApiError,
  ApiClient,
  AgentInfo,
  WorkflowPhase,
  Phase,
  SpecDetail,
  AutoExecutionOptions,
  AutoExecutionState,
} from './types';
import type { EventLogEntry, EventLogError } from '@shared/types';

// =============================================================================
// Electron専用メソッドの型定義
// =============================================================================

/**
 * Impl開始時のエラー型
 */
export interface ImplStartError {
  type: 'NOT_ON_MAIN_BRANCH' | 'WORKTREE_CREATE_FAILED' | 'SPEC_JSON_ERROR' | 'EXECUTE_FAILED';
  message?: string;
  currentBranch?: string;
}

/**
 * 並列タスク解析結果
 */
export interface ParseResult {
  groups: Array<{
    groupIndex: number;
    tasks: Array<{
      id: string;
      title: string;
      isParallel: boolean;
      completed: boolean;
      parentId: string | null;
    }>;
    isParallel: boolean;
  }>;
  totalTasks: number;
  parallelTasks: number;
}

/**
 * フェーズ実行オプション
 */
export interface ExecutePhaseOptions {
  /** コマンドプレフィックス */
  commandPrefix?: 'kiro' | 'spec-manager';
  /** document-review-reply, document-review-fix用 */
  reviewNumber?: number;
  /** inspection-fix用 */
  roundNumber?: number;
  /** impl用 */
  taskId?: string;
}

// =============================================================================
// ISpecWorkflowApi Interface
// =============================================================================

/**
 * Spec右ペイン操作の統一インターフェース
 *
 * ApiClientの既存メソッドに加え、Electron版専用メソッドを定義。
 * Remote UI版では一部メソッドが未実装（undefined）の可能性あり。
 */
export interface ISpecWorkflowApi {
  // ===========================================================================
  // ApiClient由来のメソッド（両版で共通）
  // ===========================================================================

  /**
   * フェーズを実行
   */
  executePhase(specId: string, phase: WorkflowPhase): Promise<Result<AgentInfo, ApiError>>;

  /**
   * 承認状態を更新
   */
  updateApproval(specIdOrPath: string, phase: Phase, approved: boolean): Promise<Result<void, ApiError>>;

  /**
   * Document Reviewを実行
   */
  executeDocumentReview(specId: string): Promise<Result<AgentInfo, ApiError>>;

  /**
   * Inspectionを実行
   */
  executeInspection(specId: string): Promise<Result<AgentInfo, ApiError>>;

  /**
   * 自動実行を開始
   * auto-execution-projectpath-fix: Task 4.4 - Added projectPath parameter
   */
  startAutoExecution(
    projectPath: string,
    specPath: string,
    specId: string,
    options: AutoExecutionOptions
  ): Promise<Result<AutoExecutionState, ApiError>>;

  /**
   * 自動実行を停止
   */
  stopAutoExecution(specPath: string): Promise<Result<void, ApiError>>;

  /**
   * Spec詳細を取得
   */
  getSpecDetail(specId: string): Promise<Result<SpecDetail, ApiError>>;

  // ===========================================================================
  // Electron専用メソッド（Remote UIでは未実装の可能性あり）
  // ===========================================================================

  /**
   * spec.jsonを更新
   * Remote UIでは未実装（サーバー側API追加が必要）
   */
  updateSpecJson?(specId: string, updates: Record<string, unknown>): Promise<Result<void, ApiError>>;

  /**
   * イベントログを取得
   * Remote UIでは未実装（サーバー側API追加が必要）
   */
  getEventLog?(specId: string): Promise<Result<EventLogEntry[], EventLogError>>;

  /**
   * Implフェーズを開始（Worktree対応）
   * Remote UIではexecutePhase('impl')で代替
   */
  startImpl?(
    specId: string,
    featureName: string,
    commandPrefix?: string
  ): Promise<Result<{ agentId: string }, ImplStartError>>;

  /**
   * 並列タスク解析
   * Remote UIでは未実装
   */
  parseTasksForParallel?(specName: string): Promise<ParseResult | null>;

  /**
   * 拡張フェーズ実行（オプション付き）
   * document-review-reply, inspection-fixなどに使用
   */
  executePhaseWithOptions?(
    specId: string,
    phase: string,
    options: ExecutePhaseOptions
  ): Promise<Result<AgentInfo, ApiError>>;
}

// =============================================================================
// Factory Functions
// =============================================================================

/**
 * ApiClientをISpecWorkflowApiにアダプト
 * Remote UI版で使用
 */
export function createSpecWorkflowApiFromClient(client: ApiClient): ISpecWorkflowApi {
  return {
    executePhase: client.executePhase.bind(client),
    updateApproval: client.updateApproval.bind(client),
    executeDocumentReview: client.executeDocumentReview.bind(client),
    executeInspection: client.executeInspection.bind(client),
    startAutoExecution: client.startAutoExecution.bind(client),
    stopAutoExecution: client.stopAutoExecution.bind(client),
    getSpecDetail: client.getSpecDetail.bind(client),
    // Electron専用メソッドは未実装
    updateSpecJson: undefined,
    getEventLog: undefined,
    startImpl: undefined,
    parseTasksForParallel: undefined,
    executePhaseWithOptions: undefined,
  };
}
