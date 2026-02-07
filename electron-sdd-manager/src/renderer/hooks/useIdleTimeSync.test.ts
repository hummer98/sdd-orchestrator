/**
 * useIdleTimeSync Hook Tests
 * Task 7.1: useHumanActivityフックの拡張 - 定期的なアイドル時間のMain Processへの報告
 *
 * Renderer側で最終アクティビティ時刻をMain Processに定期同期するフック
 * - HumanActivityTracker（HAT）によるUI操作追跡のみを使用
 * - ウィンドウフォーカスはアイドル判定に使用しない
 *
 * trpc-full-migration Task 11.4: Updated to use tRPC vanillaClient mock
 * instead of window.electronAPI mock.
 */

import { describe, it, expect, beforeEach, afterEach, vi, type Mock } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useIdleTimeSync, IDLE_SYNC_INTERVAL_MS } from './useIdleTimeSync';
import { getHumanActivityTracker } from '../services/humanActivityTracker';

// Mock humanActivityTracker
vi.mock('../services/humanActivityTracker', () => ({
  getHumanActivityTracker: vi.fn(),
  initHumanActivityTracker: vi.fn(),
}));

// trpc-full-migration Task 11.4: Mock tRPC vanilla client for reportIdleTime
const mockReportIdleTime = vi.fn().mockResolvedValue(undefined);
vi.mock('../../shared/trpc/vanillaClient', () => ({
  getVanillaClient: () => ({
    schedule: {
      reportIdleTime: { mutate: mockReportIdleTime },
    },
  }),
}));

describe('useIdleTimeSync', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  // ===========================================================================
  // 定期的な同期
  // ===========================================================================

  describe('periodic sync', () => {
    it('should sync idle time periodically when HAT is active', async () => {
      const lastActivityTime = Date.now();
      const mockTracker = {
        isActive: true,
        getLastActivityTime: () => lastActivityTime,
      };
      (getHumanActivityTracker as Mock).mockReturnValue(mockTracker);

      renderHook(() => useIdleTimeSync({ projectPath: '/test/project' }));

      // Allow useEffect to run and initial sync to complete
      await act(async () => {
        await vi.advanceTimersByTimeAsync(100);
      });

      // Initial sync on mount
      expect(mockReportIdleTime).toHaveBeenCalledTimes(1);

      // Advance time by sync interval
      await act(async () => {
        await vi.advanceTimersByTimeAsync(IDLE_SYNC_INTERVAL_MS);
      });

      expect(mockReportIdleTime).toHaveBeenCalledTimes(2);
    });

    it('should report lastActivityTime to Main Process via tRPC', async () => {
      const now = Date.now();
      vi.setSystemTime(now);

      const lastActivityTime = now - 5000; // 5 seconds ago
      const mockTracker = {
        isActive: true,
        getLastActivityTime: () => lastActivityTime,
      };
      (getHumanActivityTracker as Mock).mockReturnValue(mockTracker);

      renderHook(() => useIdleTimeSync({ projectPath: '/test/project' }));

      // Allow useEffect to run
      await act(async () => {
        await vi.advanceTimersByTimeAsync(100);
      });

      // Verify tRPC client was called with correct parameters
      expect(mockReportIdleTime).toHaveBeenCalledWith({ lastActivityTime });
    });

    it('should cleanup interval on unmount', async () => {
      const lastActivityTime = Date.now();
      const mockTracker = {
        isActive: true,
        getLastActivityTime: () => lastActivityTime,
      };
      (getHumanActivityTracker as Mock).mockReturnValue(mockTracker);

      const { unmount } = renderHook(() => useIdleTimeSync({ projectPath: '/test/project' }));

      // Initial sync
      await act(async () => {
        await vi.advanceTimersByTimeAsync(100);
      });
      expect(mockReportIdleTime).toHaveBeenCalledTimes(1);

      // Unmount
      unmount();

      // Clear previous calls
      mockReportIdleTime.mockClear();

      // Advance time - should NOT sync after unmount
      await act(async () => {
        await vi.advanceTimersByTimeAsync(IDLE_SYNC_INTERVAL_MS * 2);
      });

      expect(mockReportIdleTime).not.toHaveBeenCalled();
    });
  });

  // ===========================================================================
  // projectPath=null時の報告スキップ
  // ===========================================================================

  describe('project path handling', () => {
    it('should skip reporting when projectPath is null', async () => {
      const lastActivityTime = Date.now();
      const mockTracker = {
        isActive: true,
        getLastActivityTime: () => lastActivityTime,
      };
      (getHumanActivityTracker as Mock).mockReturnValue(mockTracker);

      renderHook(() => useIdleTimeSync({ projectPath: null }));

      // Allow useEffect to run
      await act(async () => {
        await vi.advanceTimersByTimeAsync(100);
      });

      // Should not sync when projectPath is null
      expect(mockReportIdleTime).not.toHaveBeenCalled();

      // Advance time
      await act(async () => {
        await vi.advanceTimersByTimeAsync(IDLE_SYNC_INTERVAL_MS);
      });

      // Still should not sync
      expect(mockReportIdleTime).not.toHaveBeenCalled();
    });

    it('should start reporting when projectPath changes from null to value', async () => {
      const lastActivityTime = Date.now();
      const mockTracker = {
        isActive: true,
        getLastActivityTime: () => lastActivityTime,
      };
      (getHumanActivityTracker as Mock).mockReturnValue(mockTracker);

      const { rerender } = renderHook(
        ({ projectPath }) => useIdleTimeSync({ projectPath }),
        { initialProps: { projectPath: null as string | null } }
      );

      // Allow useEffect to run - should not sync
      await act(async () => {
        await vi.advanceTimersByTimeAsync(100);
      });
      expect(mockReportIdleTime).not.toHaveBeenCalled();

      // Change projectPath
      rerender({ projectPath: '/test/project' });

      // Allow useEffect to run - should sync now
      await act(async () => {
        await vi.advanceTimersByTimeAsync(100);
      });
      expect(mockReportIdleTime).toHaveBeenCalled();
    });
  });

  // ===========================================================================
  // HAT非アクティブ時の動作（Spec未選択 = アイドル）
  // ===========================================================================

  describe('HAT inactive handling (Spec未選択 = アイドル)', () => {
    it('should NOT report when HAT.isActive=false (Spec未選択)', async () => {
      const mockTracker = {
        isActive: false,
        getLastActivityTime: () => null,
      };
      (getHumanActivityTracker as Mock).mockReturnValue(mockTracker);

      renderHook(() => useIdleTimeSync({ projectPath: '/test/project' }));

      await act(async () => {
        await vi.advanceTimersByTimeAsync(100);
      });

      // Should NOT sync - no activity means idle
      expect(mockReportIdleTime).not.toHaveBeenCalled();
    });

    it('should NOT report when HAT.isActive=true but lastActivityTime is null', async () => {
      const mockTracker = {
        isActive: true,
        getLastActivityTime: () => null, // HAT active but no activity recorded yet
      };
      (getHumanActivityTracker as Mock).mockReturnValue(mockTracker);

      renderHook(() => useIdleTimeSync({ projectPath: '/test/project' }));

      await act(async () => {
        await vi.advanceTimersByTimeAsync(100);
      });

      // Should NOT sync - no activity time available
      expect(mockReportIdleTime).not.toHaveBeenCalled();
    });

    it('should report when HAT becomes active with activity', async () => {
      const now = Date.now();
      vi.setSystemTime(now);

      // Initially HAT is not active
      let hatActive = false;
      let hatTime: number | null = null;
      (getHumanActivityTracker as Mock).mockReturnValue({
        get isActive() { return hatActive; },
        getLastActivityTime: () => hatTime,
      });

      renderHook(() => useIdleTimeSync({ projectPath: '/test/project' }));

      // Initial sync - no activity (HAT not active)
      await act(async () => {
        await vi.advanceTimersByTimeAsync(100);
      });
      expect(mockReportIdleTime).not.toHaveBeenCalled();

      // Simulate Spec selection (HAT becomes active)
      hatActive = true;
      hatTime = now - 5000;

      // Next sync should report
      await act(async () => {
        await vi.advanceTimersByTimeAsync(IDLE_SYNC_INTERVAL_MS);
      });
      expect(mockReportIdleTime).toHaveBeenCalledWith({ lastActivityTime: hatTime });
    });
  });

  // ===========================================================================
  // Spec選択/解除時の動作
  // ===========================================================================

  describe('Spec selection/deselection', () => {
    it('should stop reporting when Spec is deselected (HAT becomes inactive)', async () => {
      const now = Date.now();
      vi.setSystemTime(now);

      const hatActivityTime = now - 5000;

      // Initially HAT is active
      let hatActive = true;
      let hatTime: number | null = hatActivityTime;
      (getHumanActivityTracker as Mock).mockReturnValue({
        get isActive() { return hatActive; },
        getLastActivityTime: () => hatTime,
      });

      renderHook(() => useIdleTimeSync({ projectPath: '/test/project' }));

      // Initial sync with HAT
      await act(async () => {
        await vi.advanceTimersByTimeAsync(100);
      });
      expect(mockReportIdleTime).toHaveBeenCalledWith({ lastActivityTime: hatActivityTime });

      // Simulate Spec deselection (HAT becomes inactive)
      hatActive = false;
      hatTime = null;

      // Next sync should NOT report (no fallback to focus tracker)
      mockReportIdleTime.mockClear();
      await act(async () => {
        await vi.advanceTimersByTimeAsync(IDLE_SYNC_INTERVAL_MS);
      });
      expect(mockReportIdleTime).not.toHaveBeenCalled();
    });
  });

  // ===========================================================================
  // Edge cases
  // ===========================================================================

  describe('edge cases', () => {
    it('should handle null tracker gracefully', async () => {
      (getHumanActivityTracker as Mock).mockReturnValue(null);

      // Should not throw
      expect(() => {
        renderHook(() => useIdleTimeSync({ projectPath: '/test/project' }));
      }).not.toThrow();

      // Advance time
      await act(async () => {
        await vi.advanceTimersByTimeAsync(IDLE_SYNC_INTERVAL_MS);
      });

      // Should NOT report when HAT is null
      expect(mockReportIdleTime).not.toHaveBeenCalled();
    });

    it('should handle tRPC errors gracefully', async () => {
      const lastActivityTime = Date.now();
      const mockTracker = {
        isActive: true,
        getLastActivityTime: () => lastActivityTime,
      };
      (getHumanActivityTracker as Mock).mockReturnValue(mockTracker);
      mockReportIdleTime.mockRejectedValueOnce(new Error('tRPC failed'));

      // Should not throw
      expect(() => {
        renderHook(() => useIdleTimeSync({ projectPath: '/test/project' }));
      }).not.toThrow();

      // Wait for async operation
      await act(async () => {
        vi.advanceTimersByTime(100);
      });

      // Continue syncing after error
      mockReportIdleTime.mockResolvedValue(undefined);

      act(() => {
        vi.advanceTimersByTime(IDLE_SYNC_INTERVAL_MS);
      });

      // Should have attempted again
      expect(mockReportIdleTime).toHaveBeenCalledTimes(2);
    });
  });
});
