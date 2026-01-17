/**
 * BugAutoExecutionCoordinator
 * Main Process側でのBug自動実行のSingle Source of Truth
 * Bug fix: auto-execution-ui-state-dependency
 *
 * 設計原則:
 * - Main Process側でのみ状態を保持（SSoT）
 * - bugPath単位でのMap管理（並行実行対応）
 * - イベント駆動による状態変更通知
 * - AutoExecutionCoordinator（Spec用）と同じアーキテクチャ
 */

import { EventEmitter } from 'events';
import { logger } from './logger';
import type { BugWorkflowPhase } from '../../renderer/types/bug';
import type {
  BugAutoExecutionStatus,
  BugAutoExecutionPermissions,
} from '../../renderer/types/bugAutoExecution';
import { BUG_AUTO_EXECUTION_PHASES } from '../../renderer/types/bugAutoExecution';

// ============================================================
// Constants
// ============================================================

/** デフォルトタイムアウト: 10分 */
export const DEFAULT_BUG_AUTO_EXECUTION_TIMEOUT = 600_000;

/** 最大並行実行数 */
export const MAX_CONCURRENT_BUG_EXECUTIONS = 5;

/** 最大リトライ回数 */
export const MAX_RETRIES = 3;

// ============================================================
// Types
// ============================================================

/**
 * Bug自動実行状態管理
 * bugPath単位での実行状態を保持
 */
export interface BugAutoExecutionState {
  /** bugのパス */
  readonly bugPath: string;
  /** bugの名前 */
  readonly bugName: string;
  /** 現在の状態 */
  status: BugAutoExecutionStatus;
  /** 現在実行中のフェーズ */
  currentPhase: BugWorkflowPhase | null;
  /** 実行済みフェーズ一覧 */
  executedPhases: BugWorkflowPhase[];
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
  /** リトライ回数 */
  retryCount: number;
  /** 最後に失敗したフェーズ */
  lastFailedPhase: BugWorkflowPhase | null;
}

/**
 * Bug自動実行オプション
 */
export interface BugAutoExecutionOptions {
  /** フェーズごとの許可設定 */
  readonly permissions: BugAutoExecutionPermissions;
  /** タイムアウト（ms） */
  readonly timeoutMs?: number;
}

/**
 * Bug自動実行エラー型
 */
export type BugAutoExecutionError =
  | { type: 'ALREADY_EXECUTING'; bugName: string }
  | { type: 'NOT_EXECUTING'; bugName: string }
  | { type: 'MAX_CONCURRENT_REACHED'; limit: number }
  | { type: 'NO_BUG_SELECTED' }
  | { type: 'NO_BUG_DETAIL' }
  | { type: 'NO_PERMITTED_PHASES' }
  | { type: 'PHASE_EXECUTION_FAILED'; phase: BugWorkflowPhase; message?: string }
  | { type: 'TIMEOUT'; bugName: string; phase: BugWorkflowPhase | null }
  | { type: 'AGENT_CRASH'; agentId: string; exitCode: number; phase: BugWorkflowPhase | null }
  | { type: 'MAX_RETRIES_EXCEEDED'; bugName: string; retryCount: number };

/**
 * Result型
 */
export type Result<T, E> =
  | { ok: true; value: T }
  | { ok: false; error: E };

/**
 * 実行サマリー
 */
export interface BugExecutionSummary {
  readonly bugName: string;
  readonly executedPhases: readonly BugWorkflowPhase[];
  readonly totalDuration: number;
  readonly errors: readonly string[];
  readonly status: 'completed' | 'error' | 'paused';
}

/**
 * BugAutoExecutionCoordinator
 * Main Process側でのBug自動実行のSSoT
 */
export class BugAutoExecutionCoordinator extends EventEmitter {
  /** bugPath -> BugAutoExecutionState のマップ */
  private readonly executionStates: Map<string, BugAutoExecutionState> = new Map();

  /** bugPath -> BugAutoExecutionOptions のマップ */
  private readonly executionOptions: Map<string, BugAutoExecutionOptions> = new Map();

  constructor() {
    super();
    logger.info('[BugAutoExecutionCoordinator] Initialized');
  }

  // ============================================================
  // State Query Methods
  // ============================================================

  /**
   * 指定bugPathの実行状態を取得
   * @param bugPath bugのパス
   * @returns BugAutoExecutionState or null
   */
  getStatus(bugPath: string): BugAutoExecutionState | null {
    return this.executionStates.get(bugPath) ?? null;
  }

  /**
   * 全ての実行状態を取得
   * @returns bugPath -> BugAutoExecutionState のMap
   */
  getAllStatuses(): Map<string, BugAutoExecutionState> {
    return new Map(this.executionStates);
  }

  /**
   * 実行中のbug数を取得
   * @returns 実行中のbug数
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
   * bugNameから実行状態を取得
   * @param bugName bugの名前
   * @returns BugAutoExecutionState or null
   */
  getStatusByBugName(bugName: string): BugAutoExecutionState | null {
    for (const state of this.executionStates.values()) {
      if (state.bugName === bugName) {
        return state;
      }
    }
    return null;
  }

  /**
   * 指定bugPathが実行中かどうか
   * @param bugPath bugのパス
   * @returns 実行中ならtrue
   */
  isExecuting(bugPath: string): boolean {
    const state = this.executionStates.get(bugPath);
    return state?.status === 'running';
  }

  // ============================================================
  // Public API - Start/Stop/RetryFrom
  // ============================================================

  /**
   * 自動実行を開始
   * @param bugPath bugのパス
   * @param bugName bugの名前
   * @param options 自動実行オプション
   * @param lastCompletedPhase 最後に完了したフェーズ（既存進捗から開始点を決定）
   * @returns 成功時は状態、失敗時はエラー
   */
  async start(
    bugPath: string,
    bugName: string,
    options: BugAutoExecutionOptions,
    lastCompletedPhase: BugWorkflowPhase | null
  ): Promise<Result<BugAutoExecutionState, BugAutoExecutionError>> {
    logger.info('[BugAutoExecutionCoordinator] start called', { bugPath, bugName });

    // 既に実行中かチェック
    const existingState = this.executionStates.get(bugPath);
    if (existingState && existingState.status === 'running') {
      logger.warn('[BugAutoExecutionCoordinator] Already executing', { bugPath, bugName });
      return {
        ok: false,
        error: { type: 'ALREADY_EXECUTING', bugName },
      };
    }

    // 最大並行実行数チェック
    const runningCount = this.getRunningCount();
    if (runningCount >= MAX_CONCURRENT_BUG_EXECUTIONS) {
      logger.warn('[BugAutoExecutionCoordinator] Max concurrent reached', {
        current: runningCount,
        max: MAX_CONCURRENT_BUG_EXECUTIONS,
      });
      return {
        ok: false,
        error: { type: 'MAX_CONCURRENT_REACHED', limit: MAX_CONCURRENT_BUG_EXECUTIONS },
      };
    }

    // 新しい状態を作成または既存を更新
    const now = Date.now();
    const state: BugAutoExecutionState = {
      bugPath,
      bugName,
      status: 'running',
      currentPhase: null,
      executedPhases: existingState?.executedPhases ?? [],
      errors: existingState?.errors ?? [],
      startTime: existingState?.startTime ?? now,
      lastActivityTime: now,
      retryCount: existingState?.retryCount ?? 0,
      lastFailedPhase: null,
    };

    // タイムアウト設定
    const timeoutMs = options.timeoutMs ?? DEFAULT_BUG_AUTO_EXECUTION_TIMEOUT;
    state.timeoutId = setTimeout(() => {
      this.handleTimeout(bugPath);
    }, timeoutMs);

    this.executionStates.set(bugPath, state);
    this.executionOptions.set(bugPath, options);
    this.emit('state-changed', bugPath, state);

    logger.info('[BugAutoExecutionCoordinator] Bug auto-execution started', { bugPath, bugName });

    // 初期フェーズを決定して実行イベントを発火
    const firstPhase = this.getNextPermittedPhase(lastCompletedPhase, options.permissions);
    if (firstPhase) {
      this.emit('execute-next-phase', bugPath, firstPhase, {
        bugName,
      });
      logger.info('[BugAutoExecutionCoordinator] Triggering initial phase', {
        bugPath,
        firstPhase,
        skippedFrom: lastCompletedPhase,
      });
    } else {
      // 許可されたフェーズがない場合は即座に完了
      logger.info('[BugAutoExecutionCoordinator] No permitted phases, completing immediately', { bugPath });
      this.completeExecution(bugPath);
    }

    return { ok: true, value: state };
  }

  /**
   * 自動実行を停止
   * @param bugPath bugのパス
   * @returns 成功時はvoid、失敗時はエラー
   */
  async stop(bugPath: string): Promise<Result<void, BugAutoExecutionError>> {
    logger.info('[BugAutoExecutionCoordinator] stop called', { bugPath });

    const state = this.executionStates.get(bugPath);
    if (!state) {
      logger.warn('[BugAutoExecutionCoordinator] Not executing', { bugPath });
      return {
        ok: false,
        error: { type: 'NOT_EXECUTING', bugName: '' },
      };
    }

    // タイムアウトをクリア
    if (state.timeoutId) {
      clearTimeout(state.timeoutId);
    }

    // 状態をidleに更新してリセット
    this.updateState(bugPath, {
      status: 'idle',
      currentPhase: null,
      currentAgentId: undefined,
      timeoutId: undefined,
    });

    // 状態を削除（完全停止）
    this.executionStates.delete(bugPath);
    this.executionOptions.delete(bugPath);

    logger.info('[BugAutoExecutionCoordinator] Bug auto-execution stopped', { bugPath });

    return { ok: true, value: undefined };
  }

  /**
   * 指定フェーズから再開
   * @param bugPath bugのパス
   * @param phase 再開するフェーズ
   * @returns 成功時は状態、失敗時はエラー
   */
  async retryFrom(
    bugPath: string,
    phase: BugWorkflowPhase
  ): Promise<Result<BugAutoExecutionState, BugAutoExecutionError>> {
    logger.info('[BugAutoExecutionCoordinator] retryFrom called', { bugPath, phase });

    const state = this.executionStates.get(bugPath);
    if (!state) {
      logger.warn('[BugAutoExecutionCoordinator] State not found for retryFrom', { bugPath });
      return {
        ok: false,
        error: { type: 'NOT_EXECUTING', bugName: '' },
      };
    }

    // リトライ回数チェック
    const newRetryCount = state.retryCount + 1;
    if (newRetryCount > MAX_RETRIES) {
      logger.error('[BugAutoExecutionCoordinator] Max retries exceeded', {
        bugPath,
        retryCount: newRetryCount,
      });
      return {
        ok: false,
        error: { type: 'MAX_RETRIES_EXCEEDED', bugName: state.bugName, retryCount: newRetryCount },
      };
    }

    // 状態を更新（エラーをクリア）
    const now = Date.now();
    const updatedState: BugAutoExecutionState = {
      ...state,
      status: 'running',
      currentPhase: phase,
      lastActivityTime: now,
      errors: [], // Clear errors on retry
      retryCount: newRetryCount,
      lastFailedPhase: null,
    };

    // 新しいタイムアウトを設定
    if (state.timeoutId) {
      clearTimeout(state.timeoutId);
    }
    updatedState.timeoutId = setTimeout(() => {
      this.handleTimeout(bugPath);
    }, DEFAULT_BUG_AUTO_EXECUTION_TIMEOUT);

    this.executionStates.set(bugPath, updatedState);
    this.emit('state-changed', bugPath, updatedState);

    logger.info('[BugAutoExecutionCoordinator] Retrying from phase', { bugPath, phase, retryCount: newRetryCount });

    return { ok: true, value: updatedState };
  }

  // ============================================================
  // Agent Integration
  // ============================================================

  /**
   * 現在のフェーズを設定
   * @param bugPath bugのパス
   * @param phase 設定するフェーズ
   * @param agentId エージェントID（オプション）
   */
  setCurrentPhase(bugPath: string, phase: BugWorkflowPhase, agentId?: string): void {
    const state = this.executionStates.get(bugPath);
    if (!state) {
      logger.warn('[BugAutoExecutionCoordinator] setCurrentPhase: state not found', { bugPath });
      return;
    }

    this.updateState(bugPath, {
      currentPhase: phase,
      currentAgentId: agentId,
    });

    if (agentId) {
      this.emit('phase-started', bugPath, phase, agentId);
    }

    logger.info('[BugAutoExecutionCoordinator] Current phase set', { bugPath, phase, agentId });
  }

  /**
   * エージェント完了を処理
   * @param agentId エージェントID
   * @param bugPath bugのパス
   * @param status 終了ステータス
   */
  async handleAgentCompleted(
    agentId: string,
    bugPath: string,
    status: 'completed' | 'failed' | 'interrupted'
  ): Promise<void> {
    const state = this.executionStates.get(bugPath);
    if (!state) {
      logger.warn('[BugAutoExecutionCoordinator] handleAgentCompleted: state not found', { bugPath });
      return;
    }

    const currentPhase = state.currentPhase;

    logger.info('[BugAutoExecutionCoordinator] Agent completed', {
      agentId,
      bugPath,
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

        this.updateState(bugPath, {
          executedPhases: newExecutedPhases,
          currentAgentId: undefined,
          currentPhase: null,
          retryCount: 0, // Reset retry count on success
        });

        this.emit('phase-completed', bugPath, currentPhase);

        // 次フェーズを自動実行
        const options = this.executionOptions.get(bugPath);
        if (options) {
          const nextPhase = this.getNextPermittedPhase(currentPhase, options.permissions);
          if (nextPhase) {
            this.emit('execute-next-phase', bugPath, nextPhase, {
              bugName: state.bugName,
            });
            logger.info('[BugAutoExecutionCoordinator] Triggering next phase', { bugPath, nextPhase });
          } else {
            // 全フェーズ完了
            this.completeExecution(bugPath);
          }
        }
      } else {
        this.updateState(bugPath, {
          currentAgentId: undefined,
        });
      }
    } else if (status === 'failed') {
      // エージェント失敗時の処理
      const errorMessage = `Agent failed at phase: ${currentPhase ?? 'unknown'}`;
      this.updateState(bugPath, {
        status: 'error',
        errors: [...state.errors, errorMessage],
        currentAgentId: undefined,
        lastFailedPhase: currentPhase,
      });

      const error: BugAutoExecutionError = {
        type: 'PHASE_EXECUTION_FAILED',
        phase: currentPhase ?? 'analyze',
        message: errorMessage,
      };
      this.emit('execution-error', bugPath, error);
    } else if (status === 'interrupted') {
      // 中断時の処理
      this.updateState(bugPath, {
        status: 'paused',
        currentAgentId: undefined,
      });
    }
  }

  // ============================================================
  // Phase Transition Logic
  // ============================================================

  /**
   * 次の許可されたフェーズを取得
   * @param currentPhase 現在のフェーズ（nullの場合は最初のフェーズ）
   * @param permissions 許可設定
   * @returns 次のフェーズ or null（なし）
   */
  getNextPermittedPhase(
    currentPhase: BugWorkflowPhase | null,
    permissions: BugAutoExecutionPermissions
  ): BugWorkflowPhase | null {
    // reportフェーズは自動実行対象外
    const autoPhases = BUG_AUTO_EXECUTION_PHASES;
    let startIndex = 0;

    if (currentPhase !== null) {
      // reportの場合は最初から
      if (currentPhase === 'report') {
        startIndex = 0;
      } else {
        const currentIndex = autoPhases.indexOf(currentPhase);
        if (currentIndex === -1) return null;
        startIndex = currentIndex + 1;
      }
    }

    for (let i = startIndex; i < autoPhases.length; i++) {
      const phase = autoPhases[i];
      // autoPhases contains only permissioned phases (analyze, fix, verify, deploy)
      // which are all valid keys in BugAutoExecutionPermissions
      const phaseKey = phase as keyof BugAutoExecutionPermissions;
      if (permissions[phaseKey]) {
        return phase;
      }
    }

    return null;
  }

  /**
   * フェーズが完了しているかを確認
   * @param bugPath bugのパス
   * @param phase 確認するフェーズ
   * @returns 完了していればtrue
   */
  isPhaseCompleted(bugPath: string, phase: BugWorkflowPhase): boolean {
    const state = this.executionStates.get(bugPath);
    return state?.executedPhases.includes(phase) ?? false;
  }

  // ============================================================
  // Timeout Handling
  // ============================================================

  /**
   * タイムアウト発生時の処理
   * @param bugPath bugのパス
   */
  private handleTimeout(bugPath: string): void {
    const state = this.executionStates.get(bugPath);
    if (!state) {
      return;
    }

    logger.warn('[BugAutoExecutionCoordinator] Timeout occurred', {
      bugPath,
      bugName: state.bugName,
      currentPhase: state.currentPhase,
    });

    // エラー状態に更新
    this.updateState(bugPath, {
      status: 'error',
      errors: [...state.errors, `Timeout at phase: ${state.currentPhase ?? 'unknown'}`],
      timeoutId: undefined,
    });

    // タイムアウトエラーイベントを発火
    const error: BugAutoExecutionError = {
      type: 'TIMEOUT',
      bugName: state.bugName,
      phase: state.currentPhase,
    };
    this.emit('execution-error', bugPath, error);
  }

  // ============================================================
  // State Management (Internal)
  // ============================================================

  /**
   * 実行状態を更新
   * @param bugPath bugのパス
   * @param updates 更新内容
   */
  private updateState(
    bugPath: string,
    updates: Partial<Omit<BugAutoExecutionState, 'bugPath' | 'bugName'>>
  ): void {
    const state = this.executionStates.get(bugPath);
    if (!state) {
      logger.warn('[BugAutoExecutionCoordinator] updateState: state not found', { bugPath });
      return;
    }

    const updatedState: BugAutoExecutionState = {
      ...state,
      ...updates,
      lastActivityTime: Date.now(),
    };

    this.executionStates.set(bugPath, updatedState);
    this.emit('state-changed', bugPath, updatedState);

    logger.debug('[BugAutoExecutionCoordinator] State updated', {
      bugPath,
      status: updatedState.status,
      currentPhase: updatedState.currentPhase,
    });
  }

  // ============================================================
  // Execution Completion
  // ============================================================

  /**
   * 自動実行を完了状態にする
   * @param bugPath bugのパス
   */
  private completeExecution(bugPath: string): void {
    const state = this.executionStates.get(bugPath);
    if (!state) {
      logger.warn('[BugAutoExecutionCoordinator] completeExecution: state not found', { bugPath });
      return;
    }

    // タイムアウトをクリア
    if (state.timeoutId) {
      clearTimeout(state.timeoutId);
    }

    const updatedState: BugAutoExecutionState = {
      ...state,
      status: 'completed',
      currentPhase: null,
      timeoutId: undefined,
      lastActivityTime: Date.now(),
    };

    this.executionStates.set(bugPath, updatedState);
    this.emit('state-changed', bugPath, updatedState);

    // 実行完了サマリーを発火
    const summary: BugExecutionSummary = {
      bugName: state.bugName,
      executedPhases: state.executedPhases,
      totalDuration: Date.now() - state.startTime,
      errors: state.errors,
      status: 'completed',
    };
    this.emit('execution-completed', bugPath, summary);

    logger.info('[BugAutoExecutionCoordinator] Execution completed', {
      bugPath,
      executedPhases: state.executedPhases,
    });
  }

  // ============================================================
  // Cleanup
  // ============================================================

  /**
   * 指定bugPathの状態を削除
   * @param bugPath bugのパス
   */
  removeState(bugPath: string): void {
    const state = this.executionStates.get(bugPath);
    if (state?.timeoutId) {
      clearTimeout(state.timeoutId);
    }
    this.executionStates.delete(bugPath);
    this.executionOptions.delete(bugPath);
  }

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
    logger.info('[BugAutoExecutionCoordinator] Disposed');
  }

  /**
   * Reset all execution states for E2E test isolation
   */
  resetAll(): void {
    logger.info('[BugAutoExecutionCoordinator] resetAll called (E2E test support)');

    // Clear all timeouts
    for (const state of this.executionStates.values()) {
      if (state.timeoutId) {
        clearTimeout(state.timeoutId);
      }
    }

    // Clear all state maps
    this.executionStates.clear();
    this.executionOptions.clear();

    logger.info('[BugAutoExecutionCoordinator] All states reset');
  }
}

// ============================================================
// Singleton instance
// ============================================================

let bugAutoExecutionCoordinatorInstance: BugAutoExecutionCoordinator | null = null;

export function getBugAutoExecutionCoordinator(): BugAutoExecutionCoordinator {
  if (!bugAutoExecutionCoordinatorInstance) {
    bugAutoExecutionCoordinatorInstance = new BugAutoExecutionCoordinator();
  }
  return bugAutoExecutionCoordinatorInstance;
}

export function disposeBugAutoExecutionCoordinator(): void {
  if (bugAutoExecutionCoordinatorInstance) {
    bugAutoExecutionCoordinatorInstance.dispose();
    bugAutoExecutionCoordinatorInstance = null;
  }
}
