/**
 * ImplFlowFrame Component Tests
 * impl-flow-hierarchy-fix: Task 1.1, 1.2, 5.1
 * Requirements: 1.1, 1.2, 1.3, 1.4, 1.5
 *
 * ImplFlowFrame is now a visual frame only:
 * - No execution button (removed in Task 1.1)
 * - WorktreeModeCheckbox in header (maintained)
 * - Children rendering (maintained)
 * - Purple background when worktree mode (maintained)
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { ImplFlowFrame } from './ImplFlowFrame';

describe('ImplFlowFrame', () => {
  // Basic props for testing (execution-related props removed in Task 1.1)
  const defaultProps = {
    worktreeModeSelected: false,
    onWorktreeModeChange: vi.fn(),
    isImplStarted: false,
    hasExistingWorktree: false,
    children: <div data-testid="child-content">Child Content</div>,
  };

  // Task 1.1, 1.2: Basic structure (impl-flow-hierarchy-fix)
  // Requirements: 1.1, 1.2, 1.3, 1.4
  describe('basic structure (Task 1.1, 1.2)', () => {
    // Requirement 1.4: Frame display around impl/inspection/deploy
    it('should render frame container', () => {
      render(<ImplFlowFrame {...defaultProps} />);
      expect(screen.getByTestId('impl-flow-frame')).toBeInTheDocument();
    });

    // Requirement 1.2: Checkbox in header
    it('should render WorktreeModeCheckbox in header', () => {
      render(<ImplFlowFrame {...defaultProps} />);
      expect(screen.getByTestId('worktree-mode-checkbox')).toBeInTheDocument();
    });

    // Requirement 1.4: children props
    it('should render children content', () => {
      render(<ImplFlowFrame {...defaultProps} />);
      expect(screen.getByTestId('child-content')).toBeInTheDocument();
    });

    // Requirement 1.1: No execution button (removed)
    it('should NOT render execution button (removed in Task 1.1)', () => {
      render(<ImplFlowFrame {...defaultProps} />);
      expect(screen.queryByTestId('impl-start-button')).not.toBeInTheDocument();
    });
  });

  // Requirement 1.3: Worktree mode UI changes
  describe('worktree mode UI (Requirement 1.3)', () => {
    // Requirement 1.3: Background color change when worktree mode
    it('should have purple background when worktree mode is selected', () => {
      render(<ImplFlowFrame {...defaultProps} worktreeModeSelected={true} />);
      const frame = screen.getByTestId('impl-flow-frame');
      expect(frame.className).toMatch(/violet|purple/);
    });

    // Normal background when normal mode
    it('should have normal background when worktree mode is not selected', () => {
      render(<ImplFlowFrame {...defaultProps} worktreeModeSelected={false} />);
      const frame = screen.getByTestId('impl-flow-frame');
      expect(frame.className).not.toMatch(/violet|purple/);
    });

    // Mode label in header
    it('should show "Worktreeモードで実装" label when worktree mode', () => {
      render(<ImplFlowFrame {...defaultProps} worktreeModeSelected={true} />);
      // The label is shown in the header area
      expect(screen.getByText('Worktreeモードで実装')).toBeInTheDocument();
    });

    // Normal mode panel display maintained
    it('should show normal mode label when not worktree mode', () => {
      render(<ImplFlowFrame {...defaultProps} worktreeModeSelected={false} />);
      // Should show something indicating normal mode or just not show worktree-specific text
      expect(screen.queryByText('Worktreeで実装')).not.toBeInTheDocument();
    });

    it('should show mode indicator in header', () => {
      render(<ImplFlowFrame {...defaultProps} worktreeModeSelected={true} />);
      expect(screen.getByTestId('impl-flow-frame-header')).toBeInTheDocument();
    });
  });

  // Task 4.3: Checkbox lock logic
  describe('checkbox lock logic (Task 4.3)', () => {
    // Requirement 5.1: Lock when impl started
    it('should disable checkbox when impl has started', () => {
      render(<ImplFlowFrame {...defaultProps} isImplStarted={true} />);
      expect(screen.getByRole('checkbox')).toBeDisabled();
    });

    // Requirement 4.3: Auto-check and lock when worktree exists
    it('should disable checkbox when existing worktree exists', () => {
      render(
        <ImplFlowFrame
          {...defaultProps}
          hasExistingWorktree={true}
          worktreeModeSelected={true}
        />
      );
      expect(screen.getByRole('checkbox')).toBeDisabled();
    });

    it('should show worktree-exists lock reason when worktree exists', () => {
      render(
        <ImplFlowFrame
          {...defaultProps}
          hasExistingWorktree={true}
          worktreeModeSelected={true}
        />
      );
      const container = screen.getByTestId('worktree-mode-checkbox-container');
      expect(container.getAttribute('title')).toContain('Worktree');
    });

    // Requirement 5.2: Lock when branch exists
    it('should show impl-started lock reason when impl started', () => {
      render(
        <ImplFlowFrame
          {...defaultProps}
          isImplStarted={true}
          worktreeModeSelected={false}
        />
      );
      const container = screen.getByTestId('worktree-mode-checkbox-container');
      expect(container.getAttribute('title')).toContain('実装開始');
    });

    // Requirement 5.4: Editable during auto-execution if impl not started
    it('should allow checkbox change when impl not started', () => {
      const onChange = vi.fn();
      render(
        <ImplFlowFrame
          {...defaultProps}
          onWorktreeModeChange={onChange}
          isImplStarted={false}
          hasExistingWorktree={false}
        />
      );
      expect(screen.getByRole('checkbox')).not.toBeDisabled();
    });
  });

  // onChange behavior
  describe('onChange behavior', () => {
    it('should call onWorktreeModeChange when checkbox is toggled', () => {
      const onChange = vi.fn();
      render(
        <ImplFlowFrame
          {...defaultProps}
          onWorktreeModeChange={onChange}
        />
      );

      fireEvent.click(screen.getByRole('checkbox'));
      expect(onChange).toHaveBeenCalledWith(true);
    });

    it('should not call onWorktreeModeChange when disabled', () => {
      const onChange = vi.fn();
      render(
        <ImplFlowFrame
          {...defaultProps}
          onWorktreeModeChange={onChange}
          isImplStarted={true}
        />
      );

      fireEvent.click(screen.getByRole('checkbox'));
      expect(onChange).not.toHaveBeenCalled();
    });
  });

  // Test IDs
  describe('test IDs', () => {
    it('should have proper data-testid attributes', () => {
      render(<ImplFlowFrame {...defaultProps} />);

      expect(screen.getByTestId('impl-flow-frame')).toBeInTheDocument();
      expect(screen.getByTestId('impl-flow-frame-header')).toBeInTheDocument();
      expect(screen.getByTestId('impl-flow-frame-content')).toBeInTheDocument();
    });
  });

  // NOTE: Start button tests removed in impl-flow-hierarchy-fix Task 1.1
  // Execution button functionality moved to ImplPhasePanel component
  // See ImplPhasePanel.test.tsx for button-related tests
});
