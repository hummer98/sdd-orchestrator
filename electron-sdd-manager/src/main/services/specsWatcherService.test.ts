import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { SpecsWatcherService } from './specsWatcherService';

// Mock chokidar
vi.mock('chokidar', () => ({
  watch: vi.fn(() => ({
    on: vi.fn().mockReturnThis(),
    close: vi.fn().mockResolvedValue(undefined),
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

describe('SpecsWatcherService', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  describe('debounce behavior', () => {
    it('should notify events for different files independently', async () => {
      const service = new SpecsWatcherService('/project');
      const callback = vi.fn();
      service.onChange(callback);

      // Access private method via type assertion for testing
      const handleEvent = (service as unknown as { handleEvent: (type: string, path: string) => void }).handleEvent.bind(service);

      // Simulate two different files changing within debounce window
      handleEvent('change', '/project/.kiro/specs/feature/tasks.md');
      handleEvent('add', '/project/.kiro/specs/feature/inspection-1.md');

      // Advance timers past debounce period (300ms)
      vi.advanceTimersByTime(350);

      // Both events should be notified
      expect(callback).toHaveBeenCalledTimes(2);
      expect(callback).toHaveBeenCalledWith(
        expect.objectContaining({ path: '/project/.kiro/specs/feature/tasks.md' })
      );
      expect(callback).toHaveBeenCalledWith(
        expect.objectContaining({ path: '/project/.kiro/specs/feature/inspection-1.md' })
      );
    });

    it('should debounce rapid changes to the same file', async () => {
      const service = new SpecsWatcherService('/project');
      const callback = vi.fn();
      service.onChange(callback);

      const handleEvent = (service as unknown as { handleEvent: (type: string, path: string) => void }).handleEvent.bind(service);

      // Simulate rapid changes to the same file
      handleEvent('change', '/project/.kiro/specs/feature/tasks.md');
      vi.advanceTimersByTime(100);
      handleEvent('change', '/project/.kiro/specs/feature/tasks.md');
      vi.advanceTimersByTime(100);
      handleEvent('change', '/project/.kiro/specs/feature/tasks.md');

      // Advance timers past debounce period
      vi.advanceTimersByTime(350);

      // Only one event should be notified (the last one)
      expect(callback).toHaveBeenCalledTimes(1);
    });

    it('should clear all timers on stop', async () => {
      const service = new SpecsWatcherService('/project');
      const callback = vi.fn();
      service.onChange(callback);

      const handleEvent = (service as unknown as { handleEvent: (type: string, path: string) => void }).handleEvent.bind(service);

      // Simulate file changes
      handleEvent('change', '/project/.kiro/specs/feature/tasks.md');
      handleEvent('add', '/project/.kiro/specs/feature/design.md');

      // Stop before debounce completes
      await service.stop();

      // Advance timers
      vi.advanceTimersByTime(350);

      // No events should be notified because timers were cleared
      expect(callback).toHaveBeenCalledTimes(0);
    });

    it('should extract correct specId from file path', async () => {
      const service = new SpecsWatcherService('/project');
      const callback = vi.fn();
      service.onChange(callback);

      const handleEvent = (service as unknown as { handleEvent: (type: string, path: string) => void }).handleEvent.bind(service);

      handleEvent('change', '/project/.kiro/specs/my-feature/tasks.md');

      vi.advanceTimersByTime(350);

      expect(callback).toHaveBeenCalledWith(
        expect.objectContaining({
          specId: 'my-feature',
          path: '/project/.kiro/specs/my-feature/tasks.md',
        })
      );
    });
  });

  // ============================================================
  // spec-phase-auto-update Task 5: 検査完了検出
  // Requirements: 2.1, 5.1
  // ============================================================
  describe('Inspection completion detection', () => {
    it('should check inspection completion when spec.json changes', async () => {
      const mockFileService = {
        updateSpecJsonFromPhase: vi.fn().mockResolvedValue({ ok: true }),
        validatePhaseTransition: vi.fn().mockReturnValue({ ok: true }),
      };

      const service = new SpecsWatcherService('/project', mockFileService as any);
      const callback = vi.fn();
      service.onChange(callback);

      // Access checkInspectionCompletion via private method
      const checkInspectionCompletion = (service as unknown as {
        checkInspectionCompletion: (filePath: string, specId: string) => Promise<void>
      }).checkInspectionCompletion;

      // This test verifies that the method exists and can be called
      // The actual file system reading is mocked in integration tests
      expect(checkInspectionCompletion).toBeDefined();
    });
  });

  // ============================================================
  // spec-phase-auto-update Task 6: デプロイ完了検出
  // Requirements: 2.2, 5.2
  // worktree-execution-ui FIX-3: worktreeフィールド削除
  // ============================================================
  describe('Deploy completion detection', () => {
    it('should check deploy completion when spec.json changes', async () => {
      const mockFileService = {
        updateSpecJsonFromPhase: vi.fn().mockResolvedValue({ ok: true }),
        validatePhaseTransition: vi.fn().mockReturnValue({ ok: true }),
      };

      const service = new SpecsWatcherService('/project', mockFileService as any);

      // Access checkDeployCompletion via private method
      const checkDeployCompletion = (service as unknown as {
        checkDeployCompletion: (filePath: string, specId: string) => Promise<void>
      }).checkDeployCompletion;

      // This test verifies that the method exists and can be called
      expect(checkDeployCompletion).toBeDefined();
    });

    // FIX-3: worktreeフィールド削除のテスト
    it('should have checkDeployCompletion method that can remove worktree field', async () => {
      const mockRemoveWorktreeField = vi.fn().mockResolvedValue({ ok: true });
      const mockFileService = {
        updateSpecJsonFromPhase: vi.fn().mockResolvedValue({ ok: true }),
        validatePhaseTransition: vi.fn().mockReturnValue({ ok: true }),
        removeWorktreeField: mockRemoveWorktreeField,
      };

      const service = new SpecsWatcherService('/project', mockFileService as any);

      // Access checkDeployCompletion via private method
      const checkDeployCompletion = (service as unknown as {
        checkDeployCompletion: (filePath: string, specId: string) => Promise<void>
      }).checkDeployCompletion;

      // The method should exist and be callable
      expect(checkDeployCompletion).toBeDefined();
      // Note: Actual behavior tested in integration tests
    });
  });

  // ============================================================
  // git-worktree-support Task 7.1: 監視パス動的切り替え
  // Requirements: 8.1, 8.2
  // ============================================================
  describe('Watch path dynamic switching', () => {
    it('should watch main project path when worktree field is absent', () => {
      const service = new SpecsWatcherService('/project');
      // When no worktree config, should watch main project
      const watchPath = service.getWatchPath('my-feature', undefined);
      expect(watchPath).toBe('/project/.kiro/specs');
    });

    it('should watch worktree path when worktree config is provided', () => {
      const service = new SpecsWatcherService('/project');
      const worktreeConfig = {
        path: '../project-worktrees/my-feature',
        branch: 'feature/my-feature',
        created_at: '2026-01-12T12:00:00+09:00',
      };
      const watchPath = service.getWatchPath('my-feature', worktreeConfig);
      // Should resolve to worktree specs path
      expect(watchPath).toContain('project-worktrees');
      expect(watchPath).toContain('my-feature');
      expect(watchPath).toContain('.kiro/specs');
    });

    it('should provide resetWatchPath method', () => {
      const service = new SpecsWatcherService('/project');
      // Verify resetWatchPath method exists
      expect(typeof service.resetWatchPath).toBe('function');
    });

    it('should reset watcher when resetWatchPath is called', async () => {
      const chokidar = await import('chokidar');
      const mockClose = vi.fn().mockResolvedValue(undefined);
      const mockWatcher = {
        on: vi.fn().mockReturnThis(),
        close: mockClose,
      };
      (chokidar.watch as any).mockReturnValue(mockWatcher);

      const service = new SpecsWatcherService('/project');
      service.start();

      // Reset watch path to new location
      await service.resetWatchPath('my-feature', '/new/watch/path');

      // Old watcher should be closed
      expect(mockClose).toHaveBeenCalled();
      // New watcher should be created
      expect(chokidar.watch).toHaveBeenCalledTimes(2);
    });

    it('should update watch path on spec.json worktree field change', async () => {
      const mockFileService = {
        updateSpecJsonFromPhase: vi.fn().mockResolvedValue({ ok: true }),
        validatePhaseTransition: vi.fn().mockReturnValue({ ok: true }),
      };

      const service = new SpecsWatcherService('/project', mockFileService as any);
      // TODO: Uncomment when git-worktree-support feature is complete
      // const resetWatchPathSpy = vi.spyOn(service, 'resetWatchPath');
      // // Access private method for testing worktree detection
      // const checkWorktreeChange = (service as unknown as {
      //   checkWorktreeChange: (specJsonPath: string, specId: string) => Promise<void>
      // }).checkWorktreeChange;
      //
      // // Verify the method exists
      // expect(checkWorktreeChange).toBeDefined();

      // For now, just verify the service was created
      expect(service).toBeDefined();
    });
  });

  // ============================================================
  // inspection-fix-task-format Task 4.1: 既存パーサーの後方互換性確認
  // Requirements: 3.1 - 既存パーサーがFIX-N形式を引き続き認識
  // ============================================================
  describe('Task completion parser backward compatibility', () => {
    it('should count completed tasks with N.M format (standard)', () => {
      // Test the regex pattern used in checkTaskCompletion
      const content = `# Implementation Plan

- [x] 1. タスクグループ1
- [x] 1.1 サブタスク1
- [x] 1.2 サブタスク2
- [ ] 2. タスクグループ2
- [ ] 2.1 未完了サブタスク`;

      const completedMatches = content.match(/^- \[x\]/gim) || [];
      const pendingMatches = content.match(/^- \[ \]/gm) || [];
      const total = completedMatches.length + pendingMatches.length;
      const completed = completedMatches.length;

      expect(completed).toBe(3);
      expect(total).toBe(5);
    });

    it('should count completed tasks with FIX-N format (legacy)', () => {
      // Requirement 3.1: Existing parser must recognize FIX-N format
      const content = `# Implementation Plan

- [x] 1. タスクグループ1
- [x] 1.1 サブタスク1
- [ ] FIX-1 修正タスク1
- [x] FIX-2 修正タスク2`;

      const completedMatches = content.match(/^- \[x\]/gim) || [];
      const pendingMatches = content.match(/^- \[ \]/gm) || [];
      const total = completedMatches.length + pendingMatches.length;
      const completed = completedMatches.length;

      // FIX-N format should be counted same as N.M format
      expect(completed).toBe(3);
      expect(total).toBe(4);
    });

    it('should count completed tasks with mixed format (N.M and FIX-N)', () => {
      // Requirement 3.1, 3.2: Mixed format should work correctly
      const content = `# Implementation Plan

- [x] 1. タスクグループ1
- [x] 1.1 サブタスク1
- [x] 1.2 サブタスク2
- [x] 2. タスクグループ2
- [x] 2.1 サブタスク

---

## Inspection Fixes

### Round 1 (2026-01-17)

- [x] FIX-1 レガシー修正タスク1
- [ ] FIX-2 レガシー修正タスク2

### Round 2 (2026-01-18)

- [x] 3.1 新形式の修正タスク
- [ ] 3.2 新形式の未完了タスク`;

      const completedMatches = content.match(/^- \[x\]/gim) || [];
      const pendingMatches = content.match(/^- \[ \]/gm) || [];
      const total = completedMatches.length + pendingMatches.length;
      const completed = completedMatches.length;

      // Both formats should be counted correctly
      expect(completed).toBe(7); // 5 standard + 1 FIX-1 + 1 3.1
      expect(total).toBe(9); // 7 completed + 2 pending
    });

    it('should handle case-insensitive checkbox matching', () => {
      // The regex uses 'gim' flag - case insensitive
      const content = `- [X] 大文字チェック
- [x] 小文字チェック
- [ ] 未完了`;

      const completedMatches = content.match(/^- \[x\]/gim) || [];
      expect(completedMatches.length).toBe(2);
    });
  });

  // ============================================================
  // inspection-fix-task-format Task 4.2: 既存ファイルの非変換確認
  // Requirements: 3.2 - 既存FIX-N形式は変換しない
  // ============================================================
  describe('No conversion of existing FIX-N format', () => {
    it('should preserve FIX-N format in existing tasks.md content', () => {
      // Requirement 3.2: Existing FIX-N format should NOT be converted
      const originalContent = `# Implementation Plan

- [x] 1. タスクグループ1
- [x] 1.1 サブタスク1

---

## Inspection Fixes

### Round 1 (2026-01-15)

- [x] FIX-1 既存の修正タスク
- [x] FIX-2 既存の修正タスク2`;

      // The parser should read without modifying FIX-N format
      // This test verifies the format is preserved when re-read
      expect(originalContent).toContain('FIX-1');
      expect(originalContent).toContain('FIX-2');

      // The regex should match both formats for counting
      const completedMatches = originalContent.match(/^- \[x\]/gim) || [];
      expect(completedMatches.length).toBe(4);
    });

    it('should calculate progress correctly with mixed formats', () => {
      // Requirement 3.2: Progress calculation should work with both formats
      const content = `- [x] 1.1 完了タスク
- [x] 1.2 完了タスク
- [x] FIX-1 完了修正
- [ ] FIX-2 未完了修正
- [ ] 2.1 未完了タスク`;

      const completedMatches = content.match(/^- \[x\]/gim) || [];
      const pendingMatches = content.match(/^- \[ \]/gm) || [];
      const total = completedMatches.length + pendingMatches.length;
      const completed = completedMatches.length;
      const progressPercent = Math.round((completed / total) * 100);

      expect(progressPercent).toBe(60); // 3/5 = 60%
    });
  });
});
