/**
 * useIdleTimeSync Hook Tests
 * Task 7.1: useHumanActivityフックの拡張 - 定期的なアイドル時間のMain Processへの報告
 * Task 3.1: useIdleTimeSync のテストケース追加
 * Requirements: 4.3 (アイドル検出時キュー追加), 5.1 (Spec追跡優先ロジック), 5.3 (プロジェクト未選択)
 *
 * Renderer側で最終アクティビティ時刻をMain Processに定期同期するフック
 */

import { describe, it, expect, beforeEach, afterEach, vi, type Mock } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useIdleTimeSync, IDLE_SYNC_INTERVAL_MS } from './useIdleTimeSync';
import {
  getHumanActivityTracker,
  initHumanActivityTracker,
} from '../services/humanActivityTracker';
import { useWindowFocusTracker } from './useWindowFocusTracker';

// Mock humanActivityTracker
vi.mock('../services/humanActivityTracker', () => ({
  getHumanActivityTracker: vi.fn(),
  initHumanActivityTracker: vi.fn(),
}));

// Mock useWindowFocusTracker
const mockFocusTrackerGetLastActivityTime = vi.fn();
const mockFocusTrackerIsFocused = vi.fn();

vi.mock('./useWindowFocusTracker', () => ({
  useWindowFocusTracker: vi.fn(() => ({
    getLastActivityTime: mockFocusTrackerGetLastActivityTime,
    isFocused: mockFocusTrackerIsFocused,
  })),
}));

// Mock window.electronAPI
const mockReportIdleTime = vi.fn().mockResolvedValue(undefined);

// Store original electronAPI
const originalElectronAPI = window.electronAPI;

describe('useIdleTimeSync', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();

    // Default focus tracker mocks (unfocused, no activity time)
    mockFocusTrackerGetLastActivityTime.mockReturnValue(null);
    mockFocusTrackerIsFocused.mockReturnValue(false);

    // Setup window.electronAPI mock (use existing window object from jsdom)
    (window as Window & { electronAPI?: { reportIdleTime: typeof mockReportIdleTime } }).electronAPI = {
      reportIdleTime: mockReportIdleTime,
    };
  });

  afterEach(() => {
    vi.useRealTimers();

    // Restore original electronAPI
    (window as Window & { electronAPI?: unknown }).electronAPI = originalElectronAPI;
  });

  // ===========================================================================
  // Requirement 4.3: 定期的な同期
  // ===========================================================================

  describe('periodic sync', () => {
    it('should sync idle time periodically', async () => {
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

    it('should report lastActivityTime to Main Process', async () => {
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

      expect(mockReportIdleTime).toHaveBeenCalledWith(lastActivityTime);
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
  // Requirement 1.2, 5.3: projectPath=null時の報告スキップ
  // ===========================================================================

  describe('project path handling (Requirement 1.2, 5.3)', () => {
    it('should skip reporting when projectPath is null', async () => {
      const lastActivityTime = Date.now();
      const mockTracker = {
        isActive: true,
        getLastActivityTime: () => lastActivityTime,
      };
      (getHumanActivityTracker as Mock).mockReturnValue(mockTracker);
      mockFocusTrackerGetLastActivityTime.mockReturnValue(lastActivityTime);
      mockFocusTrackerIsFocused.mockReturnValue(true);

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
  // Requirement 3.1, 3.2, 5.1: Spec追跡優先ロジック
  // ===========================================================================

  describe('Spec tracking priority (Requirement 3.1, 3.2, 5.1)', () => {
    it('should use HAT activity time when HAT.isActive=true and lastActivityTime is not null', async () => {
      const now = Date.now();
      vi.setSystemTime(now);

      const hatActivityTime = now - 5000; // HAT: 5 seconds ago
      const focusActivityTime = now - 10000; // Focus: 10 seconds ago

      const mockTracker = {
        isActive: true,
        getLastActivityTime: () => hatActivityTime,
      };
      (getHumanActivityTracker as Mock).mockReturnValue(mockTracker);
      mockFocusTrackerGetLastActivityTime.mockReturnValue(focusActivityTime);
      mockFocusTrackerIsFocused.mockReturnValue(true);

      renderHook(() => useIdleTimeSync({ projectPath: '/test/project' }));

      await act(async () => {
        await vi.advanceTimersByTimeAsync(100);
      });

      // Should use HAT activity time (Spec tracking priority)
      expect(mockReportIdleTime).toHaveBeenCalledWith(hatActivityTime);
    });

    it('should use focus tracker time when HAT.isActive=false', async () => {
      const now = Date.now();
      vi.setSystemTime(now);

      const focusActivityTime = now - 10000; // Focus: 10 seconds ago

      const mockTracker = {
        isActive: false,
        getLastActivityTime: () => null,
      };
      (getHumanActivityTracker as Mock).mockReturnValue(mockTracker);
      mockFocusTrackerGetLastActivityTime.mockReturnValue(focusActivityTime);
      mockFocusTrackerIsFocused.mockReturnValue(true);

      renderHook(() => useIdleTimeSync({ projectPath: '/test/project' }));

      await act(async () => {
        await vi.advanceTimersByTimeAsync(100);
      });

      // Should use focus tracker time (fallback)
      expect(mockReportIdleTime).toHaveBeenCalledWith(focusActivityTime);
    });

    it('should use focus tracker time when HAT.isActive=true but lastActivityTime is null', async () => {
      const now = Date.now();
      vi.setSystemTime(now);

      const focusActivityTime = now - 10000;

      const mockTracker = {
        isActive: true,
        getLastActivityTime: () => null, // HAT active but no activity recorded yet
      };
      (getHumanActivityTracker as Mock).mockReturnValue(mockTracker);
      mockFocusTrackerGetLastActivityTime.mockReturnValue(focusActivityTime);
      mockFocusTrackerIsFocused.mockReturnValue(true);

      renderHook(() => useIdleTimeSync({ projectPath: '/test/project' }));

      await act(async () => {
        await vi.advanceTimersByTimeAsync(100);
      });

      // Should use focus tracker time (HAT has no activity)
      expect(mockReportIdleTime).toHaveBeenCalledWith(focusActivityTime);
    });

    it('should skip reporting when both HAT and focus tracker have no activity time', async () => {
      const mockTracker = {
        isActive: false,
        getLastActivityTime: () => null,
      };
      (getHumanActivityTracker as Mock).mockReturnValue(mockTracker);
      mockFocusTrackerGetLastActivityTime.mockReturnValue(null);
      mockFocusTrackerIsFocused.mockReturnValue(false);

      renderHook(() => useIdleTimeSync({ projectPath: '/test/project' }));

      await act(async () => {
        await vi.advanceTimersByTimeAsync(100);
      });

      // Should not sync when no activity time available
      expect(mockReportIdleTime).not.toHaveBeenCalled();
    });
  });

  // ===========================================================================
  // Requirement 3.3, 3.4: Spec選択/解除時の切り替え
  // ===========================================================================

  describe('Spec selection switching (Requirement 3.3, 3.4)', () => {
    it('should switch from focus tracker to HAT when Spec is selected', async () => {
      const now = Date.now();
      vi.setSystemTime(now);

      const focusActivityTime = now - 10000;
      const hatActivityTime = now - 5000;

      // Initially HAT is not active
      const mockTracker = {
        isActive: false,
        getLastActivityTime: () => null,
      };
      (getHumanActivityTracker as Mock).mockReturnValue(mockTracker);
      mockFocusTrackerGetLastActivityTime.mockReturnValue(focusActivityTime);
      mockFocusTrackerIsFocused.mockReturnValue(true);

      renderHook(() => useIdleTimeSync({ projectPath: '/test/project' }));

      // Initial sync with focus tracker
      await act(async () => {
        await vi.advanceTimersByTimeAsync(100);
      });
      expect(mockReportIdleTime).toHaveBeenCalledWith(focusActivityTime);

      // Simulate Spec selection (HAT becomes active)
      mockTracker.isActive = true;
      (mockTracker as { getLastActivityTime: () => number | null }).getLastActivityTime = () => hatActivityTime;

      // Next sync should use HAT
      mockReportIdleTime.mockClear();
      await act(async () => {
        await vi.advanceTimersByTimeAsync(IDLE_SYNC_INTERVAL_MS);
      });
      expect(mockReportIdleTime).toHaveBeenCalledWith(hatActivityTime);
    });

    it('should switch from HAT to focus tracker when Spec is deselected', async () => {
      const now = Date.now();
      vi.setSystemTime(now);

      const focusActivityTime = now - 10000;
      const hatActivityTime = now - 5000;

      // Initially HAT is active
      let hatActive = true;
      let hatTime: number | null = hatActivityTime;
      (getHumanActivityTracker as Mock).mockReturnValue({
        get isActive() { return hatActive; },
        getLastActivityTime: () => hatTime,
      });
      mockFocusTrackerGetLastActivityTime.mockReturnValue(focusActivityTime);
      mockFocusTrackerIsFocused.mockReturnValue(true);

      renderHook(() => useIdleTimeSync({ projectPath: '/test/project' }));

      // Initial sync with HAT
      await act(async () => {
        await vi.advanceTimersByTimeAsync(100);
      });
      expect(mockReportIdleTime).toHaveBeenCalledWith(hatActivityTime);

      // Simulate Spec deselection (HAT becomes inactive)
      hatActive = false;
      hatTime = null;

      // Next sync should use focus tracker
      mockReportIdleTime.mockClear();
      await act(async () => {
        await vi.advanceTimersByTimeAsync(IDLE_SYNC_INTERVAL_MS);
      });
      expect(mockReportIdleTime).toHaveBeenCalledWith(focusActivityTime);
    });
  });

  // ===========================================================================
  // Edge cases
  // ===========================================================================

  describe('edge cases', () => {
    it('should handle null tracker gracefully with focus fallback', async () => {
      const focusActivityTime = Date.now();
      (getHumanActivityTracker as Mock).mockReturnValue(null);
      mockFocusTrackerGetLastActivityTime.mockReturnValue(focusActivityTime);
      mockFocusTrackerIsFocused.mockReturnValue(true);

      // Should not throw
      expect(() => {
        renderHook(() => useIdleTimeSync({ projectPath: '/test/project' }));
      }).not.toThrow();

      // Advance time
      await act(async () => {
        await vi.advanceTimersByTimeAsync(IDLE_SYNC_INTERVAL_MS);
      });

      // Should use focus tracker as fallback when HAT is null
      expect(mockReportIdleTime).toHaveBeenCalledWith(focusActivityTime);
    });

    it('should handle IPC errors gracefully', async () => {
      const lastActivityTime = Date.now();
      const mockTracker = {
        isActive: true,
        getLastActivityTime: () => lastActivityTime,
      };
      (getHumanActivityTracker as Mock).mockReturnValue(mockTracker);
      mockReportIdleTime.mockRejectedValueOnce(new Error('IPC failed'));

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
