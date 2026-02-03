/**
 * Unit Tests for taskProgressParser
 *
 * remote-ui-task-display Task 6.1: Unit tests for parseTaskProgress function
 * Requirements: 1.1, 1.2, 1.4
 */

import { describe, it, expect } from 'vitest';
import { parseTaskProgress } from './taskProgressParser';

describe('parseTaskProgress', () => {
  // Requirement 1.1: Parse markdown checkboxes and count tasks
  describe('normal input parsing', () => {
    it('should count completed and pending tasks from markdown checkboxes', () => {
      const content = `
# Tasks

- [x] Task 1 completed
- [ ] Task 2 pending
- [x] Task 3 completed
- [ ] Task 4 pending
- [ ] Task 5 pending
`;
      const result = parseTaskProgress(content);
      expect(result.total).toBe(5);
      expect(result.completed).toBe(2);
    });

    it('should calculate percentage correctly', () => {
      const content = `
- [x] Task 1
- [x] Task 2
- [ ] Task 3
- [ ] Task 4
`;
      const result = parseTaskProgress(content);
      expect(result.percentage).toBe(50);
    });

    it('should round percentage to nearest integer', () => {
      const content = `
- [x] Task 1
- [ ] Task 2
- [ ] Task 3
`;
      const result = parseTaskProgress(content);
      // 1/3 = 33.33... should round to 33
      expect(result.percentage).toBe(33);
    });
  });

  // Requirement 1.2: Return TaskProgress format (total, completed, percentage)
  describe('all completed case', () => {
    it('should return 100% when all tasks are completed', () => {
      const content = `
- [x] Task 1
- [x] Task 2
- [x] Task 3
`;
      const result = parseTaskProgress(content);
      expect(result.total).toBe(3);
      expect(result.completed).toBe(3);
      expect(result.percentage).toBe(100);
    });
  });

  describe('all pending case', () => {
    it('should return 0% when no tasks are completed', () => {
      const content = `
- [ ] Task 1
- [ ] Task 2
- [ ] Task 3
`;
      const result = parseTaskProgress(content);
      expect(result.total).toBe(3);
      expect(result.completed).toBe(0);
      expect(result.percentage).toBe(0);
    });
  });

  // Requirement 1.4: Empty or null input should return zero values
  describe('empty input handling', () => {
    it('should return zero values for empty string', () => {
      const result = parseTaskProgress('');
      expect(result.total).toBe(0);
      expect(result.completed).toBe(0);
      expect(result.percentage).toBe(0);
    });

    it('should return zero values for null input', () => {
      const result = parseTaskProgress(null);
      expect(result.total).toBe(0);
      expect(result.completed).toBe(0);
      expect(result.percentage).toBe(0);
    });

    it('should return zero values for undefined input', () => {
      const result = parseTaskProgress(undefined);
      expect(result.total).toBe(0);
      expect(result.completed).toBe(0);
      expect(result.percentage).toBe(0);
    });
  });

  // Edge cases: invalid format
  describe('invalid format handling', () => {
    it('should return zero values when no checkboxes are present', () => {
      const content = `
# Just some text

This is a regular paragraph without any checkboxes.

- Regular list item
- Another list item
`;
      const result = parseTaskProgress(content);
      expect(result.total).toBe(0);
      expect(result.completed).toBe(0);
      expect(result.percentage).toBe(0);
    });

    it('should handle mixed content with some valid checkboxes', () => {
      const content = `
# Tasks

Some text here

- [x] Valid completed task
- Regular list item without checkbox
- [ ] Valid pending task
- [invalid] Not a checkbox
`;
      const result = parseTaskProgress(content);
      expect(result.total).toBe(2);
      expect(result.completed).toBe(1);
      expect(result.percentage).toBe(50);
    });
  });

  // Case insensitivity for completed marker (X vs x)
  describe('case insensitivity', () => {
    it('should recognize uppercase X as completed', () => {
      const content = `
- [X] Task with uppercase X
- [x] Task with lowercase x
- [ ] Pending task
`;
      const result = parseTaskProgress(content);
      expect(result.total).toBe(3);
      expect(result.completed).toBe(2);
    });
  });

  // Real-world tasks.md content
  describe('real-world tasks.md format', () => {
    it('should parse typical tasks.md structure with headers', () => {
      const content = `# Implementation Plan: Feature Name

## Tasks

- [ ] 1. Main Task Group
- [ ] 1.1 Subtask
  - Implementation details
  - _Requirements: 1.1, 1.2_
- [x] 1.2 Another subtask completed
  - More details
- [ ] 2. Second Task Group
- [x] 2.1 Completed subtask
`;
      const result = parseTaskProgress(content);
      expect(result.total).toBe(5);
      expect(result.completed).toBe(2);
      expect(result.percentage).toBe(40);
    });
  });
});
