/**
 * Tests for ProcessUtils
 * Requirements: 4.2, 4.3, 4.4
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { ProcessUtils } from './processUtils';

describe('ProcessUtils', () => {
  let processUtils: ProcessUtils;

  beforeEach(() => {
    processUtils = new ProcessUtils();
  });

  describe('checkProcessAlive', () => {
    it('should return false for invalid PID (0)', () => {
      expect(processUtils.checkProcessAlive(0)).toBe(false);
    });

    it('should return false for invalid PID (-1)', () => {
      expect(processUtils.checkProcessAlive(-1)).toBe(false);
    });

    it('should return true for current process', () => {
      expect(processUtils.checkProcessAlive(process.pid)).toBe(true);
    });

    it('should return false for non-existent PID', () => {
      // Using a very high PID that likely doesn't exist
      expect(processUtils.checkProcessAlive(9999999)).toBe(false);
    });
  });

  describe('getProcessStartTime', () => {
    it('should return null for invalid PID (0)', () => {
      expect(processUtils.getProcessStartTime(0)).toBe(null);
    });

    it('should return null for invalid PID (-1)', () => {
      expect(processUtils.getProcessStartTime(-1)).toBe(null);
    });

    it('should return a timestamp string for current process', () => {
      const startTime = processUtils.getProcessStartTime(process.pid);
      expect(startTime).not.toBe(null);
      expect(typeof startTime).toBe('string');
      expect(startTime!.length).toBeGreaterThan(0);
    });

    it('should return null for non-existent PID', () => {
      expect(processUtils.getProcessStartTime(9999999)).toBe(null);
    });

    it('should return consistent start time for the same PID', () => {
      const startTime1 = processUtils.getProcessStartTime(process.pid);
      const startTime2 = processUtils.getProcessStartTime(process.pid);
      expect(startTime1).toBe(startTime2);
    });
  });

  describe('isSameProcess', () => {
    it('should return false for invalid PID (0)', () => {
      expect(processUtils.isSameProcess(0, 'any-time')).toBe(false);
    });

    it('should return false for non-existent PID', () => {
      expect(processUtils.isSameProcess(9999999, 'any-time')).toBe(false);
    });

    it('should return true when start times match', () => {
      const startTime = processUtils.getProcessStartTime(process.pid);
      expect(startTime).not.toBe(null);
      expect(processUtils.isSameProcess(process.pid, startTime!)).toBe(true);
    });

    it('should return false when start times do not match', () => {
      const result = processUtils.isSameProcess(process.pid, 'wrong-start-time');
      expect(result).toBe(false);
    });

    it('should return false when recorded time is empty string', () => {
      expect(processUtils.isSameProcess(process.pid, '')).toBe(false);
    });
  });
});
