/**
 * DocumentReviewPanel Component Tests
 * TDD: Testing document review panel UI component
 * Requirements: 6.1, 6.4, 6.5
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { DocumentReviewPanel } from './DocumentReviewPanel';
import type { DocumentReviewState } from '../types/documentReview';

// Mock the stores
vi.mock('../stores/agentStore', () => ({
  useAgentStore: vi.fn(() => ({
    agents: new Map(),
    getAgentsForSpec: () => [],
  })),
}));

vi.mock('../stores/specStore', () => ({
  useSpecStore: vi.fn(() => ({
    specDetail: {
      metadata: { name: 'test-feature', path: '/test/path' },
      specJson: {
        feature_name: 'test-feature',
        approvals: {
          requirements: { generated: true, approved: true },
          design: { generated: true, approved: true },
          tasks: { generated: true, approved: true },
        },
      },
    },
  })),
}));

describe('DocumentReviewPanel', () => {
  const defaultProps = {
    reviewState: null as DocumentReviewState | null,
    isExecuting: false,
    autoExecutionFlag: 'run' as const,
    onStartReview: vi.fn(),
    onAutoExecutionFlagChange: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ============================================================
  // Task 6.1: Basic rendering
  // Requirements: 6.1
  // ============================================================
  describe('Task 6.1: Basic rendering', () => {
    it('should render panel title', () => {
      render(<DocumentReviewPanel {...defaultProps} />);
      expect(screen.getByText(/ドキュメントレビュー/)).toBeInTheDocument();
    });

    it('should show round count of 0 when review state is null', () => {
      render(<DocumentReviewPanel {...defaultProps} reviewState={null} />);
      // rounds: 0 is displayed
      expect(screen.getByText(/ラウンド:/)).toBeInTheDocument();
      expect(screen.getByText('0')).toBeInTheDocument();
    });

    it('should show round count when review state exists', () => {
      const reviewState: DocumentReviewState = {
        status: 'pending',
        roundDetails: [
          { roundNumber: 1, status: 'reply_complete' },
          { roundNumber: 2, status: 'reply_complete' },
        ],
      };
      render(<DocumentReviewPanel {...defaultProps} reviewState={reviewState} />);
      expect(screen.getByText('2')).toBeInTheDocument();
    });
  });

  // ============================================================
  // Task 6.1: Button states
  // Requirements: 6.4, 6.5
  // ============================================================
  describe('Task 6.1: Button states', () => {
    it('should enable start review button when isExecuting is false', () => {
      render(<DocumentReviewPanel {...defaultProps} isExecuting={false} />);
      const startButton = screen.getByRole('button', { name: /レビュー開始/ });
      expect(startButton).not.toBeDisabled();
    });

    it('should disable start review button when isExecuting is true', () => {
      render(<DocumentReviewPanel {...defaultProps} isExecuting={true} />);
      const startButton = screen.getByRole('button', { name: /レビュー開始/ });
      expect(startButton).toBeDisabled();
    });
  });

  // ============================================================
  // Task 6.1: User interactions
  // Requirements: 6.1
  // ============================================================
  describe('Task 6.1: User interactions', () => {
    it('should call onStartReview when start button is clicked', () => {
      const onStartReview = vi.fn();
      render(<DocumentReviewPanel {...defaultProps} onStartReview={onStartReview} />);
      fireEvent.click(screen.getByRole('button', { name: /レビュー開始/ }));
      expect(onStartReview).toHaveBeenCalledTimes(1);
    });
  });

  // ============================================================
  // Task 6.1: Executing state display
  // Requirements: 6.5
  // ============================================================
  describe('Task 6.1: Executing state display', () => {
    it('should show executing indicator when isExecuting is true', () => {
      render(<DocumentReviewPanel {...defaultProps} isExecuting={true} />);
      expect(screen.getByTestId('progress-indicator-executing')).toBeInTheDocument();
    });

    it('should show executing indicator during review', () => {
      const reviewState: DocumentReviewState = {
        status: 'in_progress',
        currentRound: 1,
      };
      render(<DocumentReviewPanel {...defaultProps} reviewState={reviewState} isExecuting={true} />);
      expect(screen.getByTestId('progress-indicator-executing')).toBeInTheDocument();
    });
  });

  // ============================================================
  // Task 6.1: Progress indicator (title left side)
  // Requirements: 6.5, 6.6
  // ============================================================
  describe('Task 6.1: Progress indicator', () => {
    it('should show checked state when has roundDetails', () => {
      const reviewState: DocumentReviewState = {
        status: 'pending',
        roundDetails: [
          { roundNumber: 1, status: 'reply_complete' },
          { roundNumber: 2, status: 'reply_complete' },
        ],
      };
      render(<DocumentReviewPanel {...defaultProps} reviewState={reviewState} />);
      expect(screen.getByTestId('progress-indicator-checked')).toBeInTheDocument();
    });

    it('should show unchecked state when no roundDetails and not executing', () => {
      const reviewState: DocumentReviewState = {
        status: 'pending',
      };
      render(<DocumentReviewPanel {...defaultProps} reviewState={reviewState} isExecuting={false} />);
      expect(screen.getByTestId('progress-indicator-unchecked')).toBeInTheDocument();
    });

    it('should show executing state when status is in_progress', () => {
      const reviewState: DocumentReviewState = {
        status: 'in_progress',
      };
      render(<DocumentReviewPanel {...defaultProps} reviewState={reviewState} isExecuting={true} />);
      expect(screen.getByTestId('progress-indicator-executing')).toBeInTheDocument();
    });

    it('should show skip-scheduled state when autoExecutionFlag is skip', () => {
      render(
        <DocumentReviewPanel
          {...defaultProps}
          reviewState={null}
          autoExecutionFlag="skip"
        />
      );
      expect(screen.getByTestId('progress-indicator-skip-scheduled')).toBeInTheDocument();
    });
  });

  // ============================================================
  // Task 6.1: Auto execution flag control UI (title right side)
  // Requirements: 6.7, 6.8
  // ============================================================
  describe('Task 6.1: Auto execution flag control UI', () => {
    it('should render auto execution flag control', () => {
      render(<DocumentReviewPanel {...defaultProps} autoExecutionFlag="run" />);
      expect(screen.getByTestId('auto-execution-flag-control')).toBeInTheDocument();
    });

    it('should show run state when flag is run', () => {
      render(<DocumentReviewPanel {...defaultProps} autoExecutionFlag="run" />);
      expect(screen.getByTestId('auto-flag-run')).toBeInTheDocument();
    });

    it('should show pause state when flag is pause', () => {
      render(<DocumentReviewPanel {...defaultProps} autoExecutionFlag="pause" />);
      expect(screen.getByTestId('auto-flag-pause')).toBeInTheDocument();
    });

    it('should show skip state when flag is skip', () => {
      render(<DocumentReviewPanel {...defaultProps} autoExecutionFlag="skip" />);
      expect(screen.getByTestId('auto-flag-skip')).toBeInTheDocument();
    });

    it('should call onAutoExecutionFlagChange with next value when clicked - run to pause', () => {
      const onAutoExecutionFlagChange = vi.fn();
      render(
        <DocumentReviewPanel
          {...defaultProps}
          autoExecutionFlag="run"
          onAutoExecutionFlagChange={onAutoExecutionFlagChange}
        />
      );
      fireEvent.click(screen.getByTestId('auto-execution-flag-control'));
      expect(onAutoExecutionFlagChange).toHaveBeenCalledWith('pause');
    });

    it('should call onAutoExecutionFlagChange with next value when clicked - pause to skip', () => {
      const onAutoExecutionFlagChange = vi.fn();
      render(
        <DocumentReviewPanel
          {...defaultProps}
          autoExecutionFlag="pause"
          onAutoExecutionFlagChange={onAutoExecutionFlagChange}
        />
      );
      fireEvent.click(screen.getByTestId('auto-execution-flag-control'));
      expect(onAutoExecutionFlagChange).toHaveBeenCalledWith('skip');
    });

    it('should call onAutoExecutionFlagChange with next value when clicked - skip to run', () => {
      const onAutoExecutionFlagChange = vi.fn();
      render(
        <DocumentReviewPanel
          {...defaultProps}
          autoExecutionFlag="skip"
          onAutoExecutionFlagChange={onAutoExecutionFlagChange}
        />
      );
      fireEvent.click(screen.getByTestId('auto-execution-flag-control'));
      expect(onAutoExecutionFlagChange).toHaveBeenCalledWith('run');
    });
  });
});
