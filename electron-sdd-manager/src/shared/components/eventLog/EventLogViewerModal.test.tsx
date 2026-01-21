/**
 * EventLogViewerModal Component Test
 * Requirements: 3.3, 3.4, 3.7 (spec-event-log)
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { EventLogViewerModal } from './EventLogViewerModal';
import type { EventLogEntry, EventLogError } from '../../types';

describe('EventLogViewerModal', () => {
  const mockOnClose = vi.fn();

  const mockEvents: EventLogEntry[] = [
    {
      timestamp: '2026-01-21T10:05:00Z',
      type: 'agent:complete',
      message: 'Agent completed: requirements phase',
      agentId: 'agent-123',
      phase: 'requirements',
      exitCode: 0,
    },
    {
      timestamp: '2026-01-21T10:00:00Z',
      type: 'agent:start',
      message: 'Agent started: requirements phase',
      agentId: 'agent-123',
      phase: 'requirements',
    },
  ];

  beforeEach(() => {
    mockOnClose.mockClear();
  });

  describe('Modal open/close control (Requirement 3.3)', () => {
    it('should not render when isOpen is false', () => {
      render(
        <EventLogViewerModal
          isOpen={false}
          onClose={mockOnClose}
          events={mockEvents}
        />
      );

      expect(screen.queryByTestId('event-log-modal')).not.toBeInTheDocument();
    });

    it('should render when isOpen is true', () => {
      render(
        <EventLogViewerModal
          isOpen={true}
          onClose={mockOnClose}
          events={mockEvents}
        />
      );

      expect(screen.getByTestId('event-log-modal')).toBeInTheDocument();
    });

    it('should call onClose when close button is clicked', () => {
      render(
        <EventLogViewerModal
          isOpen={true}
          onClose={mockOnClose}
          events={mockEvents}
        />
      );

      const closeButton = screen.getByTestId('event-log-modal-close');
      fireEvent.click(closeButton);

      expect(mockOnClose).toHaveBeenCalledOnce();
    });

    it('should call onClose when backdrop is clicked', () => {
      render(
        <EventLogViewerModal
          isOpen={true}
          onClose={mockOnClose}
          events={mockEvents}
        />
      );

      const modal = screen.getByTestId('event-log-modal');
      fireEvent.click(modal);

      expect(mockOnClose).toHaveBeenCalledOnce();
    });
  });

  describe('Chronological display (Requirement 3.4)', () => {
    it('should display events in provided order (newest first)', () => {
      render(
        <EventLogViewerModal
          isOpen={true}
          onClose={mockOnClose}
          events={mockEvents}
        />
      );

      const items = screen.getAllByTestId(/event-log-item-/);
      expect(items).toHaveLength(2);
      // First item should be the complete event (newest)
      expect(items[0]).toHaveAttribute('data-testid', 'event-log-item-agent:complete');
      expect(items[1]).toHaveAttribute('data-testid', 'event-log-item-agent:start');
    });
  });

  describe('Empty state message (Requirement 3.7)', () => {
    it('should display empty state when no events', () => {
      render(
        <EventLogViewerModal
          isOpen={true}
          onClose={mockOnClose}
          events={[]}
        />
      );

      expect(screen.getByTestId('event-log-empty')).toBeInTheDocument();
      expect(screen.getByText('No events recorded yet')).toBeInTheDocument();
    });
  });

  describe('Loading state', () => {
    it('should display loading indicator when isLoading is true', () => {
      render(
        <EventLogViewerModal
          isOpen={true}
          onClose={mockOnClose}
          events={[]}
          isLoading={true}
        />
      );

      expect(screen.getByTestId('event-log-loading')).toBeInTheDocument();
      expect(screen.getByText('Loading events...')).toBeInTheDocument();
    });
  });

  describe('Error state', () => {
    it('should display error message when error is provided', () => {
      const error: EventLogError = {
        type: 'IO_ERROR',
        message: 'File read failed',
      };

      render(
        <EventLogViewerModal
          isOpen={true}
          onClose={mockOnClose}
          events={[]}
          error={error}
        />
      );

      expect(screen.getByTestId('event-log-error')).toBeInTheDocument();
      expect(screen.getByText(/Failed to load events: IO_ERROR/)).toBeInTheDocument();
    });
  });
});
