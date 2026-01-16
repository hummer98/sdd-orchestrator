/**
 * WorktreeModeCheckbox Component Tests
 * worktree-execution-ui: Task 3.1
 * Requirements: 4.1, 4.2, 4.3, 5.1, 5.2, 5.4
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { WorktreeModeCheckbox } from './WorktreeModeCheckbox';

describe('WorktreeModeCheckbox', () => {
  // Requirement 4.1: Checkbox display and state connection
  describe('basic rendering', () => {
    it('should render checkbox with label', () => {
      render(
        <WorktreeModeCheckbox
          checked={false}
          onChange={vi.fn()}
          disabled={false}
          lockReason={null}
        />
      );

      expect(screen.getByRole('checkbox')).toBeInTheDocument();
      expect(screen.getByText('Worktreeモード')).toBeInTheDocument();
    });

    it('should reflect checked state when true', () => {
      render(
        <WorktreeModeCheckbox
          checked={true}
          onChange={vi.fn()}
          disabled={false}
          lockReason={null}
        />
      );

      expect(screen.getByRole('checkbox')).toBeChecked();
    });

    it('should reflect checked state when false', () => {
      render(
        <WorktreeModeCheckbox
          checked={false}
          onChange={vi.fn()}
          disabled={false}
          lockReason={null}
        />
      );

      expect(screen.getByRole('checkbox')).not.toBeChecked();
    });
  });

  // Requirement 4.2: Immediate reflection on change
  describe('onChange behavior', () => {
    it('should call onChange when clicked', () => {
      const onChange = vi.fn();
      render(
        <WorktreeModeCheckbox
          checked={false}
          onChange={onChange}
          disabled={false}
          lockReason={null}
        />
      );

      fireEvent.click(screen.getByRole('checkbox'));
      expect(onChange).toHaveBeenCalledTimes(1);
      expect(onChange).toHaveBeenCalledWith(true);
    });

    it('should call onChange with false when unchecking', () => {
      const onChange = vi.fn();
      render(
        <WorktreeModeCheckbox
          checked={true}
          onChange={onChange}
          disabled={false}
          lockReason={null}
        />
      );

      fireEvent.click(screen.getByRole('checkbox'));
      expect(onChange).toHaveBeenCalledWith(false);
    });
  });

  // Requirement 5.1, 5.2: Lock state display
  describe('disabled state', () => {
    it('should be disabled when disabled prop is true', () => {
      render(
        <WorktreeModeCheckbox
          checked={true}
          onChange={vi.fn()}
          disabled={true}
          lockReason="impl-started"
        />
      );

      expect(screen.getByRole('checkbox')).toBeDisabled();
    });

    it('should not call onChange when disabled', () => {
      const onChange = vi.fn();
      render(
        <WorktreeModeCheckbox
          checked={false}
          onChange={onChange}
          disabled={true}
          lockReason="impl-started"
        />
      );

      fireEvent.click(screen.getByRole('checkbox'));
      expect(onChange).not.toHaveBeenCalled();
    });
  });

  // Requirement 4.3, 5.2: Lock reason tooltip display
  describe('lock reason display', () => {
    it('should show lock icon when disabled', () => {
      render(
        <WorktreeModeCheckbox
          checked={true}
          onChange={vi.fn()}
          disabled={true}
          lockReason="impl-started"
        />
      );

      expect(screen.getByTestId('lock-icon')).toBeInTheDocument();
    });

    it('should not show lock icon when not disabled', () => {
      render(
        <WorktreeModeCheckbox
          checked={false}
          onChange={vi.fn()}
          disabled={false}
          lockReason={null}
        />
      );

      expect(screen.queryByTestId('lock-icon')).not.toBeInTheDocument();
    });

    it('should display impl-started lock reason in tooltip', () => {
      render(
        <WorktreeModeCheckbox
          checked={true}
          onChange={vi.fn()}
          disabled={true}
          lockReason="impl-started"
        />
      );

      // Check for tooltip title attribute
      const checkbox = screen.getByTestId('worktree-mode-checkbox-container');
      expect(checkbox.getAttribute('title')).toContain('実装開始');
    });

    it('should display worktree-exists lock reason in tooltip', () => {
      render(
        <WorktreeModeCheckbox
          checked={true}
          onChange={vi.fn()}
          disabled={true}
          lockReason="worktree-exists"
        />
      );

      const checkbox = screen.getByTestId('worktree-mode-checkbox-container');
      expect(checkbox.getAttribute('title')).toContain('Worktree');
    });
  });

  // Requirement 5.4: Auto execution should not lock checkbox before impl start
  describe('auto execution state', () => {
    it('should be editable during auto execution if impl not started', () => {
      render(
        <WorktreeModeCheckbox
          checked={false}
          onChange={vi.fn()}
          disabled={false}
          lockReason={null}
        />
      );

      expect(screen.getByRole('checkbox')).not.toBeDisabled();
    });
  });

  // Accessibility
  describe('accessibility', () => {
    it('should have proper aria-label', () => {
      render(
        <WorktreeModeCheckbox
          checked={false}
          onChange={vi.fn()}
          disabled={false}
          lockReason={null}
        />
      );

      const checkbox = screen.getByRole('checkbox');
      expect(checkbox).toHaveAttribute('aria-label', 'Worktreeモードを使用');
    });

    it('should have aria-disabled when locked', () => {
      render(
        <WorktreeModeCheckbox
          checked={true}
          onChange={vi.fn()}
          disabled={true}
          lockReason="impl-started"
        />
      );

      const checkbox = screen.getByRole('checkbox');
      expect(checkbox).toHaveAttribute('aria-disabled', 'true');
    });
  });

  // Test IDs
  describe('test IDs', () => {
    it('should have proper data-testid attributes', () => {
      render(
        <WorktreeModeCheckbox
          checked={false}
          onChange={vi.fn()}
          disabled={false}
          lockReason={null}
        />
      );

      expect(screen.getByTestId('worktree-mode-checkbox')).toBeInTheDocument();
      expect(screen.getByTestId('worktree-mode-checkbox-container')).toBeInTheDocument();
    });
  });
});
