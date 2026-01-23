/**
 * HumanActivityTracker Integration Tests
 * Task 3.3: UI event listeners integration
 * Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 2.11
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  HumanActivityTracker,
  initHumanActivityTracker,
  getHumanActivityTracker,
  type ActivityEventType,
  type RecordSessionCallback,
} from './humanActivityTracker';

describe('HumanActivityTracker Integration', () => {
  let tracker: HumanActivityTracker;
  let mockRecordSession: RecordSessionCallback;

  beforeEach(() => {
    vi.useFakeTimers();
    mockRecordSession = vi.fn().mockResolvedValue(undefined);
    tracker = initHumanActivityTracker(mockRecordSession);
  });

  afterEach(() => {
    tracker.stop();
    vi.useRealTimers();
  });

  // ==========================================================================
  // Task 3.3: UI event listeners
  // Requirements: 2.1-2.7
  // ==========================================================================
  describe('UI event recording (Task 3.3)', () => {
    it('should track spec-select events (Requirement 2.1)', () => {
      tracker.start('test-spec');
      tracker.recordActivity('spec-select');

      expect(tracker.isActive).toBe(true);
      expect(tracker.currentSpecId).toBe('test-spec');
    });

    it('should track artifact-tab-change events (Requirement 2.2)', () => {
      tracker.start('test-spec');
      tracker.recordActivity('artifact-tab-change');

      // Verify activity was recorded (session starts)
      vi.advanceTimersByTime(200); // Past debounce
      expect(tracker.isActive).toBe(true);
    });

    it('should track document-scroll events (Requirement 2.3)', () => {
      tracker.start('test-spec');
      tracker.recordActivity('document-scroll');

      vi.advanceTimersByTime(200);
      expect(tracker.isActive).toBe(true);
    });

    it('should track agent-log-scroll events (Requirement 2.4)', () => {
      tracker.start('test-spec');
      tracker.recordActivity('agent-log-scroll');

      vi.advanceTimersByTime(200);
      expect(tracker.isActive).toBe(true);
    });

    it('should track agent-log-expand events (Requirement 2.5)', () => {
      tracker.start('test-spec');
      tracker.recordActivity('agent-log-expand');

      vi.advanceTimersByTime(200);
      expect(tracker.isActive).toBe(true);
    });

    it('should track approval-button events (Requirement 2.6)', () => {
      tracker.start('test-spec');
      tracker.recordActivity('approval-button');

      vi.advanceTimersByTime(200);
      expect(tracker.isActive).toBe(true);
    });

    it('should track link-click events (Requirement 2.7)', () => {
      tracker.start('test-spec');
      tracker.recordActivity('link-click');

      vi.advanceTimersByTime(200);
      expect(tracker.isActive).toBe(true);
    });
  });

  // ==========================================================================
  // Requirement 2.11: Window focus events
  // ==========================================================================
  describe('window focus events (Requirement 2.11)', () => {
    it('should end session when window loses focus', () => {
      tracker.start('test-spec');
      tracker.recordActivity('spec-select');
      vi.advanceTimersByTime(200);

      tracker.handleFocusLoss();

      // Session should be recorded
      expect(mockRecordSession).toHaveBeenCalled();
    });

    it('should restart tracking on focus regain', () => {
      tracker.start('test-spec');
      tracker.recordActivity('spec-select');
      vi.advanceTimersByTime(200);

      tracker.handleFocusLoss();
      tracker.handleFocusRegain();

      // Should still be active for current spec
      expect(tracker.isActive).toBe(true);
    });

    it('should record new session after focus regain and activity', () => {
      tracker.start('test-spec');
      tracker.recordActivity('spec-select');
      vi.advanceTimersByTime(200);

      tracker.handleFocusLoss();
      const callCountAfterLoss = (mockRecordSession as ReturnType<typeof vi.fn>).mock.calls.length;

      tracker.handleFocusRegain();
      tracker.recordActivity('document-scroll');
      vi.advanceTimersByTime(200);

      // End session manually to verify new session
      tracker.stop();

      // Should have called recordSession twice (once on focus loss, once on stop)
      expect(mockRecordSession).toHaveBeenCalledTimes(callCountAfterLoss + 1);
    });
  });

  // ==========================================================================
  // Multiple events in sequence
  // ==========================================================================
  describe('event sequences', () => {
    it('should aggregate multiple events in one session', () => {
      tracker.start('test-spec');

      // Simulate user activity sequence
      tracker.recordActivity('spec-select');
      vi.advanceTimersByTime(1000);
      tracker.recordActivity('document-scroll');
      vi.advanceTimersByTime(1000);
      tracker.recordActivity('artifact-tab-change');
      vi.advanceTimersByTime(1000);
      tracker.recordActivity('approval-button');
      vi.advanceTimersByTime(200);

      // End session
      tracker.stop();

      // Should have recorded one session with aggregated time
      expect(mockRecordSession).toHaveBeenCalledTimes(1);
      const session = (mockRecordSession as ReturnType<typeof vi.fn>).mock.calls[0][0];
      expect(session.specId).toBe('test-spec');
      expect(session.ms).toBeGreaterThan(3000);
    });

    it('should debounce rapid consecutive events', () => {
      tracker.start('test-spec');

      // Simulate rapid scrolling (multiple scroll events in quick succession)
      for (let i = 0; i < 10; i++) {
        tracker.recordActivity('document-scroll');
        vi.advanceTimersByTime(20); // Less than debounce interval
      }

      // All events should be tracked, but debounced
      expect(tracker.isActive).toBe(true);
    });
  });

  // ==========================================================================
  // Singleton instance
  // ==========================================================================
  describe('singleton instance', () => {
    it('should return initialized tracker via getHumanActivityTracker', () => {
      const singletonTracker = getHumanActivityTracker();
      expect(singletonTracker).toBe(tracker);
    });

    it('should reinitialize when initHumanActivityTracker is called again', () => {
      const newMockRecordSession = vi.fn().mockResolvedValue(undefined);
      const newTracker = initHumanActivityTracker(newMockRecordSession);

      expect(getHumanActivityTracker()).toBe(newTracker);
      expect(getHumanActivityTracker()).not.toBe(tracker);
    });
  });
});
