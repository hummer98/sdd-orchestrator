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

  // ============================================================
  // bugs-workflow-auto-execution Task 5: Auto execution support
  // Requirements: 6.3, 6.5
  // ============================================================
  describe('Task 5: Auto execution support', () => {
    describe('isAutoExecuting prop', () => {
      it('should disable execute button when isAutoExecuting is true', () => {
        render(
          <BugPhaseItem
            {...defaultProps}
            isAutoExecuting={true}
          />
        );
        const button = screen.getByTestId('bug-phase-execute-button-analyze');
        expect(button).toBeDisabled();
      });

      it('should not disable execute button when isAutoExecuting is false', () => {
        render(
          <BugPhaseItem
            {...defaultProps}
            isAutoExecuting={false}
            canExecute={true}
          />
        );
        const button = screen.getByTestId('bug-phase-execute-button-analyze');
        expect(button).not.toBeDisabled();
      });
    });

    describe('isAutoExecutingPhase prop', () => {
      it('should highlight phase when isAutoExecutingPhase is true', () => {
        const { container } = render(
          <BugPhaseItem
            {...defaultProps}
            isAutoExecuting={true}
            isAutoExecutingPhase={true}
          />
        );

        const phaseItem = screen.getByTestId('bug-phase-item-analyze');
        expect(phaseItem).toHaveClass('ring-2');
      });

      it('should not highlight phase when isAutoExecutingPhase is false', () => {
        const { container } = render(
          <BugPhaseItem
            {...defaultProps}
            isAutoExecuting={true}
            isAutoExecutingPhase={false}
          />
        );

        const phaseItem = screen.getByTestId('bug-phase-item-analyze');
        expect(phaseItem).not.toHaveClass('ring-2');
      });
    });
  });
});
