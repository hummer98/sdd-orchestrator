/**
 * RemoteSpecWorkflowApi
 *
 * Remote UI版向けISpecWorkflowApi実装。
 * 既存のApiClientをラップしてISpecWorkflowApiインターフェースを提供。
 *
 * 使用箇所:
 * - SpecDetailView.tsx, SpecActionsView.tsx（将来的にuseSpecWorkflowHandlers経由で使用）
 *
 * 注意:
 * - Electron専用メソッド（updateSpecJson, getEventLog, startImpl, parseTasksForParallel）は未実装
 * - これらはサーバー側APIの追加が必要
 */

import type {
  ISpecWorkflowApi,
  ImplStartError,
  ParseResult,
  ExecutePhaseOptions,
} from '@shared/api/ISpecWorkflowApi';
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
} from '@shared/api/types';
import type { EventLogEntry, EventLogError } from '@shared/types';

// =============================================================================
// RemoteSpecWorkflowApi Implementation
// =============================================================================

/**
 * Remote UI版ISpecWorkflowApi実装
 *
 * 既存のApiClientをラップしてISpecWorkflowApiインターフェースを提供。
 * Electron専用メソッドは未実装（undefinedを返す）。
 */
export class RemoteSpecWorkflowApi implements ISpecWorkflowApi {
  private client: ApiClient;

  constructor(client: ApiClient) {
    this.client = client;
  }

  // ===========================================================================
  // ApiClient由来のメソッド（委譲）
  // ===========================================================================

  async executePhase(specId: string, phase: WorkflowPhase): Promise<Result<AgentInfo, ApiError>> {
    return this.client.executePhase(specId, phase);
  }

  async updateApproval(specPath: string, phase: Phase, approved: boolean): Promise<Result<void, ApiError>> {
    return this.client.updateApproval(specPath, phase, approved);
  }

  async executeDocumentReview(specId: string): Promise<Result<AgentInfo, ApiError>> {
    return this.client.executeDocumentReview(specId);
  }

  async executeInspection(specId: string): Promise<Result<AgentInfo, ApiError>> {
    return this.client.executeInspection(specId);
  }

  // auto-execution-projectpath-fix Task 4.5: Added projectPath parameter
  async startAutoExecution(
    projectPath: string,
    specPath: string,
    specId: string,
    options: AutoExecutionOptions
  ): Promise<Result<AutoExecutionState, ApiError>> {
    return this.client.startAutoExecution(projectPath, specPath, specId, options);
  }

  async stopAutoExecution(specPath: string): Promise<Result<void, ApiError>> {
    return this.client.stopAutoExecution(specPath);
  }

  async getSpecDetail(specId: string): Promise<Result<SpecDetail, ApiError>> {
    return this.client.getSpecDetail(specId);
  }

  // ===========================================================================
  // Electron専用メソッド（未実装）
  // サーバー側APIの追加が必要
  // ===========================================================================

  /**
   * spec.jsonを更新
   * 未実装: サーバー側APIの追加が必要
   */
  updateSpecJson?: (specId: string, updates: Record<string, unknown>) => Promise<Result<void, ApiError>> = undefined;

  /**
   * イベントログを取得
   * 未実装: サーバー側APIの追加が必要
   */
  getEventLog?: (specId: string) => Promise<Result<EventLogEntry[], EventLogError>> = undefined;

  /**
   * Implフェーズを開始（Worktree対応）
   * Remote UIではexecutePhase('impl')で代替
   */
  startImpl?: (
    specId: string,
    featureName: string,
    commandPrefix?: string
  ) => Promise<Result<{ agentId: string }, ImplStartError>> = undefined;

  /**
   * 並列タスク解析
   * 未実装: サーバー側APIの追加が必要
   */
  parseTasksForParallel?: (specName: string) => Promise<ParseResult | null> = undefined;

  /**
   * 拡張フェーズ実行（オプション付き）
   * 未実装: Remote UIでは基本的なexecutePhaseのみ使用
   */
  executePhaseWithOptions?: (
    specId: string,
    phase: string,
    options: ExecutePhaseOptions
  ) => Promise<Result<AgentInfo, ApiError>> = undefined;
}

// =============================================================================
// Factory Function
// =============================================================================

/**
 * ApiClientからRemoteSpecWorkflowApiを作成
 */
export function createRemoteSpecWorkflowApi(client: ApiClient): RemoteSpecWorkflowApi {
  return new RemoteSpecWorkflowApi(client);
}
