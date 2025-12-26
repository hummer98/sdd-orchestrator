/**
 * BugPhaseItem Component Tests
 * Task 2: bugs-pane-integration - BugPhaseItemコンポーネント
 * Requirements: 3.3, 4.6, 4.7, 6.2
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { BugPhaseItem, type BugPhaseItemProps } from './BugPhaseItem';
import type { BugWorkflowPhase, BugPhaseStatus } from '../types/bug';

describe('BugPhaseItem', () => {
  const defaultProps: BugPhaseItemProps = {
    phase: 'analyze',
    label: 'Analyze',
    status: 'pending',
    canExecute: true,
    showExecuteButton: true,
    onExecute: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('rendering', () => {
    it('should render phase label', () => {
      render(<BugPhaseItem {...defaultProps} />);
      expect(screen.getByText('Analyze')).toBeInTheDocument();
    });

    it('should render with correct data-testid', () => {
      render(<BugPhaseItem {...defaultProps} />);
      expect(screen.getByTestId('bug-phase-item-analyze')).toBeInTheDocument();
    });
  });

  describe('status icons', () => {
    it('should show pending icon for pending status', () => {
      render(<BugPhaseItem {...defaultProps} status="pending" />);
      expect(screen.getByTestId('bug-phase-status-pending')).toBeInTheDocument();
    });

    it('should show completed icon for completed status', () => {
      render(<BugPhaseItem {...defaultProps} status="completed" />);
      expect(screen.getByTestId('bug-phase-status-completed')).toBeInTheDocument();
    });

    it('should show executing icon for executing status', () => {
      render(<BugPhaseItem {...defaultProps} status="executing" />);
      expect(screen.getByTestId('bug-phase-status-executing')).toBeInTheDocument();
    });
  });

  describe('execute button', () => {
    it('should show execute button when showExecuteButton is true', () => {
      render(<BugPhaseItem {...defaultProps} showExecuteButton={true} />);
      expect(screen.getByTestId('bug-phase-execute-button-analyze')).toBeInTheDocument();
    });

    it('should not show execute button when showExecuteButton is false', () => {
      render(<BugPhaseItem {...defaultProps} showExecuteButton={false} />);
      expect(screen.queryByTestId('bug-phase-execute-button-analyze')).not.toBeInTheDocument();
    });

    it('should call onExecute when button is clicked', () => {
      const onExecute = vi.fn();
      render(<BugPhaseItem {...defaultProps} onExecute={onExecute} />);

      fireEvent.click(screen.getByTestId('bug-phase-execute-button-analyze'));
      expect(onExecute).toHaveBeenCalledTimes(1);
    });

    it('should disable button when canExecute is false', () => {
      render(<BugPhaseItem {...defaultProps} canExecute={false} />);
      const button = screen.getByTestId('bug-phase-execute-button-analyze');
      expect(button).toBeDisabled();
    });

    it('should disable button when status is executing', () => {
      render(<BugPhaseItem {...defaultProps} status="executing" />);
      const button = screen.getByTestId('bug-phase-execute-button-analyze');
      expect(button).toBeDisabled();
    });
  });

  describe('Report phase specifics', () => {
    it('should not show execute button for report phase', () => {
      render(
        <BugPhaseItem
          {...defaultProps}
          phase="report"
          label="Report"
          showExecuteButton={false}
        />
      );
      expect(screen.queryByTestId('bug-phase-execute-button-report')).not.toBeInTheDocument();
    });
  });

  describe('all phases', () => {
    const phases: BugWorkflowPhase[] = ['report', 'analyze', 'fix', 'verify', 'deploy'];

    it.each(phases)('should render %s phase correctly', (phase) => {
      render(
        <BugPhaseItem
          {...defaultProps}
          phase={phase}
          label={phase.charAt(0).toUpperCase() + phase.slice(1)}
        />
      );
      expect(screen.getByTestId(`bug-phase-item-${phase}`)).toBeInTheDocument();
    });
  });
});
