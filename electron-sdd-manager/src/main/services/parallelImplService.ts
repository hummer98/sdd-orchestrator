/**
 * ParallelImplService
 * parallel-task-impl: Task 3.1-3.6
 *
 * Manages parallel implementation execution state.
 * Tracks task groups, their execution status, and coordinates parallel task execution.
 * Requirements: 4.1-4.5
 */

import type { ParseResult } from './taskParallelParser';

// =============================================================================
// Types
// =============================================================================

/**
 * Execution status for individual tasks
 */
export type TaskStatus = 'pending' | 'running' | 'completed' | 'failed';

/**
 * Execution status for the overall parallel execution
 */
export type ExecutionStatus = 'pending' | 'running' | 'completed' | 'error';

/**
 * State for a single task's execution
 * Requirements: 4.3, 4.4, 4.5
 */
export interface TaskExecutionState {
  /** Task ID (e.g., "1.1", "2.3") */
  readonly taskId: string;
  /** Current execution status */
  status: TaskStatus;
  /** Agent ID executing this task (set when running) */
  agentId: string | null;
  /** Start time (ms since epoch) */
  startTime: number | null;
  /** End time (ms since epoch) */
  endTime: number | null;
  /** Error message if failed */
  error: string | null;
}

/**
 * Execution state for a group of tasks
 * Requirements: 4.2
 */
export interface ParallelExecutionGroup {
  /** Group index (0-based) */
  readonly groupIndex: number;
  /** Tasks in this group with their execution states */
  tasks: TaskExecutionState[];
  /** Whether this group can be executed in parallel */
  readonly isParallel: boolean;
}

/**
 * Overall execution state for a spec's parallel implementation
 * Requirements: 4.1
 */
export interface ParallelExecutionState {
  /** Spec ID */
  readonly specId: string;
  /** Overall execution status */
  status: ExecutionStatus;
  /** Groups with execution states */
  groups: ParallelExecutionGroup[];
  /** Current group index being executed */
  currentGroupIndex: number;
  /** When execution started */
  startTime: number | null;
  /** When execution completed/failed */
  endTime: number | null;
}

// =============================================================================
// Service Implementation
// =============================================================================

/**
 * ParallelImplService
 *
 * Manages parallel task execution state for specs.
 * Provides methods to initialize state from parse results,
 * track task execution, and query execution status.
 */
export class ParallelImplService {
  private states: Map<string, ParallelExecutionState> = new Map();

  /**
   * Initialize execution state from a ParseResult
   * Requirements: 4.1
   *
   * @param specId - Spec identifier
   * @param parseResult - Result from parsing tasks.md
   * @returns Initialized ParallelExecutionState
   */
  initializeFromParseResult(
    specId: string,
    parseResult: ParseResult
  ): ParallelExecutionState {
    const groups: ParallelExecutionGroup[] = parseResult.groups.map((group) => ({
      groupIndex: group.groupIndex,
      isParallel: group.isParallel,
      tasks: group.tasks.map((task) => ({
        taskId: task.id,
        status: task.completed ? 'completed' as TaskStatus : 'pending' as TaskStatus,
        agentId: null,
        startTime: null,
        endTime: null,
        error: null,
      })),
    }));

    const state: ParallelExecutionState = {
      specId,
      status: 'pending',
      groups,
      currentGroupIndex: 0,
      startTime: null,
      endTime: null,
    };

    this.states.set(specId, state);
    return state;
  }

  /**
   * Get the current execution state for a spec
   *
   * @param specId - Spec identifier
   * @returns ParallelExecutionState or null if not initialized
   */
  getState(specId: string): ParallelExecutionState | null {
    return this.states.get(specId) ?? null;
  }

  /**
   * Get the next pending group to execute
   * Requirements: 4.2
   *
   * @param specId - Spec identifier
   * @returns Next pending group or null if all groups are completed
   */
  getNextPendingGroup(specId: string): ParallelExecutionGroup | null {
    const state = this.states.get(specId);
    if (!state) {
      return null;
    }

    // Find the first group starting from currentGroupIndex that has pending tasks
    for (let i = state.currentGroupIndex; i < state.groups.length; i++) {
      const group = state.groups[i];
      const hasPendingTasks = group.tasks.some(
        (t) => t.status === 'pending' || t.status === 'running'
      );
      if (hasPendingTasks) {
        return group;
      }
    }

    return null;
  }

  /**
   * Mark a task as running with associated agent ID
   * Requirements: 4.3
   *
   * @param specId - Spec identifier
   * @param taskId - Task identifier (e.g., "1.1")
   * @param agentId - Agent ID executing the task
   */
  markTaskRunning(specId: string, taskId: string, agentId: string): void {
    const state = this.states.get(specId);
    if (!state) {
      return;
    }

    // Update overall state to running if not already
    if (state.status === 'pending') {
      state.status = 'running';
      state.startTime = Date.now();
    }

    // Find and update the task
    for (const group of state.groups) {
      const task = group.tasks.find((t) => t.taskId === taskId);
      if (task) {
        task.status = 'running';
        task.agentId = agentId;
        task.startTime = Date.now();
        break;
      }
    }
  }

  /**
   * Mark a task as completed
   * Requirements: 4.4
   *
   * @param specId - Spec identifier
   * @param taskId - Task identifier
   */
  markTaskCompleted(specId: string, taskId: string): void {
    const state = this.states.get(specId);
    if (!state) {
      return;
    }

    // Find and update the task
    for (const group of state.groups) {
      const task = group.tasks.find((t) => t.taskId === taskId);
      if (task) {
        task.status = 'completed';
        task.endTime = Date.now();
        break;
      }
    }

    // Check if current group is completed and advance if so
    this.checkAndAdvanceGroup(specId);
  }

  /**
   * Mark a task as failed
   * Requirements: 4.5
   *
   * @param specId - Spec identifier
   * @param taskId - Task identifier
   * @param error - Error message
   */
  markTaskFailed(specId: string, taskId: string, error: string): void {
    const state = this.states.get(specId);
    if (!state) {
      return;
    }

    // Find and update the task
    for (const group of state.groups) {
      const task = group.tasks.find((t) => t.taskId === taskId);
      if (task) {
        task.status = 'failed';
        task.endTime = Date.now();
        task.error = error;
        break;
      }
    }

    // Mark overall state as error
    state.status = 'error';
    state.endTime = Date.now();
  }

  /**
   * Mark a group as completed
   *
   * @param specId - Spec identifier
   * @param groupIndex - Group index
   */
  markGroupCompleted(specId: string, groupIndex: number): void {
    const state = this.states.get(specId);
    if (!state) {
      return;
    }

    // Advance to next group if this was the current group
    if (state.currentGroupIndex === groupIndex) {
      state.currentGroupIndex = groupIndex + 1;
    }

    this.checkAndAdvanceGroup(specId);
  }

  /**
   * Check if a group is completed (all tasks completed)
   *
   * @param specId - Spec identifier
   * @param groupIndex - Group index
   * @returns true if all tasks in group are completed
   */
  isGroupCompleted(specId: string, groupIndex: number): boolean {
    const state = this.states.get(specId);
    if (!state || groupIndex >= state.groups.length) {
      return false;
    }

    const group = state.groups[groupIndex];
    return group.tasks.every((t) => t.status === 'completed');
  }

  /**
   * Get all currently running tasks for a spec
   *
   * @param specId - Spec identifier
   * @returns Array of running task states
   */
  getRunningTasks(specId: string): TaskExecutionState[] {
    const state = this.states.get(specId);
    if (!state) {
      return [];
    }

    const runningTasks: TaskExecutionState[] = [];
    for (const group of state.groups) {
      for (const task of group.tasks) {
        if (task.status === 'running') {
          runningTasks.push(task);
        }
      }
    }

    return runningTasks;
  }

  /**
   * Clear state for a spec
   *
   * @param specId - Spec identifier
   */
  clearState(specId: string): void {
    this.states.delete(specId);
  }

  /**
   * Check if current group is completed and advance to next group if so
   * Also marks overall execution as completed if all groups are done
   */
  private checkAndAdvanceGroup(specId: string): void {
    const state = this.states.get(specId);
    if (!state) {
      return;
    }

    // Check if current group is completed
    if (state.currentGroupIndex < state.groups.length) {
      const currentGroup = state.groups[state.currentGroupIndex];
      const allCompleted = currentGroup.tasks.every(
        (t) => t.status === 'completed'
      );

      if (allCompleted) {
        state.currentGroupIndex++;
      }
    }

    // Check if all groups are completed
    if (state.currentGroupIndex >= state.groups.length) {
      const allGroupsCompleted = state.groups.every((group) =>
        group.tasks.every((t) => t.status === 'completed')
      );

      if (allGroupsCompleted && state.status === 'running') {
        state.status = 'completed';
        state.endTime = Date.now();
      }
    }
  }
}

// =============================================================================
// Singleton instance
// =============================================================================

let defaultService: ParallelImplService | null = null;

/**
 * Get the default ParallelImplService instance
 */
export function getDefaultParallelImplService(): ParallelImplService {
  if (!defaultService) {
    defaultService = new ParallelImplService();
  }
  return defaultService;
}

/**
 * Reset the default service (for testing)
 */
export function resetDefaultParallelImplService(): void {
  defaultService = null;
}
