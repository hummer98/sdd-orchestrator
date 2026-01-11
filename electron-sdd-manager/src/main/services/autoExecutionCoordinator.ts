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

// ============================================================
// Constants
// ============================================================

/** デフォルトタイムアウト: 30分 */
export const DEFAULT_AUTO_EXECUTION_TIMEOUT = 1_800_000;

/** 最大並行実行数 */
export const MAX_CONCURRENT_EXECUTIONS = 5;

/** フェーズ順序（requirements -> design -> tasks -> impl） */
export const PHASE_ORDER: readonly WorkflowPhase[] = ['requirements', 'design', 'tasks', 'impl'];

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
 */
export interface AutoExecutionState {
  /** specのパス */
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
}

/**
 * 自動実行許可設定
 * フェーズごとの自動実行許可
 * Requirements: 7.1
 */
export interface AutoExecutionPermissions {
  readonly requirements: boolean;
  readonly design: boolean;
  readonly tasks: boolean;
  readonly impl: boolean;
  readonly inspection?: boolean;
  readonly deploy?: boolean;
}

/**
 * バリデーションオプション
 * Requirements: 7.1
 */
export interface ValidationOptions {
  readonly gap: boolean;
  readonly design: boolean;
  readonly impl: boolean;
}

/**
 * ドキュメントレビューフラグ
 * Requirements: 7.1
 */
export type DocumentReviewFlag = 'run' | 'pause' | 'skip';

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
 * Requirements: 7.1
 */
export interface AutoExecutionOptions {
  /** フェーズごとの許可設定 */
  readonly permissions: AutoExecutionPermissions;
  /** ドキュメントレビューフラグ */
  readonly documentReviewFlag: DocumentReviewFlag;
  /** バリデーションオプション */
  readonly validationOptions: ValidationOptions;
  /** タイムアウト（ms） */
  readonly timeoutMs?: number;
  /** コマンドプレフィックス */
  readonly commandPrefix?: 'kiro' | 'spec-manager';
  /** 現在のApproval状態（spec.jsonから取得、開始時のフェーズ判定に使用） */
  readonly approvals?: ApprovalsStatus;
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
 */
export interface AutoExecutionEvents {
  'state-changed': (specPath: string, state: AutoExecutionState) => void;
  'phase-started': (specPath: string, phase: WorkflowPhase, agentId: string) => void;
  'phase-completed': (specPath: string, phase: WorkflowPhase) => void;
  'phase-error': (specPath: string, phase: WorkflowPhase, error: string) => void;
  'execution-completed': (specPath: string, summary: ExecutionSummary) => void;
  'execution-error': (specPath: string, error: AutoExecutionError) => void;
  'execute-document-review': (specPath: string, context: { specId: string }) => void;
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
   * @param specPath specのパス
   * @param specId specのID
   * @returns 作成されたAutoExecutionState
   */
  protected createState(specPath: string, specId: string): AutoExecutionState {
    const now = Date.now();
    const state: AutoExecutionState = {
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
   * 実行状態を更新
   * @param specPath specのパス
   * @param updates 更新内容
   */
  protected updateState(
    specPath: string,
    updates: Partial<Omit<AutoExecutionState, 'specPath' | 'specId'>>
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
   * @param specPath specのパス
   * @param specId specのID
   * @param options 自動実行オプション
   * @returns 成功時は状態、失敗時はエラー
   */
  async start(
    specPath: string,
    specId: string,
    options: AutoExecutionOptions
  ): Promise<Result<AutoExecutionState, AutoExecutionError>> {
    logger.info('[AutoExecutionCoordinator] start called', { specPath, specId });

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
    const state: AutoExecutionState = {
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
      lastCompletedPhase = this.getLastCompletedPhase(approvals);
      logger.info('[AutoExecutionCoordinator] Last completed phase from approvals', {
        specPath,
        lastCompletedPhase,
        approvals,
      });
    }

    // lastCompletedPhase の次から開始（既に完了しているフェーズはスキップ）
    // 前フェーズが未承認の場合はそのフェーズをスキップする
    const firstPhase = this.getNextPermittedPhase(lastCompletedPhase, options.permissions, options.approvals);
    if (firstPhase) {
      this.emit('execute-next-phase', specPath, firstPhase, {
        specId,
        featureName: specId,
      });
      logger.info('[AutoExecutionCoordinator] Triggering initial phase', {
        specPath,
        firstPhase,
        skippedFrom: lastCompletedPhase,
      });
    } else {
      // 許可されたフェーズがない場合は即座に完了
      logger.info('[AutoExecutionCoordinator] No permitted phases, completing immediately', { specPath });
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
   */
  async handleAgentCompleted(
    agentId: string,
    specPath: string,
    status: 'completed' | 'failed' | 'interrupted'
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
          // tasksフェーズ完了時のDocument Review処理
          if (currentPhase === 'tasks' && options.documentReviewFlag !== 'skip') {
            logger.info('[AutoExecutionCoordinator] Tasks completed, triggering document review', {
              specPath,
              documentReviewFlag: options.documentReviewFlag,
            });
            this.emit('execute-document-review', specPath, {
              specId: state.specId,
            });
            return; // Document Review完了後に次フェーズへ進む
          }

          // Read latest approvals from spec.json (may have been updated by auto-approve)
          let latestApprovals = options.approvals;
          try {
            const specJsonPath = require('path').join(specPath, 'spec.json');
            const content = require('fs').readFileSync(specJsonPath, 'utf-8');
            const specJson = JSON.parse(content);
            latestApprovals = specJson.approvals;
            logger.debug('[AutoExecutionCoordinator] Read latest approvals for next phase', {
              specPath,
              latestApprovals,
            });
          } catch (err) {
            logger.warn('[AutoExecutionCoordinator] Failed to read latest approvals', { specPath, error: err });
          }

          const nextPhase = this.getNextPermittedPhase(currentPhase, options.permissions, latestApprovals);
          if (nextPhase) {
            // 次フェーズ実行イベントを発火
            this.emit('execute-next-phase', specPath, nextPhase, {
              specId: state.specId,
              featureName: state.specId,
            });
            logger.info('[AutoExecutionCoordinator] Triggering next phase', { specPath, nextPhase });
          } else {
            // 全フェーズ完了
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
   * @param specPath specのパス
   * @returns オプション or undefined
   */
  getOptions(specPath: string): AutoExecutionOptions | undefined {
    return this.executionOptions.get(specPath);
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
    const nextPhase = options
      ? this.getNextPermittedPhase(phase, options.permissions, latestApprovals)
      : null;

    if (nextPhase === null) {
      // 全ての許可されたフェーズが完了
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
    });

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

    // Check if next phase (impl) is permitted
    const nextPhase = this.getNextPermittedPhase('tasks', options.permissions, latestApprovals);

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
        // implフェーズが許可されていない場合は完了
        logger.info('[AutoExecutionCoordinator] Document review approved, but no next phase permitted, completing', {
          specPath,
        });
        this.completeExecution(specPath);
      }
    } else {
      // Document Reviewが承認待ちだが、次フェーズが許可されていない場合は完了とする
      // (impl NOGOの場合、document-review後に進むフェーズがないので完了)
      if (!nextPhase) {
        logger.info('[AutoExecutionCoordinator] Document review not approved, but no next phase permitted, completing', {
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
  protected completeExecution(specPath: string): void {
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
