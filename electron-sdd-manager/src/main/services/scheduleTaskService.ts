/**
 * Schedule Task Service
 * Handles CRUD operations for schedule tasks with validation
 * schedule-task-execution feature
 * Requirements: 2.4, 9.3
 */

import { v4 as uuidv4 } from 'uuid';
import type {
  ValidationError,
  TaskNotFoundError,
  ConsistencyResult,
  ScheduleTaskServiceError,
} from '../../shared/types/scheduleTask';
import { ScheduleTaskInputSchema } from '../../shared/types/scheduleTask';
import type {
  ScheduleTask,
  ScheduleTasksFile,
  ScheduleTaskFileService as IScheduleTaskFileService,
} from './scheduleTaskFileService';
import { getDefaultScheduleTaskFileService } from './scheduleTaskFileService';
import type { Result } from '../../renderer/types';

/**
 * Input type for creating/updating tasks (matches file service types)
 * Requirements: 2.4
 */
export type ScheduleTaskInput = Omit<ScheduleTask, 'id' | 'lastExecutedAt' | 'createdAt' | 'updatedAt'>;

/**
 * Schedule Task Service Interface
 * Requirements: 2.4, 9.3
 */
export interface ScheduleTaskServiceInterface {
  createTask(
    projectPath: string,
    task: ScheduleTaskInput
  ): Promise<Result<ScheduleTask, ScheduleTaskServiceError>>;

  updateTask(
    projectPath: string,
    taskId: string,
    updates: Partial<ScheduleTaskInput>
  ): Promise<Result<ScheduleTask, ScheduleTaskServiceError>>;

  deleteTask(
    projectPath: string,
    taskId: string
  ): Promise<Result<void, TaskNotFoundError>>;

  getTask(projectPath: string, taskId: string): Promise<ScheduleTask | null>;

  getAllTasks(projectPath: string): Promise<ScheduleTask[]>;

  validateConsistency(projectPath: string): Promise<ConsistencyResult>;
}

/**
 * Schedule Task Service Implementation
 * Requirements: 2.4, 9.3
 */
export class ScheduleTaskService implements ScheduleTaskServiceInterface {
  private fileService: IScheduleTaskFileService;

  constructor(fileService?: IScheduleTaskFileService) {
    this.fileService = fileService ?? getDefaultScheduleTaskFileService();
  }

  /**
   * Create a new schedule task
   * Requirements: 2.4
   * - Validates input with Zod schema
   * - Checks task name uniqueness
   * - Generates UUID and timestamps
   */
  async createTask(
    projectPath: string,
    task: ScheduleTaskInput
  ): Promise<Result<ScheduleTask, ScheduleTaskServiceError>> {
    // Validate input with Zod
    const validationResult = this.validateInput(task);
    if (!validationResult.ok) {
      return validationResult;
    }

    // Read existing tasks
    const tasksFile = await this.fileService.readTasks(projectPath);

    // Check for duplicate name
    if (this.isDuplicateName(tasksFile.tasks, task.name)) {
      return {
        ok: false,
        error: {
          type: 'DUPLICATE_TASK_NAME',
          taskName: task.name,
        },
      };
    }

    // Create new task with generated fields
    const now = Date.now();
    const newTask: ScheduleTask = {
      id: uuidv4(),
      name: task.name,
      enabled: task.enabled,
      schedule: task.schedule,
      prompts: [...task.prompts],
      avoidance: { ...task.avoidance, targets: [...task.avoidance.targets] },
      workflow: { ...task.workflow },
      behavior: task.behavior,
      lastExecutedAt: null,
      createdAt: now,
      updatedAt: now,
    };

    // Save to file
    const updatedTasks: ScheduleTasksFile = {
      version: 1,
      tasks: [...tasksFile.tasks, newTask],
    };
    await this.fileService.writeTasks(projectPath, updatedTasks);

    return { ok: true, value: newTask };
  }

  /**
   * Update an existing schedule task
   * Requirements: 2.4
   * - Validates partial input
   * - Checks task name uniqueness (excluding self)
   * - Updates timestamp
   */
  async updateTask(
    projectPath: string,
    taskId: string,
    updates: Partial<ScheduleTaskInput>
  ): Promise<Result<ScheduleTask, ScheduleTaskServiceError>> {
    // Read existing tasks
    const tasksFile = await this.fileService.readTasks(projectPath);
    const taskIndex = tasksFile.tasks.findIndex((t) => t.id === taskId);

    if (taskIndex === -1) {
      return {
        ok: false,
        error: {
          type: 'TASK_NOT_FOUND',
          taskId,
        },
      };
    }

    const existingTask = tasksFile.tasks[taskIndex];

    // Merge updates with existing task
    const mergedInput: ScheduleTaskInput = {
      name: updates.name ?? existingTask.name,
      enabled: updates.enabled ?? existingTask.enabled,
      schedule: updates.schedule ?? existingTask.schedule,
      prompts: updates.prompts ?? existingTask.prompts,
      avoidance: updates.avoidance ?? existingTask.avoidance,
      workflow: updates.workflow ?? existingTask.workflow,
      behavior: updates.behavior ?? existingTask.behavior,
    };

    // Validate merged input
    const validationResult = this.validateInput(mergedInput);
    if (!validationResult.ok) {
      return validationResult;
    }

    // Check for duplicate name (excluding current task)
    if (
      updates.name !== undefined &&
      updates.name !== existingTask.name &&
      this.isDuplicateName(tasksFile.tasks, updates.name, taskId)
    ) {
      return {
        ok: false,
        error: {
          type: 'DUPLICATE_TASK_NAME',
          taskName: updates.name,
        },
      };
    }

    // Create updated task
    const updatedTask: ScheduleTask = {
      ...existingTask,
      ...mergedInput,
      id: existingTask.id, // Preserve ID
      lastExecutedAt: existingTask.lastExecutedAt, // Preserve lastExecutedAt
      createdAt: existingTask.createdAt, // Preserve createdAt
      updatedAt: Date.now(), // Update timestamp
    };

    // Save to file
    const updatedTasks = [...tasksFile.tasks];
    updatedTasks[taskIndex] = updatedTask;
    await this.fileService.writeTasks(projectPath, {
      version: 1,
      tasks: updatedTasks,
    });

    return { ok: true, value: updatedTask };
  }

  /**
   * Delete a schedule task
   * Requirements: 2.4
   */
  async deleteTask(
    projectPath: string,
    taskId: string
  ): Promise<Result<void, TaskNotFoundError>> {
    // Read existing tasks
    const tasksFile = await this.fileService.readTasks(projectPath);
    const taskIndex = tasksFile.tasks.findIndex((t) => t.id === taskId);

    if (taskIndex === -1) {
      return {
        ok: false,
        error: {
          type: 'TASK_NOT_FOUND',
          taskId,
        },
      };
    }

    // Remove task
    const updatedTasks = tasksFile.tasks.filter((t) => t.id !== taskId);
    await this.fileService.writeTasks(projectPath, {
      version: 1,
      tasks: updatedTasks,
    });

    return { ok: true, value: undefined };
  }

  /**
   * Get a single task by ID
   * Requirements: 2.4
   */
  async getTask(projectPath: string, taskId: string): Promise<ScheduleTask | null> {
    const tasksFile = await this.fileService.readTasks(projectPath);
    return tasksFile.tasks.find((t) => t.id === taskId) ?? null;
  }

  /**
   * Get all tasks for a project
   * Requirements: 2.4
   */
  async getAllTasks(projectPath: string): Promise<ScheduleTask[]> {
    const tasksFile = await this.fileService.readTasks(projectPath);
    return [...tasksFile.tasks];
  }

  /**
   * Validate consistency of schedule tasks file
   * Requirements: 9.3
   * - Check for duplicate task names
   * - Check for duplicate task IDs
   */
  async validateConsistency(projectPath: string): Promise<ConsistencyResult> {
    const tasksFile = await this.fileService.readTasks(projectPath);
    const issues: string[] = [];

    // Check for duplicate names
    const nameCount = new Map<string, number>();
    for (const task of tasksFile.tasks) {
      nameCount.set(task.name, (nameCount.get(task.name) ?? 0) + 1);
    }
    for (const [name, count] of nameCount) {
      if (count > 1) {
        issues.push(`Duplicate task name: "${name}" appears ${count} times`);
      }
    }

    // Check for duplicate IDs
    const idCount = new Map<string, number>();
    for (const task of tasksFile.tasks) {
      idCount.set(task.id, (idCount.get(task.id) ?? 0) + 1);
    }
    for (const [id, count] of idCount) {
      if (count > 1) {
        issues.push(`Duplicate task ID: "${id}" appears ${count} times`);
      }
    }

    if (issues.length === 0) {
      return { isConsistent: true };
    }

    return {
      isConsistent: false,
      issues,
    };
  }

  /**
   * Validate input with Zod schema
   */
  private validateInput(
    input: ScheduleTaskInput
  ): Result<void, ValidationError> {
    const result = ScheduleTaskInputSchema.safeParse(input);

    if (!result.success) {
      const errors = result.error.errors.map((err) => ({
        field: err.path.join('.'),
        message: err.message,
      }));

      return {
        ok: false,
        error: {
          type: 'VALIDATION_ERROR',
          errors,
        },
      };
    }

    return { ok: true, value: undefined };
  }

  /**
   * Check if a task name already exists
   * @param tasks - Existing tasks
   * @param name - Name to check
   * @param excludeId - Task ID to exclude from check (for updates)
   */
  private isDuplicateName(
    tasks: readonly ScheduleTask[],
    name: string,
    excludeId?: string
  ): boolean {
    return tasks.some((t) => t.name === name && t.id !== excludeId);
  }
}

/** Default service instance */
let defaultService: ScheduleTaskService | null = null;

/**
 * Get the default ScheduleTaskService instance
 */
export function getDefaultScheduleTaskService(): ScheduleTaskService {
  if (!defaultService) {
    defaultService = new ScheduleTaskService();
  }
  return defaultService;
}
