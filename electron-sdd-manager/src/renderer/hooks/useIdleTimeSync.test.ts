/**
 * useIdleTimeSync Hook Tests
 * Task 7.1: useHumanActivityフックの拡張 - 定期的なアイドル時間のMain Processへの報告
 * Requirements: 4.3 (アイドル検出時キュー追加)
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

// Mock humanActivityTracker
vi.mock('../services/humanActivityTracker', () => ({
  getHumanActivityTracker: vi.fn(),
  initHumanActivityTracker: vi.fn(),
}));

// Mock window.electronAPI
const mockReportIdleTime = vi.fn().mockResolvedValue(undefined);

// Store original electronAPI
const originalElectronAPI = window.electronAPI;

describe('useIdleTimeSync', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();

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

      renderHook(() => useIdleTimeSync());

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

      renderHook(() => useIdleTimeSync());

      // Allow useEffect to run
      await act(async () => {
        await vi.advanceTimersByTimeAsync(100);
      });

      expect(mockReportIdleTime).toHaveBeenCalledWith(lastActivityTime);
    });

    it('should stop syncing when tracker is not active', async () => {
      const mockTracker = {
        isActive: false,
        getLastActivityTime: () => null,
      };
      (getHumanActivityTracker as Mock).mockReturnValue(mockTracker);

      renderHook(() => useIdleTimeSync());

      // Initial check should not sync when not active
      await act(async () => {
        await vi.advanceTimersByTimeAsync(100);
      });

      expect(mockReportIdleTime).not.toHaveBeenCalled();
    });

    it('should cleanup interval on unmount', async () => {
      const lastActivityTime = Date.now();
      const mockTracker = {
        isActive: true,
        getLastActivityTime: () => lastActivityTime,
      };
      (getHumanActivityTracker as Mock).mockReturnValue(mockTracker);

      const { unmount } = renderHook(() => useIdleTimeSync());

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
  // Edge cases
  // ===========================================================================

  describe('edge cases', () => {
    it('should handle null tracker gracefully', async () => {
      (getHumanActivityTracker as Mock).mockReturnValue(null);

      // Should not throw
      expect(() => {
        renderHook(() => useIdleTimeSync());
      }).not.toThrow();

      // Advance time
      act(() => {
        vi.advanceTimersByTime(IDLE_SYNC_INTERVAL_MS);
      });

      // Should not have called IPC
      expect(mockReportIdleTime).not.toHaveBeenCalled();
    });

    it('should handle null lastActivityTime', async () => {
      const mockTracker = {
        isActive: true,
        getLastActivityTime: () => null,
      };
      (getHumanActivityTracker as Mock).mockReturnValue(mockTracker);

      renderHook(() => useIdleTimeSync());

      act(() => {
        vi.advanceTimersByTime(IDLE_SYNC_INTERVAL_MS);
      });

      // Should not sync when lastActivityTime is null
      expect(mockReportIdleTime).not.toHaveBeenCalled();
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
        renderHook(() => useIdleTimeSync());
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
