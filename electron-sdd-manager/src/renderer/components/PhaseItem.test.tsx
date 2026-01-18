/**
 * PhaseItem Component Tests
 * TDD: Testing phase item display and interactions
 * Requirements: 2.1-2.5, 5.1, 5.2
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { PhaseItem, type PhaseStatus, type WorkflowPhase } from '@shared/components/workflow';

describe('PhaseItem', () => {
  const defaultProps = {
    phase: 'requirements' as WorkflowPhase,
    label: '要件定義',
    status: 'pending' as PhaseStatus,
    previousStatus: null as PhaseStatus | null,
    autoExecutionPermitted: true,
    isExecuting: false,
    canExecute: true,
    onExecute: vi.fn(),
    onApprove: vi.fn(),
    onApproveAndExecute: vi.fn(),
    onToggleAutoPermission: vi.fn(),
    onShowAgentLog: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ============================================================
  // Task 3.1: Phase status UI display
  // Requirements: 2.1, 2.2, 2.3, 2.5
  // ============================================================
  describe('Task 3.1: Phase status UI display', () => {
    describe('pending status', () => {
      it('should display execute button when pending', () => {
        render(<PhaseItem {...defaultProps} status="pending" />);

        expect(screen.getByRole('button', { name: /^実行$/i })).toBeInTheDocument();
      });

      it('should not display approve button when pending', () => {
        render(<PhaseItem {...defaultProps} status="pending" />);

        expect(screen.queryByRole('button', { name: /^承認$/i })).not.toBeInTheDocument();
      });

      it('should call onExecute when execute button is clicked', () => {
        const onExecute = vi.fn();
        render(<PhaseItem {...defaultProps} status="pending" onExecute={onExecute} />);

        fireEvent.click(screen.getByRole('button', { name: /^実行$/i }));

        expect(onExecute).toHaveBeenCalledTimes(1);
      });
    });

    describe('generated status', () => {
      it('should display pause icon when generated', () => {
        render(<PhaseItem {...defaultProps} status="generated" />);

        expect(screen.getByTestId('progress-icon-generated')).toBeInTheDocument();
      });

      it('should display approve button when generated', () => {
        render(<PhaseItem {...defaultProps} status="generated" />);

        expect(screen.getByRole('button', { name: /^承認$/i })).toBeInTheDocument();
      });

      it('should call onApprove when approve button is clicked', () => {
        const onApprove = vi.fn();
        render(<PhaseItem {...defaultProps} status="generated" onApprove={onApprove} />);

        fireEvent.click(screen.getByRole('button', { name: /^承認$/i }));

        expect(onApprove).toHaveBeenCalledTimes(1);
      });
    });

    describe('approved status', () => {
      it('should display approved progress icon', () => {
        render(<PhaseItem {...defaultProps} status="approved" />);

        expect(screen.getByTestId('progress-icon-approved')).toBeInTheDocument();
      });

      it('should not display execute button when approved', () => {
        render(<PhaseItem {...defaultProps} status="approved" />);

        expect(screen.queryByRole('button', { name: /^実行$/i })).not.toBeInTheDocument();
      });

      it('should not display approve button when approved', () => {
        render(<PhaseItem {...defaultProps} status="approved" />);

        expect(screen.queryByRole('button', { name: /^承認$/i })).not.toBeInTheDocument();
      });
    });

    describe('executing state', () => {
      it('should display executing label when isExecuting is true', () => {
        render(<PhaseItem {...defaultProps} status="pending" isExecuting={true} />);

        expect(screen.getByText('実行中')).toBeInTheDocument();
      });

      it('should show bot icon when executing', () => {
        render(<PhaseItem {...defaultProps} status="pending" isExecuting={true} />);

        expect(screen.getByTestId('progress-icon-executing')).toBeInTheDocument();
      });

      it('should not display execute button when executing', () => {
        render(<PhaseItem {...defaultProps} status="pending" isExecuting={true} />);

        // Execute button should not be present during execution
        expect(screen.queryByRole('button', { name: /^実行$/i })).not.toBeInTheDocument();
      });
    });
  });

  // ============================================================
  // Task 3.2: Approve and execute button
  // Requirements: 2.4, 3.5
  // ============================================================
  describe('Task 3.2: Approve and execute button', () => {
    it('should display approve and execute button when previous is generated and current is pending', () => {
      render(
        <PhaseItem
          {...defaultProps}
          phase="design"
          label="設計"
          status="pending"
          previousStatus="generated"
        />
      );

      expect(screen.getByRole('button', { name: /承認して実行/i })).toBeInTheDocument();
    });

    it('should not display approve and execute button when previous is not generated', () => {
      render(
        <PhaseItem
          {...defaultProps}
          phase="design"
          label="設計"
          status="pending"
          previousStatus="pending"
        />
      );

      expect(screen.queryByRole('button', { name: /承認して実行/i })).not.toBeInTheDocument();
    });

    it('should not display approve and execute button when previous is approved', () => {
      render(
        <PhaseItem
          {...defaultProps}
          phase="design"
          label="設計"
          status="pending"
          previousStatus="approved"
        />
      );

      expect(screen.queryByRole('button', { name: /承認して実行/i })).not.toBeInTheDocument();
    });

    it('should call onApproveAndExecute when button is clicked', () => {
      const onApproveAndExecute = vi.fn();
      render(
        <PhaseItem
          {...defaultProps}
          phase="design"
          status="pending"
          previousStatus="generated"
          onApproveAndExecute={onApproveAndExecute}
        />
      );

      fireEvent.click(screen.getByRole('button', { name: /承認して実行/i }));

      expect(onApproveAndExecute).toHaveBeenCalledTimes(1);
    });
  });

  // ============================================================
  // Task 3.3: Auto execution permission icon
  // Requirements: 5.1, 5.2
  // ============================================================
  describe('Task 3.3: Auto execution permission icon', () => {
    it('should display phase label', () => {
      render(<PhaseItem {...defaultProps} label="要件定義" />);

      expect(screen.getByText('要件定義')).toBeInTheDocument();
    });

    it('should call onToggleAutoPermission when auto permission icon is clicked', () => {
      const onToggleAutoPermission = vi.fn();
      render(
        <PhaseItem {...defaultProps} onToggleAutoPermission={onToggleAutoPermission} />
      );

      // Click on the auto permission toggle button (now on right side)
      fireEvent.click(screen.getByTestId('auto-permission-toggle'));

      expect(onToggleAutoPermission).toHaveBeenCalledTimes(1);
    });

    it('should show play icon when auto execution is permitted', () => {
      render(<PhaseItem {...defaultProps} autoExecutionPermitted={true} />);

      expect(screen.getByTestId('auto-permitted-icon')).toBeInTheDocument();
    });

    it('should show ban icon when auto execution is not permitted', () => {
      render(<PhaseItem {...defaultProps} autoExecutionPermitted={false} />);

      expect(screen.getByTestId('auto-forbidden-icon')).toBeInTheDocument();
    });
  });

  // ============================================================
  // Task 3.4: Progress status icon (new layout)
  // Requirements: UI改善 - 進捗アイコンを左端に配置
  // ============================================================
  describe('Task 3.4: Progress status icon (new layout)', () => {
    describe('progress icon display', () => {
      it('should show check icon (green) when status is approved', () => {
        render(<PhaseItem {...defaultProps} status="approved" />);

        expect(screen.getByTestId('progress-icon-approved')).toBeInTheDocument();
      });

      it('should show pause icon (yellow/orange) when status is generated (awaiting approval)', () => {
        render(<PhaseItem {...defaultProps} status="generated" />);

        expect(screen.getByTestId('progress-icon-generated')).toBeInTheDocument();
      });

      it('should show bot icon (blue, animated) when executing', () => {
        render(<PhaseItem {...defaultProps} status="pending" isExecuting={true} />);

        expect(screen.getByTestId('progress-icon-executing')).toBeInTheDocument();
      });

      it('should show grayed check icon when status is pending', () => {
        render(<PhaseItem {...defaultProps} status="pending" isExecuting={false} />);

        expect(screen.getByTestId('progress-icon-pending')).toBeInTheDocument();
      });
    });

    describe('progress icon click behavior', () => {
      it('should call onShowAgentLog when progress icon is clicked in generated status', () => {
        const onShowAgentLog = vi.fn();
        render(
          <PhaseItem {...defaultProps} status="generated" onShowAgentLog={onShowAgentLog} />
        );

        fireEvent.click(screen.getByTestId('progress-icon-generated'));

        expect(onShowAgentLog).toHaveBeenCalledTimes(1);
      });

      it('should not call onShowAgentLog when progress icon is clicked in other statuses', () => {
        const onShowAgentLog = vi.fn();
        render(
          <PhaseItem {...defaultProps} status="pending" onShowAgentLog={onShowAgentLog} />
        );

        fireEvent.click(screen.getByTestId('progress-icon-pending'));

        expect(onShowAgentLog).not.toHaveBeenCalled();
      });
    });

    describe('layout structure', () => {
      it('should have progress icon on the left side', () => {
        render(<PhaseItem {...defaultProps} status="pending" />);

        const leftSide = screen.getByTestId('phase-left-side');
        const progressIcon = screen.getByTestId('progress-icon-pending');

        expect(leftSide).toContainElement(progressIcon);
      });

      it('should have auto permission toggle on the right side', () => {
        render(<PhaseItem {...defaultProps} />);

        const rightSide = screen.getByTestId('phase-right-side');
        const autoToggle = screen.getByTestId('auto-permission-toggle');

        expect(rightSide).toContainElement(autoToggle);
      });
    });
  });
});
