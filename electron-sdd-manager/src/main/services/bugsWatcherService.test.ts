import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { BugsWatcherService } from './bugsWatcherService';

// Mock chokidar
vi.mock('chokidar', () => ({
  watch: vi.fn(() => ({
    on: vi.fn().mockReturnThis(),
    close: vi.fn().mockResolvedValue(undefined),
    unwatch: vi.fn(),
  })),
}));

// Mock logger
vi.mock('./logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

describe('BugsWatcherService', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  describe('debounce behavior', () => {
    it('should notify events for different files independently', async () => {
      const service = new BugsWatcherService('/project');
      const callback = vi.fn();
      service.onChange(callback);

      // Access private method via type assertion for testing
      const handleEvent = (service as unknown as { handleEvent: (type: string, path: string) => void }).handleEvent.bind(service);

      // Simulate two different files changing within debounce window
      handleEvent('change', '/project/.kiro/bugs/my-bug/report.md');
      handleEvent('add', '/project/.kiro/bugs/my-bug/analysis.md');

      // Advance timers past debounce period (300ms)
      vi.advanceTimersByTime(350);

      // Both events should be notified
      expect(callback).toHaveBeenCalledTimes(2);
      expect(callback).toHaveBeenCalledWith(
        expect.objectContaining({ path: '/project/.kiro/bugs/my-bug/report.md' })
      );
      expect(callback).toHaveBeenCalledWith(
        expect.objectContaining({ path: '/project/.kiro/bugs/my-bug/analysis.md' })
      );
    });

    it('should debounce rapid changes to the same file', async () => {
      const service = new BugsWatcherService('/project');
      const callback = vi.fn();
      service.onChange(callback);

      const handleEvent = (service as unknown as { handleEvent: (type: string, path: string) => void }).handleEvent.bind(service);

      // Simulate rapid changes to the same file
      handleEvent('change', '/project/.kiro/bugs/my-bug/report.md');
      vi.advanceTimersByTime(100);
      handleEvent('change', '/project/.kiro/bugs/my-bug/report.md');
      vi.advanceTimersByTime(100);
      handleEvent('change', '/project/.kiro/bugs/my-bug/report.md');

      // Advance timers past debounce period
      vi.advanceTimersByTime(350);

      // Only one event should be notified (the last one)
      expect(callback).toHaveBeenCalledTimes(1);
    });

    it('should clear all timers on stop', async () => {
      const service = new BugsWatcherService('/project');
      const callback = vi.fn();
      service.onChange(callback);

      const handleEvent = (service as unknown as { handleEvent: (type: string, path: string) => void }).handleEvent.bind(service);

      // Simulate file changes
      handleEvent('change', '/project/.kiro/bugs/my-bug/report.md');
      handleEvent('add', '/project/.kiro/bugs/my-bug/fix.md');

      // Stop before debounce completes
      await service.stop();

      // Advance timers
      vi.advanceTimersByTime(350);

      // No events should be notified because timers were cleared
      expect(callback).toHaveBeenCalledTimes(0);
    });

    it('should extract correct bugName from file path', async () => {
      const service = new BugsWatcherService('/project');
      const callback = vi.fn();
      service.onChange(callback);

      const handleEvent = (service as unknown as { handleEvent: (type: string, path: string) => void }).handleEvent.bind(service);

      handleEvent('change', '/project/.kiro/bugs/my-bug/report.md');

      vi.advanceTimersByTime(350);

      expect(callback).toHaveBeenCalledWith(
        expect.objectContaining({
          bugName: 'my-bug',
          path: '/project/.kiro/bugs/my-bug/report.md',
        })
      );
    });
  });

  // ============================================================
  // bugs-worktree-support Task 14.1: worktreeモード時の監視パス切り替え
  // Requirements: 3.7
  // ============================================================
  describe('worktree watch path', () => {
    it('should return main project bugs path when no worktree config', () => {
      const service = new BugsWatcherService('/project');
      const watchPath = service.getWatchPath('test-bug');
      expect(watchPath).toBe('/project/.kiro/bugs');
    });

    it('should return worktree bugs path when worktree config is provided', () => {
      const service = new BugsWatcherService('/project');
      const worktreeConfig = {
        path: '../project-worktrees/bugs/test-bug',
        branch: 'bugfix/test-bug',
        created_at: '2024-01-01T00:00:00Z',
      };
      const watchPath = service.getWatchPath('test-bug', worktreeConfig);
      // Relative path should be resolved from main project
      expect(watchPath).toContain('.kiro/bugs');
      expect(watchPath).toContain('project-worktrees');
    });

    it('should reset watch path to new location', async () => {
      const chokidar = await import('chokidar');
      const service = new BugsWatcherService('/project');

      // Start the watcher first (now async)
      await service.start();

      // Reset watch path
      const newPath = '/project-worktrees/bugs/test-bug/.kiro/bugs';
      await service.resetWatchPath('test-bug', newPath);

      // chokidar.watch should have been called twice (initial + reset)
      expect(chokidar.watch).toHaveBeenCalledTimes(2);
      expect(chokidar.watch).toHaveBeenLastCalledWith(
        newPath,
        expect.objectContaining({
          ignoreInitial: true,
          persistent: true,
        })
      );
    });
  });

  // Aligned with SpecsWatcherService: watches specific directories directly
  // Filtering is done by chokidar watch paths, not by handleEvent
  describe('event processing', () => {
    it('should process events within .kiro/bugs/', async () => {
      const service = new BugsWatcherService('/project');
      const callback = vi.fn();
      service.onChange(callback);

      const handleEvent = (service as unknown as { handleEvent: (type: string, path: string) => void }).handleEvent.bind(service);

      // Event inside bugs directory should be processed
      handleEvent('add', '/project/.kiro/bugs/new-bug/report.md');

      vi.advanceTimersByTime(350);

      expect(callback).toHaveBeenCalledTimes(1);
      expect(callback).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'add',
          path: '/project/.kiro/bugs/new-bug/report.md',
          bugName: 'new-bug',
        })
      );
    });

    it('should detect bugs directory creation via addDir event', async () => {
      const service = new BugsWatcherService('/project');
      const callback = vi.fn();
      service.onChange(callback);

      const handleEvent = (service as unknown as { handleEvent: (type: string, path: string) => void }).handleEvent.bind(service);

      // bugs directory creation should trigger event
      handleEvent('addDir', '/project/.kiro/bugs');
      handleEvent('addDir', '/project/.kiro/bugs/new-bug');

      vi.advanceTimersByTime(350);

      // Both addDir events should be processed
      expect(callback).toHaveBeenCalledTimes(2);
    });
  });

  // ============================================================
  // bugs-worktree-directory-mode Task 4.1-4.3: Worktree bugs directory monitoring
  // Requirements: 4.1, 4.2, 4.3
  // ============================================================
  describe('worktree bugs directory path handling', () => {
    it('should recognize worktree bugs path as valid bugs directory', async () => {
      const service = new BugsWatcherService('/project');
      const callback = vi.fn();
      service.onChange(callback);

      const handleEvent = (service as unknown as { handleEvent: (type: string, path: string) => void }).handleEvent.bind(service);

      // Event in worktree bugs directory should be processed
      // Path: .kiro/worktrees/bugs/{bugName}/.kiro/bugs/{bugName}/report.md
      handleEvent('add', '/project/.kiro/worktrees/bugs/my-worktree-bug/.kiro/bugs/my-worktree-bug/report.md');

      vi.advanceTimersByTime(350);

      expect(callback).toHaveBeenCalledTimes(1);
      expect(callback).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'add',
          bugName: 'my-worktree-bug',
        })
      );
    });

    it('should extract correct bugName from worktree bugs path', async () => {
      const service = new BugsWatcherService('/project');
      const callback = vi.fn();
      service.onChange(callback);

      const handleEvent = (service as unknown as { handleEvent: (type: string, path: string) => void }).handleEvent.bind(service);

      handleEvent('change', '/project/.kiro/worktrees/bugs/worktree-bug-123/.kiro/bugs/worktree-bug-123/analysis.md');

      vi.advanceTimersByTime(350);

      expect(callback).toHaveBeenCalledWith(
        expect.objectContaining({
          bugName: 'worktree-bug-123',
          path: '/project/.kiro/worktrees/bugs/worktree-bug-123/.kiro/bugs/worktree-bug-123/analysis.md',
        })
      );
    });

    it('should detect worktree bug directory creation via addDir event', async () => {
      const service = new BugsWatcherService('/project');
      const callback = vi.fn();
      service.onChange(callback);

      const handleEvent = (service as unknown as { handleEvent: (type: string, path: string) => void }).handleEvent.bind(service);

      // Worktree bugs directory creation should trigger event
      handleEvent('addDir', '/project/.kiro/worktrees/bugs/new-worktree-bug/.kiro/bugs/new-worktree-bug');

      vi.advanceTimersByTime(350);

      expect(callback).toHaveBeenCalledTimes(1);
      expect(callback).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'addDir',
          bugName: 'new-worktree-bug',
        })
      );
    });

    it('should handle both main and worktree bugs directories', async () => {
      const service = new BugsWatcherService('/project');
      const callback = vi.fn();
      service.onChange(callback);

      const handleEvent = (service as unknown as { handleEvent: (type: string, path: string) => void }).handleEvent.bind(service);

      // Events from both main and worktree bugs directories
      handleEvent('add', '/project/.kiro/bugs/main-bug/report.md');
      handleEvent('add', '/project/.kiro/worktrees/bugs/worktree-bug/.kiro/bugs/worktree-bug/report.md');

      vi.advanceTimersByTime(350);

      expect(callback).toHaveBeenCalledTimes(2);
      // First call should be main bug
      expect(callback).toHaveBeenNthCalledWith(1,
        expect.objectContaining({ bugName: 'main-bug' })
      );
      // Second call should be worktree bug
      expect(callback).toHaveBeenNthCalledWith(2,
        expect.objectContaining({ bugName: 'worktree-bug' })
      );
    });
  });

  // ============================================================
  // file-watcher-root-monitoring: Root monitoring tests (Task 5.2)
  // Requirements: 8.3
  // ============================================================
  describe('Root monitoring with exclusion patterns', () => {
    it('should ignore .log files', async () => {
      const service = new BugsWatcherService('/project');
      const callback = vi.fn();
      service.onChange(callback);

      const handleEvent = (service as unknown as { handleEvent: (type: string, path: string) => void }).handleEvent.bind(service);

      // .log files should be ignored by extension filtering
      handleEvent('add', '/project/.kiro/bugs/my-bug/debug.log');

      vi.advanceTimersByTime(350);

      // Callback should NOT be called for .log files
      expect(callback).toHaveBeenCalledTimes(0);
    });

    it('should ignore files in runtime/ directory', async () => {
      const service = new BugsWatcherService('/project');
      const callback = vi.fn();
      service.onChange(callback);

      const handleEvent = (service as unknown as { handleEvent: (type: string, path: string) => void }).handleEvent.bind(service);

      // runtime/ directory files should be ignored
      handleEvent('add', '/project/.kiro/bugs/my-bug/runtime/temp.json');

      vi.advanceTimersByTime(350);

      // Callback should NOT be called for runtime/ files
      expect(callback).toHaveBeenCalledTimes(0);
    });

    it('should process .json files', async () => {
      const service = new BugsWatcherService('/project');
      const callback = vi.fn();
      service.onChange(callback);

      const handleEvent = (service as unknown as { handleEvent: (type: string, path: string) => void }).handleEvent.bind(service);

      handleEvent('add', '/project/.kiro/bugs/my-bug/bug.json');

      vi.advanceTimersByTime(350);

      expect(callback).toHaveBeenCalledTimes(1);
      expect(callback).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'add',
          path: '/project/.kiro/bugs/my-bug/bug.json',
        })
      );
    });

    it('should process .md files', async () => {
      const service = new BugsWatcherService('/project');
      const callback = vi.fn();
      service.onChange(callback);

      const handleEvent = (service as unknown as { handleEvent: (type: string, path: string) => void }).handleEvent.bind(service);

      handleEvent('change', '/project/.kiro/bugs/my-bug/report.md');

      vi.advanceTimersByTime(350);

      expect(callback).toHaveBeenCalledTimes(1);
      expect(callback).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'change',
          path: '/project/.kiro/bugs/my-bug/report.md',
        })
      );
    });

    it('should ignore .txt files', async () => {
      const service = new BugsWatcherService('/project');
      const callback = vi.fn();
      service.onChange(callback);

      const handleEvent = (service as unknown as { handleEvent: (type: string, path: string) => void }).handleEvent.bind(service);

      handleEvent('add', '/project/.kiro/bugs/my-bug/notes.txt');

      vi.advanceTimersByTime(350);

      // Only .json and .md files should be processed
      expect(callback).toHaveBeenCalledTimes(0);
    });

    it('should watch with depth undefined for full directory tree', async () => {
      const chokidar = await import('chokidar');
      const service = new BugsWatcherService('/project');
      await service.start();

      // Verify chokidar.watch was called with depth: undefined
      expect(chokidar.watch).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          depth: undefined,
        })
      );
    });

    it('should watch with ignored patterns', async () => {
      const chokidar = await import('chokidar');
      const service = new BugsWatcherService('/project');
      await service.start();

      // Verify chokidar.watch was called with ignored patterns
      expect(chokidar.watch).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
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

  // ============================================================
  // file-watcher-root-monitoring: Root monitoring for worktrees
  // Requirements: 1.1, 1.3, 2.1, 5.1-5.4
  // Note: 2-layer monitoring methods (handleWorktreeAddition, handleWorktreeRemoval) are removed
  // Root monitoring approach watches all paths from the start
  // ============================================================
  describe('Root monitoring for worktrees', () => {
    it('should watch bugs and worktrees directories directly', async () => {
      const chokidar = await import('chokidar');
      const mockWatcher = {
        on: vi.fn().mockReturnThis(),
        close: vi.fn().mockResolvedValue(undefined),
        add: vi.fn(),
        unwatch: vi.fn(),
      };
      (chokidar.watch as any).mockReturnValue(mockWatcher);

      const service = new BugsWatcherService('/project');
      await service.start();

      // Verify that watch is called with array of paths (bugs + worktrees base)
      expect(chokidar.watch).toHaveBeenCalled();
      const watchCall = (chokidar.watch as any).mock.calls[0];
      const watchPaths = watchCall[0];
      expect(Array.isArray(watchPaths)).toBe(true);
      expect(watchPaths).toContain('/project/.kiro/bugs');
      expect(watchPaths).toContain('/project/.kiro/worktrees/bugs');
    });

    it('should NOT have handleWorktreeAddition method (root monitoring approach)', async () => {
      const service = new BugsWatcherService('/project');
      await service.start();

      // handleWorktreeAddition should NOT exist - root monitoring watches all paths from start
      const handleWorktreeAddition = (service as unknown as {
        handleWorktreeAddition?: (dirPath: string) => Promise<void>
      }).handleWorktreeAddition;

      expect(handleWorktreeAddition).toBeUndefined();
    });

    it('should NOT have handleWorktreeRemoval method (root monitoring approach)', async () => {
      const service = new BugsWatcherService('/project');
      await service.start();

      // handleWorktreeRemoval should NOT exist - root monitoring manages all paths statically
      const handleWorktreeRemoval = (service as unknown as {
        handleWorktreeRemoval?: (dirPath: string) => void
      }).handleWorktreeRemoval;

      expect(handleWorktreeRemoval).toBeUndefined();
    });

    it('should extract bugName from worktree paths using root monitoring', async () => {
      const service = new BugsWatcherService('/project');
      const callback = vi.fn();
      service.onChange(callback);

      const handleEvent = (service as unknown as { handleEvent: (type: string, path: string) => void }).handleEvent.bind(service);

      // Test that worktree paths are correctly parsed
      handleEvent('change', '/project/.kiro/worktrees/bugs/my-bug/.kiro/bugs/my-bug/bug.json');

      vi.advanceTimersByTime(350);

      expect(callback).toHaveBeenCalledWith(
        expect.objectContaining({
          bugName: 'my-bug',
        })
      );
    });
  });
});
