/**
 * ImplPhasePanel Component Tests
 * impl-flow-hierarchy-fix: Task 2.1, 2.2, 2.3, 2.4, 5.2
 * Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 2.8, 2.9, 2.10
 *
 * ImplPhasePanel is a specialized component for the impl phase:
 * - Displays worktree-aware labels and buttons
 * - Handles worktree/normal mode execution
 * - Shows status (pending/executing/approved)
 * - Applies purple accent color in worktree mode
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { ImplPhasePanel } from './ImplPhasePanel';
import type { PhaseStatus } from './PhaseItem';

describe('ImplPhasePanel', () => {
  // Basic props for testing
  const defaultProps = {
    worktreeModeSelected: false,
    isImplStarted: false,
    hasExistingWorktree: false,
    status: 'pending' as PhaseStatus,
    autoExecutionPermitted: false,
    isExecuting: false,
    canExecute: true,
    isAutoPhase: false,
    onExecute: vi.fn(),
    onToggleAutoPermission: vi.fn(),
  };

  // ==========================================================================
  // Task 2.1: Props and basic structure
  // Requirements: 2.1, 2.2, 2.9
  // ==========================================================================
  describe('basic structure (Task 2.1)', () => {
    // Requirement 2.1: Component renders
    it('should render the component', () => {
      render(<ImplPhasePanel {...defaultProps} />);
      expect(screen.getByTestId('impl-phase-panel')).toBeInTheDocument();
    });

    // Requirement 2.2: Receives worktreeModeSelected prop
    it('should accept worktreeModeSelected prop', () => {
      render(<ImplPhasePanel {...defaultProps} worktreeModeSelected={true} />);
      expect(screen.getByTestId('impl-phase-panel')).toBeInTheDocument();
    });

    // Requirement 2.9: Status display (pending)
    it('should show pending status icon when status is pending', () => {
      render(<ImplPhasePanel {...defaultProps} status="pending" />);
      expect(screen.getByTestId('status-icon-pending')).toBeInTheDocument();
    });

    // Requirement 2.9: Status display (executing)
    it('should show executing status icon when isExecuting is true', () => {
      render(<ImplPhasePanel {...defaultProps} isExecuting={true} />);
      expect(screen.getByTestId('status-icon-executing')).toBeInTheDocument();
    });

    // Requirement 2.9: Status display (approved)
    it('should show approved status icon when status is approved', () => {
      render(<ImplPhasePanel {...defaultProps} status="approved" />);
      expect(screen.getByTestId('status-icon-approved')).toBeInTheDocument();
    });
  });

  // ==========================================================================
  // Task 2.2: Label switching logic
  // Requirements: 2.3, 2.4, 2.5, 2.6
  // ==========================================================================
  describe('label switching (Task 2.2)', () => {
    // Requirement 2.3: Worktree mode + not created = "Worktreeで実装開始"
    it('should show "Worktreeで実装開始" when worktree mode and not started', () => {
      render(
        <ImplPhasePanel
          {...defaultProps}
          worktreeModeSelected={true}
          hasExistingWorktree={false}
          isImplStarted={false}
        />
      );
      expect(screen.getByText('Worktreeで実装開始')).toBeInTheDocument();
    });

    // Requirement 2.4: Worktree mode + created = "Worktreeで実装継続"
    it('should show "Worktreeで実装継続" when worktree mode and worktree exists', () => {
      render(
        <ImplPhasePanel
          {...defaultProps}
          worktreeModeSelected={true}
          hasExistingWorktree={true}
          isImplStarted={true}
        />
      );
      expect(screen.getByText('Worktreeで実装継続')).toBeInTheDocument();
    });

    // Requirement 2.5: Normal mode + not started = "実装開始"
    it('should show "実装開始" when normal mode and not started', () => {
      render(
        <ImplPhasePanel
          {...defaultProps}
          worktreeModeSelected={false}
          isImplStarted={false}
        />
      );
      expect(screen.getByText('実装開始')).toBeInTheDocument();
    });

    // Requirement 2.6: Normal mode + started = "実装継続"
    it('should show "実装継続" when normal mode and started', () => {
      render(
        <ImplPhasePanel
          {...defaultProps}
          worktreeModeSelected={false}
          isImplStarted={true}
        />
      );
      expect(screen.getByText('実装継続')).toBeInTheDocument();
    });
  });

  // ==========================================================================
  // Task 2.3: Execution handler
  // Requirements: 2.7, 2.8
  // ==========================================================================
  describe('execution handler (Task 2.3)', () => {
    // Requirement 2.7: Execute button calls onExecute
    it('should call onExecute when button is clicked', () => {
      const onExecute = vi.fn();
      render(<ImplPhasePanel {...defaultProps} onExecute={onExecute} canExecute={true} />);

      const button = screen.getByTestId('impl-execute-button');
      fireEvent.click(button);

      expect(onExecute).toHaveBeenCalledTimes(1);
    });

    it('should disable button when canExecute is false', () => {
      render(<ImplPhasePanel {...defaultProps} canExecute={false} />);
      expect(screen.getByTestId('impl-execute-button')).toBeDisabled();
    });

    it('should disable button when isExecuting is true', () => {
      render(<ImplPhasePanel {...defaultProps} isExecuting={true} />);
      expect(screen.getByTestId('impl-execute-button')).toBeDisabled();
    });

    it('should show loading indicator when isExecuting is true', () => {
      render(<ImplPhasePanel {...defaultProps} isExecuting={true} />);
      expect(screen.getByTestId('impl-execute-loading')).toBeInTheDocument();
    });

    it('should not call onExecute when button is disabled', () => {
      const onExecute = vi.fn();
      render(<ImplPhasePanel {...defaultProps} onExecute={onExecute} canExecute={false} />);

      const button = screen.getByTestId('impl-execute-button');
      fireEvent.click(button);

      expect(onExecute).not.toHaveBeenCalled();
    });
  });

  // ==========================================================================
  // Task 2.4: Worktree mode styling
  // Requirements: 2.10
  // ==========================================================================
  describe('worktree mode styling (Task 2.4)', () => {
    // Requirement 2.10: Purple accent color in worktree mode
    it('should apply purple/violet styling when worktree mode is selected', () => {
      render(<ImplPhasePanel {...defaultProps} worktreeModeSelected={true} />);

      const button = screen.getByTestId('impl-execute-button');
      expect(button.className).toMatch(/violet|purple/);
    });

    it('should apply normal styling when not in worktree mode', () => {
      render(<ImplPhasePanel {...defaultProps} worktreeModeSelected={false} />);

      const button = screen.getByTestId('impl-execute-button');
      expect(button.className).not.toMatch(/violet|purple/);
    });

    // Requirement 2.10: GitBranch icon in worktree mode
    it('should show GitBranch icon when worktree mode is selected', () => {
      render(<ImplPhasePanel {...defaultProps} worktreeModeSelected={true} />);
      expect(screen.getByTestId('icon-git-branch')).toBeInTheDocument();
    });

    // Normal mode: Play icon
    it('should show Play icon when not in worktree mode', () => {
      render(<ImplPhasePanel {...defaultProps} worktreeModeSelected={false} />);
      expect(screen.getByTestId('icon-play')).toBeInTheDocument();
    });
  });

  // ==========================================================================
  // Auto execution permission toggle
  // ==========================================================================
  describe('auto execution permission toggle', () => {
    it('should show permitted icon when autoExecutionPermitted is true', () => {
      render(<ImplPhasePanel {...defaultProps} autoExecutionPermitted={true} />);
      expect(screen.getByTestId('auto-permitted-icon')).toBeInTheDocument();
    });

    it('should show forbidden icon when autoExecutionPermitted is false', () => {
      render(<ImplPhasePanel {...defaultProps} autoExecutionPermitted={false} />);
      expect(screen.getByTestId('auto-forbidden-icon')).toBeInTheDocument();
    });

    it('should call onToggleAutoPermission when toggle is clicked', () => {
      const onToggle = vi.fn();
      render(<ImplPhasePanel {...defaultProps} onToggleAutoPermission={onToggle} />);

      fireEvent.click(screen.getByTestId('auto-permission-toggle'));
      expect(onToggle).toHaveBeenCalledTimes(1);
    });
  });

  // ==========================================================================
  // Auto phase highlight
  // ==========================================================================
  describe('auto phase highlight', () => {
    it('should have highlight styling when isAutoPhase is true', () => {
      render(<ImplPhasePanel {...defaultProps} isAutoPhase={true} />);
      const panel = screen.getByTestId('impl-phase-panel');
      expect(panel.className).toContain('ring');
    });
  });

  // ==========================================================================
  // Phase label
  // ==========================================================================
  describe('phase label', () => {
    it('should show "実装" label', () => {
      render(<ImplPhasePanel {...defaultProps} />);
      expect(screen.getByText('実装')).toBeInTheDocument();
    });
  });
});
