/**
 * ScheduleTaskCoordinator
 * Main Process側でのスケジュールタスク実行のSingle Source of Truth
 * Task 2.3: スケジュール管理コーディネーターを実装
 * Task 2.4: 回避ルールと実行制御を実装
 * Requirements: 3.1, 3.2, 3.3, 4.1, 4.2, 4.3, 6.3, 7.2, 7.5, 10.1, 10.2, 10.3, 10.4, 10.5
 *
 * 設計原則:
 * - Main Process側でのみ状態を保持（SSoT）
 * - 1分間隔のスケジュール条件チェック
 * - キューイング条件と実行条件の分離
 * - humanActivityTrackerとの統合によるアイドル時間取得
 * - AgentRegistryとの連携による回避対象チェック
 */

import type {
  ScheduleTask,
  IntervalSchedule,
  WeeklySchedule,
  IdleSchedule,
  AvoidanceTarget,
} from '../../shared/types/scheduleTask';

// ============================================================
// Constants
// ============================================================

/** Schedule check interval: 1 minute in milliseconds */
export const SCHEDULE_CHECK_INTERVAL_MS = 60_000;

// ============================================================
// Types
// ============================================================

/**
 * キューに追加されたタスク情報
 * Requirements: 10.1
 */
export interface QueuedTask {
  /** タスクID */
  readonly taskId: string;
  /** キューに追加された時刻 (Unix ms) */
  readonly queuedAt: number;
  /** キュー追加の理由 */
  readonly reason: 'schedule' | 'idle';
  /** アイドル待ちフラグ (waitForIdle=true の場合) */
  readonly waitingForIdle?: boolean;
}

/**
 * 実行中タスク情報
 * Requirements: 5.4
 */
export interface RunningTaskInfo {
  /** タスクID */
  readonly taskId: string;
  /** 実行中のプロンプトインデックス */
  readonly promptIndex: number;
  /** エージェントID */
  readonly agentId: string;
  /** worktreeパス (workflowモード時) */
  readonly worktreePath?: string;
}

/**
 * 実行中エージェント情報
 * Task 2.4: AgentRegistryから取得する実行中エージェント情報
 * Requirements: 6.3
 */
export interface RunningAgentInfo {
  /** エージェントID */
  readonly agentId: string;
  /** 実行中のフェーズ/操作種別 */
  readonly phase: string;
  /** specID */
  readonly specId: string;
  /** 開始時刻 */
  readonly startedAt: number;
}

/**
 * 回避競合情報
 * Task 2.4: 回避ルール判定結果
 * Requirements: 6.3
 */
export interface AvoidanceConflict {
  /** 競合している操作種別 */
  readonly conflictType: AvoidanceTarget;
  /** 競合しているエージェントID */
  readonly agentId: string;
}

/**
 * 実行結果
 */
export interface ExecutionResult {
  /** タスクID */
  readonly taskId: string;
  /** 開始時刻 */
  readonly startedAt: number;
  /** 起動されたエージェントIDリスト */
  readonly agentIds: readonly string[];
}

/**
 * 実行エラー
 */
export type ExecutionError =
  | { readonly type: 'TASK_NOT_FOUND'; readonly taskId: string }
  | { readonly type: 'ALREADY_RUNNING'; readonly taskId: string }
  | { readonly type: 'AVOIDANCE_CONFLICT'; readonly conflictType: string }
  | { readonly type: 'AGENT_START_FAILED'; readonly message: string };

/**
 * Result型
 */
export type Result<T, E> =
  | { readonly ok: true; readonly value: T }
  | { readonly ok: false; readonly error: E };

/**
 * ロガーインタフェース
 */
export interface Logger {
  info(message: string, data?: unknown): void;
  debug(message: string, data?: unknown): void;
  warn(message: string, data?: unknown): void;
  error(message: string, data?: unknown): void;
}

// ============================================================
// Task 2.5: Workflow Mode and Agent Execution Types
// Requirements: 5.4, 5.5, 8.2, 8.3, 8.4, 8.5, 8.6
// ============================================================

/**
 * Worktree作成オプション
 * Requirements: 8.2, 8.3, 8.4
 */
export interface CreateScheduleWorktreeOptions {
  /** タスク名（命名規則に使用） */
  readonly taskName: string;
  /** suffix生成モード */
  readonly suffixMode: 'auto' | 'custom';
  /** カスタムsuffix（suffixMode='custom'時） */
  readonly customSuffix?: string;
  /** プロンプトインデックス（複数プロンプト時の識別用） */
  readonly promptIndex: number;
}

/**
 * Worktree作成結果
 */
export interface ScheduleWorktreeInfo {
  /** 相対パス */
  readonly path: string;
  /** 絶対パス */
  readonly absolutePath: string;
  /** ブランチ名 */
  readonly branch: string;
  /** 作成日時 */
  readonly created_at: string;
}

/**
 * エージェント起動オプション
 * Requirements: 5.4
 */
export interface StartScheduleAgentOptions {
  /** タスクID */
  readonly taskId: string;
  /** タスク名 */
  readonly taskName: string;
  /** 実行するプロンプト */
  readonly prompt: string;
  /** プロンプトインデックス */
  readonly promptIndex: number;
  /** worktreeパス（workflowモード時） */
  readonly worktreePath?: string;
}

/**
 * エージェント起動結果
 */
export interface ScheduleAgentStartResult {
  /** エージェントID */
  readonly agentId: string;
}

/**
 * Worktree作成関数の型
 */
export type CreateScheduleWorktreeFn = (options: CreateScheduleWorktreeOptions) => Promise<{
  ok: true;
  value: ScheduleWorktreeInfo;
} | {
  ok: false;
  error: { type: string; message: string };
}>;

/**
 * Worktree削除関数の型
 */
export type RemoveScheduleWorktreeFn = (worktreePath: string) => Promise<void>;

/**
 * エージェント起動関数の型
 */
export type StartScheduleAgentFn = (options: StartScheduleAgentOptions) => Promise<{
  ok: true;
  value: ScheduleAgentStartResult;
} | {
  ok: false;
  error: { type: string; message: string };
}>;

/**
 * ScheduleTaskCoordinator依存関係
 * テスト容易性のための依存性注入
 */
export interface ScheduleTaskCoordinatorDeps {
  /** アイドル時間を取得 (ms) */
  getIdleTimeMs: () => number;
  /** プロジェクトの全タスクを取得 */
  getAllTasks: (projectPath: string) => Promise<readonly ScheduleTask[]>;
  /** 最終実行時間を更新 */
  updateLastExecutedAt: (projectPath: string, taskId: string, timestamp: number) => Promise<void>;
  /** 実行中エージェント一覧を取得 (Task 2.4: AgentRegistry連携) */
  getRunningAgents?: () => readonly RunningAgentInfo[];
  /** タスクがキューに追加された時のコールバック */
  onTaskQueued?: (task: QueuedTask) => void;
  /** タスク実行開始時のコールバック */
  onTaskStarted?: (taskId: string, result: ExecutionResult) => void;
  /** タスク実行完了時のコールバック */
  onTaskCompleted?: (taskId: string) => void;
  /** タスクがスキップされた時のコールバック */
  onTaskSkipped?: (taskId: string, reason: string) => void;
  /** 回避ルールにより待機中の時のコールバック (Task 2.4) */
  onAvoidanceWaiting?: (taskId: string, conflictType: AvoidanceTarget) => void;
  /** ロガー */
  logger?: Logger;

  // ============================================================
  // Task 2.5: Workflow Mode Dependencies
  // Requirements: 5.4, 5.5, 8.2, 8.3, 8.4, 8.5, 8.6
  // ============================================================

  /**
   * スケジュールタスク用worktree作成 (Task 2.5)
   * Requirements: 8.2, 8.3, 8.4, 8.5
   */
  createScheduleWorktree?: CreateScheduleWorktreeFn;

  /**
   * スケジュールタスク用worktree削除 (Task 2.5)
   * Note: Requirement 8.6ではシステム的に放置するため、通常は使用しない
   */
  removeScheduleWorktree?: RemoveScheduleWorktreeFn;

  /**
   * スケジュールタスク用エージェント起動 (Task 2.5)
   * Requirements: 5.4, 5.5
   */
  startScheduleAgent?: StartScheduleAgentFn;
}

/**
 * ScheduleTaskCoordinatorServiceインタフェース
 * Requirements: 3.1, 3.2, 3.3, 4.1, 4.2, 4.3, 6.3, 7.2, 7.5, 10.1, 10.2, 10.3, 10.4, 10.5
 */
export interface ScheduleTaskCoordinatorService {
  /** 初期化 */
  initialize(): Promise<void>;

  /** スケジューラ開始 */
  startScheduler(): void;

  /** スケジューラ停止 */
  stopScheduler(): void;

  /** キュー内タスク取得 */
  getQueuedTasks(): readonly QueuedTask[];

  /** キュークリア */
  clearQueue(): void;

  /** 即時実行 (Requirements: 7.2, 7.5) */
  executeImmediately(taskId: string, force?: boolean): Promise<Result<ExecutionResult, ExecutionError>>;

  /** 実行中タスク取得 */
  getRunningTasks(): readonly RunningTaskInfo[];

  /** 回避競合チェック (Requirement 6.3) */
  checkAvoidanceConflict(task: ScheduleTask): AvoidanceConflict | null;

  /** キュー処理 (Requirements: 10.4, 10.5) */
  processQueue(): Promise<void>;

  /** リソース解放 */
  dispose(): void;
}

// ============================================================
// Implementation
// ============================================================

/**
 * ScheduleTaskCoordinator
 * スケジュールタスク実行の中央制御
 * Requirements: 3.1, 3.2, 3.3, 4.1, 4.2, 4.3, 10.1, 10.2, 10.3
 */
export class ScheduleTaskCoordinator implements ScheduleTaskCoordinatorService {
  private readonly projectPath: string;
  private readonly deps: ScheduleTaskCoordinatorDeps;
  private readonly logger: Logger;

  /** タスクキュー (キューイング条件を満たしたタスク) */
  private taskQueue: QueuedTask[] = [];

  /** 実行中タスク情報 */
  private runningTasks: Map<string, RunningTaskInfo> = new Map();

  /** スケジューラタイマーID */
  private schedulerIntervalId: ReturnType<typeof setInterval> | null = null;

  /** キャッシュされたタスク一覧 */
  private cachedTasks: readonly ScheduleTask[] = [];

  constructor(projectPath: string, deps: ScheduleTaskCoordinatorDeps) {
    this.projectPath = projectPath;
    this.deps = deps;
    this.logger = deps.logger ?? {
      info: () => {},
      debug: () => {},
      warn: () => {},
      error: () => {},
    };
  }

  // ============================================================
  // Initialization
  // ============================================================

  /**
   * 初期化
   * プロジェクトのタスク一覧を読み込む
   */
  async initialize(): Promise<void> {
    this.logger.info('[ScheduleTaskCoordinator] Initializing', { projectPath: this.projectPath });

    // タスク一覧を読み込み
    this.cachedTasks = await this.deps.getAllTasks(this.projectPath);

    this.logger.info('[ScheduleTaskCoordinator] Initialized', {
      projectPath: this.projectPath,
      taskCount: this.cachedTasks.length,
    });
  }

  // ============================================================
  // Scheduler Control (Requirement 10.1)
  // ============================================================

  /**
   * スケジューラ開始
   * 1分間隔でスケジュール条件をチェック
   */
  startScheduler(): void {
    if (this.schedulerIntervalId !== null) {
      this.logger.warn('[ScheduleTaskCoordinator] Scheduler already running');
      return;
    }

    this.logger.info('[ScheduleTaskCoordinator] Starting scheduler', {
      intervalMs: SCHEDULE_CHECK_INTERVAL_MS,
    });

    this.schedulerIntervalId = setInterval(() => {
      this.checkScheduleConditions().catch((error) => {
        this.logger.error('[ScheduleTaskCoordinator] Schedule check failed', { error });
      });
    }, SCHEDULE_CHECK_INTERVAL_MS);
  }

  /**
   * スケジューラ停止
   */
  stopScheduler(): void {
    if (this.schedulerIntervalId !== null) {
      clearInterval(this.schedulerIntervalId);
      this.schedulerIntervalId = null;
      this.logger.info('[ScheduleTaskCoordinator] Scheduler stopped');
    }
  }

  // ============================================================
  // Schedule Condition Checking (Requirements 3.1, 3.2, 4.1, 10.2, 10.3)
  // ============================================================

  /**
   * スケジュール条件をチェックし、該当タスクをキューに追加
   * Requirements: 10.2 (固定スケジュール), 10.3 (アイドル条件)
   */
  private async checkScheduleConditions(): Promise<void> {
    // タスク一覧を更新
    this.cachedTasks = await this.deps.getAllTasks(this.projectPath);

    const now = Date.now();
    const currentIdleMs = this.deps.getIdleTimeMs();

    for (const task of this.cachedTasks) {
      // 無効なタスクはスキップ
      if (!task.enabled) {
        continue;
      }

      // 既にキューに存在するタスクはスキップ
      if (this.isTaskInQueue(task.id)) {
        continue;
      }

      // スケジュール条件をチェック
      const checkResult = this.checkTaskScheduleCondition(task, now, currentIdleMs);

      if (checkResult.shouldQueue) {
        this.addToQueue(task.id, checkResult.reason, checkResult.waitingForIdle);
      }
    }
  }

  /**
   * 個々のタスクのスケジュール条件をチェック
   */
  private checkTaskScheduleCondition(
    task: ScheduleTask,
    now: number,
    currentIdleMs: number
  ): {
    shouldQueue: boolean;
    reason: 'schedule' | 'idle';
    waitingForIdle?: boolean;
  } {
    const schedule = task.schedule;

    switch (schedule.type) {
      case 'interval':
        return this.checkIntervalCondition(task, schedule, now);

      case 'weekly':
        return this.checkWeeklyCondition(task, schedule, now);

      case 'idle':
        return this.checkIdleCondition(task, schedule, currentIdleMs);

      default:
        return { shouldQueue: false, reason: 'schedule' };
    }
  }

  /**
   * 間隔ベーススケジュールのチェック
   * Requirements: 3.1 (前回実行からn時間経過パターン)
   */
  private checkIntervalCondition(
    task: ScheduleTask,
    schedule: IntervalSchedule,
    now: number
  ): { shouldQueue: boolean; reason: 'schedule'; waitingForIdle?: boolean } {
    const lastExecutedAt = task.lastExecutedAt;

    // 未実行の場合は即時キュー追加
    if (lastExecutedAt === null) {
      return {
        shouldQueue: true,
        reason: 'schedule',
        waitingForIdle: schedule.waitForIdle,
      };
    }

    // 経過時間をチェック
    const elapsedMs = now - lastExecutedAt;
    const intervalMs = schedule.hoursInterval * 60 * 60 * 1000;

    if (elapsedMs >= intervalMs) {
      return {
        shouldQueue: true,
        reason: 'schedule',
        waitingForIdle: schedule.waitForIdle,
      };
    }

    return { shouldQueue: false, reason: 'schedule' };
  }

  /**
   * 曜日ベーススケジュールのチェック
   * Requirements: 3.2 (毎週n曜日のn時パターン)
   */
  private checkWeeklyCondition(
    task: ScheduleTask,
    schedule: WeeklySchedule,
    now: number
  ): { shouldQueue: boolean; reason: 'schedule'; waitingForIdle?: boolean } {
    const currentDate = new Date(now);
    const currentDay = currentDate.getUTCDay(); // 0=Sunday, 1=Monday, ...
    const currentHour = currentDate.getUTCHours();

    // 曜日と時刻が一致するかチェック
    const dayMatches = schedule.weekdays.includes(currentDay);
    const hourMatches = schedule.hourOfDay === currentHour;

    if (dayMatches && hourMatches) {
      // 既にこの時間帯に実行済みかチェック
      if (task.lastExecutedAt !== null) {
        const lastExecutedDate = new Date(task.lastExecutedAt);
        const isSameHour =
          lastExecutedDate.getUTCDay() === currentDay &&
          lastExecutedDate.getUTCHours() === currentHour &&
          lastExecutedDate.getUTCDate() === currentDate.getUTCDate() &&
          lastExecutedDate.getUTCMonth() === currentDate.getUTCMonth() &&
          lastExecutedDate.getUTCFullYear() === currentDate.getUTCFullYear();

        if (isSameHour) {
          return { shouldQueue: false, reason: 'schedule' };
        }
      }

      return {
        shouldQueue: true,
        reason: 'schedule',
        waitingForIdle: schedule.waitForIdle,
      };
    }

    return { shouldQueue: false, reason: 'schedule' };
  }

  /**
   * アイドルベーススケジュールのチェック
   * Requirements: 4.1 (アイドルn分経過パターン), 4.2 (分単位指定), 4.3 (アイドル検出時キュー追加)
   */
  private checkIdleCondition(
    _task: ScheduleTask,
    schedule: IdleSchedule,
    currentIdleMs: number
  ): { shouldQueue: boolean; reason: 'idle'; waitingForIdle?: boolean } {
    const requiredIdleMs = schedule.idleMinutes * 60 * 1000;

    if (currentIdleMs >= requiredIdleMs) {
      return { shouldQueue: true, reason: 'idle' };
    }

    return { shouldQueue: false, reason: 'idle' };
  }

  // ============================================================
  // Queue Management (Requirement 10.1)
  // ============================================================

  /**
   * タスクをキューに追加
   */
  private addToQueue(taskId: string, reason: 'schedule' | 'idle', waitingForIdle?: boolean): void {
    const queuedTask: QueuedTask = {
      taskId,
      queuedAt: Date.now(),
      reason,
      waitingForIdle,
    };

    this.taskQueue.push(queuedTask);

    this.logger.info('[ScheduleTaskCoordinator] Task added to queue', {
      taskId,
      reason,
      waitingForIdle,
    });

    // コールバック呼び出し
    this.deps.onTaskQueued?.(queuedTask);
  }

  /**
   * タスクが既にキューに存在するかチェック
   */
  private isTaskInQueue(taskId: string): boolean {
    return this.taskQueue.some((t) => t.taskId === taskId);
  }

  /**
   * キュー内タスク取得
   */
  getQueuedTasks(): readonly QueuedTask[] {
    return [...this.taskQueue];
  }

  /**
   * キュークリア
   */
  clearQueue(): void {
    this.taskQueue = [];
    this.logger.info('[ScheduleTaskCoordinator] Queue cleared');
  }

  // ============================================================
  // Avoidance Rules (Task 2.4, Requirement 6.3)
  // ============================================================

  /**
   * 回避競合をチェック
   * Requirements: 6.3 (AgentRegistryと連携した回避対象チェック)
   * @param task チェックするタスク
   * @returns 競合情報、競合なしの場合はnull
   */
  checkAvoidanceConflict(task: ScheduleTask): AvoidanceConflict | null {
    const { avoidance } = task;

    // 回避対象が空の場合は競合なし
    if (avoidance.targets.length === 0) {
      return null;
    }

    // 実行中エージェント一覧を取得
    const runningAgents = this.deps.getRunningAgents?.() ?? [];

    // 各回避対象についてチェック
    for (const target of avoidance.targets) {
      for (const agent of runningAgents) {
        if (this.isAgentMatchingAvoidanceTarget(agent, target)) {
          this.logger.debug('[ScheduleTaskCoordinator] Avoidance conflict detected', {
            taskId: task.id,
            target,
            agentId: agent.agentId,
            agentPhase: agent.phase,
          });

          return {
            conflictType: target,
            agentId: agent.agentId,
          };
        }
      }
    }

    return null;
  }

  /**
   * エージェントが回避対象にマッチするかチェック
   * @param agent 実行中エージェント
   * @param target 回避対象
   * @returns マッチすればtrue
   */
  private isAgentMatchingAvoidanceTarget(agent: RunningAgentInfo, target: AvoidanceTarget): boolean {
    // フェーズ名が回避対象と一致するかチェック
    // spec-merge, commit, bug-merge, schedule-task
    return agent.phase === target;
  }

  // ============================================================
  // Queue Processing (Task 2.4, Requirements 10.4, 10.5)
  // ============================================================

  /**
   * キューを処理し、実行可能なタスクを実行
   * Requirements: 10.4 (実行条件を満たしたら実行), 10.5 (アイドル後に実行オプション待機)
   */
  async processQueue(): Promise<void> {
    const currentIdleMs = this.deps.getIdleTimeMs();
    const tasksToRemove: string[] = [];

    for (const queuedTask of this.taskQueue) {
      // タスク定義を取得
      const task = this.cachedTasks.find((t) => t.id === queuedTask.taskId);
      if (!task) {
        // タスクが見つからない場合はキューから削除
        tasksToRemove.push(queuedTask.taskId);
        continue;
      }

      // 既に実行中の場合はスキップ
      if (this.runningTasks.has(queuedTask.taskId)) {
        continue;
      }

      // waitingForIdleの場合、アイドル状態をチェック (Requirement 10.5)
      if (queuedTask.waitingForIdle) {
        // アイドル時間が足りない場合は待機継続
        // 少なくとも1分以上のアイドル時間が必要
        const minIdleTimeMs = 60_000; // 1分
        if (currentIdleMs < minIdleTimeMs) {
          this.logger.debug('[ScheduleTaskCoordinator] Task waiting for idle', {
            taskId: queuedTask.taskId,
            currentIdleMs,
            minIdleTimeMs,
          });
          continue;
        }
      }

      // 回避ルールをチェック
      const conflict = this.checkAvoidanceConflict(task);

      if (conflict) {
        // 回避競合あり
        if (task.avoidance.behavior === 'skip') {
          // スキップ動作: キューから削除
          tasksToRemove.push(queuedTask.taskId);
          this.logger.info('[ScheduleTaskCoordinator] Task skipped due to avoidance conflict', {
            taskId: queuedTask.taskId,
            conflictType: conflict.conflictType,
          });
          this.deps.onTaskSkipped?.(
            queuedTask.taskId,
            `Avoidance conflict: ${conflict.conflictType}`
          );
        } else {
          // 待機動作: キューに残す
          this.logger.debug('[ScheduleTaskCoordinator] Task waiting due to avoidance conflict', {
            taskId: queuedTask.taskId,
            conflictType: conflict.conflictType,
          });
          this.deps.onAvoidanceWaiting?.(queuedTask.taskId, conflict.conflictType);
        }
        continue;
      }

      // 実行条件を満たした - 実行開始 (Requirement 10.4)
      await this.startTaskExecution(task);
      tasksToRemove.push(queuedTask.taskId);
    }

    // 処理済みタスクをキューから削除
    this.taskQueue = this.taskQueue.filter((t) => !tasksToRemove.includes(t.taskId));
  }

  /**
   * タスク実行を開始（キュー処理から呼ばれる）
   * Task 2.5: workflowモードとAgent起動を実装
   * Requirements: 5.4, 5.5, 8.2, 8.3, 8.4, 8.5, 8.6
   * @param task 実行するタスク
   */
  private async startTaskExecution(task: ScheduleTask): Promise<void> {
    // Task 2.5: 共通メソッドに委譲（エラーはログに記録して飲み込む）
    try {
      await this.executeTaskWithAgents(task);
    } catch (error) {
      this.logger.error('[ScheduleTaskCoordinator] Task execution failed', {
        taskId: task.id,
        error: error instanceof Error ? error.message : String(error),
      });
      // キュー処理からの呼び出しではエラーを飲み込む（次回スケジュールで再試行）
    }
  }

  // ============================================================
  // Immediate Execution (Task 2.4, Task 2.5, Requirements 7.2, 7.5, 5.4, 5.5, 8.2-8.6)
  // ============================================================

  /**
   * 即時実行
   * Task 2.5: workflowモードとAgent起動を実装
   * Requirements: 7.2 (即時実行時回避ルール非適用), 7.5 (強制実行)
   * Requirements: 5.4, 5.5, 8.2, 8.3, 8.4, 8.5, 8.6
   * @param taskId タスクID
   * @param force 強制実行フラグ（回避競合があっても実行）
   * @returns 実行結果
   */
  async executeImmediately(
    taskId: string,
    force?: boolean
  ): Promise<Result<ExecutionResult, ExecutionError>> {
    // Find task
    const task = this.cachedTasks.find((t) => t.id === taskId);
    if (!task) {
      return {
        ok: false,
        error: { type: 'TASK_NOT_FOUND', taskId },
      };
    }

    // Check if already running
    if (this.runningTasks.has(taskId)) {
      return {
        ok: false,
        error: { type: 'ALREADY_RUNNING', taskId },
      };
    }

    // 即時実行は回避ルールを適用しない (Requirement 7.2)
    // ただし、force=trueでない場合でも警告目的で競合チェックはできる

    this.logger.info('[ScheduleTaskCoordinator] Immediate execution started', {
      taskId,
      force: !!force,
      workflowEnabled: task.workflow.enabled,
      promptCount: task.prompts.length,
    });

    // Task 2.5: 実行処理を共通メソッドに委譲
    try {
      const result = await this.executeTaskWithAgents(task);
      return { ok: true, value: result };
    } catch (error) {
      return {
        ok: false,
        error: {
          type: 'AGENT_START_FAILED',
          message: error instanceof Error ? error.message : String(error),
        },
      };
    }
  }

  /**
   * タスクをAgent起動付きで実行
   * Task 2.5: workflowモードとAgent起動を実装
   * Requirements: 5.4, 5.5, 8.2, 8.3, 8.4, 8.5, 8.6
   * @param task 実行するタスク
   */
  private async executeTaskWithAgents(task: ScheduleTask): Promise<ExecutionResult> {
    const startedAt = Date.now();

    // 最終実行時間を記録 (Requirement 9.4)
    await this.deps.updateLastExecutedAt(this.projectPath, task.id, startedAt);

    // Task 2.5: 各プロンプトごとにAgent起動 (Requirement 5.4)
    const agentIds: string[] = [];

    // プロンプトを順番にソート
    const sortedPrompts = [...task.prompts].sort((a, b) => a.order - b.order);

    for (let i = 0; i < sortedPrompts.length; i++) {
      const prompt = sortedPrompts[i];
      let worktreePath: string | undefined;

      // Task 2.5: workflowモード有効時はworktreeを作成 (Requirements 8.2, 8.3, 8.4, 8.5)
      if (task.workflow.enabled && this.deps.createScheduleWorktree) {
        const worktreeResult = await this.deps.createScheduleWorktree({
          taskName: task.name,
          suffixMode: task.workflow.suffixMode ?? 'auto',
          customSuffix: task.workflow.customSuffix,
          promptIndex: i,
        });

        if (!worktreeResult.ok) {
          this.logger.error('[ScheduleTaskCoordinator] Failed to create worktree', {
            taskId: task.id,
            promptIndex: i,
            error: worktreeResult.error,
          });
          // worktree作成に失敗した場合はエラーを投げる
          throw new Error(`Failed to create worktree: ${worktreeResult.error.message}`);
        } else {
          worktreePath = worktreeResult.value.absolutePath;
          this.logger.info('[ScheduleTaskCoordinator] Worktree created', {
            taskId: task.id,
            promptIndex: i,
            worktreePath,
          });
        }
      }

      // Task 2.5: エージェント起動 (Requirement 5.4)
      if (this.deps.startScheduleAgent) {
        const agentResult = await this.deps.startScheduleAgent({
          taskId: task.id,
          taskName: task.name,
          prompt: prompt.content,
          promptIndex: i,
          worktreePath,
        });

        if (agentResult.ok) {
          agentIds.push(agentResult.value.agentId);
          this.logger.info('[ScheduleTaskCoordinator] Agent started', {
            taskId: task.id,
            promptIndex: i,
            agentId: agentResult.value.agentId,
          });
        } else {
          this.logger.error('[ScheduleTaskCoordinator] Failed to start agent', {
            taskId: task.id,
            promptIndex: i,
            error: agentResult.error,
          });
          // エージェント起動に失敗した場合はエラーを投げる
          throw new Error(`Failed to start agent: ${agentResult.error.message}`);
        }
      } else {
        // startScheduleAgentが提供されていない場合はプレースホルダーIDを使用
        const placeholderId = `immediate-${task.id}-${startedAt}-${i}`;
        agentIds.push(placeholderId);
      }
    }

    // 実行中タスクとして登録
    const runningInfo: RunningTaskInfo = {
      taskId: task.id,
      promptIndex: 0,
      agentId: agentIds[0] ?? `immediate-${task.id}-${startedAt}`,
      worktreePath: undefined,
    };
    this.runningTasks.set(task.id, runningInfo);

    const result: ExecutionResult = {
      taskId: task.id,
      startedAt,
      agentIds,
    };

    this.logger.info('[ScheduleTaskCoordinator] Task execution completed setup', {
      taskId: task.id,
      startedAt,
      agentCount: agentIds.length,
    });

    // コールバック呼び出し
    this.deps.onTaskStarted?.(task.id, result);

    // Task 2.5: Requirement 8.6 - worktreeはシステム的に放置（削除しない）

    return result;
  }

  /**
   * 実行中タスク取得
   */
  getRunningTasks(): readonly RunningTaskInfo[] {
    return Array.from(this.runningTasks.values());
  }

  // ============================================================
  // Cleanup
  // ============================================================

  /**
   * リソース解放
   */
  dispose(): void {
    this.stopScheduler();
    this.taskQueue = [];
    this.runningTasks.clear();
    this.cachedTasks = [];
    this.logger.info('[ScheduleTaskCoordinator] Disposed');
  }
}

// ============================================================
// Factory Function
// ============================================================

/**
 * ScheduleTaskCoordinatorを作成
 */
export function createScheduleTaskCoordinator(
  projectPath: string,
  deps: ScheduleTaskCoordinatorDeps
): ScheduleTaskCoordinator {
  return new ScheduleTaskCoordinator(projectPath, deps);
}
