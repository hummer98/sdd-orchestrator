/**
 * ProjectFileWatcherService Tests
 *
 * TDD: Tests written first for project-config-editor Task 2.1
 * Requirements: 5.1
 *
 * Test cases:
 * - start: Initializes watcher for correct paths
 * - stop: Cleans up watcher
 * - onChange: Debounced callback execution
 * - isRunning: State tracking
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as path from 'path';

// Mock chokidar
vi.mock('chokidar', () => {
  const mockWatcher = {
    on: vi.fn().mockReturnThis(),
    close: vi.fn().mockResolvedValue(undefined),
    add: vi.fn(),
    unwatch: vi.fn(),
  };
  return {
    watch: vi.fn().mockReturnValue(mockWatcher),
    default: {
      watch: vi.fn().mockReturnValue(mockWatcher),
    },
  };
});

import { ProjectFileWatcherService } from './ProjectFileWatcherService';
import * as chokidar from 'chokidar';

describe('ProjectFileWatcherService', () => {
  let service: ProjectFileWatcherService;
  const testProjectPath = '/test/project';

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    service = new ProjectFileWatcherService();
  });

  afterEach(async () => {
    if (service.isRunning()) {
      await service.stop();
    }
    vi.useRealTimers();
  });

  describe('start', () => {
    it('should initialize watcher for CLAUDE.md and steering files', async () => {
      await service.start(testProjectPath);

      expect(chokidar.watch).toHaveBeenCalled();
      const watchCall = (chokidar.watch as any).mock.calls[0];

      // Should watch both CLAUDE.md and .kiro/steering/*.md
      expect(watchCall[0]).toEqual([
        path.join(testProjectPath, 'CLAUDE.md'),
        path.join(testProjectPath, '.kiro', 'steering', '*.md'),
      ]);
    });

    it('should set isRunning to true after start', async () => {
      expect(service.isRunning()).toBe(false);
      await service.start(testProjectPath);
      expect(service.isRunning()).toBe(true);
    });

    it('should stop existing watcher before starting new one', async () => {
      await service.start(testProjectPath);
      const firstWatcher = (chokidar.watch as any).mock.results[0].value;

      await service.start('/another/project');

      expect(firstWatcher.close).toHaveBeenCalled();
    });
  });

  describe('stop', () => {
    it('should close watcher', async () => {
      await service.start(testProjectPath);
      const watcher = (chokidar.watch as any).mock.results[0].value;

      await service.stop();

      expect(watcher.close).toHaveBeenCalled();
    });

    it('should set isRunning to false after stop', async () => {
      await service.start(testProjectPath);
      expect(service.isRunning()).toBe(true);

      await service.stop();
      expect(service.isRunning()).toBe(false);
    });

    it('should be safe to call stop when not running', async () => {
      expect(service.isRunning()).toBe(false);
      await expect(service.stop()).resolves.toBeUndefined();
    });
  });

  describe('onChange', () => {
    it('should register callback', async () => {
      const callback = vi.fn();
      service.onChange(callback);

      await service.start(testProjectPath);

      // Get the 'change' event handler
      const watcher = (chokidar.watch as any).mock.results[0].value;
      const changeHandler = watcher.on.mock.calls.find(
        (call: any[]) => call[0] === 'change'
      )?.[1];

      expect(changeHandler).toBeDefined();
    });

    it('should debounce change events (300ms)', async () => {
      const callback = vi.fn();
      service.onChange(callback);

      await service.start(testProjectPath);

      const watcher = (chokidar.watch as any).mock.results[0].value;
      const changeHandler = watcher.on.mock.calls.find(
        (call: any[]) => call[0] === 'change'
      )?.[1];

      // Trigger multiple changes
      changeHandler('/test/project/CLAUDE.md');
      changeHandler('/test/project/CLAUDE.md');
      changeHandler('/test/project/CLAUDE.md');

      // Callback should not be called immediately
      expect(callback).not.toHaveBeenCalled();

      // Advance timers past debounce period
      vi.advanceTimersByTime(300);

      // Callback should be called once
      expect(callback).toHaveBeenCalledTimes(1);
      expect(callback).toHaveBeenCalledWith('/test/project/CLAUDE.md');
    });

    it('should handle changes to different files separately', async () => {
      const callback = vi.fn();
      service.onChange(callback);

      await service.start(testProjectPath);

      const watcher = (chokidar.watch as any).mock.results[0].value;
      const changeHandler = watcher.on.mock.calls.find(
        (call: any[]) => call[0] === 'change'
      )?.[1];

      // Trigger changes to different files
      changeHandler('/test/project/CLAUDE.md');
      changeHandler('/test/project/.kiro/steering/tech.md');

      vi.advanceTimersByTime(300);

      // Both files should trigger callbacks
      expect(callback).toHaveBeenCalledTimes(2);
      expect(callback).toHaveBeenCalledWith('/test/project/CLAUDE.md');
      expect(callback).toHaveBeenCalledWith('/test/project/.kiro/steering/tech.md');
    });
  });

  describe('isRunning', () => {
    it('should return false initially', () => {
      expect(service.isRunning()).toBe(false);
    });

    it('should return true after start', async () => {
      await service.start(testProjectPath);
      expect(service.isRunning()).toBe(true);
    });

    it('should return false after stop', async () => {
      await service.start(testProjectPath);
      await service.stop();
      expect(service.isRunning()).toBe(false);
    });
  });

  describe('getProjectPath', () => {
    it('should return null when not started', () => {
      expect(service.getProjectPath()).toBeNull();
    });

    it('should return project path when running', async () => {
      await service.start(testProjectPath);
      expect(service.getProjectPath()).toBe(testProjectPath);
    });

    it('should return null after stop', async () => {
      await service.start(testProjectPath);
      await service.stop();
      expect(service.getProjectPath()).toBeNull();
    });
  });
});
