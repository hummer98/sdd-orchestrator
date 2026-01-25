/**
 * ParallelModeToggle Tests
 * parallel-task-impl: Task 5.1-5.3
 * impl-mode-toggle: Task 3.1, 3.2
 *
 * Tests for the parallel mode toggle component.
 * Requirements: 5.1-5.4 (parallel-task-impl)
 * Requirements: 2.1, 2.2, 2.3, 5.1, 5.2, 5.3, 5.4 (impl-mode-toggle)
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ParallelModeToggle } from './ParallelModeToggle';

describe('ParallelModeToggle', () => {
  // =============================================================================
  // impl-mode-toggle: New API tests (Task 3.1, 3.2)
  // Requirements: 2.1, 2.2, 2.3, 5.1, 5.2, 5.3, 5.4
  // =============================================================================
  describe('new API (impl-mode-toggle)', () => {
    const newApiProps = {
      mode: 'sequential' as const,
      onToggle: vi.fn(),
    };

    beforeEach(() => {
      vi.clearAllMocks();
    });

    // Requirement 2.1: Always render (remove hasParallelTasks condition)
    describe('rendering', () => {
      it('should always render the toggle component', () => {
        render(<ParallelModeToggle {...newApiProps} />);
        expect(screen.getByTestId('parallel-mode-toggle')).toBeInTheDocument();
      });

      it('should render with sequential mode', () => {
        render(<ParallelModeToggle mode="sequential" onToggle={vi.fn()} />);
        expect(screen.getByTestId('parallel-mode-toggle')).toBeInTheDocument();
      });

      it('should render with parallel mode', () => {
        render(<ParallelModeToggle mode="parallel" onToggle={vi.fn()} />);
        expect(screen.getByTestId('parallel-mode-toggle')).toBeInTheDocument();
      });
    });

    // Requirement 2.2: User/Users icons
    describe('icons', () => {
      it('should show User icon when mode is sequential', () => {
        render(<ParallelModeToggle mode="sequential" onToggle={vi.fn()} />);
        // User icon should be present (single person icon)
        const toggle = screen.getByTestId('parallel-mode-toggle');
        expect(toggle.querySelector('[data-testid="icon-user"]')).toBeInTheDocument();
      });

      it('should show Users icon when mode is parallel', () => {
        render(<ParallelModeToggle mode="parallel" onToggle={vi.fn()} />);
        // Users icon should be present (multiple people icon)
        const toggle = screen.getByTestId('parallel-mode-toggle');
        expect(toggle.querySelector('[data-testid="icon-users"]')).toBeInTheDocument();
      });
    });

    // Requirement 2.3: Visual state indication
    describe('visual state', () => {
      it('should indicate sequential mode visually', () => {
        render(<ParallelModeToggle mode="sequential" onToggle={vi.fn()} />);
        const toggle = screen.getByTestId('parallel-mode-toggle');
        // aria-pressed should be false for sequential (not parallel)
        expect(toggle).toHaveAttribute('aria-pressed', 'false');
      });

      it('should indicate parallel mode visually', () => {
        render(<ParallelModeToggle mode="parallel" onToggle={vi.fn()} />);
        const toggle = screen.getByTestId('parallel-mode-toggle');
        // aria-pressed should be true for parallel
        expect(toggle).toHaveAttribute('aria-pressed', 'true');
      });
    });

    // Toggle interaction
    describe('toggle interaction', () => {
      it('should call onToggle when clicked', () => {
        const onToggle = vi.fn();
        render(<ParallelModeToggle mode="sequential" onToggle={onToggle} />);

        const toggle = screen.getByTestId('parallel-mode-toggle');
        fireEvent.click(toggle);

        expect(onToggle).toHaveBeenCalledTimes(1);
      });
    });

    // Accessibility
    describe('accessibility', () => {
      it('should have proper aria-label for sequential mode', () => {
        render(<ParallelModeToggle mode="sequential" onToggle={vi.fn()} />);
        const toggle = screen.getByTestId('parallel-mode-toggle');
        expect(toggle.getAttribute('aria-label')).toContain('Sequential');
      });

      it('should have proper aria-label for parallel mode', () => {
        render(<ParallelModeToggle mode="parallel" onToggle={vi.fn()} />);
        const toggle = screen.getByTestId('parallel-mode-toggle');
        expect(toggle.getAttribute('aria-label')).toContain('Parallel');
      });

      it('should have title attribute for tooltip', () => {
        render(<ParallelModeToggle mode="sequential" onToggle={vi.fn()} />);
        const toggle = screen.getByTestId('parallel-mode-toggle');
        expect(toggle).toHaveAttribute('title');
      });
    });

    // Styling
    describe('styling', () => {
      it('should apply custom className', () => {
        render(<ParallelModeToggle mode="sequential" onToggle={vi.fn()} className="custom-class" />);
        const container = screen.getByTestId('parallel-mode-toggle').parentElement;
        expect(container).toHaveClass('custom-class');
      });
    });
  });

  // =============================================================================
  // Legacy API tests (deprecated, for backward compatibility)
  // These tests ensure the old props still work during transition
  // =============================================================================
  describe('legacy API (deprecated)', () => {
    const legacyProps = {
      parallelModeEnabled: false,
      hasParallelTasks: true,
      parallelTaskCount: 3,
      onToggle: vi.fn(),
    };

    beforeEach(() => {
      vi.clearAllMocks();
    });

    describe('rendering', () => {
      it('should render the toggle component with legacy props', () => {
        render(<ParallelModeToggle {...legacyProps} />);
        expect(screen.getByTestId('parallel-mode-toggle')).toBeInTheDocument();
      });

      // Note: hasParallelTasks no longer hides the component (Req 5.1)
      // This test is updated to reflect new behavior
      it('should still render when hasParallelTasks is false (new behavior)', () => {
        render(<ParallelModeToggle {...legacyProps} hasParallelTasks={false} />);
        // Now always renders
        expect(screen.getByTestId('parallel-mode-toggle')).toBeInTheDocument();
      });
    });

    describe('toggle interaction', () => {
      it('should call onToggle when clicked', () => {
        render(<ParallelModeToggle {...legacyProps} />);

        const toggle = screen.getByTestId('parallel-mode-toggle');
        fireEvent.click(toggle);

        expect(legacyProps.onToggle).toHaveBeenCalledTimes(1);
      });

      it('should show enabled state when parallelModeEnabled is true', () => {
        render(<ParallelModeToggle {...legacyProps} parallelModeEnabled={true} />);

        const toggle = screen.getByTestId('parallel-mode-toggle');
        expect(toggle).toHaveAttribute('aria-pressed', 'true');
      });

      it('should show disabled state when parallelModeEnabled is false', () => {
        render(<ParallelModeToggle {...legacyProps} parallelModeEnabled={false} />);

        const toggle = screen.getByTestId('parallel-mode-toggle');
        expect(toggle).toHaveAttribute('aria-pressed', 'false');
      });
    });

    describe('accessibility', () => {
      it('should have proper aria-label', () => {
        render(<ParallelModeToggle {...legacyProps} />);

        const toggle = screen.getByTestId('parallel-mode-toggle');
        expect(toggle).toHaveAttribute('aria-label');
      });

      it('should have title attribute for tooltip', () => {
        render(<ParallelModeToggle {...legacyProps} />);

        const toggle = screen.getByTestId('parallel-mode-toggle');
        expect(toggle).toHaveAttribute('title');
      });

      it('should be a button element for keyboard accessibility', () => {
        render(<ParallelModeToggle {...legacyProps} />);

        const toggle = screen.getByTestId('parallel-mode-toggle');
        expect(toggle.tagName).toBe('BUTTON');
      });
    });

    describe('styling', () => {
      it('should apply custom className', () => {
        render(<ParallelModeToggle {...legacyProps} className="custom-class" />);

        const container = screen.getByTestId('parallel-mode-toggle').parentElement;
        expect(container).toHaveClass('custom-class');
      });
    });
  });
});
