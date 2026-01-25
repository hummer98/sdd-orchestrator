/**
 * IdleTimeTracker Tests
 * Task 7.1: Main Process側でのアイドル時間計算
 * Requirements: 4.3 (アイドル検出時キュー追加 - ScheduleTaskCoordinatorとの統合)
 *
 * Main Process側でRenderer側から報告される最終アクティビティ時刻を保持し、
 * アイドル時間（ミリ秒）を計算するサービス
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  IdleTimeTracker,
  createIdleTimeTracker,
  getDefaultIdleTimeTracker,
  setLastActivityTime,
  getIdleTimeMs,
} from './idleTimeTracker';

describe('IdleTimeTracker', () => {
  let tracker: IdleTimeTracker;

  beforeEach(() => {
    tracker = createIdleTimeTracker();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  // ===========================================================================
  // Requirement 4.3: Main側でのアイドル時間計算
  // ===========================================================================

  describe('getIdleTimeMs', () => {
    it('should return 0 when no activity has been recorded', () => {
      // Initial state: no activity recorded
      const idleMs = tracker.getIdleTimeMs();

      // Should return 0 when no activity recorded (no way to know idle time)
      expect(idleMs).toBe(0);
    });

    it('should return time since last activity', () => {
      const now = Date.now();
      vi.setSystemTime(now);

      // Record activity
      tracker.setLastActivityTime(now);

      // Advance time by 5 minutes
      vi.advanceTimersByTime(5 * 60 * 1000);

      const idleMs = tracker.getIdleTimeMs();
      expect(idleMs).toBe(5 * 60 * 1000);
    });

    it('should update idle time correctly after multiple activity reports', () => {
      const now = Date.now();
      vi.setSystemTime(now);

      // First activity
      tracker.setLastActivityTime(now);

      // Advance 2 minutes
      vi.advanceTimersByTime(2 * 60 * 1000);

      // Second activity resets the idle timer
      const activityTime = now + 2 * 60 * 1000;
      tracker.setLastActivityTime(activityTime);

      // Advance 3 more minutes
      vi.advanceTimersByTime(3 * 60 * 1000);

      // Should be 3 minutes idle (since last activity)
      const idleMs = tracker.getIdleTimeMs();
      expect(idleMs).toBe(3 * 60 * 1000);
    });
  });

  // ===========================================================================
  // Requirement 4.3: Renderer側からの報告受信
  // ===========================================================================

  describe('setLastActivityTime', () => {
    it('should accept activity timestamp from Renderer', () => {
      const now = Date.now();
      vi.setSystemTime(now);

      tracker.setLastActivityTime(now);

      // Immediately check - should be 0ms idle
      expect(tracker.getIdleTimeMs()).toBe(0);
    });

    it('should handle future timestamps gracefully', () => {
      const now = Date.now();
      vi.setSystemTime(now);

      // Future timestamp (clock skew protection)
      const futureTime = now + 1000;
      tracker.setLastActivityTime(futureTime);

      // Should not result in negative idle time
      expect(tracker.getIdleTimeMs()).toBeGreaterThanOrEqual(0);
    });

    it('should ignore older timestamps than current', () => {
      const now = Date.now();
      vi.setSystemTime(now);

      // Record recent activity
      tracker.setLastActivityTime(now);

      // Try to set an older timestamp
      const olderTime = now - 5000;
      tracker.setLastActivityTime(olderTime);

      // Should still use the more recent timestamp
      expect(tracker.getIdleTimeMs()).toBe(0);
    });
  });

  // ===========================================================================
  // Integration: ScheduleTaskCoordinator compatibility
  // ===========================================================================

  describe('ScheduleTaskCoordinator integration', () => {
    it('should provide getIdleTimeMs function compatible with coordinator deps', () => {
      // The tracker should provide a function that matches ScheduleTaskCoordinatorDeps.getIdleTimeMs
      const getIdleFn = () => tracker.getIdleTimeMs();

      expect(typeof getIdleFn).toBe('function');
      expect(typeof getIdleFn()).toBe('number');
    });
  });
});

// ===========================================================================
// Module-level functions for singleton access
// ===========================================================================

describe('Module-level functions', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('getDefaultIdleTimeTracker', () => {
    it('should return a singleton instance', () => {
      const tracker1 = getDefaultIdleTimeTracker();
      const tracker2 = getDefaultIdleTimeTracker();

      expect(tracker1).toBe(tracker2);
    });
  });

  describe('setLastActivityTime (module function)', () => {
    it('should update the singleton tracker', () => {
      const now = Date.now();
      vi.setSystemTime(now);

      setLastActivityTime(now);

      // Advance time
      vi.advanceTimersByTime(1000);

      expect(getIdleTimeMs()).toBe(1000);
    });
  });

  describe('getIdleTimeMs (module function)', () => {
    it('should return idle time from singleton tracker', () => {
      const now = Date.now();
      vi.setSystemTime(now);

      setLastActivityTime(now);
      vi.advanceTimersByTime(2000);

      expect(getIdleTimeMs()).toBe(2000);
    });
  });
});
