/**
 * ParallelImplService Tests
 * parallel-task-impl: Task 3.1-3.6
 *
 * Tests for parallel implementation execution state management.
 * Requirements: 4.1-4.5
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  ParallelImplService,
  type ParallelExecutionState,
  type ParallelExecutionGroup,
  type TaskExecutionState,
} from './parallelImplService';
import type { TaskGroup, TaskItem, ParseResult } from './taskParallelParser';

// Mock data helper
function createTaskItem(
  id: string,
  isParallel: boolean = false,
  completed: boolean = false
): TaskItem {
  return {
    id,
    title: `Task ${id}`,
    isParallel,
    completed,
    parentId: id.includes('.') ? id.split('.').slice(0, -1).join('.') : null,
  };
}

function createTaskGroup(
  groupIndex: number,
  tasks: TaskItem[],
  isParallel: boolean
): TaskGroup {
  return {
    groupIndex,
    tasks,
    isParallel,
  };
}

describe('ParallelImplService', () => {
  let service: ParallelImplService;

  beforeEach(() => {
    service = new ParallelImplService();
  });

  // =============================================================================
  // Task 3.1: State initialization
  // Requirements: 4.1
  // =============================================================================
  describe('initializeFromParseResult', () => {
    it('should initialize execution state from ParseResult', () => {
      const parseResult: ParseResult = {
        groups: [
          createTaskGroup(0, [
            createTaskItem('1.1', true),
            createTaskItem('1.2', true),
          ], true),
          createTaskGroup(1, [
            createTaskItem('2.1', false),
          ], false),
        ],
        totalTasks: 3,
        parallelTasks: 2,
      };

      const state = service.initializeFromParseResult('test-spec', parseResult);

      expect(state).toBeDefined();
      expect(state.specId).toBe('test-spec');
      expect(state.status).toBe('pending');
      expect(state.groups.length).toBe(2);
      expect(state.currentGroupIndex).toBe(0);
    });

    it('should convert TaskGroup to ParallelExecutionGroup with task states', () => {
      const parseResult: ParseResult = {
        groups: [
          createTaskGroup(0, [
            createTaskItem('1.1', true),
            createTaskItem('1.2', true),
          ], true),
        ],
        totalTasks: 2,
        parallelTasks: 2,
      };

      const state = service.initializeFromParseResult('test-spec', parseResult);

      expect(state.groups[0].isParallel).toBe(true);
      expect(state.groups[0].tasks.length).toBe(2);
      expect(state.groups[0].tasks[0].taskId).toBe('1.1');
      expect(state.groups[0].tasks[0].status).toBe('pending');
      expect(state.groups[0].tasks[1].taskId).toBe('1.2');
      expect(state.groups[0].tasks[1].status).toBe('pending');
    });

    it('should skip already completed tasks', () => {
      const parseResult: ParseResult = {
        groups: [
          createTaskGroup(0, [
            createTaskItem('1.1', true, true), // completed
            createTaskItem('1.2', true, false), // pending
          ], true),
        ],
        totalTasks: 2,
        parallelTasks: 2,
      };

      const state = service.initializeFromParseResult('test-spec', parseResult);

      // Completed tasks should be marked as completed
      expect(state.groups[0].tasks.find(t => t.taskId === '1.1')?.status).toBe('completed');
      expect(state.groups[0].tasks.find(t => t.taskId === '1.2')?.status).toBe('pending');
    });
  });

  // =============================================================================
  // Task 3.2: Get next pending group
  // Requirements: 4.2
  // =============================================================================
  describe('getNextPendingGroup', () => {
    it('should return the next pending group based on currentGroupIndex', () => {
      const parseResult: ParseResult = {
        groups: [
          createTaskGroup(0, [createTaskItem('1.1', true)], true),
          createTaskGroup(1, [createTaskItem('2.1', false)], false),
        ],
        totalTasks: 2,
        parallelTasks: 1,
      };

      service.initializeFromParseResult('test-spec', parseResult);
      const nextGroup = service.getNextPendingGroup('test-spec');

      expect(nextGroup).toBeDefined();
      expect(nextGroup?.groupIndex).toBe(0);
    });

    it('should return null when all groups are completed', () => {
      const parseResult: ParseResult = {
        groups: [
          createTaskGroup(0, [createTaskItem('1.1', true, true)], true),
        ],
        totalTasks: 1,
        parallelTasks: 1,
      };

      service.initializeFromParseResult('test-spec', parseResult);
      service.markGroupCompleted('test-spec', 0);

      const nextGroup = service.getNextPendingGroup('test-spec');
      expect(nextGroup).toBeNull();
    });

    it('should return null for non-existent specId', () => {
      const nextGroup = service.getNextPendingGroup('non-existent');
      expect(nextGroup).toBeNull();
    });
  });

  // =============================================================================
  // Task 3.3: Mark task as running
  // Requirements: 4.3
  // =============================================================================
  describe('markTaskRunning', () => {
    beforeEach(() => {
      const parseResult: ParseResult = {
        groups: [
          createTaskGroup(0, [
            createTaskItem('1.1', true),
            createTaskItem('1.2', true),
          ], true),
        ],
        totalTasks: 2,
        parallelTasks: 2,
      };
      service.initializeFromParseResult('test-spec', parseResult);
    });

    it('should mark a task as running and associate agentId', () => {
      service.markTaskRunning('test-spec', '1.1', 'agent-123');

      const state = service.getState('test-spec');
      const task = state?.groups[0].tasks.find(t => t.taskId === '1.1');

      expect(task?.status).toBe('running');
      expect(task?.agentId).toBe('agent-123');
    });

    it('should set state to running when first task starts', () => {
      service.markTaskRunning('test-spec', '1.1', 'agent-123');

      const state = service.getState('test-spec');
      expect(state?.status).toBe('running');
    });

    it('should record startTime when task starts', () => {
      const beforeTime = Date.now();
      service.markTaskRunning('test-spec', '1.1', 'agent-123');
      const afterTime = Date.now();

      const state = service.getState('test-spec');
      const task = state?.groups[0].tasks.find(t => t.taskId === '1.1');

      expect(task?.startTime).toBeDefined();
      expect(task?.startTime).toBeGreaterThanOrEqual(beforeTime);
      expect(task?.startTime).toBeLessThanOrEqual(afterTime);
    });
  });

  // =============================================================================
  // Task 3.4: Mark task as completed
  // Requirements: 4.4
  // =============================================================================
  describe('markTaskCompleted', () => {
    beforeEach(() => {
      const parseResult: ParseResult = {
        groups: [
          createTaskGroup(0, [
            createTaskItem('1.1', true),
            createTaskItem('1.2', true),
          ], true),
          createTaskGroup(1, [
            createTaskItem('2.1', false),
          ], false),
        ],
        totalTasks: 3,
        parallelTasks: 2,
      };
      service.initializeFromParseResult('test-spec', parseResult);
    });

    it('should mark a task as completed', () => {
      service.markTaskRunning('test-spec', '1.1', 'agent-123');
      service.markTaskCompleted('test-spec', '1.1');

      const state = service.getState('test-spec');
      const task = state?.groups[0].tasks.find(t => t.taskId === '1.1');

      expect(task?.status).toBe('completed');
    });

    it('should record endTime when task completes', () => {
      service.markTaskRunning('test-spec', '1.1', 'agent-123');
      const beforeTime = Date.now();
      service.markTaskCompleted('test-spec', '1.1');
      const afterTime = Date.now();

      const state = service.getState('test-spec');
      const task = state?.groups[0].tasks.find(t => t.taskId === '1.1');

      expect(task?.endTime).toBeDefined();
      expect(task?.endTime).toBeGreaterThanOrEqual(beforeTime);
      expect(task?.endTime).toBeLessThanOrEqual(afterTime);
    });

    it('should advance to next group when all tasks in current group complete', () => {
      service.markTaskRunning('test-spec', '1.1', 'agent-1');
      service.markTaskRunning('test-spec', '1.2', 'agent-2');
      service.markTaskCompleted('test-spec', '1.1');
      service.markTaskCompleted('test-spec', '1.2');

      const state = service.getState('test-spec');
      expect(state?.currentGroupIndex).toBe(1);
    });

    it('should mark state as completed when all groups are done', () => {
      // Complete group 0
      service.markTaskRunning('test-spec', '1.1', 'agent-1');
      service.markTaskRunning('test-spec', '1.2', 'agent-2');
      service.markTaskCompleted('test-spec', '1.1');
      service.markTaskCompleted('test-spec', '1.2');

      // Complete group 1
      service.markTaskRunning('test-spec', '2.1', 'agent-3');
      service.markTaskCompleted('test-spec', '2.1');

      const state = service.getState('test-spec');
      expect(state?.status).toBe('completed');
    });
  });

  // =============================================================================
  // Task 3.5: Mark task as failed
  // Requirements: 4.5
  // =============================================================================
  describe('markTaskFailed', () => {
    beforeEach(() => {
      const parseResult: ParseResult = {
        groups: [
          createTaskGroup(0, [
            createTaskItem('1.1', true),
            createTaskItem('1.2', true),
          ], true),
        ],
        totalTasks: 2,
        parallelTasks: 2,
      };
      service.initializeFromParseResult('test-spec', parseResult);
    });

    it('should mark a task as failed', () => {
      service.markTaskRunning('test-spec', '1.1', 'agent-123');
      service.markTaskFailed('test-spec', '1.1', 'Agent crashed');

      const state = service.getState('test-spec');
      const task = state?.groups[0].tasks.find(t => t.taskId === '1.1');

      expect(task?.status).toBe('failed');
      expect(task?.error).toBe('Agent crashed');
    });

    it('should mark state as error when any task fails', () => {
      service.markTaskRunning('test-spec', '1.1', 'agent-123');
      service.markTaskFailed('test-spec', '1.1', 'Agent crashed');

      const state = service.getState('test-spec');
      expect(state?.status).toBe('error');
    });

    it('should record endTime when task fails', () => {
      service.markTaskRunning('test-spec', '1.1', 'agent-123');
      service.markTaskFailed('test-spec', '1.1', 'Agent crashed');

      const state = service.getState('test-spec');
      const task = state?.groups[0].tasks.find(t => t.taskId === '1.1');

      expect(task?.endTime).toBeDefined();
    });
  });

  // =============================================================================
  // Task 3.6: State management methods
  // =============================================================================
  describe('state management', () => {
    it('should return null for non-existent state', () => {
      const state = service.getState('non-existent');
      expect(state).toBeNull();
    });

    it('should clean up state when requested', () => {
      const parseResult: ParseResult = {
        groups: [
          createTaskGroup(0, [createTaskItem('1.1', true)], true),
        ],
        totalTasks: 1,
        parallelTasks: 1,
      };

      service.initializeFromParseResult('test-spec', parseResult);
      expect(service.getState('test-spec')).not.toBeNull();

      service.clearState('test-spec');
      expect(service.getState('test-spec')).toBeNull();
    });

    it('should maintain separate states for different specs', () => {
      const parseResult1: ParseResult = {
        groups: [createTaskGroup(0, [createTaskItem('1.1', true)], true)],
        totalTasks: 1,
        parallelTasks: 1,
      };

      const parseResult2: ParseResult = {
        groups: [createTaskGroup(0, [createTaskItem('2.1', false)], false)],
        totalTasks: 1,
        parallelTasks: 0,
      };

      service.initializeFromParseResult('spec-1', parseResult1);
      service.initializeFromParseResult('spec-2', parseResult2);

      const state1 = service.getState('spec-1');
      const state2 = service.getState('spec-2');

      expect(state1?.specId).toBe('spec-1');
      expect(state2?.specId).toBe('spec-2');
      expect(state1?.groups[0].isParallel).toBe(true);
      expect(state2?.groups[0].isParallel).toBe(false);
    });
  });

  // =============================================================================
  // Additional: getRunningTasks helper
  // =============================================================================
  describe('getRunningTasks', () => {
    it('should return all currently running tasks for a spec', () => {
      const parseResult: ParseResult = {
        groups: [
          createTaskGroup(0, [
            createTaskItem('1.1', true),
            createTaskItem('1.2', true),
          ], true),
        ],
        totalTasks: 2,
        parallelTasks: 2,
      };

      service.initializeFromParseResult('test-spec', parseResult);
      service.markTaskRunning('test-spec', '1.1', 'agent-1');
      service.markTaskRunning('test-spec', '1.2', 'agent-2');

      const runningTasks = service.getRunningTasks('test-spec');

      expect(runningTasks.length).toBe(2);
      expect(runningTasks.map(t => t.taskId)).toContain('1.1');
      expect(runningTasks.map(t => t.taskId)).toContain('1.2');
    });

    it('should return empty array for non-existent spec', () => {
      const runningTasks = service.getRunningTasks('non-existent');
      expect(runningTasks).toEqual([]);
    });
  });

  // =============================================================================
  // isGroupCompleted helper
  // =============================================================================
  describe('isGroupCompleted', () => {
    it('should return true when all tasks in group are completed', () => {
      const parseResult: ParseResult = {
        groups: [
          createTaskGroup(0, [
            createTaskItem('1.1', true),
            createTaskItem('1.2', true),
          ], true),
        ],
        totalTasks: 2,
        parallelTasks: 2,
      };

      service.initializeFromParseResult('test-spec', parseResult);
      service.markTaskRunning('test-spec', '1.1', 'agent-1');
      service.markTaskRunning('test-spec', '1.2', 'agent-2');
      service.markTaskCompleted('test-spec', '1.1');
      service.markTaskCompleted('test-spec', '1.2');

      expect(service.isGroupCompleted('test-spec', 0)).toBe(true);
    });

    it('should return false when some tasks are still running', () => {
      const parseResult: ParseResult = {
        groups: [
          createTaskGroup(0, [
            createTaskItem('1.1', true),
            createTaskItem('1.2', true),
          ], true),
        ],
        totalTasks: 2,
        parallelTasks: 2,
      };

      service.initializeFromParseResult('test-spec', parseResult);
      service.markTaskRunning('test-spec', '1.1', 'agent-1');
      service.markTaskCompleted('test-spec', '1.1');
      // 1.2 is still pending

      expect(service.isGroupCompleted('test-spec', 0)).toBe(false);
    });
  });
});
