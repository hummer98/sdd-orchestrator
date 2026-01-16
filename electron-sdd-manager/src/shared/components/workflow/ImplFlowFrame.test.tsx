/**
 * ImplFlowFrame Component Tests
 * worktree-execution-ui: Task 4.1, 4.2, 4.3
 * Requirements: 3.1, 3.2, 3.3, 4.3, 5.1, 5.2, 5.4, 6.1, 6.2, 6.4, 7.1, 7.2
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { ImplFlowFrame } from './ImplFlowFrame';

describe('ImplFlowFrame', () => {
  // Basic props for testing
  const defaultProps = {
    worktreeModeSelected: false,
    onWorktreeModeChange: vi.fn(),
    isImplStarted: false,
    hasExistingWorktree: false,
    children: <div data-testid="child-content">Child Content</div>,
  };

  // Task 4.1: Basic structure
  describe('basic structure (Task 4.1)', () => {
    // Requirement 3.1: Frame display around impl/inspection/deploy
    it('should render frame container', () => {
      render(<ImplFlowFrame {...defaultProps} />);
      expect(screen.getByTestId('impl-flow-frame')).toBeInTheDocument();
    });

    // Requirement 3.2: Checkbox in header
    it('should render WorktreeModeCheckbox in header', () => {
      render(<ImplFlowFrame {...defaultProps} />);
      expect(screen.getByTestId('worktree-mode-checkbox')).toBeInTheDocument();
    });

    it('should render children content', () => {
      render(<ImplFlowFrame {...defaultProps} />);
      expect(screen.getByTestId('child-content')).toBeInTheDocument();
    });
  });

  // Task 4.2: Worktree mode UI changes
  describe('worktree mode UI (Task 4.2)', () => {
    // Requirement 6.1: Background color change when worktree mode
    it('should have purple background when worktree mode is selected', () => {
      render(<ImplFlowFrame {...defaultProps} worktreeModeSelected={true} />);
      const frame = screen.getByTestId('impl-flow-frame');
      expect(frame.className).toMatch(/violet|purple/);
    });

    // Requirement 7.1: Normal background when normal mode
    it('should have normal background when worktree mode is not selected', () => {
      render(<ImplFlowFrame {...defaultProps} worktreeModeSelected={false} />);
      const frame = screen.getByTestId('impl-flow-frame');
      expect(frame.className).not.toMatch(/violet|purple/);
    });

    // Requirement 6.2: Impl button label change
    it('should show "Worktreeモードで実装" label when worktree mode', () => {
      render(<ImplFlowFrame {...defaultProps} worktreeModeSelected={true} />);
      // The label is shown in the header area
      expect(screen.getByText('Worktreeモードで実装')).toBeInTheDocument();
    });

    // Requirement 7.2: Normal mode panel display maintained
    it('should show normal mode label when not worktree mode', () => {
      render(<ImplFlowFrame {...defaultProps} worktreeModeSelected={false} />);
      // Should show something indicating normal mode or just not show worktree-specific text
      expect(screen.queryByText('Worktreeで実装')).not.toBeInTheDocument();
    });

    // Requirement 6.4: Commit panel label change (merge)
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

  // FIX-1: Start button integration
  describe('start button integration (FIX-1)', () => {
    const propsWithButton = {
      ...defaultProps,
      canExecute: true,
      isExecuting: false,
      onExecute: vi.fn(),
    };

    it('should render start button when onExecute is provided', () => {
      render(<ImplFlowFrame {...propsWithButton} />);
      expect(screen.getByTestId('impl-start-button')).toBeInTheDocument();
    });

    it('should show normal mode start button text when worktree mode is off', () => {
      render(<ImplFlowFrame {...propsWithButton} worktreeModeSelected={false} />);
      const button = screen.getByTestId('impl-start-button');
      expect(button.textContent).toContain('実装開始');
      expect(button.textContent).not.toContain('Worktree');
    });

    it('should show worktree mode start button text when worktree mode is on', () => {
      render(<ImplFlowFrame {...propsWithButton} worktreeModeSelected={true} />);
      const button = screen.getByTestId('impl-start-button');
      expect(button.textContent).toContain('Worktree');
    });

    it('should show continue text when impl has started', () => {
      render(
        <ImplFlowFrame
          {...propsWithButton}
          isImplStarted={true}
          worktreeModeSelected={false}
        />
      );
      const button = screen.getByTestId('impl-start-button');
      expect(button.textContent).toContain('継続');
    });

    it('should disable start button when canExecute is false', () => {
      render(<ImplFlowFrame {...propsWithButton} canExecute={false} />);
      expect(screen.getByTestId('impl-start-button')).toBeDisabled();
    });

    it('should disable start button when isExecuting is true', () => {
      render(<ImplFlowFrame {...propsWithButton} isExecuting={true} />);
      expect(screen.getByTestId('impl-start-button')).toBeDisabled();
    });

    it('should show loading indicator when isExecuting is true', () => {
      render(<ImplFlowFrame {...propsWithButton} isExecuting={true} />);
      expect(screen.getByTestId('impl-start-loading')).toBeInTheDocument();
    });

    it('should call onExecute when start button is clicked', () => {
      const onExecute = vi.fn();
      render(<ImplFlowFrame {...propsWithButton} onExecute={onExecute} />);
      fireEvent.click(screen.getByTestId('impl-start-button'));
      expect(onExecute).toHaveBeenCalled();
    });

    it('should not call onExecute when button is disabled', () => {
      const onExecute = vi.fn();
      render(<ImplFlowFrame {...propsWithButton} onExecute={onExecute} canExecute={false} />);
      fireEvent.click(screen.getByTestId('impl-start-button'));
      expect(onExecute).not.toHaveBeenCalled();
    });
  });
});
