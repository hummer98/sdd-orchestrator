/**
 * Time Format Utility Tests
 * TDD tests for Task 7.3: Time format utility
 * Requirements: 5.6
 */

import { describe, it, expect } from 'vitest';
import { formatDuration, formatDurationCompact } from './timeFormat';

describe('Time Format Utilities', () => {
  // ==========================================================================
  // Requirement 5.6: User-friendly time format
  // ==========================================================================
  describe('formatDuration', () => {
    it('should format 0ms as "0s"', () => {
      expect(formatDuration(0)).toBe('0s');
    });

    it('should format seconds only', () => {
      expect(formatDuration(1000)).toBe('1s');
      expect(formatDuration(30000)).toBe('30s');
      expect(formatDuration(59000)).toBe('59s');
    });

    it('should format minutes and seconds', () => {
      expect(formatDuration(60000)).toBe('1m 0s');
      expect(formatDuration(90000)).toBe('1m 30s');
      expect(formatDuration(330000)).toBe('5m 30s'); // 5 min 30 sec
      expect(formatDuration(3599000)).toBe('59m 59s');
    });

    it('should format hours, minutes, and seconds', () => {
      expect(formatDuration(3600000)).toBe('1h 0m 0s');
      expect(formatDuration(3660000)).toBe('1h 1m 0s');
      expect(formatDuration(3661000)).toBe('1h 1m 1s');
      expect(formatDuration(4980000)).toBe('1h 23m 0s'); // 1h 23m
      expect(formatDuration(16500000)).toBe('4h 35m 0s'); // 4h 35m
    });

    it('should format large durations correctly', () => {
      expect(formatDuration(86400000)).toBe('24h 0m 0s'); // 24 hours
      expect(formatDuration(90061000)).toBe('25h 1m 1s'); // 25h 1m 1s
    });

    it('should handle decimal milliseconds by truncating', () => {
      expect(formatDuration(1500)).toBe('1s'); // 1.5s -> 1s
      expect(formatDuration(61999)).toBe('1m 1s'); // 1m 1.999s -> 1m 1s
    });
  });

  describe('formatDurationCompact', () => {
    it('should format 0ms as "0s"', () => {
      expect(formatDurationCompact(0)).toBe('0s');
    });

    it('should format seconds without minutes/hours prefix', () => {
      expect(formatDurationCompact(1000)).toBe('1s');
      expect(formatDurationCompact(30000)).toBe('30s');
      expect(formatDurationCompact(45000)).toBe('45s');
    });

    it('should format minutes without hours prefix', () => {
      expect(formatDurationCompact(60000)).toBe('1m');
      expect(formatDurationCompact(90000)).toBe('1m 30s');
      expect(formatDurationCompact(300000)).toBe('5m');
      expect(formatDurationCompact(330000)).toBe('5m 30s');
    });

    it('should format hours', () => {
      expect(formatDurationCompact(3600000)).toBe('1h');
      expect(formatDurationCompact(3660000)).toBe('1h 1m');
      expect(formatDurationCompact(4980000)).toBe('1h 23m');
      expect(formatDurationCompact(16500000)).toBe('4h 35m');
    });

    it('should hide zero components in the middle', () => {
      expect(formatDurationCompact(3601000)).toBe('1h 0m 1s');
      expect(formatDurationCompact(7200000)).toBe('2h');
      expect(formatDurationCompact(7230000)).toBe('2h 0m 30s');
    });

    it('should hide trailing zero seconds for minutes and hours', () => {
      expect(formatDurationCompact(60000)).toBe('1m'); // not "1m 0s"
      expect(formatDurationCompact(3600000)).toBe('1h'); // not "1h 0m" or "1h 0m 0s"
      expect(formatDurationCompact(3660000)).toBe('1h 1m'); // not "1h 1m 0s"
    });
  });

  describe('edge cases', () => {
    it('should handle negative values as 0', () => {
      expect(formatDuration(-1000)).toBe('0s');
      expect(formatDurationCompact(-1000)).toBe('0s');
    });

    it('should handle very small positive values', () => {
      expect(formatDuration(1)).toBe('0s');
      expect(formatDuration(999)).toBe('0s');
      expect(formatDurationCompact(1)).toBe('0s');
    });
  });
});
