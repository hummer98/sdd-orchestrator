/**
 * HumanActivityTracker Tests
 * TDD tests for Task 3.1: Human activity tracking service
 * Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 2.8, 2.9, 2.10, 2.11
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { HumanActivityTracker, ActivityEventType } from './humanActivityTracker';
import { IDLE_TIMEOUT_MS } from '../../main/types/metrics';

describe('HumanActivityTracker', () => {
  let tracker: HumanActivityTracker;
  let mockRecordSession: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.useFakeTimers();
    mockRecordSession = vi.fn().mockResolvedValue(undefined);
    tracker = new HumanActivityTracker(mockRecordSession);
  });

  afterEach(() => {
    tracker.stop();
    vi.useRealTimers();
  });

  // ==========================================================================
  // Initial State
  // ==========================================================================
  describe('initial state', () => {
    it('should not be active initially', () => {
      expect(tracker.isActive).toBe(false);
    });

    it('should have null currentSpecId initially', () => {
      expect(tracker.currentSpecId).toBeNull();
    });
  });

  // ==========================================================================
  // start() / stop()
  // ==========================================================================
  describe('start/stop lifecycle', () => {
    it('should start tracking for a spec', () => {
      tracker.start('test-spec');

      expect(tracker.isActive).toBe(true);
      expect(tracker.currentSpecId).toBe('test-spec');
    });

    it('should stop tracking', () => {
      tracker.start('test-spec');
      tracker.stop();

      expect(tracker.isActive).toBe(false);
      expect(tracker.currentSpecId).toBeNull();
    });

    it('should record session when stopping with active session', () => {
      tracker.start('test-spec');
      tracker.recordActivity('spec-select');

      // Advance time by 10 seconds
      vi.advanceTimersByTime(10000);

      tracker.stop();

      expect(mockRecordSession).toHaveBeenCalledTimes(1);
      expect(mockRecordSession).toHaveBeenCalledWith(
        expect.objectContaining({
          specId: 'test-spec',
          ms: expect.any(Number),
        })
      );
    });

    it('should not record session when stopping without activity', () => {
      tracker.start('test-spec');
      tracker.stop();

      expect(mockRecordSession).not.toHaveBeenCalled();
    });
  });

  // ==========================================================================
  // Activity Events (Requirements 2.1-2.7)
  // ==========================================================================
  describe('activity events', () => {
    const activityEvents: ActivityEventType[] = [
      'spec-select',      // 2.1
      'artifact-tab-change', // 2.2
      'document-scroll',  // 2.3
      'agent-log-scroll', // 2.4
      'agent-log-expand', // 2.5
      'approval-button',  // 2.6
      'link-click',       // 2.7
      'text-select',      // Additional
    ];

    activityEvents.forEach((eventType) => {
      it(`should record ${eventType} activity`, () => {
        tracker.start('test-spec');
        tracker.recordActivity(eventType);

        expect(tracker.isActive).toBe(true);
      });
    });

    it('should ignore activity when not started', () => {
      tracker.recordActivity('spec-select');

      expect(tracker.isActive).toBe(false);
    });
  });

  // ==========================================================================
  // Idle Timeout (Requirements 2.8, 2.9)
  // ==========================================================================
  describe('idle timeout', () => {
    it('should consider activity within 45 seconds as active (Requirement 2.8)', () => {
      tracker.start('test-spec');
      tracker.recordActivity('spec-select');

      // 44 seconds - still within timeout
      vi.advanceTimersByTime(44000);

      expect(tracker.isActive).toBe(true);
      expect(mockRecordSession).not.toHaveBeenCalled();
    });

    it('should end session after 45 seconds of inactivity (Requirement 2.9)', () => {
      tracker.start('test-spec');
      tracker.recordActivity('spec-select');

      // Exactly 45 seconds
      vi.advanceTimersByTime(IDLE_TIMEOUT_MS);

      expect(mockRecordSession).toHaveBeenCalledTimes(1);
    });

    it('should reset timeout on new activity', () => {
      tracker.start('test-spec');
      tracker.recordActivity('spec-select');

      // 30 seconds
      vi.advanceTimersByTime(30000);

      // New activity
      tracker.recordActivity('document-scroll');

      // Another 30 seconds (60 total, but only 30 since last activity)
      vi.advanceTimersByTime(30000);

      // Session should still be active
      expect(mockRecordSession).not.toHaveBeenCalled();

      // 15 more seconds (45 since last activity)
      vi.advanceTimersByTime(15000);

      expect(mockRecordSession).toHaveBeenCalledTimes(1);
    });

    it('should calculate correct session duration', () => {
      tracker.start('test-spec');
      tracker.recordActivity('spec-select');

      // Active for 20 seconds with continuous activity
      vi.advanceTimersByTime(10000);
      tracker.recordActivity('document-scroll');

      vi.advanceTimersByTime(10000);
      tracker.recordActivity('agent-log-scroll');

      vi.advanceTimersByTime(10000);

      // Now stop - should record approximately 30 seconds
      tracker.stop();

      expect(mockRecordSession).toHaveBeenCalledWith(
        expect.objectContaining({
          ms: expect.any(Number),
        })
      );

      const call = mockRecordSession.mock.calls[0][0];
      // Session should be around 30 seconds
      expect(call.ms).toBeGreaterThanOrEqual(29000);
      expect(call.ms).toBeLessThanOrEqual(31000);
    });
  });

  // ==========================================================================
  // Spec Change (Requirement 2.10)
  // ==========================================================================
  describe('spec change', () => {
    it('should end session and start new one on spec change (Requirement 2.10)', () => {
      tracker.start('spec-1');
      tracker.recordActivity('spec-select');

      vi.advanceTimersByTime(10000);

      // Change to new spec
      tracker.start('spec-2');

      // Should have recorded session for spec-1
      expect(mockRecordSession).toHaveBeenCalledTimes(1);
      expect(mockRecordSession).toHaveBeenCalledWith(
        expect.objectContaining({
          specId: 'spec-1',
        })
      );

      // Should now be tracking spec-2
      expect(tracker.currentSpecId).toBe('spec-2');
      expect(tracker.isActive).toBe(true);
    });

    it('should not record if switching to same spec', () => {
      tracker.start('spec-1');
      tracker.recordActivity('spec-select');

      vi.advanceTimersByTime(10000);

      // Start same spec again
      tracker.start('spec-1');

      // Should not record (same spec)
      expect(mockRecordSession).not.toHaveBeenCalled();
    });
  });

  // ==========================================================================
  // Focus Loss (Requirement 2.11)
  // ==========================================================================
  describe('focus loss', () => {
    it('should end session on focus loss (Requirement 2.11)', () => {
      tracker.start('test-spec');
      tracker.recordActivity('spec-select');

      vi.advanceTimersByTime(10000);

      tracker.handleFocusLoss();

      expect(mockRecordSession).toHaveBeenCalledTimes(1);
      expect(mockRecordSession).toHaveBeenCalledWith(
        expect.objectContaining({
          specId: 'test-spec',
        })
      );
    });

    it('should not record on focus loss without active session', () => {
      tracker.start('test-spec');
      // No activity recorded

      tracker.handleFocusLoss();

      expect(mockRecordSession).not.toHaveBeenCalled();
    });

    it('should resume tracking on focus regain', () => {
      tracker.start('test-spec');
      tracker.recordActivity('spec-select');

      vi.advanceTimersByTime(10000);

      tracker.handleFocusLoss();

      // Recorded once for focus loss
      expect(mockRecordSession).toHaveBeenCalledTimes(1);

      // Focus regain - record new activity
      tracker.handleFocusRegain();
      tracker.recordActivity('document-scroll');

      vi.advanceTimersByTime(5000);
      tracker.stop();

      // Should have recorded another session
      expect(mockRecordSession).toHaveBeenCalledTimes(2);
    });
  });

  // ==========================================================================
  // Debounce (Task 3.1 - 100ms interval)
  // ==========================================================================
  describe('debounce', () => {
    it('should debounce rapid activity events', () => {
      tracker.start('test-spec');

      // Rapid fire events
      for (let i = 0; i < 10; i++) {
        tracker.recordActivity('document-scroll');
        vi.advanceTimersByTime(50); // 50ms between each
      }

      // Wait for debounce
      vi.advanceTimersByTime(100);

      // Should still be active
      expect(tracker.isActive).toBe(true);
    });
  });

  // ==========================================================================
  // Session Data Format
  // ==========================================================================
  describe('session data format', () => {
    it('should include ISO8601 timestamps', () => {
      const baseTime = new Date('2025-01-15T10:00:00.000Z');
      vi.setSystemTime(baseTime);

      tracker.start('test-spec');
      tracker.recordActivity('spec-select');

      vi.advanceTimersByTime(IDLE_TIMEOUT_MS);

      expect(mockRecordSession).toHaveBeenCalledWith(
        expect.objectContaining({
          specId: 'test-spec',
          start: expect.stringMatching(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{3}Z$/),
          end: expect.stringMatching(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{3}Z$/),
          ms: expect.any(Number),
        })
      );
    });
  });
});
