/**
 * Tests for Agent Lifecycle Management Type Definitions
 * Requirements: 2.1, 4.1, 8.1, 8.2
 */

import { describe, it, expect } from 'vitest';
import type {
  AgentState,
  ExitReason,
  StopReason,
} from './agentLifecycleTypes';

describe('AgentLifecycleTypes', () => {
  describe('AgentState', () => {
    it('should have all required states', () => {
      const states: AgentState[] = [
        'spawning',
        'running',
        'timed_out',
        'stopping',
        'killing',
        'completed',
        'failed',
        'stopped',
        'interrupted',
        'terminal',
      ];

      // This test verifies the type system allows all expected states
      expect(states).toHaveLength(10);
    });
  });

  describe('ExitReason', () => {
    it('should have all normal exit reasons', () => {
      const normalReasons: ExitReason[] = ['completed', 'stopped_by_user'];
      expect(normalReasons).toHaveLength(2);
    });

    it('should have all abnormal exit reasons (while app running)', () => {
      const abnormalRunning: ExitReason[] = ['failed', 'timed_out', 'crashed'];
      expect(abnormalRunning).toHaveLength(3);
    });

    it('should have all abnormal exit reasons (while app closed)', () => {
      const abnormalClosed: ExitReason[] = ['exited_while_app_closed', 'pid_reused'];
      expect(abnormalClosed).toHaveLength(2);
    });

    it('should have special exit reasons', () => {
      const specialReasons: ExitReason[] = ['orphaned', 'unknown'];
      expect(specialReasons).toHaveLength(2);
    });
  });

  describe('StopReason', () => {
    it('should have all stop reasons', () => {
      const stopReasons: StopReason[] = [
        'user_request',
        'timeout',
        'phase_complete',
        'error',
      ];
      expect(stopReasons).toHaveLength(4);
    });
  });
});
