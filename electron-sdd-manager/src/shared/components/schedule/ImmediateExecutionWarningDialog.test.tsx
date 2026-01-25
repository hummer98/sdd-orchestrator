/**
 * ImmediateExecutionWarningDialog Tests
 *
 * Task 5.3: ImmediateExecutionWarningDialogを作成
 * Requirements: 7.3, 7.4, 7.5
 * - 回避対象動作中の警告表示
 * - 「それでも実行」「キャンセル」の選択肢
 * - 強制実行
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ImmediateExecutionWarningDialog } from './ImmediateExecutionWarningDialog';
import type { AvoidanceTarget } from '../../types/scheduleTask';

describe('ImmediateExecutionWarningDialog', () => {
  const defaultProps = {
    isOpen: true,
    taskName: 'テストタスク',
    conflictType: 'spec-merge' as AvoidanceTarget,
    onConfirm: vi.fn(),
    onCancel: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ===========================================================================
  // Requirement 7.3: 警告ダイアログ表示
  // ===========================================================================

  describe('Requirement 7.3: 警告ダイアログ表示', () => {
    it('should render when isOpen is true', () => {
      render(<ImmediateExecutionWarningDialog {...defaultProps} />);

      expect(screen.getByTestId('immediate-execution-warning-dialog')).toBeInTheDocument();
    });

    it('should not render when isOpen is false', () => {
      render(<ImmediateExecutionWarningDialog {...defaultProps} isOpen={false} />);

      expect(screen.queryByTestId('immediate-execution-warning-dialog')).not.toBeInTheDocument();
    });

    it('should display task name in warning message', () => {
      render(<ImmediateExecutionWarningDialog {...defaultProps} />);

      expect(screen.getByText(/テストタスク/)).toBeInTheDocument();
    });

    it('should display warning icon', () => {
      render(<ImmediateExecutionWarningDialog {...defaultProps} />);

      // Warning triangle icon should be present
      expect(screen.getByTestId('warning-icon')).toBeInTheDocument();
    });

    it('should display conflict type in warning message for spec-merge', () => {
      render(
        <ImmediateExecutionWarningDialog
          {...defaultProps}
          conflictType="spec-merge"
        />
      );

      expect(screen.getByText(/Specマージ/)).toBeInTheDocument();
    });

    it('should display conflict type in warning message for commit', () => {
      render(
        <ImmediateExecutionWarningDialog
          {...defaultProps}
          conflictType="commit"
        />
      );

      expect(screen.getByText(/コミット/)).toBeInTheDocument();
    });

    it('should display conflict type in warning message for bug-merge', () => {
      render(
        <ImmediateExecutionWarningDialog
          {...defaultProps}
          conflictType="bug-merge"
        />
      );

      expect(screen.getByText(/Bugマージ/)).toBeInTheDocument();
    });

    it('should display conflict type in warning message for schedule-task', () => {
      render(
        <ImmediateExecutionWarningDialog
          {...defaultProps}
          conflictType="schedule-task"
        />
      );

      expect(screen.getByText(/スケジュールタスク/)).toBeInTheDocument();
    });
  });

  // ===========================================================================
  // Requirement 7.4: 選択肢提供
  // ===========================================================================

  describe('Requirement 7.4: 選択肢提供', () => {
    it('should display "それでも実行" button', () => {
      render(<ImmediateExecutionWarningDialog {...defaultProps} />);

      expect(screen.getByRole('button', { name: 'それでも実行' })).toBeInTheDocument();
    });

    it('should display "キャンセル" button', () => {
      render(<ImmediateExecutionWarningDialog {...defaultProps} />);

      expect(screen.getByRole('button', { name: 'キャンセル' })).toBeInTheDocument();
    });

    it('should call onCancel when cancel button is clicked', () => {
      const onCancel = vi.fn();
      render(
        <ImmediateExecutionWarningDialog {...defaultProps} onCancel={onCancel} />
      );

      fireEvent.click(screen.getByRole('button', { name: 'キャンセル' }));

      expect(onCancel).toHaveBeenCalledTimes(1);
    });

    it('should call onCancel when backdrop is clicked', () => {
      const onCancel = vi.fn();
      render(
        <ImmediateExecutionWarningDialog {...defaultProps} onCancel={onCancel} />
      );

      fireEvent.click(screen.getByTestId('dialog-backdrop'));

      expect(onCancel).toHaveBeenCalledTimes(1);
    });
  });

  // ===========================================================================
  // Requirement 7.5: 強制実行
  // ===========================================================================

  describe('Requirement 7.5: 強制実行', () => {
    it('should call onConfirm when "それでも実行" button is clicked', () => {
      const onConfirm = vi.fn();
      render(
        <ImmediateExecutionWarningDialog {...defaultProps} onConfirm={onConfirm} />
      );

      fireEvent.click(screen.getByRole('button', { name: 'それでも実行' }));

      expect(onConfirm).toHaveBeenCalledTimes(1);
    });

    it('should have danger styling on the confirm button', () => {
      render(<ImmediateExecutionWarningDialog {...defaultProps} />);

      const confirmButton = screen.getByRole('button', { name: 'それでも実行' });

      // Should have danger variant styling (red background)
      expect(confirmButton).toHaveClass('bg-red-600');
    });
  });

  // ===========================================================================
  // Accessibility
  // ===========================================================================

  describe('Accessibility', () => {
    it('should have role="dialog"', () => {
      render(<ImmediateExecutionWarningDialog {...defaultProps} />);

      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });

    it('should have aria-modal="true"', () => {
      render(<ImmediateExecutionWarningDialog {...defaultProps} />);

      expect(screen.getByRole('dialog')).toHaveAttribute('aria-modal', 'true');
    });

    it('should have proper aria-labelledby', () => {
      render(<ImmediateExecutionWarningDialog {...defaultProps} />);

      const dialog = screen.getByRole('dialog');
      const labelId = dialog.getAttribute('aria-labelledby');

      expect(labelId).toBeTruthy();
      expect(document.getElementById(labelId!)).toBeInTheDocument();
    });
  });

  // ===========================================================================
  // Loading State
  // ===========================================================================

  describe('Loading State', () => {
    it('should show loading state when isLoading is true', () => {
      render(
        <ImmediateExecutionWarningDialog {...defaultProps} isLoading={true} />
      );

      const confirmButton = screen.getByRole('button', { name: 'それでも実行' });
      expect(confirmButton).toBeDisabled();
    });

    it('should disable cancel button when loading', () => {
      render(
        <ImmediateExecutionWarningDialog {...defaultProps} isLoading={true} />
      );

      const cancelButton = screen.getByRole('button', { name: 'キャンセル' });
      expect(cancelButton).toBeDisabled();
    });
  });
});
