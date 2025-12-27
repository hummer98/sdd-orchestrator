/**
 * Bug Auto Execution Types Tests
 * bugs-workflow-auto-execution Task 1.1, 6.1
 * Requirements: 2.1, 7.4
 */

import { describe, it, expect } from 'vitest';
import {
  DEFAULT_BUG_AUTO_EXECUTION_PERMISSIONS,
  DEFAULT_BUG_AUTO_EXECUTION_STATE,
  BUG_AUTO_EXECUTION_PHASES,
  type BugAutoExecutionPermissions,
  type BugAutoExecutionStatus,
  type BugAutoExecutionState,
} from './bugAutoExecution';

describe('Bug Auto Execution Types', () => {
  describe('DEFAULT_BUG_AUTO_EXECUTION_PERMISSIONS', () => {
    it('should have analyze enabled by default', () => {
      expect(DEFAULT_BUG_AUTO_EXECUTION_PERMISSIONS.analyze).toBe(true);
    });

    it('should have fix enabled by default', () => {
      expect(DEFAULT_BUG_AUTO_EXECUTION_PERMISSIONS.fix).toBe(true);
    });

    it('should have verify enabled by default', () => {
      expect(DEFAULT_BUG_AUTO_EXECUTION_PERMISSIONS.verify).toBe(true);
    });

    it('should have deploy disabled by default', () => {
      expect(DEFAULT_BUG_AUTO_EXECUTION_PERMISSIONS.deploy).toBe(false);
    });
  });

  describe('DEFAULT_BUG_AUTO_EXECUTION_STATE', () => {
    it('should have isAutoExecuting as false', () => {
      expect(DEFAULT_BUG_AUTO_EXECUTION_STATE.isAutoExecuting).toBe(false);
    });

    it('should have currentAutoPhase as null', () => {
      expect(DEFAULT_BUG_AUTO_EXECUTION_STATE.currentAutoPhase).toBeNull();
    });

    it('should have autoExecutionStatus as idle', () => {
      expect(DEFAULT_BUG_AUTO_EXECUTION_STATE.autoExecutionStatus).toBe('idle');
    });

    it('should have lastFailedPhase as null', () => {
      expect(DEFAULT_BUG_AUTO_EXECUTION_STATE.lastFailedPhase).toBeNull();
    });

    it('should have failedRetryCount as 0', () => {
      expect(DEFAULT_BUG_AUTO_EXECUTION_STATE.failedRetryCount).toBe(0);
    });
  });

  describe('BUG_AUTO_EXECUTION_PHASES', () => {
    it('should contain analyze, fix, verify, deploy in order', () => {
      expect(BUG_AUTO_EXECUTION_PHASES).toEqual(['analyze', 'fix', 'verify', 'deploy']);
    });

    it('should not contain report phase', () => {
      expect(BUG_AUTO_EXECUTION_PHASES).not.toContain('report');
    });
  });

  describe('Type definitions', () => {
    it('should allow valid BugAutoExecutionStatus values', () => {
      const statuses: BugAutoExecutionStatus[] = [
        'idle',
        'running',
        'paused',
        'error',
        'completed',
      ];
      expect(statuses).toHaveLength(5);
    });

    it('should allow valid BugAutoExecutionPermissions structure', () => {
      const permissions: BugAutoExecutionPermissions = {
        analyze: true,
        fix: false,
        verify: true,
        deploy: false,
      };
      expect(permissions.analyze).toBe(true);
      expect(permissions.fix).toBe(false);
    });

    it('should allow valid BugAutoExecutionState structure', () => {
      const state: BugAutoExecutionState = {
        isAutoExecuting: true,
        currentAutoPhase: 'analyze',
        autoExecutionStatus: 'running',
        lastFailedPhase: null,
        failedRetryCount: 0,
      };
      expect(state.isAutoExecuting).toBe(true);
      expect(state.currentAutoPhase).toBe('analyze');
    });
  });
});
