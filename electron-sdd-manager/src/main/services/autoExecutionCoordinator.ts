/**
 * AutoExecutionCoordinator
 * Main Process側での自動実行のSingle Source of Truth
 * Requirements: 1.1, 1.2, 7.1
 *
 * 設計原則:
 * - Main Process側でのみ状態を保持（SSoT）
 * - specPath単位でのMap管理（並行実行対応）
 * - イベント駆動による状態変更通知
 */

import { EventEmitter } from 'events';
import { logger } from './logger';
import type { WorkflowPhase } from './specManagerService';
import { FileService } from './fileService';
// spec-event-log: Event logging for auto-execution activities
import { getDefaultEventLogService } from './eventLogService';
import type { EventLogInput } from '../../shared/types';
// Task 7.2: Agent Lifecycle Management integration (agent-lifecycle-management feature)
import { getAgentLifecycleManager } from './agentLifecycleSetup';

// ============================================================
// Constants
// ============================================================

/** デフォルトタイムアウト: 30分 */
export const DEFAULT_AUTO_EXECUTION_TIMEOUT = 1_800_000;

/** 最大並行実行数 */
export const MAX_CONCURRENT_EXECUTIONS = 5;

/** 最大Document Reviewループ回数 */
export const MAX_DOCUMENT_REVIEW_ROUNDS = 7;

/**
 * impl-task-completion-guard Task 3.1: 最大impl再実行回数
 * Requirements: 3.1
 */
export const MAX_IMPL_RETRY_COUNT = 7;

/**
 * フェーズ順序（requirements -> design -> tasks -> document-review -> impl -> inspection）
 * document-review-phase Task 1.1: document-review を tasks と impl の間に追加
 * Requirements: 1.1
 */
export const PHASE_ORDER: readonly WorkflowPhase[] = ['requirements', 'design', 'tasks', 'document-review', 'impl', 'inspection'];

// ============================================================
// Types
// ============================================================

/**
 * 自動実行状態
 * Requirements: 1.1
 */
export type AutoExecutionStatus = 'idle' | 'running' | 'paused' | 'completed' | 'error';

/**
 * 自動実行状態管理
 * specPath単位での実行状態を保持
 * Requirements: 1.2
 * auto-execution-projectpath-fix Requirement 1.1: projectPathフィールド追加
 * impl-task-completion-guard Task 1.1: implRetryCountフィールド追加
 */
export interface AutoExecutionState {
  /** プロジェクトパス（メインリポジトリ）- worktree環境でも正しい場所にログを記録するために使用 */
  readonly projectPath: string;
  /** specのパス（worktreeの場合はworktree内パス） */
  readonly specPath: string;
  /** specのID（specPathから抽出） */
  readonly specId: string;
  /** 現在の状態 */
  status: AutoExecutionStatus;
  /** 現在実行中のフェーズ */
  currentPhase: WorkflowPhase | null;
  /** 実行済みフェーズ一覧 */
  executedPhases: WorkflowPhase[];
  /** エラー一覧 */
  errors: string[];
  /** 実行開始時刻 */
  startTime: number;
  /** 最終アクティビティ時刻 */
  lastActivityTime: number;
  /** 現在実行中のAgentId */
  currentAgentId?: string;
  /** タイムアウトタイマーID */
  timeoutId?: ReturnType<typeof setTimeout>;
  /** 現在のDocument Reviewループ回数 */
  currentDocumentReviewRound?: number;
  /**
   * impl-task-completion-guard Task 1.1: Impl phase retry count
   * Incremented when impl Agent completes with incomplete tasks
   * Reset on Electron restart (in-memory only)
   * Requirements: 2.2, 2.3
   */
  implRetryCount?: number;
}

/**
 * 自動実行許可設定
 * フェーズごとの自動実行許可
 * Requirements: 7.1
 * document-review-phase Task 2.1: 'document-review' を追加
 * Requirements: 2.1
 */
export interface AutoExecutionPermissions {
  readonly requirements: boolean;
  readonly design: boolean;
  readonly tasks: boolean;
  readonly 'document-review': boolean;
  readonly impl: boolean;
  readonly inspection: boolean;
  readonly deploy: boolean;
}

/**
 * ドキュメントレビューフラグ
 * @deprecated document-review-phase Task 2.2: Use permissions['document-review'] instead
 * Kept for backward compatibility with existing spec.json files
 * Requirements: 2.2, 7.1
 */
export type DocumentReviewFlag = 'run' | 'pause';

/**
 * Approval状態
 * Requirements: 7.1
 */
export interface ApprovalPhaseStatus {
  readonly generated: boolean;
  readonly approved: boolean;
}

/**
 * Approvals状態（spec.jsonから取得）
 * Requirements: 7.1
 */
export interface ApprovalsStatus {
  readonly requirements: ApprovalPhaseStatus;
  readonly design: ApprovalPhaseStatus;
  readonly tasks: ApprovalPhaseStatus;
}

/**
 * 自動実行オプション
 * document-review-phase Task 2.2: documentReviewFlag を削除
 * Requirements: 2.2, 7.1
 */
export interface AutoExecutionOptions {
  /** フェーズごとの許可設定 */
  readonly permissions: AutoExecutionPermissions;
  // documentReviewFlag removed - use permissions['document-review'] instead
  /** タイムアウト（ms） */
  readonly timeoutMs?: number;
  /** コマンドプレフィックス */
  readonly commandPrefix?: 'kiro' | 'spec-manager';
  /** 現在のApproval状態（spec.jsonから取得、開始時のフェーズ判定に使用） */
  readonly approvals?: ApprovalsStatus;
  /**
   * Validation options for spec execution
   * Used for gap analysis, design review, etc.
   */
  readonly validationOptions?: {
    readonly gap: boolean;
    readonly design: boolean;
    readonly impl: boolean;
  };
}

/**
 * 自動実行エラー型
 * Requirements: 1.2, 8.1
 */
export type AutoExecutionError =
  | { type: 'ALREADY_EXECUTING'; specId: string }
  | { type: 'NOT_EXECUTING'; specId: string }
  | { type: 'MAX_CONCURRENT_REACHED'; limit: number }
  | { type: 'PRECONDITION_FAILED'; message: string }
  | { type: 'PHASE_EXECUTION_FAILED'; phase: WorkflowPhase; message?: string }
  | { type: 'SPEC_NOT_FOUND'; specPath: string }
  | { type: 'INVALID_STATE_TRANSITION'; from: AutoExecutionStatus; to: AutoExecutionStatus }
  | { type: 'TIMEOUT'; specId: string; phase: WorkflowPhase | null }
  | { type: 'AGENT_CRASH'; agentId: string; exitCode: number; phase: WorkflowPhase | null };

/**
 * Result型
 */
export type Result<T, E> =
  | { ok: true; value: T }
  | { ok: false; error: E };

/**
 * イベント型定義
 * document-review-phase Task 2.2, 2.3: execute-document-review と execute-inspection を削除
 * Requirements: 3.1, 5.1
 */
export interface AutoExecutionEvents {
  'state-changed': (specPath: string, state: AutoExecutionState) => void;
  'phase-started': (specPath: string, phase: WorkflowPhase, agentId: string) => void;
  'phase-completed': (specPath: string, phase: WorkflowPhase) => void;
  'phase-error': (specPath: string, phase: WorkflowPhase, error: string) => void;
  'execution-completed': (specPath: string, summary: ExecutionSummary) => void;
  'execution-error': (specPath: string, error: AutoExecutionError) => void;
  /** git-worktree-support Task 9.2: inspection成功後にspec-merge自動実行 */
  'execute-spec-merge': (specPath: string, context: { specId: string }) => void;
  // document-review-phase: execute-document-review and execute-inspection removed
  // These phases are now handled via execute-next-phase with phase === 'document-review' or 'inspection'
}

/**
 * 実行サマリー
 */
export interface ExecutionSummary {
  readonly specId: string;
  readonly executedPhases: readonly WorkflowPhase[];
  readonly totalDuration: number;
  readonly errors: readonly string[];
  readonly status: 'completed' | 'error' | 'paused';
}

/**
 * AutoExecutionCoordinator
 * Main Process側での自動実行のSSoT
 * Requirements: 1.1, 1.2, 7.1
 */
export class AutoExecutionCoordinator extends EventEmitter {
  /** specPath -> AutoExecutionState のマップ */
  private readonly executionStates: Map<string, AutoExecutionState> = new Map();

  /** specPath -> AutoExecutionOptions のマップ */
  private readonly executionOptions: Map<string, AutoExecutionOptions> = new Map();

  constructor() {
    super();
    logger.info('[AutoExecutionCoordinator] Initialized');
  }

  // ============================================================
  // spec-event-log: Event Logging Helper
  // ============================================================

  /**
   * Log an auto-execution event using EventLogService
   * Fire-and-forget pattern: errors are logged but not propagated
   *
   * auto-execution-projectpath-fix Task 1.3:
   * - Requirements: 1.4, 1.5
   * - 逆算ロジック（.kiro/specs/で分割）を削除し、state.projectPathを直接使用
   * - worktree環境でも正しい場所にログを記録
   */
  private logAutoExecutionEvent(specPath: string, specId: string, event: EventLogInput): void {
    // Task 1.3: Get projectPath from state instead of extracting from specPath
    const state = this.executionStates.get(specPath);
    if (!state) {
      logger.warn('[AutoExecutionCoordinator] logAutoExecutionEvent: state not found', { specPath });
      return;
    }

    // Task 1.3: Use state.projectPath directly (Requirement 1.4, 1.5)
    getDefaultEventLogService().logEvent(
      state.projectPath,
      specId,
      event
    ).catch(() => {
      // Errors are logged internally by EventLogService
    });
  }

  // ============================================================
  // State Query Methods
  // ============================================================

  /**
   * 指定specPathの実行状態を取得
   * @param specPath specのパス
   * @returns AutoExecutionState or null
   */
  getStatus(specPath: string): AutoExecutionState | null {
    return this.executionStates.get(specPath) ?? null;
  }

  /**
   * 全ての実行状態を取得
   * @returns specPath -> AutoExecutionState のMap
   */
  getAllStatuses(): Map<string, AutoExecutionState> {
    return new Map(this.executionStates);
  }

  /**
   * 実行中のspec数を取得
   * @returns 実行中のspec数
   */
  getRunningCount(): number {
    let count = 0;
    for (const state of this.executionStates.values()) {
      if (state.status === 'running') {
        count++;
      }
    }
    return count;
  }

  /**
   * specIdから実行状態を取得
   * @param specId specのID
   * @returns AutoExecutionState or null
   */
  getStatusBySpecId(specId: string): AutoExecutionState | null {
    for (const state of this.executionStates.values()) {
      if (state.specId === specId) {
        return state;
      }
    }
    return null;
  }

  /**
   * 指定specPathが実行中かどうか
   * @param specPath specのパス
   * @returns 実行中ならtrue
   */
  isExecuting(specPath: string): boolean {
    const state = this.executionStates.get(specPath);
    return state?.status === 'running';
  }

  // ============================================================
  // State Management (Internal)
  // ============================================================

  /**
   * 新しい実行状態を作成
   * @param projectPath プロジェクトパス（メインリポジトリ）
   * @param specPath specのパス
   * @param specId specのID
   * @returns 作成されたAutoExecutionState
   *
   * auto-execution-projectpath-fix Task 1.1: projectPathフィールドを状態に追加
   * Note: projectPath引数はTask 1.2で追加される。現在は一時的にspecPathから逆算。
   */
  protected createState(specPath: string, specId: string, projectPath?: string): AutoExecutionState {
    const now = Date.now();
    // Task 1.1: projectPathを状態に追加（Task 1.2で適切に設定される）
    // 一時的にspecPathから逆算（既存のlogAutoExecutionEventと同じロジック）
    const resolvedProjectPath = projectPath ?? this.extractProjectPathFromSpecPath(specPath);
    const state: AutoExecutionState = {
      projectPath: resolvedProjectPath,
      specPath,
      specId,
      status: 'idle',
      currentPhase: null,
      executedPhases: [],
      errors: [],
      startTime: now,
      lastActivityTime: now,
    };
    this.executionStates.set(specPath, state);
    return state;
  }

  /**
   * specPathからprojectPathを抽出（一時的なヘルパー）
   * Task 1.3で削除予定（state.projectPathを直接使用するため）
   * @param specPath specのパス
   * @returns プロジェクトパス
   */
  private extractProjectPathFromSpecPath(specPath: string): string {
    const pathParts = specPath.split('.kiro/specs/');
    return pathParts[0] ? pathParts[0].replace(/\/$/, '') : specPath;
  }

  /**
   * 実行状態を更新
   * @param specPath specのパス
   * @param updates 更新内容
   * auto-execution-projectpath-fix Task 1.1: projectPathを readonly フィールドに追加
   */
  protected updateState(
    specPath: string,
    updates: Partial<Omit<AutoExecutionState, 'projectPath' | 'specPath' | 'specId'>>
  ): void {
    const state = this.executionStates.get(specPath);
    if (!state) {
      logger.warn('[AutoExecutionCoordinator] updateState: state not found', { specPath });
      return;
    }

    const updatedState: AutoExecutionState = {
      ...state,
      ...updates,
      lastActivityTime: Date.now(),
    };

    this.executionStates.set(specPath, updatedState);
    this.emit('state-changed', specPath, updatedState);

    logger.debug('[AutoExecutionCoordinator] State updated', {
      specPath,
      status: updatedState.status,
      currentPhase: updatedState.currentPhase,
    });
  }

  /**
   * 実行状態を削除
   * @param specPath specのパス
   */
  protected removeState(specPath: string): void {
    const state = this.executionStates.get(specPath);
    if (state?.timeoutId) {
      clearTimeout(state.timeoutId);
    }
    this.executionStates.delete(specPath);
  }

  // ============================================================
  // Public API - Start/Stop/RetryFrom (Task 1.2)
  // Requirements: 1.1, 1.2, 8.5
  // ============================================================

  /**
   * 自動実行を開始
   * auto-execution-projectpath-fix Task 1.2: シグネチャ変更
   * @param projectPath プロジェクトパス（メインリポジトリ）
   * @param specPath specのパス
   * @param specId specのID
   * @param options 自動実行オプション
   * @returns 成功時は状態、失敗時はエラー
   */
  async start(
    projectPath: string,
    specPath: string,
    specId: string,
    options: AutoExecutionOptions
  ): Promise<Result<AutoExecutionState, AutoExecutionError>> {
    logger.info('[AutoExecutionCoordinator] start called', { projectPath, specPath, specId });

    // 既に実行中かチェック
    const existingState = this.executionStates.get(specPath);
    if (existingState && existingState.status === 'running') {
      logger.warn('[AutoExecutionCoordinator] Already executing', { specPath, specId });
      return {
        ok: false,
        error: { type: 'ALREADY_EXECUTING', specId },
      };
    }

    // 最大並行実行数チェック
    const runningCount = this.getRunningCount();
    if (runningCount >= MAX_CONCURRENT_EXECUTIONS) {
      logger.warn('[AutoExecutionCoordinator] Max concurrent reached', {
        current: runningCount,
        max: MAX_CONCURRENT_EXECUTIONS,
      });
      return {
        ok: false,
        error: { type: 'MAX_CONCURRENT_REACHED', limit: MAX_CONCURRENT_EXECUTIONS },
      };
    }

    // 新しい状態を作成または既存を更新
    const now = Date.now();
    // auto-execution-projectpath-fix Task 1.2: projectPathは引数から直接取得（逆算ロジックは使用しない）
    // 既存のstateがある場合でも、新しく渡されたprojectPathを優先する
    const state: AutoExecutionState = {
      projectPath,  // Task 1.2: 引数で受け取ったprojectPathを直接使用
      specPath,
      specId,
      status: 'running',
      currentPhase: null,
      executedPhases: existingState?.executedPhases ?? [],
      errors: existingState?.errors ?? [],
      startTime: existingState?.startTime ?? now,
      lastActivityTime: now,
    };

    // タイムアウト設定
    const timeoutMs = options.timeoutMs ?? DEFAULT_AUTO_EXECUTION_TIMEOUT;
    state.timeoutId = setTimeout(() => {
      this.handleTimeout(specPath);
    }, timeoutMs);

    this.executionStates.set(specPath, state);
    this.executionOptions.set(specPath, options);
    this.emit('state-changed', specPath, state);

    logger.info('[AutoExecutionCoordinator] Auto-execution started', { specPath, specId });

    // spec-event-log: Log auto-execution:start event (Requirement 1.4)
    this.logAutoExecutionEvent(specPath, specId, {
      type: 'auto-execution:start',
      message: 'Auto-execution started',
      status: 'started',
      startPhase: options.permissions.requirements ? 'requirements' :
                 options.permissions.design ? 'design' :
                 options.permissions.tasks ? 'tasks' :
                 options.permissions.impl ? 'impl' : undefined,
    });

    // 初期フェーズを決定して実行イベントを発火
    // Bug Fix: approvals がある場合は既に完了しているフェーズをスキップ
    // approvals が渡されない場合は Main Process で直接 spec.json を読み取る
    let lastCompletedPhase: WorkflowPhase | null = null;
    let approvals = options.approvals;

    if (!approvals) {
      // Main Process で spec.json を直接読み取り
      try {
        const specJsonPath = require('path').join(specPath, 'spec.json');
        const content = require('fs').readFileSync(specJsonPath, 'utf-8');
        const specJson = JSON.parse(content);
        approvals = specJson.approvals;
        logger.info('[AutoExecutionCoordinator] Read approvals from spec.json', {
          specPath,
          approvals,
        });
      } catch (err) {
        logger.warn('[AutoExecutionCoordinator] Failed to read spec.json for approvals', {
          specPath,
          error: err,
        });
      }
    }

    if (approvals) {
      // Bug Fix: 未承認だが生成済みのフェーズを自動承認
      // 自動実行ボタンを押す = 現状の成果物を暗黙的に承認する意図と解釈
      const unapprovedPhases = this.getUnapprovedGeneratedPhases(approvals);
      if (unapprovedPhases.length > 0) {
        const fileService = new FileService();
        // ミュータブルなコピーを作成
        const mutableApprovals = {
          requirements: { ...approvals.requirements },
          design: { ...approvals.design },
          tasks: { ...approvals.tasks },
        };
        for (const phase of unapprovedPhases) {
          logger.info('[AutoExecutionCoordinator] Auto-approving unapproved generated phase', {
            specPath,
            phase,
          });
          const result = await fileService.updateApproval(specPath, phase, true);
          if (result.ok) {
            mutableApprovals[phase].approved = true;
          } else {
            logger.warn('[AutoExecutionCoordinator] Failed to auto-approve phase', {
              specPath,
              phase,
              error: result.error,
            });
          }
        }
        approvals = mutableApprovals;
      }

      lastCompletedPhase = this.getLastCompletedPhase(approvals);
      logger.info('[AutoExecutionCoordinator] Last completed phase from approvals', {
        specPath,
        lastCompletedPhase,
        approvals,
      });
    }

    // auto-execution-nogo-stop Task 1.1: getImmediateNextPhaseに変更
    // NOGOフェーズをスキップせず、即座に停止する動作に統一
    // Requirements: 1.1, 1.2, 1.3, 2.2, 2.3
    const firstPhase = this.getImmediateNextPhase(lastCompletedPhase, options.permissions, approvals);
    if (firstPhase) {
      this.emit('execute-next-phase', specPath, firstPhase, {
        specId,
        featureName: specId,
      });
      logger.info('[AutoExecutionCoordinator] Triggering initial phase', {
        specPath,
        firstPhase,
        startedFrom: lastCompletedPhase,
      });
    } else {
      // 次のフェーズがNOGOまたは全フェーズ完了の場合は即座に完了
      logger.info('[AutoExecutionCoordinator] No next phase (NOGO or all completed), completing immediately', {
        specPath,
        lastCompletedPhase
      });
      this.completeExecution(specPath);
    }

    return { ok: true, value: state };
  }

  /**
   * 自動実行を停止
   * @param specPath specのパス
   * @returns 成功時はvoid、失敗時はエラー
   */
  async stop(specPath: string): Promise<Result<void, AutoExecutionError>> {
    logger.info('[AutoExecutionCoordinator] stop called', { specPath });

    const state = this.executionStates.get(specPath);
    if (!state) {
      logger.warn('[AutoExecutionCoordinator] Not executing', { specPath });
      return {
        ok: false,
        error: { type: 'NOT_EXECUTING', specId: '' },
      };
    }

    // タイムアウトをクリア
    if (state.timeoutId) {
      clearTimeout(state.timeoutId);
    }

    // 状態を更新
    this.updateState(specPath, {
      status: 'paused',
      timeoutId: undefined,
    });

    logger.info('[AutoExecutionCoordinator] Auto-execution stopped', { specPath });

    // spec-event-log: Log auto-execution:stop event (Requirement 1.5)
    this.logAutoExecutionEvent(specPath, state.specId, {
      type: 'auto-execution:stop',
      message: 'Auto-execution stopped by user',
      status: 'stopped',
      endPhase: state.currentPhase ?? undefined,
    });

    return { ok: true, value: undefined };
  }

  /**
   * 指定フェーズから再開
   * @param specPath specのパス
   * @param phase 再開するフェーズ
   * @returns 成功時は状態、失敗時はエラー
   */
  async retryFrom(
    specPath: string,
    phase: WorkflowPhase
  ): Promise<Result<AutoExecutionState, AutoExecutionError>> {
    logger.info('[AutoExecutionCoordinator] retryFrom called', { specPath, phase });

    const state = this.executionStates.get(specPath);
    if (!state) {
      logger.warn('[AutoExecutionCoordinator] State not found for retryFrom', { specPath });
      return {
        ok: false,
        error: { type: 'NOT_EXECUTING', specId: '' },
      };
    }

    // 状態を更新（エラーをクリア）
    const now = Date.now();
    const updatedState: AutoExecutionState = {
      ...state,
      status: 'running',
      currentPhase: phase,
      lastActivityTime: now,
      errors: [], // Task 6.4: Clear errors on retry
    };

    // 新しいタイムアウトを設定
    if (state.timeoutId) {
      clearTimeout(state.timeoutId);
    }
    updatedState.timeoutId = setTimeout(() => {
      this.handleTimeout(specPath);
    }, DEFAULT_AUTO_EXECUTION_TIMEOUT);

    this.executionStates.set(specPath, updatedState);

    // Task 6.4: Emit status-changed event for UI update
    this.emit('status-changed', specPath, updatedState);
    this.emit('state-changed', specPath, updatedState);

    logger.info('[AutoExecutionCoordinator] Retrying from phase', { specPath, phase });

    return { ok: true, value: updatedState };
  }

  // ============================================================
  // AgentRegistry Integration (Task 1.3)
  // Requirements: 1.3, 2.1, 2.3
  // ============================================================

  /**
   * 現在のフェーズを設定
   * @param specPath specのパス
   * @param phase 設定するフェーズ
   * @param agentId エージェントID（オプション）
   */
  setCurrentPhase(specPath: string, phase: WorkflowPhase, agentId?: string): void {
    const state = this.executionStates.get(specPath);
    if (!state) {
      logger.warn('[AutoExecutionCoordinator] setCurrentPhase: state not found', { specPath });
      return;
    }

    this.updateState(specPath, {
      currentPhase: phase,
      currentAgentId: agentId,
    });

    if (agentId) {
      this.emit('phase-started', specPath, phase, agentId);
    }

    logger.info('[AutoExecutionCoordinator] Current phase set', { specPath, phase, agentId });
  }

  /**
   * エージェントのステータス変更を処理
   * @param agentId エージェントID
   * @param status 新しいステータス
   * @param specPath specのパス
   */
  handleAgentStatusChange(agentId: string, status: string, specPath: string): void {
    const state = this.executionStates.get(specPath);
    if (!state) {
      logger.debug('[AutoExecutionCoordinator] handleAgentStatusChange: state not found', { specPath });
      return;
    }

    // エージェントが開始された場合、追跡対象に追加
    if (status === 'running') {
      this.updateState(specPath, {
        currentAgentId: agentId,
      });
    }

    logger.debug('[AutoExecutionCoordinator] Agent status changed', { agentId, status, specPath });
  }

  /**
   * エージェント完了を処理
   * @param agentId エージェントID
   * @param specPath specのパス
   * @param status 終了ステータス（'completed' | 'failed' | 'interrupted'）
   * @param updatedApprovals 更新済みのApprovals状態（オプション、渡された場合はファイル読み取りをスキップ）
   */
  async handleAgentCompleted(
    agentId: string,
    specPath: string,
    status: 'completed' | 'failed' | 'interrupted',
    updatedApprovals?: ApprovalsStatus
  ): Promise<void> {
    const state = this.executionStates.get(specPath);
    if (!state) {
      logger.warn('[AutoExecutionCoordinator] handleAgentCompleted: state not found', { specPath });
      return;
    }

    const currentPhase = state.currentPhase;

    logger.info('[AutoExecutionCoordinator] Agent completed', {
      agentId,
      specPath,
      status,
      currentPhase,
    });

    if (status === 'completed') {
      // impl-task-completion-guard: Check task completion before proceeding from impl phase
      // Requirements: 1.1, 2.1, 3.1
      if (currentPhase === 'impl') {
        const taskCompletion = this.checkTasksCompletionFromFile(specPath);
        if (!taskCompletion.isComplete) {
          // Delegate to task check handler for retry logic
          await this.handleAgentCompletedWithTasksCheck(agentId, specPath, status, taskCompletion);
          return;
        }
        // Tasks complete - continue to normal flow
        logger.info('[AutoExecutionCoordinator] Impl completed with all tasks complete', {
          specPath,
          taskCompletion,
        });
      }

      // フェーズ完了時の処理
      if (currentPhase) {
        const newExecutedPhases = [...state.executedPhases];
        if (!newExecutedPhases.includes(currentPhase)) {
          newExecutedPhases.push(currentPhase);
        }

        this.updateState(specPath, {
          executedPhases: newExecutedPhases,
          currentAgentId: undefined,
          currentPhase: null,
        });

        this.emit('phase-completed', specPath, currentPhase);

        // 次フェーズを自動実行
        const options = this.executionOptions.get(specPath);
        if (options) {
          // Use provided approvals if available, otherwise read from spec.json
          // This avoids timing issues when updateApproval() hasn't been flushed to disk
          let latestApprovals = updatedApprovals ?? options.approvals;
          if (!updatedApprovals) {
            // Fallback: read from spec.json if not provided
            try {
              const path = require('path');
              const fs = require('fs');
              const specJsonPath = path.join(specPath, 'spec.json');
              const content = fs.readFileSync(specJsonPath, 'utf-8');
              const specJson = JSON.parse(content);
              latestApprovals = specJson.approvals;
            } catch (err) {
              // Use options.approvals as fallback
            }
          }

          // document-review-phase Task 2.2: tasksフェーズ完了後はdocument-reviewへ遷移
          // execute-document-reviewイベントは廃止し、execute-next-phaseを使用
          // Requirements: 3.1, 3.2
          if (currentPhase === 'tasks') {
            // document-review-phase: Check if document-review is permitted
            if (options.permissions['document-review']) {
              logger.info('[AutoExecutionCoordinator] Tasks completed, triggering document-review phase', {
                specPath,
              });
              this.emit('execute-next-phase', specPath, 'document-review', {
                specId: state.specId,
                featureName: state.specId,
              });
            } else {
              // document-review is not permitted (NOGO), stop execution (do not skip)
              logger.info('[AutoExecutionCoordinator] Tasks completed, document-review is NOGO, stopping execution', { specPath });
              this.completeExecution(specPath);
            }
            return;
          }

          // document-review-phase Task 2.3: NOGOフェーズでは停止する（スキップしない）
          // execute-inspectionイベントは廃止し、execute-next-phaseを使用
          // Requirements: 5.1, 5.2
          const nextPhase = this.getImmediateNextPhase(currentPhase, options.permissions, latestApprovals);
          if (nextPhase) {
            // 次フェーズ実行イベントを発火（inspectionも含めて統一）
            this.emit('execute-next-phase', specPath, nextPhase, {
              specId: state.specId,
              featureName: state.specId,
            });
            logger.info('[AutoExecutionCoordinator] Triggering next phase', { specPath, nextPhase });
          } else {
            // 次フェーズがNOGOまたは全フェーズ完了
            this.completeExecution(specPath);
          }
        }
      } else {
        this.updateState(specPath, {
          currentAgentId: undefined,
        });
      }
    } else if (status === 'failed') {
      // エージェント失敗時の処理
      const errorMessage = `Agent failed at phase: ${currentPhase ?? 'unknown'}`;
      this.updateState(specPath, {
        status: 'error',
        errors: [...state.errors, errorMessage],
        currentAgentId: undefined,
      });

      const error: AutoExecutionError = {
        type: 'PHASE_EXECUTION_FAILED',
        phase: currentPhase ?? 'requirements',
        message: errorMessage,
      };
      this.emit('execution-error', specPath, error);
    } else if (status === 'interrupted') {
      // 中断時の処理
      this.updateState(specPath, {
        status: 'paused',
        currentAgentId: undefined,
      });
    }
  }

  // ============================================================
  // Phase Transition and Auto-Approval Logic (Task 1.4)
  // Requirements: 2.2, 2.4, 2.5
  // ============================================================

  /**
   * フェーズ順序を取得
   * @returns フェーズ順序の配列
   */
  getPhaseOrder(): readonly WorkflowPhase[] {
    return PHASE_ORDER;
  }

  /**
   * 保存されたオプションを取得
   * spec.json から最新の permissions を読み直す
   * (Bug fix: auto-execution-settings-not-realtime)
   * document-review-phase Task 2.2: documentReviewFlag を削除
   * @param specPath specのパス
   * @returns オプション or undefined
   */
  getOptions(specPath: string): AutoExecutionOptions | undefined {
    const cached = this.executionOptions.get(specPath);
    if (!cached) {
      return undefined;
    }

    // spec.json から最新の設定を読み直す
    try {
      const specJsonPath = require('path').join(specPath, 'spec.json');
      const content = require('fs').readFileSync(specJsonPath, 'utf-8');
      const specJson = JSON.parse(content);

      if (specJson.autoExecution) {
        return {
          permissions: specJson.autoExecution.permissions ?? cached.permissions,
          // documentReviewFlag removed - use permissions['document-review'] instead
          timeoutMs: cached.timeoutMs,
          commandPrefix: cached.commandPrefix,
          approvals: specJson.approvals ?? cached.approvals,
        };
      }
    } catch (err) {
      logger.warn('[AutoExecutionCoordinator] Failed to read spec.json, using cached options', { specPath, error: err });
    }

    // フォールバック: キャッシュを返す
    return cached;
  }

  /**
   * Approvals状態から最後に完了したフェーズを取得
   * 既に approved または generated のフェーズは完了済みとみなす
   * @param approvals spec.jsonのapprovals状態
   * @returns 最後に完了したフェーズ or null（なし）
   */
  getLastCompletedPhase(approvals: ApprovalsStatus): WorkflowPhase | null {
    // requirements, design, tasks の順でチェック（逆順）
    // approved または generated のフェーズは完了とみなす
    if (approvals.tasks.approved || approvals.tasks.generated) return 'tasks';
    if (approvals.design.approved || approvals.design.generated) return 'design';
    if (approvals.requirements.approved || approvals.requirements.generated) return 'requirements';
    return null;
  }

  /**
   * 次の許可されたフェーズを取得
   * @param currentPhase 現在のフェーズ（nullの場合は最初のフェーズ）
   * @param permissions 許可設定
   * @param approvals 承認状態（オプション、指定時は前フェーズの承認チェックを行う）
   * @returns 次のフェーズ or null（なし）
   */
  getNextPermittedPhase(
    currentPhase: WorkflowPhase | null,
    permissions: AutoExecutionPermissions,
    approvals?: ApprovalsStatus
  ): WorkflowPhase | null {
    const startIndex = currentPhase === null ? 0 : PHASE_ORDER.indexOf(currentPhase) + 1;

    for (let i = startIndex; i < PHASE_ORDER.length; i++) {
      const phase = PHASE_ORDER[i];
      if (permissions[phase]) {
        // Check if previous phase is approved (when approvals is provided)
        if (approvals) {
          const previousApproved = this.isPreviousPhaseApproved(phase, approvals);
          if (!previousApproved) {
            logger.info('[AutoExecutionCoordinator] Skipping phase - previous phase not approved', { phase });
            continue; // Skip this phase, try next
          }
        }
        return phase;
      }
    }

    return null;
  }

  /**
   * 前のフェーズが承認済みかをチェック
   * @param phase チェックするフェーズ
   * @param approvals 承認状態
   * @returns 前フェーズが承認済み（または不要）ならtrue
   */
  private isPreviousPhaseApproved(phase: WorkflowPhase, approvals: ApprovalsStatus): boolean {
    switch (phase) {
      case 'requirements':
        return true; // requirementsには前フェーズがない
      case 'design':
        return approvals.requirements.approved;
      case 'tasks':
        return approvals.design.approved;
      case 'impl':
        return approvals.tasks.approved;
      default:
        return true;
    }
  }

  /**
   * 未承認だが生成済みのフェーズを取得（順序通り）
   * @param approvals 承認状態
   * @returns 未承認かつ生成済みのフェーズのリスト
   */
  getUnapprovedGeneratedPhases(approvals: ApprovalsStatus): Array<'requirements' | 'design' | 'tasks'> {
    const phases = ['requirements', 'design', 'tasks'] as const;
    const result: Array<'requirements' | 'design' | 'tasks'> = [];
    for (const phase of phases) {
      const approval = approvals[phase];
      if (approval.generated && !approval.approved) {
        result.push(phase);
      }
    }
    return result;
  }

  /**
   * 直接次のフェーズを取得する（NOGOフェーズをスキップしない）
   *
   * getNextPermittedPhaseとの違い:
   * - getNextPermittedPhase: NOGOフェーズをスキップして次のGOフェーズを返す
   * - getImmediateNextPhase: 直接次のフェーズのみをチェックし、NOGOなら停止（nullを返す）
   *
   * 使い分け:
   * - ユーザーが「次のフェーズがNOGOなら停止したい」場合はこちらを使用
   *
   * @param currentPhase 現在のフェーズ
   * @param permissions 許可設定
   * @param approvals 承認状態（オプション）
   * @returns 次のフェーズ or null（次のフェーズがNOGOまたは存在しない場合）
   */
  getImmediateNextPhase(
    currentPhase: WorkflowPhase | null,
    permissions: AutoExecutionPermissions,
    approvals?: ApprovalsStatus
  ): WorkflowPhase | null {
    const startIndex = currentPhase === null ? 0 : PHASE_ORDER.indexOf(currentPhase) + 1;

    // 直接次のフェーズがない場合
    if (startIndex >= PHASE_ORDER.length) {
      return null;
    }

    const nextPhase = PHASE_ORDER[startIndex];

    // 直接次のフェーズが許可されていない場合は停止（スキップしない）
    if (!permissions[nextPhase]) {
      logger.info('[AutoExecutionCoordinator] Stopping at NOGO phase', {
        currentPhase,
        nextPhase,
        reason: 'next phase is not permitted (NOGO)',
      });
      return null;
    }

    // 承認チェック（必要な場合）
    if (approvals) {
      const previousApproved = this.isPreviousPhaseApproved(nextPhase, approvals);
      if (!previousApproved) {
        logger.info('[AutoExecutionCoordinator] Stopping - previous phase not approved', {
          currentPhase,
          nextPhase,
        });
        return null;
      }
    }

    return nextPhase;
  }

  /**
   * フェーズが完了しているかを確認
   * @param specPath specのパス
   * @param phase 確認するフェーズ
   * @returns 完了していればtrue
   */
  isPhaseCompleted(specPath: string, phase: WorkflowPhase): boolean {
    const state = this.executionStates.get(specPath);
    return state?.executedPhases.includes(phase) ?? false;
  }

  /**
   * フェーズを完了としてマーク
   * @param specPath specのパス
   * @param phase 完了したフェーズ
   */
  markPhaseComplete(specPath: string, phase: WorkflowPhase): void {
    const state = this.executionStates.get(specPath);
    if (!state) {
      logger.warn('[AutoExecutionCoordinator] markPhaseComplete: state not found', { specPath });
      return;
    }

    const newExecutedPhases = [...state.executedPhases];
    if (!newExecutedPhases.includes(phase)) {
      newExecutedPhases.push(phase);
    }

    // 次の許可されたフェーズがあるか確認
    const options = this.executionOptions.get(specPath);
    let latestApprovals = options?.approvals;
    try {
      const specJsonPath = require('path').join(specPath, 'spec.json');
      const content = require('fs').readFileSync(specJsonPath, 'utf-8');
      const specJson = JSON.parse(content);
      latestApprovals = specJson.approvals;
    } catch {
      // ignore
    }
    // NOGOフェーズでは停止する（スキップしない）
    const nextPhase = options
      ? this.getImmediateNextPhase(phase, options.permissions, latestApprovals)
      : null;

    if (nextPhase === null) {
      // 次フェーズがNOGOまたは全フェーズ完了
      if (state.timeoutId) {
        clearTimeout(state.timeoutId);
      }

      const updatedState: AutoExecutionState = {
        ...state,
        executedPhases: newExecutedPhases,
        status: 'completed',
        currentPhase: null,
        timeoutId: undefined,
        lastActivityTime: Date.now(),
      };

      this.executionStates.set(specPath, updatedState);
      this.emit('state-changed', specPath, updatedState);

      // 実行完了サマリーを発火
      const summary: ExecutionSummary = {
        specId: state.specId,
        executedPhases: newExecutedPhases,
        totalDuration: Date.now() - state.startTime,
        errors: state.errors,
        status: 'completed',
      };
      this.emit('execution-completed', specPath, summary);

      logger.info('[AutoExecutionCoordinator] All phases completed', { specPath, executedPhases: newExecutedPhases });
    } else {
      // まだ続行するフェーズがある
      this.updateState(specPath, {
        executedPhases: newExecutedPhases,
        currentPhase: null,
      });

      this.emit('phase-completed', specPath, phase);
    }
  }

  // ============================================================
  // Task 6.1: Agent Crash Detection
  // Requirements: 8.1
  // ============================================================

  /**
   * エージェントクラッシュを処理
   * @param specPath specのパス
   * @param agentId エージェントID
   * @param exitCode プロセス終了コード
   */
  handleAgentCrash(specPath: string, agentId: string, exitCode: number): void {
    const state = this.executionStates.get(specPath);
    if (!state) {
      logger.warn('[AutoExecutionCoordinator] handleAgentCrash: state not found', { specPath });
      return;
    }

    const currentPhase = state.currentPhase;
    const errorMessage = `Agent crashed with exit code ${exitCode} at phase: ${currentPhase ?? 'unknown'}`;

    logger.error('[AutoExecutionCoordinator] Agent crash detected', {
      specPath,
      agentId,
      exitCode,
      currentPhase,
    });

    // エラー状態に更新
    this.updateState(specPath, {
      status: 'error',
      errors: [...state.errors, errorMessage],
      currentAgentId: undefined,
    });

    // クラッシュエラーイベントを発火
    const error: AutoExecutionError = {
      type: 'AGENT_CRASH',
      agentId,
      exitCode,
      phase: currentPhase,
    };
    this.emit('execution-error', specPath, error);

    // spec-event-log: Log auto-execution:fail event (Requirement 1.5)
    this.logAutoExecutionEvent(specPath, state.specId, {
      type: 'auto-execution:fail',
      message: `Auto-execution failed: Agent crashed (exit code: ${exitCode})`,
      status: 'failed',
      endPhase: currentPhase ?? undefined,
      errorMessage,
    });
  }

  // ============================================================
  // Task 9.2: Inspection Completion Handling (git-worktree-support)
  // Requirements: 6.5
  // ============================================================

  /**
   * Inspection完了を処理
   * @param specPath specのパス
   * @param status 終了ステータス（'passed' = GO, 'failed' = NOGO）
   */
  async handleInspectionCompleted(
    specPath: string,
    status: 'passed' | 'failed'
  ): Promise<void> {
    const state = this.executionStates.get(specPath);
    if (!state) {
      logger.warn('[AutoExecutionCoordinator] handleInspectionCompleted: state not found', { specPath });
      return;
    }

    logger.info('[AutoExecutionCoordinator] Inspection completed', {
      specPath,
      status,
    });

    // Update state
    const newExecutedPhases = [...state.executedPhases];
    if (!newExecutedPhases.includes('inspection')) {
      newExecutedPhases.push('inspection');
    }

    this.updateState(specPath, {
      executedPhases: newExecutedPhases,
      currentAgentId: undefined,
      currentPhase: null,
    });

    this.emit('phase-completed', specPath, 'inspection');

    if (status === 'passed') {
      // git-worktree-support Task 9.2: Inspection成功後、spec-mergeを自動実行
      // Bug fix: permissions.deploy をチェックしてからspec-mergeを実行
      const options = this.executionOptions.get(specPath);
      if (options?.permissions.deploy) {
        logger.info('[AutoExecutionCoordinator] Inspection passed (GO), triggering spec-merge', {
          specPath,
        });
        this.emit('execute-spec-merge', specPath, {
          specId: state.specId,
        });
      } else {
        logger.info('[AutoExecutionCoordinator] Inspection passed but deploy not permitted, completing', {
          specPath,
        });
        this.completeExecution(specPath);
      }
    } else {
      // Inspection失敗: エラー状態に遷移（またはリトライ待ち）
      logger.info('[AutoExecutionCoordinator] Inspection failed (NOGO), pausing for retry', {
        specPath,
      });
      this.updateState(specPath, {
        status: 'paused',
      });
    }
  }

  // ============================================================
  // Task 6.2: Timeout Handling
  // Requirements: 8.2
  // ============================================================

  /**
   * タイムアウトをチェック
   * @param specPath specのパス
   * @returns タイムアウトしていればtrue
   */
  checkTimeout(specPath: string): boolean {
    const state = this.executionStates.get(specPath);
    if (!state) {
      return false;
    }

    const options = this.executionOptions.get(specPath);
    if (!options?.timeoutMs) {
      return false;
    }

    const elapsed = Date.now() - state.startTime;
    return elapsed > options.timeoutMs;
  }

  /**
   * タイムアウト発生時の処理
   * Task 7.2: AgentLifecycleManager連携 (agent-lifecycle-management feature)
   * Requirement: 1.5, 3.1, 3.5, 9.2
   * @param specPath specのパス
   */
  handleTimeout(specPath: string): void {
    const state = this.executionStates.get(specPath);
    if (!state) {
      return;
    }

    logger.warn('[AutoExecutionCoordinator] Timeout occurred', {
      specPath,
      specId: state.specId,
      currentPhase: state.currentPhase,
      currentAgentId: state.currentAgentId,
    });

    // Task 7.2: Stop the running agent via AgentLifecycleManager
    // Requirement: 1.5, 3.1 - タイムアウト時にstopAgent(agentId, 'timeout')を呼び出し
    if (state.currentAgentId) {
      const lifecycleManager = getAgentLifecycleManager();
      if (lifecycleManager) {
        lifecycleManager.stopAgent(state.currentAgentId, 'timeout')
          .then((result) => {
            if (result.ok) {
              logger.info('[AutoExecutionCoordinator] Agent stopped due to timeout', {
                agentId: state.currentAgentId,
                specPath,
              });
            } else {
              logger.warn('[AutoExecutionCoordinator] Failed to stop agent on timeout', {
                agentId: state.currentAgentId,
                error: result.error,
              });
            }
          })
          .catch((error) => {
            logger.error('[AutoExecutionCoordinator] Error stopping agent on timeout', {
              agentId: state.currentAgentId,
              error,
            });
          });
      } else {
        logger.warn('[AutoExecutionCoordinator] AgentLifecycleManager not initialized, cannot stop agent');
      }
    }

    // エラー状態に更新
    this.updateState(specPath, {
      status: 'error',
      errors: [...state.errors, `Timeout at phase: ${state.currentPhase ?? 'unknown'}`],
      timeoutId: undefined,
    });

    // タイムアウトエラーイベントを発火
    const error: AutoExecutionError = {
      type: 'TIMEOUT',
      specId: state.specId,
      phase: state.currentPhase,
    };
    this.emit('execution-error', specPath, error);

    // spec-event-log: Log auto-execution:fail event with timeout message (Requirement 3.5)
    this.logAutoExecutionEvent(specPath, state.specId, {
      type: 'auto-execution:fail',
      message: `Auto-execution timed out at phase ${state.currentPhase ?? 'unknown'}`,
      status: 'failed',
      endPhase: state.currentPhase ?? undefined,
      errorMessage: `Timeout at phase: ${state.currentPhase ?? 'unknown'}`,
    });
  }

  // ============================================================
  // Task 6.3: spec.json Read Error Handling
  // Requirements: 8.3
  // ============================================================

  /**
   * spec.json読み取りエラーを処理
   * @param specPath specのパス
   * @param error エラーオブジェクト
   */
  handleSpecReadError(specPath: string, error: Error): void {
    const state = this.executionStates.get(specPath);
    if (!state) {
      logger.warn('[AutoExecutionCoordinator] handleSpecReadError: state not found', { specPath });
      return;
    }

    const errorMessage = `spec.json read error: ${error.message}`;

    logger.error('[AutoExecutionCoordinator] Spec read error', {
      specPath,
      error: error.message,
    });

    // 一時停止状態に更新
    this.updateState(specPath, {
      status: 'paused',
      errors: [...state.errors, errorMessage],
    });

    // 状態変更イベントを発火
    const updatedState = this.executionStates.get(specPath);
    if (updatedState) {
      this.emit('status-changed', specPath, updatedState);
    }
  }

  // ============================================================
  // Task 6.4: UI Recovery Feature
  // Requirements: 8.4, 8.5
  // ============================================================

  /**
   * エラー詳細情報を取得
   * @param specPath specのパス
   * @returns エラー詳細 or null
   */
  getErrorDetails(specPath: string): { lastFailedPhase: WorkflowPhase | null; errors: string[] } | null {
    const state = this.executionStates.get(specPath);
    if (!state || state.errors.length === 0) {
      return null;
    }

    return {
      lastFailedPhase: state.currentPhase,
      errors: state.errors,
    };
  }

  /**
   * フェーズからリトライ可能かを確認
   * @param specPath specのパス
   * @param phase 確認するフェーズ
   * @returns リトライ可能ならtrue
   */
  canRetryFromPhase(specPath: string, phase: WorkflowPhase): boolean {
    const state = this.executionStates.get(specPath);
    if (!state) {
      return false;
    }

    // エラーまたは一時停止状態の場合のみリトライ可能
    if (state.status !== 'error' && state.status !== 'paused') {
      return false;
    }

    // 指定されたフェーズが許可されているか確認
    const options = this.executionOptions.get(specPath);
    if (!options) {
      return false;
    }

    return options.permissions[phase] === true;
  }

  // ============================================================
  // Task 7.2: Initial State for New Clients
  // Requirements: 7.3
  // ============================================================

  /**
   * 指定specの状態スナップショットを取得（新規クライアント用）
   * @param specPath specのパス
   * @returns 状態スナップショット or null
   */
  getStatusSnapshot(specPath: string): AutoExecutionState | null {
    return this.executionStates.get(specPath) ?? null;
  }

  /**
   * 全ての状態スナップショットを取得（WebSocketクライアント用）
   * @returns specPath -> AutoExecutionState のMap
   */
  getAllStatusSnapshots(): Map<string, AutoExecutionState> {
    return new Map(this.executionStates);
  }

  // ============================================================
  // Task 7.3: File Watcher Integration
  // Requirements: 7.4
  // ============================================================

  /**
   * ファイル変更通知を処理
   * @param specPath specのパス
   * @param fileName 変更されたファイル名
   * @param changeType 変更タイプ
   */
  handleSpecFileChange(
    specPath: string,
    fileName: string,
    changeType: 'created' | 'modified' | 'deleted'
  ): void {
    const state = this.executionStates.get(specPath);
    if (!state) {
      logger.debug('[AutoExecutionCoordinator] handleSpecFileChange: no active state', { specPath });
      return;
    }

    logger.debug('[AutoExecutionCoordinator] Spec file changed', {
      specPath,
      fileName,
      changeType,
    });

    // ファイル変更イベントを発火
    this.emit('file-changed', specPath, fileName, changeType);

    // 状態に応じた処理（必要に応じて拡張）
    // 現時点では継続実行を許可
  }

  // ============================================================
  // Task 7.4: Multiple Client Consistency
  // Requirements: 7.5
  // ============================================================

  /**
   * 状態の不整合を検出
   * @param specPath specのパス
   * @returns 不整合があればtrue
   */
  detectInconsistency(specPath: string): boolean {
    const state = this.executionStates.get(specPath);
    if (!state) {
      return false;
    }

    // 一貫性チェック
    // 1. running状態なのにcurrentPhaseがnull（あり得る状態ではある）
    // 2. completed状態なのにerrorsがある
    // 3. error状態なのにerrorsが空

    if (state.status === 'error' && state.errors.length === 0) {
      logger.warn('[AutoExecutionCoordinator] Inconsistency detected: error status with no errors', { specPath });
      return true;
    }

    return false;
  }

  // ============================================================
  // Document Review Auto Loop
  // ============================================================

  /**
   * Document Reviewループを継続
   * @param specPath specのパス
   * @param roundNumber 現在のラウンド番号
   */
  continueDocumentReviewLoop(specPath: string, roundNumber: number): void {
    const state = this.executionStates.get(specPath);
    if (!state) {
      logger.warn('[AutoExecutionCoordinator] continueDocumentReviewLoop: state not found', { specPath });
      return;
    }

    logger.info('[AutoExecutionCoordinator] Document review loop round starting', {
      specPath,
      roundNumber,
      maxRounds: MAX_DOCUMENT_REVIEW_ROUNDS,
    });

    // 最大ラウンド数を超えた場合は一時停止
    if (roundNumber > MAX_DOCUMENT_REVIEW_ROUNDS) {
      logger.warn('[AutoExecutionCoordinator] Max document review rounds exceeded', {
        specPath,
        roundNumber,
        maxRounds: MAX_DOCUMENT_REVIEW_ROUNDS,
      });
      this.handleDocumentReviewCompleted(specPath, false);
      return;
    }

    // ラウンド番号を更新
    this.updateState(specPath, {
      currentDocumentReviewRound: roundNumber,
    });

    // Document Reviewを実行するイベントを発火
    // document-review-phase: execute-next-phase に統一
    this.emit('execute-next-phase', specPath, 'document-review', {
      specId: state.specId,
      featureName: state.specId,
    });
  }

  /**
   * 現在のDocument Reviewラウンド番号を取得
   * @param specPath specのパス
   * @returns ラウンド番号 or undefined
   */
  getCurrentDocumentReviewRound(specPath: string): number | undefined {
    const state = this.executionStates.get(specPath);
    return state?.currentDocumentReviewRound;
  }

  // ============================================================
  // Document Review Completion Handler
  // ============================================================

  /**
   * Document Review完了後に次フェーズへ進む
   * @param specPath specのパス
   * @param approved レビューが承認されたか（falseの場合はpaused状態で待機）
   */
  handleDocumentReviewCompleted(specPath: string, approved: boolean): void {
    const state = this.executionStates.get(specPath);
    if (!state) {
      logger.warn('[AutoExecutionCoordinator] handleDocumentReviewCompleted: state not found', { specPath });
      return;
    }

    const options = this.executionOptions.get(specPath);
    if (!options) {
      logger.warn('[AutoExecutionCoordinator] handleDocumentReviewCompleted: options not found', { specPath });
      return;
    }

    // Read latest approvals from spec.json
    let latestApprovals = options.approvals;
    try {
      const specJsonPath = require('path').join(specPath, 'spec.json');
      const content = require('fs').readFileSync(specJsonPath, 'utf-8');
      const specJson = JSON.parse(content);
      latestApprovals = specJson.approvals;
    } catch {
      // ignore
    }

    /**
     * document-review-phase: Check next phase after 'document-review'
     * The phase order is now: tasks -> document-review -> impl
     * So after document-review completes, the next phase is 'impl'
     */
    const nextPhase = this.getImmediateNextPhase('document-review', options.permissions, latestApprovals);

    if (approved) {
      // Document Review承認済み、次フェーズへ進む
      if (nextPhase) {
        logger.info('[AutoExecutionCoordinator] Document review approved, proceeding to next phase', {
          specPath,
          nextPhase,
        });
        this.emit('execute-next-phase', specPath, nextPhase, {
          specId: state.specId,
          featureName: state.specId,
        });
      } else {
        // implフェーズがNOGO（許可されていない）の場合は完了
        logger.info('[AutoExecutionCoordinator] Document review approved, but next phase is NOGO, completing', {
          specPath,
        });
        this.completeExecution(specPath);
      }
    } else {
      // Document Reviewが承認待ちだが、次フェーズがNOGOの場合は完了とする
      // (impl NOGOの場合、document-review後に進むフェーズがないので完了)
      if (!nextPhase) {
        logger.info('[AutoExecutionCoordinator] Document review not approved, but next phase is NOGO, completing', {
          specPath,
        });
        this.completeExecution(specPath);
      } else {
        // 次フェーズが許可されているが、document-reviewが未承認なのでpaused状態で待機
        logger.info('[AutoExecutionCoordinator] Document review pending approval, pausing execution', { specPath });
        this.updateState(specPath, {
          status: 'paused',
        });
      }
    }
  }

  // ============================================================
  // Execution Completion
  // ============================================================

  /**
   * 自動実行を完了状態にする
   * @param specPath specのパス
   */
  public completeExecution(specPath: string): void {
    const state = this.executionStates.get(specPath);
    if (!state) {
      logger.warn('[AutoExecutionCoordinator] completeExecution: state not found', { specPath });
      return;
    }

    // タイムアウトをクリア
    if (state.timeoutId) {
      clearTimeout(state.timeoutId);
    }

    const updatedState: AutoExecutionState = {
      ...state,
      status: 'completed',
      currentPhase: null,
      timeoutId: undefined,
      lastActivityTime: Date.now(),
    };

    this.executionStates.set(specPath, updatedState);
    this.emit('state-changed', specPath, updatedState);

    // 実行完了サマリーを発火
    const summary: ExecutionSummary = {
      specId: state.specId,
      executedPhases: state.executedPhases,
      totalDuration: Date.now() - state.startTime,
      errors: state.errors,
      status: 'completed',
    };
    this.emit('execution-completed', specPath, summary);

    logger.info('[AutoExecutionCoordinator] Execution completed', {
      specPath,
      executedPhases: state.executedPhases,
    });

    // spec-event-log: Log auto-execution:complete event (Requirement 1.5)
    const lastPhase = state.executedPhases.length > 0
      ? state.executedPhases[state.executedPhases.length - 1]
      : undefined;
    this.logAutoExecutionEvent(specPath, state.specId, {
      type: 'auto-execution:complete',
      message: `Auto-execution completed (${state.executedPhases.length} phases executed)`,
      status: 'completed',
      endPhase: lastPhase,
    });
  }

  // ============================================================
  // impl-task-completion-guard: Task Completion Parsing
  // Requirements: 1.1, 1.2, 1.3
  // ============================================================

  /**
   * Task 2.1: Parse tasks.md content to determine completion status
   * Uses same regex pattern as specsWatcherService for SSOT
   *
   * @param content tasks.md content
   * @returns TaskCompletionResult with total, completed, and isComplete
   *
   * Requirements: 1.1 - impl完了時にtasks.md完了度を判定
   */
  parseTasksCompletion(content: string): { total: number; completed: number; isComplete: boolean } {
    // Same pattern as specsWatcherService.checkTaskCompletion for consistency (SSOT)
    // Pattern: - [x] or - [X] for completed, - [ ] for incomplete
    const completedMatches = content.match(/^- \[x\]/gim) || [];
    const pendingMatches = content.match(/^- \[ \]/gm) || [];

    const total = completedMatches.length + pendingMatches.length;
    const completed = completedMatches.length;

    // total === 0 means no tasks (isComplete = true as per design)
    const isComplete = total === 0 || completed === total;

    return { total, completed, isComplete };
  }

  /**
   * Task 3.1 & 3.2: Handle agent completion with explicit task completion status
   * Used for testing and to separate task check logic from file I/O
   *
   * @param agentId Agent ID
   * @param specPath Spec path
   * @param status Agent completion status
   * @param taskCompletion Task completion result (for testing or pre-parsed)
   *
   * Requirements: 2.1, 2.2, 3.1, 3.2, 3.3
   */
  async handleAgentCompletedWithTasksCheck(
    agentId: string,
    specPath: string,
    status: 'completed' | 'failed' | 'interrupted',
    taskCompletion: { total: number; completed: number; isComplete: boolean }
  ): Promise<void> {
    const state = this.executionStates.get(specPath);
    if (!state) {
      logger.warn('[AutoExecutionCoordinator] handleAgentCompletedWithTasksCheck: state not found', { specPath });
      return;
    }

    const currentPhase = state.currentPhase;

    logger.info('[AutoExecutionCoordinator] Agent completed with task check', {
      agentId,
      specPath,
      status,
      currentPhase,
      taskCompletion,
    });

    if (status === 'completed' && currentPhase === 'impl') {
      // impl-task-completion-guard: Check if all tasks are complete
      if (!taskCompletion.isComplete) {
        // Tasks are incomplete - retry or error
        const currentRetryCount = (state.implRetryCount ?? 0) + 1;

        this.updateState(specPath, {
          implRetryCount: currentRetryCount,
          currentAgentId: undefined,
        });

        if (currentRetryCount >= MAX_IMPL_RETRY_COUNT) {
          // Max retries exceeded - transition to error state
          const errorMessage = `Impl phase failed: tasks incomplete after ${currentRetryCount} retries (${taskCompletion.completed}/${taskCompletion.total} tasks completed)`;
          this.updateState(specPath, {
            status: 'error',
            errors: [...state.errors, errorMessage],
            currentPhase: null,
          });

          const error: AutoExecutionError = {
            type: 'PHASE_EXECUTION_FAILED',
            phase: 'impl',
            message: errorMessage,
          };
          this.emit('execution-error', specPath, error);

          // Log event for task completion guard failure
          this.logAutoExecutionEvent(specPath, state.specId, {
            type: 'auto-execution:fail',
            message: errorMessage,
            status: 'failed',
          });

          logger.error('[AutoExecutionCoordinator] Impl max retries exceeded', {
            specPath,
            retryCount: currentRetryCount,
            taskCompletion,
          });
          return;
        }

        // Retry impl - emit execute-next-phase with impl
        logger.info('[AutoExecutionCoordinator] Retrying impl phase (tasks incomplete)', {
          specPath,
          retryCount: currentRetryCount,
          taskCompletion,
        });

        // Log retry event (using agent:start since impl retry triggers new agent)
        this.logAutoExecutionEvent(specPath, state.specId, {
          type: 'agent:start',
          message: `Retrying impl phase (${currentRetryCount}/${MAX_IMPL_RETRY_COUNT}, ${taskCompletion.completed}/${taskCompletion.total} tasks)`,
          agentId: `impl-retry-${currentRetryCount}`,
          phase: 'impl',
        });

        this.emit('execute-next-phase', specPath, 'impl', {
          specId: state.specId,
          featureName: state.specId,
        });
        return;
      }
      // else: Tasks are complete - fall through to normal completion handling
    }

    // Delegate to normal handleAgentCompleted for non-impl phases or complete tasks
    await this.handleAgentCompleted(agentId, specPath, status);
  }

  /**
   * Task 2.1 & 3.1: Check task completion by reading tasks.md from file system
   * This is the production entry point that reads from disk
   *
   * @param specPath Spec path to read tasks.md from
   * @returns TaskCompletionResult
   *
   * Requirements: 1.1 - impl完了時にtasks.md完了度を判定
   */
  checkTasksCompletionFromFile(specPath: string): { total: number; completed: number; isComplete: boolean } {
    try {
      const path = require('path');
      const fs = require('fs');
      const tasksPath = path.join(specPath, 'tasks.md');
      const content = fs.readFileSync(tasksPath, 'utf-8');
      return this.parseTasksCompletion(content);
    } catch (error) {
      // Fallback: treat as complete if file can't be read (per design: allow next phase)
      logger.warn('[AutoExecutionCoordinator] Failed to read tasks.md, assuming complete', {
        specPath,
        error: String(error),
      });
      return { total: 0, completed: 0, isComplete: true };
    }
  }

  /**
   * Task 4.1: Reset impl retry count and clear error state
   * Called when user manually resets from error state
   *
   * @param specPath Spec path
   *
   * Requirements: 3.4 - リセット操作でエラー解除
   */
  resetImplRetryCount(specPath: string): void {
    const state = this.executionStates.get(specPath);
    if (!state) {
      logger.warn('[AutoExecutionCoordinator] resetImplRetryCount: state not found', { specPath });
      return;
    }

    const updates: Partial<AutoExecutionState> = {
      implRetryCount: 0,
    };

    // If in error state (likely from max retries exceeded), reset to idle
    if (state.status === 'error') {
      updates.status = 'idle';
      // Clear errors related to impl retry
      updates.errors = state.errors.filter(e => !e.includes('Impl phase failed'));
    }

    this.updateState(specPath, updates);

    logger.info('[AutoExecutionCoordinator] Reset impl retry count', {
      specPath,
      previousStatus: state.status,
      newStatus: updates.status ?? state.status,
    });

    // Log event for reset (using auto-execution:stop since reset halts execution)
    this.logAutoExecutionEvent(specPath, state.specId, {
      type: 'auto-execution:stop',
      message: 'Impl retry count reset by user',
      status: 'stopped',
    });
  }

  // ============================================================
  // Cleanup
  // ============================================================

  /**
   * リソース解放
   */
  dispose(): void {
    // 全てのタイムアウトをクリア
    for (const state of this.executionStates.values()) {
      if (state.timeoutId) {
        clearTimeout(state.timeoutId);
      }
    }
    this.executionStates.clear();
    this.executionOptions.clear();
    this.removeAllListeners();
    logger.info('[AutoExecutionCoordinator] Disposed');
  }

  // ============================================================
  // Test Support: Reset for E2E Test Isolation
  // ============================================================

  /**
   * Reset all execution states for E2E test isolation
   * This clears all internal state without disposing the coordinator itself
   *
   * WARNING: This method is intended for E2E tests only.
   * Do not use in production code.
   */
  resetAll(): void {
    logger.info('[AutoExecutionCoordinator] resetAll called (E2E test support)');

    // Clear all timeouts
    for (const state of this.executionStates.values()) {
      if (state.timeoutId) {
        clearTimeout(state.timeoutId);
      }
    }

    // Clear all state maps
    this.executionStates.clear();
    this.executionOptions.clear();

    logger.info('[AutoExecutionCoordinator] All states reset');
  }
}
