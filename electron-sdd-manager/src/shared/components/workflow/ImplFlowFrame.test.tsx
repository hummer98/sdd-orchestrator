/**
 * ImplFlowFrame Component Tests
 * impl-flow-hierarchy-fix: Task 1.1, 1.2, 5.1
 * spec-worktree-early-creation: Task 7.2 - WorktreeModeCheckbox removed
 *
 * ImplFlowFrame is now a visual frame only:
 * - No execution button (removed)
 * - No WorktreeModeCheckbox (removed in spec-worktree-early-creation)
 * - Mode indicator label (read-only)
 * - Children rendering (maintained)
 * - Purple background when worktree mode (maintained)
 */

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { ImplFlowFrame } from './ImplFlowFrame';

describe('ImplFlowFrame', () => {
  // Basic props for testing
  const defaultProps = {
    worktreeModeSelected: false,
    children: <div data-testid="child-content">Child Content</div>,
  };

  // Basic structure
  describe('basic structure', () => {
    it('should render frame container', () => {
      render(<ImplFlowFrame {...defaultProps} />);
      expect(screen.getByTestId('impl-flow-frame')).toBeInTheDocument();
    });

    it('should render children content', () => {
      render(<ImplFlowFrame {...defaultProps} />);
      expect(screen.getByTestId('child-content')).toBeInTheDocument();
    });

    // spec-worktree-early-creation: WorktreeModeCheckbox removed
    it('should NOT render WorktreeModeCheckbox (removed in spec-worktree-early-creation)', () => {
      render(<ImplFlowFrame {...defaultProps} />);
      expect(screen.queryByRole('checkbox')).not.toBeInTheDocument();
      expect(screen.queryByTestId('worktree-mode-checkbox')).not.toBeInTheDocument();
    });
  });

  // Worktree mode UI changes
  describe('worktree mode UI', () => {
    it('should have purple background when worktree mode is selected', () => {
      render(<ImplFlowFrame {...defaultProps} worktreeModeSelected={true} />);
      const frame = screen.getByTestId('impl-flow-frame');
      expect(frame.className).toMatch(/violet|purple/);
    });

    it('should have normal background when worktree mode is not selected', () => {
      render(<ImplFlowFrame {...defaultProps} worktreeModeSelected={false} />);
      const frame = screen.getByTestId('impl-flow-frame');
      expect(frame.className).not.toMatch(/violet|purple/);
    });

    it('should show "Worktreeモードで実装" label when worktree mode', () => {
      render(<ImplFlowFrame {...defaultProps} worktreeModeSelected={true} />);
      expect(screen.getByText('Worktreeモードで実装')).toBeInTheDocument();
    });

    it('should show "実装フロー" label when not worktree mode', () => {
      render(<ImplFlowFrame {...defaultProps} worktreeModeSelected={false} />);
      expect(screen.getByText('実装フロー')).toBeInTheDocument();
    });

    it('should show mode indicator in header', () => {
      render(<ImplFlowFrame {...defaultProps} worktreeModeSelected={true} />);
      expect(screen.getByTestId('impl-flow-frame-header')).toBeInTheDocument();
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
});
