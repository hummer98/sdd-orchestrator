/**
 * ReviewHistoryView Component Tests
 * TDD: Testing review history display component
 * Requirements: 6.2, 6.3
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ReviewHistoryView } from './ReviewHistoryView';
import type { RoundDetail } from '../types/documentReview';

describe('ReviewHistoryView', () => {
  const defaultProps = {
    rounds: [] as RoundDetail[],
    onLoadRound: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ============================================================
  // Task 6.2: Basic rendering
  // Requirements: 6.2
  // ============================================================
  describe('Task 6.2: Basic rendering', () => {
    it('should render empty state when no rounds', () => {
      render(<ReviewHistoryView {...defaultProps} />);
      expect(screen.getByText(/履歴なし/)).toBeInTheDocument();
    });

    it('should render round list when rounds exist', () => {
      const rounds: RoundDetail[] = [
        { roundNumber: 1, status: 'reply_complete' },
        { roundNumber: 2, status: 'review_complete' },
      ];
      render(<ReviewHistoryView {...defaultProps} rounds={rounds} />);
      expect(screen.getByText(/Round 1/)).toBeInTheDocument();
      expect(screen.getByText(/Round 2/)).toBeInTheDocument();
    });

    it('should display rounds in order by round number', () => {
      const rounds: RoundDetail[] = [
        { roundNumber: 2, status: 'reply_complete' },
        { roundNumber: 1, status: 'reply_complete' },
      ];
      render(<ReviewHistoryView {...defaultProps} rounds={rounds} />);
      const roundElements = screen.getAllByText(/Round \d/);
      expect(roundElements[0].textContent).toContain('1');
      expect(roundElements[1].textContent).toContain('2');
    });
  });

  // ============================================================
  // Task 6.2: Round status display
  // Requirements: 6.3
  // ============================================================
  describe('Task 6.2: Round status display', () => {
    it('should show review_complete status', () => {
      const rounds: RoundDetail[] = [
        { roundNumber: 1, status: 'review_complete' },
      ];
      render(<ReviewHistoryView {...defaultProps} rounds={rounds} />);
      expect(screen.getByText(/レビュー完了/)).toBeInTheDocument();
    });

    it('should show reply_complete status', () => {
      const rounds: RoundDetail[] = [
        { roundNumber: 1, status: 'reply_complete' },
      ];
      render(<ReviewHistoryView {...defaultProps} rounds={rounds} />);
      expect(screen.getByText(/返信完了/)).toBeInTheDocument();
    });

    it('should show incomplete status', () => {
      const rounds: RoundDetail[] = [
        { roundNumber: 1, status: 'incomplete' },
      ];
      render(<ReviewHistoryView {...defaultProps} rounds={rounds} />);
      expect(screen.getByText(/未完了/)).toBeInTheDocument();
    });

    it('should display timestamps when available', () => {
      const rounds: RoundDetail[] = [
        {
          roundNumber: 1,
          status: 'reply_complete',
          reviewCompletedAt: '2025-12-11T01:00:00Z',
          replyCompletedAt: '2025-12-11T01:30:00Z',
        },
      ];
      render(<ReviewHistoryView {...defaultProps} rounds={rounds} />);
      // Should show formatted date
      expect(screen.getByText(/2025/)).toBeInTheDocument();
    });
  });

  // ============================================================
  // Task 6.2: Accordion behavior
  // Requirements: 6.3
  // ============================================================
  describe('Task 6.2: Accordion behavior', () => {
    it('should expand round details on click', () => {
      const rounds: RoundDetail[] = [
        { roundNumber: 1, status: 'reply_complete' },
      ];
      render(<ReviewHistoryView {...defaultProps} rounds={rounds} />);

      const roundHeader = screen.getByText(/Round 1/).closest('button');
      expect(roundHeader).toBeTruthy();

      // Click to expand
      fireEvent.click(roundHeader!);

      // Should trigger onLoadRound
      expect(defaultProps.onLoadRound).toHaveBeenCalledWith(1);
    });

    it('should collapse expanded round on second click', () => {
      const rounds: RoundDetail[] = [
        { roundNumber: 1, status: 'reply_complete' },
      ];
      render(<ReviewHistoryView {...defaultProps} rounds={rounds} />);

      const roundHeader = screen.getByText(/Round 1/).closest('button');

      // Click to expand
      fireEvent.click(roundHeader!);
      expect(defaultProps.onLoadRound).toHaveBeenCalledTimes(1);

      // Click to collapse (should not trigger load again)
      fireEvent.click(roundHeader!);
      expect(defaultProps.onLoadRound).toHaveBeenCalledTimes(1);
    });
  });

  // ============================================================
  // Task 6.2: Content display
  // Requirements: 6.2
  // ============================================================
  describe('Task 6.2: Content display', () => {
    it('should display review content when provided', () => {
      const rounds: RoundDetail[] = [
        { roundNumber: 1, status: 'reply_complete' },
      ];
      render(
        <ReviewHistoryView
          {...defaultProps}
          rounds={rounds}
          reviewContent="## Review Content"
          expandedRound={1}
        />
      );
      expect(screen.getByText(/Review Content/)).toBeInTheDocument();
    });

    it('should display reply content when provided', () => {
      const rounds: RoundDetail[] = [
        { roundNumber: 1, status: 'reply_complete' },
      ];
      render(
        <ReviewHistoryView
          {...defaultProps}
          rounds={rounds}
          replyContent="## Reply Content"
          expandedRound={1}
        />
      );
      expect(screen.getByText(/Reply Content/)).toBeInTheDocument();
    });
  });
});
