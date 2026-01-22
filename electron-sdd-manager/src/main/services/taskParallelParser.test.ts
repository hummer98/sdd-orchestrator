/**
 * taskParallelParser Tests
 * parallel-task-impl: Task 1.1, 1.2, 1.3, 1.4
 *
 * Tests for parsing tasks.md to detect (P) markers and group tasks.
 * Requirements: 2.1-2.5, 3.1-3.3
 */

import { describe, it, expect } from 'vitest';
import {
  parseTasksContent,
  type TaskItem,
  type TaskGroup,
  type ParseResult,
} from './taskParallelParser';

describe('taskParallelParser', () => {
  // =============================================================================
  // Task 1.1: Core parsing logic - task extraction
  // Requirements: 2.1
  // =============================================================================
  describe('basic task parsing', () => {
    it('should parse a simple task with id, title, and completion status', () => {
      const content = `# Implementation Plan

## Task 1: First task group

- [ ] 1.1 Implement feature A
- [x] 1.2 Implement feature B
`;

      const result = parseTasksContent(content);

      expect(result.totalTasks).toBe(2);
      expect(result.groups.length).toBeGreaterThan(0);

      // Find tasks in groups
      const allTasks = result.groups.flatMap((g) => g.tasks);
      const task1 = allTasks.find((t) => t.id === '1.1');
      const task2 = allTasks.find((t) => t.id === '1.2');

      expect(task1).toBeDefined();
      expect(task1?.title).toBe('Implement feature A');
      expect(task1?.completed).toBe(false);

      expect(task2).toBeDefined();
      expect(task2?.title).toBe('Implement feature B');
      expect(task2?.completed).toBe(true);
    });

    it('should parse tasks with different id formats (e.g., 1.1, 2.3, 10.1)', () => {
      const content = `# Tasks

- [ ] 1.1 Task one point one
- [ ] 2.3 Task two point three
- [ ] 10.1 Task ten point one
`;

      const result = parseTasksContent(content);
      const allTasks = result.groups.flatMap((g) => g.tasks);

      expect(allTasks.find((t) => t.id === '1.1')).toBeDefined();
      expect(allTasks.find((t) => t.id === '2.3')).toBeDefined();
      expect(allTasks.find((t) => t.id === '10.1')).toBeDefined();
    });

    it('should extract task titles correctly (strip id and markers)', () => {
      const content = `# Tasks

- [ ] 1.1 (P) Task with parallel marker
- [ ] 1.2 Task without marker
`;

      const result = parseTasksContent(content);
      const allTasks = result.groups.flatMap((g) => g.tasks);

      const task1 = allTasks.find((t) => t.id === '1.1');
      const task2 = allTasks.find((t) => t.id === '1.2');

      // Title should NOT contain (P) marker
      expect(task1?.title).toBe('Task with parallel marker');
      expect(task2?.title).toBe('Task without marker');
    });

    it('should handle parent tasks with single-digit id (e.g., 4, 5)', () => {
      const content = `# Tasks

- [ ] 4. Main task four
  - [ ] 4.1 Subtask one
- [ ] 5 Main task five (no dot)
`;

      const result = parseTasksContent(content);
      const allTasks = result.groups.flatMap((g) => g.tasks);

      expect(allTasks.find((t) => t.id === '4')).toBeDefined();
      expect(allTasks.find((t) => t.id === '4.1')).toBeDefined();
      expect(allTasks.find((t) => t.id === '5')).toBeDefined();
    });
  });

  // =============================================================================
  // Task 1.2: (P) marker detection
  // Requirements: 2.2, 2.3
  // =============================================================================
  describe('parallel marker (P) detection', () => {
    it('should detect (P) marker and set isParallel flag', () => {
      const content = `# Tasks

- [ ] 1.1 (P) Parallel task
- [ ] 1.2 Sequential task
`;

      const result = parseTasksContent(content);
      const allTasks = result.groups.flatMap((g) => g.tasks);

      const parallelTask = allTasks.find((t) => t.id === '1.1');
      const sequentialTask = allTasks.find((t) => t.id === '1.2');

      expect(parallelTask?.isParallel).toBe(true);
      expect(sequentialTask?.isParallel).toBe(false);
    });

    it('should detect (P) marker regardless of position in title', () => {
      const content = `# Tasks

- [ ] 1.1 (P) At start
- [ ] 1.2 Middle (P) marker
- [ ] 1.3 At end (P)
`;

      const result = parseTasksContent(content);
      const allTasks = result.groups.flatMap((g) => g.tasks);

      expect(allTasks.find((t) => t.id === '1.1')?.isParallel).toBe(true);
      expect(allTasks.find((t) => t.id === '1.2')?.isParallel).toBe(true);
      expect(allTasks.find((t) => t.id === '1.3')?.isParallel).toBe(true);
    });

    it('should handle subtasks with (P) independent of parent', () => {
      const content = `# Tasks

## Task 1: Parent without P

- [ ] 1.1 (P) Subtask with P
- [ ] 1.2 Subtask without P

## Task 2: Parent with P mention

- [ ] 2.1 (P) Subtask also with P
- [ ] 2.2 Subtask without P
`;

      const result = parseTasksContent(content);
      const allTasks = result.groups.flatMap((g) => g.tasks);

      // Subtasks should have (P) independent of parent section
      expect(allTasks.find((t) => t.id === '1.1')?.isParallel).toBe(true);
      expect(allTasks.find((t) => t.id === '1.2')?.isParallel).toBe(false);
      expect(allTasks.find((t) => t.id === '2.1')?.isParallel).toBe(true);
      expect(allTasks.find((t) => t.id === '2.2')?.isParallel).toBe(false);
    });

    it('should count parallelTasks correctly', () => {
      const content = `# Tasks

- [ ] 1.1 (P) Parallel one
- [ ] 1.2 (P) Parallel two
- [ ] 1.3 Sequential one
- [ ] 2.1 (P) Parallel three
`;

      const result = parseTasksContent(content);

      expect(result.parallelTasks).toBe(3);
    });
  });

  // =============================================================================
  // Task 1.3: Task grouping logic
  // Requirements: 2.4, 2.5, 3.1, 3.2, 3.3
  // =============================================================================
  describe('task grouping', () => {
    it('should group consecutive (P) tasks together', () => {
      const content = `# Tasks

- [ ] 1.1 (P) Parallel A
- [ ] 1.2 (P) Parallel B
- [ ] 1.3 Sequential C
`;

      const result = parseTasksContent(content);

      // First group: 1.1 and 1.2 (consecutive P)
      // Second group: 1.3 (non-P, standalone)
      expect(result.groups.length).toBe(2);

      const group1 = result.groups[0];
      expect(group1.tasks.length).toBe(2);
      expect(group1.isParallel).toBe(true);
      expect(group1.tasks.map((t) => t.id)).toEqual(['1.1', '1.2']);

      const group2 = result.groups[1];
      expect(group2.tasks.length).toBe(1);
      expect(group2.isParallel).toBe(false);
      expect(group2.tasks[0].id).toBe('1.3');
    });

    it('should treat non-P tasks as standalone groups', () => {
      const content = `# Tasks

- [ ] 1.1 Sequential A
- [ ] 1.2 Sequential B
`;

      const result = parseTasksContent(content);

      // Each non-P task should be its own group
      expect(result.groups.length).toBe(2);
      expect(result.groups[0].tasks.length).toBe(1);
      expect(result.groups[1].tasks.length).toBe(1);
      expect(result.groups[0].isParallel).toBe(false);
      expect(result.groups[1].isParallel).toBe(false);
    });

    it('should handle mixed P and non-P tasks correctly (example from requirements)', () => {
      // Requirements 3.1 example: 1.1(P), 1.2(P), 2.1, 2.2(P), 2.3(P)
      // Expected: Group1: [1.1, 1.2], Group2: [2.1], Group3: [2.2, 2.3]
      const content = `# Tasks

- [ ] 1.1 (P) Task A
- [ ] 1.2 (P) Task B
- [ ] 2.1 Task C
- [ ] 2.2 (P) Task D
- [ ] 2.3 (P) Task E
`;

      const result = parseTasksContent(content);

      expect(result.groups.length).toBe(3);

      // Group 1: parallel (1.1, 1.2)
      expect(result.groups[0].tasks.map((t) => t.id)).toEqual(['1.1', '1.2']);
      expect(result.groups[0].isParallel).toBe(true);
      expect(result.groups[0].groupIndex).toBe(0);

      // Group 2: sequential (2.1)
      expect(result.groups[1].tasks.map((t) => t.id)).toEqual(['2.1']);
      expect(result.groups[1].isParallel).toBe(false);
      expect(result.groups[1].groupIndex).toBe(1);

      // Group 3: parallel (2.2, 2.3)
      expect(result.groups[2].tasks.map((t) => t.id)).toEqual(['2.2', '2.3']);
      expect(result.groups[2].isParallel).toBe(true);
      expect(result.groups[2].groupIndex).toBe(2);
    });

    it('should maintain task order within groups based on tasks.md order', () => {
      const content = `# Tasks

- [ ] 3.1 (P) Third
- [ ] 1.1 (P) First
- [ ] 2.1 (P) Second
`;

      const result = parseTasksContent(content);

      // All are P and consecutive, so one group
      expect(result.groups.length).toBe(1);

      // Order should be as they appear in tasks.md
      const taskIds = result.groups[0].tasks.map((t) => t.id);
      expect(taskIds).toEqual(['3.1', '1.1', '2.1']);
    });

    it('should set groupIndex based on appearance order', () => {
      const content = `# Tasks

- [ ] 1.1 (P) A
- [ ] 1.2 B
- [ ] 1.3 (P) C
- [ ] 1.4 (P) D
`;

      const result = parseTasksContent(content);

      expect(result.groups[0].groupIndex).toBe(0);
      expect(result.groups[1].groupIndex).toBe(1);
      expect(result.groups[2].groupIndex).toBe(2);
    });
  });

  // =============================================================================
  // Task 1.4: Edge cases and error handling
  // =============================================================================
  describe('edge cases', () => {
    it('should handle empty content', () => {
      const result = parseTasksContent('');

      expect(result.totalTasks).toBe(0);
      expect(result.parallelTasks).toBe(0);
      expect(result.groups).toEqual([]);
    });

    it('should handle content with no tasks', () => {
      const content = `# Implementation Plan

This is just a description without any tasks.

## Notes

Some notes here.
`;

      const result = parseTasksContent(content);

      expect(result.totalTasks).toBe(0);
      expect(result.groups).toEqual([]);
    });

    it('should handle nested subtasks with proper indentation', () => {
      const content = `# Tasks

- [ ] 1 Parent task
  - [ ] 1.1 (P) Child task A
  - [ ] 1.2 (P) Child task B
    - [ ] 1.2.1 Grandchild task
`;

      const result = parseTasksContent(content);
      const allTasks = result.groups.flatMap((g) => g.tasks);

      // Should parse all levels
      expect(allTasks.find((t) => t.id === '1')).toBeDefined();
      expect(allTasks.find((t) => t.id === '1.1')).toBeDefined();
      expect(allTasks.find((t) => t.id === '1.2')).toBeDefined();
      // Deep nesting might not have proper id format
    });

    it('should handle tasks with special characters in title', () => {
      const content = `# Tasks

- [ ] 1.1 (P) Task with "quotes" and 'apostrophes'
- [ ] 1.2 Task with \`backticks\` and **bold**
- [ ] 1.3 Task with [links](url) and _emphasis_
`;

      const result = parseTasksContent(content);
      const allTasks = result.groups.flatMap((g) => g.tasks);

      expect(allTasks.length).toBe(3);
      expect(allTasks.find((t) => t.id === '1.1')).toBeDefined();
      expect(allTasks.find((t) => t.id === '1.2')).toBeDefined();
      expect(allTasks.find((t) => t.id === '1.3')).toBeDefined();
    });

    it('should only consider unchecked tasks for execution', () => {
      const content = `# Tasks

- [x] 1.1 (P) Completed parallel
- [ ] 1.2 (P) Pending parallel
- [x] 1.3 Completed sequential
- [ ] 1.4 Pending sequential
`;

      const result = parseTasksContent(content);
      const allTasks = result.groups.flatMap((g) => g.tasks);

      // All tasks should be parsed
      expect(allTasks.length).toBe(4);

      // Completed status should be correct
      expect(allTasks.find((t) => t.id === '1.1')?.completed).toBe(true);
      expect(allTasks.find((t) => t.id === '1.2')?.completed).toBe(false);
      expect(allTasks.find((t) => t.id === '1.3')?.completed).toBe(true);
      expect(allTasks.find((t) => t.id === '1.4')?.completed).toBe(false);
    });

    it('should handle real-world tasks.md format with metadata', () => {
      const content = `# Implementation Plan

## Task 1: Parser implementation

- [ ] 1.1 (P) Implement core parser
  - Parse markdown structure
  - _Requirements: 2.1_

- [ ] 1.2 (P) Add parallel marker detection
  - Detect (P) in task lines
  - _Requirements: 2.2, 2.3_

## Task 2: Integration

- [ ] 2.1 Add IPC endpoint
  - Create PARSE_TASKS_FOR_PARALLEL channel
  - _Requirements: 2.1_
`;

      const result = parseTasksContent(content);
      const allTasks = result.groups.flatMap((g) => g.tasks);

      expect(allTasks.length).toBe(3);
      expect(result.parallelTasks).toBe(2);

      // First group: 1.1, 1.2 (consecutive P)
      // Second group: 2.1 (non-P)
      expect(result.groups.length).toBe(2);
    });
  });

  // =============================================================================
  // Filter pending tasks for execution
  // =============================================================================
  describe('pending tasks filtering', () => {
    it('should provide groups with only pending tasks', () => {
      const content = `# Tasks

- [x] 1.1 (P) Completed
- [ ] 1.2 (P) Pending A
- [ ] 1.3 (P) Pending B
- [x] 2.1 Completed sequential
- [ ] 2.2 Pending sequential
`;

      const result = parseTasksContent(content);

      // Get pending-only groups
      const pendingGroups = result.groups
        .map((g) => ({
          ...g,
          tasks: g.tasks.filter((t) => !t.completed),
        }))
        .filter((g) => g.tasks.length > 0);

      // Should have 2 groups (excluding completed-only groups)
      expect(pendingGroups.length).toBe(2);

      // First group: 1.2, 1.3 (1.1 is completed)
      expect(pendingGroups[0].tasks.map((t) => t.id)).toEqual(['1.2', '1.3']);

      // Second group: 2.2 (2.1 is completed)
      expect(pendingGroups[1].tasks.map((t) => t.id)).toEqual(['2.2']);
    });
  });
});
