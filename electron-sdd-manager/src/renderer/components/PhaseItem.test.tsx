/**
 * PhaseItem Component Tests
 * TDD: Testing phase item display and interactions
 * Requirements: 2.1-2.5, 5.1, 5.2
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { PhaseItem } from './PhaseItem';
import type { PhaseStatus, WorkflowPhase } from '../types/workflow';

describe('PhaseItem', () => {
  const defaultProps = {
    phase: 'requirements' as WorkflowPhase,
    label: '要件定義',
    status: 'pending' as PhaseStatus,
    previousStatus: null as PhaseStatus | null,
    autoExecutionPermitted: true,
    isExecuting: false,
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

        expect(screen.getByRole('button', { name: /実行/i })).toBeInTheDocument();
      });

      it('should not display approve button when pending', () => {
        render(<PhaseItem {...defaultProps} status="pending" />);

        expect(screen.queryByRole('button', { name: /承認/i })).not.toBeInTheDocument();
      });

      it('should call onExecute when execute button is clicked', () => {
        const onExecute = vi.fn();
        render(<PhaseItem {...defaultProps} status="pending" onExecute={onExecute} />);

        fireEvent.click(screen.getByRole('button', { name: /実行/i }));

        expect(onExecute).toHaveBeenCalledTimes(1);
      });
    });

    describe('generated status', () => {
      it('should display generated label when generated', () => {
        render(<PhaseItem {...defaultProps} status="generated" />);

        expect(screen.getByText('生成完了')).toBeInTheDocument();
      });

      it('should display approve button when generated', () => {
        render(<PhaseItem {...defaultProps} status="generated" />);

        expect(screen.getByRole('button', { name: /承認/i })).toBeInTheDocument();
      });

      it('should call onApprove when approve button is clicked', () => {
        const onApprove = vi.fn();
        render(<PhaseItem {...defaultProps} status="generated" onApprove={onApprove} />);

        fireEvent.click(screen.getByRole('button', { name: /承認/i }));

        expect(onApprove).toHaveBeenCalledTimes(1);
      });

      it('should call onShowAgentLog when generated label is clicked', () => {
        const onShowAgentLog = vi.fn();
        render(
          <PhaseItem {...defaultProps} status="generated" onShowAgentLog={onShowAgentLog} />
        );

        fireEvent.click(screen.getByText('生成完了'));

        expect(onShowAgentLog).toHaveBeenCalledTimes(1);
      });
    });

    describe('approved status', () => {
      it('should display approved label with check icon', () => {
        render(<PhaseItem {...defaultProps} status="approved" />);

        expect(screen.getByText('承認済')).toBeInTheDocument();
      });

      it('should not display execute button when approved', () => {
        render(<PhaseItem {...defaultProps} status="approved" />);

        expect(screen.queryByRole('button', { name: /実行/i })).not.toBeInTheDocument();
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

      it('should disable execute button when executing', () => {
        render(<PhaseItem {...defaultProps} status="pending" isExecuting={true} />);

        const executeButton = screen.queryByRole('button', { name: /実行/i });
        // Button should either be disabled or not present during execution
        if (executeButton) {
          expect(executeButton).toBeDisabled();
        }
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

    it('should call onToggleAutoPermission when phase name is clicked', () => {
      const onToggleAutoPermission = vi.fn();
      render(
        <PhaseItem {...defaultProps} onToggleAutoPermission={onToggleAutoPermission} />
      );

      // Click on the phase label area
      fireEvent.click(screen.getByTestId('phase-toggle'));

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
});
