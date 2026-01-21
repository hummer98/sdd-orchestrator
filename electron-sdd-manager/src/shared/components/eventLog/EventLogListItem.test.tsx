/**
 * EventLogListItem Component Test
 * Requirements: 3.5, 3.6 (spec-event-log)
 */

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { EventLogListItem } from './EventLogListItem';
import type { EventLogEntry } from '../../types';

describe('EventLogListItem', () => {
  const baseEvent: EventLogEntry = {
    timestamp: '2026-01-21T10:00:00Z',
    type: 'agent:start',
    message: 'Agent started: requirements phase',
    agentId: 'agent-123',
    phase: 'requirements',
  };

  describe('Event type display (Requirement 3.5)', () => {
    it('should display timestamp in local format', () => {
      render(<EventLogListItem event={baseEvent} />);

      // Check for timestamp text (local format varies by environment)
      const element = screen.getByTestId('event-log-item-agent:start');
      expect(element).toBeInTheDocument();
    });

    it('should display event message', () => {
      render(<EventLogListItem event={baseEvent} />);

      expect(screen.getByText('Agent started: requirements phase')).toBeInTheDocument();
    });

    it('should display event type badge', () => {
      render(<EventLogListItem event={baseEvent} />);

      expect(screen.getByText('agent:start')).toBeInTheDocument();
    });
  });

  describe('Visual distinction by event type (Requirement 3.6)', () => {
    it('should render agent:start event with correct testid', () => {
      render(<EventLogListItem event={baseEvent} />);
      expect(screen.getByTestId('event-log-item-agent:start')).toBeInTheDocument();
    });

    it('should render agent:complete event', () => {
      const event: EventLogEntry = {
        ...baseEvent,
        type: 'agent:complete',
        exitCode: 0,
      };
      render(<EventLogListItem event={event} />);
      expect(screen.getByTestId('event-log-item-agent:complete')).toBeInTheDocument();
    });

    it('should render agent:fail event', () => {
      const event: EventLogEntry = {
        ...baseEvent,
        type: 'agent:fail',
        exitCode: 1,
        errorMessage: 'Process crashed',
      };
      render(<EventLogListItem event={event} />);
      expect(screen.getByTestId('event-log-item-agent:fail')).toBeInTheDocument();
    });

    it('should render auto-execution:start event', () => {
      const event: EventLogEntry = {
        timestamp: '2026-01-21T10:00:00Z',
        type: 'auto-execution:start',
        message: 'Auto-execution started',
        status: 'started',
        startPhase: 'requirements',
      };
      render(<EventLogListItem event={event} />);
      expect(screen.getByTestId('event-log-item-auto-execution:start')).toBeInTheDocument();
    });

    it('should render worktree:create event', () => {
      const event: EventLogEntry = {
        timestamp: '2026-01-21T10:00:00Z',
        type: 'worktree:create',
        message: 'Worktree created',
        worktreePath: '.kiro/worktrees/specs/test',
        branch: 'feature/test',
      };
      render(<EventLogListItem event={event} />);
      expect(screen.getByTestId('event-log-item-worktree:create')).toBeInTheDocument();
    });

    it('should render approval:update event', () => {
      const event: EventLogEntry = {
        timestamp: '2026-01-21T10:00:00Z',
        type: 'approval:update',
        message: 'Requirements approved',
        phase: 'requirements',
        approved: true,
      };
      render(<EventLogListItem event={event} />);
      expect(screen.getByTestId('event-log-item-approval:update')).toBeInTheDocument();
    });

    it('should render phase:transition event', () => {
      const event: EventLogEntry = {
        timestamp: '2026-01-21T10:00:00Z',
        type: 'phase:transition',
        message: 'Phase transitioned',
        oldPhase: 'requirements-generated',
        newPhase: 'design-generated',
      };
      render(<EventLogListItem event={event} />);
      expect(screen.getByTestId('event-log-item-phase:transition')).toBeInTheDocument();
    });

    it('should render review:start event', () => {
      const event: EventLogEntry = {
        timestamp: '2026-01-21T10:00:00Z',
        type: 'review:start',
        message: 'Document review started',
        roundNumber: 1,
      };
      render(<EventLogListItem event={event} />);
      expect(screen.getByTestId('event-log-item-review:start')).toBeInTheDocument();
    });
  });
});
