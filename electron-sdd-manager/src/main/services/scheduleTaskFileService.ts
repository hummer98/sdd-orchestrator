/**
 * Schedule Task File Service
 * Requirements: 9.1, 9.4
 *
 * Task 2.1: ファイル永続化サービスを実装
 * - `.kiro/schedule-tasks.json`の読み書き機能を実装
 * - ファイルが存在しない場合のデフォルト値生成
 * - アトミックな書き込み処理（一時ファイル経由）
 * - 最終実行開始時間の更新機能
 */

import { readFile, writeFile, mkdir, rename, unlink } from 'fs/promises';
import { join } from 'path';

// ============================================================
// Type Definitions for Schedule Task
// These will be moved to src/shared/types/scheduleTask.ts in Task 1.1
// Defined locally for Task 2.1 implementation independence
// ============================================================

/**
 * スケジュール条件（Union型）
 * Requirements: 3.1, 3.2, 4.1
 */
export type ScheduleCondition =
  | { type: 'interval'; hoursInterval: number; waitForIdle: boolean }
  | { type: 'weekly'; weekdays: number[]; hourOfDay: number; waitForIdle: boolean }
  | { type: 'idle'; idleMinutes: number };

/**
 * プロンプト
 * Requirements: 5.1
 */
export interface Prompt {
  order: number;
  content: string;
}

/**
 * 回避ルール
 * Requirements: 6.1, 6.2
 */
export interface AvoidanceRule {
  targets: AvoidanceTarget[];
  behavior: AvoidanceBehavior;
}

export type AvoidanceTarget = 'spec-merge' | 'commit' | 'bug-merge' | 'schedule-task';
export type AvoidanceBehavior = 'wait' | 'skip';

/**
 * workflowモード設定
 * Requirements: 8.1, 8.4
 */
export interface WorkflowConfig {
  enabled: boolean;
  suffixMode?: 'auto' | 'custom';
  customSuffix?: string;
}

/**
 * 他Agent動作中の挙動
 */
export type AgentBehavior = 'wait' | 'skip';

/**
 * スケジュールタスク定義
 * Requirements: 全体
 */
export interface ScheduleTask {
  id: string;
  name: string;
  enabled: boolean;
  schedule: ScheduleCondition;
  prompts: Prompt[];
  avoidance: AvoidanceRule;
  workflow: WorkflowConfig;
  behavior: AgentBehavior;
  lastExecutedAt: number | null;
  createdAt: number;
  updatedAt: number;
}

/**
 * スケジュールタスクファイル構造
 * Requirements: 9.1
 */
export interface ScheduleTasksFile {
  version: 1;
  tasks: ScheduleTask[];
}

// ============================================================
// Service Interface
// ============================================================

/**
 * ScheduleTaskFileService Interface
 * Requirements: 9.1, 9.4
 */
export interface ScheduleTaskFileService {
  /**
   * Read tasks from schedule-tasks.json
   * Returns default empty structure if file doesn't exist
   * Requirements: 9.1
   */
  readTasks(projectPath: string): Promise<ScheduleTasksFile>;

  /**
   * Write tasks to schedule-tasks.json
   * Uses atomic write (temp file + rename) to prevent corruption
   * Requirements: 9.1
   */
  writeTasks(projectPath: string, tasks: ScheduleTasksFile): Promise<void>;

  /**
   * Update lastExecutedAt for a specific task
   * Requirements: 9.4
   */
  updateLastExecutedAt(
    projectPath: string,
    taskId: string,
    timestamp: number
  ): Promise<void>;
}

// ============================================================
// Constants
// ============================================================

/** Schedule tasks file name within .kiro directory */
export const SCHEDULE_TASKS_FILE_NAME = 'schedule-tasks.json';

/** .kiro directory name */
const KIRO_DIR = '.kiro';

/**
 * Default empty schedule tasks file structure
 */
function createDefaultScheduleTasksFile(): ScheduleTasksFile {
  return {
    version: 1,
    tasks: [],
  };
}

/**
 * Get the path to schedule-tasks.json
 * @param projectPath - Project root directory
 * @returns Full path to the schedule tasks file
 */
function getScheduleTasksPath(projectPath: string): string {
  return join(projectPath, KIRO_DIR, SCHEDULE_TASKS_FILE_NAME);
}

/**
 * Get the path to temporary schedule-tasks.json for atomic write
 * Uses unique suffix to prevent race conditions during parallel writes
 * @param projectPath - Project root directory
 * @returns Full path to a unique temporary file
 */
function getTempScheduleTasksPath(projectPath: string): string {
  const uniqueSuffix = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  return join(projectPath, KIRO_DIR, `.${SCHEDULE_TASKS_FILE_NAME}.${uniqueSuffix}.tmp`);
}

// ============================================================
// Implementation
// ============================================================

class ScheduleTaskFileServiceImpl implements ScheduleTaskFileService {
  /**
   * Read tasks from schedule-tasks.json
   * Requirements: 9.1
   */
  async readTasks(projectPath: string): Promise<ScheduleTasksFile> {
    const filePath = getScheduleTasksPath(projectPath);

    try {
      const content = await readFile(filePath, 'utf-8');

      // Handle empty file
      if (!content.trim()) {
        return createDefaultScheduleTasksFile();
      }

      const parsed = JSON.parse(content) as ScheduleTasksFile;
      return parsed;
    } catch (error) {
      // File doesn't exist or is invalid - return default
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        return createDefaultScheduleTasksFile();
      }

      // JSON parse error or other - return default
      if (error instanceof SyntaxError) {
        return createDefaultScheduleTasksFile();
      }

      // For other errors, return default as well
      return createDefaultScheduleTasksFile();
    }
  }

  /**
   * Write tasks to schedule-tasks.json
   * Uses atomic write (temp file + rename) to prevent corruption
   * Requirements: 9.1
   */
  async writeTasks(projectPath: string, tasks: ScheduleTasksFile): Promise<void> {
    const filePath = getScheduleTasksPath(projectPath);
    const tempPath = getTempScheduleTasksPath(projectPath);
    const kiroDir = join(projectPath, KIRO_DIR);

    // Ensure .kiro directory exists
    await mkdir(kiroDir, { recursive: true });

    // Serialize content
    const content = JSON.stringify(tasks, null, 2);

    try {
      // Write to temporary file first
      await writeFile(tempPath, content, 'utf-8');

      // Atomic rename (move temp file to final location)
      await rename(tempPath, filePath);
    } catch (error) {
      // Clean up temp file if it exists
      try {
        await unlink(tempPath);
      } catch {
        // Ignore cleanup errors
      }
      throw error;
    }
  }

  /**
   * Update lastExecutedAt for a specific task
   * Requirements: 9.4
   */
  async updateLastExecutedAt(
    projectPath: string,
    taskId: string,
    timestamp: number
  ): Promise<void> {
    const tasksFile = await this.readTasks(projectPath);

    // Find the task
    const taskIndex = tasksFile.tasks.findIndex((t) => t.id === taskId);

    // If task not found, silently return (no error)
    if (taskIndex === -1) {
      return;
    }

    // Update the timestamp
    tasksFile.tasks[taskIndex].lastExecutedAt = timestamp;

    // Write back
    await this.writeTasks(projectPath, tasksFile);
  }
}

// ============================================================
// Factory Function
// ============================================================

/**
 * Create a new ScheduleTaskFileService instance
 */
export function createScheduleTaskFileService(): ScheduleTaskFileService {
  return new ScheduleTaskFileServiceImpl();
}

/**
 * Default singleton instance
 */
let defaultInstance: ScheduleTaskFileService | null = null;

/**
 * Get the default ScheduleTaskFileService instance (singleton)
 */
export function getDefaultScheduleTaskFileService(): ScheduleTaskFileService {
  if (!defaultInstance) {
    defaultInstance = createScheduleTaskFileService();
  }
  return defaultInstance;
}
