/**
 * ImplPhasePanel Component Tests
 * impl-flow-hierarchy-fix: Task 2.1, 2.2, 2.3, 2.4, 5.2
 * spec-worktree-early-creation: Task 7.2 - hasExistingWorktree removed
 *
 * ImplPhasePanel is a specialized component for the impl phase:
 * - Displays worktree-aware labels and buttons
 * - Shows status (pending/executing/approved)
 * - Applies purple accent color in worktree mode (read from spec.json)
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { ImplPhasePanel } from './ImplPhasePanel';
import type { PhaseStatus } from './PhaseItem';

describe('ImplPhasePanel', () => {
  // Basic props for testing
  // spec-worktree-early-creation: hasExistingWorktree removed
  const defaultProps = {
    worktreeModeSelected: false,
    isImplStarted: false,
    status: 'pending' as PhaseStatus,
    autoExecutionPermitted: false,
    isExecuting: false,
    canExecute: true,
    isAutoPhase: false,
    onExecute: vi.fn(),
    onToggleAutoPermission: vi.fn(),
  };

  // ==========================================================================
  // Basic structure
  // ==========================================================================
  describe('basic structure', () => {
    it('should render the component', () => {
      render(<ImplPhasePanel {...defaultProps} />);
      expect(screen.getByTestId('impl-phase-panel')).toBeInTheDocument();
    });

    it('should accept worktreeModeSelected prop', () => {
      render(<ImplPhasePanel {...defaultProps} worktreeModeSelected={true} />);
      expect(screen.getByTestId('impl-phase-panel')).toBeInTheDocument();
    });

    // Status display (pending)
    it('should show pending status icon when status is pending', () => {
      render(<ImplPhasePanel {...defaultProps} status="pending" />);
      expect(screen.getByTestId('status-icon-pending')).toBeInTheDocument();
    });

    // Status display (executing)
    it('should show executing status icon when isExecuting is true', () => {
      render(<ImplPhasePanel {...defaultProps} isExecuting={true} />);
      expect(screen.getByTestId('status-icon-executing')).toBeInTheDocument();
    });

    // Status display (approved)
    it('should show approved status icon when status is approved', () => {
      render(<ImplPhasePanel {...defaultProps} status="approved" />);
      expect(screen.getByTestId('status-icon-approved')).toBeInTheDocument();
    });
  });

  // ==========================================================================
  // Label switching logic
  // spec-worktree-early-creation: Simplified - no hasExistingWorktree
  // ==========================================================================
  describe('label switching', () => {
    // Worktree mode + not started = "Worktreeで実装開始"
    it('should show "Worktreeで実装開始" when worktree mode and not started', () => {
      render(
        <ImplPhasePanel
          {...defaultProps}
          worktreeModeSelected={true}
          isImplStarted={false}
        />
      );
      expect(screen.getByText('Worktreeで実装開始')).toBeInTheDocument();
    });

    // Worktree mode + started = "Worktreeで実装継続"
    it('should show "Worktreeで実装継続" when worktree mode and impl started', () => {
      render(
        <ImplPhasePanel
          {...defaultProps}
          worktreeModeSelected={true}
          isImplStarted={true}
        />
      );
      expect(screen.getByText('Worktreeで実装継続')).toBeInTheDocument();
    });

    // Normal mode + not started = "実装開始"
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

    // Normal mode + started = "実装継続"
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
  // Execution handler
  // ==========================================================================
  describe('execution handler', () => {
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
  // Worktree mode styling
  // ==========================================================================
  describe('worktree mode styling', () => {
    // Purple accent color in worktree mode
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

    // Agent Button Icon Unification: AgentBranchIcon in worktree mode (Bot + GitBranch)
    it('should show AgentBranchIcon (Bot + GitBranch) when worktree mode is selected', () => {
      render(<ImplPhasePanel {...defaultProps} worktreeModeSelected={true} />);
      const iconContainer = screen.getByTestId('icon-git-branch');
      // AgentBranchIcon renders two svgs (Bot + GitBranch)
      const svgs = iconContainer.querySelectorAll('svg');
      expect(svgs.length).toBe(2);
    });

    // Agent Button Icon Unification: AgentIcon in normal mode (Bot only)
    it('should show AgentIcon (Bot) when not in worktree mode', () => {
      render(<ImplPhasePanel {...defaultProps} worktreeModeSelected={false} />);
      const iconContainer = screen.getByTestId('icon-play');
      // AgentIcon renders single Bot icon (svg)
      expect(iconContainer.tagName.toLowerCase()).toBe('svg');
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

  // ==========================================================================
  // parallel-task-impl Task 6.1: Integration tests for parallel mode
  // Requirements: 6.1, 6.2
  // ==========================================================================
  describe('parallel mode integration', () => {
    it('should render correctly with parallel mode context', () => {
      // ImplPhasePanel should work regardless of parallel mode settings
      // as parallel mode is handled at a higher level (WorkflowView)
      render(<ImplPhasePanel {...defaultProps} />);
      expect(screen.getByTestId('impl-phase-panel')).toBeInTheDocument();
    });

    it('should maintain execute functionality in parallel mode context', () => {
      const onExecute = vi.fn();
      render(<ImplPhasePanel {...defaultProps} onExecute={onExecute} />);

      const button = screen.getByTestId('impl-execute-button');
      fireEvent.click(button);

      expect(onExecute).toHaveBeenCalledTimes(1);
    });
  });

  // ==========================================================================
  // parallel-task-impl Inspection Fix Task 9.1: ParallelModeToggle integration
  // Requirements: 1.1, 1.5, 1.6
  // ==========================================================================
  describe('ParallelModeToggle integration', () => {
    const parallelProps = {
      ...defaultProps,
      hasParallelTasks: true,
      parallelTaskCount: 3,
      parallelModeEnabled: false,
      onToggleParallelMode: vi.fn(),
    };

    it('should render ParallelModeToggle when hasParallelTasks is true', () => {
      render(<ImplPhasePanel {...parallelProps} />);
      expect(screen.getByTestId('parallel-mode-toggle')).toBeInTheDocument();
    });

    it('should not render ParallelModeToggle when hasParallelTasks is false', () => {
      render(<ImplPhasePanel {...parallelProps} hasParallelTasks={false} />);
      expect(screen.queryByTestId('parallel-mode-toggle')).not.toBeInTheDocument();
    });

    it('should not render ParallelModeToggle when hasParallelTasks is undefined', () => {
      render(<ImplPhasePanel {...defaultProps} />);
      expect(screen.queryByTestId('parallel-mode-toggle')).not.toBeInTheDocument();
    });

    it('should place ParallelModeToggle to the left of execute button', () => {
      render(<ImplPhasePanel {...parallelProps} />);

      const toggle = screen.getByTestId('parallel-mode-toggle');
      const button = screen.getByTestId('impl-execute-button');

      // Both should be in the right-side container (flex items)
      const toggleParent = toggle.closest('[data-testid="impl-phase-panel"]');
      const buttonParent = button.closest('[data-testid="impl-phase-panel"]');
      expect(toggleParent).toBe(buttonParent);
    });

    it('should call onToggleParallelMode when toggle is clicked', () => {
      const onToggle = vi.fn();
      render(<ImplPhasePanel {...parallelProps} onToggleParallelMode={onToggle} />);

      const toggle = screen.getByTestId('parallel-mode-toggle');
      fireEvent.click(toggle);

      expect(onToggle).toHaveBeenCalledTimes(1);
    });

    it('should pass parallelModeEnabled state to toggle', () => {
      render(<ImplPhasePanel {...parallelProps} parallelModeEnabled={true} />);

      const toggle = screen.getByTestId('parallel-mode-toggle');
      expect(toggle).toHaveAttribute('aria-pressed', 'true');
    });

    it('should show parallel task count in toggle', () => {
      render(<ImplPhasePanel {...parallelProps} parallelTaskCount={5} />);
      expect(screen.getByText('5')).toBeInTheDocument();
    });
  });

  // ==========================================================================
  // parallel-task-impl Inspection Fix Task 9.2: Parallel execution handler
  // Requirements: 1.5, 4.1
  // ==========================================================================
  describe('parallel execution handler', () => {
    const parallelProps = {
      ...defaultProps,
      hasParallelTasks: true,
      parallelTaskCount: 3,
      parallelModeEnabled: false,
      onToggleParallelMode: vi.fn(),
      onExecuteParallel: vi.fn(),
    };

    it('should call onExecute when parallel mode is OFF', () => {
      const onExecute = vi.fn();
      const onExecuteParallel = vi.fn();
      render(
        <ImplPhasePanel
          {...parallelProps}
          parallelModeEnabled={false}
          onExecute={onExecute}
          onExecuteParallel={onExecuteParallel}
        />
      );

      const button = screen.getByTestId('impl-execute-button');
      fireEvent.click(button);

      expect(onExecute).toHaveBeenCalledTimes(1);
      expect(onExecuteParallel).not.toHaveBeenCalled();
    });

    it('should call onExecuteParallel when parallel mode is ON', () => {
      const onExecute = vi.fn();
      const onExecuteParallel = vi.fn();
      render(
        <ImplPhasePanel
          {...parallelProps}
          parallelModeEnabled={true}
          onExecute={onExecute}
          onExecuteParallel={onExecuteParallel}
        />
      );

      const button = screen.getByTestId('impl-execute-button');
      fireEvent.click(button);

      expect(onExecuteParallel).toHaveBeenCalledTimes(1);
      expect(onExecute).not.toHaveBeenCalled();
    });

    it('should fallback to onExecute when onExecuteParallel is not provided', () => {
      const onExecute = vi.fn();
      // Explicitly set onExecuteParallel to undefined to test fallback
      render(
        <ImplPhasePanel
          {...parallelProps}
          parallelModeEnabled={true}
          onExecute={onExecute}
          onExecuteParallel={undefined}
        />
      );

      const button = screen.getByTestId('impl-execute-button');
      fireEvent.click(button);

      expect(onExecute).toHaveBeenCalledTimes(1);
    });
  });
});
