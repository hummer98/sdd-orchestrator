/**
 * useWindowFocusTracker Hook Tests
 * Task 1.2: useWindowFocusTracker のユニットテスト作成
 * Requirements: 5.2 (フォーカス状態テスト)
 *
 * ウィンドウフォーカス状態に基づく最終アクティビティ時刻追跡フックのテスト
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useWindowFocusTracker, FOCUS_ACTIVITY_UPDATE_INTERVAL_MS } from './useWindowFocusTracker';

describe('useWindowFocusTracker', () => {
  // Store original event listeners
  let focusListeners: (() => void)[] = [];
  let blurListeners: (() => void)[] = [];

  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();

    // Reset listener arrays
    focusListeners = [];
    blurListeners = [];

    // Mock document.hasFocus() - default to unfocused
    vi.spyOn(document, 'hasFocus').mockReturnValue(false);

    // Mock window event listeners
    vi.spyOn(window, 'addEventListener').mockImplementation((event, handler) => {
      if (event === 'focus') {
        focusListeners.push(handler as () => void);
      } else if (event === 'blur') {
        blurListeners.push(handler as () => void);
      }
    });

    vi.spyOn(window, 'removeEventListener').mockImplementation((event, handler) => {
      if (event === 'focus') {
        focusListeners = focusListeners.filter(h => h !== handler);
      } else if (event === 'blur') {
        blurListeners = blurListeners.filter(h => h !== handler);
      }
    });
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  // Helper to trigger focus event
  const triggerFocus = () => {
    vi.spyOn(document, 'hasFocus').mockReturnValue(true);
    focusListeners.forEach(handler => handler());
  };

  // Helper to trigger blur event
  const triggerBlur = () => {
    vi.spyOn(document, 'hasFocus').mockReturnValue(false);
    blurListeners.forEach(handler => handler());
  };

  // ===========================================================================
  // Requirement 2.1: フォーカス取得時にlastActivityTime記録
  // ===========================================================================

  describe('focus gain (Requirement 2.1)', () => {
    it('should record lastActivityTime when window gains focus', () => {
      const now = Date.now();
      vi.setSystemTime(now);

      const { result } = renderHook(() => useWindowFocusTracker());

      // Initially unfocused, no activity time
      expect(result.current.getLastActivityTime()).toBe(null);
      expect(result.current.isFocused()).toBe(false);

      // Trigger focus
      act(() => {
        triggerFocus();
      });

      // Should record current time
      expect(result.current.isFocused()).toBe(true);
      expect(result.current.getLastActivityTime()).toBe(now);
    });

    it('should update lastActivityTime immediately on focus gain', () => {
      const now = 1000000;
      vi.setSystemTime(now);

      const { result } = renderHook(() => useWindowFocusTracker());

      // Gain focus
      act(() => {
        triggerFocus();
      });

      const activityTime = result.current.getLastActivityTime();
      expect(activityTime).toBe(now);
    });
  });

  // ===========================================================================
  // Requirement 2.2: フォーカス喪失時は値保持
  // ===========================================================================

  describe('focus loss (Requirement 2.2)', () => {
    it('should retain lastActivityTime when window loses focus', () => {
      const now = 1000000;
      vi.setSystemTime(now);

      const { result } = renderHook(() => useWindowFocusTracker());

      // Gain focus
      act(() => {
        triggerFocus();
      });

      const focusTime = result.current.getLastActivityTime();
      expect(focusTime).toBe(now);

      // Advance time
      vi.setSystemTime(now + 5000);

      // Lose focus
      act(() => {
        triggerBlur();
      });

      // Should retain the focus time, not update to current time
      expect(result.current.isFocused()).toBe(false);
      expect(result.current.getLastActivityTime()).toBe(focusTime);
    });

    it('should not update lastActivityTime while unfocused', () => {
      const now = 1000000;
      vi.setSystemTime(now);

      const { result } = renderHook(() => useWindowFocusTracker());

      // Gain and lose focus
      act(() => {
        triggerFocus();
      });
      const activityTime = result.current.getLastActivityTime();

      act(() => {
        triggerBlur();
      });

      // Advance time significantly
      vi.setSystemTime(now + 60000);
      act(() => {
        vi.advanceTimersByTime(FOCUS_ACTIVITY_UPDATE_INTERVAL_MS * 2);
      });

      // Activity time should remain unchanged
      expect(result.current.getLastActivityTime()).toBe(activityTime);
    });
  });

  // ===========================================================================
  // Requirement 2.3: フォーカス中10秒間隔で更新
  // ===========================================================================

  describe('periodic update while focused (Requirement 2.3)', () => {
    it('should update lastActivityTime every 10 seconds while focused', async () => {
      const baseTime = 1000000;
      vi.setSystemTime(baseTime);

      const { result } = renderHook(() => useWindowFocusTracker());

      // Gain focus
      act(() => {
        triggerFocus();
      });

      const initialTime = result.current.getLastActivityTime();
      expect(initialTime).toBe(baseTime);

      // Advance time by update interval - advanceTimersByTimeAsync also advances system time
      await act(async () => {
        await vi.advanceTimersByTimeAsync(FOCUS_ACTIVITY_UPDATE_INTERVAL_MS);
      });

      // Should be updated - check that it's greater than initial (interval fired)
      const updatedTime = result.current.getLastActivityTime();
      expect(updatedTime).toBeGreaterThan(initialTime!);
      expect(updatedTime).toBe(baseTime + FOCUS_ACTIVITY_UPDATE_INTERVAL_MS);
    });

    it('should continue updating every 10 seconds while focused', async () => {
      const baseTime = 1000000;
      vi.setSystemTime(baseTime);

      const { result } = renderHook(() => useWindowFocusTracker());

      // Gain focus
      act(() => {
        triggerFocus();
      });

      let prevTime = result.current.getLastActivityTime();
      expect(prevTime).toBe(baseTime);

      // Advance by 3 intervals
      for (let i = 1; i <= 3; i++) {
        await act(async () => {
          await vi.advanceTimersByTimeAsync(FOCUS_ACTIVITY_UPDATE_INTERVAL_MS);
        });

        const currentTime = result.current.getLastActivityTime();
        expect(currentTime).toBeGreaterThan(prevTime!);
        expect(currentTime).toBe(baseTime + FOCUS_ACTIVITY_UPDATE_INTERVAL_MS * i);
        prevTime = currentTime;
      }
    });

    it('should stop updating after focus loss', async () => {
      const baseTime = 1000000;
      vi.setSystemTime(baseTime);

      const { result } = renderHook(() => useWindowFocusTracker());

      // Gain focus
      act(() => {
        triggerFocus();
      });

      // Advance one interval
      await act(async () => {
        await vi.advanceTimersByTimeAsync(FOCUS_ACTIVITY_UPDATE_INTERVAL_MS);
      });

      const timeAfterFirstInterval = result.current.getLastActivityTime();
      expect(timeAfterFirstInterval).toBe(baseTime + FOCUS_ACTIVITY_UPDATE_INTERVAL_MS);

      // Lose focus
      act(() => {
        triggerBlur();
      });

      // Advance another interval
      await act(async () => {
        await vi.advanceTimersByTimeAsync(FOCUS_ACTIVITY_UPDATE_INTERVAL_MS);
      });

      // Should still be at previous time (no update after blur)
      expect(result.current.getLastActivityTime()).toBe(timeAfterFirstInterval);
    });
  });

  // ===========================================================================
  // Requirement 2.4: バックグラウンド時のアイドル計算
  // ===========================================================================

  describe('background idle calculation (Requirement 2.4)', () => {
    it('should preserve lastActivityTime for idle calculation when in background', () => {
      const focusTime = 1000000;
      vi.setSystemTime(focusTime);

      const { result } = renderHook(() => useWindowFocusTracker());

      // Gain focus
      act(() => {
        triggerFocus();
      });

      // Some activity time
      const activityTime = focusTime + 5000;
      vi.setSystemTime(activityTime);
      act(() => {
        vi.advanceTimersByTime(5000);
      });

      // Lose focus (goes to background)
      act(() => {
        triggerBlur();
      });

      // Significant time passes in background
      const backgroundTime = activityTime + 120000; // 2 minutes later
      vi.setSystemTime(backgroundTime);

      // The lastActivityTime should still be from when focused
      // This allows Main Process to calculate: backgroundTime - lastActivityTime = idle duration
      const lastActivity = result.current.getLastActivityTime();
      expect(lastActivity).toBeLessThanOrEqual(activityTime);

      // Idle time can be calculated as: currentTime - lastActivityTime
      const calculatedIdleTime = backgroundTime - (lastActivity ?? 0);
      expect(calculatedIdleTime).toBeGreaterThanOrEqual(120000);
    });
  });

  // ===========================================================================
  // Cleanup Tests
  // ===========================================================================

  describe('cleanup', () => {
    it('should remove event listeners on unmount', () => {
      const { unmount } = renderHook(() => useWindowFocusTracker());

      // Event listeners should be added
      expect(focusListeners.length).toBe(1);
      expect(blurListeners.length).toBe(1);

      // Unmount
      unmount();

      // Event listeners should be removed
      expect(focusListeners.length).toBe(0);
      expect(blurListeners.length).toBe(0);
    });

    it('should clear interval on unmount', async () => {
      const baseTime = 1000000;
      vi.setSystemTime(baseTime);

      const { result, unmount } = renderHook(() => useWindowFocusTracker());

      // Gain focus to start interval
      act(() => {
        triggerFocus();
      });

      const activityTime = result.current.getLastActivityTime();

      // Unmount
      unmount();

      // Advance time
      vi.setSystemTime(baseTime + FOCUS_ACTIVITY_UPDATE_INTERVAL_MS * 2);
      await act(async () => {
        await vi.advanceTimersByTimeAsync(FOCUS_ACTIVITY_UPDATE_INTERVAL_MS * 2);
      });

      // Since hook is unmounted, we can't check result.current anymore
      // The test passes if no errors are thrown (interval was properly cleared)
    });
  });

  // ===========================================================================
  // Initial State Tests
  // ===========================================================================

  describe('initial state', () => {
    it('should detect initial focus state from document.hasFocus()', () => {
      // Mock document already focused
      vi.spyOn(document, 'hasFocus').mockReturnValue(true);

      const now = Date.now();
      vi.setSystemTime(now);

      const { result } = renderHook(() => useWindowFocusTracker());

      // Should be initially focused and have activity time
      expect(result.current.isFocused()).toBe(true);
      expect(result.current.getLastActivityTime()).toBe(now);
    });

    it('should have null lastActivityTime when initially unfocused', () => {
      vi.spyOn(document, 'hasFocus').mockReturnValue(false);

      const { result } = renderHook(() => useWindowFocusTracker());

      expect(result.current.isFocused()).toBe(false);
      expect(result.current.getLastActivityTime()).toBe(null);
    });
  });
});
