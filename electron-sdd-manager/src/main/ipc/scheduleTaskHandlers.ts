/**
 * ScheduleTaskHandlers
 * Task 3.2: IPCハンドラを実装
 * Requirements: All IPC (design.md scheduleTaskHandlers API Contract)
 *
 * IPC handlers for schedule task operations:
 * - CRUD operations: get-all, get, create, update, delete
 * - Execution control: execute-immediately, get-queue, get-running
 * - Status events: status-changed
 */

import { ipcMain, BrowserWindow } from 'electron';
import { IPC_CHANNELS } from './channels';
import { getDefaultScheduleTaskService, type ScheduleTaskInput as ServiceScheduleTaskInput } from '../services/scheduleTaskService';
import { getDefaultScheduleTaskFileService } from '../services/scheduleTaskFileService';
import {
  createScheduleTaskCoordinator,
  type ScheduleTaskCoordinator,
  type QueuedTask as CoordinatorQueuedTask,
  type RunningTaskInfo as CoordinatorRunningTaskInfo,
  type ExecutionResult as CoordinatorExecutionResult,
} from '../services/scheduleTaskCoordinator';
import { logger } from '../services/logger';
import { setLastActivityTime, getIdleTimeMs as getIdleTimeMsFromTracker } from '../services/idleTimeTracker';
import { getClaudeCommand } from '../services/agentProcess';
import { buildClaudeArgs, SpecManagerService } from '../services/specManagerService';
import { WorktreeService } from '../services/worktreeService';
import type {
  StartScheduleAgentFn,
  CreateScheduleWorktreeFn,
  StartScheduleAgentOptions,
  CreateScheduleWorktreeOptions,
} from '../services/scheduleTaskCoordinator';
import type {
  ScheduleTask,
  ScheduleTaskInput,
  ScheduleTaskServiceError,
  TaskNotFoundError,
  ExecutionError,
  ExecutionResult,
  QueuedTask,
  RunningTaskInfo,
  ScheduleTaskGetAllRequest,
  ScheduleTaskGetRequest,
  ScheduleTaskCreateRequest,
  ScheduleTaskUpdateRequest,
  ScheduleTaskDeleteRequest,
  ScheduleTaskExecuteImmediatelyRequest,
  ScheduleTaskGetQueueRequest,
  ScheduleTaskGetRunningRequest,
  ScheduleTaskStatusEvent,
  AvoidanceTarget,
} from '../../shared/types/scheduleTask';

// ============================================================
// Types
// ============================================================

/** Result type for IPC responses */
type Result<T, E> = { ok: true; value: T } | { ok: false; error: E };

// ============================================================
// Type Conversion Helpers
// ============================================================

/**
 * Convert shared ScheduleTaskInput to service ScheduleTaskInput
 * Handles readonly array to mutable array conversion
 */
function toServiceInput(input: ScheduleTaskInput): ServiceScheduleTaskInput {
  // Deep clone to convert readonly arrays to mutable arrays
  return JSON.parse(JSON.stringify(input)) as ServiceScheduleTaskInput;
}

/**
 * Convert Partial<ScheduleTaskInput> to Partial<ServiceScheduleTaskInput>
 */
function toServicePartialInput(updates: Partial<ScheduleTaskInput>): Partial<ServiceScheduleTaskInput> {
  // Deep clone to convert readonly arrays to mutable arrays
  return JSON.parse(JSON.stringify(updates)) as Partial<ServiceScheduleTaskInput>;
}

/**
 * Convert coordinator QueuedTask to shared QueuedTask
 */
function toSharedQueuedTask(task: CoordinatorQueuedTask): QueuedTask {
  return {
    taskId: task.taskId,
    queuedAt: task.queuedAt,
    reason: task.reason,
  };
}

/**
 * Convert coordinator RunningTaskInfo to shared RunningTaskInfo
 */
function toSharedRunningTaskInfo(info: CoordinatorRunningTaskInfo): RunningTaskInfo {
  return {
    taskId: info.taskId,
    promptIndex: info.promptIndex,
    agentId: info.agentId,
    worktreePath: info.worktreePath,
  };
}

/**
 * Convert coordinator ExecutionResult to shared ExecutionResult
 */
function toSharedExecutionResult(result: CoordinatorExecutionResult): ExecutionResult {
  return {
    taskId: result.taskId,
    startedAt: result.startedAt,
    agentIds: [...result.agentIds], // Convert readonly to mutable
  };
}

// ============================================================
// Task 1.1: startScheduleAgentWrapper
// Requirements: 3.1, 3.2, 3.3, 3.4, 3.5
// ============================================================

/**
 * Create a wrapper function for starting schedule task agents
 * Uses SpecManagerService.startAgent with specId='' (project-level) and phase='schedule-{taskName}'
 *
 * @param projectPath - Current project path
 * @param specManagerService - SpecManagerService instance
 * @returns StartScheduleAgentFn function
 */
export function createStartScheduleAgentWrapper(
  _projectPath: string,
  specManagerService: SpecManagerService
): StartScheduleAgentFn {
  return async (options: StartScheduleAgentOptions) => {
    const { taskId, taskName, prompt, promptIndex, worktreePath } = options;

    logger.info('[ScheduleTaskHandlers] Starting schedule agent', {
      taskId,
      taskName,
      promptIndex,
      worktreePath,
    });

    try {
      // Requirement 3.2: specId='' for project-level agent, phase='schedule-{taskName}'
      const phase = `schedule-${taskName}`;

      // Requirement 3.3: Pass prompt via args using buildClaudeArgs
      const result = await specManagerService.startAgent({
        specId: '', // Project-level agent
        phase,
        command: getClaudeCommand(),
        args: buildClaudeArgs({ command: prompt }),
        prompt, // Store original prompt in agent metadata
        worktreeCwd: worktreePath, // Pass worktree path if workflow mode
      });

      if (result.ok) {
        // Requirement 3.4: Return agentId on success
        logger.info('[ScheduleTaskHandlers] Schedule agent started successfully', {
          taskId,
          agentId: result.value.agentId,
        });
        return {
          ok: true as const,
          value: { agentId: result.value.agentId },
        };
      } else {
        // Requirement 3.5: Error handling
        logger.error('[ScheduleTaskHandlers] Failed to start schedule agent', {
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
      // Requirement 3.5: Unexpected error handling
      const message = error instanceof Error ? error.message : String(error);
      logger.error('[ScheduleTaskHandlers] Unexpected error starting schedule agent', {
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
// Task 2.1: createScheduleWorktreeWrapper
// Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6
// ============================================================

/**
 * Convert task name to safe branch name
 * Replaces spaces with hyphens and converts to lowercase
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
 * Uses WorktreeService.createEntityWorktree with naming convention schedule/{task-name}/{suffix}
 *
 * @param projectPath - Current project path
 * @param worktreeService - WorktreeService instance
 * @returns CreateScheduleWorktreeFn function
 */
export function createScheduleWorktreeWrapper(
  projectPath: string,
  worktreeService: WorktreeService
): CreateScheduleWorktreeFn {
  return async (options: CreateScheduleWorktreeOptions) => {
    const { taskName, suffixMode, customSuffix, promptIndex } = options;

    // Requirement 4.2: Naming convention schedule/{task-name}/{suffix}
    const safeName = toSafeBranchName(taskName);
    const dateSuffix = generateDateSuffix();

    // Requirement 4.3 & 4.4: Generate suffix based on mode
    let suffix: string;
    if (suffixMode === 'custom' && customSuffix) {
      // Custom suffix + date
      suffix = `${customSuffix}-${dateSuffix}`;
    } else {
      // Auto: date only
      suffix = dateSuffix;
    }

    // Add promptIndex suffix for multi-prompt tasks (promptIndex > 0)
    if (promptIndex > 0) {
      suffix = `${suffix}-${promptIndex}`;
    }

    // Full worktree name: {task-name}/{suffix}
    const worktreeName = `${safeName}/${suffix}`;

    logger.info('[ScheduleTaskHandlers] Creating schedule worktree', {
      taskName,
      worktreeName,
      suffixMode,
      promptIndex,
    });

    try {
      // Requirement 4.1: Use WorktreeService
      const result = await worktreeService.createEntityWorktree('schedule', worktreeName);

      if (result.ok) {
        // Requirement 4.5: Return absolutePath on success
        const absolutePath = `${projectPath}/${result.value.path}`;
        logger.info('[ScheduleTaskHandlers] Schedule worktree created', {
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
        // Requirement 4.6: Error handling
        logger.error('[ScheduleTaskHandlers] Failed to create schedule worktree', {
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
      // Requirement 4.6: Unexpected error handling
      const message = error instanceof Error ? error.message : String(error);
      logger.error('[ScheduleTaskHandlers] Unexpected error creating schedule worktree', {
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
// Module State
// ============================================================

/** Current coordinator instance (project-specific) */
let scheduleTaskCoordinator: ScheduleTaskCoordinator | null = null;

/** Flag to track if handlers are registered */
let handlersRegistered = false;

// ============================================================
// Coordinator Lifecycle
// ============================================================

/**
 * Initialize ScheduleTaskCoordinator for a project
 * Called when project is selected
 *
 * Task 3.1: Dependency injection and scheduler auto-start
 * Requirements: 1.1, 1.3, 2.1, 3.1, 4.1
 *
 * @param projectPath - Project path to initialize coordinator for
 * @param specManagerService - Optional SpecManagerService for testing
 * @param worktreeService - Optional WorktreeService for testing
 */
export async function initScheduleTaskCoordinator(
  projectPath: string,
  specManagerService?: SpecManagerService,
  worktreeService?: WorktreeService
): Promise<void> {
  // Dispose existing coordinator if any (Requirement 1.3)
  disposeScheduleTaskCoordinator();

  const fileService = getDefaultScheduleTaskFileService();

  // Create service instances if not provided (for testing)
  const sms = specManagerService ?? new SpecManagerService(projectPath);
  const wts = worktreeService ?? new WorktreeService(projectPath);

  // Task 3.1: Create wrapper functions for dependency injection
  // Requirement 3.1: startScheduleAgent uses SpecManagerService.startAgent
  const startScheduleAgent = createStartScheduleAgentWrapper(projectPath, sms);
  // Requirement 4.1: createScheduleWorktree uses WorktreeService
  const createScheduleWorktree = createScheduleWorktreeWrapper(projectPath, wts);

  // Create coordinator with dependencies
  scheduleTaskCoordinator = createScheduleTaskCoordinator(projectPath, {
    // Requirement 2.1: getIdleTimeMs uses idleTimeTracker.getIdleTimeMs()
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
    // Task 3.1: Inject wrapper functions for Agent and Worktree operations
    // Requirement 3.1: startScheduleAgent for Agent execution
    startScheduleAgent,
    // Requirement 4.1: createScheduleWorktree for workflow mode
    createScheduleWorktree,
  });

  await scheduleTaskCoordinator.initialize();

  // Requirement 1.1: Call startScheduler() after initialize()
  scheduleTaskCoordinator.startScheduler();

  logger.info('[ScheduleTaskHandlers] Coordinator initialized and scheduler started', { projectPath });
}

/**
 * Dispose ScheduleTaskCoordinator
 * Called when project is changed or app is closing
 */
export function disposeScheduleTaskCoordinator(): void {
  if (scheduleTaskCoordinator) {
    scheduleTaskCoordinator.dispose();
    scheduleTaskCoordinator = null;
    logger.info('[ScheduleTaskHandlers] Coordinator disposed');
  }
}

/**
 * Get the current ScheduleTaskCoordinator (for testing)
 */
export function getScheduleTaskCoordinator(): ScheduleTaskCoordinator | null {
  return scheduleTaskCoordinator;
}

// ============================================================
// Event Broadcasting
// ============================================================

/**
 * Broadcast status event to all Renderer windows
 * @param event - Status event to broadcast
 */
function broadcastStatusEvent(event: ScheduleTaskStatusEvent): void {
  const windows = BrowserWindow.getAllWindows();

  for (const window of windows) {
    if (!window.isDestroyed()) {
      window.webContents.send(IPC_CHANNELS.SCHEDULE_TASK_STATUS_CHANGED, event);
    }
  }

  logger.debug('[ScheduleTaskHandlers] Status event broadcasted', { event });
}

// ============================================================
// Handler Registration
// ============================================================

/**
 * Register all schedule task IPC handlers
 * @param _getCurrentProjectPath - Function to get current project path (reserved for future use)
 */
export function registerScheduleTaskHandlers(_getCurrentProjectPath: () => string | null): void {
  if (handlersRegistered) {
    logger.warn('[ScheduleTaskHandlers] Handlers already registered');
    return;
  }

  const service = getDefaultScheduleTaskService();

  // ============================================================
  // Idle Time Sync Handler (Task 7.1)
  // Requirements: 4.3
  // ============================================================

  // REPORT_IDLE_TIME: Receive last activity time from Renderer
  ipcMain.handle(
    IPC_CHANNELS.SCHEDULE_TASK_REPORT_IDLE_TIME,
    async (_event, lastActivityTime: number): Promise<void> => {
      logger.debug('[ScheduleTaskHandlers] SCHEDULE_TASK_REPORT_IDLE_TIME', {
        lastActivityTime,
        idleMs: Date.now() - lastActivityTime,
      });
      setLastActivityTime(lastActivityTime);
    }
  );

  // ============================================================
  // CRUD Handlers
  // ============================================================

  // GET_ALL: Get all tasks for a project
  ipcMain.handle(
    IPC_CHANNELS.SCHEDULE_TASK_GET_ALL,
    async (_event, params: ScheduleTaskGetAllRequest): Promise<ScheduleTask[]> => {
      logger.debug('[ScheduleTaskHandlers] SCHEDULE_TASK_GET_ALL', { projectPath: params.projectPath });
      return service.getAllTasks(params.projectPath);
    }
  );

  // GET: Get a single task by ID
  ipcMain.handle(
    IPC_CHANNELS.SCHEDULE_TASK_GET,
    async (_event, params: ScheduleTaskGetRequest): Promise<ScheduleTask | null> => {
      logger.debug('[ScheduleTaskHandlers] SCHEDULE_TASK_GET', { projectPath: params.projectPath, taskId: params.taskId });
      return service.getTask(params.projectPath, params.taskId);
    }
  );

  // CREATE: Create a new task
  ipcMain.handle(
    IPC_CHANNELS.SCHEDULE_TASK_CREATE,
    async (_event, params: ScheduleTaskCreateRequest): Promise<Result<ScheduleTask, ScheduleTaskServiceError>> => {
      logger.debug('[ScheduleTaskHandlers] SCHEDULE_TASK_CREATE', { projectPath: params.projectPath, taskName: params.task.name });
      return service.createTask(params.projectPath, toServiceInput(params.task));
    }
  );

  // UPDATE: Update an existing task
  ipcMain.handle(
    IPC_CHANNELS.SCHEDULE_TASK_UPDATE,
    async (_event, params: ScheduleTaskUpdateRequest): Promise<Result<ScheduleTask, ScheduleTaskServiceError>> => {
      logger.debug('[ScheduleTaskHandlers] SCHEDULE_TASK_UPDATE', { projectPath: params.projectPath, taskId: params.taskId });
      return service.updateTask(params.projectPath, params.taskId, toServicePartialInput(params.updates));
    }
  );

  // DELETE: Delete a task
  ipcMain.handle(
    IPC_CHANNELS.SCHEDULE_TASK_DELETE,
    async (_event, params: ScheduleTaskDeleteRequest): Promise<Result<void, TaskNotFoundError>> => {
      logger.debug('[ScheduleTaskHandlers] SCHEDULE_TASK_DELETE', { projectPath: params.projectPath, taskId: params.taskId });
      return service.deleteTask(params.projectPath, params.taskId);
    }
  );

  // ============================================================
  // Execution Control Handlers
  // ============================================================

  // EXECUTE_IMMEDIATELY: Execute a task immediately
  // Method: executeProjectAgent, startAgent (via coordinator)
  ipcMain.handle(
    IPC_CHANNELS.SCHEDULE_TASK_EXECUTE_IMMEDIATELY,
    async (_event, params: ScheduleTaskExecuteImmediatelyRequest): Promise<Result<ExecutionResult, ExecutionError>> => {
      logger.info('[ScheduleTaskHandlers] SCHEDULE_TASK_EXECUTE_IMMEDIATELY', {
        projectPath: params.projectPath,
        taskId: params.taskId,
        force: params.force,
      });

      // Check if coordinator is initialized for this project
      if (!scheduleTaskCoordinator) {
        // Initialize coordinator if needed
        await initScheduleTaskCoordinator(params.projectPath);
      }

      if (!scheduleTaskCoordinator) {
        return {
          ok: false,
          error: { type: 'AGENT_START_FAILED', message: 'Coordinator not initialized' },
        };
      }

      const result = await scheduleTaskCoordinator.executeImmediately(params.taskId, params.force);

      if (result.ok) {
        return {
          ok: true,
          value: toSharedExecutionResult(result.value),
        };
      }

      // Convert coordinator error to shared error type
      const error = result.error;
      if (error.type === 'AVOIDANCE_CONFLICT') {
        return {
          ok: false,
          error: {
            type: 'AVOIDANCE_CONFLICT',
            conflictType: error.conflictType as AvoidanceTarget,
          },
        };
      }

      return {
        ok: false,
        error: error as ExecutionError,
      };
    }
  );

  // GET_QUEUE: Get queued tasks
  ipcMain.handle(
    IPC_CHANNELS.SCHEDULE_TASK_GET_QUEUE,
    async (_event, _params: ScheduleTaskGetQueueRequest): Promise<QueuedTask[]> => {
      logger.debug('[ScheduleTaskHandlers] SCHEDULE_TASK_GET_QUEUE');

      if (!scheduleTaskCoordinator) {
        return [];
      }

      return scheduleTaskCoordinator.getQueuedTasks().map(toSharedQueuedTask);
    }
  );

  // GET_RUNNING: Get running tasks
  ipcMain.handle(
    IPC_CHANNELS.SCHEDULE_TASK_GET_RUNNING,
    async (_event, _params: ScheduleTaskGetRunningRequest): Promise<RunningTaskInfo[]> => {
      logger.debug('[ScheduleTaskHandlers] SCHEDULE_TASK_GET_RUNNING');

      if (!scheduleTaskCoordinator) {
        return [];
      }

      return scheduleTaskCoordinator.getRunningTasks().map(toSharedRunningTaskInfo);
    }
  );

  handlersRegistered = true;
  logger.info('[ScheduleTaskHandlers] IPC handlers registered');
}

/**
 * Unregister all schedule task IPC handlers
 * Called when cleaning up
 */
export function unregisterScheduleTaskHandlers(): void {
  if (!handlersRegistered) {
    return;
  }

  ipcMain.removeHandler(IPC_CHANNELS.SCHEDULE_TASK_REPORT_IDLE_TIME);
  ipcMain.removeHandler(IPC_CHANNELS.SCHEDULE_TASK_GET_ALL);
  ipcMain.removeHandler(IPC_CHANNELS.SCHEDULE_TASK_GET);
  ipcMain.removeHandler(IPC_CHANNELS.SCHEDULE_TASK_CREATE);
  ipcMain.removeHandler(IPC_CHANNELS.SCHEDULE_TASK_UPDATE);
  ipcMain.removeHandler(IPC_CHANNELS.SCHEDULE_TASK_DELETE);
  ipcMain.removeHandler(IPC_CHANNELS.SCHEDULE_TASK_EXECUTE_IMMEDIATELY);
  ipcMain.removeHandler(IPC_CHANNELS.SCHEDULE_TASK_GET_QUEUE);
  ipcMain.removeHandler(IPC_CHANNELS.SCHEDULE_TASK_GET_RUNNING);

  handlersRegistered = false;
  logger.info('[ScheduleTaskHandlers] IPC handlers unregistered');
}
