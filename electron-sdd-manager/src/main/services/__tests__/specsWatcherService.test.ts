/**
 * SpecsWatcherService Unit Tests - Root Monitoring Approach
 * file-watcher-root-monitoring: Tests for watchedPaths tracking with root monitoring
 * Requirements: 1.2, 1.3, 9.1, 9.2, 9.3
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { SpecsWatcherService } from '../specsWatcherService';
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

describe('SpecsWatcherService - Root monitoring with watchedPaths tracking', () => {
  let service: SpecsWatcherService;
  let mockWatcher: any;
  let projectPath: string;
  let specsDir: string;
  let worktreeSpecsBaseDir: string;

  beforeEach(async () => {
    // Create temporary directory for testing
    projectPath = path.join(tmpdir(), `test-project-${Date.now()}`);
    specsDir = path.join(projectPath, '.kiro', 'specs');
    worktreeSpecsBaseDir = path.join(projectPath, '.kiro', 'worktrees', 'specs');

    await mkdir(specsDir, { recursive: true });
    await mkdir(worktreeSpecsBaseDir, { recursive: true });

    // Setup mock watcher
    mockWatcher = {
      on: vi.fn().mockReturnThis(),
      add: vi.fn(),
      unwatch: vi.fn(),
      close: vi.fn().mockResolvedValue(undefined),
    };

    vi.mocked(chokidar.watch).mockReturnValue(mockWatcher);

    service = new SpecsWatcherService(projectPath);
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
      expect(watchedPaths.has(specsDir)).toBe(true);
      expect(watchedPaths.has(worktreeSpecsBaseDir)).toBe(true);
    });

    it('should pass both paths to chokidar.watch in a single call', async () => {
      await service.start();

      expect(chokidar.watch).toHaveBeenCalledTimes(1);
      expect(chokidar.watch).toHaveBeenCalledWith(
        expect.arrayContaining([specsDir, worktreeSpecsBaseDir]),
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
      const specId = 'test-spec';
      const worktreeSpecPath = path.join(worktreeSpecsBaseDir, specId, '.kiro', 'specs', specId);
      await mkdir(worktreeSpecPath, { recursive: true });

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

      const newWatchPath = path.join(projectPath, '.kiro', 'worktrees', 'specs', 'another-spec', '.kiro', 'specs');

      await service.resetWatchPath('test-spec', newWatchPath);

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
