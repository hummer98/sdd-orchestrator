/**
 * BugsWatcherService Unit Tests
 * Tests for watchedPaths tracking mechanism to prevent duplicate monitoring
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { BugsWatcherService } from '../bugsWatcherService';
import * as chokidar from 'chokidar';
import * as path from 'path';
import { mkdir, rm } from 'fs/promises';
import { tmpdir } from 'os';

// Mock chokidar
vi.mock('chokidar');

// Mock logger
vi.mock('../logger', () => ({
  logger: {
    info: vi.fn(),
    debug: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

describe('BugsWatcherService - watchedPaths tracking', () => {
  let service: BugsWatcherService;
  let mockWatcher: any;
  let projectPath: string;
  let bugsDir: string;
  let worktreeBugsBaseDir: string;

  beforeEach(async () => {
    // Create temporary directory for testing
    projectPath = path.join(tmpdir(), `test-project-${Date.now()}`);
    bugsDir = path.join(projectPath, '.kiro', 'bugs');
    worktreeBugsBaseDir = path.join(projectPath, '.kiro', 'worktrees', 'bugs');

    await mkdir(bugsDir, { recursive: true });
    await mkdir(worktreeBugsBaseDir, { recursive: true });

    // Setup mock watcher
    mockWatcher = {
      on: vi.fn().mockReturnThis(),
      add: vi.fn(),
      unwatch: vi.fn(),
      close: vi.fn().mockResolvedValue(undefined),
    };

    vi.mocked(chokidar.watch).mockReturnValue(mockWatcher);

    service = new BugsWatcherService(projectPath);
  });

  afterEach(async () => {
    vi.clearAllMocks();
    // Cleanup temporary directory
    await rm(projectPath, { recursive: true, force: true });
  });

  describe('Duplicate path prevention', () => {
    it('should not add the same path twice', async () => {
      await service.start();

      const testPath = path.join(worktreeBugsBaseDir, 'test-bug', '.kiro', 'bugs', 'test-bug');

      // First add
      await service['handleWorktreeAddition'](path.join(worktreeBugsBaseDir, 'test-bug'));

      // Wait for debounce
      await new Promise(resolve => setTimeout(resolve, 600));

      const firstAddCallCount = mockWatcher.add.mock.calls.length;

      // Second add (should be prevented)
      await service['handleWorktreeAddition'](path.join(worktreeBugsBaseDir, 'test-bug'));

      // Wait for debounce
      await new Promise(resolve => setTimeout(resolve, 600));

      // Should not add duplicate
      expect(mockWatcher.add).toHaveBeenCalledTimes(firstAddCallCount);
    });

    it('should track all watched paths in watchedPaths Set', async () => {
      await service.start();

      // Initial paths should be tracked
      const watchedPaths = service['watchedPaths'];
      expect(watchedPaths).toBeDefined();
      expect(watchedPaths.size).toBeGreaterThan(0);
      expect(watchedPaths.has(bugsDir)).toBe(true);
      expect(watchedPaths.has(worktreeBugsBaseDir)).toBe(true);
    });
  });

  describe('Worktree addition handling', () => {
    it('should add path to watchedPaths when worktree is added', async () => {
      await service.start();

      const bugName = 'test-bug';
      const worktreeBugPath = path.join(worktreeBugsBaseDir, bugName, '.kiro', 'bugs', bugName);

      // Create worktree directory
      await mkdir(worktreeBugPath, { recursive: true });

      await service['handleWorktreeAddition'](path.join(worktreeBugsBaseDir, bugName));

      // Wait for debounce
      await new Promise(resolve => setTimeout(resolve, 600));

      const watchedPaths = service['watchedPaths'];
      expect(watchedPaths.has(worktreeBugPath)).toBe(true);
    });
  });

  describe('Worktree removal handling', () => {
    it('should remove path from watchedPaths when worktree is removed', async () => {
      await service.start();

      const bugName = 'test-bug';
      const worktreeBugPath = path.join(worktreeBugsBaseDir, bugName, '.kiro', 'bugs', bugName);

      // Create and add worktree
      await mkdir(worktreeBugPath, { recursive: true });
      await service['handleWorktreeAddition'](path.join(worktreeBugsBaseDir, bugName));
      await new Promise(resolve => setTimeout(resolve, 600));

      // Remove worktree
      service['handleWorktreeRemoval'](path.join(worktreeBugsBaseDir, bugName));

      const watchedPaths = service['watchedPaths'];
      expect(watchedPaths.has(worktreeBugPath)).toBe(false);
    });
  });

  describe('Cleanup on stop', () => {
    it('should unwatch all tracked paths and clear watchedPaths on stop', async () => {
      await service.start();

      const bugName = 'test-bug';
      const worktreeBugPath = path.join(worktreeBugsBaseDir, bugName, '.kiro', 'bugs', bugName);

      // Create and add worktree
      await mkdir(worktreeBugPath, { recursive: true });
      await service['handleWorktreeAddition'](path.join(worktreeBugsBaseDir, bugName));
      await new Promise(resolve => setTimeout(resolve, 600));

      const watchedPaths = service['watchedPaths'];
      const pathsBeforeStop = Array.from(watchedPaths);
      expect(pathsBeforeStop.length).toBeGreaterThan(0);

      // Stop service
      await service.stop();

      // All paths should be unwatched
      for (const watchedPath of pathsBeforeStop) {
        expect(mockWatcher.unwatch).toHaveBeenCalledWith(watchedPath);
      }

      // watchedPaths should be cleared
      expect(watchedPaths.size).toBe(0);
    });

    it('should not leak watchers when stop is called multiple times', async () => {
      await service.start();

      await service.stop();
      const firstCloseCallCount = mockWatcher.close.mock.calls.length;

      await service.stop();
      const secondCloseCallCount = mockWatcher.close.mock.calls.length;

      // Second stop should not call close again
      expect(secondCloseCallCount).toBe(firstCloseCallCount);
    });
  });

  describe('resetWatchPath', () => {
    it('should unwatch old paths and track new path when resetting', async () => {
      await service.start();

      const oldWatchedPaths = new Set(service['watchedPaths']);
      expect(oldWatchedPaths.size).toBeGreaterThan(0);

      const newWatchPath = path.join(projectPath, '.kiro', 'worktrees', 'bugs', 'another-bug', '.kiro', 'bugs');

      await service.resetWatchPath('test-bug', newWatchPath);

      // All old paths should be unwatched
      for (const oldPath of oldWatchedPaths) {
        expect(mockWatcher.unwatch).toHaveBeenCalledWith(oldPath);
      }

      // watchedPaths should contain only the new path
      const watchedPaths = service['watchedPaths'];
      expect(watchedPaths.size).toBe(1);
      expect(watchedPaths.has(newWatchPath)).toBe(true);
    });
  });
});
