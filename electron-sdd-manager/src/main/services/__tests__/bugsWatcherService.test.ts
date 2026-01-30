/**
 * BugsWatcherService Unit Tests - Root Monitoring Approach
 * file-watcher-root-monitoring: Tests for watchedPaths tracking with root monitoring
 * Requirements: 1.1, 1.3, 9.1, 9.2, 9.3
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

describe('BugsWatcherService - Root monitoring with watchedPaths tracking', () => {
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

  describe('Root monitoring path initialization', () => {
    it('should track both main and worktree base paths in watchedPaths on start', async () => {
      await service.start();

      // Initial paths should be tracked
      const watchedPaths = service['watchedPaths'];
      expect(watchedPaths).toBeDefined();
      expect(watchedPaths.size).toBe(2);
      expect(watchedPaths.has(bugsDir)).toBe(true);
      expect(watchedPaths.has(worktreeBugsBaseDir)).toBe(true);
    });

    it('should pass both paths to chokidar.watch in a single call', async () => {
      await service.start();

      expect(chokidar.watch).toHaveBeenCalledTimes(1);
      expect(chokidar.watch).toHaveBeenCalledWith(
        expect.arrayContaining([bugsDir, worktreeBugsBaseDir]),
        expect.objectContaining({
          depth: undefined,
          ignored: expect.arrayContaining([
            '**/runtime/**',
            '**/.git/**',
            '**/logs/**',
            '**/*.log',
          ]),
        })
      );
    });
  });

  describe('Root monitoring approach - no dynamic path addition', () => {
    it('should NOT have handleWorktreeAddition method', async () => {
      await service.start();

      const handleWorktreeAddition = (service as any).handleWorktreeAddition;
      expect(handleWorktreeAddition).toBeUndefined();
    });

    it('should NOT have handleWorktreeRemoval method', async () => {
      await service.start();

      const handleWorktreeRemoval = (service as any).handleWorktreeRemoval;
      expect(handleWorktreeRemoval).toBeUndefined();
    });

    it('should NOT call watcher.add after initialization (root monitoring)', async () => {
      await service.start();

      // Reset mock to clear initialization call
      mockWatcher.add.mockClear();

      // Create a worktree directory (in real scenario, this happens via git worktree add)
      const bugName = 'test-bug';
      const worktreeBugPath = path.join(worktreeBugsBaseDir, bugName, '.kiro', 'bugs', bugName);
      await mkdir(worktreeBugPath, { recursive: true });

      // Root monitoring does not dynamically add paths
      expect(mockWatcher.add).not.toHaveBeenCalled();
    });
  });

  describe('Cleanup on stop', () => {
    it('should unwatch all tracked paths and clear watchedPaths on stop', async () => {
      await service.start();

      const watchedPaths = service['watchedPaths'];
      const pathsBeforeStop = Array.from(watchedPaths);
      expect(pathsBeforeStop.length).toBe(2);

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
      expect(oldWatchedPaths.size).toBe(2);

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
