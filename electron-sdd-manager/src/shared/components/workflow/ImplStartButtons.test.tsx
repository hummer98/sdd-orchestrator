/**
 * ImplStartButtons Component Tests
 * TDD: Test-first implementation for Impl start UI with worktree options
 * Requirements: 9.1, 9.2, 9.3, 9.4, 9.5, 9.6, 9.7, 9.8, 9.9 (git-worktree-support)
 * Task 15.1: ImplパネルのUIテスト
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ImplStartButtons, type ImplStartButtonsProps } from './ImplStartButtons';

const defaultProps: ImplStartButtonsProps = {
  featureName: 'test-feature',
  hasWorktree: false,
  isExecuting: false,
  canExecute: true,
  onExecuteCurrentBranch: vi.fn(),
  onExecuteWithWorktree: vi.fn(),
};

describe('ImplStartButtons', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ============================================================
  // Task 15.1: 2ボタン表示の確認
  // Requirements: 9.1, 9.2, 9.3
  // ============================================================
  describe('Task 15.1: 2ボタン表示の確認', () => {
    it('should display both buttons when worktree field does not exist', () => {
      render(<ImplStartButtons {...defaultProps} hasWorktree={false} />);

      // 「カレントブランチで実装」ボタン
      expect(screen.getByTestId('impl-start-current-branch')).toBeInTheDocument();
      expect(screen.getByText('カレントブランチで実装')).toBeInTheDocument();

      // 「Worktreeで実装」ボタン
      expect(screen.getByTestId('impl-start-worktree')).toBeInTheDocument();
      expect(screen.getByText('Worktreeで実装')).toBeInTheDocument();
    });

    it('should display both buttons as enabled when canExecute is true', () => {
      render(<ImplStartButtons {...defaultProps} hasWorktree={false} canExecute={true} />);

      const currentBranchButton = screen.getByTestId('impl-start-current-branch');
      const worktreeButton = screen.getByTestId('impl-start-worktree');

      expect(currentBranchButton).not.toBeDisabled();
      expect(worktreeButton).not.toBeDisabled();
    });

    it('should disable both buttons when canExecute is false', () => {
      render(<ImplStartButtons {...defaultProps} hasWorktree={false} canExecute={false} />);

      const currentBranchButton = screen.getByTestId('impl-start-current-branch');
      const worktreeButton = screen.getByTestId('impl-start-worktree');

      expect(currentBranchButton).toBeDisabled();
      expect(worktreeButton).toBeDisabled();
    });

    it('should disable both buttons when isExecuting is true', () => {
      render(<ImplStartButtons {...defaultProps} hasWorktree={false} isExecuting={true} />);

      const currentBranchButton = screen.getByTestId('impl-start-current-branch');
      const worktreeButton = screen.getByTestId('impl-start-worktree');

      expect(currentBranchButton).toBeDisabled();
      expect(worktreeButton).toBeDisabled();
    });
  });

  // ============================================================
  // Task 15.1: worktreeフィールド有無による表示切り替え
  // Requirements: 9.8, 9.9
  // ============================================================
  describe('Task 15.1: worktreeフィールド有無による表示切り替え', () => {
    it('should show only "Worktreeで実装（継続）" button when worktree exists', () => {
      render(<ImplStartButtons {...defaultProps} hasWorktree={true} />);

      // 「Worktreeで実装（継続）」ボタンのみ表示
      expect(screen.getByTestId('impl-start-worktree-continue')).toBeInTheDocument();
      expect(screen.getByText('Worktreeで実装（継続）')).toBeInTheDocument();

      // 「カレントブランチで実装」ボタンは非表示
      expect(screen.queryByTestId('impl-start-current-branch')).not.toBeInTheDocument();

      // 通常の「Worktreeで実装」ボタンも非表示
      expect(screen.queryByTestId('impl-start-worktree')).not.toBeInTheDocument();
    });

    it('should call onExecuteWithWorktree when "Worktreeで実装（継続）" button is clicked', () => {
      const onExecuteWithWorktree = vi.fn();
      render(
        <ImplStartButtons
          {...defaultProps}
          hasWorktree={true}
          onExecuteWithWorktree={onExecuteWithWorktree}
        />
      );

      fireEvent.click(screen.getByTestId('impl-start-worktree-continue'));
      expect(onExecuteWithWorktree).toHaveBeenCalledTimes(1);
    });
  });

  // ============================================================
  // Task 14.2: 「カレントブランチで実装」ボタンの処理
  // Requirements: 9.4
  // ============================================================
  describe('Task 14.2: 「カレントブランチで実装」ボタンの処理', () => {
    it('should call onExecuteCurrentBranch when button is clicked', () => {
      const onExecuteCurrentBranch = vi.fn();
      render(
        <ImplStartButtons
          {...defaultProps}
          hasWorktree={false}
          onExecuteCurrentBranch={onExecuteCurrentBranch}
        />
      );

      fireEvent.click(screen.getByTestId('impl-start-current-branch'));
      expect(onExecuteCurrentBranch).toHaveBeenCalledTimes(1);
    });
  });

  // ============================================================
  // Task 14.3: 「Worktreeで実装」ボタンの処理
  // Requirements: 9.5, 9.6, 9.7
  // ============================================================
  describe('Task 14.3: 「Worktreeで実装」ボタンの処理', () => {
    it('should call onExecuteWithWorktree when button is clicked', () => {
      const onExecuteWithWorktree = vi.fn();
      render(
        <ImplStartButtons
          {...defaultProps}
          hasWorktree={false}
          onExecuteWithWorktree={onExecuteWithWorktree}
        />
      );

      fireEvent.click(screen.getByTestId('impl-start-worktree'));
      expect(onExecuteWithWorktree).toHaveBeenCalledTimes(1);
    });
  });

  // ============================================================
  // Visual indication tests
  // ============================================================
  describe('Visual indication', () => {
    it('should display executing indicator when isExecuting is true', () => {
      render(<ImplStartButtons {...defaultProps} isExecuting={true} />);

      expect(screen.getByTestId('impl-executing-indicator')).toBeInTheDocument();
    });

    it('should not display executing indicator when isExecuting is false', () => {
      render(<ImplStartButtons {...defaultProps} isExecuting={false} />);

      expect(screen.queryByTestId('impl-executing-indicator')).not.toBeInTheDocument();
    });
  });

  // ============================================================
  // Accessibility tests
  // ============================================================
  describe('Accessibility', () => {
    it('should have proper button roles', () => {
      render(<ImplStartButtons {...defaultProps} hasWorktree={false} />);

      const buttons = screen.getAllByRole('button');
      expect(buttons.length).toBe(2);
    });

    it('should have proper aria-disabled when buttons are disabled', () => {
      render(<ImplStartButtons {...defaultProps} canExecute={false} />);

      const currentBranchButton = screen.getByTestId('impl-start-current-branch');
      const worktreeButton = screen.getByTestId('impl-start-worktree');

      expect(currentBranchButton).toHaveAttribute('disabled');
      expect(worktreeButton).toHaveAttribute('disabled');
    });
  });
});
