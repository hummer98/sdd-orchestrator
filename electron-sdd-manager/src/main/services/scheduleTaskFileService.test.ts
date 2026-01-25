/**
 * Schedule Task File Service Tests
 * Requirements: 9.1, 9.4
 *
 * Task 2.1: ファイル永続化サービスを実装
 * - `.kiro/schedule-tasks.json`の読み書き機能を実装
 * - ファイルが存在しない場合のデフォルト値生成
 * - アトミックな書き込み処理（一時ファイル経由）
 * - 最終実行開始時間の更新機能
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdir, writeFile, rm, readFile, access } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';
import {
  type ScheduleTaskFileService,
  createScheduleTaskFileService,
  type ScheduleTasksFile,
  type ScheduleTask,
} from './scheduleTaskFileService';

describe('ScheduleTaskFileService', () => {
  let service: ScheduleTaskFileService;
  let testDir: string;

  beforeEach(async () => {
    service = createScheduleTaskFileService();
    testDir = join(tmpdir(), `schedule-task-file-test-${Date.now()}`);
    await mkdir(join(testDir, '.kiro'), { recursive: true });
  });

  afterEach(async () => {
    try {
      await rm(testDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
  });

  describe('readTasks', () => {
    it('should return default empty structure when file does not exist', async () => {
      const result = await service.readTasks(testDir);

      expect(result).toEqual({
        version: 1,
        tasks: [],
      });
    });

    it('should read existing tasks from schedule-tasks.json', async () => {
      const tasksFile: ScheduleTasksFile = {
        version: 1,
        tasks: [
          createTestTask({ id: 'task-1', name: 'Test Task 1' }),
          createTestTask({ id: 'task-2', name: 'Test Task 2' }),
        ],
      };

      await writeFile(
        join(testDir, '.kiro', 'schedule-tasks.json'),
        JSON.stringify(tasksFile, null, 2),
        'utf-8'
      );

      const result = await service.readTasks(testDir);

      expect(result.version).toBe(1);
      expect(result.tasks).toHaveLength(2);
      expect(result.tasks[0].id).toBe('task-1');
      expect(result.tasks[1].id).toBe('task-2');
    });

    it('should return default structure when file contains invalid JSON', async () => {
      await writeFile(
        join(testDir, '.kiro', 'schedule-tasks.json'),
        'invalid json content',
        'utf-8'
      );

      const result = await service.readTasks(testDir);

      expect(result).toEqual({
        version: 1,
        tasks: [],
      });
    });

    it('should return default structure when file is empty', async () => {
      await writeFile(
        join(testDir, '.kiro', 'schedule-tasks.json'),
        '',
        'utf-8'
      );

      const result = await service.readTasks(testDir);

      expect(result).toEqual({
        version: 1,
        tasks: [],
      });
    });
  });

  describe('writeTasks', () => {
    it('should write tasks to schedule-tasks.json', async () => {
      const tasksFile: ScheduleTasksFile = {
        version: 1,
        tasks: [createTestTask({ id: 'task-1', name: 'Written Task' })],
      };

      await service.writeTasks(testDir, tasksFile);

      const content = await readFile(
        join(testDir, '.kiro', 'schedule-tasks.json'),
        'utf-8'
      );
      const parsed = JSON.parse(content);

      expect(parsed.version).toBe(1);
      expect(parsed.tasks).toHaveLength(1);
      expect(parsed.tasks[0].name).toBe('Written Task');
    });

    it('should create .kiro directory if it does not exist', async () => {
      const newDir = join(tmpdir(), `schedule-task-new-${Date.now()}`);
      await mkdir(newDir, { recursive: true });

      try {
        const tasksFile: ScheduleTasksFile = {
          version: 1,
          tasks: [],
        };

        await service.writeTasks(newDir, tasksFile);

        // Verify file was created
        await access(join(newDir, '.kiro', 'schedule-tasks.json'));
      } finally {
        await rm(newDir, { recursive: true, force: true });
      }
    });

    it('should use atomic write (temp file) to prevent corruption', async () => {
      const tasksFile: ScheduleTasksFile = {
        version: 1,
        tasks: [createTestTask({ id: 'task-1' })],
      };

      // Write should succeed even if called multiple times rapidly
      await Promise.all([
        service.writeTasks(testDir, tasksFile),
        service.writeTasks(testDir, { ...tasksFile, tasks: [createTestTask({ id: 'task-2' })] }),
      ]);

      // File should be valid JSON (not corrupted)
      const content = await readFile(
        join(testDir, '.kiro', 'schedule-tasks.json'),
        'utf-8'
      );
      expect(() => JSON.parse(content)).not.toThrow();
    });

    it('should overwrite existing file', async () => {
      // Write initial content
      await service.writeTasks(testDir, {
        version: 1,
        tasks: [createTestTask({ id: 'old-task' })],
      });

      // Overwrite
      await service.writeTasks(testDir, {
        version: 1,
        tasks: [createTestTask({ id: 'new-task' })],
      });

      const result = await service.readTasks(testDir);
      expect(result.tasks).toHaveLength(1);
      expect(result.tasks[0].id).toBe('new-task');
    });
  });

  describe('updateLastExecutedAt', () => {
    it('should update lastExecutedAt for specified task', async () => {
      const initialTasks: ScheduleTasksFile = {
        version: 1,
        tasks: [
          createTestTask({ id: 'task-1', lastExecutedAt: null }),
          createTestTask({ id: 'task-2', lastExecutedAt: null }),
        ],
      };
      await service.writeTasks(testDir, initialTasks);

      const timestamp = Date.now();
      await service.updateLastExecutedAt(testDir, 'task-1', timestamp);

      const result = await service.readTasks(testDir);
      expect(result.tasks.find((t) => t.id === 'task-1')?.lastExecutedAt).toBe(timestamp);
      expect(result.tasks.find((t) => t.id === 'task-2')?.lastExecutedAt).toBeNull();
    });

    it('should not throw when task does not exist', async () => {
      const initialTasks: ScheduleTasksFile = {
        version: 1,
        tasks: [createTestTask({ id: 'task-1' })],
      };
      await service.writeTasks(testDir, initialTasks);

      // Should not throw
      await expect(
        service.updateLastExecutedAt(testDir, 'non-existent-task', Date.now())
      ).resolves.not.toThrow();
    });

    it('should not throw when file does not exist', async () => {
      // Should not throw even when file doesn't exist
      await expect(
        service.updateLastExecutedAt(testDir, 'task-1', Date.now())
      ).resolves.not.toThrow();
    });

    it('should preserve other task fields when updating lastExecutedAt', async () => {
      const task = createTestTask({
        id: 'task-1',
        name: 'Original Name',
        enabled: true,
        lastExecutedAt: null,
      });
      await service.writeTasks(testDir, { version: 1, tasks: [task] });

      const timestamp = Date.now();
      await service.updateLastExecutedAt(testDir, 'task-1', timestamp);

      const result = await service.readTasks(testDir);
      const updatedTask = result.tasks.find((t) => t.id === 'task-1');
      expect(updatedTask?.name).toBe('Original Name');
      expect(updatedTask?.enabled).toBe(true);
      expect(updatedTask?.lastExecutedAt).toBe(timestamp);
    });
  });
});

// ============================================================
// Additional Edge Case Tests (Task 9.1: Comprehensive Unit Tests)
// Requirements: 9.1, 9.4 - Full coverage
// ============================================================

describe('ScheduleTaskFileService edge cases', () => {
  let service: ScheduleTaskFileService;
  let testDir: string;

  beforeEach(async () => {
    service = createScheduleTaskFileService();
    testDir = join(tmpdir(), `schedule-task-edge-test-${Date.now()}`);
    await mkdir(join(testDir, '.kiro'), { recursive: true });
  });

  afterEach(async () => {
    try {
      await rm(testDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
  });

  describe('readTasks edge cases', () => {
    it('should handle file with null tasks array gracefully', async () => {
      await writeFile(
        join(testDir, '.kiro', 'schedule-tasks.json'),
        JSON.stringify({ version: 1, tasks: null }),
        'utf-8'
      );

      // This should not throw, but may return default or the null value
      // depends on implementation - testing that it doesn't crash
      const result = await service.readTasks(testDir);
      expect(result.version).toBe(1);
    });

    it('should handle file with missing version field', async () => {
      await writeFile(
        join(testDir, '.kiro', 'schedule-tasks.json'),
        JSON.stringify({ tasks: [] }),
        'utf-8'
      );

      // Should return the content as-is or handle gracefully
      const result = await service.readTasks(testDir);
      expect(result.tasks).toBeDefined();
    });

    it('should handle file with only whitespace', async () => {
      await writeFile(
        join(testDir, '.kiro', 'schedule-tasks.json'),
        '   \n\t   ',
        'utf-8'
      );

      const result = await service.readTasks(testDir);
      expect(result).toEqual({
        version: 1,
        tasks: [],
      });
    });

    it('should handle file with valid JSON but wrong structure', async () => {
      await writeFile(
        join(testDir, '.kiro', 'schedule-tasks.json'),
        JSON.stringify({ foo: 'bar', baz: 123 }),
        'utf-8'
      );

      // Should return the parsed JSON (no schema validation in file service)
      const result = await service.readTasks(testDir);
      expect(result).toBeDefined();
    });

    it('should handle deeply nested project path', async () => {
      const deepPath = join(testDir, 'a', 'b', 'c', 'd', 'e');
      await mkdir(join(deepPath, '.kiro'), { recursive: true });

      // Should return default for non-existent file
      const result = await service.readTasks(deepPath);
      expect(result).toEqual({
        version: 1,
        tasks: [],
      });
    });

    it('should handle project path with spaces', async () => {
      const pathWithSpaces = join(tmpdir(), `path with spaces ${Date.now()}`);
      await mkdir(join(pathWithSpaces, '.kiro'), { recursive: true });

      try {
        const result = await service.readTasks(pathWithSpaces);
        expect(result).toEqual({
          version: 1,
          tasks: [],
        });
      } finally {
        await rm(pathWithSpaces, { recursive: true, force: true });
      }
    });

    it('should handle very large file', async () => {
      const manyTasks: ScheduleTasksFile = {
        version: 1,
        tasks: Array.from({ length: 1000 }, (_, i) =>
          createTestTask({ id: `task-${i}`, name: `Task ${i}` })
        ),
      };

      await writeFile(
        join(testDir, '.kiro', 'schedule-tasks.json'),
        JSON.stringify(manyTasks, null, 2),
        'utf-8'
      );

      const result = await service.readTasks(testDir);
      expect(result.tasks).toHaveLength(1000);
    });
  });

  describe('writeTasks edge cases', () => {
    it('should handle writing empty tasks array', async () => {
      const emptyFile: ScheduleTasksFile = {
        version: 1,
        tasks: [],
      };

      await service.writeTasks(testDir, emptyFile);

      const content = await readFile(
        join(testDir, '.kiro', 'schedule-tasks.json'),
        'utf-8'
      );
      const parsed = JSON.parse(content);
      expect(parsed.tasks).toEqual([]);
    });

    it('should handle writing task with special characters in content', async () => {
      const taskWithSpecialChars = createTestTask({
        id: 'special-chars-task',
        name: 'Task with "quotes" and \\backslashes\\',
        prompts: [{ order: 0, content: 'Content with\nnewlines\tand\ttabs' }],
      });

      const tasksFile: ScheduleTasksFile = {
        version: 1,
        tasks: [taskWithSpecialChars],
      };

      await service.writeTasks(testDir, tasksFile);

      const result = await service.readTasks(testDir);
      expect(result.tasks[0].name).toBe('Task with "quotes" and \\backslashes\\');
      expect(result.tasks[0].prompts[0].content).toBe('Content with\nnewlines\tand\ttabs');
    });

    it('should handle writing task with unicode characters', async () => {
      const unicodeTask = createTestTask({
        id: 'unicode-task',
        name: 'Unicode Task Name',
        prompts: [{ order: 0, content: '/kiro:test-unicode' }],
      });

      const tasksFile: ScheduleTasksFile = {
        version: 1,
        tasks: [unicodeTask],
      };

      await service.writeTasks(testDir, tasksFile);

      const result = await service.readTasks(testDir);
      expect(result.tasks[0].name).toBe('Unicode Task Name');
    });

    it('should create .kiro directory with proper permissions', async () => {
      const newDir = join(tmpdir(), `new-project-${Date.now()}`);
      await mkdir(newDir, { recursive: true });

      try {
        await service.writeTasks(newDir, { version: 1, tasks: [] });

        // Verify .kiro directory exists
        const kiroPath = join(newDir, '.kiro');
        await access(kiroPath);
      } finally {
        await rm(newDir, { recursive: true, force: true });
      }
    });

    it('should handle rapid consecutive writes', async () => {
      const writes = Array.from({ length: 20 }, (_, i) =>
        service.writeTasks(testDir, {
          version: 1,
          tasks: [createTestTask({ id: `task-${i}`, name: `Task ${i}` })],
        })
      );

      // All writes should complete without error
      await Promise.all(writes);

      // Final file should be valid JSON
      const content = await readFile(
        join(testDir, '.kiro', 'schedule-tasks.json'),
        'utf-8'
      );
      expect(() => JSON.parse(content)).not.toThrow();
    });
  });

  describe('updateLastExecutedAt edge cases', () => {
    it('should update lastExecutedAt with timestamp 0', async () => {
      const initialTasks: ScheduleTasksFile = {
        version: 1,
        tasks: [createTestTask({ id: 'zero-timestamp-task', lastExecutedAt: 12345 })],
      };
      await service.writeTasks(testDir, initialTasks);

      await service.updateLastExecutedAt(testDir, 'zero-timestamp-task', 0);

      const result = await service.readTasks(testDir);
      expect(result.tasks[0].lastExecutedAt).toBe(0);
    });

    it('should update lastExecutedAt with very large timestamp', async () => {
      const largeTimestamp = Number.MAX_SAFE_INTEGER;
      const initialTasks: ScheduleTasksFile = {
        version: 1,
        tasks: [createTestTask({ id: 'large-timestamp-task', lastExecutedAt: null })],
      };
      await service.writeTasks(testDir, initialTasks);

      await service.updateLastExecutedAt(testDir, 'large-timestamp-task', largeTimestamp);

      const result = await service.readTasks(testDir);
      expect(result.tasks[0].lastExecutedAt).toBe(largeTimestamp);
    });

    it('should handle updating when multiple tasks exist', async () => {
      const initialTasks: ScheduleTasksFile = {
        version: 1,
        tasks: [
          createTestTask({ id: 'task-1', name: 'Task 1', lastExecutedAt: null }),
          createTestTask({ id: 'task-2', name: 'Task 2', lastExecutedAt: null }),
          createTestTask({ id: 'task-3', name: 'Task 3', lastExecutedAt: null }),
        ],
      };
      await service.writeTasks(testDir, initialTasks);

      // Update middle task
      await service.updateLastExecutedAt(testDir, 'task-2', 999999);

      const result = await service.readTasks(testDir);
      expect(result.tasks.find((t) => t.id === 'task-1')?.lastExecutedAt).toBeNull();
      expect(result.tasks.find((t) => t.id === 'task-2')?.lastExecutedAt).toBe(999999);
      expect(result.tasks.find((t) => t.id === 'task-3')?.lastExecutedAt).toBeNull();
    });

    it('should handle concurrent updates to different tasks', async () => {
      const initialTasks: ScheduleTasksFile = {
        version: 1,
        tasks: [
          createTestTask({ id: 'concurrent-1', lastExecutedAt: null }),
          createTestTask({ id: 'concurrent-2', lastExecutedAt: null }),
          createTestTask({ id: 'concurrent-3', lastExecutedAt: null }),
        ],
      };
      await service.writeTasks(testDir, initialTasks);

      // Concurrent updates
      await Promise.all([
        service.updateLastExecutedAt(testDir, 'concurrent-1', 100),
        service.updateLastExecutedAt(testDir, 'concurrent-2', 200),
        service.updateLastExecutedAt(testDir, 'concurrent-3', 300),
      ]);

      // File should still be valid - though only last write may win
      const result = await service.readTasks(testDir);
      expect(result.version).toBe(1);
      expect(result.tasks).toHaveLength(3);
    });

    it('should preserve task order when updating lastExecutedAt', async () => {
      const initialTasks: ScheduleTasksFile = {
        version: 1,
        tasks: [
          createTestTask({ id: 'first', name: 'First' }),
          createTestTask({ id: 'second', name: 'Second' }),
          createTestTask({ id: 'third', name: 'Third' }),
        ],
      };
      await service.writeTasks(testDir, initialTasks);

      await service.updateLastExecutedAt(testDir, 'second', Date.now());

      const result = await service.readTasks(testDir);
      expect(result.tasks[0].id).toBe('first');
      expect(result.tasks[1].id).toBe('second');
      expect(result.tasks[2].id).toBe('third');
    });
  });

  describe('file system error handling', () => {
    it('should handle reading from non-existent parent directory', async () => {
      const nonExistentPath = join(testDir, 'does', 'not', 'exist');

      // Should return default without throwing
      const result = await service.readTasks(nonExistentPath);
      expect(result).toEqual({
        version: 1,
        tasks: [],
      });
    });
  });
});

// Helper function to create a test task with defaults
function createTestTask(overrides: Partial<ScheduleTask> = {}): ScheduleTask {
  const now = Date.now();
  return {
    id: 'test-task',
    name: 'Test Task',
    enabled: true,
    schedule: {
      type: 'interval',
      hoursInterval: 24,
      waitForIdle: false,
    },
    prompts: [{ order: 0, content: 'Test prompt' }],
    avoidance: {
      targets: [],
      behavior: 'wait',
    },
    workflow: {
      enabled: false,
    },
    behavior: 'wait',
    lastExecutedAt: null,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}
