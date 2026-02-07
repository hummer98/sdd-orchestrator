/**
 * Schedule Task Coordinator Setup Utilities
 * trpc-full-migration Task 10.7: scheduleTaskHandlers.tsからCoordinatorライフサイクル関数を分離
 *
 * Contains non-IPC utility functions previously in scheduleTaskHandlers.ts:
 * - initScheduleTaskCoordinator: Coordinator initialization for a project
 * - disposeScheduleTaskCoordinator: Coordinator cleanup
 * - getScheduleTaskCoordinator: Current coordinator accessor
 * - createStartScheduleAgentWrapper: Agent start wrapper for coordinator
 * - createScheduleWorktreeWrapper: Worktree creation wrapper for coordinator
 */

// BrowserWindow removed: all events now go through EventBus for tRPC Subscription
import { getDefaultScheduleTaskService } from './scheduleTaskService';
import { getDefaultScheduleTaskFileService } from './scheduleTaskFileService';
import {
  createScheduleTaskCoordinator,
  type ScheduleTaskCoordinator,
  type QueuedTask as CoordinatorQueuedTask,
  type ExecutionResult as CoordinatorExecutionResult,
} from './scheduleTaskCoordinator';
import { projectLogger as logger } from './projectLogger';
import { getGlobalEventBus } from '../trpc/services/globalEventBus';
import { EVENT_NAMES } from '../trpc/services/eventBus';
import { getIdleTimeMs as getIdleTimeMsFromTracker } from './idleTimeTracker';
import { buildClaudeArgs, SpecManagerService } from './specManagerService';
import { WorktreeService } from './worktreeService';
import type {
  StartScheduleAgentFn,
  CreateScheduleWorktreeFn,
  StartScheduleAgentOptions,
  CreateScheduleWorktreeOptions,
} from './scheduleTaskCoordinator';
import type {
  ScheduleTaskStatusEvent,
  AvoidanceTarget,
} from '../../shared/types/scheduleTask';

// ============================================================
// Module State
// ============================================================

/** Current coordinator instance (project-specific) */
let scheduleTaskCoordinator: ScheduleTaskCoordinator | null = null;

// ============================================================
// Agent Wrapper
// ============================================================

/**
 * Create a wrapper function for starting schedule task agents
 */
export function createStartScheduleAgentWrapper(
  _projectPath: string,
  specManagerService: SpecManagerService
): StartScheduleAgentFn {
  return async (options: StartScheduleAgentOptions) => {
    const { taskId, taskName, prompt, promptIndex, worktreePath } = options;

    logger.info('[scheduleTaskSetup] Starting schedule agent', {
      taskId,
      taskName,
      promptIndex,
      worktreePath,
    });

    try {
      const phase = `schedule-${taskName}`;

      const result = await specManagerService.startAgent({
        specId: '',
        phase,
        args: buildClaudeArgs({ command: prompt }),
        prompt,
        worktreeCwd: worktreePath,
        engineId: 'claude',
      });

      if (result.ok) {
        logger.info('[scheduleTaskSetup] Schedule agent started successfully', {
          taskId,
          agentId: result.value.agentId,
        });
        return {
          ok: true as const,
          value: { agentId: result.value.agentId },
        };
      } else {
        logger.error('[scheduleTaskSetup] Failed to start schedule agent', {
          taskId,
          error: result.error,
        });
        return {
          ok: false as const,
          error: {
            type: result.error.type,
            message: 'message' in result.error ? result.error.message : `Agent start failed: ${result.error.type}`,
          },
        };
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      logger.error('[scheduleTaskSetup] Unexpected error starting schedule agent', {
        taskId,
        error: message,
      });
      return {
        ok: false as const,
        error: { type: 'AGENT_START_FAILED', message },
      };
    }
  };
}

// ============================================================
// Worktree Wrapper
// ============================================================

/**
 * Convert task name to safe branch name
 */
function toSafeBranchName(name: string): string {
  return name.toLowerCase().replace(/\s+/g, '-');
}

/**
 * Generate date suffix in YYYYMMDD-HHmmss format
 */
function generateDateSuffix(): string {
  const now = new Date();
  const year = now.getUTCFullYear();
  const month = String(now.getUTCMonth() + 1).padStart(2, '0');
  const day = String(now.getUTCDate()).padStart(2, '0');
  const hours = String(now.getUTCHours()).padStart(2, '0');
  const minutes = String(now.getUTCMinutes()).padStart(2, '0');
  const seconds = String(now.getUTCSeconds()).padStart(2, '0');
  return `${year}${month}${day}-${hours}${minutes}${seconds}`;
}

/**
 * Create a wrapper function for creating schedule task worktrees
 */
export function createScheduleWorktreeWrapper(
  projectPath: string,
  worktreeService: WorktreeService
): CreateScheduleWorktreeFn {
  return async (options: CreateScheduleWorktreeOptions) => {
    const { taskName, suffixMode, customSuffix, promptIndex } = options;

    const safeName = toSafeBranchName(taskName);
    const dateSuffix = generateDateSuffix();

    let suffix: string;
    if (suffixMode === 'custom' && customSuffix) {
      suffix = `${customSuffix}-${dateSuffix}`;
    } else {
      suffix = dateSuffix;
    }

    if (promptIndex > 0) {
      suffix = `${suffix}-${promptIndex}`;
    }

    const worktreeName = `${safeName}/${suffix}`;

    logger.info('[scheduleTaskSetup] Creating schedule worktree', {
      taskName,
      worktreeName,
      suffixMode,
      promptIndex,
    });

    try {
      const result = await worktreeService.createEntityWorktree('schedule', worktreeName);

      if (result.ok) {
        const absolutePath = `${projectPath}/${result.value.path}`;
        logger.info('[scheduleTaskSetup] Schedule worktree created', {
          taskName,
          worktreeName,
          absolutePath,
        });
        return {
          ok: true as const,
          value: {
            path: result.value.path,
            absolutePath,
            branch: result.value.branch,
            created_at: result.value.created_at,
          },
        };
      } else {
        logger.error('[scheduleTaskSetup] Failed to create schedule worktree', {
          taskName,
          error: result.error,
        });
        return {
          ok: false as const,
          error: {
            type: 'WORKTREE_ERROR',
            message: 'message' in result.error ? result.error.message : `Worktree creation failed: ${result.error.type}`,
          },
        };
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      logger.error('[scheduleTaskSetup] Unexpected error creating schedule worktree', {
        taskName,
        error: message,
      });
      return {
        ok: false as const,
        error: { type: 'WORKTREE_ERROR', message },
      };
    }
  };
}

// ============================================================
// Event Broadcasting
// ============================================================

/**
 * Broadcast status event via EventBus for tRPC Subscription
 */
function broadcastStatusEvent(event: ScheduleTaskStatusEvent): void {
  // Emit to EventBus for tRPC Subscription (primary path after IPC removal)
  getGlobalEventBus().emit(EVENT_NAMES.SCHEDULE_TASK_STATUS_CHANGED, event);

  logger.debug('[scheduleTaskSetup] Status event broadcasted', { event });
}

// ============================================================
// Coordinator Lifecycle
// ============================================================

/**
 * Initialize ScheduleTaskCoordinator for a project
 * Called when project is selected
 */
export async function initScheduleTaskCoordinator(
  projectPath: string,
  specManagerService?: SpecManagerService,
  worktreeService?: WorktreeService
): Promise<void> {
  // Dispose existing coordinator if any
  disposeScheduleTaskCoordinator();

  const fileService = getDefaultScheduleTaskFileService();

  const sms = specManagerService ?? new SpecManagerService(projectPath);
  const wts = worktreeService ?? new WorktreeService(projectPath);

  const startScheduleAgent = createStartScheduleAgentWrapper(projectPath, sms);
  const createScheduleWorktree = createScheduleWorktreeWrapper(projectPath, wts);

  scheduleTaskCoordinator = createScheduleTaskCoordinator(projectPath, {
    getIdleTimeMs: () => getIdleTimeMsFromTracker(),
    getAllTasks: async (path: string) => {
      const service = getDefaultScheduleTaskService();
      return service.getAllTasks(path);
    },
    updateLastExecutedAt: async (path: string, taskId: string, timestamp: number) => {
      await fileService.updateLastExecutedAt(path, taskId, timestamp);
    },
    onTaskQueued: (task: CoordinatorQueuedTask) => {
      broadcastStatusEvent({
        type: 'task-queued',
        timestamp: Date.now(),
        taskId: task.taskId,
        reason: task.reason,
      });
    },
    onTaskStarted: (taskId: string, result: CoordinatorExecutionResult) => {
      broadcastStatusEvent({
        type: 'task-started',
        timestamp: Date.now(),
        taskId,
        agentIds: [...result.agentIds],
      });
    },
    onTaskCompleted: (taskId: string) => {
      broadcastStatusEvent({
        type: 'task-completed',
        timestamp: Date.now(),
        taskId,
        success: true,
      });
    },
    onTaskSkipped: (taskId: string, _reason: string) => {
      broadcastStatusEvent({
        type: 'task-skipped',
        timestamp: Date.now(),
        taskId,
        reason: 'avoidance',
      });
    },
    onAvoidanceWaiting: (taskId: string, conflictType) => {
      broadcastStatusEvent({
        type: 'avoidance-waiting',
        timestamp: Date.now(),
        taskId,
        conflictType: conflictType as AvoidanceTarget,
      });
    },
    logger,
    startScheduleAgent,
    createScheduleWorktree,
  });

  await scheduleTaskCoordinator.initialize();

  scheduleTaskCoordinator.startScheduler();

  logger.info('[scheduleTaskSetup] Coordinator initialized and scheduler started', { projectPath });
}

/**
 * Dispose ScheduleTaskCoordinator
 * Called when project is changed or app is closing
 */
export function disposeScheduleTaskCoordinator(): void {
  if (scheduleTaskCoordinator) {
    scheduleTaskCoordinator.dispose();
    scheduleTaskCoordinator = null;
    logger.info('[scheduleTaskSetup] Coordinator disposed');
  }
}

/**
 * Get the current ScheduleTaskCoordinator (for testing)
 */
export function getScheduleTaskCoordinator(): ScheduleTaskCoordinator | null {
  return scheduleTaskCoordinator;
}
