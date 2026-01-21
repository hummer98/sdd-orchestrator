/**
 * Event Log Types Test
 * Requirements: 4.1, 4.2, 4.3
 *
 * TDD: RED phase - Tests for EventLogEntry types
 */

import { describe, it, expect } from 'vitest';
import type {
  EventType,
  EventLogEntryBase,
  AgentEventData,
  AutoExecutionEventData,
  ApprovalEventData,
  WorktreeEventData,
  PhaseTransitionEventData,
  ReviewEventData,
  EventLogEntry,
  EventLogInput,
  EventLogError,
} from './eventLog';

describe('EventLog Types', () => {
  describe('EventType', () => {
    it('should include all agent-related event types', () => {
      const agentTypes: EventType[] = ['agent:start', 'agent:complete', 'agent:fail'];
      expect(agentTypes).toHaveLength(3);
    });

    it('should include all auto-execution event types', () => {
      const autoExecTypes: EventType[] = [
        'auto-execution:start',
        'auto-execution:complete',
        'auto-execution:fail',
        'auto-execution:stop',
      ];
      expect(autoExecTypes).toHaveLength(4);
    });

    it('should include approval event type', () => {
      const approvalType: EventType = 'approval:update';
      expect(approvalType).toBe('approval:update');
    });

    it('should include all worktree event types', () => {
      const worktreeTypes: EventType[] = ['worktree:create', 'worktree:merge', 'worktree:delete'];
      expect(worktreeTypes).toHaveLength(3);
    });

    it('should include phase transition event type', () => {
      const phaseType: EventType = 'phase:transition';
      expect(phaseType).toBe('phase:transition');
    });

    it('should include all review/inspection event types', () => {
      const reviewTypes: EventType[] = [
        'review:start',
        'review:complete',
        'inspection:start',
        'inspection:complete',
      ];
      expect(reviewTypes).toHaveLength(4);
    });
  });

  describe('EventLogEntryBase', () => {
    it('should have required fields', () => {
      const entry: EventLogEntryBase = {
        timestamp: '2026-01-21T10:00:00Z',
        type: 'agent:start',
        message: 'Agent started',
      };
      expect(entry.timestamp).toBe('2026-01-21T10:00:00Z');
      expect(entry.type).toBe('agent:start');
      expect(entry.message).toBe('Agent started');
    });
  });

  describe('AgentEventData', () => {
    it('should have agent-specific fields', () => {
      const data: AgentEventData = {
        agentId: 'agent-123',
        phase: 'requirements',
        command: '/kiro:spec-requirements feature-x',
        exitCode: 0,
        errorMessage: undefined,
      };
      expect(data.agentId).toBe('agent-123');
      expect(data.phase).toBe('requirements');
      expect(data.command).toBe('/kiro:spec-requirements feature-x');
      expect(data.exitCode).toBe(0);
    });
  });

  describe('AutoExecutionEventData', () => {
    it('should have auto-execution specific fields', () => {
      const data: AutoExecutionEventData = {
        status: 'started',
        startPhase: 'requirements',
        endPhase: 'tasks',
      };
      expect(data.status).toBe('started');
      expect(data.startPhase).toBe('requirements');
      expect(data.endPhase).toBe('tasks');
    });
  });

  describe('ApprovalEventData', () => {
    it('should have approval specific fields', () => {
      const data: ApprovalEventData = {
        phase: 'requirements',
        approved: true,
      };
      expect(data.phase).toBe('requirements');
      expect(data.approved).toBe(true);
    });
  });

  describe('WorktreeEventData', () => {
    it('should have worktree specific fields', () => {
      const data: WorktreeEventData = {
        worktreePath: '.kiro/worktrees/specs/feature-x',
        branch: 'feature/feature-x',
      };
      expect(data.worktreePath).toBe('.kiro/worktrees/specs/feature-x');
      expect(data.branch).toBe('feature/feature-x');
    });
  });

  describe('PhaseTransitionEventData', () => {
    it('should have phase transition specific fields', () => {
      const data: PhaseTransitionEventData = {
        oldPhase: 'requirements-generated',
        newPhase: 'requirements-approved',
      };
      expect(data.oldPhase).toBe('requirements-generated');
      expect(data.newPhase).toBe('requirements-approved');
    });
  });

  describe('ReviewEventData', () => {
    it('should have review specific fields', () => {
      const data: ReviewEventData = {
        roundNumber: 1,
        result: 'go',
      };
      expect(data.roundNumber).toBe(1);
      expect(data.result).toBe('go');
    });
  });

  describe('EventLogEntry (Discriminated Union)', () => {
    it('should create an agent:start entry', () => {
      const entry: EventLogEntry = {
        timestamp: '2026-01-21T10:00:00Z',
        type: 'agent:start',
        message: 'Agent started: requirements phase',
        agentId: 'agent-123',
        phase: 'requirements',
        command: '/kiro:spec-requirements feature-x',
      };
      expect(entry.type).toBe('agent:start');
      expect(entry.agentId).toBe('agent-123');
    });

    it('should create an auto-execution:start entry', () => {
      const entry: EventLogEntry = {
        timestamp: '2026-01-21T10:00:00Z',
        type: 'auto-execution:start',
        message: 'Auto execution started',
        status: 'started',
        startPhase: 'requirements',
      };
      expect(entry.type).toBe('auto-execution:start');
      expect(entry.status).toBe('started');
    });

    it('should create an approval:update entry', () => {
      const entry: EventLogEntry = {
        timestamp: '2026-01-21T10:00:00Z',
        type: 'approval:update',
        message: 'Requirements approved',
        phase: 'requirements',
        approved: true,
      };
      expect(entry.type).toBe('approval:update');
      expect(entry.approved).toBe(true);
    });

    it('should create a worktree:create entry', () => {
      const entry: EventLogEntry = {
        timestamp: '2026-01-21T10:00:00Z',
        type: 'worktree:create',
        message: 'Worktree created',
        worktreePath: '.kiro/worktrees/specs/feature-x',
        branch: 'feature/feature-x',
      };
      expect(entry.type).toBe('worktree:create');
      expect(entry.worktreePath).toBe('.kiro/worktrees/specs/feature-x');
    });

    it('should create a phase:transition entry', () => {
      const entry: EventLogEntry = {
        timestamp: '2026-01-21T10:00:00Z',
        type: 'phase:transition',
        message: 'Phase transitioned',
        oldPhase: 'requirements-generated',
        newPhase: 'requirements-approved',
      };
      expect(entry.type).toBe('phase:transition');
      expect(entry.oldPhase).toBe('requirements-generated');
      expect(entry.newPhase).toBe('requirements-approved');
    });

    it('should create a review:start entry', () => {
      const entry: EventLogEntry = {
        timestamp: '2026-01-21T10:00:00Z',
        type: 'review:start',
        message: 'Document review started',
        roundNumber: 1,
      };
      expect(entry.type).toBe('review:start');
      expect(entry.roundNumber).toBe(1);
    });
  });

  describe('EventLogInput', () => {
    it('should omit timestamp from EventLogEntry', () => {
      const input: EventLogInput = {
        type: 'agent:start',
        message: 'Agent started',
        agentId: 'agent-123',
        phase: 'requirements',
      };
      // @ts-expect-error timestamp should not be present
      expect(input.timestamp).toBeUndefined();
      expect(input.type).toBe('agent:start');
      expect(input.agentId).toBe('agent-123');
    });
  });

  describe('EventLogError', () => {
    it('should create NOT_FOUND error', () => {
      const error: EventLogError = {
        type: 'NOT_FOUND',
        specId: 'feature-x',
      };
      expect(error.type).toBe('NOT_FOUND');
      expect(error.specId).toBe('feature-x');
    });

    it('should create PARSE_ERROR error', () => {
      const error: EventLogError = {
        type: 'PARSE_ERROR',
        line: 5,
        message: 'Invalid JSON',
      };
      expect(error.type).toBe('PARSE_ERROR');
      expect(error.line).toBe(5);
    });

    it('should create IO_ERROR error', () => {
      const error: EventLogError = {
        type: 'IO_ERROR',
        message: 'File write failed',
      };
      expect(error.type).toBe('IO_ERROR');
      expect(error.message).toBe('File write failed');
    });
  });
});
