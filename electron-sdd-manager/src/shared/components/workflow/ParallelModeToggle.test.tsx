/**
 * ParallelModeToggle Tests
 * parallel-task-impl: Task 5.1-5.3
 *
 * Tests for the parallel mode toggle component.
 * Requirements: 5.1-5.4
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ParallelModeToggle } from './ParallelModeToggle';

describe('ParallelModeToggle', () => {
  const defaultProps = {
    parallelModeEnabled: false,
    hasParallelTasks: true,
    parallelTaskCount: 3,
    onToggle: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  // =============================================================================
  // Task 5.1: Component rendering
  // Requirements: 5.1
  // =============================================================================
  describe('rendering', () => {
    it('should render the toggle component', () => {
      render(<ParallelModeToggle {...defaultProps} />);

      expect(screen.getByTestId('parallel-mode-toggle')).toBeInTheDocument();
    });

    it('should show parallel task count when hasParallelTasks is true', () => {
      render(<ParallelModeToggle {...defaultProps} />);

      expect(screen.getByText(/3/)).toBeInTheDocument();
    });

    it('should not render when hasParallelTasks is false', () => {
      render(<ParallelModeToggle {...defaultProps} hasParallelTasks={false} />);

      expect(screen.queryByTestId('parallel-mode-toggle')).not.toBeInTheDocument();
    });
  });

  // =============================================================================
  // Task 5.2: Toggle interaction
  // Requirements: 5.2
  // =============================================================================
  describe('toggle interaction', () => {
    it('should call onToggle when clicked', () => {
      render(<ParallelModeToggle {...defaultProps} />);

      const toggle = screen.getByTestId('parallel-mode-toggle');
      fireEvent.click(toggle);

      expect(defaultProps.onToggle).toHaveBeenCalledTimes(1);
    });

    it('should show enabled state when parallelModeEnabled is true', () => {
      render(<ParallelModeToggle {...defaultProps} parallelModeEnabled={true} />);

      // Should have visual indication of enabled state
      const toggle = screen.getByTestId('parallel-mode-toggle');
      expect(toggle).toHaveAttribute('aria-pressed', 'true');
    });

    it('should show disabled state when parallelModeEnabled is false', () => {
      render(<ParallelModeToggle {...defaultProps} parallelModeEnabled={false} />);

      const toggle = screen.getByTestId('parallel-mode-toggle');
      expect(toggle).toHaveAttribute('aria-pressed', 'false');
    });
  });

  // =============================================================================
  // Task 5.3: Tooltip and accessibility
  // Requirements: 5.3
  // =============================================================================
  describe('accessibility', () => {
    it('should have proper aria-label', () => {
      render(<ParallelModeToggle {...defaultProps} />);

      const toggle = screen.getByTestId('parallel-mode-toggle');
      expect(toggle).toHaveAttribute('aria-label');
    });

    it('should have title attribute for tooltip', () => {
      render(<ParallelModeToggle {...defaultProps} />);

      const toggle = screen.getByTestId('parallel-mode-toggle');
      expect(toggle).toHaveAttribute('title');
    });

    it('should be a button element for keyboard accessibility', () => {
      render(<ParallelModeToggle {...defaultProps} />);

      const toggle = screen.getByTestId('parallel-mode-toggle');
      expect(toggle.tagName).toBe('BUTTON');
    });
  });

  // =============================================================================
  // Styling tests
  // =============================================================================
  describe('styling', () => {
    it('should apply custom className', () => {
      render(<ParallelModeToggle {...defaultProps} className="custom-class" />);

      const container = screen.getByTestId('parallel-mode-toggle').parentElement;
      expect(container).toHaveClass('custom-class');
    });
  });
});
