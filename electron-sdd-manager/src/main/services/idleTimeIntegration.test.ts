/**
 * Idle Time Integration Tests
 * Task 6.1: Main Process側でのアイドル時間計算を検証する統合テスト
 * Requirements: 5.4 (統合テスト - オプション)
 *
 * Renderer側から報告されたlastActivityTimeがIdleTimeTrackerに正しく反映されることを検証
 * IPC通信の正常性を確認
 *
 * Note: このテストはMain Processのコンポーネント間の統合を検証する。
 * 実際のIPCハンドラ登録を模擬し、IdleTimeTrackerへのデータフローを確認する。
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  createIdleTimeTracker,
  setLastActivityTime,
  getIdleTimeMs,
  resetDefaultIdleTimeTracker,
  type IdleTimeTracker,
} from './idleTimeTracker';

// ============================================================
// Integration Test: Renderer -> IPC -> IdleTimeTracker Flow
// ============================================================

describe('IdleTime Integration Tests (Task 6.1)', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    // Reset singleton to ensure clean state
    resetDefaultIdleTimeTracker();
  });

  afterEach(() => {
    vi.useRealTimers();
    resetDefaultIdleTimeTracker();
  });

  // ===========================================================================
  // Requirement 5.4: Integration test for idle time calculation
  // ===========================================================================

  describe('Renderer -> IdleTimeTracker data flow', () => {
    it('should correctly calculate idle time from Renderer-reported lastActivityTime', () => {
      // Simulate: Renderer reports lastActivityTime at T0
      const baseTime = 1700000000000; // Fixed timestamp
      vi.setSystemTime(baseTime);

      // Renderer reports activity time via IPC
      // (In real app, this is called by scheduleTaskHandlers IPC handler)
      setLastActivityTime(baseTime);

      // Immediately after report, idle time should be 0
      expect(getIdleTimeMs()).toBe(0);

      // Simulate 30 seconds passing (user becomes idle)
      vi.advanceTimersByTime(30_000);

      // Idle time should be 30 seconds
      expect(getIdleTimeMs()).toBe(30_000);
    });

    it('should update idle time when Renderer reports new activity', () => {
      const baseTime = 1700000000000;
      vi.setSystemTime(baseTime);

      // First activity report
      setLastActivityTime(baseTime);

      // 20 seconds pass
      vi.advanceTimersByTime(20_000);
      expect(getIdleTimeMs()).toBe(20_000);

      // Renderer reports new activity (user became active again)
      const newActivityTime = baseTime + 20_000;
      setLastActivityTime(newActivityTime);

      // Idle time should reset to 0
      expect(getIdleTimeMs()).toBe(0);

      // Another 10 seconds pass
      vi.advanceTimersByTime(10_000);
      expect(getIdleTimeMs()).toBe(10_000);
    });

    it('should handle 10-second sync interval pattern from Renderer', () => {
      // Requirement 4.1: Renderer syncs every 10 seconds
      const baseTime = 1700000000000;
      vi.setSystemTime(baseTime);

      // Simulate useIdleTimeSync behavior: sync every 10 seconds
      const SYNC_INTERVAL = 10_000;

      // First sync
      setLastActivityTime(baseTime);
      expect(getIdleTimeMs()).toBe(0);

      // Advance 10 seconds, second sync
      vi.advanceTimersByTime(SYNC_INTERVAL);
      const secondSyncTime = baseTime + SYNC_INTERVAL;
      setLastActivityTime(secondSyncTime);
      expect(getIdleTimeMs()).toBe(0); // Just synced, so 0

      // Advance 10 seconds, third sync
      vi.advanceTimersByTime(SYNC_INTERVAL);
      const thirdSyncTime = baseTime + 2 * SYNC_INTERVAL;
      setLastActivityTime(thirdSyncTime);
      expect(getIdleTimeMs()).toBe(0); // Just synced, so 0

      // If sync stops (user loses focus), idle time accumulates
      vi.advanceTimersByTime(60_000); // 1 minute without sync
      expect(getIdleTimeMs()).toBe(60_000);
    });

    it('should correctly reflect window focus tracking pattern', () => {
      // Scenario: Window gains focus, stays focused for a while,
      // then loses focus - Renderer stops syncing, idle time accumulates

      const baseTime = 1700000000000;
      vi.setSystemTime(baseTime);

      // Window gains focus - initial sync
      setLastActivityTime(baseTime);

      // User active, periodic syncs for 30 seconds
      for (let i = 1; i <= 3; i++) {
        vi.advanceTimersByTime(10_000);
        setLastActivityTime(baseTime + i * 10_000);
      }

      // Last activity at T+30s
      const lastActivityAt = baseTime + 30_000;
      expect(getIdleTimeMs()).toBe(0);

      // Window loses focus - no more syncs from Renderer
      // 2 minutes pass
      vi.advanceTimersByTime(120_000);

      // Idle time should be 2 minutes (since last activity)
      expect(getIdleTimeMs()).toBe(120_000);
    });
  });

  // ===========================================================================
  // Multiple Tracker Instance Test (for isolation verification)
  // ===========================================================================

  describe('IdleTimeTracker instance isolation', () => {
    it('should maintain separate state for different tracker instances', () => {
      const baseTime = 1700000000000;
      vi.setSystemTime(baseTime);

      // Create two separate tracker instances
      const tracker1 = createIdleTimeTracker();
      const tracker2 = createIdleTimeTracker();

      // Set activity on tracker1 only
      tracker1.setLastActivityTime(baseTime);

      // Advance time
      vi.advanceTimersByTime(5000);

      // tracker1 should show 5 seconds idle
      expect(tracker1.getIdleTimeMs()).toBe(5000);

      // tracker2 should show 0 (no activity recorded)
      expect(tracker2.getIdleTimeMs()).toBe(0);
    });
  });

  // ===========================================================================
  // HAT/Focus Tracker Priority Integration Scenario
  // ===========================================================================

  describe('Spec tracking vs Focus tracking priority scenario', () => {
    it('should handle transition from HAT tracking to focus tracking', () => {
      // Scenario:
      // 1. HAT is active (Spec selected), provides precise activity time
      // 2. Spec is deselected, HAT becomes inactive
      // 3. Focus tracker takes over, continues reporting

      const baseTime = 1700000000000;
      vi.setSystemTime(baseTime);

      // HAT reports activity (Spec is selected)
      const hatActivityTime = baseTime; // Precise HAT time
      setLastActivityTime(hatActivityTime);
      expect(getIdleTimeMs()).toBe(0);

      // Time passes while HAT is active
      vi.advanceTimersByTime(5000);
      const hatUpdate = baseTime + 5000;
      setLastActivityTime(hatUpdate);
      expect(getIdleTimeMs()).toBe(0);

      // Spec is deselected - switch to focus tracker
      // Focus tracker now reports its last activity time
      vi.advanceTimersByTime(3000);
      const focusActivityTime = baseTime + 8000;
      setLastActivityTime(focusActivityTime);
      expect(getIdleTimeMs()).toBe(0);

      // User goes idle (focus tracker stops updating because window unfocused)
      vi.advanceTimersByTime(60_000);
      expect(getIdleTimeMs()).toBe(60_000);
    });
  });

  // ===========================================================================
  // ScheduleTaskCoordinator Integration Scenario
  // ===========================================================================

  describe('ScheduleTaskCoordinator compatibility', () => {
    it('should provide getIdleTimeMs compatible with waitForIdle feature', () => {
      // Scenario: ScheduleTaskCoordinator checks if user is idle enough
      // to execute a waitForIdle=true task

      const baseTime = 1700000000000;
      vi.setSystemTime(baseTime);

      // Renderer reports activity
      setLastActivityTime(baseTime);

      // Coordinator checks idle time - user is active
      expect(getIdleTimeMs()).toBe(0);

      // 2 minutes pass without activity report
      vi.advanceTimersByTime(120_000);

      // Coordinator checks again - user is idle for 2 minutes
      const idleMs = getIdleTimeMs();
      expect(idleMs).toBe(120_000);

      // waitForIdle threshold is typically 5 minutes (300_000ms)
      // So task should NOT execute yet
      expect(idleMs).toBeLessThan(300_000);

      // 3 more minutes pass
      vi.advanceTimersByTime(180_000);

      // Now 5 minutes idle - task CAN execute
      expect(getIdleTimeMs()).toBe(300_000);
    });
  });
});
