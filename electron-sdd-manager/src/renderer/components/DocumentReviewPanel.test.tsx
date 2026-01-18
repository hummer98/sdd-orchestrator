/**
 * DocumentReviewPanel Component Tests
 * TDD: Testing document review panel UI component
 * Requirements: 6.1, 6.4, 6.5
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { DocumentReviewPanel } from '@shared/components/review';
import type { DocumentReviewState } from '@shared/types';

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
      // ボタンは実行中は「Nラウンド目 review実行中...」と表示される
      const startButton = screen.getByTestId('start-review-button');
      expect(startButton).toBeDisabled();
      expect(startButton).toHaveTextContent(/review実行中/);
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

    // NOTE: skip-scheduled test removed - skip option is no longer available
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

    // NOTE: skip state test removed - skip option is no longer available

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

    it('should call onAutoExecutionFlagChange with next value when clicked - pause to run', () => {
      const onAutoExecutionFlagChange = vi.fn();
      render(
        <DocumentReviewPanel
          {...defaultProps}
          autoExecutionFlag="pause"
          onAutoExecutionFlagChange={onAutoExecutionFlagChange}
        />
      );
      fireEvent.click(screen.getByTestId('auto-execution-flag-control'));
      expect(onAutoExecutionFlagChange).toHaveBeenCalledWith('run');
    });

    // NOTE: skip to run test removed - skip option is no longer available
  });

  // ============================================================
  // gemini-document-review Task 5.2, 5.3: Scheme tag and selector
  // Requirements: 4.1, 4.2, 4.3, 4.4, 5.2, 5.3, 5.4, 5.5
  // ============================================================
  describe('scheme tag and selector', () => {
    it('should display scheme tag when scheme is provided', () => {
      render(
        <DocumentReviewPanel
          {...defaultProps}
          scheme="claude-code"
          onSchemeChange={vi.fn()}
        />
      );
      expect(screen.getByTestId('scheme-selector-button')).toBeInTheDocument();
      expect(screen.getByText('Claude')).toBeInTheDocument();
    });

    it('should display default Claude tag when scheme is undefined', () => {
      render(
        <DocumentReviewPanel
          {...defaultProps}
          onSchemeChange={vi.fn()}
        />
      );
      expect(screen.getByText('Claude')).toBeInTheDocument();
    });

    it('should display Gemini tag when scheme is gemini-cli', () => {
      render(
        <DocumentReviewPanel
          {...defaultProps}
          scheme="gemini-cli"
          onSchemeChange={vi.fn()}
        />
      );
      expect(screen.getByText('Gemini')).toBeInTheDocument();
    });

    it('should display Debatex tag when scheme is debatex', () => {
      render(
        <DocumentReviewPanel
          {...defaultProps}
          scheme="debatex"
          onSchemeChange={vi.fn()}
        />
      );
      expect(screen.getByText('Debatex')).toBeInTheDocument();
    });

    it('should call onSchemeChange when scheme is selected', () => {
      const onSchemeChange = vi.fn();
      render(
        <DocumentReviewPanel
          {...defaultProps}
          scheme="claude-code"
          onSchemeChange={onSchemeChange}
        />
      );

      // Click the scheme selector button
      fireEvent.click(screen.getByTestId('scheme-selector-button'));

      // Select Gemini from dropdown
      const dropdown = screen.getByTestId('scheme-selector-dropdown');
      expect(dropdown).toBeInTheDocument();

      // Find and click the Gemini option
      const geminiOption = screen.getAllByText('Gemini')[0];
      fireEvent.click(geminiOption);

      expect(onSchemeChange).toHaveBeenCalledWith('gemini-cli');
    });

    it('should disable scheme selector when executing', () => {
      render(
        <DocumentReviewPanel
          {...defaultProps}
          scheme="claude-code"
          isExecuting={true}
          onSchemeChange={vi.fn()}
        />
      );
      expect(screen.getByTestId('scheme-selector-button')).toBeDisabled();
    });
  });
});
